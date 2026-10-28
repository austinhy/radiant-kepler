import { Candle, TechnicalSnapshot } from '../types/market';

export function calcEMA(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const result: number[] = new Array(values.length);
  result[0] = values[0];
  for (let i = 1; i < values.length; i++) {
    result[i] = values[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

export function calcSMA(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const result: number[] = new Array(values.length);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) {
      sum -= values[i - period];
      result[i] = sum / period;
    } else {
      result[i] = sum / (i + 1);
    }
  }
  return result;
}

export function calcRSI(closes: number[], period = 14): number[] {
  if (closes.length === 0) return [];
  const rsi: number[] = new Array(closes.length).fill(50);
  if (closes.length < 2) return rsi;

  let avgGain = 0;
  let avgLoss = 0;
  const initLen = Math.min(period, closes.length - 1);

  for (let i = 1; i <= initLen; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= initLen;
  avgLoss /= initLen;

  for (let i = 1; i < closes.length; i++) {
    if (i > initLen) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi[i] = 100 - 100 / (1 + rs);
    }
  }
  return rsi;
}

export function calcATR(candles: Candle[], period = 14): number[] {
  if (candles.length === 0) return [];
  const tr: number[] = new Array(candles.length);
  tr[0] = Math.max(candles[0].high - candles[0].low, candles[0].close * 0.004);

  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);
  }

  const atr: number[] = new Array(candles.length);
  atr[0] = tr[0];
  for (let i = 1; i < candles.length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }
  return atr;
}

export function computeTechnicalSnapshot(candles: Candle[]): TechnicalSnapshot {
  if (candles.length === 0) {
    return {
      ema9: 0,
      ema21: 0,
      ema50: 0,
      sma20: 0,
      rsi14: 50,
      stochRsi: 50,
      macd: { line: 0, signal: 0, histogram: 0, prevHistogram: 0 },
      bollinger: { upper: 0, middle: 0, lower: 0, widthPct: 0, percentB: 0.5 },
      atr14: 0,
      atrPct: 1,
      vwap: 0,
      support: 0,
      resistance: 0,
      volumeRatio: 1,
      buyPressurePct: 50,
      ema9Series: [],
      ema21Series: [],
      ema50Series: [],
      bbUpperSeries: [],
      bbLowerSeries: [],
      vwapSeries: [],
      rsiSeries: [],
      macdHistSeries: [],
    };
  }

  const closes = candles.map((c) => c.close);
  const lastIdx = candles.length - 1;
  const lastPrice = closes[lastIdx];

  const ema9Series = calcEMA(closes, 9);
  const ema21Series = calcEMA(closes, 21);
  const ema50Series = calcEMA(closes, 50);
  const sma20Series = calcSMA(closes, 20);
  const rsiSeries = calcRSI(closes, 14);
  const atrSeries = calcATR(candles, 14);

  // MACD (12, 26, 9)
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLineSeries = closes.map((_, i) => ema12[i] - ema26[i]);
  const macdSignalSeries = calcEMA(macdLineSeries, 9);
  const macdHistSeries = macdLineSeries.map((m, i) => m - macdSignalSeries[i]);

  // Bollinger Bands (20, 2)
  const bbUpperSeries: number[] = new Array(candles.length);
  const bbLowerSeries: number[] = new Array(candles.length);
  for (let i = 0; i < candles.length; i++) {
    const start = Math.max(0, i - 19);
    const slice = closes.slice(start, i + 1);
    const mean = sma20Series[i];
    const variance =
      slice.reduce((acc, val) => acc + (val - mean) * (val - mean), 0) /
      Math.max(1, slice.length);
    const stdDev = Math.sqrt(variance);
    bbUpperSeries[i] = mean + 2 * stdDev;
    bbLowerSeries[i] = mean - 2 * stdDev;
  }

  // Rolling 48-period VWAP
  const vwapSeries: number[] = new Array(candles.length);
  for (let i = 0; i < candles.length; i++) {
    const start = Math.max(0, i - 47);
    let pvSum = 0;
    let vSum = 0;
    for (let j = start; j <= i; j++) {
      const typical = (candles[j].high + candles[j].low + candles[j].close) / 3;
      const vol = Math.max(candles[j].volume, 0.0001);
      pvSum += typical * vol;
      vSum += vol;
    }
    vwapSeries[i] = vSum > 0 ? pvSum / vSum : closes[i];
  }

  // Stochastic RSI (14)
  const rsiSlice = rsiSeries.slice(Math.max(0, lastIdx - 13), lastIdx + 1);
  const minRsi = Math.min(...rsiSlice);
  const maxRsi = Math.max(...rsiSlice);
  const stochRsi =
    maxRsi - minRsi > 0.001
      ? ((rsiSeries[lastIdx] - minRsi) / (maxRsi - minRsi)) * 100
      : 50;

  // Support & Resistance from recent swing highs/lows (last 45 candles)
  const lookback = candles.slice(Math.max(0, candles.length - 45));
  const sortedLows = lookback
    .map((c) => c.low)
    .filter((l) => l < lastPrice)
    .sort((a, b) => b - a);
  const sortedHighs = lookback
    .map((c) => c.high)
    .filter((h) => h > lastPrice)
    .sort((a, b) => a - b);

  const atr14 = atrSeries[lastIdx] || lastPrice * 0.012;
  const support =
    sortedLows.length >= 2
      ? sortedLows[Math.min(2, sortedLows.length - 1)]
      : lastPrice - 1.5 * atr14;
  const resistance =
    sortedHighs.length >= 2
      ? sortedHighs[Math.min(2, sortedHighs.length - 1)]
      : lastPrice + 1.5 * atr14;

  // Volume Ratio & Buy Pressure over last 12 candles
  const recentVolSlice = candles.slice(Math.max(0, candles.length - 20));
  const avgVol =
    recentVolSlice.reduce((s, c) => s + c.volume, 0) /
    Math.max(1, recentVolSlice.length);
  const recent3Vol =
    candles
      .slice(Math.max(0, candles.length - 3))
      .reduce((s, c) => s + c.volume, 0) /
    Math.min(3, candles.length);
  const volumeRatio = avgVol > 0 ? recent3Vol / avgVol : 1;

  const pressureSlice = candles.slice(Math.max(0, candles.length - 12));
  let buyVol = 0;
  let totalVol = 0;
  for (const c of pressureSlice) {
    const range = Math.max(c.high - c.low, c.close * 0.0005);
    const closeLoc = Math.min(1, Math.max(0, (c.close - c.low) / range));
    const v = Math.max(c.volume, 1);
    buyVol += v * closeLoc;
    totalVol += v;
  }
  const buyPressurePct = totalVol > 0 ? (buyVol / totalVol) * 100 : 50;

  const bbUpper = bbUpperSeries[lastIdx];
  const bbLower = bbLowerSeries[lastIdx];
  const bbMid = sma20Series[lastIdx];
  const bbSpan = Math.max(bbUpper - bbLower, lastPrice * 0.001);

  return {
    ema9: ema9Series[lastIdx],
    ema21: ema21Series[lastIdx],
    ema50: ema50Series[lastIdx],
    sma20: bbMid,
    rsi14: rsiSeries[lastIdx],
    stochRsi,
    macd: {
      line: macdLineSeries[lastIdx],
      signal: macdSignalSeries[lastIdx],
      histogram: macdHistSeries[lastIdx],
      prevHistogram: macdHistSeries[Math.max(0, lastIdx - 1)],
    },
    bollinger: {
      upper: bbUpper,
      middle: bbMid,
      lower: bbLower,
      widthPct: (bbSpan / Math.max(bbMid, 0.0001)) * 100,
      percentB: (lastPrice - bbLower) / bbSpan,
    },
    atr14,
    atrPct: (atr14 / Math.max(lastPrice, 0.0001)) * 100,
    vwap: vwapSeries[lastIdx],
    support,
    resistance,
    volumeRatio,
    buyPressurePct,
    ema9Series,
    ema21Series,
    ema50Series,
    bbUpperSeries,
    bbLowerSeries,
    vwapSeries,
    rsiSeries,
    macdHistSeries,
  };
}
