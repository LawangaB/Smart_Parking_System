const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWindow } = require('../../src/utils/timeWindow');

const now = new Date(2030, 0, 10, 12, 0, 0);

test('accepts a valid window', () => {
  const { start, end } = parseWindow('2030-01-10T13:00:00', '2030-01-10T15:00:00', { now });
  assert.equal(end - start, 2 * 3_600_000);
});

test('rejects an end that is not after the start', () => {
  assert.throws(() => parseWindow('2030-01-10T13:00:00', '2030-01-10T13:00:00', { now }), { statusCode: 422 });
  assert.throws(() => parseWindow('2030-01-10T15:00:00', '2030-01-10T13:00:00', { now }), { statusCode: 422 });
});

test('rejects unparseable dates', () => {
  assert.throws(() => parseWindow('nope', '2030-01-10T13:00:00', { now }), { statusCode: 422 });
  assert.throws(() => parseWindow('2030-01-10T13:00:00', 'nope', { now }), { statusCode: 422 });
});

test('requireFuture rejects the past but allows a few minutes of grace', () => {
  assert.throws(
    () => parseWindow('2030-01-10T10:00:00', '2030-01-10T14:00:00', { now, requireFuture: true }),
    { statusCode: 422 },
  );
  assert.ok(parseWindow('2030-01-10T11:57:00', '2030-01-10T14:00:00', { now, requireFuture: true }));
});

test('enforceLimits caps the duration at 30 days', () => {
  assert.ok(parseWindow('2030-01-11T00:00:00', '2030-02-10T00:00:00', { now, enforceLimits: true }));
  assert.throws(
    () => parseWindow('2030-01-11T00:00:00', '2030-02-10T00:01:00', { now, enforceLimits: true }),
    { statusCode: 422 },
  );
});

test('enforceLimits caps advance booking at 90 days', () => {
  assert.throws(
    () => parseWindow('2030-06-01T00:00:00', '2030-06-01T02:00:00', { now, enforceLimits: true }),
    { statusCode: 422 },
  );
});
