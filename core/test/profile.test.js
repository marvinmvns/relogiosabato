import test from 'node:test';
import assert from 'node:assert/strict';
import { ageFrom, bmi, stride } from '../ui/profile.js';

test('idade, IMC e passada estimada', () => {
  assert.equal(ageFrom('1990-11-14', new Date(2026, 10, 13)), 35);
  assert.equal(ageFrom('1990-11-13', new Date(2026, 10, 13)), 36);
  assert.deepEqual(bmi(170, 70), { value: 24.2, label: 'peso adequado' });
  assert.equal(bmi(170, 80).label, 'sobrepeso');
  assert.equal(bmi(170, 90).label, 'obesidade');
  assert.equal(stride(170, '1'), 0.71);
  assert.equal(bmi('', 70), null);
});
