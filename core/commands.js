// Catálogo de comandos do TF37 Pro: os 209 métodos do CommandUtils do Podsfine 1.2.3
// (gerados em catalog.generated.js) + nomes em português, grupo, risco e codificador.
// Payloads simples são codificados automaticamente; os complexos mais úteis foram
// implementados à mão abaixo; os demais ficam documentados mas não enviáveis.
import { CATALOG } from './catalog.generated.js';
import { encodeTime } from './protocol.js';
import {
  decodeToday, decodeHourly, decodeHrHistory, decodeLive, decodeStatus, decodeDate2,
} from './measure.js';

const utf8 = (s) => Array.from(new TextEncoder().encode(String(s ?? '')));
const ascii = (s) => Array.from(String(s ?? '')).map((c) => c.charCodeAt(0) & 0x7f);
const u16 = (n) => [(n >> 8) & 0xff, n & 0xff];
const u32 = (n) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
const text = (b) => new TextDecoder().decode(Uint8Array.from(b));

// ---------- nomes em português (os mais usados; o resto é derivado do método) ----------
const LABELS = {
  getDeviceInfo: 'Identidade do relógio', getDeviceFeatures: 'Recursos do relógio', getDeviceNameVersion: 'Nome e firmware',
  getProductId: 'ID do produto', requestOTAInfo: 'Informações de OTA e chip', requestBattery: 'Bateria',
  getSettingInfo: 'Configurações atuais', getTodayData: 'Atividade de hoje', syncData: 'Sincronizar tudo',
  getAlarm: 'Alarmes', getFaceCode: 'Mostrador atual', getCustomizeFaceInfo: 'Mostrador personalizado',
  getOtaUniqueCode: 'Código único de OTA', getOtaProductCode: 'Código de produto OTA', getDeviceOtaStatus: 'Estado de OTA',
  getQrCodeInfo: 'QR code do relógio', requestScreenTime: 'Tempo de tela', requestScreenTimeTypes: 'Opções de tempo de tela',
  getSupportEventReminder: 'Lembretes suportados', getBadgeFaceInfo: 'Mostradores de crachá', findWatch: 'Encontrar relógio',
  sendRequestHeartRate: 'Medir frequência cardíaca', sendRequestBloodOxygen: 'Medir oxigênio no sangue',
  sendRequestBloodPressure: 'Medir pressão arterial', sendRequestPressure: 'Medir estresse', sendRequestTempre: 'Medir temperatura',
  sendRequestHRV: 'Medir HRV', sendRequestHrv: 'Medir HRV (variante com bug: igual à temperatura)',
  setRealtimeSport: 'Envio automático de esporte', setRealtimeHealth: 'Envio automático de saúde',
  sendCameraOpen: 'Abrir câmera remota', sendPhotoCap: 'Tirar foto (câmera remota)', sendCameraClose: 'Fechar câmera remota',
  sendSystemTime: 'Acertar data e hora', setTimeZone: 'Fuso horário', set24Hour: 'Formato 24 horas', setUnit: 'Unidades',
  setLanguage: 'Idioma', handBright: 'Brilho da tela', raiseToWake: 'Levantar o pulso para acender', setStepTarget: 'Meta de passos',
  sendMsgNewProtocol: 'Enviar notificação de teste', sendMsg: 'Enviar notificação (protocolo antigo)', sendDeleteMsg: 'Apagar notificação',
  sendPhoneCallState: 'Simular chamada recebida', sendWeatherInfo: 'Clima', sendNewWeatherInfo: 'Clima (novo)',
  sendRestoreFactory: 'Restaurar padrão de fábrica', sendBindDevice: 'Vincular relógio', sendUnbindDevice: 'Desvincular relógio',
  requestStartOTA: 'Iniciar atualização de firmware', setDND: 'Não perturbe', setAlarm: 'Definir alarme',
  sendSedentaryRemind: 'Lembrete de sedentarismo', sendSleepSetting: 'Configuração de sono', sendHrAutoTestSetting: 'FC automática',
  setUserInfo: 'Perfil do usuário', setWatchFace: 'Trocar mostrador', setCarousel: 'Carrossel de telas',
  sendScreenTime: 'Definir tempo de tela', sendWearing: 'Pulso de uso', setProfile: 'Perfil de som', sendGomoreKey: 'Chave do algoritmo GoMore',
  sendPaymentCode: 'Código de pagamento', sendSocialCode: 'Código de rede social', resetQrCode: 'Redefinir QR code',
  sendShutDown: 'Desligar o relógio', sendGPS: 'Enviar localização (GPS)', sendSosInfo: 'Contato de SOS',
};

const WORDS = {
  get: 'ler', set: 'definir', send: 'enviar', request: 'pedir', sync: 'sincronizar', delete: 'apagar', del: 'apagar',
  start: 'iniciar', stop: 'parar', reset: 'redefinir', setting: 'configurar', info: 'info', face: 'mostrador',
  watch: 'relógio', alarm: 'alarme', reminder: 'lembrete', ep: 'fone', earphone: 'fone', volume: 'volume',
  album: 'álbum', audio: 'áudio', record: 'gravação', file: 'arquivo', translate: 'tradução', text: 'texto',
  ai: 'IA', chat: 'chat', gpt: 'GPT', dial: 'mostrador', video: 'vídeo', badge: 'crachá', test: 'teste', auto: 'automático',
  hr: 'FC', bo: 'oxigênio', bp: 'pressão', pr: 'estresse', temper: 'temperatura', sleep: 'sono', menstrual: 'ciclo menstrual',
};

function humanize(method) {
  const parts = method.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').split(' ');
  const out = parts.map((p) => WORDS[p.toLowerCase()] ?? p.toLowerCase());
  const s = out.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------- grupo ----------
const GROUP_BY_CMD = {
  0x00: 'leitura', 0x01: 'saude', 0x03: 'saude', 0x04: 'saude', 0x05: 'notificacao', 0x07: 'midia', 0x08: 'vinculo',
  0x09: 'config', 0x0a: 'notificacao', 0x0b: 'mostrador', 0x0c: 'ota', 0x0d: 'sistema', 0x0e: 'notificacao',
  0x0f: 'sistema', 0x11: 'leitura', 0x13: 'config', 0x14: 'leitura', 0x19: 'saude', 0x1e: 'ai', 0x20: 'ota',
  0x22: 'config', 0x25: 'fone', 0x26: 'fone', 0x27: 'fone', 0x2b: 'mostrador', 0x2c: 'mostrador', 0x2d: 'midia',
  0x2e: 'midia', 0x30: 'ai', 0x31: 'ai', 0x32: 'mostrador', 0x35: 'midia', 0x36: 'midia', 0x37: 'ai', 0x3a: 'midia', 0x3b: 'ai',
  0xf3: 'leitura',
};

function groupOf(e) {
  if (/^sendRequest/.test(e.method)) return 'saude';
  if (e.cmd === 0x06) return /find|shut|restart/i.test(e.method) ? 'acao' : /alarm/i.test(e.method) ? 'config' : 'acao';
  if (e.cmd === 0x02) return /^(get|request)/.test(e.method) ? 'leitura' : /realtime/i.test(e.method) ? 'saude' : 'config';
  return GROUP_BY_CMD[e.cmd] ?? (/^(get|request)/.test(e.method) ? 'leitura' : 'sistema');
}

// ---------- risco ----------
// perigoso: nunca enviado (OTA, fábrica, vínculo, apagar dados, transferências, códigos pessoais, desligar).
const DANGEROUS = new Set([
  'requestStartOTA', 'sendRestoreFactory', 'sendBindDevice', 'sendUnbindDevice', 'resetQrCode', 'sendPaymentCode',
  'sendSocialCode', 'sendGomoreKey', 'sendShutDown', 'getEpShtudown', 'deleteRecordFile', 'sendDelAlbumPid',
  'sendVersionInfo', 'sendSystemVersion', 'startBadgePushImage', 'stopBadgePushImage', 'syncAudio',
  'setVideoFaceInfo8', 'setVideoFaceInfo2', 'setEleVideoFace', 'setEleMulitPicFace', 'setEleSinglePicFace',
  'setCustomWatchFace', 'setCustomWatchFace8', 'sendNewAlbumPid',
  // 06/0A: log do Podsfine "发送请求设备重启指令" = pedido de reinício do aparelho.
  // 36/04: apaga gravação (mesma key de deleteRecordFile).
  'getEpRestart', 'deleteAllowRecordFile',
  // 0A/00 no protocolo ANTIGO: em 2026-11-12 o TF37 Pro (que declara o protocolo novo)
  // parou de responder logo depois dele e caiu por timeout (reason 8). Bateria < 10% também
  // pode explicar; por precaução fica fora. Use 'Enviar notificação de teste' (protocolo novo).
  'sendMsg',
]);
// seguro além das leituras: ações transitórias e medições.
const SAFE = new Set([
  'findWatch', 'sendCameraOpen', 'sendPhotoCap', 'sendCameraClose', 'syncData', 'getTodayData',
  'sendMsgNewProtocol', 'sendMsg', 'sendDeleteMsg', 'sendPhoneCallState', 'setRealtimeSport', 'setRealtimeHealth',
]);

// Nomes enganam: getEpRestart começa com "get" e pede um reinício. Qualquer método
// com uma destas palavras é perigoso, seja qual for o prefixo.
const SIDE_EFFECT = /restart|reboot|shut|shtudown|delete|clear|reset|format|erase|upgrade|unbind|bind|factory|restore/i;

function riskOf(e) {
  if (DANGEROUS.has(e.method) || (e.cmd === 0x20 && e.key === 0x02) || (e.cmd === 0x02 && e.key === 0x09) || e.cmd === 0x08) return 'perigoso';
  if (SIDE_EFFECT.test(e.method) && e.method !== 'sendDeleteMsg') return 'perigoso';
  if (/ota/i.test(e.method) && !/^(get|request)/.test(e.method)) return 'perigoso';
  if (SAFE.has(e.method) || /^sendRequest/.test(e.method) || /^(get|request)/.test(e.method)) return 'seguro';
  return 'altera-config';
}

// ---------- codificadores feitos à mão (payloads complexos) ----------
const CUSTOM = {
  sendSystemTime: {
    params: [{ name: 'quando', type: 'time', label: 'Data e hora (vazio = agora)', default: () => new Date() }],
    encode: (p) => encodeTime(p.quando instanceof Date ? p.quando : new Date()),
    note: '4 bytes com ano-2000 (6 bits), mês, dia, hora, minuto e segundo empacotados em bits.',
  },
  setTimeZone: {
    params: [{ name: 'horas', type: 'u8s', label: 'Fuso em horas (ex.: -3)', default: -3, min: -12, max: 14 }],
    encode: (p) => [p.horas >= 0 ? 0 : 1, Math.abs(p.horas) & 0xff],
    note: 'Sinal (0 = positivo, 1 = negativo) e valor absoluto em horas inteiras.',
  },
  raiseToWake: {
    params: [
      { name: 'ligado', type: 'u8', label: 'Ligado (1) ou desligado (0)', default: 1, min: 0, max: 1 },
      { name: 'inicio', type: 'u16', label: 'Início (minutos do dia)', default: 480, min: 0, max: 1439 },
      { name: 'fim', type: 'u16', label: 'Fim (minutos do dia)', default: 1320, min: 0, max: 1439 },
    ],
    encode: (p) => [p.ligado & 0xff, ...u16(p.inicio), ...u16(p.fim)],
    note: 'Liga e janela de horário em minutos (u16 big-endian).',
  },
  // Os quatro abaixo têm o mesmo formato do bloco com etiqueta que o relógio devolve em 02/06
  // (etiquetas 4, 6, 7 e 12), então a suíte consegue regravar o valor atual sem mudar nada.
  sendSleepSetting: {
    params: [
      { name: 'ligado', type: 'u8', label: 'Ligado (1) ou desligado (0)', default: 1, min: 0, max: 1 },
      { name: 'inicio', type: 'u16', label: 'Início (minutos do dia)', default: 1320, min: 0, max: 1439 },
      { name: 'fim', type: 'u16', label: 'Fim (minutos do dia)', default: 480, min: 0, max: 1439 },
    ],
    encode: (p) => [p.ligado & 0xff, ...u16(p.inicio), ...u16(p.fim)],
    note: 'Liga e janela do sono em minutos do dia (u16 big-endian). Igual à etiqueta 4 de 02/06.',
  },
  sendHrAutoTestSetting: {
    params: [
      { name: 'ligado', type: 'u8', label: 'Ligado (1) ou desligado (0)', default: 1, min: 0, max: 1 },
      { name: 'intervalo', type: 'u16', label: 'Intervalo (minutos)', default: 60, min: 1, max: 1440 },
      { name: 'inicio', type: 'u16', label: 'Início (minutos do dia)', default: 0, min: 0, max: 1439 },
      { name: 'fim', type: 'u16', label: 'Fim (minutos do dia)', default: 1439, min: 0, max: 1439 },
    ],
    encode: (p) => [p.ligado & 0xff, 0, ...u16(p.intervalo), ...u16(p.inicio), ...u16(p.fim)],
    note: 'Liga, um byte 0, intervalo em minutos e janela em minutos do dia. Igual à etiqueta 6 de 02/06.',
  },
  sendSedentaryRemind: {
    params: [
      { name: 'naoPerturbe', type: 'u8', label: 'Pausa no almoço (1/0)', default: 0, min: 0, max: 1 },
      { name: 'ligado', type: 'u8', label: 'Ligado (1) ou desligado (0)', default: 1, min: 0, max: 1 },
      { name: 'limite', type: 'u8', label: 'Limite de passos', default: 100, min: 0, max: 255 },
      { name: 'tempo', type: 'u8', label: 'Tempo parado (minutos)', default: 60, min: 0, max: 255 },
      { name: 'inicio', type: 'u8', label: 'Hora de início', default: 9, min: 0, max: 23 },
      { name: 'fim', type: 'u8', label: 'Hora de fim', default: 18, min: 0, max: 23 },
      { name: 'repetir', type: 'u8', label: 'Dias da semana (bits)', default: 31, min: 0, max: 127 },
    ],
    encode: (p) => [p.naoPerturbe & 0xff, p.ligado & 0xff, 0, p.limite & 0xff, p.tempo & 0xff, p.inicio & 0xff, p.fim & 0xff, p.repetir & 0xff],
    note: 'Pausa, liga, 0, limite, tempo, hora inicial, hora final e dias. Igual à etiqueta 7 de 02/06.',
  },
  setDND: {
    params: [
      { name: 'ligado', type: 'u8', label: 'Ligado (1) ou desligado (0)', default: 0, min: 0, max: 1 },
      { name: 'inicio', type: 'u16', label: 'Início (minutos do dia)', default: 1320, min: 0, max: 1439 },
      { name: 'fim', type: 'u16', label: 'Fim (minutos do dia)', default: 480, min: 0, max: 1439 },
    ],
    encode: (p) => [p.ligado & 0xff, ...u16(p.inicio), ...u16(p.fim)],
    note: 'Liga e janela do não perturbe em minutos do dia. Igual à etiqueta 12 de 02/06.',
  },
  setStepTarget: {
    params: [{ name: 'passos', type: 'u32', label: 'Meta de passos', default: 8000, min: 0, max: 100000 }],
    encode: (p) => u32(p.passos),
    note: 'u32 big-endian.',
  },
  sendPhoneCallState: {
    params: [
      { name: 'estado', type: 'enum', label: 'Estado', default: 1, options: [{ value: 1, label: 'tocando' }, { value: 5, label: 'atendida' }, { value: 4, label: 'encerrada' }] },
      { name: 'nome', type: 'string', label: 'Nome (até 30)', default: 'Sabatinho' },
      { name: 'numero', type: 'string', label: 'Número (até 20, ASCII)', default: '000000000' },
    ],
    encode: (p) => {
      const name = utf8(String(p.nome).slice(0, 30));
      const num = ascii(String(p.numero).slice(0, 20));
      return [p.estado & 0xff, name.length, ...name, num.length, ...num];
    },
    note: 'estado, tam+nome (UTF-8), tam+número (ASCII). O app oficial manda 1 ao tocar, 5 ao atender e 4 ao encerrar.',
  },
  sendDeleteMsg: {
    params: [{ name: 'id', type: 'u16', label: 'ID da notificação a apagar', default: 1, min: 0, max: 65535 }],
    encode: (p) => u16(p.id),
    note: 'id da notificação (u16 big-endian).',
  },
  getEventReminder: {
    params: [{ name: 'suporte', type: 'bytes', label: 'Bytes de suporte (resposta de 13/00, em hex)', default: [] }],
    encode: (p) => (Array.isArray(p.suporte) ? p.suporte : []).map((b) => b & 0xff),
    note: 'O app oficial reenvia os bytes que o relógio informou em 13/00 (lembretes suportados).',
  },
  sendMsg: {
    params: [
      { name: 'id', type: 'u16', label: 'ID da notificação', default: 1, min: 0, max: 65535 },
      { name: 'app', type: 'string', label: 'Nome do app', default: 'Sabatinho' },
      { name: 'titulo', type: 'string', label: 'Título', default: 'Teste' },
      { name: 'texto', type: 'string', label: 'Texto', default: 'Protocolo antigo' },
      { name: 'mtu', type: 'u16', label: 'MTU negociado', default: 100, min: 23, max: 512 },
    ],
    encode: (p) => {
      const app = utf8(p.app);
      const title = utf8(p.titulo);
      let body = utf8(p.texto);
      const limit = p.mtu - 12; // plataforma 10: limite = MTU - 12
      const head = app.length + 10 + title.length;
      if (head > limit) throw new Error('nome do app + título não cabem no MTU');
      if (head + body.length > limit) body = body.slice(0, limit - head);
      const ts = Math.floor(Date.now() / 1000);
      return [...u16(p.id), ...u32(ts), app.length, ...app, title.length, ...title, ...u16(body.length), ...body];
    },
    note: 'id(2) horário(4) tam+app tam+título tam(2)+texto, limitado a MTU-12 (protocolo sem tipo de app).',
  },
  sendMsgNewProtocol: {
    params: [
      { name: 'id', type: 'u16', label: 'ID da notificação', default: 1, min: 0, max: 65535 },
      { name: 'tipo', type: 'enum', label: 'App', default: 255, options: [
        { value: 1, label: 'SMS' }, { value: 2, label: 'WeChat' }, { value: 3, label: 'QQ' }, { value: 4, label: 'Facebook' },
        { value: 5, label: 'Twitter' }, { value: 7, label: 'Line' }, { value: 8, label: 'WhatsApp' }, { value: 9, label: 'KakaoTalk' },
        { value: 10, label: 'Instagram' }, { value: 255, label: 'outro' }] },
      { name: 'app', type: 'string', label: 'Nome do app', default: 'Sabatinho' },
      { name: 'titulo', type: 'string', label: 'Título', default: 'Teste' },
      { name: 'texto', type: 'string', label: 'Texto', default: 'Olá do Relógio Sabatinho' },
    ],
    encode: (p) => {
      const app = utf8(p.app);
      const title = utf8(p.titulo);
      let body = utf8(p.texto);
      const head = app.length + 11 + title.length;
      const limit = 199; // plataforma 10
      if (head + body.length > limit) body = body.slice(0, Math.max(0, limit - head));
      const ts = Math.floor(Date.now() / 1000);
      return [...u16(p.id), ...u32(ts), p.tipo & 0xff, app.length, ...app, title.length, ...title, ...u16(body.length), ...body];
    },
    note: 'id(2) horário(4, segundos) tipo(1) tam+app tam+título tam(2)+texto, limitado a 199 bytes na plataforma 10.',
  },
};

// ---------- o que cada comando costuma receber de volta ----------
const RESPONSE_HINT = {
  0x00: 'DF 00/00 com o bloco de recursos.', 0x02: 'ACK FD; leituras voltam como DF 02/xx.',
  0x03: 'Estado em 03/0F etc., valor ao vivo em 03/2A e histórico em 03/00.', 0x04: 'Dados em 04/00 (hoje), 04/01 (por hora), 04/02 (sono).',
  0x06: 'ACK FD; medições respondem no comando 03.', 0x11: 'DF 11/00 ou 11/01 com a porcentagem no último byte.',
  0x14: 'DF 14/00 com "cliente-produto".', 0x20: 'DF 20/01: prefixo(4) tam+versão tam+chip.', 0xf3: 'ACK FD; o app oficial segue com 02/17.',
};

// ---------- montagem ----------
function paramsFor(e) {
  if (e.kind === 'u8') {
    return e.paramOrder.map((name) => ({ name, type: 'u8', label: name, default: /realtime|wearing|24|unit|carousel/i.test(e.method) ? 1 : 0, min: 0, max: 255 }));
  }
  if (e.kind === 'bool') return e.paramOrder.map((name) => ({ name, type: 'bool', label: 'ligar (marcado) ou desligar', default: true }));
  return [];
}

function encoderFor(e) {
  if (e.kind === 'empty') return () => [];
  if (e.kind === 'fixed') return () => [...e.fixed];
  if (e.kind === 'u8') return (p) => e.paramOrder.map((n) => Number(p[n]) & 0xff);
  if (e.kind === 'bool') return (p) => [p[e.paramOrder[0]] ? 1 : 0];
  return null;
}

const seen = new Map();
export const COMMANDS = CATALOG.map((e) => {
  const custom = CUSTOM[e.method];
  const n = (seen.get(e.method) || 0) + 1;
  seen.set(e.method, n);
  const encode = custom?.encode ?? encoderFor(e);
  const group = groupOf(e);
  const risk = riskOf(e);
  return {
    id: n > 1 ? `${e.method}_${n}` : e.method,
    method: e.method,
    cmd: e.cmd,
    key: e.key,
    group,
    risk,
    label: (LABELS[e.method] || humanize(e.method)) + (n > 1 ? ` (${n})` : ''),
    description: [
      custom?.note || ({ empty: 'Sem payload.', fixed: `Payload fixo: ${e.fixed.map((b) => b.toString(16).padStart(2, '0')).join(' ')}.`, u8: `Um byte por parâmetro: ${e.paramOrder.join(', ')}.`, bool: '1 liga, 0 desliga.' }[e.kind]
        ?? 'Payload complexo: documentado, ainda não implementado no app.'),
      e.hint ? `Log do app oficial: "${e.hint}".` : '',
      e.variants > 1 ? `O método tem ${e.variants} variantes; usada a primeira.` : '',
    ].filter(Boolean).join(' '),
    params: custom?.params ?? paramsFor(e),
    encode,
    implemented: Boolean(encode),
    response: RESPONSE_HINT[e.cmd] || '',
    source: `CommandUtils.java:${e.line}`,
  };
});

// ---------- respostas do relógio ----------
export const RESPONSES = [
  { cmd: 0x00, key: 0x00, name: 'recursos', description: 'Bloco de recursos (bits por função) e plataforma.', parse: (p) => ({ bytes: p.length, plataforma: p.length > 6 ? (p[6] & 15) : null }) },
  {
    cmd: 0x02, key: 0x17, name: 'nome e firmware', description: '[tam][versão][tam][projeto].',
    parse: (p) => {
      const vl = p[0] ?? 0;
      const version = text(p.slice(1, 1 + vl));
      const pl = p[1 + vl] ?? 0;
      return { versao: version, projeto: text(p.slice(2 + vl, 2 + vl + pl)) };
    },
  },
  {
    cmd: 0x20, key: 0x01, name: 'OTA e chip', description: 'prefixo(4) tam+versão tam+chip.',
    parse: (p) => {
      const vl = p[4] ?? 0;
      const cl = p[5 + vl] ?? 0;
      return { prefixo: Array.from(p.slice(0, 4), (b) => b.toString(16).padStart(2, '0')).join(''), versao: text(p.slice(5, 5 + vl)), chip: text(p.slice(6 + vl, 6 + vl + cl)) };
    },
  },
  { cmd: 0x20, key: 0x02, name: 'resposta de OTA', description: '1 bateria baixa, 2 música, 3 chamada; outro valor: atualização começa.', parse: (p) => ({ codigo: p[0] }) },
  { cmd: 0x11, key: 0x00, name: 'bateria', description: 'Porcentagem no último byte.', parse: (p) => ({ porcentagem: p[p.length - 1] }) },
  { cmd: 0x11, key: 0x01, name: 'bateria (relato)', description: 'Porcentagem no último byte.', parse: (p) => ({ porcentagem: p[p.length - 1] }) },
  { cmd: 0x11, key: 0x03, name: 'modo economia', description: 'Estado do modo economia.', parse: (p) => ({ economia: p[0] }) },
  { cmd: 0x11, key: 0x05, name: 'carregando', description: 'Estado de carga.', parse: (p) => ({ carregando: p[0] }) },
  { cmd: 0x11, key: 0x06, name: 'bateria baixa', description: '1 = abaixo de 20%, outro = abaixo de 10%.', parse: (p) => ({ nivel: p[0] === 1 ? 'abaixo de 20%' : 'abaixo de 10%' }) },
  { cmd: 0x14, key: 0x00, name: 'produto', description: '"cliente-produto" em texto.', parse: (p) => { const [cliente, produto] = text(p).split('-'); return { cliente, produto }; } },
  { cmd: 0x01, key: 0x02, name: 'sincronização: início', description: 'O relógio começou a enviar dados.', parse: (p) => ({ valor: p[0] }) },
  { cmd: 0x01, key: 0x03, name: 'sincronização: fim', description: 'O relógio terminou de enviar dados.', parse: (p) => ({ valor: p[0] }) },
  { cmd: 0x03, key: 0x00, name: 'histórico de FC', description: 'data(2) qtd(2) + registros de 8 bytes.', parse: (p) => decodeHrHistory(p) },
  { cmd: 0x03, key: 0x09, name: 'limites de alerta de FC', description: 'Alto: liga, máx, mín, passo, atual; baixo: idem.', parse: (p) => ({ alto: { ligado: p[0], atual: p[4] }, baixo: { ligado: p[5], atual: p[9] } }) },
  { cmd: 0x03, key: 0x0f, name: 'estado da medição de FC', description: '1 medindo, 0 parado.', parse: (p) => decodeStatus(0x0f, p) },
  { cmd: 0x03, key: 0x12, name: 'estado da medição de SpO2', description: '1 medindo, 0 parado.', parse: (p) => decodeStatus(0x12, p) },
  { cmd: 0x03, key: 0x15, name: 'estado da medição de pressão', description: '1 medindo, 0 parado.', parse: (p) => decodeStatus(0x15, p) },
  { cmd: 0x03, key: 0x29, name: 'estado da medição de estresse', description: '1 medindo, 0 parado.', parse: (p) => decodeStatus(0x29, p) },
  { cmd: 0x03, key: 0x2a, name: 'valor ao vivo', description: '[tipo, valor]: 1 = bpm, 2 = SpO2 %.', parse: (p) => decodeLive(p) },
  { cmd: 0x04, key: 0x00, name: 'atividade de hoje', description: 'passos, metros e calorias (u32).', parse: (p) => decodeToday(p) },
  { cmd: 0x04, key: 0x01, name: 'passos por hora', description: 'data(2) qtd(2) + 12 bytes por hora.', parse: (p) => { const h = decodeHourly(p); return h && { data: h.date, horas: h.hours.length, total: h.hours.reduce((a, x) => a + x.steps, 0) }; } },
  { cmd: 0x04, key: 0x02, name: 'sono', description: 'data(2) qtd(2) início(2) + segmentos.', parse: (p) => (p.length >= 4 ? { data: decodeDate2(p[0], p[1]).iso, segmentos: (p[2] << 8) | p[3] } : null) },
  { cmd: 0x06, key: 0x08, name: 'alarmes', description: 'máx/atual, toque e 5 bytes por alarme.', parse: (p) => ({ maximo: p[0] >> 4, atual: p[0] & 15 }) },
];

export function commandById(id) {
  return COMMANDS.find((c) => c.id === id);
}
