// Aba "Medir": frequência cardíaca ao vivo, atividade de hoje, passos por hora e
// histórico de FC, interpretados pelos decodificadores de core/measure.js.
// Cada medição interpretada também vai para o registro (type: 'medicao').
import {
  decodeToday, decodeHourly, decodeHrHistory, decodeLive, decodeStatus, stats, MEASUREMENTS, measureCommand,
} from '../measure.js';

const AUTO_STOP_S = 60;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (n, d = 0) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: d });

const TODAY_CMD = {
  id: 'todaySync', method: 'getTodayData', cmd: 0x01, key: 0x01, group: 'saude', risk: 'seguro',
  label: 'Atividade de hoje', description: 'Pede ao relógio os dados do dia.', params: [], encode: () => [1],
};

export function createMeasure({ root, session, recorder }) {
  const st = { measuring: null, series: [], timer: null, startedAt: 0, connected: false };

  root.innerHTML = `
    <div class="block">
      <h2>Frequência cardíaca</h2>
      <p>Coloque o relógio no pulso, bem justo, e fique parado. A medição para sozinha em ${AUTO_STOP_S} s.</p>
      <div class="face" style="margin:4px 0 8px">
        <div class="dial" style="width:140px;height:140px">
          <div><div class="big" id="mBpm">—</div><div class="small" id="mBpmUnit">bpm</div></div>
        </div>
        <div class="face-facts">
          <div><b>Estado</b><span id="mState">parado</span></div>
          <div><b>Mín · média · máx</b><span id="mStats">—</span></div>
          <div><b>Leituras</b><span id="mCount">0</span></div>
        </div>
      </div>
      <svg id="mSpark" viewBox="0 0 300 70" width="100%" height="70" role="img" aria-label="Série de batimentos" style="display:block;margin-bottom:10px">
        <polyline fill="none" stroke="var(--watch)" stroke-width="2.5" stroke-linejoin="round" points=""/>
      </svg>
      <div class="actions">
        <button class="btn watch" id="mStart" disabled>Medir agora</button>
        <button class="btn quiet" id="mStop" disabled>Parar</button>
      </div>
      <p class="file">Comando 06/04: payload 1 inicia, 0 para. Valores ao vivo chegam em 03/2A e o resultado em 03/00.</p>
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
      <p>O relógio não declara estes sensores nos recursos. Dá para pedir e ver se ele responde.</p>
      <div class="actions" id="mOthers"></div>
    </div>`;

  const $ = (s) => root.querySelector(s);
  const hr = MEASUREMENTS.find((m) => m.id === 'hr');

  for (const m of MEASUREMENTS.filter((x) => !x.declared)) {
    const b = document.createElement('button');
    b.className = 'btn quiet';
    b.textContent = `${m.label}: medir 30 s`;
    b.disabled = true;
    b.dataset.needsConn = '1';
    b.onclick = () => start(m, 30);
    $('#mOthers').appendChild(b);
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
    $('#mBpm').textContent = '…';
    $('#mBpmUnit').textContent = m.unit;
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
        $('#mState').textContent = 'medindo';
        drawSpark();
        showStats();
      }
      await recorder.add({ type: 'medicao', note: `${live.name}: ${live.value} ${live.unit}`, valor: live });
    } else if (f.cmd === 0x03) {
      const status = decodeStatus(f.key, p);
      if (status) {
        if (st.measuring) $('#mState').textContent = status.text;
        await recorder.add({ type: 'medicao', note: `${status.what}: ${status.text}`, estado: status });
        if (status.failed && st.measuring) stop('o relógio não conseguiu medir; coloque no pulso e tente de novo');
        else if (status.status === 0 && st.measuring && st.series.length) stop('o relógio terminou');
      } else if (f.key === 0x00) {
        const h = decodeHrHistory(p);
        if (!h) return;
        renderHistory(h);
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
