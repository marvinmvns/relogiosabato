// Configurações 02/06 com a resposta real do TF37 Pro (sessão de 2026-11-12).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSettings, writeBackPlan } from '../settings.js';
import { commandById } from '../commands.js';

const real = Uint8Array.from(('01aa41190102000013880300008000000000010401052801e00501060100001e0000059f070000000f2d0816f808010a0101010101010101010101' + '3303c3ffff000000000d0000190100003c0000059f1a0100003c0000059f1b01').match(/../g), (x) => parseInt(x, 16));

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
  assert.equal(s.paradoNaEtiqueta, undefined); // 0x33 com 9 bytes fecha o payload inteiro
  assert.equal(s.etiqueta33, '03 c3 ff ff 00 00 00 00');
  assert.deepEqual(s.unidades, { distancia: 0, temperatura: 0 });
  assert.deepEqual(s.sedentarismo, { naoPerturbe: 0, ligado: 0, limite: 15, tempo: 45, inicio: 8, fim: 22, repetir: 0xf8 });
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

test('regravação de sono, FC automática e sedentarismo reproduz os bytes lidos', () => {
  const plan = writeBackPlan(parseSettings(real));
  const payload = (id) => { const p = plan.find((x) => x.id === id); return commandById(id).encode(p.params); };
  assert.deepEqual(payload('sendSleepSetting'), [0x01, 0x05, 0x28, 0x01, 0xe0]);
  assert.deepEqual(payload('sendHrAutoTestSetting'), [0x01, 0x00, 0x00, 0x1e, 0x00, 0x00, 0x05, 0x9f]);
  assert.deepEqual(payload('sendSedentaryRemind'), [0x00, 0x00, 0x00, 0x0f, 0x2d, 0x08, 0x16, 0xf8]);
});

test('medições automáticas e sono científico regravam os bytes das etiquetas 0x19, 0x1A e 0x1B', () => {
  const s = parseSettings(real);
  assert.deepEqual(s.estresseAutomatico, { ligado: 1, intervaloMin: 60, inicio: '00:00', fim: '23:59' });
  assert.deepEqual(s.pressaoAutomatica, { ligado: 1, intervaloMin: 60, inicio: '00:00', fim: '23:59' });
  assert.equal(s.sonoCientifico, 1);
  const plan = writeBackPlan(s);
  const payload = (id) => { const p = plan.find((x) => x.id === id); return commandById(id).encode(p.params); };
  assert.deepEqual(payload('sendPrAutoTestSetting'), [0x01, 0x00, 0x00, 0x3c, 0x00, 0x00, 0x05, 0x9f]);
  assert.deepEqual(payload('sendBPAutoTestSetting'), [0x01, 0x00, 0x00, 0x3c, 0x00, 0x00, 0x05, 0x9f]);
  assert.deepEqual(payload('sendScientSleepTestSetting'), [0x01]);
});

test('limites de FC (03/09 real) regravam com 03/0A', async () => {
  const { parseHrLimits } = await import('../settings.js');
  const lim = parseHrLimits(Uint8Array.from([0x00, 0x96, 0x6e, 0x0a, 0x78, 0x00, 0x32, 0x28, 0x05, 0x2d]));
  assert.deepEqual(lim.alto, { ligado: 0, max: 150, min: 110, passo: 10, atual: 120 });
  assert.deepEqual(lim.baixo, { ligado: 0, max: 50, min: 40, passo: 5, atual: 45 });
  const step = writeBackPlan({ limitesFc: lim }).find((x) => x.id === 'sendHrAutoHigLowFla');
  assert.deepEqual(commandById('sendHrAutoHigLowFla').encode(step.params), [0x00, 0x78, 0x00, 0x2d]);
});

test('alarmes e lembretes regravam exatamente o payload lido', () => {
  const plan = writeBackPlan({ leituras: { setAlarm: 'a0 00', settingGazeDistance: '00 00 00 3c 08 00 16 00', settingDrinkWater: null } });
  const by = Object.fromEntries(plan.map((p) => [p.id, commandById(p.id).encode(p.params)]));
  assert.deepEqual(by.setAlarm, [0xa0, 0x00]);
  assert.deepEqual(by.settingGazeDistance, [0, 0, 0, 0x3c, 8, 0, 0x16, 0]);
  assert.equal(by.settingDrinkWater, undefined); // sem leitura, não regrava
});
