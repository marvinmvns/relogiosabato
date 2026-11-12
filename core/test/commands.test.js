// Testes do catálogo de comandos (gerado + nomes, riscos e codificadores feitos à mão).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMMANDS, RESPONSES, commandById } from '../commands.js';
import { defaults } from '../session.js';
import { buildFrame, hex } from '../protocol.js';

const fromHex = (s) => Uint8Array.from(s.match(/../g), (x) => parseInt(x, 16));
const frameOf = (id, params = {}) => {
  const c = commandById(id);
  return hex(buildFrame(c.cmd, c.key, c.encode({ ...defaults(c), ...params }), 0)).replace(/ /g, '');
};

test('209 comandos com ids únicos e cmd/key válidos', () => {
  assert.equal(COMMANDS.length, 209);
  assert.equal(new Set(COMMANDS.map((c) => c.id)).size, COMMANDS.length);
  for (const c of COMMANDS) {
    assert.ok(Number.isInteger(c.cmd) && c.cmd >= 0 && c.cmd <= 255, c.id);
    assert.ok(Number.isInteger(c.key) && c.key >= 0 && c.key <= 255, c.id);
  }
});

test('todo comando implementado gera bytes 0..255 com os valores padrão', () => {
  for (const c of COMMANDS.filter((x) => x.implemented)) {
    const p = c.encode(defaults(c));
    assert.ok(Array.isArray(p), c.id);
    for (const b of p) assert.ok(Number.isInteger(b) && b >= 0 && b <= 255, `${c.id}: ${b}`);
  }
});

test('quadros iguais aos do app oficial na captura', () => {
  assert.equal(frameOf('getDeviceInfo'), 'df0005d7f300000000');
  assert.equal(frameOf('getProductId'), 'df0006fb140000000101');
  assert.equal(frameOf('getDeviceFeatures'), 'df0006e6000000000100');
});

test('payloads conhecidos', () => {
  assert.deepEqual(commandById('findWatch').encode({}), [1]);
  assert.deepEqual(commandById('getTodayData').encode({}), [1]);
  assert.deepEqual(commandById('setRealtimeHealth').encode({ i: 1 }), [1]);
  assert.deepEqual(commandById('sendRequestHeartRate').encode({ z: true }), [1]);
  assert.deepEqual(commandById('sendRequestHeartRate').encode({ z: false }), [0]);
  assert.deepEqual(commandById('sendSystemTime').encode({ quando: new Date(2026, 10, 12, 0, 7, 55) }), [0x6a, 0xd8, 0x01, 0xf7]);
  assert.deepEqual(commandById('setTimeZone').encode({ horas: -3 }), [1, 3]);
  assert.deepEqual(commandById('setStepTarget').encode({ passos: 8000 }), [0, 0, 0x1f, 0x40]);
});

test('notificação de teste segue o layout do sendMsgNewProtocol', () => {
  const p = commandById('sendMsgNewProtocol').encode({ id: 1, tipo: 255, app: 'A', titulo: 'T', texto: 'oi' });
  assert.deepEqual(p.slice(0, 2), [0, 1]);
  assert.equal(p[6], 255);
  assert.deepEqual(p.slice(7), [1, 0x41, 1, 0x54, 0, 2, 0x6f, 0x69]);
});

test('perigosos ficam marcados', () => {
  const risk = (cmd, key) => COMMANDS.filter((c) => c.cmd === cmd && c.key === key).map((c) => c.risk);
  assert.ok(risk(0x20, 0x02).every((r) => r === 'perigoso'));
  assert.ok(risk(0x02, 0x09).every((r) => r === 'perigoso'));
  assert.ok(risk(0x08, 0x00).every((r) => r === 'perigoso'));
  assert.ok(risk(0x08, 0x01).every((r) => r === 'perigoso'));
  assert.equal(commandById('sendShutDown').risk, 'perigoso');
  assert.equal(commandById('sendGomoreKey').risk, 'perigoso');
  assert.equal(commandById('findWatch').risk, 'seguro');
  assert.equal(commandById('getDeviceInfo').risk, 'seguro');
});

test('analisadores de resposta com payloads reais', () => {
  const r = (cmd, key) => RESPONSES.find((x) => x.cmd === cmd && x.key === key);
  assert.deepEqual(r(0x02, 0x17).parse(fromHex('0456312e38285a31365f5446333750726f5f4853575b5446333750726f5d5f5374796c65315f506f647366696e65')),
    { versao: 'V1.8', projeto: 'Z16_TF37Pro_HSW[TF37Pro]_Style1_Podsfine' });
  assert.deepEqual(r(0x20, 0x01).parse(fromHex('6a7adcd40456312e3806414235363958')), { prefixo: '6a7adcd4', versao: 'V1.8', chip: 'AB569X' });
  assert.equal(r(0x04, 0x00).parse(fromHex('000000000000000000000054')).calories, 84);
});

test('nomes com efeito colateral são perigosos mesmo começando com get/request', () => {
  assert.equal(commandById('getEpRestart').risk, 'perigoso');
  assert.equal(commandById('deleteAllowRecordFile').risk, 'perigoso');
  for (const c of COMMANDS) {
    if (/restart|reboot|shut|reset|format|erase|factory|restore/i.test(c.method)) assert.equal(c.risk, 'perigoso', c.method);
  }
  assert.equal(commandById('sendWeatherInfo').risk, 'altera-config');
});

test('codificadores dos comandos seguros complexos', () => {
  assert.deepEqual(commandById('sendDeleteMsg').encode({ id: 0x0102 }), [1, 2]);
  assert.deepEqual(commandById('getEventReminder').encode({ suporte: [0x11, 0x02] }), [0x11, 0x02]);
  assert.deepEqual(commandById('requestSportLinkageType').encode({}), []);
  const p = commandById('sendMsg').encode({ id: 1, app: 'A', titulo: 'T', texto: 'oi', mtu: 100 });
  assert.deepEqual(p.slice(6), [1, 0x41, 1, 0x54, 0, 2, 0x6f, 0x69]);
  assert.ok(commandById('sendMsg').encode({ id: 1, app: 'A', titulo: 'T', texto: 'x'.repeat(500), mtu: 100 }).length <= 88);
  assert.equal(COMMANDS.filter((c) => c.risk === 'seguro' && !c.encode).length, 0);
  assert.equal(commandById('sendMsg').risk, 'perigoso');
});
