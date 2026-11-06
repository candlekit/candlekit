// Sample: build 5-minute candles from real Binance trades, then calculate indicators.
// Run it with: npm run example

import { ema, fillGaps, resample, rsi, sma, toCandles } from 'candlekit';

const SYMBOL = 'LINKBTC';
const TRADES_URL = `https://data-api.binance.vision/api/v3/aggTrades?symbol=${SYMBOL}&limit=1000`;

// Step 1: download the latest trades.
const response = await fetch(TRADES_URL);
if (!response.ok) {
  throw new Error(`Binance returned status ${response.status}`);
}
const rawTrades = await response.json();
console.log(`Downloaded ${rawTrades.length} ${SYMBOL} trades. First trade:`, rawTrades[0]);

// Step 2: turn the trades into 5-minute candles.
// Binance calls the time "T", the price "p", and the amount "q".
const candles = toCandles(rawTrades, {
  interval: '5m',
  fields: { timestamp: 'T', price: 'p', amount: 'q' },
});

// Step 3: add flat candles for any 5-minute periods with no trades.
const fullCandles = fillGaps(candles, '5m');

// Step 4: calculate indicators from the closing prices.
const closes = fullCandles.map((candle) => candle.close);
const sma10 = sma(closes, 10);
const ema10 = ema(closes, 10);
const rsi14 = rsi(closes, 14);

// Step 5: show the newest 10 candles as a table.
// Indicators are null until there is enough data, so show "-" for those.
const format = (value, digits) => (value === null ? '-' : value.toFixed(digits));

const rows = fullCandles.map((candle, index) => ({
  time: new Date(candle.time).toISOString().slice(11, 16),
  open: candle.open.toFixed(7),
  high: candle.high.toFixed(7),
  low: candle.low.toFixed(7),
  close: candle.close.toFixed(7),
  volume: candle.volume.toFixed(2),
  sma10: format(sma10[index], 7),
  ema10: format(ema10[index], 7),
  rsi14: format(rsi14[index], 1),
}));

console.log(`\nNewest 10 of ${fullCandles.length} 5-minute candles (UTC):`);
console.table(rows.slice(-10));

// Step 6: combine the same candles into 1-hour candles.
const hourlyCandles = resample(fullCandles, '1h');
console.log(`\nThe same trades as ${hourlyCandles.length} 1-hour candles:`);
console.table(
  hourlyCandles.map((candle) => ({
    time: new Date(candle.time).toISOString().slice(11, 16),
    open: candle.open.toFixed(7),
    close: candle.close.toFixed(7),
    volume: candle.volume.toFixed(2),
    trades: candle.trades,
  })),
);
