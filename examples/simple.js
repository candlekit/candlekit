// The smallest sample: three trades go in, one candle comes out.
// Run it with: node examples/simple.js

import { toCandles } from 'candlekit';

const trades = [
  { timestamp: Date.parse('2026-01-01T09:01:00Z'), price: 100, amount: 1 },
  { timestamp: Date.parse('2026-01-01T09:02:00Z'), price: 120, amount: 2 },
  { timestamp: Date.parse('2026-01-01T09:04:00Z'), price: 110, amount: 3 },
];

const candles = toCandles(trades, { interval: '5m' });

console.log(candles);
