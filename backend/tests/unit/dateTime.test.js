const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDateTime, toSqlDateTime, sqlToIso, billableHours } = require('../../src/utils/dateTime');

test('parses naive local timestamps', () => {
  const date = parseDateTime('2030-06-15T09:30:00');
  assert.equal(date.getFullYear(), 2030);
  assert.equal(date.getMonth(), 5);
  assert.equal(date.getDate(), 15);
  assert.equal(date.getHours(), 9);
  assert.equal(date.getMinutes(), 30);
});

test('accepts a missing seconds part and a space separator', () => {
  assert.ok(parseDateTime('2030-06-15T09:30'));
  assert.ok(parseDateTime('2030-06-15 09:30:00'));
});

test('respects an explicit UTC offset', () => {
  const date = parseDateTime('2030-06-15T09:30:00Z');
  assert.equal(date.toISOString(), '2030-06-15T09:30:00.000Z');
});

test('rejects invalid values', () => {
  for (const value of ['', 'tomorrow', '2030-13-01T10:00:00', '2030-02-30T10:00:00', '2030-01-01T25:00:00', 12345, null, undefined]) {
    assert.equal(parseDateTime(value), null, `expected ${String(value)} to be rejected`);
  }
});

test('round-trips through the SQL format', () => {
  const date = parseDateTime('2030-06-15T09:05:07');
  assert.equal(toSqlDateTime(date), '2030-06-15 09:05:07');
  assert.equal(sqlToIso('2030-06-15 09:05:07'), '2030-06-15T09:05:07');
  assert.equal(sqlToIso(null), null);
});

test('billableHours rounds up and never returns less than one', () => {
  const start = new Date(2030, 0, 1, 10, 0, 0);
  assert.equal(billableHours(start, new Date(2030, 0, 1, 10, 5, 0)), 1);
  assert.equal(billableHours(start, new Date(2030, 0, 1, 11, 0, 0)), 1);
  assert.equal(billableHours(start, new Date(2030, 0, 1, 11, 1, 0)), 2);
});
