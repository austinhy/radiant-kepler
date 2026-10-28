import {
  CoinSymbol,
  FearGreedData,
  InternetCatalyst,
  PillarScore,
  PredictionSignal,
  SignalDirection,
  TechnicalSnapshot,
  Timeframe,
} from '../types/market';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function formatPrice(price: number): string {
  if (!Number.isFinite(price) || price === 0) return '$0.00';
  if (price >= 1000) {
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 1) {
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

export function generatePredictionSignal(params: {
  symbol: CoinSymbol;
  timeframe: Timeframe;
  currentPrice: number;
  tech: TechnicalSnapshot;
  catalysts: InternetCatalyst[];
  fearGreed: FearGreedData;
}): PredictionSignal {
  const { symbol, timeframe, currentPrice, tech, catalysts, fearGreed } = params;
  const price = currentPrice || tech.ema9 || 1;
  const atr = Math.max(tech.atr14, price * 0.006);

  // 1. PILLAR 1: Trend & EMA Structure (25%)
  let trendScore = 0;
  if (price > tech.ema9) trendScore += 22;
  else trendScore -= 22;

  if (tech.ema9 > tech.ema21) trendScore += 28;
  else trendScore -= 28;

  if (tech.ema21 > tech.ema50) trendScore += 26;
  else trendScore -= 26;

  if (price > tech.vwap) trendScore += 20;
  else trendScore -= 20;

  trendScore = clamp(Math.round(trendScore), -95, 95);
  const trendStatus =
    trendScore >= 18 ? 'BULLISH' : trendScore <= -18 ? 'BEARISH' : 'NEUTRAL';

  // 2. PILLAR 2: Momentum & Mean Reversion (20%)
  let momScore = 0;
  const rsi = tech.rsi14;
  // Good-faith RSI logic: strong momentum 53-67 is bullish, but >76 warns of overextension pullback
  if (rsi >= 52 && rsi <= 68) {
    momScore += 32;
  } else if (rsi > 68 && rsi <= 76) {
    momScore += 12;
  } else if (rsi > 76) {
    momScore -= 28; // Overbought exhaustion warning
  } else if (rsi <= 48 && rsi >= 33) {
    momScore -= 30;
  } else if (rsi < 27) {
    momScore += 28; // Oversold mean-reversion bounce setup
  }

  // MACD alignment
  if (tech.macd.histogram > 0 && tech.macd.histogram >= tech.macd.prevHistogram) {
    momScore += 38;
  } else if (tech.macd.histogram > 0) {
    momScore += 16;
  } else if (
    tech.macd.histogram < 0 &&
    tech.macd.histogram <= tech.macd.prevHistogram
  ) {
    momScore -= 38;
  } else {
    momScore -= 16;
  }

  momScore = clamp(Math.round(momScore), -95, 95);
  const momStatus =
    momScore >= 16 ? 'BULLISH' : momScore <= -16 ? 'BEARISH' : 'NEUTRAL';

  // 3. PILLAR 3: Volume & Orderflow Pressure (20%)
  let flowScore = (tech.buyPressurePct - 50) * 2.2;
  if (tech.volumeRatio > 1.25) {
    flowScore *= Math.min(1.45, tech.volumeRatio);
  }
  if (tech.bollinger.percentB > 0.92 && tech.volumeRatio > 1.3) {
    flowScore += 15; // High-volume breakout
  } else if (tech.bollinger.percentB < 0.08 && tech.volumeRatio > 1.3) {
    flowScore -= 15; // High-volume breakdown
  }
  flowScore = clamp(Math.round(flowScore), -95, 95);
  const flowStatus =
    flowScore >= 15 ? 'BULLISH' : flowScore <= -15 ? 'BEARISH' : 'NEUTRAL';

  // 4. PILLAR 4: Asset-Specific Internet & News Sentiment (20%)
  const coinCatalysts = catalysts.filter(
    (c) => c.affectedCoins.includes(symbol) || c.affectedCoins.includes('MARKET')
  );
  const directCoinCatalysts = catalysts.filter((c) =>
    c.affectedCoins.includes(symbol)
  );

  let newsScore = 0;
  if (coinCatalysts.length > 0) {
    let weightedSum = 0;
    let weightTotal = 0;
    for (const item of coinCatalysts.slice(0, 18)) {
      const isDirect = item.affectedCoins.includes(symbol);
      const impactMult =
        item.impactLevel === 'HIGH' ? 1.5 : item.impactLevel === 'MEDIUM' ? 1.0 : 0.6;
      const w = (isDirect ? 1.6 : 0.75) * impactMult;
      weightedSum += item.sentimentScore * w;
      weightTotal += w;
    }
    newsScore = weightTotal > 0 ? (weightedSum / weightTotal) * 1.35 : 0;
  }
  newsScore = clamp(Math.round(newsScore), -95, 95);
  const newsStatus =
    newsScore >= 14 ? 'BULLISH' : newsScore <= -14 ? 'BEARISH' : 'NEUTRAL';

  // 5. PILLAR 5: Macro Catalysts & Market Regime (15%)
  const macroCatalysts = catalysts.filter(
    (c) => c.category === 'macro-economy' || c.category === 'regulatory-etf'
  );
  let macroHeadlineAvg = 0;
  if (macroCatalysts.length > 0) {
    macroHeadlineAvg =
      macroCatalysts.reduce((acc, c) => acc + c.sentimentScore, 0) /
      macroCatalysts.length;
  }
  // Combine macro headlines with Fear & Greed (moderate greed 55-72 is constructive trend; extreme >84 is contrarian caution; extreme fear <20 is contrarian value)
  let fgContribution = 0;
  const fg = fearGreed.value;
  if (fg >= 52 && fg <= 74) fgContribution = 24;
  else if (fg > 82) fgContribution = -22; // Euphoria warning
  else if (fg < 22) fgContribution = 18; // Capitulation value zone
  else if (fg < 44) fgContribution = -20;

  const macroScore = clamp(
    Math.round(macroHeadlineAvg * 0.85 + fgContribution),
    -95,
    95
  );
  const macroStatus =
    macroScore >= 14 ? 'BULLISH' : macroScore <= -14 ? 'BEARISH' : 'NEUTRAL';

  const pillars: PillarScore[] = [
    {
      id: 'trend',
      name: 'Trend & EMA Structure',
      weight: 0.25,
      score: trendScore,
      status: trendStatus,
      metricText: `EMA9 ${tech.ema9 >= tech.ema21 ? '>' : '<'} EMA21 • Price ${
        price >= tech.vwap ? 'Above' : 'Below'
      } VWAP`,
      summary:
        trendScore > 20
          ? `Price (${formatPrice(price)}) holds above VWAP (${formatPrice(
              tech.vwap
            )}) with bullish EMA-9/21 alignment.`
          : trendScore < -20
          ? `Price trades below VWAP (${formatPrice(
              tech.vwap
            )}) and short-term EMA-9/21 resistance.`
          : `EMAs are tightly compressed near ${formatPrice(
              tech.ema21
            )}, signaling consolidation.`,
    },
    {
      id: 'momentum',
      name: 'Momentum & Oscillators',
      weight: 0.2,
      score: momScore,
      status: momStatus,
      metricText: `RSI-14: ${rsi.toFixed(1)} • StochRSI: ${tech.stochRsi.toFixed(0)}`,
      summary:
        rsi > 74
          ? `RSI (${rsi.toFixed(
              1
            )}) is overextended; chasing breakouts here carries pullback risk.`
          : rsi < 29
          ? `RSI (${rsi.toFixed(
              1
            )}) is deeply oversold, favoring a mean-reversion relief bounce.`
          : `RSI at ${rsi.toFixed(1)} with ${
              tech.macd.histogram >= 0 ? 'positive' : 'negative'
            } MACD histogram momentum.`,
    },
    {
      id: 'orderflow',
      name: 'Volume & Orderflow Delta',
      weight: 0.2,
      score: flowScore,
      status: flowStatus,
      metricText: `Buy Pressure: ${tech.buyPressurePct.toFixed(
        0
      )}% • Vol: ${tech.volumeRatio.toFixed(2)}x avg`,
      summary:
        tech.buyPressurePct >= 55
          ? `Buyers absorb ${tech.buyPressurePct.toFixed(
              0
            )}% of recent candle volume (${tech.volumeRatio.toFixed(2)}x relative volume).`
          : tech.buyPressurePct <= 45
          ? `Sellers dominate (${(100 - tech.buyPressurePct).toFixed(
              0
            )}% sell pressure) across recent bars.`
          : `Balanced two-way volume between buyers and sellers (${tech.buyPressurePct.toFixed(
              0
            )}% buy ratio).`,
    },
    {
      id: 'sentiment',
      name: 'Internet & News Catalysts',
      weight: 0.2,
      score: newsScore,
      status: newsStatus,
      metricText: `${directCoinCatalysts.length} ${symbol} mentions • ${coinCatalysts.length} total feeds`,
      summary:
        newsScore >= 15
          ? `Live internet & news feeds skew net bullish (+${newsScore}) for ${symbol}.`
          : newsScore <= -15
          ? `Headline & community sentiment skews net bearish (${newsScore}) for ${symbol}.`
          : `Internet news flow for ${symbol} is balanced/neutral (${newsScore}).`,
    },
    {
      id: 'macro',
      name: 'Macro & ETF Regime',
      weight: 0.15,
      score: macroScore,
      status: macroStatus,
      metricText: `Fear & Greed: ${fearGreed.value} (${fearGreed.classification})`,
      summary:
        macroScore >= 15
          ? `Macro & regulatory headlines are supportive alongside ${fearGreed.classification} (${fearGreed.value}) sentiment.`
          : macroScore <= -15
          ? `Macro headwinds or cautious market positioning (${fearGreed.classification}, ${fearGreed.value}) weigh on risk assets.`
          : `Macro backdrop is neutral with Fear & Greed at ${fearGreed.value} (${fearGreed.classification}).`,
    },
  ];

  // Weighted composite score (-100 to +100)
  const compositeRaw = pillars.reduce((sum, p) => sum + p.score * p.weight, 0);
  const compositeScore = clamp(Math.round(compositeRaw), -95, 95);

  // Measure agreement across pillars for Good-Faith Confidence Score
  const sign = compositeScore >= 0 ? 1 : -1;
  const alignedCount = pillars.filter((p) => p.score * sign > 10).length;
  const opposingCount = pillars.filter((p) => p.score * sign < -15).length;

  let confidence = Math.round(
    38 +
      Math.abs(compositeScore) * 0.52 +
      alignedCount * 6 -
      opposingCount * 9
  );
  confidence = clamp(confidence, 25, 91); // Never claim 100% certainty in good faith

  // Determine direction
  let direction: SignalDirection = 'NEUTRAL / WAIT';
  if (compositeScore >= 38 && opposingCount <= 1) {
    direction = 'STRONG LONG';
  } else if (compositeScore >= 15) {
    direction = 'MODERATE LONG';
  } else if (compositeScore <= -38 && opposingCount <= 1) {
    direction = 'STRONG SHORT';
  } else if (compositeScore <= -15) {
    direction = 'MODERATE SHORT';
  }

  // Market Regime classification
  let regime = 'Balanced Consolidation';
  if (tech.bollinger.widthPct < 1.8) {
    regime = 'Volatility Squeeze (Breakout Pending)';
  } else if (trendScore >= 40 && momScore >= 20) {
    regime = 'Bullish Impulse Trend';
  } else if (trendScore <= -40 && momScore <= -20) {
    regime = 'Bearish Distribution Trend';
  } else if (Math.abs(trendScore - newsScore) >= 65) {
    regime = 'Technical vs. News Divergence';
  } else if (tech.atrPct > 2.8) {
    regime = 'High-Volatility Expansion';
  }

  // Trade Levels (ATR-based & structure-aware)
  const isLong = compositeScore >= 0;
  const entrySpread = atr * 0.22;
  const entryZone: [number, number] = isLong
    ? [price - entrySpread, price + entrySpread * 0.5]
    : [price - entrySpread * 0.5, price + entrySpread];

  const rawStopDistance = atr * 1.35;
  const stopLoss = isLong
    ? Math.min(price - rawStopDistance, tech.support * 0.9985)
    : Math.max(price + rawStopDistance, tech.resistance * 1.0015);

  const actualRisk = Math.max(Math.abs(price - stopLoss), atr * 0.6);
  const takeProfit1 = isLong
    ? price + actualRisk * 1.65
    : Math.max(price * 0.1, price - actualRisk * 1.65);
  const takeProfit2 = isLong
    ? price + actualRisk * 2.75
    : Math.max(price * 0.05, price - actualRisk * 2.75);

  const reward1 = Math.abs(takeProfit1 - price);
  const riskRewardRatio = Number((reward1 / actualRisk).toFixed(2));
  const expectedMovePct = Number(
    (((takeProfit1 - price) / price) * 100).toFixed(2)
  );

  // Good-faith actionability check
  let actionable = Math.abs(compositeScore) >= 15 && confidence >= 54;
  let skipReason: string | undefined;

  if (Math.abs(compositeScore) < 15) {
    actionable = false;
    skipReason =
      'Composite edge is below threshold (|score| < 15). Sitting in cash preserves capital until technicals and news align.';
  } else if (opposingCount >= 2 && Math.abs(compositeScore) < 32) {
    actionable = false;
    skipReason =
      'Significant conflict between Technical Structure and Internet/Macro Sentiment. Wait for confirmation.';
  }

  // Build data-driven Bull & Bear Thesis bullets
  const bullThesis: string[] = [];
  const bearThesis: string[] = [];

  if (price >= tech.vwap) {
    bullThesis.push(
      `Price (${formatPrice(price)}) is holding above session VWAP (${formatPrice(
        tech.vwap
      )}), confirming institutional buyer support.`
    );
  } else {
    bearThesis.push(
      `Price (${formatPrice(price)}) remains capped below session VWAP (${formatPrice(
        tech.vwap
      )}), indicating overhead supply.`
    );
  }

  if (tech.ema9 > tech.ema21) {
    bullThesis.push(
      `Fast EMA-9 (${formatPrice(tech.ema9)}) leads EMA-21 (${formatPrice(
        tech.ema21
      )}) with nearest structural floor at ${formatPrice(tech.support)}.`
    );
  } else {
    bearThesis.push(
      `EMA-9 (${formatPrice(tech.ema9)}) trades below EMA-21 (${formatPrice(
        tech.ema21
      )}), keeping short-term trend pressure downward.`
    );
  }

  if (tech.buyPressurePct >= 52) {
    bullThesis.push(
      `Orderflow shows ${tech.buyPressurePct.toFixed(
        0
      )}% buyer absorption at ${tech.volumeRatio.toFixed(2)}x average volume.`
    );
  } else {
    bearThesis.push(
      `Orderflow shows ${(100 - tech.buyPressurePct).toFixed(
        0
      )}% seller dominance over the last 12 bars.`
    );
  }

  // Add top real-time internet headlines to Bull/Bear theses
  const topBullCatalyst = coinCatalysts.find((c) => c.sentimentScore >= 18);
  if (topBullCatalyst) {
    bullThesis.push(
      `Catalyst [${topBullCatalyst.source}]: "${topBullCatalyst.title.slice(
        0,
        92
      )}${topBullCatalyst.title.length > 92 ? '…' : ''}" (+${
        topBullCatalyst.sentimentScore
      } impact).`
    );
  }

  const topBearCatalyst = coinCatalysts.find((c) => c.sentimentScore <= -18);
  if (topBearCatalyst) {
    bearThesis.push(
      `Risk Catalyst [${topBearCatalyst.source}]: "${topBearCatalyst.title.slice(
        0,
        92
      )}${topBearCatalyst.title.length > 92 ? '…' : ''}" (${
        topBearCatalyst.sentimentScore
      } impact).`
    );
  }

  if (bullThesis.length < 2) {
    bullThesis.push(
      `Reclaiming resistance at ${formatPrice(
        tech.resistance
      )} opens volatility expansion toward ${formatPrice(
        price + atr * 2.2
      )}.`
    );
  }
  if (bearThesis.length < 2) {
    bearThesis.push(
      `Losing key swing support at ${formatPrice(
        tech.support
      )} invalidates upside structure and risks a flush to ${formatPrice(
        price - atr * 2.0
      )}.`
    );
  }

  const horizonMap: Record<Timeframe, string> = {
    '1m': 'Next 15–45 mins (Scalp)',
    '5m': 'Next 1–3 hours (Intraday)',
    '15m': 'Next 3–8 hours (Intraday Swing)',
    '1h': 'Next 12–36 hours (Day Swing)',
    '4h': 'Next 2–5 days (Multi-Day Swing)',
    '1d': 'Next 1–3 weeks (Position)',
  };

  const invalidationCondition = isLong
    ? `Hard invalidation if ${symbol} closes below ${formatPrice(
        stopLoss
      )} (1.35x ATR / below swing support ${formatPrice(tech.support)}).`
    : `Hard invalidation if ${symbol} breaks above ${formatPrice(
        stopLoss
      )} (above swing resistance ${formatPrice(tech.resistance)}).`;

  return {
    symbol,
    timeframe,
    generatedAt: Date.now(),
    currentPrice: price,
    direction,
    compositeScore,
    confidence,
    regime,
    actionable,
    skipReason,
    entryZone,
    stopLoss,
    takeProfit1,
    takeProfit2,
    riskRewardRatio,
    expectedMovePct,
    horizonText: horizonMap[timeframe],
    pillars,
    bullThesis: bullThesis.slice(0, 4),
    bearThesis: bearThesis.slice(0, 4),
    invalidationCondition,
    catalystsUsed: coinCatalysts.length,
  };
}
