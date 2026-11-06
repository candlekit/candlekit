import { describe, expect, it } from 'vitest';
import { fillGaps, resample, toCandles } from '../src/index.js';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function candle(time, close, overrides = {}) {
  return { time, open: close, high: close, low: close, close, volume: 1, trades: 1, ...overrides };
}

describe('toCandles', () => {
  it('builds OHLCV candles from unsorted trades', () => {
    const trades = [
      { timestamp: MINUTE + 5, price: 105, amount: 1 },
      { timestamp: 30_000, price: 120, amount: 3 },
      { timestamp: 0, price: 100, amount: 2 },
      { timestamp: 59_999, price: 90, amount: 0.5 },
    ];

    expect(toCandles(trades, { interval: '1m' })).toEqual([
      { time: 0, open: 100, high: 120, low: 90, close: 90, volume: 5.5, trades: 3 },
      { time: MINUTE, open: 105, high: 105, low: 105, close: 105, volume: 1, trades: 1 },
    ]);
  });

  it('keeps input order for trades with the same timestamp', () => {
    const trades = [
      { timestamp: 10, price: 1, amount: 1 },
      { timestamp: 10, price: 2, amount: 1 },
      { timestamp: 10, price: 3, amount: 1 },
    ];

    const [result] = toCandles(trades, { interval: '1m' });
    expect(result).toMatchObject({ open: 1, close: 3 });
  });

  it('reads raw exchange payloads through field paths and numeric strings', () => {
    const trades = [{ T: 1_000, data: { p: '68120.50', q: '0.25' } }];
    const fields = { timestamp: 'T', price: 'data.p', amount: 'data.q' };

    const [result] = toCandles(trades, { interval: '1m', fields });
    expect(result).toMatchObject({ time: 0, open: 68120.5, volume: 0.25 });
  });

  it('orders candles by time', () => {
    const trades = [
      { timestamp: 2 * DAY, price: 3, amount: 1 },
      { timestamp: 5, price: 1, amount: 1 },
      { timestamp: DAY, price: 2, amount: 1 },
    ];

    const result = toCandles(trades, { interval: '1d' }).map((c) => c.time);
    expect(result).toEqual([0, DAY, 2 * DAY]);
  });

  it('starts weekly candles on Monday', () => {
    const wednesday = Date.UTC(2026, 10, 4, 12);
    const [result] = toCandles([{ timestamp: wednesday, price: 1, amount: 1 }], { interval: '1w' });
    expect(new Date(result.time).toISOString()).toBe('2026-11-02T00:00:00.000Z');
  });

  it('returns no candles for no trades', () => {
    expect(toCandles([], { interval: '1m' })).toEqual([]);
  });

  it.each([
    [{ timestamp: 1, price: 'abc', amount: 1 }, /Invalid price at trade 0/],
    [{ timestamp: 1, price: 0, amount: 1 }, /Invalid price/],
    [{ timestamp: 1, price: 1, amount: -1 }, /Invalid amount/],
    [{ timestamp: 1, price: 1, amount: '' }, /Invalid amount/],
    [{ price: 1, amount: 1 }, /Invalid timestamp/],
    [{ timestamp: -1, price: 1, amount: 1 }, /Invalid timestamp/],
    [{ timestamp: Number.NaN, price: 1, amount: 1 }, /Invalid timestamp/],
  ])('rejects the bad trade %j', (trade, message) => {
    expect(() => toCandles([trade], { interval: '1m' })).toThrow(message);
  });

  it.each(['', '0m', '1x', '1mo', '1.5h', '-1m'])('rejects the interval "%s"', (interval) => {
    expect(() => toCandles([], { interval })).toThrow(/Invalid interval/);
  });
});

describe('resample', () => {
  it('combines smaller candles into larger ones', () => {
    const candles = [
      candle(0, 10, { open: 9, high: 11, low: 8, volume: 2, trades: 3 }),
      candle(30 * MINUTE, 12, { open: 10, high: 15, low: 10, volume: 4, trades: 5 }),
      candle(HOUR, 13),
    ];

    expect(resample(candles, '1h')).toEqual([
      { time: 0, open: 9, high: 15, low: 8, close: 12, volume: 6, trades: 8 },
      candle(HOUR, 13),
    ]);
  });

  it('accepts candles in any order without changing the input', () => {
    const candles = [candle(30 * MINUTE, 2), candle(0, 1)];

    expect(resample(candles, '1h')[0]).toMatchObject({ open: 1, close: 2 });
    expect(candles[0].time).toBe(30 * MINUTE);
  });

  it('keeps later days in time order', () => {
    const times = resample([candle(2 * DAY, 3), candle(0, 1), candle(DAY, 2)], '1d');
    expect(times.map((c) => c.time)).toEqual([0, DAY, 2 * DAY]);
  });
});

describe('fillGaps', () => {
  it('fills missing intervals with the previous close', () => {
    const candles = [candle(0, 10), candle(3 * MINUTE, 20)];
    const flat = { open: 10, high: 10, low: 10, close: 10, volume: 0, trades: 0 };

    expect(fillGaps(candles, '1m')).toEqual([
      candle(0, 10),
      { time: MINUTE, ...flat },
      { time: 2 * MINUTE, ...flat },
      candle(3 * MINUTE, 20),
    ]);
  });

  it('returns no candles for no input', () => {
    expect(fillGaps([], '1m')).toEqual([]);
  });

  it('rejects candles that do not fit the interval', () => {
    expect(() => fillGaps([candle(0, 1), candle(90_000, 2)], '1m')).toThrow(/does not fit/);
  });
});
