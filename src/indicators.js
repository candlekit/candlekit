// Why each lodash function is used:
// mean  - calculates an average
// range - makes the list of positions to loop over
import mean from 'lodash/mean.js';
import range from 'lodash/range.js';

/**
 * One result per input value. Values are `null` until there is enough data.
 *
 * @typedef {(number | null)[]} IndicatorValues
 */

/** @param {number} period */
function assertPeriod(period) {
  if (!Number.isInteger(period) || period < 1) {
    throw new Error(`Invalid period: ${period}. Use a whole number of 1 or more.`);
  }
}

/**
 * Simple moving average.
 *
 * @param {readonly number[]} values
 * @param {number} period
 * @returns {IndicatorValues}
 */
export function sma(values, period) {
  assertPeriod(period);
  return values.map((_, index) =>
    index + 1 < period ? null : mean(values.slice(index + 1 - period, index + 1)),
  );
}

/**
 * Exponential moving average, seeded with the SMA of the first `period` values.
 *
 * @param {readonly number[]} values
 * @param {number} period
 * @returns {IndicatorValues}
 */
export function ema(values, period) {
  assertPeriod(period);
  const weight = 2 / (period + 1);
  const result = new Array(values.length).fill(null);
  if (values.length < period) return result;

  let current = mean(values.slice(0, period));
  result[period - 1] = current;
  for (const index of range(period, values.length)) {
    current = values[index] * weight + current * (1 - weight);
    result[index] = current;
  }
  return result;
}

/**
 * @param {number} averageGain
 * @param {number} averageLoss
 * @returns {number}
 */
function toRsi(averageGain, averageLoss) {
  if (averageLoss === 0) return averageGain === 0 ? 50 : 100;
  return 100 - 100 / (1 + averageGain / averageLoss);
}

/**
 * Relative Strength Index, using Wilder's smoothing. The usual period is 14.
 *
 * @param {readonly number[]} values
 * @param {number} [period]
 * @returns {IndicatorValues}
 */
export function rsi(values, period = 14) {
  assertPeriod(period);
  const result = new Array(values.length).fill(null);
  if (values.length <= period) return result;

  const changes = range(1, values.length).map((index) => values[index] - values[index - 1]);
  const firstChanges = changes.slice(0, period);
  let averageGain = mean(firstChanges.map((change) => Math.max(change, 0)));
  let averageLoss = mean(firstChanges.map((change) => Math.max(-change, 0)));
  result[period] = toRsi(averageGain, averageLoss);

  for (const index of range(period, changes.length)) {
    const change = changes[index];
    averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
    result[index + 1] = toRsi(averageGain, averageLoss);
  }
  return result;
}
