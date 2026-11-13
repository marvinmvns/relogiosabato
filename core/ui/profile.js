// Seção "Seu perfil" (aba Relógio): sexo, idade, altura, peso, nome e metas. O relógio usa
// o perfil para estimar distância (passada) e calorias, mas não deixa ler de volta: o app
// guarda o que você gravou e mostra o que vai ser enviado. Comandos: 02/04 perfil,
// 02/20 nome, 02/05 meta de passos, 02/2C calorias, 02/2D distância.

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KEY = 'relogio.perfil.v1';
const DEFAULTS = { nome: '', sexo: '', nascimento: '', altura: '', peso: '', passos: 5000, kcal: 300, km: 5 };

export function ageFrom(nascimento, now = new Date()) {
  const [y, m, d] = String(nascimento || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age -= 1;
  return age;
}

/** IMC com as faixas da OMS para adultos. */
export function bmi(alturaCm, pesoKg) {
  const h = Number(alturaCm) / 100; const w = Number(pesoKg);
  if (!(h > 0.5) || !(w > 10)) return null;
  const v = Math.round((w / (h * h)) * 10) / 10;
  const label = v < 18.5 ? 'abaixo do peso' : v < 25 ? 'peso adequado' : v < 30 ? 'sobrepeso' : 'obesidade';
  return { value: v, label };
}

/** Passada estimada pela altura (regra prática: 41,5% da altura no masculino, 41,3% no feminino). */
export function stride(alturaCm, sexo) {
  const h = Number(alturaCm);
  if (!(h > 50)) return null;
  return Math.round(h * (sexo === '0' ? 0.413 : 0.415)) / 100;
}

export function mountProfile(el, { session, commands, recorder }) {
  let p = { ...DEFAULTS };
  try { p = { ...p, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (_e) { /* sem armazenamento */ }
  const cmd = (id) => commands.find((c) => c.id === id);

  el.innerHTML = `
    <h2>Seu perfil</h2>
    <p>O relógio usa estes dados para estimar a distância (pelo tamanho da passada) e as calorias. Ele não deixa ler o perfil de volta, então o app guarda aqui o que você gravou.</p>
    <form class="profile" id="pfForm" novalidate>
      <label>Nome no relógio<input name="nome" maxlength="20" autocomplete="nickname" value="${esc(p.nome)}"></label>
      <label>Sexo<select name="sexo" required>
        <option value="" ${p.sexo === '' ? 'selected' : ''}>escolha</option>
        <option value="0" ${p.sexo === '0' ? 'selected' : ''}>feminino</option>
        <option value="1" ${p.sexo === '1' ? 'selected' : ''}>masculino</option></select></label>
      <label>Nascimento<input name="nascimento" type="date" required value="${esc(p.nascimento)}"></label>
      <label>Altura (cm)<input name="altura" type="number" inputmode="numeric" min="80" max="250" required value="${esc(p.altura)}"></label>
      <label>Peso (kg)<input name="peso" type="number" inputmode="numeric" min="20" max="250" required value="${esc(p.peso)}"></label>
      <label>Meta de passos<input name="passos" type="number" inputmode="numeric" min="100" max="100000" step="100" value="${esc(p.passos)}"></label>
      <label>Meta de calorias (kcal)<input name="kcal" type="number" inputmode="numeric" min="10" max="5000" value="${esc(p.kcal)}"></label>
      <label>Meta de distância (km)<input name="km" type="number" inputmode="decimal" min="0.1" max="60" step="0.1" value="${esc(p.km)}"></label>
    </form>
    <dl class="monitor-facts pf-derived" id="pfDerived"></dl>
    <div class="actions"><button class="btn watch" id="pfSave">Gravar no relógio</button></div>
    <p class="file" id="pfMsg">${p.gravadoEm ? `Gravado no relógio em ${esc(p.gravadoEm)}.` : 'Ainda não gravado neste aparelho.'}</p>`;

  const $ = (s) => el.querySelector(s);
  const form = $('#pfForm');
  const read = () => Object.fromEntries(new FormData(form).entries());

  function derived() {
    const v = read();
    const age = ageFrom(v.nascimento);
    const b = bmi(v.altura, v.peso);
    const s = stride(v.altura, v.sexo);
    $('#pfDerived').innerHTML = `
      <div><dt>Idade</dt><dd>${age ?? '—'}${age != null ? ' anos' : ''}</dd></div>
      <div><dt>IMC</dt><dd>${b ? `${b.value.toLocaleString('pt-BR')} · ${b.label}` : '—'}</dd></div>
      <div><dt>Passada estimada</dt><dd>${s ? `${s.toLocaleString('pt-BR')} m` : '—'}</dd></div>`;
  }
  form.addEventListener('input', derived);
  derived();

  function problems(v) {
    const out = [];
    if (v.sexo === '') out.push('escolha o sexo');
    const age = ageFrom(v.nascimento);
    if (age == null || age < 5 || age > 120) out.push('confira a data de nascimento');
    if (!(Number(v.altura) >= 80 && Number(v.altura) <= 250)) out.push('altura entre 80 e 250 cm');
    if (!(Number(v.peso) >= 20 && Number(v.peso) <= 250)) out.push('peso entre 20 e 250 kg');
    return out;
  }

  async function sendAck(c, params) {
    const ack = session.waitFor((f) => f.kind === 'FD' && f.cmd === c.cmd && f.key === c.key, 4000);
    await session.send(c, params);
    const a = await ack;
    return a ? a.frame.status === 0 : false;
  }

  $('#pfSave').onclick = async () => {
    const v = read();
    const bad = problems(v);
    if (bad.length) { $('#pfMsg').textContent = `Antes de gravar: ${bad.join('; ')}.`; return; }
    if (!session.connected) { $('#pfMsg').textContent = 'Conecte o relógio para gravar.'; return; }
    $('#pfSave').disabled = true;
    $('#pfMsg').textContent = 'Gravando…';
    const steps = [
      ['setUserInfo', { sexo: Number(v.sexo), idade: ageFrom(v.nascimento), altura: Number(v.altura), peso: Math.round(Number(v.peso)) }, 'perfil'],
      ...(v.nome ? [['settingUserName', { nome: v.nome }, 'nome']] : []),
      ['setStepTarget', { passos: Math.round(Number(v.passos) || 5000) }, 'meta de passos'],
      ['setCalorieTarget', { kcal: Math.round(Number(v.kcal) || 300) }, 'meta de calorias'],
      ['setDistanceTarget', { metros: Math.round((Number(String(v.km).replace(',', '.')) || 5) * 1000) }, 'meta de distância'],
    ];
    const done = []; const failed = [];
    for (const [id, params, label] of steps) {
      const c = cmd(id);
      try { (c && await sendAck(c, params)) ? done.push(label) : failed.push(label); } catch (e) { failed.push(`${label} (${e.message})`); }
    }
    const when = new Date().toLocaleString('pt-BR');
    try { localStorage.setItem(KEY, JSON.stringify({ ...v, gravadoEm: failed.length ? p.gravadoEm : when })); } catch (_e) { /* sem armazenamento */ }
    await recorder.add({ type: 'evento', note: `perfil gravado: ${done.join(', ')}${failed.length ? `; falhou: ${failed.join(', ')}` : ''}` });
    $('#pfMsg').textContent = failed.length ? `Gravado: ${done.join(', ') || 'nada'}. Falhou: ${failed.join(', ')}. Tente de novo.` : `Gravado no relógio em ${when}.`;
    $('#pfSave').disabled = false;
  };
}
