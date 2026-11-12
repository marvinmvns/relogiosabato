// Aba "Protocolo": referência pesquisável do que o app envia, do que o relógio responde
// e dos bits de recursos, a partir de docs/comandos/comandos.json (análise estática).

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const RISK = { seguro: 'seguro', config: 'altera configuração', perigoso: 'perigoso', 'altera-config': 'altera configuração' };

/** Normaliza as três listas num formato só (exportado para teste). */
export function flattenDocs(docs, commands = []) {
  const byMethod = new Map(commands.map((c) => [c.method, c]));
  const sent = (docs.enviados || []).map((e) => {
    const c = byMethod.get(e.method);
    return {
      kind: 'enviados', code: `${e.cmd}/${e.key}`.replace(/0x/g, ''), title: e.nome || e.method, method: e.method,
      body: e.explicacao, fields: [['payload', e.payload], ['resposta', e.resposta], ['no TF37 Pro', e.aplica_tf37], ['fonte', e.fonte]],
      risk: c?.risk || e.risco, sendable: Boolean(c?.implemented) && c?.risk !== 'perigoso',
    };
  });
  const recv = (docs.recebidos || []).map((e) => ({
    kind: 'recebidos', code: `${e.cmd}/${e.key}`.replace(/0x/g, ''), title: e.nome, method: '',
    body: e.explicacao, fields: [['payload', e.payload], ['gatilho', e.gatilho], ['o app oficial faz', e.acao_do_app], ['fonte', e.fonte]],
  }));
  const feats = (docs.recursos || []).map((e) => ({
    kind: 'recursos', code: `byte ${e.byte} ${e.mask}`, title: e.campo, method: '',
    body: e.significado, fields: [['condição', e.condicao], ['fonte', e.fonte]],
  }));
  return [...sent, ...recv, ...feats];
}

export function mountDocs(section, { docs, commands }) {
  const items = flattenDocs(docs, commands);
  const state = { kind: 'enviados', q: '' };
  const counts = { enviados: 0, recebidos: 0, recursos: 0 };
  for (const i of items) counts[i.kind] += 1;

  section.innerHTML = `
    <div class="block">
      <h2>Protocolo</h2>
      <p>Cada comando que o app pode enviar, cada resposta que o relógio manda e cada bit de recurso, explicados a partir do código do app oficial. Comandos marcados "enviável" podem ser testados na aba Comandos.</p>
      <input class="search" id="docSearch" type="search" placeholder="Buscar por nome, cmd/key, método ou palavra" aria-label="Buscar no protocolo">
      <div class="chips" id="docKinds">
        ${Object.entries({ enviados: 'App envia', recebidos: 'Relógio responde', recursos: 'Bits de recursos' })
          .map(([k, l]) => `<button class="chip" data-k="${k}" aria-pressed="${k === state.kind}">${l} (${counts[k]})</button>`).join('')}
      </div>
      <p class="file" id="docCount"></p>
    </div>
    <div class="doc-list" id="docList"></div>`;

  const $ = (s) => section.querySelector(s);
  const render = () => {
    const q = state.q;
    const shown = items.filter((i) => i.kind === state.kind
      && (!q || `${i.code} ${i.title} ${i.method} ${i.body}`.toLowerCase().includes(q)));
    $('#docCount').textContent = `${shown.length} de ${counts[state.kind]}`;
    $('#docList').innerHTML = shown.map((i) => `
      <details class="doc-item"${i.risk ? ` data-risk="${esc(i.risk)}"` : ''}>
        <summary><code>${esc(i.code)}</code><span class="t">${esc(i.title)}</span>
          ${i.risk ? `<span class="tag">${esc(RISK[i.risk] || i.risk)}</span>` : ''}${i.sendable ? '<span class="tag ok">enviável</span>' : ''}</summary>
        <p>${esc(i.body)}</p>
        <dl>${i.fields.filter(([, v]) => v).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}
          ${i.method ? `<dt>método</dt><dd><code>${esc(i.method)}</code></dd>` : ''}</dl>
      </details>`).join('') || '<p class="file">Nada encontrado.</p>';
  };
  $('#docKinds').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-k]');
    if (!b) return;
    state.kind = b.dataset.k;
    section.querySelectorAll('#docKinds .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
    render();
  });
  $('#docSearch').addEventListener('input', (ev) => { state.q = ev.target.value.trim().toLowerCase(); render(); });
  render();
}
