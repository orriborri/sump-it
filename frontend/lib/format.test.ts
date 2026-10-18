import { describe, expect, it } from 'vitest';
import { formatBrewTime, formatCoffeeRatio } from './format';

describe('formatCoffeeRatio', () => {
  it('formats a standard 1:16 ratio', () => {
    expect(formatCoffeeRatio(20, 320)).toBe('1:16.0');
  });

  it('rounds to a single decimal place', () => {
    expect(formatCoffeeRatio(18, 300)).toBe('1:16.7');
  });

  // Note: the `coffeeGrams <= 0` guard is intentionally excluded from the
  // coverage gate via `/* v8 ignore */` in format.ts, so it has no test here.
});

describe('formatBrewTime', () => {
  it('formats sub-minute durations with a zero minute', () => {
    expect(formatBrewTime(45)).toBe('0:45');
  });

  it('zero-pads the seconds component', () => {
    expect(formatBrewTime(185)).toBe('3:05');
  });

  it('formats exact minutes', () => {
    expect(formatBrewTime(120)).toBe('2:00');
  });
});
