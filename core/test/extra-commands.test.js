import test from 'node:test';
import assert from 'node:assert/strict';
import { EXTRA, date2, temp7 } from '../extra-commands.js';
import { COMMANDS } from '../commands.js';
import { buildPlan } from '../suite.js';

const enc = (id, p) => EXTRA[id].encode({ ...Object.fromEntries(EXTRA[id].params.map((x) => [x.name, typeof x.default === 'function' ? x.default() : x.default])), ...p });

test('data de 2 bytes e temperatura com sinal iguais ao CommandUtils', () => {
  assert.deepEqual(date2('2026-11-12'), [0x35, 0x6c]); // mesma data que o relógio manda em 03/00
  assert.equal(temp7(25), 89);
  assert.equal(temp7(-5), 5);
  assert.equal(temp7(0), 0);
});

test('perfil: sexo, idade, altura e peso empacotados em 4 bytes (setUserInfo)', () => {
  // masculino, 18 anos, 170 cm, 50 kg = valores padrão do app oficial
  assert.deepEqual(enc('setUserInfo', { sexo: 1, idade: 18, altura: 170, peso: 50 }), [0x92, 0x55, 0x06, 0x40]);
});

test('clima do dia: data, código, ar, temperaturas e cidade', () => {
  assert.deepEqual(enc('sendWeatherInfo', { data: '2026-11-12', codigo: 2, ar: 1, temp: 25, max: 29, min: -1, umidade: 60, cidade: 'SP' }),
    [0x35, 0x6c, 2, 1, 89, 93, 1, 0, 0, 60, 0x53, 0x50]);
});

test('remédio: cabeçalho 1, quantidade|máximo e horários', () => {
  assert.deepEqual(enc('settingMedicineReminder', { remedios: '1 127 08:30', maximo: 5 }), [1, 0x51, 0x81, 127, 8, 30]);
});

test('metas e textos', () => {
  assert.deepEqual(enc('setCalorieTarget', { kcal: 300 }), [0, 0x04, 0x93, 0xe0]);
  assert.deepEqual(enc('settingUserName', { nome: 'Ana' }), [3, 0x41, 0x6e, 0x61]);
  assert.deepEqual(enc('sendSosInfo', { nome: 'A', numero: '12' }), [1, 0x41, 2, 0x31, 0x32]);
});

test('todos os comandos não perigosos têm codificador e os pessoais ficam fora da suíte', () => {
  assert.deepEqual(COMMANDS.filter((c) => !c.implemented && c.risk !== 'perigoso').map((c) => c.id), []);
  const plan = buildPlan(COMMANDS, { includeConfig: true });
  const personal = plan.filter((x) => x.command.personal);
  assert.ok(personal.length >= 10);
  assert.ok(personal.every((x) => x.skip === 'pulado'));
});
