import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHex, explainFrame } from '../ui/debug.js';
import { flattenDocs } from '../ui/docs.js';
import { buildFrame } from '../protocol.js';
import { COMMANDS, RESPONSES } from '../commands.js';

test('parseHex aceita espaços, 0x e maiúsculas', () => {
  assert.deepEqual([...parseHex('DF 0x00, 0a')], [0xdf, 0x00, 0x0a]);
  assert.throws(() => parseHex('abc'), /ímpar/);
});

test('explainFrame confere checksum e reconhece bateria', () => {
  const ok = explainFrame(buildFrame(0x11, 0x00, [0x00, 0x09], 4), RESPONSES);
  assert.equal(ok.ok, true);
  assert.match(ok.text, /checksum ok/);
  assert.match(ok.text, /bateria: 9%/);
  const bad = buildFrame(0x11, 0x00, [9], 4);
  bad[3] ^= 0xff;
  assert.match(explainFrame(bad).text, /checksum ERRADO/);
  assert.equal(explainFrame(Uint8Array.from([1, 2, 3])).ok, false);
});

test('explainFrame avisa sobre cmd/key bloqueado', () => {
  assert.match(explainFrame(buildFrame(0x20, 0x02, [], 4)).text, /bloqueado/);
});

test('flattenDocs junta as três listas e marca perigosos como não enviáveis', () => {
  const docs = {
    enviados: [{ method: 'getEpRestart', cmd: '0x06', key: '0x0A', nome: 'reiniciar' }, { method: 'getDeviceFeatures', cmd: '0x00', key: '0x00', nome: 'recursos' }],
    recebidos: [{ cmd: '0x00', key: '0x00', nome: 'recursos' }],
    recursos: [{ byte: 9, mask: '0xFF', campo: 'g' }],
  };
  const items = flattenDocs(docs, COMMANDS);
  assert.equal(items.length, 4);
  assert.equal(items.find((i) => i.method === 'getEpRestart').sendable, false);
  assert.equal(items.find((i) => i.method === 'getDeviceFeatures').sendable, true);
  assert.equal(items[0].code, '06/0A');
});

import { restorePlan } from '../settings.js';
test('restorePlan devolve idioma, unidades e tempo de tela lidos', () => {
  const plan = restorePlan({ levantarParaAcender: 1, idioma: 2, metaPassos: 6000, envioAutomaticoEsporte: 0, envioAutomaticoSaude: 0, pulsoDeUso: 1, unidades: { distancia: 0, temperatura: 0 }, tempoDeTela: 5 });
  const by = Object.fromEntries(plan.map((p) => [p.id, p.params]));
  assert.deepEqual(by.setLanguage, { i: 2 });
  assert.deepEqual(by.setUnit, { i: 0, i2: 0 });
  assert.deepEqual(by.sendScreenTime, { i: 5 });
  assert.equal(restorePlan(null).length, 0);
});
