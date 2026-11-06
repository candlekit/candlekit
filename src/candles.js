// Why each lodash function is used:
// get     - reads nested paths like 'data.p' without crashing if a level is missing
// groupBy - puts trades or candles into one group per time period
// keyBy   - finds a candle by its time without searching the whole list
// last    - gets the last item of a group, which gives the closing price
// maxBy   - finds the highest price in a group, even with very large groups
// minBy   - finds the lowest price in a group, even with very large groups
// range   - makes the list of times that fillGaps must cover
// sortBy  - sorts without changing the input, and keeps equal times in their original order
// sumBy   - adds up volume and trade counts
import get from 'lodash/get.js';
import groupBy from 'lodash/groupBy.js';
import keyBy from 'lodash/keyBy.js';
import last from 'lodash/last.js';
import maxBy from 'lodash/maxBy.js';
import minBy from 'lodash/minBy.js';
import range from 'lodash/range.js';
import sortBy from 'lodash/sortBy.js';
import sumBy from 'lodash/sumBy.js';
import { bucketStart, parseInterval } from './interval.js';

/**
 * @typedef {object} Trade
 * @property {number} timestamp Unix time in milliseconds.
 * @property {number} price
 * @property {number} amount
 */

/**
 * @typedef {object} Candle
 * @property {number} time Start of the candle, as Unix time in milliseconds.
 * @property {number} open
 * @property {number} high
 * @property {number} low
 * @property {number} close
 * @property {number} volume
 * @property {number} trades Number of trades in the candle.
 */

/**
 * Paths to read from each raw trade. Nested paths like `data.p` work too.
 *
 * @typedef {object} TradeFields
 * @property {string} [timestamp]
 * @property {string} [price]
 * @property {string} [amount]
 */

/**
 * @typedef {object} ToCandlesOptions
 * @property {string} interval
 * @property {TradeFields} [fields]
 */

/**
 * Reads one number from a raw trade. Exchanges often send numbers as strings.
 *
 * @param {unknown} raw
 * @param {string} path
 * @param {'timestamp' | 'price' | 'amount'} field
 * @param {number} index
 * @returns {number}
 */
function readNumber(raw, path, field, index) {
  const value = get(raw, path);
  const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  const minimum = field === 'price' ? Number.MIN_VALUE : 0;
  if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed < minimum) {
    throw new Error(`Invalid ${field} at trade ${index}: ${String(value)}`);
  }
  return parsed;
}

/**
 * @param {unknown} raw
 * @param {number} index
 * @param {TradeFields} fields
 * @returns {Trade}
 */
function readTrade(raw, index, fields) {
  return {
    timestamp: readNumber(raw, fields.timestamp ?? 'timestamp', 'timestamp', index),
    price: readNumber(raw, fields.price ?? 'price', 'price', index),
    amount: readNumber(raw, fields.amount ?? 'amount', 'amount', index),
  };
}

/**
 * Sorts items by time, then splits them into one group per time period.
 *
 * @template T
 * @param {readonly T[]} items
 * @param {import('./interval.js').ParsedInterval} interval
 * @param {(item: T) => number} timeOf
 * @returns {T[][]}
 */
function bucketsOf(items, interval, timeOf) {
  const sorted = sortBy(items, timeOf);
  return Object.values(groupBy(sorted, (item) => bucketStart(timeOf(item), interval)));
}

/**
 * Builds candles from raw trades. Trades can be in any order. Trades with the
 * same timestamp keep their input order. Intervals with no trades are skipped;
 * use `fillGaps` to add them.
 *
 * @param {readonly unknown[]} trades
 * @param {ToCandlesOptions} options
 * @returns {Candle[]}
 */
export function toCandles(trades, options) {
  const interval = parseInterval(options.interval);
  const parsed = trades.map((trade, index) => readTrade(trade, index, options.fields ?? {}));

  const candles = bucketsOf(parsed, interval, (trade) => trade.timestamp).map((bucket) => ({
    time: bucketStart(bucket[0].timestamp, interval),
    open: bucket[0].price,
    high: maxBy(bucket, 'price').price,
    low: minBy(bucket, 'price').price,
    close: last(bucket).price,
    volume: sumBy(bucket, 'amount'),
    trades: bucket.length,
  }));
  return sortBy(candles, 'time');
}

/**
 * Combines candles into a larger interval, such as `1m` into `1h`. The new
 * interval must be a multiple of the original one.
 *
 * @param {readonly Candle[]} candles
 * @param {string} interval
 * @returns {Candle[]}
 */
export function resample(candles, interval) {
  const target = parseInterval(interval);

  const resampled = bucketsOf(candles, target, (candle) => candle.time).map((bucket) => ({
    time: bucketStart(bucket[0].time, target),
    open: bucket[0].open,
    high: maxBy(bucket, 'high').high,
    low: minBy(bucket, 'low').low,
    close: last(bucket).close,
    volume: sumBy(bucket, 'volume'),
    trades: sumBy(bucket, 'trades'),
  }));
  return sortBy(resampled, 'time');
}

/**
 * Adds a flat candle for every interval with no trades. Each one repeats the
 * previous close and has zero volume.
 *
 * @param {readonly Candle[]} candles
 * @param {string} interval
 * @returns {Candle[]}
 */
export function fillGaps(candles, interval) {
  const { ms } = parseInterval(interval);
  const sorted = sortBy(candles, 'time');
  if (sorted.length === 0) return [];

  const first = sorted[0];
  const misaligned = sorted.find((candle) => (candle.time - first.time) % ms !== 0);
  if (misaligned) {
    throw new Error(`Candle at ${misaligned.time} does not fit the ${interval} interval.`);
  }

  const byTime = keyBy(sorted, 'time');
  let previous = first;
  return range(first.time, last(sorted).time + ms, ms).map((time) => {
    const candle = byTime[time];
    if (candle) {
      previous = candle;
      return candle;
    }
    const { close } = previous;
    return { time, open: close, high: close, low: close, close, volume: 0, trades: 0 };
  });
}
