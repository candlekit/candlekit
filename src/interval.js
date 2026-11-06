/** How many milliseconds are in each interval unit. */
/** @type {Record<string, number>} */
const UNIT_MS = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

/** 1970-01-05 was a Monday. Weekly candles start on Mondays, like most exchanges. */
const FIRST_MONDAY_MS = 4 * UNIT_MS.d;

/**
 * @typedef {object} ParsedInterval
 * @property {number} ms Length of the interval in milliseconds.
 * @property {number} anchorMs The time that intervals are counted from.
 */

/**
 * Parses an interval such as `30s`, `5m`, `4h`, `1d`, or `1w`.
 *
 * @param {string} interval
 * @returns {ParsedInterval}
 */
export function parseInterval(interval) {
  const match = /^([1-9]\d*)([smhdw])$/.exec(interval);
  if (!match) {
    throw new Error(`Invalid interval "${interval}". Use a value like 30s, 5m, 4h, 1d, or 1w.`);
  }
  const unit = match[2];
  return {
    ms: Number(match[1]) * UNIT_MS[unit],
    anchorMs: unit === 'w' ? FIRST_MONDAY_MS : 0,
  };
}

/**
 * Returns the start time of the interval that contains `timestamp`.
 *
 * @param {number} timestamp
 * @param {ParsedInterval} interval
 * @returns {number}
 */
export function bucketStart(timestamp, { ms, anchorMs }) {
  return Math.floor((timestamp - anchorMs) / ms) * ms + anchorMs;
}
