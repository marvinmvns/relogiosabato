import './cyber.css';
// Interface do Relógio Sabatinho, compartilhada entre Android e desktop.
// A plataforma injeta: ble (adaptador Bluetooth), store (gravação de arquivos) e
// platform { name, canScan, canShare }.
import { Session, cmdKey, defaults } from '../session.js';
import { Recorder } from '../recorder.js';
import { buildPlan, runSuite, reportMarkdown } from '../suite.js';
import { hex } from '../protocol.js';
import { createMeasure } from './measure.js';
import { mountFitness, mountAppearance } from './fitness.js';
import { mountProfile } from './profile.js';

const GROUPS = {
  leitura: 'Leituras',
  saude: 'Saúde e medições',
  acao: 'Ações',
  notificacao: 'Notificações',
  config: 'Configurações',
  mostrador: 'Mostradores',
  midia: 'Mídia e câmera',
  fone: 'Fones',
  ai: 'IA e voz',
  sistema: 'Sistema',
  vinculo: 'Vínculo',
  ota: 'Atualização (OTA)',
};
const RISK = { seguro: 'seguro', 'altera-config': 'altera configuração', perigoso: 'perigoso' };
const MARK = { passou: '✓', recusou: '✗', erro: '✗', 'sem resposta': '…', bloqueado: '⊘', pulado: '–' };

const ICONS = {
  relogio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="6"/><path d="M9 6l1-4h4l1 4M9 18l1 4h4l1-4M12 9v3l2 1"/></svg>',
  medir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>',
  comandos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  testes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l4 4L19 6"/></svg>',
  registro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h4"/></svg>',
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const h = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

export function mountApp({ root, ble, store, platform, commands, responses, extraTabs = [] }) {
  const TABS = [
    { id: 'hoje', label: 'Hoje', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 10l9-7 9 7v11h-6v-7H9v7H3z"/></svg>' },
    ...['relogio', 'medir', 'comandos', 'testes', 'registro'].map((id) => ({ id, label: { relogio: 'Relógio', medir: 'Saúde', comandos: 'Comandos', testes: 'Testes', registro: 'Registro' }[id], icon: ICONS[id] })),
    ...extraTabs,
  ];
  const ui = {};
  const state = { logFilter: 'tudo', logSearch: '', group: 'todos', query: '', running: null };

  root.innerHTML = `
    <div class="shell" data-current="hoje">
      <header class="topbar">
        <h1 class="brand"><b class="brand-mark" aria-hidden="true">s<span>↗</span></b><span class="brand-name">sabatinho<small>NEON / FIT SYSTEM</small></span></h1>
        <span class="pill" id="pill" data-state="off">desconectado</span>
      </header>

      <nav class="tabs" role="tablist" aria-label="Navegação principal" style="--tab-count:${TABS.length}">
        ${TABS.map((t, i) => `
          <button role="tab" id="tab-${t.id}" aria-controls="panel-${t.id}" tabindex="${i === 0 ? 0 : -1}" data-view="${t.id}" aria-selected="${i === 0}">${t.icon}<span>${esc(t.label)}</span></button>`).join('')}
      </nav>

      <main id="mainContent">
        <section class="view active" data-view="hoje" id="fitnessView"></section>
        <section class="view" data-view="relogio">
          <p class="status-line" id="status" role="status">Conecte o relógio para começar.</p>
          <div class="monitor" id="dial">
            <div class="readout">
              <span class="vital-label">Bateria</span>
              <span class="big" id="dialBig">—</span>
              <span class="batt" aria-hidden="true"><i id="level"></i></span>
              <span class="small" id="dialSmall">sem conexão</span>
            </div>
            <svg class="ecg" viewBox="0 0 300 80" preserveAspectRatio="none" role="img" aria-label="Traçado de pacotes: picos para cima são o relógio falando, para baixo são o app">
              <path id="ecgPath" d="M0 40H300"/>
            </svg>
            <dl class="monitor-facts">
              <div><dt>Firmware</dt><dd id="fFirmware">—</dd></div>
              <div><dt>Chip</dt><dd id="fChip">—</dd></div>
              <div><dt>Pacotes</dt><dd id="fPackets">0 recebidos, 0 enviados</dd></div>
            </dl>
          </div>
          <div class="block">
            <div class="actions">
              <button class="btn" id="connect">Conectar</button>
              <button class="btn quiet" id="disconnect" disabled>Desconectar</button>
              ${platform.canScan ? '<button class="btn quiet" id="scan">Gravar anúncios (10 s)</button>' : ''}
            </div>
            <p style="margin-top:10px"><label class="check"><input type="checkbox" id="anyDevice"> listar qualquer aparelho Bluetooth</label></p>
          </div>
          <div class="block">
            <h2>O que o relógio informou</h2>
            <dl class="facts" id="facts"><dt>—</dt><dd>Conecte e toque em "Ler tudo".</dd></dl>
            <div class="actions" style="margin-top:12px"><button class="btn watch" id="readAll" disabled>Ler tudo</button></div>
          </div>
          <div class="block" id="profileBlock"></div>
          <section class="block"><h2>Do seu jeito</h2><div class="appearance"><label for="fitTheme">Tema<select id="fitTheme"><option value="neon">Neon — Cyberpunk</option><option value="system">Acompanhar sistema</option><option value="light">Claro</option><option value="dark">Escuro</option></select></label><label class="check"><input type="checkbox" id="fitMotion"> Reduzir animações</label></div></section>
          <div class="block">
            <h2>Recursos declarados</h2>
            <div class="chips" id="features"><span class="chip static">aparecem depois de ler os recursos</span></div>
          </div>
        </section>

        <section class="view" data-view="medir" id="measureView"></section>

        <section class="view" data-view="comandos">
          <input class="search" id="cmdSearch" type="search" placeholder="Buscar comando, cmd/key ou método" aria-label="Buscar comando">
          <div class="chips" id="groupChips"></div>
          <ul class="cmd-list" id="cmdList"></ul>
        </section>

        <section class="view" data-view="testes">
          <div class="block">
            <h2>Testar tudo</h2>
            <p>Envia cada comando do catálogo e confere se o relógio confirmou. Medições ficam ligadas 12 s e depois são desligadas; a chamada simulada é encerrada. Configurações que o relógio informa (idioma, meta de passos, levantar para acender, pulso, envios automáticos) são regravadas com o valor atual e conferidas depois, sem mudar nada. Comandos perigosos nunca são enviados.</p>
            <p><label class="check"><input type="checkbox" id="includeConfig"> incluir comandos que alteram configurações (hora, unidades, alarmes…)</label></p>
            <div class="actions">
              <button class="btn" id="runSuite" disabled>Testar tudo</button>
              <button class="btn quiet" id="stopSuite" disabled>Parar</button>
            </div>
            <div class="progress" aria-hidden="true"><i id="progress"></i></div>
            <p id="suiteStatus" class="file"></p>
            <div class="summary" id="suiteSummary"></div>
          </div>
          <div class="block"><ul class="results" id="results"></ul></div>
        </section>

        <section class="view" data-view="registro" id="logView"></section>
        ${extraTabs.map((t) => `<section class="view" data-view="${t.id}"></section>`).join('')}
      </main>

      <aside class="side-log" id="sideLog"></aside>
    </div>
    <div class="sheet-backdrop" id="backdrop"></div>
    <section class="sheet" id="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle"></section>`;

  const $ = (s) => root.querySelector(s);

  // ---------- registro ----------
  const logPanel = h(`
    <div class="view active" data-view="registro-panel">
      <div class="block">
        <h2>Registro <small id="logCount" style="font-weight:400;color:var(--ink-2)">0</small></h2>
        <p>Tudo o que o relógio enviou e o que o app mandou, gravado em arquivo.</p>
        <div class="chips" id="logFilters">
          ${['tudo', 'relógio', 'app', 'eventos', 'testes'].map((f, i) => `<button class="chip" aria-pressed="${i === 0}" data-f="${f}">${f}</button>`).join('')}
        </div>
        <input class="search" style="margin-top:10px" id="logSearch" type="search" placeholder="Filtrar por texto ou hex" aria-label="Filtrar registro">
        <div class="actions">${platform.canShare ? '<button class="btn quiet" id="share">Exportar registro</button>' : ''}<button class="btn quiet" id="openFolder" ${platform.openFolder ? '' : 'hidden'}>Abrir pasta</button></div>
        <p class="file" id="fileLoc"></p>
        <div class="log" id="log"><p class="log-empty">Nada registrado ainda.</p></div>
      </div>
    </div>`);
  const wideMq = window.matchMedia('(min-width: 1000px)');
  const placeLog = () => (wideMq.matches ? $('#sideLog') : $('#logView')).appendChild(logPanel);
  placeLog();
  wideMq.addEventListener('change', placeLog);

  const recorder = new Recorder(store, (e) => renderEntry(e));
  const session = new Session({ ble, recorder, responses });
  mountFitness($('#fitnessView'), { session, navigate: (id) => root.querySelector(`.tabs [data-view="${id}"]`).click() });
  mountAppearance(root);
  import('./neon-3d.js').then(({ mountNeon3D }) => mountNeon3D(root)).catch(() => { root.dataset.webgl = 'unavailable'; });
  const measure = createMeasure({ root: $('#measureView'), session, commands, recorder });
  mountProfile($('#profileBlock'), { session, commands, recorder });

  function entryCategory(e) {
    if (e.type === 'teste' || e.type === 'suite') return 'testes';
    if (e.dir === 'rx') return 'relógio';
    if (e.dir === 'tx') return 'app';
    return 'eventos';
  }

  function entryVisible(e) {
    if (state.logFilter !== 'tudo' && entryCategory(e) !== state.logFilter) return false;
    if (!state.logSearch) return true;
    return JSON.stringify(e).toLowerCase().includes(state.logSearch);
  }

  function rowFor(e) {
    const who = e.dir === 'rx' ? `relógio · ${e.channel}` : e.dir === 'tx' ? `app · ${e.channel}` : e.type;
    const parsed = e.parsed && Object.keys(e.parsed).length ? JSON.stringify(e.parsed) : '';
    const row = h(`<div class="row" data-dir="${esc(e.dir || '')}" data-kind="${esc(e.type || '')}">
      <span class="t">${esc(e.t.slice(11, 23))}</span><span class="who">${esc(who)}</span> ${esc(e.summary || e.note || e.label || '')}
      ${e.status && e.type === 'teste' ? `<span class="txt">${esc(e.status)} ${esc(e.text || e.note || '')}</span>` : ''}
      ${e.hex ? `<code>${esc(e.hex)}</code>` : ''}
      ${e.text && e.type !== 'teste' ? `<span class="txt">${esc(e.text)}</span>` : ''}
      ${parsed ? `<span class="txt">${esc(parsed)}</span>` : ''}
    </div>`);
    return row;
  }

  function renderEntry(e) {
    const log = $('#log');
    if (!log) return;
    $('#logCount').textContent = String(recorder.entries.length);
    if (!entryVisible(e)) return;
    log.querySelector('.log-empty')?.remove();
    log.prepend(rowFor(e));
    while (log.childElementCount > 700) log.lastElementChild.remove();
  }

  function rerenderLog() {
    const log = $('#log');
    log.innerHTML = '';
    const rows = recorder.entries.filter(entryVisible).slice(-700).reverse();
    if (!rows.length) log.innerHTML = '<p class="log-empty">Nada com esse filtro.</p>';
    for (const e of rows) log.appendChild(rowFor(e));
  }

  logPanel.querySelector('#logFilters').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-f]');
    if (!b) return;
    state.logFilter = b.dataset.f;
    logPanel.querySelectorAll('#logFilters .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
    rerenderLog();
  });
  logPanel.querySelector('#logSearch').addEventListener('input', (ev) => {
    state.logSearch = ev.target.value.trim().toLowerCase();
    rerenderLog();
  });
  logPanel.querySelector('#share')?.addEventListener('click', () => recorder.share().catch((e) => setStatus(`Não foi possível exportar: ${e.message}`, 'err')));
  logPanel.querySelector('#openFolder')?.addEventListener('click', () => platform.openFolder?.());

  // ---------- navegação acessível ----------
  const tabButtons = [...root.querySelectorAll('.tabs [role="tab"]')];
  root.querySelectorAll('main > .view').forEach((panel) => {
    panel.id = panel.id || `panel-${panel.dataset.view}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `tab-${panel.dataset.view}`);
    panel.tabIndex = 0;
    root.querySelector(`#tab-${panel.dataset.view}`).setAttribute('aria-controls', panel.id);
  });
  root.querySelector('.tabs').addEventListener('click', (event) => {
    const button = event.target.closest('[role="tab"]');
    if (!button) return;
    root.querySelector('.shell').dataset.current = button.dataset.view;
    tabButtons.forEach(tab => { tab.setAttribute('aria-selected', String(tab === button)); tab.tabIndex = tab === button ? 0 : -1; });
    root.querySelectorAll('main > .view').forEach(panel => panel.classList.toggle('active', panel.dataset.view === button.dataset.view));
    root.querySelector('main').scrollTop = 0;
    window.scrollTo(0, 0);
  });
  root.querySelector('.tabs').addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    const tabs = tabButtons.filter(tab => tab.getClientRects().length);
    const current = tabs.indexOf(event.target.closest('[role="tab"]'));
    if (current < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
      : (current + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + tabs.length) % tabs.length;
    tabs[next].click(); tabs[next].focus();
  });

  // ---------- estado e mostrador ----------
  function setStatus(text, kind = '') {
    const el = $('#status');
    el.textContent = text;
    el.dataset.kind = kind;
  }

  function setConnected(on) {
    const pill = $('#pill');
    pill.dataset.state = on ? 'on' : 'off';
    pill.textContent = on ? 'conectado' : 'desconectado';
    $('#connect').disabled = on;
    $('#disconnect').disabled = !on;
    $('#readAll').disabled = !on;
    $('#runSuite').disabled = !on || Boolean(state.running);
    measure.setConnected(on);
    if (!on) $('#dialSmall').textContent = 'sem conexão';
  }

  function updateDial() {
    const info = session.info;
    const pct = parseInt(info.bateria ?? info.bateria2a19, 10);
    const level = $('#level');
    if (Number.isFinite(pct)) {
      level.style.width = `${Math.max(0, Math.min(100, pct))}%`;
      level.dataset.low = pct <= 15 ? '1' : '0';
      $('#dial').dataset.batt = String(pct);
      $('#dialBig').textContent = `${pct}%`;
    }
    const fw = (info.firmware || '').match(/V\d+(\.\d+)*/)?.[0];
    $('#dialSmall').textContent = [fw, session.connected ? 'conectado' : 'sem conexão'].filter(Boolean).join(', ');
    $('#fFirmware').textContent = info.firmware || '—';
    $('#fChip').textContent = info.chip || '—';
  }

  function renderFacts() {
    const labels = {
      aparelho: 'Aparelho', firmware: 'Firmware e projeto', chip: 'OTA e chip', bateria: 'Bateria (comando)',
      bateria2a19: 'Bateria (2A19)', carregando: 'Carregando', alertaBateria: 'Alerta de bateria',
      produto: 'Produto', versao: 'Versão do protocolo', recursos: 'Recursos',
    };
    const entries = Object.entries(session.info).filter(([k]) => k !== 'recursos');
    $('#facts').innerHTML = entries.length
      ? entries.map(([k, v]) => `<dt>${esc(labels[k] || k)}</dt><dd>${esc(v)}</dd>`).join('')
      : '<dt>—</dt><dd>Conecte e toque em "Ler tudo".</dd>';
    if (session.info.recursos) {
      const [flags, plat] = session.info.recursos.split('; ');
      $('#features').innerHTML = flags.split(', ').map((f) => `<span class="chip static">${esc(f)}</span>`).join('')
        + (plat ? `<span class="chip static">${esc(plat)}</span>` : '');
    }
  }

  // Acesso pelo DevTools (depuração e testes manuais): window.relogio.session.send(...)
  window.relogio = { session, commands };
  session.addEventListener('status', (e) => setStatus(e.detail.text));
  session.addEventListener('info', () => { updateDial(); renderFacts(); });
  session.addEventListener('connection', (e) => {
    setConnected(e.detail.connected);
    setStatus(e.detail.connected ? `Conectado a ${e.detail.device.name || e.detail.device.id}.` : 'Relógio desconectado.', e.detail.connected ? '' : 'err');
    updateDial();
  });
  // Traçado tipo ECG: cada pacote do relógio desenha um batimento para cima,
  // cada envio do app um traço curto para baixo. Sem pacotes, a linha fica reta.
  const ecg = { pts: new Array(120).fill(0), queue: [], timer: null };
  const BEAT_RX = [1, 2, 1, 0, -3, 26, -12, 0, 2, 4, 5, 3, 1];
  const BEAT_TX = [0, -4, -9, -4, 0];
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const drawEcg = () => {
    const step = 300 / (ecg.pts.length - 1);
    $('#ecgPath').setAttribute('d', ecg.pts.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)} ${(42 - v).toFixed(1)}`).join(''));
  };
  const tickEcg = () => {
    ecg.pts.shift();
    ecg.pts.push(ecg.queue.shift() ?? 0);
    drawEcg();
    if (!ecg.queue.length && ecg.pts.every((v) => v === 0)) { clearInterval(ecg.timer); ecg.timer = null; }
  };
  session.addEventListener('packet', (e) => {
    if (ecg.queue.length < 40) ecg.queue.push(...(e.detail.dir === 'tx' ? BEAT_TX : BEAT_RX), 0, 0);
    if (reduceMotion) { while (ecg.queue.length) tickEcg(); } else if (!ecg.timer) ecg.timer = setInterval(tickEcg, 45);
    $('#dial').dataset.live = e.detail.dir;
    $('#fPackets').textContent = `${session.counters.rx} recebidos, ${session.counters.tx} enviados${session.counters.invalid ? `, ${session.counters.invalid} inválidos` : ''}`;
  });

  $('#connect').onclick = async () => {
    if (session.connecting) { setStatus('Já estou conectando; aguarde.'); return; }
    $('#connect').disabled = true;
    setStatus('Preparando o Bluetooth.');
    $('#pill').dataset.state = 'busy';
    try {
      await session.connect({ any: $('#anyDevice').checked });
    } catch (e) {
      setConnected(false);
      setStatus(`Não conectou: ${e.message}`, 'err');
      recorder.add({ type: 'erro', note: `conexão: ${e.message}` });
    }
  };
  $('#disconnect').onclick = () => session.disconnect().catch((e) => setStatus(e.message, 'err'));
  $('#scan')?.addEventListener('click', async () => {
    setStatus('Gravando anúncios do TF37 por 10 s.');
    try {
      const n = await session.scan(10000);
      setStatus(`Anúncios gravados: ${n} variações.`);
    } catch (e) {
      setStatus(`Scan falhou: ${e.message}`, 'err');
    }
  });

  $('#readAll').onclick = async () => {
    const reads = commands.filter((c) => (c.group === 'leitura' || c.group === 'ota') && c.risk === 'seguro' && c.encode);
    $('#readAll').disabled = true;
    for (const [i, c] of reads.entries()) {
      if (!session.connected) break;
      setStatus(`Lendo ${i + 1} de ${reads.length}: ${c.label}`);
      try { await session.send(c); } catch (e) { recorder.add({ type: 'erro', note: `${c.label}: ${e.message}` }); }
      await new Promise((r) => setTimeout(r, 450));
    }
    setStatus(`Leitura concluída (${reads.length} comandos).`);
    $('#readAll').disabled = !session.connected;
  };

  // ---------- catálogo ----------
  const groupsPresent = ['todos', ...Object.keys(GROUPS).filter((g) => commands.some((c) => c.group === g))];
  $('#groupChips').innerHTML = groupsPresent
    .map((g) => `<button class="chip" data-g="${g}" aria-pressed="${g === 'todos'}">${g === 'todos' ? `Todos (${commands.length})` : GROUPS[g]}</button>`).join('');
  $('#groupChips').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-g]');
    if (!b) return;
    state.group = b.dataset.g;
    $('#groupChips').querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
    renderCatalog();
  });
  $('#cmdSearch').addEventListener('input', (ev) => { state.query = ev.target.value.trim().toLowerCase(); renderCatalog(); });

  function renderCatalog() {
    const list = $('#cmdList');
    list.innerHTML = '';
    const q = state.query;
    const visible = commands.filter((c) => (state.group === 'todos' || c.group === state.group)
      && (!q || `${c.label} ${c.method} ${cmdKey(c.cmd, c.key)} ${c.description}`.toLowerCase().includes(q)));
    if (!visible.length) {
      list.innerHTML = '<li class="cmd-group">Nenhum comando com esse filtro.</li>';
      return;
    }
    for (const g of Object.keys(GROUPS)) {
      const items = visible.filter((c) => c.group === g);
      if (!items.length) continue;
      list.appendChild(h(`<li class="cmd-group">${GROUPS[g]} · ${items.length}</li>`));
      for (const c of items) {
        const li = h(`<li><button class="cmd" data-risk="${c.risk}" data-impl="${c.implemented ? '1' : '0'}">
          <span class="name">${esc(c.label)}</span>
          <span class="code">${cmdKey(c.cmd, c.key)}</span>
          <span class="desc">${esc(c.description)}</span>
        </button></li>`);
        li.firstElementChild.onclick = () => openSheet(c);
        list.appendChild(li);
      }
    }
  }
  renderCatalog();

  // ---------- folha do comando ----------
  function closeSheet() {
    $('#sheet').classList.remove('open');
    $('#backdrop').classList.remove('open');
  }
  $('#backdrop').onclick = closeSheet;
  root.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeSheet(); });

  function field(p) {
    const val = typeof p.default === 'function' ? p.default() : p.default;
    if (p.type === 'enum' && p.options?.length) {
      return `<label>${esc(p.label || p.name)}<select name="${esc(p.name)}">${p.options.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(val) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
    }
    if (p.type === 'bool') {
      return `<label class="check"><input type="checkbox" name="${esc(p.name)}" ${val ? 'checked' : ''}> ${esc(p.label || p.name)}</label>`;
    }
    if (p.type === 'string' || p.type === 'bytes' || p.type === 'time') {
      return `<label>${esc(p.label || p.name)}<input name="${esc(p.name)}" value="${esc(val instanceof Date ? val.toISOString() : Array.isArray(val) ? val.join(',') : val ?? '')}"></label>`;
    }
    return `<label>${esc(p.label || p.name)}<input name="${esc(p.name)}" type="number" inputmode="numeric" value="${esc(val ?? 0)}" ${p.min !== undefined ? `min="${p.min}"` : ''} ${p.max !== undefined ? `max="${p.max}"` : ''}></label>`;
  }

  function readForm(form, c) {
    const out = {};
    for (const p of c.params || []) {
      const el = form.elements[p.name];
      if (!el) continue;
      if (p.type === 'bool') out[p.name] = el.checked;
      else if (p.type === 'string') out[p.name] = el.value;
      else if (p.type === 'bytes') out[p.name] = el.value.split(/[ ,]+/).filter(Boolean).map((x) => parseInt(x, x.startsWith('0x') ? 16 : 10));
      else if (p.type === 'time') out[p.name] = el.value ? new Date(el.value) : new Date();
      else if (p.type === 'enum') out[p.name] = Number.isNaN(Number(el.value)) ? el.value : Number(el.value);
      else out[p.name] = Number(el.value);
    }
    return out;
  }

  function openSheet(c) {
    const danger = c.risk === 'perigoso';
    const missing = !danger && !c.encode;
    const last = [...session.lastByCmd.entries()].find(([k]) => Number(k.split('/')[0]) === c.cmd)?.[1];
    let preview = '';
    try { preview = c.encode ? hex(c.encode(defaults(c))) : 'não implementado'; } catch (e) { preview = `erro ao montar: ${e.message}`; }
    const sheet = $('#sheet');
    sheet.innerHTML = `
      <h3 id="sheetTitle">${esc(c.label)}</h3>
      <div class="meta">${cmdKey(c.cmd, c.key)} · ${esc(c.method)} · ${esc(RISK[c.risk] || c.risk)} · ${esc(c.source || '')}</div>
      <p>${esc(c.description)}</p>
      ${danger ? '<p class="warn">Bloqueado: este comando pode iniciar atualização de firmware, apagar dados ou desvincular o relógio. O app nunca o envia.</p>' : ''}
      ${c.risk === 'altera-config' ? '<p>Altera uma configuração do relógio. Anote o valor atual antes, se quiser voltar.</p>' : ''}
      <form id="sheetForm">${(c.params || []).map(field).join('')}</form>
      <p><b>Payload com os valores padrão</b></p><pre>${esc(preview || '(vazio)')}</pre>
      ${c.response ? `<p><b>Resposta esperada</b><br>${esc(c.response)}</p>` : ''}
      ${last ? `<p><b>Última resposta recebida</b></p><pre>${esc(last.hex)}${last.text ? `\n${esc(last.text)}` : ''}${last.parsed ? `\n${esc(JSON.stringify(last.parsed))}` : ''}</pre>` : ''}
      <div class="actions">
        <button class="btn ${c.risk === 'altera-config' ? 'action' : ''}" id="sheetSend" ${danger || missing || !session.connected ? 'disabled' : ''}>${danger ? 'Bloqueado' : missing ? 'Não implementado' : 'Enviar'}</button>
        <button class="btn quiet" id="sheetClose">Fechar</button>
      </div>
      <p class="file" id="sheetMsg">${missing ? 'O formato deste payload está documentado em COMANDOS.md, mas o codificador ainda não foi escrito.' : !danger && !session.connected ? 'Conecte o relógio para enviar.' : ''}</p>`;
    sheet.querySelector('#sheetClose').onclick = closeSheet;
    sheet.querySelector('#sheetSend').onclick = async () => {
      const msg = sheet.querySelector('#sheetMsg');
      try {
        const params = readForm(sheet.querySelector('#sheetForm'), c);
        const reply = session.waitFor((f) => f.cmd === c.cmd, 3000);
        const frame = await session.send(c, params);
        msg.textContent = `Enviado: ${hex(frame)}. Aguardando resposta…`;
        const r = await reply;
        msg.textContent = r ? `Resposta: ${r.entry.summary}${r.entry.text ? ` — ${r.entry.text}` : ''}${r.frame.kind === 'FD' ? ` (status ${r.frame.status})` : ''}` : 'Sem resposta em 3 s (veja o registro).';
      } catch (e) {
        msg.textContent = `Não enviado: ${e.message}`;
      }
    };
    sheet.classList.add('open');
    $('#backdrop').classList.add('open');
    sheet.querySelector('#sheetSend').focus();
  }

  // ---------- testes ----------
  $('#runSuite').onclick = async () => {
    const plan = buildPlan(commands, { includeConfig: $('#includeConfig').checked });
    const controller = new AbortController();
    state.running = controller;
    $('#runSuite').disabled = true;
    $('#stopSuite').disabled = false;
    $('#results').innerHTML = '';
    $('#suiteSummary').innerHTML = '';
    const run = await runSuite(session, plan, {
      signal: controller.signal,
      onProgress: ({ index, total, result }) => {
        $('#progress').style.width = `${((index + 1) / total) * 100}%`;
        $('#suiteStatus').textContent = `${index + 1} de ${total}: ${result.label}`;
        $('#results').appendChild(h(`<li data-status="${esc(result.status)}">
          <span class="mark" aria-label="${esc(result.status)}">${MARK[result.status] || '?'}</span>
          <span>${esc(result.label)} <small style="color:var(--ink-2)">${esc(result.cmdKey)}</small></span>
          <span class="ms">${result.ms ? `${result.ms} ms` : ''}</span>
          <span class="why">${esc(result.status)}${result.ackStatus ? ` (ACK ${result.ackStatus})` : ''}${result.text || result.note ? ` · ${esc(result.text || result.note)}` : ''}${result.realtimeFrames !== undefined ? ` · ${result.realtimeFrames} pacotes em ${result.realtimeWindowS} s` : ''}</span>
        </li>`));
      },
    });
    state.running = null;
    $('#stopSuite').disabled = true;
    $('#runSuite').disabled = !session.connected;
    $('#suiteSummary').innerHTML = Object.entries(run.summary).filter(([k]) => k !== 'ms')
      .map(([k, v]) => `<span class="chip static">${esc(k)}: ${v}</span>`).join('');
    try {
      const md = reportMarkdown(run, { ...session.info, plataforma: platform.name });
      const where = await recorder.saveExtra('relatorio.md', md);
      await recorder.saveExtra('relatorio.json', JSON.stringify(run, null, 2));
      $('#suiteStatus').textContent = `Concluído em ${Math.round(run.summary.ms / 1000)} s. Relatório salvo em ${where}.`;
    } catch (e) {
      $('#suiteStatus').textContent = `Concluído, mas o relatório não foi salvo: ${e.message}`;
    }
  };
  $('#stopSuite').onclick = () => state.running?.abort();

  // ---------- início ----------
  setConnected(false);
  recorder.start({ platform: platform.name, userAgent: navigator.userAgent, commands: commands.length }).then((loc) => {
    logPanel.querySelector('#fileLoc').textContent = loc ? `Arquivo da sessão: ${loc}` : 'Registro apenas na tela (sem arquivo).';
  });

  for (const t of extraTabs) t.mount(root.querySelector(`main > .view[data-view="${t.id}"]`), { session, recorder, commands, responses, platform });

  return { session, recorder };
}
