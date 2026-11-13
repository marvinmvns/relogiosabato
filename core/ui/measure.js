// Aba "Medir": frequência cardíaca ao vivo, atividade de hoje, passos por hora e
// histórico de FC, interpretados pelos decodificadores de core/measure.js.
// Cada medição interpretada também vai para o registro (type: 'medicao').
import {
  decodeToday, decodeHourly, decodeHrHistory, decodeLive, decodeStatus, stats, MEASUREMENTS, measureCommand,
  RESULT_KEYS, RESULT_DECODERS, STATUS_TO_ID,
} from '../measure.js';

const AUTO_STOP_S = 60;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n, d = 0) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: d });

const TODAY_CMD = {
  id: 'todaySync', method: 'getTodayData', cmd: 0x01, key: 0x01, group: 'saude', risk: 'seguro',
  label: 'Atividade de hoje', description: 'Pede ao relógio os dados do dia.', params: [], encode: () => [1],
};

export function createMeasure({ root, session, recorder }) {
  const st = { measuring: null, series: [], timer: null, startedAt: 0, stoppedAt: 0, last: null, connected: false };

  root.innerHTML = `
    <div class="block">
      <h2>Frequência cardíaca</h2>
      <p>Coloque o relógio no pulso, bem justo, e fique parado. A medição para sozinha em ${AUTO_STOP_S} s.</p>
      <div class="vital">
        <div class="vital-num"><span class="big" id="mBpm">—</span><span class="small" id="mBpmUnit">bpm</span></div>
        <dl class="monitor-facts">
          <div><dt>Estado</dt><dd id="mState">parado</dd></div>
          <div><dt>Mínimo, média e máximo</dt><dd id="mStats">—</dd></div>
          <div><dt>Leituras</dt><dd id="mCount">0</dd></div>
        </dl>
      </div>
      <svg id="mSpark" class="strip" viewBox="0 0 300 70" width="100%" height="70" role="img" aria-label="Série de batimentos" preserveAspectRatio="none">
        <polyline fill="none" stroke="var(--watch)" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke" points=""/>
      </svg>
      <div class="actions">
        <button class="btn watch" id="mStart" disabled>Medir agora</button>
        <button class="btn quiet" id="mStop" disabled>Parar</button>
      </div>
      <p class="file">Comando 06/04: payload 1 inicia, 0 para. No TF37 Pro o resultado chega em 03/00 depois de uns 10 s; outros modelos mandam valores ao vivo em 03/2A.</p>
    </div>

    <div class="block">
      <h2>Atividade de hoje</h2>
      <dl class="facts" id="mToday"><dt>—</dt><dd>Toque em "Atualizar" para pedir os dados ao relógio.</dd></dl>
      <svg id="mHours" viewBox="0 0 288 80" width="100%" height="80" role="img" aria-label="Passos por hora" style="display:block;margin:10px 0"></svg>
      <div class="actions"><button class="btn" id="mToday1" disabled>Atualizar</button></div>
      <p class="file">Passos, distância em metros e calorias em cal (04/00); passos por hora (04/01).</p>
    </div>

    <div class="block">
      <h2>Histórico de frequência cardíaca</h2>
      <ul class="results" id="mHist"><li><span></span><span>Chega quando o relógio envia o histórico (03/00), por exemplo ao terminar uma medição ou sincronizar.</span></li></ul>
    </div>

    <div class="block">
      <h2>Outras medições</h2>
      <p>O relógio não declara estes sensores nos recursos, mas responde a alguns. O resultado aparece no mostrador acima e na lista abaixo.</p>
      <div class="actions" id="mOthers"></div>
      <ul class="results" id="mOtherHist"></ul>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const hr = MEASUREMENTS.find((m) => m.id === 'hr');

  for (const m of MEASUREMENTS.filter((x) => !x.declared)) {
    const b = document.createElement('button');
    b.className = 'btn quiet';
    b.textContent = `Medir ${m.label.toLowerCase()}`;
    b.disabled = true;
    b.dataset.needsConn = '1';
    b.onclick = () => start(m, m.id === 'stress' ? 60 : 40);
    $('#mOthers').appendChild(b);
  }

  // O TF37 Pro não manda 03/2A: mede uns 10 a 30 s e entrega o resultado como um registro
  // do histórico (03/00 FC, 03/01 pressão, 03/07 estresse...), às vezes repetido ~3 s depois.
  // Registros que chegam durante a medição (ou até 15 s depois dela) contam como leitura.
  // Medição iniciada no menu do próprio relógio: o estado (03/0F, 03/15, 03/29...) chega
  // sem o app ter pedido, e o resultado vem no mesmo quadro de histórico.
  function showMeasure(m) {
    $('#mBpm').closest('.block').querySelector('h2').textContent = m.label;
    $('#mBpmUnit').textContent = m.unit;
  }
  function watchStarted(id) {
    if (st.measuring || st.external?.id === id) return;
    const m = MEASUREMENTS.find((x) => x.id === id);
    if (!m) return;
    st.external = m;
    st.series = [];
    st.startedAt = Date.now();
    showMeasure(m);
    $('#mBpm').textContent = '…';
    $('#mState').textContent = 'medindo no relógio';
    drawSpark();
    showStats();
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
    const sinceStart = fromApp ? (Date.now() - st.startedAt) / 1000 : 180;
    // Folga de 10 min para o relógio fora de hora; um registro mais velho é do histórico, não desta medição.
    if (Math.abs(r.seconds - nowS) > sinceStart + 600) return null;
    if (fromWatch) {
      const m = MEASUREMENTS.find((x) => x.id === id);
      if (st.external?.id !== id) { st.series = []; st.startedAt = Date.now(); }
      st.external = null;
      showMeasure(m);
      $('#mState').textContent = `medido no relógio às ${r.time}`;
    }
    if (st.series.some((x) => x.seconds === r.seconds)) return null;
    st.series.push({ t: Date.now() - st.startedAt, value: r.value ?? r.bpm, seconds: r.seconds });
    $('#mBpm').textContent = r.text ?? String(r.bpm);
    $('#mBpm').dataset.v = '1';
    if (fromApp && !st.measuring) $('#mState').textContent = 'concluído (o relógio terminou)';
    else if (fromApp) stop('o relógio entregou o resultado');
    drawSpark();
    showStats();
    return r;
  }

  function setButtons() {
    const on = st.connected;
    $('#mStart').disabled = !on || Boolean(st.measuring);
    $('#mStop').disabled = !on || !st.measuring;
    $('#mToday1').disabled = !on;
    root.querySelectorAll('#mOthers button').forEach((b) => { b.disabled = !on || Boolean(st.measuring); });
  }

  function drawSpark() {
    const v = st.series.map((x) => x.value);
    const line = $('#mSpark polyline');
    if (v.length < 2) { line.setAttribute('points', ''); return; }
    const min = Math.min(...v) - 3;
    const max = Math.max(...v) + 3;
    const pts = v.map((y, i) => `${(i / (v.length - 1)) * 300},${70 - ((y - min) / (max - min || 1)) * 64 - 3}`);
    line.setAttribute('points', pts.join(' '));
  }

  function showStats() {
    const s = stats(st.series.map((x) => x.value));
    $('#mStats').textContent = s ? `${fmt(s.min)} · ${fmt(s.avg, 1)} · ${fmt(s.max)}` : '—';
    $('#mCount').textContent = String(s?.n || 0);
  }

  async function start(m, seconds = AUTO_STOP_S) {
    if (st.measuring) return;
    st.measuring = m;
    st.series = [];
    st.startedAt = Date.now();
    st.last = m;
    $('#mBpm').textContent = '…';
    $('#mBpmUnit').textContent = m.unit;
    $('#mBpm').closest('.block').querySelector('h2').textContent = m.label;
    $('#mState').textContent = `pedindo ${m.label.toLowerCase()}`;
    drawSpark();
    showStats();
    setButtons();
    await recorder.add({ type: 'medicao', note: `início: ${m.label}` });
    try {
      await session.send(measureCommand(m, true));
    } catch (e) {
      $('#mState').textContent = `não enviado: ${e.message}`;
      st.measuring = null;
      setButtons();
      return;
    }
    st.timer = setTimeout(() => stop('tempo esgotado'), seconds * 1000);
  }

  async function stop(reason = 'parado por você') {
    const m = st.measuring;
    if (!m) return;
    clearTimeout(st.timer);
    st.measuring = null;
    st.stoppedAt = Date.now();
    setButtons();
    try { await session.send(measureCommand(m, false)); } catch (_e) { /* desconectado */ }
    const s = stats(st.series.map((x) => x.value));
    $('#mState').textContent = s ? `concluído (${reason})` : `sem leituras (${reason})`;
    await recorder.add({ type: 'medicao', note: `fim: ${m.label} (${reason})`, resultado: s, serie: st.series });
  }

  $('#mStart').onclick = () => start(hr);
  $('#mStop').onclick = () => stop();
  $('#mToday1').onclick = () => session.send(TODAY_CMD).catch((e) => recorder.add({ type: 'erro', note: e.message }));

  session.addEventListener('frame', async ({ detail: { frame: f } }) => {
    if (f.kind !== 'DF') return;
    const p = f.payload;
    if (f.cmd === 0x03 && f.key === 0x2a) {
      const live = decodeLive(p);
      if (!live) return;
      if (st.measuring && (st.measuring.liveType === null || st.measuring.liveType === live.type)) {
        st.series.push({ t: Date.now() - st.startedAt, value: live.value });
        $('#mBpm').textContent = String(live.value);
        $('#mBpm').dataset.v = '1';
        $('#mState').textContent = 'medindo';
        drawSpark();
        showStats();
      }
      await recorder.add({ type: 'medicao', note: `${live.name}: ${live.value} ${live.unit}`, valor: live });
    } else if (f.cmd === 0x03) {
      const status = decodeStatus(f.key, p);
      if (status) {
        if (st.measuring) $('#mState').textContent = status.text;
        else if (status.status === 1) watchStarted(STATUS_TO_ID[f.key]);
        else if (st.external && STATUS_TO_ID[f.key] === st.external.id) {
          $('#mState').textContent = status.failed ? 'o relógio não conseguiu medir' : 'parado no relógio; aguardando o resultado';
          if (status.failed) st.external = null;
        }
        await recorder.add({ type: 'medicao', note: `${status.what}: ${status.text}`, estado: status });
        if (status.failed && st.measuring) stop('o relógio não conseguiu medir; coloque no pulso e tente de novo');
        else if (status.status === 0 && st.measuring && st.series.length) stop('o relógio terminou');
      } else if (RESULT_DECODERS[f.key]) {
        const h = RESULT_DECODERS[f.key](p);
        if (!h) return;
        const id = RESULT_KEYS[f.key];
        const m = MEASUREMENTS.find((x) => x.id === id);
        renderOther(m, h);
        const r = takeResult(id, h);
        await recorder.add({ type: 'medicao', note: `${m.label}: ${h.records.map((x) => `${x.time} ${x.text} ${m.unit}`).join(', ') || 'sem registros válidos'}${r ? ' (resultado da medição)' : ''}`, historico: h, medida: id });
      } else if (f.key === 0x00) {
        const h = decodeHrHistory(p);
        if (!h) return;
        renderHistory(h);
        const r = takeResult('hr', { ...h, records: h.records.map((x) => ({ ...x, value: x.bpm, text: String(x.bpm) })) });
        if (r) await recorder.add({ type: 'medicao', note: `frequência cardíaca: ${r.bpm} bpm (resultado em 03/00)`, valor: { bpm: r.bpm, hora: r.time } });
        await recorder.add({ type: 'medicao', note: `histórico de FC ${h.date}: ${h.records.length} registros`, historico: h });
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

  const others = new Map();
  function renderOther(m, h) {
    for (const r of h.records) others.set(`${m.id}|${h.date}|${r.seconds}`, { m, date: h.date, r });
    $('#mOtherHist').innerHTML = [...others.values()].sort((a, b) => (b.date + b.r.time).localeCompare(a.date + a.r.time)).slice(0, 30).map(({ m: mm, date, r }) => `
      <li data-status="passou"><span class="mark">●</span><span>${esc(mm.label)} · ${esc(date)} ${esc(r.time)}</span><span class="ms">${esc(r.text)} ${esc(mm.unit)}</span></li>`).join('');
  }

  function renderHistory(h) {
    const list = $('#mHist');
    if (!h.records.length) {
      list.innerHTML = `<li><span></span><span>${esc(h.date)}: nenhum registro válido.</span></li>`;
      return;
    }
    list.innerHTML = h.records.slice(-30).reverse().map((r) => `
      <li data-status="passou"><span class="mark">♥</span><span>${esc(h.date)} ${esc(r.time)}</span><span class="ms">${r.bpm} bpm</span>
      <span class="why">${r.auto ? 'medição automática' : 'medição manual'} · modo ${r.mode}</span></li>`).join('');
  }

  return {
    setConnected(on) {
      st.connected = on;
      if (!on && st.measuring) {
        clearTimeout(st.timer);
        st.measuring = null;
        $('#mState').textContent = 'interrompido: desconectado';
      }
      setButtons();
    },
  };
}
