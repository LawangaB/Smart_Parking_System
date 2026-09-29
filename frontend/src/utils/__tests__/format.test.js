import { describe, it, expect } from 'vitest';
import { vehicleTypeLabel, firstName, pluralize, slotPrefix } from '../format';

describe('vehicleTypeLabel', () => {
  it('maps known types and passes through unknown ones', () => {
    expect(vehicleTypeLabel('MOTORCYCLE')).toBe('Motorcycle');
    expect(vehicleTypeLabel('SPACESHIP')).toBe('SPACESHIP');
  });
});

describe('firstName', () => {
  it('takes the first word of a full name', () => {
    expect(firstName('Demo Customer')).toBe('Demo');
    expect(firstName('  Ana   Reyes')).toBe('Ana');
    expect(firstName('')).toBe('');
  });
});

describe('pluralize', () => {
  it('chooses singular or plural', () => {
    expect(pluralize(1, 'location')).toBe('1 location');
    expect(pluralize(2, 'location')).toBe('2 locations');
    expect(pluralize(0, 'bay', 'bays')).toBe('0 bays');
  });
});

describe('slotPrefix', () => {
  it('groups a slot number by its letters', () => {
    expect(slotPrefix('A07')).toBe('A');
    expect(slotPrefix('M01')).toBe('M');
    expect(slotPrefix('7')).toBe('#');
  });
});
