import { describe, expect, it } from 'vitest';
import { ema, rsi, sma } from '../src/index.js';

describe('sma', () => {
  it('averages the last values', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });

  it('returns only nulls when there is not enough data', () => {
    expect(sma([1, 2], 3)).toEqual([null, null]);
  });
});

describe('ema', () => {
  it('starts from the SMA, then weights recent values more', () => {
    expect(ema([2, 4, 6, 8], 3)).toEqual([null, null, 4, 6]);
  });

  it('returns only nulls when there is not enough data', () => {
    expect(ema([1, 2], 3)).toEqual([null, null]);
  });
});

describe('rsi', () => {
  // The prices from the StockCharts RSI worked example, rounded to 2 decimals.
  const prices = [
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28,
    46.28, 46.0,
  ];

  it('returns null until it has one more value than the period', () => {
    const result = rsi(prices, 14);
    expect(result.slice(0, 14)).toEqual(new Array(14).fill(null));
    expect(result[14]).toBeGreaterThan(0);
  });

  it('is close to the published 14-period values', () => {
    const result = rsi(prices, 14);
    expect(Math.abs(result[14] - 70.53)).toBeLessThan(0.1);
    expect(Math.abs(result[15] - 66.32)).toBeLessThan(0.1);
  });

  it('matches a hand-calculated value', () => {
    // Gains 2 + 1 = 3 and losses 1 over 3 changes: 100 - 100 / (1 + 3) = 75.
    expect(rsi([10, 12, 11, 12], 3)[3]).toBeCloseTo(75);
  });

  it('applies Wilder smoothing after the first value', () => {
    // Next change is -2: gain (1 * 2 + 0) / 3, loss (1/3 * 2 + 2) / 3.
    const averageGain = 2 / 3;
    const averageLoss = (2 / 3 + 2) / 3;
    const expected = 100 - 100 / (1 + averageGain / averageLoss);
    expect(rsi([10, 12, 11, 12, 10], 3)[4]).toBeCloseTo(expected);
  });

  it('is 100 when prices only rise, 0 when they only fall, and 50 when flat', () => {
    expect(rsi([1, 2, 3, 4], 3)[3]).toBe(100);
    expect(rsi([4, 3, 2, 1], 3)[3]).toBe(0);
    expect(rsi([2, 2, 2, 2], 3)[3]).toBe(50);
  });

  it('returns only nulls when there is not enough data', () => {
    expect(rsi([1, 2, 3], 3)).toEqual([null, null, null]);
  });
});

describe('period validation', () => {
  it.each([0, -1, 1.5, Number.NaN])('rejects the period %s', (period) => {
    expect(() => sma([1], period)).toThrow(/Invalid period/);
    expect(() => ema([1], period)).toThrow(/Invalid period/);
    expect(() => rsi([1], period)).toThrow(/Invalid period/);
  });
});
