// Testes dos decodificadores de medição com dados reais da captura e sintéticos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeDate2, decodeToday, decodeHourly, decodeHrHistory, decodeLive, decodeStatus, stats, measureCommand, MEASUREMENTS,
} from '../measure.js';

const fromHex = (s) => Uint8Array.from(s.match(/../g), (x) => parseInt(x, 16));

test('data de 2 bytes da captura (04/01 começa com 35 6b)', () => {
  assert.deepEqual(decodeDate2(0x35, 0x6b), { year: 2026, month: 11, day: 11, iso: '2026-11-11' });
});

test('atividade de hoje real: 0 passos, 0 m, 84 cal', () => {
  const t = decodeToday(fromHex('000000000000000000000054'));
  assert.equal(t.steps, 0);
  assert.equal(t.distanceM, 0);
  assert.equal(t.calories, 84);
  assert.equal(t.kcal, 0.084);
  assert.ok(t.plausible);
});

test('atividade de hoje sintética: 5432 passos, 3,9 km, 210 kcal', () => {
  const t = decodeToday(Uint8Array.from([0, 0, 0x15, 0x38, 0, 0, 0x0f, 0x3c, 0, 0x03, 0x34, 0x50]));
  assert.equal(t.steps, 5432);
  assert.equal(t.distanceKm, 3.9);
  assert.equal(t.kcal, 210);
});

test('passos por hora: 24 registros zerados da captura', () => {
  const p = new Uint8Array(4 + 24 * 12);
  p.set([0x35, 0x6b, 0x00, 0x18]);
  p.set([0, 0, 0, 120], 4 + 9 * 12); // 120 passos às 9h
  const h = decodeHourly(p);
  assert.equal(h.date, '2026-11-11');
  assert.equal(h.hours.length, 24);
  assert.equal(h.hours[9].steps, 120);
});

test('histórico de frequência cardíaca: descarta abaixo de 30 bpm', () => {
  const p = Uint8Array.from([
    0x35, 0x6c, 0x00, 0x02,
    0x00, 0x00, 0x8c, 0xa0, 0x01, 0x01, 0x00, 72, // 10:00, 72 bpm, automático
    0x00, 0x00, 0x8c, 0xdc, 0x01, 0x00, 0x00, 20, // 20 bpm: descartado
  ]);
  const r = decodeHrHistory(p);
  assert.equal(r.date, '2026-11-12');
  assert.deepEqual(r.records, [{ time: '10:00', seconds: 36000, bpm: 72, mode: 1, auto: true }]);
});

test('valor ao vivo e estado', () => {
  assert.deepEqual(decodeLive(Uint8Array.from([1, 76])), { type: 1, value: 76, name: 'frequência cardíaca', unit: 'bpm' });
  assert.equal(decodeStatus(0x0f, Uint8Array.from([1])).text, 'medindo');
  assert.equal(decodeStatus(0x99, Uint8Array.from([1])), null);
  assert.equal(decodeStatus(0x0f, Uint8Array.from([2])).failed, true);
});

test('comando de medir FC é 06/04 com 1 e 0', () => {
  const hr = MEASUREMENTS.find((m) => m.id === 'hr');
  assert.deepEqual([measureCommand(hr, true).cmd, measureCommand(hr, true).key, measureCommand(hr, true).encode()], [6, 4, [1]]);
  assert.deepEqual(measureCommand(hr, false).encode(), [0]);
});

test('estatísticas', () => {
  assert.deepEqual(stats([70, 72, 74]), { n: 3, min: 70, max: 74, avg: 72, last: 74 });
  assert.equal(stats([]), null);
});

import { decodeBpHistory, decodeStressHistory, decodeSpo2History, decodeTempHistory, decodeHrvHistory } from '../measure.js';
const hx = (s) => Uint8Array.from(s.split(' ').map((b) => parseInt(b, 16)));

test('03/01 pressão real do TF37 Pro: 120/75 às 22:39', () => {
  const h = decodeBpHistory(hx('35 6c 00 01 00 01 3e b9 00 00 78 4b'));
  assert.equal(h.date, '2026-11-12');
  assert.deepEqual([h.records[0].time, h.records[0].sys, h.records[0].dia, h.records[0].text], ['22:39', 120, 75, '120/75']);
});

test('03/07 estresse real do TF37 Pro: 84 às 22:40 (registro de 3 bytes)', () => {
  const h = decodeStressHistory(hx('35 6c 00 01 05 50 54'));
  assert.deepEqual([h.records[0].time, h.records[0].value], ['22:40', 84]);
});

test('03/02, 03/03 e 03/32 seguem o registro de 8 bytes do app oficial', () => {
  assert.equal(decodeSpo2History(hx('35 6c 00 01 00 01 3e b9 00 00 00 62')).records[0].value, 98);
  assert.equal(decodeTempHistory(hx('35 6c 00 01 00 01 3e b9 00 00 24 05')).records[0].text, '36,5');
  assert.equal(decodeHrvHistory(hx('35 6c 00 01 00 01 3e b9 00 00 00 2a')).records[0].value, 42);
  assert.equal(decodeBpHistory(hx('35 6c 00 01 00 01 3e b9 00 00 10 05')).records.length, 0, 'valores fora da faixa são descartados');
});

import { classify, halfHourSlot } from '../measure.js';
test('classificação: estresse com as faixas do app oficial e referências das demais', () => {
  assert.deepEqual([29, 30, 60, 80].map((v) => classify('stress', { value: v }).label), ['relaxado', 'normal', 'médio', 'alto']);
  assert.equal(classify('bp', { sys: 128, dia: 70, value: 128 }).label, 'elevada');
  assert.equal(classify('bp', { sys: 111, dia: 69, value: 111 }).label, 'normal');
  assert.equal(classify('hr', { bpm: 87 }).tone, 'ok');
  assert.equal(classify('spo2', { value: 93 }).label, 'baixa');
  assert.equal(halfHourSlot(81593), 45); // 22:39
});
