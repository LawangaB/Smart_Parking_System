import { describe, it, expect } from 'vitest';
import { combineDateTime, resolveWindow, formatDuration, isFuture, withArrivalChange } from '../dates';

describe('combineDateTime', () => {
  it('joins a date and a time into a naive timestamp', () => {
    expect(combineDateTime('2030-06-15', '09:30')).toBe('2030-06-15T09:30:00');
  });
  it('returns null when either part is missing', () => {
    expect(combineDateTime('', '09:30')).toBeNull();
    expect(combineDateTime('2030-06-15', '')).toBeNull();
  });
});

describe('resolveWindow', () => {
  const now = new Date(2030, 5, 15, 10, 0, 0);

  it('accepts a valid future window', () => {
    const result = resolveWindow({ arriveDate: '2030-06-15', arriveTime: '11:00', leaveDate: '2030-06-15', leaveTime: '13:00' }, now);
    expect(result.error).toBeNull();
    expect(result.end - result.start).toBe(2 * 3_600_000);
  });

  it('flags a leaving time before arrival', () => {
    const result = resolveWindow({ arriveDate: '2030-06-15', arriveTime: '13:00', leaveDate: '2030-06-15', leaveTime: '11:00' }, now);
    expect(result.error).toMatch(/after arrival/);
  });

  it('flags an arrival time in the past', () => {
    const result = resolveWindow({ arriveDate: '2030-06-15', arriveTime: '08:00', leaveDate: '2030-06-15', leaveTime: '09:00' }, now);
    expect(result.error).toMatch(/passed/);
  });

  it('flags a stay longer than 30 days', () => {
    const result = resolveWindow({ arriveDate: '2030-06-16', arriveTime: '09:00', leaveDate: '2030-08-01', leaveTime: '09:00' }, now);
    expect(result.error).toMatch(/30 days/);
  });

  it('flags an arrival more than 90 days out', () => {
    const result = resolveWindow({ arriveDate: '2030-12-01', arriveTime: '09:00', leaveDate: '2030-12-01', leaveTime: '11:00' }, now);
    expect(result.error).toMatch(/90 days/);
  });
});

describe('formatDuration', () => {
  it('rounds a partial hour up, like the fee', () => {
    expect(formatDuration('2030-01-01T10:00:00', '2030-01-01T11:01:00')).toBe('2 hours');
  });
  it('mixes days and hours', () => {
    expect(formatDuration('2030-01-01T10:00:00', '2030-01-02T12:00:00')).toBe('1 day 2 hours');
  });
});

describe('isFuture', () => {
  it('tells past from future', () => {
    const now = new Date(2030, 0, 1, 12, 0, 0);
    expect(isFuture('2030-01-01T13:00:00', now)).toBe(true);
    expect(isFuture('2030-01-01T11:00:00', now)).toBe(false);
  });
});

describe('withArrivalChange', () => {
  it('keeps the length of stay when the arrival date moves', () => {
    const draft = { arriveDate: '2030-06-15', arriveTime: '10:00', leaveDate: '2030-06-15', leaveTime: '13:00' };
    const next = withArrivalChange(draft, { arriveDate: '2030-06-16' });
    expect(next.leaveDate).toBe('2030-06-16');
    expect(next.leaveTime).toBe('13:00');
  });
});
