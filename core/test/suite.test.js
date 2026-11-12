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
  assert.deepEqual(off.filter((i) => i.writeBack).map((i) => i.command.id).sort(), ['handBright', 'sendWearing', 'setLanguage', 'setRealtimeHealth', 'setRealtimeSport', 'setStepTarget']);
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
