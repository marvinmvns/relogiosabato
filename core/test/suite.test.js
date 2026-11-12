// Testes do plano do "Testar tudo".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMMANDS, commandById } from '../commands.js';
import { buildPlan, undoFor, reportMarkdown, summarize } from '../suite.js';

test('plano nunca envia perigosos nem não implementados', () => {
  for (const includeConfig of [false, true]) {
    for (const item of buildPlan(COMMANDS, { includeConfig })) {
      if (item.command.risk === 'perigoso') assert.equal(item.skip, 'bloqueado', item.command.id);
      if (!item.command.encode) assert.ok(item.skip, item.command.id);
    }
  }
});

test('configurações só entram com a opção ligada', () => {
  const off = buildPlan(COMMANDS).filter((i) => !i.skip);
  const on = buildPlan(COMMANDS, { includeConfig: true }).filter((i) => !i.skip);
  assert.ok(off.every((i) => i.command.risk === 'seguro' || i.writeBack));
  assert.deepEqual(off.filter((i) => i.writeBack).map((i) => i.command.id).sort(), ['handBright', 'sendBPAutoTestSetting', 'sendBoAutoTestSetting', 'sendHrAutoHigLowFla', 'sendHrAutoTestSetting', 'sendHrvAutoTestSetting', 'sendPrAutoTestSetting', 'sendScientSleepTestSetting', 'sendSedentaryRemind', 'sendSleepSetting', 'sendTemperAutoTestSetting', 'sendWearing', 'setAlarm', 'setDND', 'setLanguage', 'setRealtimeHealth', 'setRealtimeSport', 'setStepTarget', 'settingDrinkWater', 'settingFitnessReminder', 'settingGazeDistance', 'settingHandWash', 'settingReadingReminder', 'settingTravelReminder']);
  assert.ok(on.length > off.length);
});

test('leituras vêm antes das ações', () => {
  const groups = buildPlan(COMMANDS).map((i) => i.command.group);
  assert.ok(groups.indexOf('leitura') < groups.indexOf('acao'));
});

test('desfazer: medição para, chamada encerra, envio automático desliga', () => {
  assert.deepEqual(undoFor(commandById('sendRequestHeartRate')).params, { z: false });
  assert.deepEqual(undoFor(commandById('sendPhoneCallState')).params, { estado: 4 });
  assert.deepEqual(undoFor(commandById('setRealtimeHealth')).params, { i: 0 });
  assert.equal(undoFor(commandById('findWatch')), null);
});

test('relatório em Markdown', () => {
  const results = [{ label: 'Bateria', cmdKey: '11/00', risk: 'seguro', status: 'passou', ms: 120, text: 'bateria: 0%' }];
  const md = reportMarkdown({ results, summary: summarize(results, 200) }, { firmware: 'V1.8' });
  assert.match(md, /\| Bateria \| 11\/00 \| seguro \| passou \| 120 \| bateria: 0% \|/);
});

test('medição: ACK atrasado conta, mas não o ACK do desligar', async () => {
  const { runSuite } = await import('../suite.js');
  const listeners = new Set();
  const fake = {
    connected: true, counters: { rx: 0 }, lastByCmd: new Map(),
    recorder: { add: async () => {} },
    waitFor(match, ms) { return new Promise((resolve) => { const w = { match, resolve }; listeners.add(w); setTimeout(() => { if (listeners.delete(w)) resolve(null); }, ms); }); },
    emit(frame) { for (const w of [...listeners]) if (w.match(frame)) { listeners.delete(w); w.resolve({ frame, entry: { summary: 'x' } }); } },
    async send(command, params) {
      // só o "desligar" (parâmetro falso/0) recebe ACK, imediatamente
      const v = Object.values(params || {})[0];
      if (!v) setTimeout(() => this.emit({ kind: 'FD', cmd: command.cmd, key: command.key, status: 0 }), 5);
    },
  };
  const cmd = COMMANDS.find((c) => c.id === 'sendRequestHr' || /^sendRequest/.test(c.method));
  const plan = [{ command: { ...cmd, params: [{ name: 'z', default: true }] } }];
  const { results } = await runSuite(fake, plan.map((i) => ({ ...i, command: { ...i.command } })), {});
  assert.equal(results[0].status, 'sem resposta');
}, { timeout: 30000 });

test('alarmes e lembretes ficam em regravação mesmo com configurações ligadas', () => {
  const on = buildPlan(COMMANDS, { includeConfig: true });
  for (const id of ['setAlarm', 'settingDrinkWater', 'settingHandWash']) assert.equal(on.find((i) => i.command.id === id).writeBack, true, id);
  assert.notEqual(on.find((i) => i.command.id === 'setLanguage').writeBack, true);
});
