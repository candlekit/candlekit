# candlekit

Turn raw crypto trades into OHLCV candles, and calculate SMA, EMA, and RSI. Use it to build charts, trading bots, and backtests.

```bash
npm install candlekit
```

```js
import { toCandles, resample, fillGaps, sma, ema, rsi } from 'candlekit';

const trades = [
  { timestamp: 1767225600000, price: 68120.5, amount: 0.25 },
  { timestamp: 1767225630000, price: 68155.0, amount: 0.1 },
  { timestamp: 1767225665000, price: 68098.2, amount: 0.4 },
];

const candles = toCandles(trades, { interval: '1m' });
const closes = candles.map((candle) => candle.close);

const average = sma(closes, 20);
const momentum = rsi(closes, 14);
```

## Use exchange data directly

Most exchanges send prices as strings and use their own field names. Tell `toCandles` where to find each value, and it converts them for you. Nested paths such as `data.p` also work.

```js
const candles = toCandles(rawTrades, {
  interval: '5m',
  fields: { timestamp: 'T', price: 'p', amount: 'q' },
});
```

## Sample

[examples/binance.js](examples/binance.js) downloads real trades from Binance and turns them into candles and indicators. To run it from this repository:

```bash
npm install
npm run example
```

## API

### Candles

| Function | What it does |
| --- | --- |
| `toCandles(trades, { interval, fields? })` | Builds candles from trades in any order. Intervals with no trades are skipped. |
| `resample(candles, interval)` | Combines candles into a larger interval. The new interval must be a multiple of the original one. |
| `fillGaps(candles, interval)` | Adds a flat, zero-volume candle for each missing interval. |

Each candle looks like this:

```ts
{ time, open, high, low, close, volume, trades }
```

`time` is the start of the candle, as Unix time in milliseconds. Intervals use a number and a unit: `30s`, `5m`, `4h`, `1d`, or `1w`. Candles are in UTC, and weekly candles start on Monday.

### Indicators

| Function | What it does |
| --- | --- |
| `sma(values, period)` | Simple moving average |
| `ema(values, period)` | Exponential moving average, seeded with the first SMA |
| `rsi(values, period = 14)` | Relative Strength Index, using Wilder's smoothing |

Each function returns one result per input value, so results line up with your candles. Values are `null` until there is enough data.

## Limits

- Prices and volumes are JavaScript numbers. They suit charts and indicators, but not accounting, where small rounding differences matter.
- Monthly candles aren't supported, because months vary in length.
- The newest candle may still be incomplete if more trades are coming.

This package is a calculation tool, not financial advice.

## Author

Floyd J. Reagan ([floydreagan36@proton.me](mailto:floydreagan36@proton.me))

Repository: https://github.com/candlekit/candlekit

## License

MIT
