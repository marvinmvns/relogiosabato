// Testes offline: quadros reais da captura de 2026-11-12 (docs/CAPTURAS.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFrame, buildAck, parseFrame, Reassembler, encodeTime, decodeTime,
  describe, hex, TESTS, isBlocked,
} from '../protocol.js';

const fromHex = (s) => Uint8Array.from(s.match(/../g), (x) => parseInt(x, 16));

test('monta F3/00 igual ao app oficial', () => {
  assert.equal(hex(buildFrame(0xf3, 0x00, [], 0)).replace(/ /g, ''), 'df0005d7f300000000');
});

test('monta 14/00 e 00/00 iguais ao app oficial', () => {
  assert.equal(hex(buildFrame(0x14, 0x00, [1], 0)).replace(/ /g, ''), 'df0006fb140000000101');
  assert.equal(hex(buildFrame(0x00, 0x00, [0], 0)).replace(/ /g, ''), 'df0006e6000000000100');
});

test('monta ACK igual ao app oficial', () => {
  assert.equal(hex(buildAck(0x11, 0x00, 0, 4)).replace(/ /g, ''), 'fd000619110400000100');
});

test('decodifica a resposta de firmware', () => {
  const f = parseFrame(fromHex('df003341020417002e0456312e38285a31365f5446333750726f5f4853575b5446333750726f5d5f5374796c65315f506f647366696e65'));
  assert.ok(f.checksumOk && f.lengthOk);
  assert.equal(f.version, 4);
  assert.equal(describe(f), "firmware/projeto: V1.8 Z16_TF37Pro_HSW[TF37Pro]_Style1_Podsfine");
});

test('decodifica a resposta de OTA com o chip', () => {
  const f = parseFrame(fromHex('df00153320040100106a7adcd40456312e3806414235363958'));
  assert.ok(f.checksumOk && f.lengthOk);
  assert.equal(describe(f), 'OTA id=6a 7a dc d4 versão=V1.8 chip=AB569X');
});

test('decodifica ACK do relógio', () => {
  const f = parseFrame(fromHex('fd00061c140400000100'));
  assert.equal(f.kind, 'FD');
  assert.ok(f.checksumOk && f.lengthOk);
  assert.equal(f.status, 0);
});

test('remonta quadro picotado', () => {
  const full = buildFrame(0x02, 0x17, Array.from('V1.8(PROJETO_LONGO_DE_TESTE)', (c) => c.charCodeAt(0)), 4);
  const r = new Reassembler();
  assert.deepEqual(r.push(full.slice(0, 8)), []);
  assert.deepEqual(r.push(full.slice(8, 20)), []);
  const out = r.push(full.slice(20));
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], full);
  assert.ok(parseFrame(out[0]).checksumOk);
});

test('hora: mesmo formato da captura (2026-11-12 00:07:55)', () => {
  const bytes = encodeTime(new Date(2026, 10, 12, 0, 7, 55));
  assert.equal(hex(bytes).replace(/ /g, ''), '6ad801f7');
  assert.deepEqual(decodeTime(bytes), { year: 2026, month: 11, day: 12, hour: 0, minute: 7, second: 55 });
});

test('nenhum teste usa comando bloqueado', () => {
  for (const t of TESTS) assert.equal(isBlocked(t.cmd, t.key), false, t.id);
  assert.ok(isBlocked(0x20, 0x02));
  assert.ok(isBlocked(0x02, 0x09));
  assert.ok(isBlocked(0x08, 0x00));
});
