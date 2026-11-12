// Suíte "Testar tudo": roda cada comando do catálogo e decide se o relógio respondeu.
//
// Critério por teste:
//   passou       ACK FD do mesmo cmd/key com status 0, ou resposta DF do mesmo comando
//   recusou      ACK com status diferente de 0
//   sem resposta nada chegou dentro do prazo
//   erro         falha ao enviar
//   bloqueado    comando perigoso (OTA, reset de fábrica, vincular/desvincular): nunca enviado
//   pulado       altera configuração e a opção "incluir configurações" está desligada
import { defaults } from './session.js';
import { parseSettings, parseHrLimits, writeBackPlan, restorePlan, RAW_READS } from './settings.js';
import { commandById } from './commands.js';

const ACK_TIMEOUT_MS = 3000;
const GAP_MS = 350;
const AFTER_ACK_MS = 800;
const REALTIME_WINDOW_MS = 12000;

const WB_ALL = { pulsoDeUso: 0, sono: {}, fcAutomatica: {}, sedentarismo: {}, naoPerturbe: {}, oxigenioAutomatico: {}, estresseAutomatico: {}, pressaoAutomatica: {}, temperaturaAutomatica: {}, hrvAutomatico: {}, sonoCientifico: 0, limitesFc: { alto: {}, baixo: {} },
  leituras: Object.fromEntries(RAW_READS.map((r) => [r.write, '00'])) };
const RAW_IDS = new Set(RAW_READS.map((r) => r.write));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Ordem: leituras, ações e notificações, medições em tempo real (liga → espera → desliga), configs. */
export function buildPlan(commands, { includeConfig = false, writeBack = true } = {}) {
  const wb = new Set(writeBack ? writeBackPlan(WB_ALL).map((x) => x.id) : []);
  const order = ['leitura', 'saude', 'mostrador', 'acao', 'notificacao', 'midia', 'fone', 'ai', 'config', 'sistema', 'vinculo', 'ota'];
  const sorted = [...commands].sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group));
  return sorted.map((command) => {
    if (command.risk === 'perigoso') return { command, skip: 'bloqueado' };
    if (!command.encode) return { command, skip: 'pulado', note: 'payload complexo ainda não implementado' };
    // Alarmes e lembretes: sempre o valor lido, para nunca apagar o que a pessoa configurou.
    if (wb.has(command.id) && (!includeConfig || RAW_IDS.has(command.id))) return { command, writeBack: true };
    if (command.risk === 'altera-config' && !includeConfig) return { command, skip: 'pulado' };
    return { command };
  });
}

/**
 * O que precisa ser desfeito depois de um teste, para não deixar o relógio
 * medindo, tocando ou enviando dados sozinho. Devolve os parâmetros do "desligar"
 * ou null. `window` = segundos de espera antes de desfazer (contando pacotes).
 */
export function undoFor(command) {
  if (command.method === 'sendPhoneCallState') return { params: { estado: 4 }, window: 3 };
  if (/^sendRequest/.test(command.method)) {
    const p = command.params?.[0];
    return p ? { params: { [p.name]: false }, window: REALTIME_WINDOW_MS / 1000 } : null;
  }
  if (/realtime/i.test(command.method)) {
    const p = command.params?.[0];
    return p ? { params: { [p.name]: 0 }, window: REALTIME_WINDOW_MS / 1000 } : null;
  }
  return null;
}

/**
 * Roda o plano. `onProgress({ index, total, result })` é chamado a cada teste.
 * `isRealtime(command)` indica comandos que ligam uma medição contínua: depois deles a
 * suíte espera REALTIME_WINDOW_MS contando os quadros que chegarem.
 */
export async function runSuite(session, plan, { onProgress, signal } = {}) {
  const results = [];
  const started = Date.now();
  await session.recorder.add({ type: 'suite', note: `início: ${plan.length} itens` });
  // Regravação: lê as configurações atuais uma vez; cada comando regrava o mesmo valor.
  let before = null;
  let wbParams = new Map();
  // Com "incluir configurações", os comandos usam valores de teste; no fim a suíte devolve
  // o que foi lido aqui (idioma, meta, brilho, unidades, tempo de tela...).
  const changesConfig = plan.some((i) => !i.skip && !i.writeBack && i.command.risk === 'altera-config');
  if ((changesConfig || plan.some((i) => i.writeBack)) && session.connected) {
    before = await readSettings(session);
    wbParams = new Map(writeBackPlan(before).map((x) => [x.id, x.params]));
    await session.recorder.add({ type: 'suite', note: 'configurações lidas para regravação', configuracoes: before });
  }
  for (const [index, item] of plan.entries()) {
    if (signal?.aborted) break;
    if (!session.connected) {
      await session.recorder.add({ type: 'suite', note: `interrompida: relógio desconectado antes de ${item.command.id}` });
      break;
    }
    const { command } = item;
    const base = { id: command.id, label: command.label, cmdKey: hexPair(command.cmd, command.key), risk: command.risk, group: command.group };
    let result;
    if (item.skip) {
      result = { ...base, status: item.skip, ms: 0, note: item.note || (item.skip === 'bloqueado' ? 'perigoso: nunca enviado' : 'altera configuração do relógio') };
    } else if (!session.connected) {
      result = { ...base, status: 'erro', ms: 0, note: 'relógio desconectado' };
    } else if (item.writeBack) {
      result = wbParams.has(command.id)
        ? { ...(await runOne(session, command, base, null, wbParams.get(command.id))), writeBack: true, note: `regravado o valor atual: ${JSON.stringify(wbParams.get(command.id))}` }
        : { ...base, status: 'pulado', ms: 0, note: 'valor atual não lido; não regravado' };
    } else {
      result = await runOne(session, command, base, undoFor(command));
    }
    results.push(result);
    await session.recorder.add({ type: 'teste', ...result });
    onProgress?.({ index, total: plan.length, result });
    if (!item.skip) await sleep(GAP_MS);
  }
  if (changesConfig && before && session.connected) {
    const byId = new Map(plan.map((i) => [i.command.id, i.command]));
    for (const step of restorePlan(before)) {
      const command = byId.get(step.id);
      if (!command || !session.connected) continue;
      const base = { id: `restaura:${step.id}`, label: `Restaurar ${step.campo}`, cmdKey: hexPair(command.cmd, command.key), risk: command.risk, group: 'config' };
      const result = { ...(await runOne(session, command, base, null, step.params)), note: `valor lido antes da suíte: ${JSON.stringify(step.params)}` };
      results.push(result);
      await session.recorder.add({ type: 'teste', ...result });
      onProgress?.({ index: plan.length - 1, total: plan.length, result });
      await sleep(GAP_MS);
    }
  }
  if (before && session.connected) {
    // Confere que a regravação (ou a restauração) deixou tudo como estava.
    // Uma segunda tentativa: às vezes a resposta de 02/06 se perde no meio de uma sincronização.
    const after = (await readSettings(session)) ?? (await readSettings(session));
    const same = JSON.stringify(after) === JSON.stringify(before);
    const check = {
      id: 'verificaConfiguracoes', label: changesConfig ? 'Configurações iguais às de antes da suíte' : 'Configurações inalteradas após regravar', cmdKey: '02/06', risk: 'seguro', group: 'config',
      status: same ? 'passou' : 'erro', ms: 0, note: same ? 'leitura igual antes e depois' : `mudou: antes ${JSON.stringify(before)} depois ${JSON.stringify(after)}`,
    };
    results.push(check);
    await session.recorder.add({ type: 'teste', ...check });
    onProgress?.({ index: plan.length - 1, total: plan.length, result: check });
  }
  const summary = summarize(results, Date.now() - started);
  await session.recorder.add({ type: 'suite', note: 'fim', summary });
  return { results, summary };
}

async function runOne(session, command, base, undo, params) {
  const t0 = Date.now();
  const matchAck = (f) => f.kind === 'FD' && f.cmd === command.cmd && f.key === command.key;
  const matchResp = (f) => f.kind === 'DF' && f.cmd === command.cmd;
  const ack = session.waitFor(matchAck, ACK_TIMEOUT_MS);
  const resp = session.waitFor(matchResp, ACK_TIMEOUT_MS);
  // Medições: o relógio às vezes confirma só depois de terminar uma sincronização (vimos
  // FD 06/04 chegar 6 s depois). Durante a janela de medição, um ACK atrasado também conta.
  let lateAck = null;
  let undoAt = Infinity;
  if (undo) session.waitFor(matchAck, ACK_TIMEOUT_MS + undo.window * 1000).then((x) => { if (x) lateAck = { ...x, ms: Date.now() - t0 }; });
  try {
    await session.send(command, params ?? defaults(command));
  } catch (e) {
    return { ...base, status: 'erro', ms: Date.now() - t0, note: e.message };
  }
  // Depois do ACK, espera só um pouco mais por uma resposta DF (em vez do prazo inteiro).
  let r = null;
  const a = await Promise.race([ack, resp.then((x) => { r = x; return ack; })]);
  if (!r) r = await Promise.race([resp, sleep(a ? AFTER_ACK_MS : 0).then(() => null)]);
  const ms = Date.now() - t0;
  let extra = {};
  if (undo) {
    // Espera contando pacotes e desfaz, mesmo sem resposta, para não deixar nada ligado.
    const before = session.counters.rx;
    await sleep(undo.window * 1000);
    undoAt = Date.now() - t0;
    extra = { realtimeFrames: session.counters.rx - before, realtimeWindowS: undo.window };
    try {
      await session.send(command, { ...defaults(command), ...undo.params });
      extra.desfeito = true;
    } catch (e) {
      extra.desfeito = false;
      extra.note = `não desfeito: ${e.message}`;
    }
  }
  if (r) {
    return { ...base, status: 'passou', ms, response: r.entry.summary, text: r.entry.text, ...extra };
  }
  if (a) {
    const ok = a.frame.status === 0;
    return { ...base, status: ok ? 'passou' : 'recusou', ms, ackStatus: a.frame.status, response: 'ACK', ...extra };
  }
  if (lateAck && lateAck.ms < undoAt) {
    const ok = lateAck.frame.status === 0;
    return { ...base, status: ok ? 'passou' : 'recusou', ms: lateAck.ms, ackStatus: lateAck.frame.status, response: `ACK atrasado (${lateAck.ms} ms)`, ...extra };
  }
  return { ...base, status: 'sem resposta', ms, ...extra };
}

function hexPair(c, k) {
  return `${c.toString(16).padStart(2, '0')}/${k.toString(16).padStart(2, '0')}`.toUpperCase();
}

export function summarize(results, ms) {
  const count = {};
  for (const r of results) count[r.status] = (count[r.status] || 0) + 1;
  return { total: results.length, ms, ...count };
}

/** Relatório em Markdown para salvar junto do registro. */
export function reportMarkdown({ results, summary }, info = {}) {
  const lines = [
    '# Relatório "Testar tudo" — Relógio Sabatinho',
    '',
    `Data: ${new Date().toISOString()}`,
    '',
    ...Object.entries(info).map(([k, v]) => `- ${k}: ${v}`),
    '',
    `Resumo: ${Object.entries(summary).map(([k, v]) => `${k}=${v}`).join(', ')}`,
    '',
    '| Comando | cmd/key | Risco | Resultado | ms | Resposta |',
    '|---|---|---|---|---:|---|',
    ...results.map((r) => `| ${r.label} | ${r.cmdKey} | ${r.risk} | ${r.status}${r.ackStatus ? ` (ACK ${r.ackStatus})` : ''} | ${r.ms} | ${(r.text || r.response || r.note || '').replace(/\|/g, '/')}${r.realtimeFrames !== undefined ? ` · ${r.realtimeFrames} pacotes em ${r.realtimeWindowS} s` : ''} |`),
    '',
  ];
  return lines.join('\n');
}

/** Pede 02/06 e devolve as configurações interpretadas (ou null). */
export async function readSettings(session) {
  const cmd = { id: 'getSettingInfo', label: 'Configurações atuais', cmd: 0x02, key: 0x06, risk: 'seguro', params: [], encode: () => [1] };
  const wait = session.waitFor((f) => f.kind === 'DF' && f.cmd === 0x02 && f.key === 0x06, 3000);
  await session.send(cmd);
  const r = await wait;
  const feat = session.lastByCmd.get('0/0');
  const b9 = feat ? parseInt(String(feat.payload).split(' ')[9] || '0', 16) : 0;
  const settings = r ? parseSettings(r.frame.payload, { language5Bytes: Boolean(b9 & 4) }) : null;
  if (settings) {
    // Limites de alerta de FC ficam fora de 02/06: pedidos com 03/08, chegam em 03/09.
    const req = { id: 'reqeustHrHigLow', label: 'Limites de alerta de FC', cmd: 0x03, key: 0x08, risk: 'seguro', params: [], encode: () => [1] };
    const waitHr = session.waitFor((f) => f.kind === 'DF' && f.cmd === 0x03 && f.key === 0x09, 3000);
    await session.send(req);
    const hr = await waitHr;
    const limites = hr ? parseHrLimits(hr.frame.payload) : null;
    if (limites) settings.limitesFc = limites;
    settings.leituras = {};
    for (const r of RAW_READS) {
      const cmd = commandById(r.read);
      if (!cmd || !session.connected) continue;
      const wait = session.waitFor((f) => f.kind === 'DF' && f.cmd === r.resp[0] && f.key === r.resp[1], 3000);
      await session.send(cmd, defaults(cmd));
      const got = await wait;
      settings.leituras[r.write] = got ? Array.from(got.frame.payload, (b) => b.toString(16).padStart(2, '0')).join(' ') : null;
    }
  }
  return settings;
}
