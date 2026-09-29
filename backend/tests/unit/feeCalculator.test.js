const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateFee } = require('../../src/utils/feeCalculator');

const at = (hour, minute = 0, day = 1) => new Date(2030, 0, day, hour, minute, 0);

test('bills whole hours at the hourly rate', () => {
  const result = calculateFee({ hourlyRate: 3 }, at(10), at(12));
  assert.deepEqual(result, { billableHours: 2, amount: 6 });
});

test('rounds partial hours up', () => {
  assert.equal(calculateFee({ hourlyRate: 3 }, at(10), at(12, 1)).billableHours, 3);
  assert.equal(calculateFee({ hourlyRate: 3 }, at(10), at(12, 1)).amount, 9);
});

test('bills at least one hour', () => {
  const result = calculateFee({ hourlyRate: 2.5 }, at(10), at(10, 10));
  assert.deepEqual(result, { billableHours: 1, amount: 2.5 });
});

test('caps the remainder of a day at the daily rate', () => {
  // 10 hours x 3 = 30, but the daily rate is only 20.
  const result = calculateFee({ hourlyRate: 3, dailyRate: 20 }, at(8), at(18));
  assert.equal(result.amount, 20);
});

test('charges full days at the daily rate plus a capped remainder', () => {
  // 2 days + 2 hours: 2 x 20 + 2 x 3 = 46
  const result = calculateFee({ hourlyRate: 3, dailyRate: 20 }, at(8, 0, 1), at(10, 0, 3));
  assert.deepEqual(result, { billableHours: 50, amount: 46 });
});

test('ignores a null daily rate', () => {
  const result = calculateFee({ hourlyRate: 3, dailyRate: null }, at(0), at(23));
  assert.equal(result.amount, 69);
});

test('handles decimal rates without floating point noise', () => {
  const result = calculateFee({ hourlyRate: '1.10' }, at(9), at(12));
  assert.equal(result.amount, 3.3);
});
