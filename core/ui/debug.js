// Aba "Depurar": serviços GATT do aparelho conectado, decodificador de quadros,
// montador de quadros (só mostra os bytes, NUNCA envia) e leitor de registros .jsonl.
import { parseFrame, buildFrame, hex, describe, isBlocked } from '../protocol.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const h2 = (n) => n.toString(16).padStart(2, '0');

const GATT_NAMES = {
  '18ac': 'comandos DF/FD', '2aad': 'escrita de comandos', '2aac': 'notificação de comandos',
  '180f': 'bateria', '2a19': 'nível da bateria',
  '1106': 'transferência de arquivos D5/D6 (não escrever)', '1107': 'notificação de arquivos', '1108': 'escrita de arquivos (bloqueada)',
  '18a8': 'firmware em DFU (não escrever)', '2aa9': 'escrita de firmware (bloqueada)', '2aa8': 'notificação de firmware',
  '1800': 'acesso genérico', '1801': 'atributos genéricos', '180a': 'informações do aparelho',
};
const short = (uuid) => {
  const m = /^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/i.exec(uuid);
  return m ? m[1].toLowerCase() : uuid.toLowerCase();
};

/** "df 00 0a ..." ou "DF000A..." → bytes. Ignora espaços, vírgulas e "0x". */
export function parseHex(text) {
  const clean = String(text).replace(/0x/gi, '').replace(/[^0-9a-f]/gi, '');
  if (clean.length % 2) throw new Error('número ímpar de dígitos hexadecimais');
  return Uint8Array.from(clean.match(/../g) || [], (b) => parseInt(b, 16));
}

/** Interpreta um quadro em texto para a tela (também usado nos testes). */
export function explainFrame(bytes, responses = []) {
  const f = parseFrame(bytes);
  if (!f) return { ok: false, text: 'Não é um quadro DF/FD (precisa começar com DF ou FD e ter ao menos 7 bytes).' };
  const lines = [
    `${f.kind} ${h2(f.cmd)}/${h2(f.key)} (decimal ${f.cmd}/${f.key}), versão ${f.version}`,
    `checksum ${f.checksumOk ? 'ok' : 'ERRADO'}, tamanho ${f.lengthOk ? 'ok' : 'não confere'}`,
  ];
  if (f.kind === 'FD') lines.push(`confirmação com status ${f.status} (${f.status === 0 ? 'ok' : f.status === 3 ? 'checksum inválido' : 'falha'})`);
  if (f.payload.length) lines.push(`payload (${f.payload.length} bytes): ${hex(f.payload)}`);
  const d = describe(f);
  if (d) lines.push(d);
  const r = responses.find((x) => x.cmd === f.cmd && x.key === f.key);
  if (r && f.kind === 'DF') {
    lines.push(`resposta conhecida: ${r.name}`);
    try { lines.push(JSON.stringify(r.parse(f.payload))); } catch (e) { lines.push(`(o leitor falhou: ${e.message})`); }
  }
  if (isBlocked(f.cmd, f.key)) lines.push('Atenção: este cmd/key é bloqueado no app (OTA, fábrica ou vínculo).');
  return { ok: true, frame: f, text: lines.join('\n') };
}

export function mountDebug(section, { session, responses = [], platform }) {
  section.innerHTML = `
    <div class="block">
      <h2>Pareamento e serviços</h2>
      <p id="dbgPair"></p>
      <ul class="gatt" id="dbgGatt"></ul>
    </div>
    <div class="block">
      <h2>Decodificar quadros</h2>
      <p>Cole um quadro por linha, em hex (do registro, do btsnoop ou do logcat).</p>
      <textarea class="mono-in" id="dbgHex" rows="4" spellcheck="false" placeholder="df 00 07 3b 02 04 17 00 00"></textarea>
      <div class="actions"><button class="btn quiet" id="dbgDecode">Decodificar</button></div>
      <pre class="frame-out" id="dbgOut" hidden></pre>
    </div>
    <div class="block">
      <h2>Montar quadro</h2>
      <p>Só calcula os bytes e o checksum. Este painel não envia nada ao relógio: para enviar, use a aba Comandos.</p>
      <div class="build-grid">
        <label>cmd (hex)<input class="search" id="bCmd" value="02" maxlength="2"></label>
        <label>key (hex)<input class="search" id="bKey" value="17" maxlength="2"></label>
        <label>versão<input class="search" id="bVer" value="04" maxlength="2"></label>
        <label class="wide">payload (hex)<input class="search" id="bPay" value="00"></label>
      </div>
      <pre class="frame-out" id="bOut"></pre>
    </div>
    <div class="block">
      <h2>Abrir um registro</h2>
      <p>Escolha um arquivo <code>sessao-*.jsonl</code> salvo pelo app (Android, desktop ou web) para rever os quadros.</p>
      <label for="dbgFile">Abrir registro de uma sessão</label><input type="file" id="dbgFile" accept=".jsonl,.json,.txt">
      <p class="file" id="dbgFileInfo"></p>
      <input class="search" id="dbgFileSearch" aria-label="Filtrar arquivo de registro" type="search" placeholder="Filtrar por cmd/key, hex ou texto" hidden>
      <ul class="results" id="dbgFileList"></ul>
    </div>`;

  const $ = (s) => section.querySelector(s);

  // ---------- pareamento ----------
  function renderPair() {
    const supported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
    const base = platform?.name?.startsWith('Web')
      ? (supported
        ? 'Este navegador tem Web Bluetooth. "Conectar" abre a lista do próprio navegador; o relógio precisa estar desconectado do celular. Para esquecer uma permissão, use as configurações do site no navegador.'
        : 'Este navegador não tem Web Bluetooth. Use Chrome ou Edge no computador ou no Android (Safari e iOS não suportam), em https ou localhost.')
      : 'A conexão usa o Bluetooth do sistema. O relógio aceita uma conexão por vez.';
    const dev = session.device;
    $('#dbgPair').textContent = dev ? `${base} Conectado a ${dev.name || '?'} (${dev.id}).` : base;
    const list = $('#dbgGatt');
    if (!dev || !session.services) {
      list.innerHTML = '<li class="file">Os serviços aparecem depois de conectar.</li>';
      return;
    }
    list.innerHTML = session.services.map((s) => `
      <li><b>${esc(short(s.uuid))}</b> <span>${esc(GATT_NAMES[short(s.uuid)] || 'desconhecido')}</span>
        <ul>${(s.characteristics || []).map((c) => `<li><code>${esc(short(c.uuid))}</code> ${esc((c.properties || []).join(', '))}
          <span>${esc(GATT_NAMES[short(c.uuid)] || '')}</span></li>`).join('')}</ul></li>`).join('');
  }
  session.addEventListener('connection', renderPair);
  renderPair();

  // ---------- decodificador ----------
  $('#dbgDecode').onclick = () => {
    const out = $('#dbgOut');
    out.hidden = false;
    const lines = $('#dbgHex').value.split('\n').map((l) => l.trim()).filter(Boolean);
    out.textContent = lines.length ? lines.map((l, i) => {
      try { return `#${i + 1}\n${explainFrame(parseHex(l), responses).text}`; } catch (e) { return `#${i + 1}\n${e.message}`; }
    }).join('\n\n') : 'Cole ao menos um quadro.';
  };

  // ---------- montador ----------
  const rebuild = () => {
    try {
      const n = (id) => { const b = parseHex($(id).value); if (b.length !== 1) throw new Error(`${id.slice(2)} precisa de 1 byte`); return b[0]; };
      const frame = buildFrame(n('#bCmd'), n('#bKey'), parseHex($('#bPay').value), n('#bVer'));
      $('#bOut').textContent = `${hex(frame)}\n\n${explainFrame(frame, responses).text}`;
    } catch (e) {
      $('#bOut').textContent = e.message;
    }
  };
  section.querySelectorAll('.build-grid input').forEach((i) => i.addEventListener('input', rebuild));
  rebuild();

  // ---------- leitor de registro ----------
  let entries = [];
  const renderFile = () => {
    const q = $('#dbgFileSearch').value.trim().toLowerCase();
    const shown = entries.filter((e) => !q || JSON.stringify(e).toLowerCase().includes(q)).slice(0, 400);
    $('#dbgFileList').innerHTML = shown.map((e) => `
      <li data-status="${e.dir === 'rx' ? 'passou' : e.type === 'erro' ? 'erro' : 'pulado'}">
        <span class="mark">${e.dir === 'rx' ? '←' : e.dir === 'tx' ? '→' : '·'}</span>
        <span>${esc(e.summary || e.note || e.type)}</span><span class="ms">${esc((e.t || '').slice(11, 19))}</span>
        ${e.hex ? `<span class="why">${esc(e.hex)}</span>` : ''}</li>`).join('');
  };
  $('#dbgFile').onchange = async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    entries = [];
    let bad = 0;
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try { entries.push(JSON.parse(line)); } catch { bad += 1; }
    }
    const count = (pred) => entries.filter(pred).length;
    $('#dbgFileInfo').textContent = `${file.name}: ${entries.length} entradas (${count((e) => e.dir === 'rx')} do relógio, ${count((e) => e.dir === 'tx')} do app, ${count((e) => e.type === 'erro')} erros${bad ? `, ${bad} linhas ilegíveis` : ''}). Mostrando até 400.`;
    $('#dbgFileSearch').hidden = false;
    renderFile();
  };
  $('#dbgFileSearch').addEventListener('input', renderFile);
}
