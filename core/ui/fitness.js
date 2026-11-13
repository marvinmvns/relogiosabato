import { decodeToday } from '../measure.js';

const number = (n, digits = 0) => n.toLocaleString('pt-BR', { maximumFractionDigits: digits });
export function mountFitness(root, { session, navigate }) {
  let activity = null;
  let activityDay = null;
  let goal = 6000;
  try { const saved = Number(localStorage.getItem('sabatinho.fit.goal')); if (saved >= 500 && saved <= 100000) goal = saved; } catch {}
  root.innerHTML = `
    <header class="fit-heading"><div><p id="fitDate"></p><h2>Seu universo de movimento</h2></div><button class="motion-toggle" id="neonMotion" aria-label="Pausar animações" aria-pressed="false">Ⅱ <span>Animações</span></button></header>
    <section class="neon-hero" aria-labelledby="neonTitle">
      <div class="hero-copy"><span class="edition"><i></i> Sabatinho / Neon</span><h3 id="neonTitle">Seu corpo.<br><em>Outra órbita.</em></h3><p>Conecte seu relógio.<br>Encontre o seu próximo ritmo.</p><button class="btn" data-go="relogio">Conectar meu relógio <span aria-hidden="true">↗</span></button></div>
      <div class="hero-object" data-model="watch" aria-hidden="true"><div class="model-fallback">◉</div><div class="orbital-grid"></div></div>
      <span class="hero-caption" aria-hidden="true">TF37 PRO <i></i> Movimento conectado</span>
    </section>
    <div class="fit-layout">
      <section class="fit-activity" aria-labelledby="activityTitle">
        <div class="fit-section-head"><h3 id="activityTitle">Movimento de hoje</h3><span class="fit-tag">Meta diária</span></div>
        <div class="activity-body"><div class="activity-orbit"><svg viewBox="0 0 260 260" aria-hidden="true"><circle class="orbit-track" cx="130" cy="130" r="110"/><circle id="fitArc" class="orbit-progress" cx="130" cy="130" r="110" pathLength="100"/></svg><div class="orbit-value"><span aria-hidden="true">↗</span></div></div><div class="activity-readout"><strong id="fitSteps">—</strong><span>passos registrados</span><p class="fit-progress" id="fitProgress" role="status">Sincronize para começar.</p></div></div>
        <form id="fitGoalForm" class="fit-goal"><label for="fitGoal">Meta de passos</label><div><input id="fitGoal" type="number" min="500" max="100000" step="100" required value="${goal}"><button class="btn quiet">Salvar meta</button></div><small>Sua meta pessoal, no seu ritmo.</small></form>
      </section>
      <div class="fit-overview"><section class="fit-stats" aria-label="Resumo de atividade"><article><div class="stat-object" data-model="distance" aria-hidden="true"><span class="model-fallback">⌖</span></div><span>Distância</span><strong id="fitDistance">—</strong><small>quilômetros percorridos</small></article><article><div class="stat-object" data-model="energy" aria-hidden="true"><span class="model-fallback">ϟ</span></div><span>Energia</span><strong id="fitCalories">—</strong><small>quilocalorias estimadas</small></article></section>
      <p class="fit-sync" id="fitSync">Sem dados nesta sessão. Conecte seu relógio e atualize a atividade na aba Saúde.</p></div>
    </div>
    <button class="health-portal" data-go="medir"><span class="portal-object" data-model="hr" aria-hidden="true"><span class="model-fallback">♡</span></span><span><small>Além dos passos</small><strong>Entre no seu ritmo.</strong><span>Explore suas métricas de saúde</span></span><b aria-hidden="true">↗</b></button>`;
  const $ = (id) => root.querySelector(id);
  const todayKey = () => new Date().toLocaleDateString('en-CA');
  function refreshDay() {
    $('#fitDate').textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (activityDay && activityDay !== todayKey()) {
      activity = null;
      activityDay = null;
      ['#fitSteps', '#fitDistance', '#fitCalories'].forEach(id => { $(id).textContent = '—'; });
      $('#fitProgress').textContent = 'Um novo dia. Sincronize para acompanhar seu movimento.';
      $('#fitSync').textContent = 'Aguardando os dados de hoje do relógio.';
      render();
    }
  }
  refreshDay();
  document.addEventListener('visibilitychange', refreshDay);
  window.addEventListener('focus', refreshDay);
  root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => navigate(b.dataset.go));
  function render() {
    $('#fitArc').style.visibility = activity?.steps > 0 ? 'visible' : 'hidden';
    $('#fitArc').style.strokeDashoffset = activity ? String(100 - Math.min(100, activity.steps / goal * 100)) : '100';
    if (!activity) return;
    $('#fitSteps').textContent = number(activity.steps);
    $('#fitDistance').textContent = number(activity.distanceKm, 2) + ' km';
    $('#fitCalories').textContent = number(activity.kcal, 1) + ' kcal';
    $('#fitProgress').textContent = activity.steps >= goal ? 'Meta alcançada. Cada passo conta!' : `${number(Math.max(0, goal - activity.steps))} passos para sua meta`;
  }
  $('#fitGoalForm').onsubmit = (event) => {
    event.preventDefault();
    if (!$('#fitGoalForm').reportValidity()) return;
    goal = Number($('#fitGoal').value);
    try { localStorage.setItem('sabatinho.fit.goal', String(goal)); } catch {}
    render();
    if (!activity) $('#fitProgress').textContent = 'Meta salva. Sincronize para acompanhar seu progresso.';
  };
  render();
  session.addEventListener('frame', ({ detail: { frame } }) => {
    if (frame.kind !== 'DF' || frame.cmd !== 4 || frame.key !== 0) return;
    const value = decodeToday(frame.payload);
    if (!value?.plausible) { $('#fitSync').textContent = 'O relógio enviou valores inconsistentes. Atualize a atividade novamente.'; return; }
    refreshDay();
    activity = value;
    activityDay = todayKey();
    $('#fitSync').textContent = `Recebido do relógio às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`;
    render();
  });
}

export function mountAppearance(root) {
  const select = root.querySelector('#fitTheme');
  const motion = root.querySelector('#fitMotion');
  try { select.value = localStorage.getItem('sabatinho.neon.theme') || 'neon'; motion.checked = localStorage.getItem('sabatinho.motion') === 'reduce'; } catch {}
  function apply() {
    document.documentElement.dataset.theme = select.value;
    document.documentElement.dataset.motion = motion.checked ? 'reduce' : 'system';
    const toggle = root.querySelector('#neonMotion');
    if (toggle) { toggle.setAttribute('aria-pressed', String(motion.checked)); toggle.setAttribute('aria-label', motion.checked ? 'Ativar animações' : 'Pausar animações'); toggle.innerHTML = `${motion.checked ? '▷' : 'Ⅱ'} <span>Animações</span>`; }
    try { localStorage.setItem('sabatinho.neon.theme', select.value); localStorage.setItem('sabatinho.motion', motion.checked ? 'reduce' : 'system'); } catch {}
  }
  const toggle = root.querySelector('#neonMotion');
  if(toggle) toggle.onclick = () => { motion.checked = !motion.checked; apply(); };
  select.onchange = apply; motion.onchange = apply; apply();
}
