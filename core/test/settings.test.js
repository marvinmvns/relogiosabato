// Configurações 02/06 com a resposta real do TF37 Pro (sessão de 2026-11-12).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSettings, writeBackPlan } from '../settings.js';
import { commandById } from '../commands.js';

const real = Uint8Array.from(('01aa41190102000013880300008000000000010401052801e00501060100001e0000059f070000000f2d0816f808010a0101010101010101010101' + '3303c3ffff00000000').match(/../g), (x) => parseInt(x, 16));

test('campos fixos da resposta real', () => {
  const s = parseSettings(real);
  assert.equal(s.metaPassos, 5000);
  assert.equal(s.levantarParaAcender, 0);
  assert.equal(s.idioma, 0);
  assert.deepEqual(s.idiomasSuportados, [0x80, 0, 0, 0]);
  assert.equal(s.envioAutomaticoEsporte, 0);
  assert.equal(s.envioAutomaticoSaude, 1);
  assert.deepEqual(s.sono, { ligado: 1, inicio: '22:00', fim: '08:00' });
  assert.equal(s.pulsoDeUso, 1);
  assert.equal(s.etiqueta08, 1);
  assert.equal(s.notificacoesPorApp.length, 11);
  assert.match(s.paradoNaEtiqueta, /^0x33/);
  assert.deepEqual(s.fcAutomatica, { ligado: 1, intervaloMin: 30, inicio: '00:00', fim: '23:59' });
});

test('regravação usa exatamente os valores lidos', () => {
  const plan = writeBackPlan(parseSettings(real));
  const payload = (id) => { const p = plan.find((x) => x.id === id); return commandById(id).encode(p.params); };
  assert.deepEqual(payload('handBright'), [0]);
  assert.deepEqual(payload('setLanguage'), [0]);
  assert.deepEqual(payload('setStepTarget'), [0, 0, 0x13, 0x88]);
  for (const p of plan) assert.ok(commandById(p.id), p.id);
});

test('resposta curta não gera plano', () => {
  assert.equal(parseSettings(Uint8Array.from([1, 2, 3])), null);
  assert.deepEqual(writeBackPlan(null), []);
});
