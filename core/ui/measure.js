// Aba "Medir": um monitor multiparamétrico. Cada medição é um canal com cor e ilustração
// próprias (FC, pressão, estresse, oxigênio, temperatura, HRV). O fluxo segue o app oficial
// (MeasurementBtnView): toca no canal, abre a janela de medição, "medindo" até o relógio
// mandar o estado 0 ou 2, mostra o resultado com a classificação e permite medir de novo;
// fechar a janela no meio para a medição. Medições começadas no próprio relógio também
// aparecem. O histórico do dia usa 48 meias horas, como o gráfico diário do app oficial.
import {
  decodeToday, decodeHourly, decodeHrHistory, decodeLive, decodeStatus, stats, MEASUREMENTS, measureCommand,
  RESULT_KEYS, RESULT_DECODERS, STATUS_TO_ID, classify, halfHourSlot,
} from '../measure.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n, d = 0) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: d });

const TODAY_CMD = {
  id: 'todaySync', method: 'getTodayData', cmd: 0x01, key: 0x01, group: 'saude', risk: 'seguro',
  label: 'Atividade de hoje', description: 'Pede ao relógio os dados do dia.', params: [], encode: () => [1],
};

// Quanto o app espera no máximo. O app oficial não tem prazo (espera o estado do relógio);
// este é só uma rede de segurança. no TF37 Pro: FC ~10 s, pressão ~20 s, estresse ~30 s.
const LIMIT_S = { hr: 60, bp: 90, stress: 90, spo2: 45, temp: 45, hrv: 60 };
// Sem nenhum estado nesse tempo, o relógio não tem o sensor (SpO2, temperatura e HRV no TF37 Pro).
const NO_STATUS_S = 8;

const CHANNEL = {
  hr: { tip: 'Relógio justo no pulso, um dedo acima do osso. Fique parado e em silêncio.', ref: 'Referência em repouso: 60 a 100 bpm.' },
  bp: { tip: 'Sentado, braço apoiado na altura do coração. Não fale durante a medição.', ref: 'Referência: abaixo de 120/80 mmHg. Relógios estimam a pressão pela pulsação; não substituem um aparelho de braço.' },
  stress: { tip: 'Respire normalmente e fique parado. Leva cerca de 30 s.', ref: 'Faixas do app oficial: 1–29 relaxado, 30–59 normal, 60–79 médio, 80–100 alto.' },
  spo2: { tip: 'Pulso apoiado e parado.', ref: 'Referência: 95% ou mais.' },
  temp: { tip: 'Pele seca, relógio justo.', ref: 'Referência de superfície: 35,5 a 37,2 °C.' },
  hrv: { tip: 'Parado e relaxado.', ref: 'A HRV varia muito de pessoa para pessoa; compare com você mesmo.' },
};

// ---------- ilustrações (SVG próprio; a animação liga com data-state="measuring") ----------
const ART = {
  hr: `<svg viewBox="0 0 120 90" aria-hidden="true"><path class="fill" d="M60 80 C20 54 8 38 8 24 8 12 18 4 30 4c12 0 22 8 30 20C68 12 78 4 90 4c12 0 22 8 22 20 0 14-12 30-52 56z"/>
    <path class="trace" d="M4 46h30l6-12 8 26 8-40 8 34 6-8h46"/></svg>`,
  bp: `<svg viewBox="0 0 120 90" aria-hidden="true"><path class="track" d="M18 70a42 42 0 0 1 84 0"/><path class="arc" d="M18 70a42 42 0 0 1 84 0"/>
    <g class="needle"><line x1="60" y1="70" x2="60" y2="36"/></g><circle class="hub" cx="60" cy="70" r="6"/>
    <rect class="cuff" x="38" y="78" width="44" height="8" rx="4"/></svg>`,
  stress: `<svg viewBox="0 0 120 90" aria-hidden="true"><circle class="ring r1" cx="60" cy="45" r="14"/><circle class="ring r2" cx="60" cy="45" r="26"/><circle class="ring r3" cx="60" cy="45" r="38"/>
    <path class="trace" d="M6 45q9-20 18 0t18 0 18 0 18 0 18 0 18 0"/></svg>`,
  spo2: `<svg viewBox="0 0 120 90" aria-hidden="true"><path class="fill" d="M60 6C46 26 30 42 30 58a30 30 0 0 0 60 0C90 42 74 26 60 6z"/>
    <text x="60" y="66" text-anchor="middle" class="label">O₂</text></svg>`,
  temp: `<svg viewBox="0 0 120 90" aria-hidden="true"><rect class="track" x="52" y="6" width="16" height="58" rx="8"/><rect class="level" x="56" y="22" width="8" height="46" rx="4"/>
    <circle class="fill" cx="60" cy="72" r="13"/></svg>`,
  hrv: `<svg viewBox="0 0 120 90" aria-hidden="true"><path class="trace" d="M4 54h18l5-16 6 30 6-34 5 20h30l5-16 6 30 6-34 5 20h20"/>
    <path class="bracket" d="M36 18v8h46v-8"/><text x="59" y="14" text-anchor="middle" class="label small">ms</text></svg>`,
};

export function createMeasure({ root, session, recorder, commands = [] }) {
  const st = {
    measuring: null, external: null, timer: null, noStatus: null, tick: null, startedAt: 0, stoppedAt: 0,
    last: null, connected: false, gotStatus: false, sheetFor: null, chartFor: 'hr', result: null, failed: false,
  };
  const records = Object.fromEntries(MEASUREMENTS.map((m) => [m.id, new Map()])); // id -> Map(date|seconds -> rec)
  const latest = {}; // id -> { r, date }
  // Histórico guardado no aparelho (últimos 30 dias), para sobreviver a reinícios do app.
  const STORE_KEY = 'relogio.medicoes.v1';
  const save = () => {
    try {
      const cut = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
      const out = Object.fromEntries(Object.entries(records).map(([id, map]) => [id, [...map.values()].filter((r) => r.date >= cut)]));
      localStorage.setItem(STORE_KEY, JSON.stringify(out));
    } catch (_e) { /* sem armazenamento: só nesta sessão */ }
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    for (const [id, list] of Object.entries(saved)) {
      if (!records[id] || !Array.isArray(list)) continue;
      for (const r of list) records[id].set(`${r.date}|${r.seconds}`, r);
    }
  } catch (_e) { /* armazenamento indisponível ou corrompido */ }
  const SYNC_CMD = commands.find((c) => c.id === 'syncData') || TODAY_CMD;

  root.innerHTML = `
    <div class="block">
      <h2>Medições</h2>
      <p>Toque em um canal para medir. Medições feitas no menu do relógio também aparecem aqui; use "Buscar no relógio" para trazer as que ficaram guardadas nele.</p>
      <div class="channels" id="mChannels"></div>
      <div class="actions"><button class="btn quiet" id="mSync" disabled>Buscar no relógio</button></div>
      <p class="file" id="mSyncNote">Classificações de FC, pressão, oxigênio e temperatura são referências gerais de adulto em repouso, não diagnóstico.</p>
    </div>

    <div class="block">
      <h2 id="mDayTitle">Hoje</h2>
      <div class="chips" id="mChartPick" role="group" aria-label="Medição do gráfico"></div>
      <svg id="mDay" class="daychart" viewBox="0 0 300 140" width="100%" height="160" role="img" aria-label="Medições de hoje por meia hora"></svg>
      <dl class="monitor-facts" id="mDayStats"></dl>
      <ul class="results" id="mDayList"></ul>
    </div>

    <div class="block">
      <h2>Atividade de hoje</h2>
      <dl class="facts" id="mToday"><dt>—</dt><dd>Toque em "Atualizar" para pedir os dados ao relógio.</dd></dl>
      <svg id="mHours" viewBox="0 0 288 80" width="100%" height="80" role="img" aria-label="Passos por hora" style="display:block;margin:10px 0"></svg>
      <div class="actions"><button class="btn" id="mToday1" disabled>Atualizar</button></div>
      <p class="file">Passos, distância em metros e calorias em cal (04/00); passos por hora (04/01).</p>
    </div>`;

  // janela de medição: fora do root para ficar por cima de tudo
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  const sheet = document.createElement('section');
  sheet.className = 'sheet measure-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-labelledby', 'msTitle');
  document.body.append(backdrop, sheet);

  const $ = (s) => root.querySelector(s);
  const byId = (id) => MEASUREMENTS.find((m) => m.id === id);

  // ---------- canais ----------
  function renderChannels() {
    $('#mChannels').innerHTML = MEASUREMENTS.map((m) => {
      const l = latest[m.id];
      const c = l ? classify(m.id, l.r) : null;
      const busy = (st.measuring?.id === m.id) || (st.external?.id === m.id);
      return `<button class="channel" data-ch="${m.id}" data-state="${busy ? 'measuring' : 'idle'}" ${st.connected ? '' : 'disabled'}>
        <span class="art">${ART[m.id]}</span>
        <span class="ch-name">${esc(m.label)}</span>
        <span class="ch-value">${l ? esc(l.r.text) : '—'}<small>${esc(m.unit)}</small></span>
        <span class="ch-meta">${busy ? 'medindo…' : l ? `${esc(l.r.time)}${c?.label ? ` · <b data-tone="${c.tone}">${esc(c.label)}</b>` : ''}` : m.declared || m.id === 'bp' || m.id === 'stress' ? 'toque para medir' : 'sensor não declarado'}</span>
      </button>`;
    }).join('');
  }
  $('#mChannels').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ch]');
    if (b) openSheet(b.dataset.ch, true);
  });

  // ---------- janela de medição ----------
  function renderSheet() {
    const id = st.sheetFor;
    if (!id) return;
    const m = byId(id);
    const appRunning = st.measuring?.id === id;
    const watchRunning = st.external?.id === id;
    const running = appRunning || watchRunning;
    const r = st.result;
    const c = r ? classify(id, r) : null;
    const secs = running ? Math.round((Date.now() - st.startedAt) / 1000) : 0;
    const state = running ? 'measuring' : r ? 'done' : st.failed ? 'failed' : 'idle';
    sheet.dataset.ch = id;
    sheet.innerHTML = `
      <h3 id="msTitle">${esc(m.label)}</h3>
      <div class="ms-art" data-ch="${id}" data-state="${state}">${ART[id]}</div>
      <p class="ms-value" aria-live="polite">${r ? `${esc(r.text)} <small>${esc(m.unit)}</small>` : running ? `<span class="ms-secs">${secs} s</span>` : '—'}</p>
      <p class="ms-state" aria-live="polite">${running ? (watchRunning ? 'Medindo no relógio…' : st.gotStatus ? 'Medindo…' : 'Pedindo ao relógio…')
        : r ? `${c?.label ? `<b data-tone="${c.tone}">${esc(c.label)}</b> · ` : ''}medido às ${esc(r.time)}`
        : st.failed ? esc(st.failed) : esc(CHANNEL[id].tip)}</p>
      <p class="file">${esc(CHANNEL[id].ref)}</p>
      <div class="actions">
        ${running ? '<button class="btn quiet" id="msStop">Parar</button>'
          : `<button class="btn watch" id="msGo" ${st.connected && !st.measuring ? '' : 'disabled'}>${r || st.failed ? 'Medir de novo' : 'Começar'}</button>`}
        <button class="btn quiet" id="msClose">${running ? 'Fechar e parar' : 'Fechar'}</button>
      </div>`;
    sheet.querySelector('#msGo')?.addEventListener('click', () => start(m));
    sheet.querySelector('#msStop')?.addEventListener('click', () => (appRunning ? stop('parado por você') : stopWatch()));
    sheet.querySelector('#msClose').addEventListener('click', closeSheet);
  }
  function openSheet(id, fresh) {
    if (st.sheetFor !== id || fresh) { st.result = null; st.failed = false; }
    st.sheetFor = id;
    backdrop.classList.add('open');
    sheet.classList.add('open');
    renderSheet();
    sheet.querySelector('#msGo, #msStop')?.focus();
  }
  function closeSheet() {
    if (st.measuring) stop('janela fechada'); // como o app oficial: fechar cancela a medição
    else if (st.external) stopWatch();
    st.sheetFor = null;
    backdrop.classList.remove('open');
    sheet.classList.remove('open');
  }
  backdrop.addEventListener('click', closeSheet);
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && st.sheetFor) closeSheet(); });

  function ticking(on) {
    clearInterval(st.tick);
    st.tick = on ? setInterval(() => { if (st.sheetFor) { const s = sheet.querySelector('.ms-secs'); if (s) s.textContent = `${Math.round((Date.now() - st.startedAt) / 1000)} s`; } }, 1000) : null;
  }

  // ---------- medir ----------
  async function start(m) {
    if (st.measuring || !st.connected) return;
    st.measuring = m;
    st.external = null;
    st.startedAt = Date.now();
    st.last = m;
    st.gotStatus = false;
    st.result = null;
    st.failed = false;
    if (st.sheetFor !== m.id) openSheet(m.id); else renderSheet();
    renderChannels();
    setButtons();
    ticking(true);
    await recorder.add({ type: 'medicao', note: `início: ${m.label}` });
    try {
      await session.send(measureCommand(m, true));
    } catch (e) {
      st.measuring = null;
      st.failed = `Não enviado: ${e.message}`;
      ticking(false);
      renderSheet(); renderChannels(); setButtons();
      return;
    }
    st.timer = setTimeout(() => stop('tempo esgotado', 'O relógio não entregou o resultado a tempo. Ajuste no pulso e tente de novo.'), LIMIT_S[m.id] * 1000);
    st.noStatus = setTimeout(() => {
      if (st.measuring?.id === m.id && !st.gotStatus) stop('sem estado', `O relógio não respondeu com o estado da medição: este modelo não tem o sensor de ${m.label === 'HRV' ? 'HRV' : m.label.toLowerCase()}.`);
    }, NO_STATUS_S * 1000);
  }

  async function stop(reason, failText) {
    const m = st.measuring;
    if (!m) return;
    clearTimeout(st.timer);
    clearTimeout(st.noStatus);
    ticking(false);
    st.measuring = null;
    st.stoppedAt = Date.now();
    if (failText && !st.result) st.failed = failText;
    setButtons();
    renderChannels();
    renderSheet();
    try { await session.send(measureCommand(m, false)); } catch (_e) { /* desconectado */ }
    await recorder.add({ type: 'medicao', note: `fim: ${m.label} (${reason})`, resultado: st.result });
  }

  async function stopWatch() {
    const m = st.external;
    st.external = null;
    ticking(false);
    renderChannels(); renderSheet();
    if (m) try { await session.send(measureCommand(m, false)); } catch (_e) { /* desconectado */ }
  }

  // Medição começada no menu do relógio: o estado chega sem o app ter pedido.
  function watchStarted(id) {
    if (st.measuring || st.external?.id === id) return;
    // Depois do "parar", o relógio ainda manda um último estado "medindo" (visto no estresse): é eco, não medição nova.
    if (st.last?.id === id && Date.now() - st.stoppedAt < 10000) return;
    const m = byId(id);
    if (!m) return;
    st.external = m;
    st.startedAt = Date.now();
    st.result = null;
    st.failed = false;
    ticking(true);
    recorder.add({ type: 'medicao', origem: 'relogio', note: `início no menu do relógio: ${m.label}` });
    openSheet(id);
    renderChannels();
  }

  // ---------- resultados ----------
  function addRecords(id, h) {
    const map = records[id];
    for (const r of h.records) map.set(`${h.date}|${r.seconds}`, { ...r, date: h.date });
    const newest = [...map.values()].sort((a, b) => (a.date + String(a.seconds).padStart(6, '0')).localeCompare(b.date + String(b.seconds).padStart(6, '0'))).pop();
    if (newest) latest[id] = { r: newest, date: newest.date };
    save();
    renderChannels();
    if (st.chartFor === id) renderDay();
  }

  function takeResult(id, h) {
    if (!h.records.length) return null;
    const r = h.records[h.records.length - 1];
    const now = new Date();
    const nowS = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const appM = st.measuring || (Date.now() - st.stoppedAt < 15000 ? st.last : null);
    const fromApp = appM?.id === id;
    const fromWatch = !fromApp && (st.external?.id === id || Math.abs(r.seconds - nowS) <= 180);
    if (!fromApp && !fromWatch) return null;
    // Folga de 10 min para o relógio fora de hora; um registro mais velho é histórico.
    const since = fromApp ? (Date.now() - st.startedAt) / 1000 : 180;
    if (Math.abs(r.seconds - nowS) > since + 600) return null;
    st.result = r;
    st.failed = false;
    if (fromWatch) {
      recorder.add({ type: 'medicao', origem: 'relogio', note: `resultado de medição feita no relógio: ${byId(id).label} ${r.text} às ${r.time}` });
      st.external = null;
      ticking(false);
      if (st.sheetFor !== id) openSheet(id);
    }
    if (fromApp && st.measuring) stop('o relógio entregou o resultado');
    if (st.sheetFor === id) renderSheet();
    renderChannels();
    return r;
  }

  // ---------- gráfico do dia (48 meias horas) ----------
  function renderPick() {
    $('#mChartPick').innerHTML = MEASUREMENTS.map((m) => `<button class="chip" data-pick="${m.id}" aria-pressed="${st.chartFor === m.id}">${esc(m.label)}</button>`).join('');
  }
  $('#mChartPick').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-pick]');
    if (!b) return;
    st.chartFor = b.dataset.pick;
    renderPick();
    renderDay();
  });

  const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function renderDay() {
    const id = st.chartFor;
    const m = byId(id);
    // Hoje; se hoje ainda não tem nada, o dia mais recente com medições.
    const all = [...records[id].values()];
    const dates = [...new Set(all.map((r) => r.date))].sort();
    const date = dates.includes(todayIso()) || !dates.length ? todayIso() : dates[dates.length - 1];
    $('#mDayTitle').textContent = date === todayIso() ? 'Hoje' : `Dia ${date.split('-').reverse().join('/')}`;
    const day = all.filter((r) => r.date === date).sort((a, b) => a.seconds - b.seconds);
    const svg = $('#mDay');
    const W = 300; const H = 140; const L = 26; const B = 18; const T = 8;
    const vals = day.flatMap((r) => (id === 'bp' ? [r.sys, r.dia] : [r.value]));
    const lo = vals.length ? Math.floor(Math.min(...vals) * 0.9) : 0;
    const hi = vals.length ? Math.ceil(Math.max(...vals) * 1.1) : 100;
    const y = (v) => T + (H - B - T) * (1 - (v - lo) / (hi - lo || 1));
    const x = (sec) => L + ((halfHourSlot(sec) + 0.5) / 48) * (W - L - 4);
    const grid = [0, 6, 12, 18, 24].map((h) => {
      const gx = L + (h * 2 / 48) * (W - L - 4);
      return `<line x1="${gx}" y1="${T}" x2="${gx}" y2="${H - B}" class="g"/><text x="${gx}" y="${H - 4}" text-anchor="${h === 24 ? 'end' : h === 0 ? 'start' : 'middle'}" class="ax">${h}h</text>`;
    }).join('') + [lo, hi].map((v) => `<text x="${L - 4}" y="${y(v) + 3}" text-anchor="end" class="ax">${fmt(v)}</text>`).join('');
    const marks = day.map((r) => {
      const c = classify(id, r);
      const t = `${r.time}: ${r.text} ${m.unit}`;
      if (id === 'bp') return `<line x1="${x(r.seconds)}" y1="${y(r.sys)}" x2="${x(r.seconds)}" y2="${y(r.dia)}" class="bar" data-tone="${c?.tone}"><title>${esc(t)}</title></line>`;
      return `<circle cx="${x(r.seconds)}" cy="${y(r.value)}" r="4" class="pt" data-tone="${c?.tone}"><title>${esc(t)}</title></circle>`;
    }).join('');
    svg.dataset.ch = id;
    svg.innerHTML = grid + (day.length ? marks : `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" class="ax">Sem ${esc(m.label === 'HRV' ? 'HRV' : m.label.toLowerCase())} neste dia</text>`);
    const s = stats(day.map((r) => r.value));
    $('#mDayStats').innerHTML = s ? `
      <div><dt>Mínimo</dt><dd>${id === 'bp' ? esc(day.find((r) => r.value === s.min).text) : fmt(s.min, id === 'temp' ? 1 : 0)}</dd></div>
      <div><dt>Média</dt><dd>${fmt(s.avg, 1)}</dd></div>
      <div><dt>Máximo</dt><dd>${id === 'bp' ? esc(day.find((r) => r.value === s.max).text) : fmt(s.max, id === 'temp' ? 1 : 0)}</dd></div>
      <div><dt>Medições</dt><dd>${s.n}</dd></div>` : '';
    $('#mDayList').innerHTML = day.slice(-12).reverse().map((r) => {
      const c = classify(id, r);
      return `<li data-status="passou"><span class="mark">●</span><span>${esc(r.time)}${r.auto ? ' · automática' : ''}</span><span class="ms">${esc(r.text)} ${esc(m.unit)}</span>${c?.label ? `<span class="why"><b data-tone="${c.tone}">${esc(c.label)}</b></span>` : ''}</li>`;
    }).join('');
  }

  // ---------- botões ----------
  function setButtons() {
    const on = st.connected;
    $('#mToday1').disabled = !on;
    $('#mSync').disabled = !on;
  }
  $('#mToday1').onclick = () => session.send(TODAY_CMD).catch((e) => recorder.add({ type: 'erro', note: e.message }));
  $('#mSync').onclick = async () => {
    $('#mSyncNote').textContent = 'Pedindo ao relógio o que ele guardou hoje…';
    try {
      await session.send(SYNC_CMD);
      setTimeout(() => { $('#mSyncNote').textContent = 'Pronto. O que o relógio mandou está nos canais e no gráfico.'; }, 6000);
    } catch (e) { $('#mSyncNote').textContent = `Não enviado: ${e.message}`; }
  };

  // ---------- quadros do relógio ----------
  session.addEventListener('frame', async ({ detail: { frame: f } }) => {
    if (f.kind !== 'DF') return;
    const p = f.payload;
    if (f.cmd === 0x03 && f.key === 0x2a) {
      const live = decodeLive(p);
      if (!live) return;
      if (st.measuring && st.sheetFor) { const v = sheet.querySelector('.ms-value'); if (v) v.textContent = `${live.value} ${live.unit}`; }
      await recorder.add({ type: 'medicao', note: `${live.name}: ${live.value} ${live.unit}`, valor: live });
    } else if (f.cmd === 0x03) {
      const status = decodeStatus(f.key, p);
      if (status) {
        const id = STATUS_TO_ID[f.key];
        if (st.measuring?.id === id) {
          st.gotStatus = true;
          if (status.failed) stop('o relógio não conseguiu medir', 'O relógio não conseguiu medir. Aperte a pulseira, fique parado e tente de novo.');
          else if (status.status === 0 && st.result) stop('o relógio terminou');
          else if (status.status === 0) {
            // O resultado costuma vir junto ou logo depois; sem ele em 15 s, o relógio parou sozinho.
            setTimeout(() => { if (st.measuring?.id === id && !st.result) stop('o relógio parou', 'O relógio parou a medição sem entregar resultado. Tente de novo.'); }, 15000);
          }
          else if (st.sheetFor === id) renderSheet();
        } else if (status.status === 1) watchStarted(id);
        else if (st.external?.id === id && status.failed) { st.external = null; st.failed = 'O relógio não conseguiu medir.'; ticking(false); renderSheet(); renderChannels(); }
        await recorder.add({ type: 'medicao', note: `${status.what}: ${status.text}`, estado: status });
      } else if (RESULT_DECODERS[f.key]) {
        const h = RESULT_DECODERS[f.key](p);
        if (!h) return;
        const id = RESULT_KEYS[f.key];
        const m = byId(id);
        addRecords(id, h);
        const r = takeResult(id, h);
        await recorder.add({ type: 'medicao', note: `${m.label}: ${h.records.map((x) => `${x.time} ${x.text} ${m.unit}`).join(', ') || 'sem registros válidos'}${r ? ' (resultado da medição)' : ''}`, historico: h, medida: id });
      } else if (f.key === 0x00) {
        const raw = decodeHrHistory(p);
        if (!raw) return;
        const h = { ...raw, records: raw.records.map((x) => ({ ...x, value: x.bpm, text: String(x.bpm) })) };
        addRecords('hr', h);
        const r = takeResult('hr', h);
        if (r) await recorder.add({ type: 'medicao', note: `frequência cardíaca: ${r.bpm} bpm (resultado em 03/00)`, valor: { bpm: r.bpm, hora: r.time } });
        await recorder.add({ type: 'medicao', note: `histórico de FC ${h.date}: ${h.records.length} registros`, historico: raw });
      }
    } else if (f.cmd === 0x04 && f.key === 0x00) {
      const t = decodeToday(p);
      if (!t) return;
      $('#mToday').innerHTML = `
        <dt>Passos</dt><dd>${fmt(t.steps)}</dd>
        <dt>Distância</dt><dd>${fmt(t.distanceKm, 2)} km (${fmt(t.distanceM)} m)</dd>
        <dt>Calorias</dt><dd>${fmt(t.kcal, 1)} kcal (${fmt(t.calories)} cal)</dd>
        ${t.plausible ? '' : '<dt>Atenção</dt><dd>valores fora dos limites do app oficial</dd>'}`;
      await recorder.add({ type: 'medicao', note: `hoje: ${t.steps} passos, ${t.distanceM} m, ${t.calories} cal`, atividade: t });
    } else if (f.cmd === 0x04 && f.key === 0x01) {
      const hrs = decodeHourly(p);
      if (!hrs) return;
      const max = Math.max(1, ...hrs.hours.map((x) => x.steps));
      $('#mHours').innerHTML = hrs.hours.map((x) => {
        const hgt = Math.max(1, (x.steps / max) * 64);
        return `<rect x="${x.hour * 12 + 1}" y="${72 - hgt}" width="10" height="${hgt}" rx="2" fill="var(${x.steps ? '--app' : '--line'})"><title>${x.hour}h: ${x.steps} passos</title></rect>`;
      }).join('') + '<text x="0" y="80" font-size="8" fill="var(--ink-2)">0h</text><text x="138" y="80" font-size="8" fill="var(--ink-2)">12h</text><text x="276" y="80" font-size="8" fill="var(--ink-2)">23h</text>';
      await recorder.add({ type: 'medicao', note: `passos por hora ${hrs.date}`, porHora: hrs });
    }
  });

  for (const id of Object.keys(records)) {
    const newest = [...records[id].values()].sort((a, b) => (a.date + String(a.seconds).padStart(6, '0')).localeCompare(b.date + String(b.seconds).padStart(6, '0'))).pop();
    if (newest) latest[id] = { r: newest, date: newest.date };
  }
  renderChannels();
  renderPick();
  renderDay();

  return {
    setConnected(on) {
      st.connected = on;
      if (!on && st.measuring) {
        clearTimeout(st.timer); clearTimeout(st.noStatus); ticking(false);
        st.measuring = null;
        st.failed = 'Interrompido: o relógio desconectou.';
      }
      if (!on) st.external = null;
      renderChannels();
      renderSheet();
      setButtons();
    },
  };
}
