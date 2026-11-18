import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMoney } from '../src/utils/formatMoney.ts';

test('formatMoney formats amounts to 3 decimal places in TND', () => {
  assert.equal(formatMoney(24.5), '24.500 TND');
  assert.equal(formatMoney(0), '0.000 TND');
  assert.equal(formatMoney(12.3456), '12.346 TND');
  assert.equal(formatMoney(5), '5.000 TND');
});

test('formatMoney handles null or undefined safely', () => {
  assert.equal(formatMoney(null), '0.000 TND');
  assert.equal(formatMoney(undefined), '0.000 TND');
  assert.equal(formatMoney(NaN), '0.000 TND');
});
