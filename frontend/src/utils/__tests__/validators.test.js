import { describe, it, expect } from 'vitest';
import * as check from '../validators';

describe('email', () => {
  it('accepts a normal address and rejects malformed ones', () => {
    expect(check.email('a@b.com')).toBe('');
    expect(check.email('not-an-email')).not.toBe('');
    expect(check.email('')).not.toBe('');
  });
});

describe('password', () => {
  it('requires 8-72 characters with a letter and a number', () => {
    expect(check.password('Passw0rd')).toBe('');
    expect(check.password('short1')).not.toBe('');
    expect(check.password('alllettersnodigits')).not.toBe('');
    expect(check.password('12345678')).not.toBe('');
  });
});

describe('confirmPassword', () => {
  it('matches against the original', () => {
    expect(check.confirmPassword('abc12345', 'abc12345')).toBe('');
    expect(check.confirmPassword('different', 'abc12345')).not.toBe('');
  });
});

describe('registrationNumber', () => {
  it('accepts plate-like strings and rejects too-short ones', () => {
    expect(check.registrationNumber('CAB-1234')).toBe('');
    expect(check.registrationNumber('AB')).not.toBe('');
  });
});

describe('money', () => {
  it('rejects negative amounts and more than 2 decimal places', () => {
    expect(check.money('3.50', 'Rate')).toBe('');
    expect(check.money('-1', 'Rate')).not.toBe('');
    expect(check.money('3.999', 'Rate')).not.toBe('');
  });
});

describe('collectErrors', () => {
  it('keeps only the checks that failed', () => {
    const result = check.collectErrors({ email: '', password: 'Too short' });
    expect(result).toEqual({ password: 'Too short' });
  });
});
