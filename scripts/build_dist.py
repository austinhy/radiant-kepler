#!/usr/bin/env python3
"""
Builds dist/index.html and bundles it into RadiantKepler.app/Contents/Resources/dist/index.html
Powered by TradingView's Lightweight Charts for institutional-grade, buttery-smooth 120fps charting.
"""
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS_PATH = os.path.join(ROOT, "src", "styles.css")
LC_PATH = os.path.join(ROOT, "vendor", "lightweight-charts.standalone.js")
DIST_DIR = os.path.join(ROOT, "dist")
APP_RES_DIST = os.path.join(ROOT, "RadiantKepler.app", "Contents", "Resources", "dist")

with open(CSS_PATH, "r", encoding="utf-8") as f:
    styles_css = f.read()

with open(LC_PATH, "r", encoding="utf-8") as f:
    lc_standalone_js = f.read()

APP_JS = r"""
(function () {
  'use strict';

  // --- 1. COIN METADATA & LEXICON ---
  const COINS = [
    { symbol: 'BTC', name: 'Bitcoin', coinbaseProduct: 'BTC-USD', binanceSymbol: 'BTCUSDT', color: '#F7931A', keywords: ['bitcoin', 'btc', 'satoshi', 'ibit', 'fbtc', 'halving', 'saylor', 'microstrategy'] },
    { symbol: 'ETH', name: 'Ethereum', coinbaseProduct: 'ETH-USD', binanceSymbol: 'ETHUSDT', color: '#627EEA', keywords: ['ethereum', 'eth', 'ether', 'vitalik', 'pectra', 'layer-2', 'l2', 'etha'] },
    { symbol: 'SOL', name: 'Solana', coinbaseProduct: 'SOL-USD', binanceSymbol: 'SOLUSDT', color: '#14F195', keywords: ['solana', 'sol', 'firedancer', 'jupiter', 'raydium'] },
    { symbol: 'XRP', name: 'XRP', coinbaseProduct: 'XRP-USD', binanceSymbol: 'XRPUSDT', color: '#00AAE4', keywords: ['xrp', 'ripple', 'rlusd', 'garlinghouse'] },
    { symbol: 'BNB', name: 'BNB', coinbaseProduct: 'BNB-USD', binanceSymbol: 'BNBUSDT', color: '#F3BA2F', keywords: ['bnb', 'binance chain', 'bsc', 'launchpad'] },
    { symbol: 'DOGE', name: 'Dogecoin', coinbaseProduct: 'DOGE-USD', binanceSymbol: 'DOGEUSDT', color: '#C2A633', keywords: ['dogecoin', 'doge', 'elon'] },
    { symbol: 'AVAX', name: 'Avalanche', coinbaseProduct: 'AVAX-USD', binanceSymbol: 'AVAXUSDT', color: '#E84142', keywords: ['avalanche', 'avax'] },
    { symbol: 'LINK', name: 'Chainlink', coinbaseProduct: 'LINK-USD', binanceSymbol: 'LINKUSDT', color: '#2A5ADA', keywords: ['chainlink', 'link', 'ccip', 'oracle', 'swift'] },
    { symbol: 'SUI', name: 'Sui', coinbaseProduct: 'SUI-USD', binanceSymbol: 'SUIUSDT', color: '#4DA2FF', keywords: ['sui', 'mysten'] },
    { symbol: 'ADA', name: 'Cardano', coinbaseProduct: 'ADA-USD', binanceSymbol: 'ADAUSDT', color: '#3CC8C8', keywords: ['cardano', 'ada', 'hoskinson'] }
  ];

  const DEFAULT_BASE_PRICES = {
    BTC: 91450, ETH: 3180, SOL: 194.5, XRP: 1.48, BNB: 645,
    DOGE: 0.285, AVAX: 32.4, LINK: 18.6, SUI: 3.35, ADA: 0.78
  };

  const BULLISH_LEXICON = [
    ['etf inflow', 46], ['record inflow', 52], ['net inflow', 38], ['inflows', 28],
    ['rate cut', 44], ['dovish', 36], ['inflation cools', 40], ['lower inflation', 35],
    ['sec approves', 55], ['approval', 32], ['approved', 34], ['institutional buying', 45],
    ['accumulating', 30], ['accumulation', 30], ['all-time high', 42], ['ath', 30],
    ['breakout', 32], ['surges', 30], ['soars', 34], ['rallies', 28], ['rally', 24],
    ['bullish', 30], ['short squeeze', 40], ['strategic reserve', 48], ['treasury reserve', 42],
    ['partnership', 25], ['adoption', 28], ['upgrade', 22], ['mainnet', 25],
    ['whale bought', 34], ['whales buy', 34], ['exchange outflow', 32], ['supply shock', 36],
    ['outperform', 24], ['rebound', 22], ['recovery', 20], ['gains', 18], ['jumps', 24],
    ['dismisses lawsuit', 50], ['drops charges', 48]
  ];

  const BEARISH_LEXICON = [
    ['hack', -55], ['hacked', -58], ['exploit', -54], ['drained', -55],
    ['sec lawsuit', -48], ['sued', -40], ['subpoena', -42], ['etf outflow', -45],
    ['record outflow', -52], ['net outflow', -38], ['outflows', -28], ['rate hike', -46],
    ['hawkish', -38], ['hot inflation', -40], ['sticky inflation', -34], ['liquidated', -38],
    ['liquidations', -34], ['bankruptcy', -56], ['insolvent', -55], ['halted withdrawals', -58],
    ['delist', -44], ['ban', -42], ['crackdown', -38], ['plunges', -36], ['crashes', -45],
    ['slumps', -30], ['dumps', -34], ['tumbles', -30], ['bearish', -30], ['sell-off', -34],
    ['selloff', -34], ['capitulation', -36], ['recession', -38], ['tariff', -28],
    ['sanctions', -26], ['rejected', -36], ['delays decision', -25], ['whale dumped', -36],
    ['drops', -20], ['falls', -18], ['declines', -18], ['fear', -20]
  ];

  const NEGATIONS = ['no ', 'not ', 'never ', 'denies ', 'denied ', 'without ', 'unlikely '];

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function formatPrice(price) {
    if (!Number.isFinite(price) || price === 0) return '$0.00';
    if (price >= 1000) return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --- 2. NATIVE BRIDGE & INTERNET / MARKET FETCHING ---
  window.__RK_NATIVE_CALLBACKS__ = window.__RK_NATIVE_CALLBACKS__ || {};

  function nativeLog(msg) {
    try {
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeBridge) {
        window.webkit.messageHandlers.nativeBridge.postMessage({
          action: 'log',
          message: String(msg)
        });
      }
    } catch (e) {}
  }

  window.onerror = function (msg, src, line, col, err) {
    nativeLog('WINDOW_ERROR: ' + msg + ' at ' + line + ':' + col + ' ' + (err && err.stack ? err.stack : ''));
  };

  async function nativeFetchText(url) {
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.nativeBridge) {
      const reqId = 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (window.__RK_NATIVE_CALLBACKS__[reqId]) {
            delete window.__RK_NATIVE_CALLBACKS__[reqId];
            reject(new Error('Timeout: ' + url));
          }
        }, 9000);
        window.__RK_NATIVE_CALLBACKS__[reqId] = {
          resolve: (body) => { clearTimeout(timer); resolve(body); },
          reject: (err) => { clearTimeout(timer); reject(err); }
        };
        window.webkit.messageHandlers.nativeBridge.postMessage({
          id: reqId,
          action: 'fetch_url',
          url: url
        });
      });
    }
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.text();
  }

  // --- 3. TECHNICAL INDICATORS ENGINE ---
  function calcEMA(values, period) {
    if (!values.length) return [];
    const k = 2 / (period + 1);
    const res = new Array(values.length);
    res[0] = values[0];
    for (let i = 1; i < values.length; i++) {
      res[i] = values[i] * k + res[i - 1] * (1 - k);
    }
    return res;
  }

  function calcSMA(values, period) {
    if (!values.length) return [];
    const res = new Array(values.length);
    let sum = 0;
    for (let i = 0; i < values.length; i++) {
      sum += values[i];
      if (i >= period) {
        sum -= values[i - period];
        res[i] = sum / period;
      } else {
        res[i] = sum / (i + 1);
      }
    }
    return res;
  }

  function calcRSI(closes, period) {
    period = period || 14;
    if (!closes.length) return [];
    const rsi = new Array(closes.length).fill(50);
    if (closes.length < 2) return rsi;
    let avgGain = 0, avgLoss = 0;
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
      rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    }
    return rsi;
  }

  function calcATR(candles, period) {
    period = period || 14;
    if (!candles.length) return [];
    const tr = new Array(candles.length);
    tr[0] = Math.max(candles[0].high - candles[0].low, candles[0].close * 0.004);
    for (let i = 1; i < candles.length; i++) {
      const hl = candles[i].high - candles[i].low;
      const hc = Math.abs(candles[i].high - candles[i - 1].close);
      const lc = Math.abs(candles[i].low - candles[i - 1].close);
      tr[i] = Math.max(hl, hc, lc);
    }
    const atr = new Array(candles.length);
    atr[0] = tr[0];
    for (let i = 1; i < candles.length; i++) {
      atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
    }
    return atr;
  }

  function computeTechnicalSnapshot(candles) {
    if (!candles || !candles.length) return null;
    const closes = candles.map(c => c.close);
    const lastIdx = candles.length - 1;
    const lastPrice = closes[lastIdx];

    const ema9Series = calcEMA(closes, 9);
    const ema21Series = calcEMA(closes, 21);
    const ema50Series = calcEMA(closes, 50);
    const sma20Series = calcSMA(closes, 20);
    const rsiSeries = calcRSI(closes, 14);
    const atrSeries = calcATR(candles, 14);

    const ema12 = calcEMA(closes, 12);
    const ema26 = calcEMA(closes, 26);
    const macdLineSeries = closes.map((_, i) => ema12[i] - ema26[i]);
    const macdSignalSeries = calcEMA(macdLineSeries, 9);
    const macdHistSeries = macdLineSeries.map((m, i) => m - macdSignalSeries[i]);

    const bbUpperSeries = new Array(candles.length);
    const bbLowerSeries = new Array(candles.length);
    for (let i = 0; i < candles.length; i++) {
      const start = Math.max(0, i - 19);
      const slice = closes.slice(start, i + 1);
      const mean = sma20Series[i];
      const variance = slice.reduce((acc, val) => acc + (val - mean) * (val - mean), 0) / Math.max(1, slice.length);
      const stdDev = Math.sqrt(variance);
      bbUpperSeries[i] = mean + 2 * stdDev;
      bbLowerSeries[i] = mean - 2 * stdDev;
    }

    const vwapSeries = new Array(candles.length);
    for (let i = 0; i < candles.length; i++) {
      const start = Math.max(0, i - 47);
      let pvSum = 0, vSum = 0;
      for (let j = start; j <= i; j++) {
        const typ = (candles[j].high + candles[j].low + candles[j].close) / 3;
        const vol = Math.max(candles[j].volume, 0.0001);
        pvSum += typ * vol;
        vSum += vol;
      }
      vwapSeries[i] = vSum > 0 ? pvSum / vSum : closes[i];
    }

    const rsiSlice = rsiSeries.slice(Math.max(0, lastIdx - 13), lastIdx + 1);
    const minRsi = Math.min.apply(null, rsiSlice);
    const maxRsi = Math.max.apply(null, rsiSlice);
    const stochRsi = (maxRsi - minRsi) > 0.001 ? ((rsiSeries[lastIdx] - minRsi) / (maxRsi - minRsi)) * 100 : 50;

    const lookback = candles.slice(Math.max(0, candles.length - 45));
    const sortedLows = lookback.map(c => c.low).filter(l => l < lastPrice).sort((a, b) => b - a);
    const sortedHighs = lookback.map(c => c.high).filter(h => h > lastPrice).sort((a, b) => a - b);

    const atr14 = atrSeries[lastIdx] || lastPrice * 0.012;
    const support = sortedLows.length >= 2 ? sortedLows[Math.min(2, sortedLows.length - 1)] : lastPrice - 1.5 * atr14;
    const resistance = sortedHighs.length >= 2 ? sortedHighs[Math.min(2, sortedHighs.length - 1)] : lastPrice + 1.5 * atr14;

    const recentVolSlice = candles.slice(Math.max(0, candles.length - 20));
    const avgVol = recentVolSlice.reduce((s, c) => s + c.volume, 0) / Math.max(1, recentVolSlice.length);
    const recent3Vol = candles.slice(Math.max(0, candles.length - 3)).reduce((s, c) => s + c.volume, 0) / Math.min(3, candles.length);
    const volumeRatio = avgVol > 0 ? recent3Vol / avgVol : 1;

    const pressureSlice = candles.slice(Math.max(0, candles.length - 12));
    let buyVol = 0, totalVol = 0;
    for (let k = 0; k < pressureSlice.length; k++) {
      const c = pressureSlice[k];
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
      stochRsi: stochRsi,
      macd: {
        line: macdLineSeries[lastIdx],
        signal: macdSignalSeries[lastIdx],
        histogram: macdHistSeries[lastIdx],
        prevHistogram: macdHistSeries[Math.max(0, lastIdx - 1)]
      },
      bollinger: {
        upper: bbUpper,
        middle: bbMid,
        lower: bbLower,
        widthPct: (bbSpan / Math.max(bbMid, 0.0001)) * 100,
        percentB: (lastPrice - bbLower) / bbSpan
      },
      atr14: atr14,
      atrPct: (atr14 / Math.max(lastPrice, 0.0001)) * 100,
      vwap: vwapSeries[lastIdx],
      support: support,
      resistance: resistance,
      volumeRatio: volumeRatio,
      buyPressurePct: buyPressurePct,
      ema9Series: ema9Series,
      ema21Series: ema21Series,
      ema50Series: ema50Series,
      bbUpperSeries: bbUpperSeries,
      bbLowerSeries: bbLowerSeries,
      vwapSeries: vwapSeries,
      rsiSeries: rsiSeries,
      macdHistSeries: macdHistSeries
    };
  }

  // --- 4. SENTIMENT & INTERNET CATALYST ENGINE ---
  function scoreCatalystText(title, summary, source) {
    const fullText = (title + ' ' + summary).toLowerCase();
    const titleLower = title.toLowerCase();
    let rawScore = 0;
    const matchedKeywords = [];

    for (let i = 0; i < BULLISH_LEXICON.length; i++) {
      const phrase = BULLISH_LEXICON[i][0];
      const weight = BULLISH_LEXICON[i][1];
      const idx = fullText.indexOf(phrase);
      if (idx !== -1) {
        const prefix = fullText.slice(Math.max(0, idx - 18), idx);
        const isNeg = NEGATIONS.some(n => prefix.includes(n));
        const mult = titleLower.includes(phrase) ? 1.25 : 0.85;
        rawScore += (isNeg ? -weight * 0.8 : weight) * mult;
        matchedKeywords.push(isNeg ? 'not ' + phrase : phrase);
      }
    }
    for (let i = 0; i < BEARISH_LEXICON.length; i++) {
      const phrase = BEARISH_LEXICON[i][0];
      const weight = BEARISH_LEXICON[i][1];
      const idx = fullText.indexOf(phrase);
      if (idx !== -1) {
        const prefix = fullText.slice(Math.max(0, idx - 18), idx);
        const isNeg = NEGATIONS.some(n => prefix.includes(n));
        const mult = titleLower.includes(phrase) ? 1.25 : 0.85;
        rawScore += (isNeg ? -weight * 0.7 : weight) * mult;
        matchedKeywords.push(isNeg ? 'not ' + phrase : phrase);
      }
    }

    const sentimentScore = Math.round(clamp(rawScore, -96, 96));
    const sentimentLabel = sentimentScore >= 14 ? 'BULLISH' : sentimentScore <= -14 ? 'BEARISH' : 'NEUTRAL';

    const affectedCoins = [];
    for (let c = 0; c < COINS.length; c++) {
      const coin = COINS[c];
      const hit = coin.keywords.some(kw => new RegExp('\\b' + kw + '\\b', 'i').test(fullText));
      if (hit) affectedCoins.push(coin.symbol);
    }

    let category = 'crypto-news';
    if (/\b(fed|federal reserve|powell|cpi|inflation|fomc|treasury|yield|gdp|jobs report|macro|rate cut|rate hike|tariff)\b/i.test(fullText)) {
      category = 'macro-economy';
      if (!affectedCoins.includes('MARKET')) affectedCoins.push('MARKET');
    } else if (/\b(sec|etf|blackrock|fidelity|grayscale|cftc|regulation|congress|senate|lawsuit)\b/i.test(fullText)) {
      category = 'regulatory-etf';
    } else if (source.toLowerCase().includes('reddit')) {
      category = 'social-reddit';
    }

    if (!affectedCoins.length) affectedCoins.push('MARKET');

    const abs = Math.abs(sentimentScore);
    const impactLevel = (abs >= 40 || category === 'macro-economy' || category === 'regulatory-etf') ? 'HIGH' : abs >= 18 ? 'MEDIUM' : 'LOW';

    return {
      sentimentScore,
      sentimentLabel,
      impactLevel,
      affectedCoins,
      category,
      matchedKeywords: matchedKeywords.slice(0, 4)
    };
  }

  function stripHtml(html) {
    return String(html || '')
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseRssXmlToCatalysts(xmlText, sourceName) {
    const items = [];
    const blocks = xmlText.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) || [];
    for (let i = 0; i < Math.min(blocks.length, 15); i++) {
      const b = blocks[i];
      const titleMatch = b.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const descMatch = b.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || b.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
      const linkMatch = b.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || b.match(/<link[^>]*href=["']([^"']+)["']/i);
      const dateMatch = b.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || b.match(/<published[^>]*>([\s\S]*?)<\/published>/i);

      const rawTitle = titleMatch ? stripHtml(titleMatch[1]) : '';
      if (!rawTitle || rawTitle.length < 10) continue;
      const rawSummary = descMatch ? stripHtml(descMatch[1]).slice(0, 240) : '';
      const url = linkMatch ? stripHtml(linkMatch[1]) : 'https://news.google.com';
      const parsedTime = dateMatch ? Date.parse(stripHtml(dateMatch[1])) : Date.now();
      const publishedAt = Number.isNaN(parsedTime) ? (Date.now() - i * 240000) : parsedTime;
      const scored = scoreCatalystText(rawTitle, rawSummary, sourceName);

      items.push({
        id: sourceName + '-' + i + '-' + rawTitle.slice(0, 20).replace(/\W+/g, ''),
        title: rawTitle,
        summary: rawSummary || rawTitle,
        source: sourceName,
        category: scored.category,
        url: url,
        publishedAt: publishedAt,
        sentimentScore: scored.sentimentScore,
        sentimentLabel: scored.sentimentLabel,
        impactLevel: scored.impactLevel,
        affectedCoins: scored.affectedCoins,
        matchedKeywords: scored.matchedKeywords
      });
    }
    return items;
  }

  function parseRedditJsonToCatalysts(jsonText, subreddit) {
    try {
      const parsed = JSON.parse(jsonText);
      const children = (parsed && parsed.data && parsed.data.children) || [];
      const res = [];
      for (let i = 0; i < Math.min(children.length, 12); i++) {
        const post = children[i] && children[i].data;
        if (!post || post.stickied || !post.title) continue;
        const title = String(post.title).trim();
        const summary = String(post.selftext || '').slice(0, 200).trim();
        const url = post.permalink ? 'https://www.reddit.com' + post.permalink : 'https://www.reddit.com';
        const publishedAt = post.created_utc ? post.created_utc * 1000 : Date.now();
        const scored = scoreCatalystText(title, summary, 'Reddit r/' + subreddit);
        res.push({
          id: 'reddit-' + subreddit + '-' + (post.id || i),
          title: title,
          summary: summary || ('Upvotes: ' + (post.ups || 0) + ' • Comments: ' + (post.num_comments || 0) + ' on r/' + subreddit),
          source: 'Reddit r/' + subreddit,
          category: 'social-reddit',
          url: url,
          publishedAt: publishedAt,
          sentimentScore: scored.sentimentScore,
          sentimentLabel: scored.sentimentLabel,
          impactLevel: scored.impactLevel,
          affectedCoins: scored.affectedCoins,
          matchedKeywords: scored.matchedKeywords
        });
      }
      return res;
    } catch (e) {
      return [];
    }
  }

  // --- 5. GOOD-FAITH 5-PILLAR PREDICTION ENGINE ---
  function generatePredictionSignal(symbol, timeframe, currentPrice, tech, catalysts, fearGreed) {
    const price = currentPrice || (tech && tech.ema9) || 1;
    const atr = Math.max((tech && tech.atr14) || price * 0.01, price * 0.005);

    // Pillar 1: Trend & EMA (25%)
    let trendScore = 0;
    if (price > tech.ema9) trendScore += 22; else trendScore -= 22;
    if (tech.ema9 > tech.ema21) trendScore += 28; else trendScore -= 28;
    if (tech.ema21 > tech.ema50) trendScore += 26; else trendScore -= 26;
    if (price > tech.vwap) trendScore += 20; else trendScore -= 20;
    trendScore = clamp(Math.round(trendScore), -95, 95);

    // Pillar 2: Momentum & Mean Reversion (20%)
    let momScore = 0;
    const rsi = tech.rsi14;
    if (rsi >= 52 && rsi <= 68) momScore += 32;
    else if (rsi > 68 && rsi <= 76) momScore += 12;
    else if (rsi > 76) momScore -= 28;
    else if (rsi <= 48 && rsi >= 33) momScore -= 30;
    else if (rsi < 27) momScore += 28;

    if (tech.macd.histogram > 0 && tech.macd.histogram >= tech.macd.prevHistogram) momScore += 38;
    else if (tech.macd.histogram > 0) momScore += 16;
    else if (tech.macd.histogram < 0 && tech.macd.histogram <= tech.macd.prevHistogram) momScore -= 38;
    else momScore -= 16;
    momScore = clamp(Math.round(momScore), -95, 95);

    // Pillar 3: Volume & Orderflow (20%)
    let flowScore = (tech.buyPressurePct - 50) * 2.2;
    if (tech.volumeRatio > 1.25) flowScore *= Math.min(1.45, tech.volumeRatio);
    flowScore = clamp(Math.round(flowScore), -95, 95);

    // Pillar 4: Internet & News Catalysts (20%)
    const coinCatalysts = catalysts.filter(c => c.affectedCoins.includes(symbol) || c.affectedCoins.includes('MARKET'));
    const directCatalysts = catalysts.filter(c => c.affectedCoins.includes(symbol));
    let newsScore = 0;
    if (coinCatalysts.length > 0) {
      let wSum = 0, wTot = 0;
      for (let i = 0; i < Math.min(coinCatalysts.length, 18); i++) {
        const item = coinCatalysts[i];
        const isDirect = item.affectedCoins.includes(symbol);
        const imp = item.impactLevel === 'HIGH' ? 1.5 : item.impactLevel === 'MEDIUM' ? 1.0 : 0.6;
        const w = (isDirect ? 1.6 : 0.75) * imp;
        wSum += item.sentimentScore * w;
        wTot += w;
      }
      newsScore = wTot > 0 ? (wSum / wTot) * 1.35 : 0;
    }
    newsScore = clamp(Math.round(newsScore), -95, 95);

    // Pillar 5: Macro & Fear/Greed (15%)
    const macroCats = catalysts.filter(c => c.category === 'macro-economy' || c.category === 'regulatory-etf');
    let macroAvg = 0;
    if (macroCats.length > 0) {
      macroAvg = macroCats.reduce((acc, c) => acc + c.sentimentScore, 0) / macroCats.length;
    }
    let fgContrib = 0;
    const fg = fearGreed.value;
    if (fg >= 52 && fg <= 74) fgContrib = 24;
    else if (fg > 82) fgContrib = -22;
    else if (fg < 22) fgContrib = 18;
    else if (fg < 44) fgContrib = -20;
    const macroScore = clamp(Math.round(macroAvg * 0.85 + fgContrib), -95, 95);

    const pillars = [
      {
        id: 'trend', name: 'Trend & EMA Structure', weight: 0.25, score: trendScore,
        metricText: 'EMA9 ' + (tech.ema9 >= tech.ema21 ? '>' : '<') + ' EMA21 • Price ' + (price >= tech.vwap ? 'Above' : 'Below') + ' VWAP',
        summary: trendScore > 20
          ? 'Price (' + formatPrice(price) + ') holds above VWAP (' + formatPrice(tech.vwap) + ') with bullish EMA-9/21 structure.'
          : trendScore < -20
          ? 'Price trades below session VWAP (' + formatPrice(tech.vwap) + ') and short-term EMA resistance.'
          : 'EMAs are tightly compressed near ' + formatPrice(tech.ema21) + ', indicating equilibrium.'
      },
      {
        id: 'momentum', name: 'Momentum & Oscillators', weight: 0.20, score: momScore,
        metricText: 'RSI-14: ' + rsi.toFixed(1) + ' • StochRSI: ' + tech.stochRsi.toFixed(0),
        summary: rsi > 74
          ? 'RSI (' + rsi.toFixed(1) + ') is overextended; chasing breakouts here carries pullback risk.'
          : rsi < 29
          ? 'RSI (' + rsi.toFixed(1) + ') is oversold, favoring a mean-reversion bounce.'
          : 'RSI at ' + rsi.toFixed(1) + ' with ' + (tech.macd.histogram >= 0 ? 'positive' : 'negative') + ' MACD histogram.'
      },
      {
        id: 'orderflow', name: 'Volume & Orderflow Delta', weight: 0.20, score: flowScore,
        metricText: 'Buy Pressure: ' + tech.buyPressurePct.toFixed(0) + '% • Vol: ' + tech.volumeRatio.toFixed(2) + 'x avg',
        summary: tech.buyPressurePct >= 54
          ? 'Buyers absorb ' + tech.buyPressurePct.toFixed(0) + '% of recent volume (' + tech.volumeRatio.toFixed(2) + 'x relative volume).'
          : tech.buyPressurePct <= 46
          ? 'Sellers dominate (' + (100 - tech.buyPressurePct).toFixed(0) + '% sell volume) across recent candles.'
          : 'Balanced two-way liquidity between buyers and sellers.'
      },
      {
        id: 'sentiment', name: 'Internet & News Catalysts', weight: 0.20, score: newsScore,
        metricText: directCatalysts.length + ' ' + symbol + ' mentions • ' + coinCatalysts.length + ' relevant feeds',
        summary: newsScore >= 14
          ? 'Live internet & news feeds skew net bullish (+' + newsScore + ') for ' + symbol + '.'
          : newsScore <= -14
          ? 'Headline & social sentiment skews net bearish (' + newsScore + ') for ' + symbol + '.'
          : 'Internet news flow for ' + symbol + ' is currently balanced (' + newsScore + ').'
      },
      {
        id: 'macro', name: 'Macro & ETF Regime', weight: 0.15, score: macroScore,
        metricText: 'Fear & Greed: ' + fearGreed.value + ' (' + fearGreed.classification + ')',
        summary: macroScore >= 14
          ? 'Macro & regulatory headlines are constructive alongside ' + fearGreed.classification + ' (' + fearGreed.value + ').'
          : macroScore <= -14
          ? 'Macro headwinds or cautious market positioning weigh on risk appetite.'
          : 'Macro backdrop is neutral with Fear & Greed at ' + fearGreed.value + '.'
      }
    ];

    const compositeRaw = pillars.reduce((s, p) => s + p.score * p.weight, 0);
    const compositeScore = clamp(Math.round(compositeRaw), -95, 95);
    const sign = compositeScore >= 0 ? 1 : -1;
    const alignedCount = pillars.filter(p => p.score * sign > 10).length;
    const opposingCount = pillars.filter(p => p.score * sign < -15).length;

    let confidence = Math.round(38 + Math.abs(compositeScore) * 0.52 + alignedCount * 6 - opposingCount * 9);
    confidence = clamp(confidence, 25, 91);

    let direction = 'NEUTRAL / WAIT';
    if (compositeScore >= 38 && opposingCount <= 1) direction = 'STRONG LONG';
    else if (compositeScore >= 15) direction = 'MODERATE LONG';
    else if (compositeScore <= -38 && opposingCount <= 1) direction = 'STRONG SHORT';
    else if (compositeScore <= -15) direction = 'MODERATE SHORT';

    let regime = 'Balanced Consolidation';
    if (tech.bollinger.widthPct < 1.8) regime = 'Volatility Squeeze (Breakout Pending)';
    else if (trendScore >= 40 && momScore >= 20) regime = 'Bullish Impulse Trend';
    else if (trendScore <= -40 && momScore <= -20) regime = 'Bearish Distribution Trend';
    else if (Math.abs(trendScore - newsScore) >= 65) regime = 'Technical vs. News Divergence';
    else if (tech.atrPct > 2.8) regime = 'High-Volatility Expansion';

    const isLong = compositeScore >= 0;
    const spread = atr * 0.22;
    const entryZone = isLong ? [price - spread, price + spread * 0.5] : [price - spread * 0.5, price + spread];
    const rawStopDist = atr * 1.35;
    const stopLoss = isLong ? Math.min(price - rawStopDist, tech.support * 0.9985) : Math.max(price + rawStopDist, tech.resistance * 1.0015);
    const actualRisk = Math.max(Math.abs(price - stopLoss), atr * 0.6);
    const takeProfit1 = isLong ? price + actualRisk * 1.65 : Math.max(price * 0.1, price - actualRisk * 1.65);
    const takeProfit2 = isLong ? price + actualRisk * 2.75 : Math.max(price * 0.05, price - actualRisk * 2.75);
    const riskRewardRatio = Number((Math.abs(takeProfit1 - price) / actualRisk).toFixed(2));
    const expectedMovePct = Number((((takeProfit1 - price) / price) * 100).toFixed(2));

    let actionable = Math.abs(compositeScore) >= 15 && confidence >= 54;
    let skipReason = '';
    if (Math.abs(compositeScore) < 15) {
      actionable = false;
      skipReason = 'Composite edge is below threshold (|score| < 15). Sitting in cash preserves capital until technicals and internet catalysts align.';
    } else if (opposingCount >= 2 && Math.abs(compositeScore) < 32) {
      actionable = false;
      skipReason = 'Conflict detected between Technical Structure and Internet/Macro Sentiment. Waiting for confirmation is advised.';
    }

    const bullThesis = [];
    const bearThesis = [];
    if (price >= tech.vwap) {
      bullThesis.push('Price (' + formatPrice(price) + ') holds above session VWAP (' + formatPrice(tech.vwap) + '), confirming buyer support.');
    } else {
      bearThesis.push('Price (' + formatPrice(price) + ') trades below session VWAP (' + formatPrice(tech.vwap) + '), indicating overhead supply.');
    }
    if (tech.ema9 > tech.ema21) {
      bullThesis.push('Fast EMA-9 (' + formatPrice(tech.ema9) + ') leads EMA-21 (' + formatPrice(tech.ema21) + ') with structural floor at ' + formatPrice(tech.support) + '.');
    } else {
      bearThesis.push('EMA-9 (' + formatPrice(tech.ema9) + ') remains below EMA-21 (' + formatPrice(tech.ema21) + '), keeping trend pressure downward.');
    }
    if (tech.buyPressurePct >= 52) {
      bullThesis.push('Orderflow shows ' + tech.buyPressurePct.toFixed(0) + '% buyer absorption at ' + tech.volumeRatio.toFixed(2) + 'x average volume.');
    } else {
      bearThesis.push('Orderflow shows ' + (100 - tech.buyPressurePct).toFixed(0) + '% seller dominance over recent bars.');
    }

    const topBullCat = coinCatalysts.find(c => c.sentimentScore >= 16);
    if (topBullCat) {
      bullThesis.push('Web Catalyst [' + topBullCat.source + ']: "' + topBullCat.title.slice(0, 88) + '…" (+' + topBullCat.sentimentScore + ').');
    }
    const topBearCat = coinCatalysts.find(c => c.sentimentScore <= -16);
    if (topBearCat) {
      bearThesis.push('Risk Catalyst [' + topBearCat.source + ']: "' + topBearCat.title.slice(0, 88) + '…" (' + topBearCat.sentimentScore + ').');
    }
    if (bullThesis.length < 2) {
      bullThesis.push('Breakout above ' + formatPrice(tech.resistance) + ' opens upside continuation toward ' + formatPrice(price + atr * 2.2) + '.');
    }
    if (bearThesis.length < 2) {
      bearThesis.push('Breakdown below support ' + formatPrice(tech.support) + ' invalidates structure toward ' + formatPrice(price - atr * 2.0) + '.');
    }

    const horizonMap = {
      '1m': 'Next 15–45 mins (Scalp)',
      '5m': 'Next 1–3 hours (Intraday)',
      '15m': 'Next 3–8 hours (Intraday Swing)',
      '1h': 'Next 12–36 hours (Day Swing)',
      '4h': 'Next 2–5 days (Multi-Day Swing)',
      '1d': 'Next 1–3 weeks (Position)'
    };

    return {
      symbol, timeframe, currentPrice: price, direction, compositeScore, confidence,
      regime, actionable, skipReason, entryZone, stopLoss, takeProfit1, takeProfit2,
      riskRewardRatio, expectedMovePct, horizonText: horizonMap[timeframe] || 'Intraday',
      pillars, bullThesis: bullThesis.slice(0, 4), bearThesis: bearThesis.slice(0, 4),
      invalidationCondition: isLong
        ? 'Hard invalidation if ' + symbol + ' closes below ' + formatPrice(stopLoss) + ' (below swing support ' + formatPrice(tech.support) + ').'
        : 'Hard invalidation if ' + symbol + ' breaks above ' + formatPrice(stopLoss) + ' (above swing resistance ' + formatPrice(tech.resistance) + ').',
      catalystsUsed: coinCatalysts.length
    };
  }

  // --- 6. APPLICATION STATE ---
  const state = {
    activeTab: 'DASHBOARD',
    selectedSymbol: 'BTC',
    timeframe: '15m',
    tickers: {},
    candles: [],
    catalysts: [],
    fearGreed: { value: 62, classification: 'Greed', previousValue: 57 },
    isScanning: false,
    lastScanTime: Date.now(),
    wsConnected: false,
    ticksCount: 0,
    scannerFilter: 'ALL',
    searchQuery: '',
    chartShowEMA: true,
    chartShowBB: true,
    chartShowVWAP: true,
    chartShowTargets: true,
    chartSubPane: 'RSI',
    hudData: {},
    paperSide: 'LONG',
    paperRiskPct: 1.0,
    paperStopLoss: '',
    paperTakeProfit: '',
    editingPosId: null,
    editSlVal: '',
    editTpVal: '',
    cashBalance: parseFloat(localStorage.getItem('rk_cash_balance') || '100000'),
    positions: JSON.parse(localStorage.getItem('rk_paper_positions') || '[]')
  };

  for (let i = 0; i < COINS.length; i++) {
    const c = COINS[i];
    const p = DEFAULT_BASE_PRICES[c.symbol];
    state.tickers[c.symbol] = {
      symbol: c.symbol, name: c.name, price: p, change24h: 0, changePct24h: 0,
      high24h: p * 1.02, low24h: p * 0.98, volume24h: 0, lastUpdated: Date.now()
    };
  }

  function generateFallbackCandles(symbol, timeframe) {
    const base = DEFAULT_BASE_PRICES[symbol] || 100;
    const granMap = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 };
    const stepSec = granMap[timeframe] || 900;
    const nowSec = Math.floor(Date.now() / 1000);
    const arr = [];
    let price = base * 0.97;
    let seed = symbol.charCodeAt(0) * 137 + timeframe.charCodeAt(0) * 31;
    for (let i = 240; i >= 0; i--) {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      const r1 = seed / 4294967296 - 0.491;
      const chg = price * r1 * 0.013;
      const open = price;
      const close = Math.max(base * 0.1, open + chg);
      const high = Math.max(open, close) + Math.abs(chg) * 0.6 + price * 0.002;
      const low = Math.min(open, close) - Math.abs(chg) * 0.55 - price * 0.002;
      const volume = (base > 1000 ? 180 : 45000) * (0.6 + Math.abs(r1) * 2.5);
      arr.push({ time: nowSec - i * stepSec, open, high, low, close, volume });
      price = close;
    }
    return arr;
  }

  state.candles = generateFallbackCandles('BTC', '15m');

  async function loadCandles(symbol, timeframe) {
    const coin = COINS.find(c => c.symbol === symbol) || COINS[0];
    try {
      const url = 'https://data-api.binance.vision/api/v3/klines?symbol=' + coin.binanceSymbol + '&interval=' + timeframe + '&limit=300';
      const raw = await nativeFetchText(url);
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 10) {
        state.candles = data.map(row => ({
          time: Math.floor(Number(row[0]) / 1000),
          open: parseFloat(row[1]),
          high: parseFloat(row[2]),
          low: parseFloat(row[3]),
          close: parseFloat(row[4]),
          volume: parseFloat(row[5])
        }));
        syncPaperInputsToPrediction();
        renderAll();
        return;
      }
    } catch (e) {}

    try {
      const granMap = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 };
      const gran = granMap[timeframe] || 900;
      const url = 'https://api.exchange.coinbase.com/products/' + coin.coinbaseProduct + '/candles?granularity=' + gran;
      const raw = await nativeFetchText(url);
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 10) {
        state.candles = data.slice(0, 300).reverse().map(row => ({
          time: Number(row[0]), low: Number(row[1]), high: Number(row[2]),
          open: Number(row[3]), close: Number(row[4]), volume: Number(row[5])
        }));
        syncPaperInputsToPrediction();
        renderAll();
        return;
      }
    } catch (e) {}
  }

  async function loadInitialTickers() {
    try {
      const syms = encodeURIComponent(JSON.stringify(COINS.map(c => c.binanceSymbol)));
      const raw = await nativeFetchText('https://data-api.binance.vision/api/v3/ticker/24hr?symbols=' + syms);
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        for (let i = 0; i < arr.length; i++) {
          const item = arr[i];
          const coin = COINS.find(c => c.binanceSymbol === item.symbol);
          if (!coin) continue;
          state.tickers[coin.symbol] = {
            symbol: coin.symbol,
            name: coin.name,
            price: parseFloat(item.lastPrice),
            change24h: parseFloat(item.priceChange),
            changePct24h: parseFloat(item.priceChangePercent),
            high24h: parseFloat(item.highPrice),
            low24h: parseFloat(item.lowPrice),
            volume24h: parseFloat(item.quoteVolume),
            lastUpdated: Date.now()
          };
        }
        renderAll();
      }
    } catch (e) {}
  }

  const INTERNET_FEEDS = [
    { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', type: 'rss' },
    { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss', type: 'rss' },
    { name: 'Decrypt', url: 'https://decrypt.co/feed', type: 'rss' },
    { name: 'Macro & Fed Pulse (Google News)', url: 'https://news.google.com/rss/search?q=Federal+Reserve+OR+CPI+inflation+OR+Bitcoin+ETF+OR+SEC+crypto+when:2d&hl=en-US&gl=US&ceid=US:en', type: 'rss' },
    { name: 'CryptoCurrency', url: 'https://www.reddit.com/r/CryptoCurrency/hot.json?limit=12', type: 'reddit' }
  ];

  async function scanInternetFeeds(customQuery) {
    state.isScanning = true;
    renderAll();

    const feeds = INTERNET_FEEDS.slice();
    if (customQuery && customQuery.trim().length > 1) {
      const q = encodeURIComponent(customQuery.trim());
      feeds.unshift({
        name: 'Web Search: "' + customQuery.trim() + '"',
        url: 'https://news.google.com/rss/search?q=' + q + '+when:7d&hl=en-US&gl=US&ceid=US:en',
        type: 'rss'
      });
    }

    const promises = feeds.map(async (f) => {
      const txt = await nativeFetchText(f.url);
      return f.type === 'reddit' ? parseRedditJsonToCatalysts(txt, f.name) : parseRssXmlToCatalysts(txt, f.name);
    });

    try {
      const fgRaw = await nativeFetchText('https://api.alternative.me/fng/?limit=2');
      const fgJson = JSON.parse(fgRaw);
      if (fgJson && fgJson.data && fgJson.data[0]) {
        state.fearGreed = {
          value: Number(fgJson.data[0].value) || 58,
          classification: String(fgJson.data[0].value_classification || 'Greed'),
          previousValue: Number(fgJson.data[1] && fgJson.data[1].value) || 54
        };
      }
    } catch (e) {}

    const settled = await Promise.allSettled(promises);
    const combined = [];
    const seen = new Set();
    for (let i = 0; i < settled.length; i++) {
      if (settled[i].status === 'fulfilled') {
        const list = settled[i].value;
        for (let j = 0; j < list.length; j++) {
          const k = list[j].title.toLowerCase().slice(0, 48);
          if (!seen.has(k)) {
            seen.add(k);
            combined.push(list[j]);
          }
        }
      }
    }
    if (combined.length > 0) {
      combined.sort((a, b) => b.publishedAt - a.publishedAt);
      state.catalysts = combined.slice(0, 60);
    }
    state.isScanning = false;
    state.lastScanTime = Date.now();
    renderAll();
  }

  // --- 7. WEBSOCKET REAL-TIME TICK STREAM (500ms THROTTLED) ---
  const tickBuffer = {};
  let totalRawTicks = 0;

  function handleIncomingTick(sym, price, open24, high24, low24, vol24) {
    if (!Number.isFinite(price) || price <= 0) return;
    totalRawTicks++;
    tickBuffer[sym] = { price, open24, high24, low24, vol24, time: Date.now() };
  }

  function flushTickBuffer() {
    const syms = Object.keys(tickBuffer);
    if (syms.length === 0) return;

    state.ticksCount++;
    let activeSymbolUpdated = false;

    for (let i = 0; i < syms.length; i++) {
      const sym = syms[i];
      const data = tickBuffer[sym];
      delete tickBuffer[sym];

      const cur = state.tickers[sym];
      if (cur) {
        const baseOpen = data.open24 || (cur.price - cur.change24h) || data.price;
        const change24h = data.price - baseOpen;
        const changePct24h = baseOpen > 0 ? (change24h / baseOpen) * 100 : 0;
        cur.price = data.price;
        cur.change24h = change24h;
        cur.changePct24h = changePct24h;
        if (data.high24) cur.high24h = data.high24;
        else if (data.price > cur.high24h) cur.high24h = data.price;
        if (data.low24) cur.low24h = data.low24;
        else if (cur.low24h > 0 && data.price < cur.low24h) cur.low24h = data.price;
        if (data.vol24 !== undefined) cur.volume24h = data.vol24;
        cur.lastUpdated = Date.now();
      }

      updateFastDOMOnTick(sym);

      if (sym === state.selectedSymbol && state.candles.length > 0) {
        activeSymbolUpdated = true;
        const last = state.candles[state.candles.length - 1];
        last.close = data.price;
        if (data.price > last.high) last.high = data.price;
        if (data.price < last.low) last.low = data.price;

        if (tvState.candleSeries) {
          tvState.candleSeries.update({
            time: last.time,
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close
          });
        }
        if (tvState.volumeSeries) {
          tvState.volumeSeries.update({
            time: last.time,
            value: last.volume,
            color: last.close >= last.open ? 'rgba(16, 185, 129, 0.28)' : 'rgba(244, 63, 94, 0.28)'
          });
        }
      }
    }

    if (activeSymbolUpdated && state.activeTab === 'DASHBOARD') {
      const cur = state.tickers[state.selectedSymbol];
      const heroPriceEl = document.getElementById('rk-hero-price');
      if (heroPriceEl && cur) heroPriceEl.textContent = formatPrice(cur.price);
      updateHUDBar();
    }

    checkPaperStopsAndTargets();

    const tickStatusEl = document.getElementById('rk-tick-status');
    if (tickStatusEl) {
      tickStatusEl.textContent = 'LIVE FEED (500ms)';
    }
  }

  setInterval(flushTickBuffer, 500);

  function connectWebSockets() {
    try {
      const cb = new WebSocket('wss://ws-feed.exchange.coinbase.com');
      cb.onopen = () => {
        state.wsConnected = true;
        cb.send(JSON.stringify({
          type: 'subscribe',
          product_ids: COINS.map(c => c.coinbaseProduct),
          channels: ['ticker']
        }));
      };
      cb.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'ticker' && msg.product_id && msg.price) {
            const coin = COINS.find(c => c.coinbaseProduct === msg.product_id);
            if (coin) {
              const p = parseFloat(msg.price);
              handleIncomingTick(
                coin.symbol, p,
                msg.open_24h ? parseFloat(msg.open_24h) : undefined,
                msg.high_24h ? parseFloat(msg.high_24h) : undefined,
                msg.low_24h ? parseFloat(msg.low_24h) : undefined,
                msg.volume_24h ? parseFloat(msg.volume_24h) * p : undefined
              );
            }
          }
        } catch (e) {}
      };
      cb.onclose = () => {
        state.wsConnected = false;
        setTimeout(connectWebSockets, 4000);
      };
    } catch (e) {}

    try {
      const streams = COINS.map(c => c.binanceSymbol.toLowerCase() + '@miniTicker').join('/');
      const bin = new WebSocket('wss://data-stream.binance.vision/stream?streams=' + streams);
      bin.onopen = () => { state.wsConnected = true; };
      bin.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          const d = payload && payload.data;
          if (d && d.s && d.c) {
            const coin = COINS.find(c => c.binanceSymbol === d.s);
            if (coin) {
              handleIncomingTick(coin.symbol, parseFloat(d.c), parseFloat(d.o), parseFloat(d.h), parseFloat(d.l), parseFloat(d.q));
            }
          }
        } catch (e) {}
      };
    } catch (e) {}
  }

  function savePaperState() {
    localStorage.setItem('rk_cash_balance', String(state.cashBalance));
    localStorage.setItem('rk_paper_positions', JSON.stringify(state.positions));
  }

  function checkPaperStopsAndTargets() {
    let changed = false;
    for (let i = 0; i < state.positions.length; i++) {
      const pos = state.positions[i];
      if (pos.closedAt) continue;
      const mark = state.tickers[pos.symbol] && state.tickers[pos.symbol].price;
      if (!mark) continue;

      if (pos.side === 'LONG') {
        if (mark <= pos.stopLoss || mark >= pos.takeProfit) {
          pos.closedAt = Date.now();
          pos.closePrice = mark;
          pos.closeReason = mark <= pos.stopLoss ? 'STOP_LOSS' : 'TAKE_PROFIT';
          pos.realizedPnl = (mark - pos.entryPrice) * pos.sizeCoins;
          state.cashBalance += pos.notionalUsd + pos.realizedPnl;
          changed = true;
        }
      } else {
        if (mark >= pos.stopLoss || mark <= pos.takeProfit) {
          pos.closedAt = Date.now();
          pos.closePrice = mark;
          pos.closeReason = mark >= pos.stopLoss ? 'STOP_LOSS' : 'TAKE_PROFIT';
          pos.realizedPnl = (pos.entryPrice - mark) * pos.sizeCoins;
          state.cashBalance += pos.notionalUsd + pos.realizedPnl;
          changed = true;
        }
      }
    }
    if (changed) {
      savePaperState();
      renderAll();
    }
  }

  function getActivePrediction() {
    const tech = computeTechnicalSnapshot(state.candles);
    const livePrice = (state.tickers[state.selectedSymbol] && state.tickers[state.selectedSymbol].price) ||
      (state.candles.length ? state.candles[state.candles.length - 1].close : 100);
    const pred = generatePredictionSignal(state.selectedSymbol, state.timeframe, livePrice, tech, state.catalysts, state.fearGreed);
    return { tech, pred, livePrice };
  }

  function syncPaperInputsToPrediction() {
    const { pred, livePrice } = getActivePrediction();
    state.paperSide = pred.compositeScore >= 0 ? 'LONG' : 'SHORT';
    const dec = livePrice >= 10 ? 2 : 4;
    state.paperStopLoss = pred.stopLoss.toFixed(dec);
    state.paperTakeProfit = pred.takeProfit1.toFixed(dec);
  }

  // --- 8. TRADINGVIEW LIGHTWEIGHT CHARTS INTEGRATION ---
  const tvState = {
    mainChart: null,
    subChart: null,
    mainContainerEl: null,
    subContainerEl: null,
    candleSeries: null,
    volumeSeries: null,
    ema9: null,
    ema21: null,
    ema50: null,
    vwap: null,
    bbUpper: null,
    bbLower: null,
    priceLines: [],
    rsiLine: null,
    macdHist: null,
    lastSymbol: null,
    lastTimeframe: null
  };

  function updateHUDBar() {
    const hud = state.hudData || {};
    const last = state.candles[state.candles.length - 1] || {};
    const op = hud.open ?? last.open ?? 0;
    const hi = hud.high ?? last.high ?? 0;
    const lo = hud.low ?? last.low ?? 0;
    const cl = hud.close ?? last.close ?? 0;
    const chg = hud.changePct ?? (op > 0 ? ((cl - op) / op) * 100 : 0);

    const hudEl = document.getElementById('rk-chart-hud');
    if (!hudEl) return;

    hudEl.innerHTML = `
      ${hud.time ? `<span class="hud-time">${escapeHtml(hud.time)}</span>` : ''}
      <span>O: <strong>${formatPrice(op)}</strong></span>
      <span>H: <strong>${formatPrice(hi)}</strong></span>
      <span>L: <strong>${formatPrice(lo)}</strong></span>
      <span>C: <strong>${formatPrice(cl)}</strong></span>
      <span class="${chg >= 0 ? 'pos' : 'neg'}">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</span>
      <span class="hud-ema9">EMA9: ${formatPrice(hud.ema9 ?? 0)}</span>
      <span class="hud-ema21">EMA21: ${formatPrice(hud.ema21 ?? 0)}</span>
      <span class="hud-vwap">VWAP: ${formatPrice(hud.vwap ?? 0)}</span>
      <span>Vol: ${hud.volume ? Math.round(hud.volume).toLocaleString() : '—'}</span>
    `;
  }

  function initOrUpdateTradingView(tech, prediction) {
    const mainContainer = document.getElementById('tv-main-container');
    const subContainer = document.getElementById('tv-sub-container');
    if (!mainContainer || !subContainer || !window.LightweightCharts || !state.candles.length) return;

    const LC = window.LightweightCharts;

    // If DOM container was replaced by renderAll(), reset chart instances so they mount into the live DOM
    if (tvState.mainChart && tvState.mainContainerEl !== mainContainer) {
      try { tvState.mainChart.remove(); } catch (e) {}
      tvState.mainChart = null;
      tvState.priceLines = [];
    }
    if (tvState.subChart && tvState.subContainerEl !== subContainer) {
      try { tvState.subChart.remove(); } catch (e) {}
      tvState.subChart = null;
      tvState.rsiLine = null;
      tvState.macdHist = null;
    }

    // 1. Initialize Main Chart if needed
    if (!tvState.mainChart) {
      tvState.mainContainerEl = mainContainer;
      tvState.mainChart = LC.createChart(mainContainer, {
        width: Math.max(480, mainContainer.clientWidth || 680),
        height: 380,
        layout: {
          background: { type: 'solid', color: '#090D16' },
          textColor: '#94A3B8',
          fontSize: 11,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif'
        },
        grid: {
          vertLines: { color: 'rgba(148, 163, 184, 0.05)' },
          horzLines: { color: 'rgba(148, 163, 184, 0.05)' }
        },
        crosshair: {
          mode: LC.CrosshairMode.Normal,
          vertLine: { color: 'rgba(226, 232, 240, 0.35)', width: 1, style: LC.LineStyle.Dashed },
          horzLine: { color: 'rgba(226, 232, 240, 0.35)', width: 1, style: LC.LineStyle.Dashed }
        },
        rightPriceScale: {
          borderColor: 'rgba(148, 163, 184, 0.12)',
          scaleMargins: { top: 0.08, bottom: 0.22 },
          autoScale: true
        },
        timeScale: {
          borderColor: 'rgba(148, 163, 184, 0.12)',
          timeVisible: true,
          secondsVisible: false
        }
      });

      tvState.candleSeries = tvState.mainChart.addCandlestickSeries({
        upColor: '#10B981',
        downColor: '#F43F5E',
        borderVisible: false,
        wickUpColor: '#10B981',
        wickDownColor: '#F43F5E'
      });

      tvState.volumeSeries = tvState.mainChart.addHistogramSeries({
        priceFormat: { type: 'volume' },
        priceScaleId: ''
      });
      tvState.volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.82, bottom: 0 }
      });

      tvState.ema9 = tvState.mainChart.addLineSeries({
        color: '#38BDF8',
        lineWidth: 2,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false
      });

      tvState.ema21 = tvState.mainChart.addLineSeries({
        color: '#A855F7',
        lineWidth: 2,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false
      });

      tvState.ema50 = tvState.mainChart.addLineSeries({
        color: '#F59E0B',
        lineWidth: 1,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false
      });

      tvState.vwap = tvState.mainChart.addLineSeries({
        color: '#EAB308',
        lineWidth: 2,
        lineStyle: LC.LineStyle.Dashed,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false
      });

      tvState.bbUpper = tvState.mainChart.addLineSeries({
        color: 'rgba(56, 189, 248, 0.45)',
        lineWidth: 1,
        lineStyle: LC.LineStyle.Dotted,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false
      });

      tvState.bbLower = tvState.mainChart.addLineSeries({
        color: 'rgba(56, 189, 248, 0.45)',
        lineWidth: 1,
        lineStyle: LC.LineStyle.Dotted,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false
      });

      tvState.mainChart.subscribeCrosshairMove((param) => {
        if (!param || !param.time || !param.seriesData) return;
        const cD = param.seriesData.get(tvState.candleSeries);
        const vD = param.seriesData.get(tvState.volumeSeries);
        const e9 = param.seriesData.get(tvState.ema9);
        const e21 = param.seriesData.get(tvState.ema21);
        const vw = param.seriesData.get(tvState.vwap);
        if (cD) {
          const chg = cD.open > 0 ? ((cD.close - cD.open) / cD.open) * 100 : 0;
          const tStr = typeof param.time === 'number'
            ? new Date(param.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : String(param.time);

          state.hudData = {
            time: tStr,
            open: cD.open,
            high: cD.high,
            low: cD.low,
            close: cD.close,
            changePct: chg,
            volume: vD ? vD.value : undefined,
            ema9: e9 ? e9.value : undefined,
            ema21: e21 ? e21.value : undefined,
            vwap: vw ? vw.value : undefined
          };
          updateHUDBar();
        }
      });
    }

    // 2. Initialize Sub Chart if needed
    if (!tvState.subChart) {
      tvState.subContainerEl = subContainer;
      tvState.subChart = LC.createChart(subContainer, {
        width: Math.max(480, subContainer.clientWidth || 680),
        height: 105,
        layout: {
          background: { type: 'solid', color: '#070A12' },
          textColor: '#64748B',
          fontSize: 10,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif'
        },
        grid: {
          vertLines: { color: 'rgba(148, 163, 184, 0.04)' },
          horzLines: { color: 'rgba(148, 163, 184, 0.04)' }
        },
        crosshair: { mode: LC.CrosshairMode.Normal },
        rightPriceScale: {
          borderColor: 'rgba(148, 163, 184, 0.12)',
          scaleMargins: { top: 0.15, bottom: 0.15 },
          autoScale: true
        },
        timeScale: {
          borderColor: 'rgba(148, 163, 184, 0.12)',
          visible: false
        }
      });

      // Synchronize time scales
      tvState.mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (tvState.subChart && range) tvState.subChart.timeScale().setVisibleLogicalRange(range);
      });
      tvState.subChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (tvState.mainChart && range) tvState.mainChart.timeScale().setVisibleLogicalRange(range);
      });
    }

    // 3. Prepare strictly ascending sorted candles
    const sorted = [...state.candles].sort((a, b) => a.time - b.time);
    const uniqueCandles = [];
    const seenTimes = new Set();
    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i];
      if (!seenTimes.has(c.time)) {
        seenTimes.add(c.time);
        uniqueCandles.push(c);
      }
    }

    tvState.candleSeries.setData(uniqueCandles.map(c => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    })));

    tvState.volumeSeries.setData(uniqueCandles.map(c => ({
      time: c.time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.28)' : 'rgba(244, 63, 94, 0.28)'
    })));

    // Indicator series
    if (tvState.ema9) {
      tvState.ema9.setData(state.chartShowEMA ? uniqueCandles.map((c, i) => ({ time: c.time, value: tech.ema9Series[i] || c.close })) : []);
    }
    if (tvState.ema21) {
      tvState.ema21.setData(state.chartShowEMA ? uniqueCandles.map((c, i) => ({ time: c.time, value: tech.ema21Series[i] || c.close })) : []);
    }
    if (tvState.ema50) {
      tvState.ema50.setData(state.chartShowEMA ? uniqueCandles.map((c, i) => ({ time: c.time, value: tech.ema50Series[i] || c.close })) : []);
    }
    if (tvState.vwap) {
      tvState.vwap.setData(state.chartShowVWAP ? uniqueCandles.map((c, i) => ({ time: c.time, value: tech.vwapSeries[i] || c.close })) : []);
    }
    if (tvState.bbUpper && tvState.bbLower) {
      tvState.bbUpper.setData(state.chartShowBB ? uniqueCandles.map((c, i) => ({ time: c.time, value: tech.bbUpperSeries[i] || c.close })) : []);
      tvState.bbLower.setData(state.chartShowBB ? uniqueCandles.map((c, i) => ({ time: c.time, value: tech.bbLowerSeries[i] || c.close })) : []);
    }

    // AI Prediction Price Lines
    for (let i = 0; i < tvState.priceLines.length; i++) {
      try { tvState.candleSeries.removePriceLine(tvState.priceLines[i]); } catch (e) {}
    }
    tvState.priceLines = [];

    if (state.chartShowTargets && prediction && prediction.takeProfit1) {
      const tp1 = tvState.candleSeries.createPriceLine({
        price: prediction.takeProfit1,
        color: '#10B981',
        lineWidth: 2,
        lineStyle: LC.LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'TP1 (' + (prediction.expectedMovePct > 0 ? '+' : '') + prediction.expectedMovePct + '%)'
      });
      const sl = tvState.candleSeries.createPriceLine({
        price: prediction.stopLoss,
        color: '#F43F5E',
        lineWidth: 2,
        lineStyle: LC.LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'STOP / INVALIDATION'
      });
      const tp2 = tvState.candleSeries.createPriceLine({
        price: prediction.takeProfit2,
        color: '#34D399',
        lineWidth: 1,
        lineStyle: LC.LineStyle.Dotted,
        axisLabelVisible: true,
        title: 'TP2 (Runner)'
      });
      tvState.priceLines = [tp1, sl, tp2];
    }

    // Active position target lines
    const activePos = state.positions.find(p => p.symbol === state.selectedSymbol && !p.closedAt);
    if (activePos && tvState.candleSeries) {
      const posSl = tvState.candleSeries.createPriceLine({
        price: activePos.stopLoss,
        color: '#EF4444',
        lineWidth: 2,
        lineStyle: LC.LineStyle.Solid,
        axisLabelVisible: true,
        title: 'POS SL (' + formatPrice(activePos.stopLoss) + ')'
      });
      const posTp = tvState.candleSeries.createPriceLine({
        price: activePos.takeProfit,
        color: '#10B981',
        lineWidth: 2,
        lineStyle: LC.LineStyle.Solid,
        axisLabelVisible: true,
        title: 'POS TP (' + formatPrice(activePos.takeProfit) + ')'
      });
      tvState.priceLines.push(posSl, posTp);
    }

    // 4. Update Sub-Chart (RSI or MACD)
    if (tvState.rsiLine) {
      try { tvState.subChart.removeSeries(tvState.rsiLine); } catch (e) {}
      tvState.rsiLine = null;
    }
    if (tvState.macdHist) {
      try { tvState.subChart.removeSeries(tvState.macdHist); } catch (e) {}
      tvState.macdHist = null;
    }

    if (state.chartSubPane === 'RSI') {
      tvState.rsiLine = tvState.subChart.addLineSeries({
        color: '#38BDF8',
        lineWidth: 2,
        title: 'RSI (14)'
      });
      tvState.rsiLine.createPriceLine({
        price: 70,
        color: 'rgba(244, 63, 94, 0.4)',
        lineWidth: 1,
        lineStyle: LC.LineStyle.Dashed,
        axisLabelVisible: true,
        title: '70'
      });
      tvState.rsiLine.createPriceLine({
        price: 30,
        color: 'rgba(16, 185, 129, 0.4)',
        lineWidth: 1,
        lineStyle: LC.LineStyle.Dashed,
        axisLabelVisible: true,
        title: '30'
      });
      tvState.rsiLine.setData(uniqueCandles.map((c, i) => ({
        time: c.time,
        value: tech.rsiSeries[i] || 50
      })));
    } else {
      tvState.macdHist = tvState.subChart.addHistogramSeries({
        title: 'MACD Histogram'
      });
      tvState.macdHist.setData(uniqueCandles.map((c, i) => {
        const val = tech.macdHistSeries[i] || 0;
        return {
          time: c.time,
          value: val,
          color: val >= 0 ? 'rgba(16, 185, 129, 0.75)' : 'rgba(244, 63, 94, 0.75)'
        };
      }));
    }

    // Fit content if symbol or timeframe changed
    if (tvState.lastSymbol !== state.selectedSymbol || tvState.lastTimeframe !== state.timeframe) {
      tvState.mainChart.timeScale().fitContent();
      tvState.lastSymbol = state.selectedSymbol;
      tvState.lastTimeframe = state.timeframe;
    }

    // Update HUD defaults
    const lastC = uniqueCandles[uniqueCandles.length - 1];
    state.hudData = {
      open: lastC?.open,
      high: lastC?.high,
      low: lastC?.low,
      close: lastC?.close,
      volume: lastC?.volume,
      ema9: tech.ema9,
      ema21: tech.ema21,
      vwap: tech.vwap
    };
    updateHUDBar();
    nativeLog('CHART_OK: candles=' + uniqueCandles.length + ' canvases=' + mainContainer.querySelectorAll('canvas').length + ' w=' + mainContainer.clientWidth + ' h=' + mainContainer.clientHeight);
  }

  function updateFastDOMOnTick(sym) {
    const watchPriceEl = document.getElementById('watch-price-' + sym);
    const watchChgEl = document.getElementById('watch-chg-' + sym);
    const t = state.tickers[sym];
    if (watchPriceEl && t) watchPriceEl.textContent = formatPrice(t.price);
    if (watchChgEl && t) {
      const isPos = t.changePct24h >= 0;
      watchChgEl.textContent = (isPos ? '+' : '') + t.changePct24h.toFixed(2) + '%';
      watchChgEl.className = 'watch-chg ' + (isPos ? 'pos' : 'neg');
    }
    const tickStatusEl = document.getElementById('rk-tick-status');
    if (tickStatusEl) {
      tickStatusEl.textContent = 'LIVE STREAM (' + state.ticksCount.toLocaleString() + ' ticks)';
    }
    if (sym === state.selectedSymbol && state.activeTab === 'DASHBOARD') {
      const heroPriceEl = document.getElementById('rk-hero-price');
      if (heroPriceEl && t) heroPriceEl.textContent = formatPrice(t.price);
      updateHUDBar();
    }
  }

  function formatAgo(ts) {
    const min = Math.max(1, Math.floor((Date.now() - ts) / 60000));
    if (min < 60) return min + 'm ago';
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  }

  // --- 9. RENDER UI ---
  function renderPredictionCardHTML(sig) {
    const isBull = sig.compositeScore >= 15;
    const isBear = sig.compositeScore <= -15;
    const badgeCls = isBull ? 'signal-badge bull' : isBear ? 'signal-badge bear' : 'signal-badge neutral';
    const barColor = isBull ? '#10B981' : isBear ? '#F43F5E' : '#F59E0B';

    return `
      <div class="prediction-card">
        <div class="pred-header">
          <div>
            <div class="pred-eyebrow">GOOD-FAITH QUANT + CATALYST ENGINE • ${sig.timeframe.toUpperCase()}</div>
            <h3 class="pred-title">${sig.symbol}/USD Intelligence Forecast</h3>
          </div>
          <div class="${badgeCls}">${sig.direction}</div>
        </div>

        <div class="pred-metrics-row">
          <div class="pred-stat-box">
            <span class="stat-label">Composite Edge</span>
            <span class="stat-val ${sig.compositeScore > 0 ? 'pos' : sig.compositeScore < 0 ? 'neg' : ''}">
              ${sig.compositeScore > 0 ? '+' : ''}${sig.compositeScore} / 100
            </span>
          </div>
          <div class="pred-stat-box">
            <span class="stat-label">Model Confidence</span>
            <span class="stat-val">${sig.confidence}%</span>
            <div class="mini-meter"><div class="mini-meter-fill" style="width:${sig.confidence}%;background:${barColor}"></div></div>
          </div>
          <div class="pred-stat-box">
            <span class="stat-label">Risk / Reward</span>
            <span class="stat-val">1 : ${sig.riskRewardRatio}</span>
          </div>
          <div class="pred-stat-box">
            <span class="stat-label">Market Regime</span>
            <span class="stat-val regime-text">${escapeHtml(sig.regime)}</span>
          </div>
        </div>

        ${!sig.actionable && sig.skipReason ? `<div class="good-faith-warning"><strong>Good-Faith Capital Guardrail:</strong> ${escapeHtml(sig.skipReason)}</div>` : ''}

        <div class="trade-levels-grid">
          <div class="level-cell entry">
            <span class="level-label">Optimal Entry Zone</span>
            <strong class="level-price">${formatPrice(sig.entryZone[0])} – ${formatPrice(sig.entryZone[1])}</strong>
            <span class="level-sub">${escapeHtml(sig.horizonText)}</span>
          </div>
          <div class="level-cell tp1">
            <span class="level-label">Take-Profit 1 (1.65R)</span>
            <strong class="level-price">${formatPrice(sig.takeProfit1)}</strong>
            <span class="level-sub">${sig.expectedMovePct > 0 ? '+' : ''}${sig.expectedMovePct}% target</span>
          </div>
          <div class="level-cell tp2">
            <span class="level-label">Take-Profit 2 (Runner)</span>
            <strong class="level-price">${formatPrice(sig.takeProfit2)}</strong>
            <span class="level-sub">2.75R extension</span>
          </div>
          <div class="level-cell sl">
            <span class="level-label">Hard Stop / Invalidation</span>
            <strong class="level-price">${formatPrice(sig.stopLoss)}</strong>
            <span class="level-sub">1.35x ATR structure stop</span>
          </div>
        </div>

        <div class="pillars-section">
          <div class="section-subtitle">
            <span>5-Pillar Signal Attribution</span>
            <span>Based on ${sig.catalystsUsed} live internet catalysts</span>
          </div>
          <div class="pillars-list">
            ${sig.pillars.map(p => {
              const c = p.score >= 14 ? '#10B981' : p.score <= -14 ? '#F43F5E' : '#94A3B8';
              return `
                <div class="pillar-row">
                  <div class="pillar-top">
                    <span class="pillar-name">${escapeHtml(p.name)} <small>(${Math.round(p.weight * 100)}% wt)</small></span>
                    <span class="pillar-metric">${escapeHtml(p.metricText)}</span>
                    <span class="pillar-score" style="color:${c}">${p.score > 0 ? '+' : ''}${p.score}</span>
                  </div>
                  <div class="pillar-bar-track"><div class="pillar-bar-fill" style="width:${Math.min(100, Math.abs(p.score))}%;background:${c}"></div></div>
                  <div class="pillar-desc">${escapeHtml(p.summary)}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="thesis-columns">
          <div class="thesis-box bull">
            <h4>▲ Bullish Confluence</h4>
            <ul>${sig.bullThesis.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
          </div>
          <div class="thesis-box bear">
            <h4>▼ Bearish Risks & Headwinds</h4>
            <ul>${sig.bearThesis.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
          </div>
        </div>

        <div class="invalidation-footer">
          <div class="inv-text"><strong>Invalidation Trigger:</strong> ${escapeHtml(sig.invalidationCondition)}</div>
          <button class="paper-exec-btn" data-action="quick-sim-trade">
            Simulate ${sig.compositeScore >= 0 ? 'LONG' : 'SHORT'} in Paper Trader ▸
          </button>
        </div>
      </div>
    `;
  }

  function renderInternetScannerHTML() {
    const filtered = state.catalysts.filter(item => {
      if (state.scannerFilter === 'COIN') return item.affectedCoins.includes(state.selectedSymbol) || item.affectedCoins.includes('MARKET');
      if (state.scannerFilter === 'MACRO') return item.category === 'macro-economy';
      if (state.scannerFilter === 'ETF') return item.category === 'regulatory-etf';
      if (state.scannerFilter === 'REDDIT') return item.category === 'social-reddit';
      if (state.scannerFilter === 'HIGH') return item.impactLevel === 'HIGH';
      return true;
    });

    const bullCount = filtered.filter(c => c.sentimentLabel === 'BULLISH').length;
    const bearCount = filtered.filter(c => c.sentimentLabel === 'BEARISH').length;
    const netPulse = filtered.length ? Math.round(filtered.reduce((s, c) => s + c.sentimentScore, 0) / filtered.length) : 0;

    return `
      <div class="scanner-panel">
        <div class="scanner-header">
          <div>
            <div class="pred-eyebrow">LIVE WEB • RSS • GOOGLE NEWS MACRO • REDDIT PULSE</div>
            <h3 class="pred-title">Internet Catalyst & Sentiment Feed</h3>
          </div>
          <button class="scan-btn" data-action="refresh-scan">${state.isScanning ? 'Scanning Web…' : '↻ Scan Live Internet'}</button>
        </div>

        <div class="scanner-summary-bar">
          <div class="pulse-pill">
            <span>Fear & Greed:</span>
            <strong style="color:${state.fearGreed.value >= 55 ? '#10B981' : state.fearGreed.value <= 40 ? '#F43F5E' : '#F59E0B'}">
              ${state.fearGreed.value} (${escapeHtml(state.fearGreed.classification)})
            </strong>
          </div>
          <div class="pulse-pill">
            <span>Net Web Sentiment:</span>
            <strong class="${netPulse > 5 ? 'pos' : netPulse < -5 ? 'neg' : ''}">${netPulse > 0 ? '+' : ''}${netPulse}</strong>
          </div>
          <div class="pulse-pill">
            <span class="pos">▲ ${bullCount} Bullish</span> • <span class="neg">▼ ${bearCount} Bearish</span>
          </div>
          <div class="pulse-pill">Updated ${formatAgo(state.lastScanTime)}</div>
        </div>

        <form class="web-search-row" id="rk-web-search-form">
          <input type="text" class="web-search-input" id="rk-web-search-input" value="${escapeHtml(state.searchQuery)}" placeholder="Search live internet for market catalysts (e.g. 'Fed rate cut', 'Solana ETF', 'CPI inflation')…" />
          <button type="submit" class="web-search-submit">Search Web</button>
        </form>

        <div class="scanner-filter-tabs">
          ${[
            ['ALL', 'All Feeds (' + state.catalysts.length + ')'],
            ['COIN', state.selectedSymbol + ' & Macro'],
            ['HIGH', '⚡ High Impact'],
            ['MACRO', '🏛 Macro / Fed'],
            ['ETF', '⚖ SEC / ETFs'],
            ['REDDIT', '💬 Social / Reddit']
          ].map(([k, lbl]) => `<button class="filter-tab ${state.scannerFilter === k ? 'active' : ''}" data-filter="${k}">${lbl}</button>`).join('')}
        </div>

        <div class="catalyst-feed-list">
          ${filtered.map(item => {
            const isB = item.sentimentLabel === 'BULLISH';
            const isBr = item.sentimentLabel === 'BEARISH';
            return `
              <div class="catalyst-item ${item.impactLevel === 'HIGH' ? 'high-impact' : ''}">
                <div class="catalyst-meta">
                  <span class="catalyst-source">${escapeHtml(item.source)}</span>
                  <span class="catalyst-time">${formatAgo(item.publishedAt)}</span>
                  ${item.impactLevel === 'HIGH' ? '<span class="impact-badge">HIGH IMPACT</span>' : ''}
                  <span class="sent-badge ${isB ? 'bull' : isBr ? 'bear' : 'neutral'}">
                    ${item.sentimentLabel} (${item.sentimentScore > 0 ? '+' : ''}${item.sentimentScore})
                  </span>
                </div>
                <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer" class="catalyst-title">${escapeHtml(item.title)}</a>
                ${item.summary && item.summary !== item.title ? `<p class="catalyst-summary">${escapeHtml(item.summary)}</p>` : ''}
                <div class="catalyst-tags">
                  ${item.affectedCoins.map(c => `<button class="coin-tag ${c === state.selectedSymbol ? 'selected' : ''}" data-select-coin="${c}">${c === 'MARKET' ? '🌐 MACRO / MARKET' : '$' + c}</button>`).join('')}
                  ${item.matchedKeywords.map(kw => `<span class="kw-tag">${escapeHtml(kw)}</span>`).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderPaperTraderHTML(pred, livePrice) {
    const openPositions = state.positions.filter(p => !p.closedAt);
    const closedPositions = state.positions.filter(p => p.closedAt);

    let totalUnrealizedPnl = 0, totalMargin = 0;
    for (let i = 0; i < openPositions.length; i++) {
      const pos = openPositions[i];
      const mark = (state.tickers[pos.symbol] && state.tickers[pos.symbol].price) || pos.entryPrice;
      const diff = pos.side === 'LONG' ? mark - pos.entryPrice : pos.entryPrice - mark;
      totalUnrealizedPnl += diff * pos.sizeCoins;
      totalMargin += pos.notionalUsd;
    }
    const totalRealizedPnl = closedPositions.reduce((s, p) => s + (p.realizedPnl || 0), 0);
    const totalEquity = state.cashBalance + totalMargin + totalUnrealizedPnl;
    const wins = closedPositions.filter(p => (p.realizedPnl || 0) > 0).length;
    const winRate = closedPositions.length ? Math.round((wins / closedPositions.length) * 100) : 0;

    if (!state.paperStopLoss) syncPaperInputsToPrediction();
    const slNum = parseFloat(state.paperStopLoss) || livePrice * 0.98;
    const tpNum = parseFloat(state.paperTakeProfit) || livePrice * 1.03;
    const stopDist = Math.max(Math.abs(livePrice - slNum), livePrice * 0.002);
    const maxRiskUsd = (totalEquity * state.paperRiskPct) / 100;
    const cappedNotional = Math.min((maxRiskUsd / stopDist) * livePrice, state.cashBalance * 0.95);
    const sizeCoins = cappedNotional / Math.max(livePrice, 0.00001);
    const estRewardUsd = Math.abs(tpNum - livePrice) * sizeCoins;

    return `
      <div class="paper-trader-panel">
        <div class="pred-header">
          <div>
            <div class="pred-eyebrow">PAPER TRADING SIMULATOR & RISK-SIZED EXECUTION</div>
            <h3 class="pred-title">Simulated Portfolio & Prediction Scorecard</h3>
          </div>
          <button class="reset-acct-btn" data-action="reset-paper">Reset $100k Sim</button>
        </div>

        <div class="portfolio-stats-grid">
          <div class="port-stat">
            <span class="stat-label">Simulated Equity</span>
            <strong class="stat-val">${formatPrice(totalEquity)}</strong>
          </div>
          <div class="port-stat">
            <span class="stat-label">Unrealized PnL</span>
            <strong class="stat-val ${totalUnrealizedPnl > 0 ? 'pos' : totalUnrealizedPnl < 0 ? 'neg' : ''}">
              ${totalUnrealizedPnl >= 0 ? '+' : ''}${formatPrice(totalUnrealizedPnl)}
            </strong>
          </div>
          <div class="port-stat">
            <span class="stat-label">Realized PnL</span>
            <strong class="stat-val ${totalRealizedPnl > 0 ? 'pos' : totalRealizedPnl < 0 ? 'neg' : ''}">
              ${totalRealizedPnl >= 0 ? '+' : ''}${formatPrice(totalRealizedPnl)}
            </strong>
          </div>
          <div class="port-stat">
            <span class="stat-label">Win Rate (${closedPositions.length})</span>
            <strong class="stat-val">${winRate}%</strong>
          </div>
        </div>

        <div class="order-ticket-box">
          <div class="ticket-top">
            <div class="side-toggle">
              <button class="side-btn long ${state.paperSide === 'LONG' ? 'active' : ''}" data-paper-side="LONG">LONG ${state.selectedSymbol}</button>
              <button class="side-btn short ${state.paperSide === 'SHORT' ? 'active' : ''}" data-paper-side="SHORT">SHORT ${state.selectedSymbol}</button>
            </div>
            <button class="sync-ai-btn" data-action="sync-ai-levels">⚡ Sync AI Levels</button>
          </div>

          <div class="ticket-inputs-row">
            <div class="input-field">
              <label>Account Risk %</label>
              <div class="risk-pills">
                ${[0.5, 1.0, 2.0].map(r => `<button type="button" class="risk-pill ${state.paperRiskPct === r ? 'active' : ''}" data-risk-pct="${r}">${r}%</button>`).join('')}
              </div>
            </div>
            <div class="input-field">
              <label>Stop-Loss ($)</label>
              <input type="number" step="any" id="rk-sl-input" value="${state.paperStopLoss}" />
            </div>
            <div class="input-field">
              <label>Take-Profit ($)</label>
              <input type="number" step="any" id="rk-tp-input" value="${state.paperTakeProfit}" />
            </div>
          </div>

          <div class="sizing-preview">
            <span>Auto-Sized Position: <strong>${sizeCoins.toFixed(4)} ${state.selectedSymbol} (${formatPrice(cappedNotional)})</strong></span>
            <span>Max Stop Loss: <strong class="neg">-${formatPrice(maxRiskUsd)}</strong></span>
            <span>Target Gain: <strong class="pos">+${formatPrice(estRewardUsd)}</strong></span>
          </div>

          <button class="place-order-btn ${state.paperSide.toLowerCase()}" data-action="open-paper-order">
            Open Paper ${state.paperSide} @ ${formatPrice(livePrice)}
          </button>
        </div>

        <div class="positions-section">
          <div class="section-subtitle">
            <span>Active Paper Positions (${openPositions.length})</span>
            <span>Auto-triggers TP/SL on live WebSocket ticks</span>
          </div>
          ${openPositions.length === 0 ? `<div class="empty-positions">No active paper positions. Click "Simulate in Paper Trader" on any prediction card or open a position above.</div>` : `
            <div class="positions-list">
              ${openPositions.map(pos => {
                const mark = (state.tickers[pos.symbol] && state.tickers[pos.symbol].price) || pos.entryPrice;
                const diff = pos.side === 'LONG' ? mark - pos.entryPrice : pos.entryPrice - mark;
                const pnlUsd = diff * pos.sizeCoins;
                const pnlPct = (pnlUsd / Math.max(pos.notionalUsd, 1)) * 100;
                const isEditing = state.editingPosId === pos.id;
                return `
                  <div class="position-row">
                    <div class="pos-main">
                      <span class="pos-badge ${pos.side === 'LONG' ? 'long' : 'short'}">${pos.side}</span>
                      <strong>${pos.symbol}/USD</strong>
                      <span class="pos-size">${pos.sizeCoins.toFixed(4)} (${formatPrice(pos.notionalUsd)})</span>
                    </div>
                    <div class="pos-prices">
                      <span>Entry: ${formatPrice(pos.entryPrice)}</span>
                      <span>Mark: ${formatPrice(mark)}</span>
                      <span class="neg">SL: ${formatPrice(pos.stopLoss)}</span>
                      <span class="pos">TP: ${formatPrice(pos.takeProfit)}</span>
                    </div>
                    <div class="pos-pnl-col">
                      <strong class="${pnlUsd >= 0 ? 'pos' : 'neg'}">${pnlUsd >= 0 ? '+' : ''}${formatPrice(pnlUsd)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)</strong>
                      <button class="modify-sl-tp-btn" data-modify-pos="${pos.id}">Modify SL/TP</button>
                      <button class="close-pos-btn" data-close-pos="${pos.id}">Close @ Market</button>
                    </div>
                  </div>
                  ${isEditing ? `
                    <div class="pos-edit-box">
                      <div class="pos-edit-row">
                        <div class="pos-edit-field">
                          <label>Adjust Stop Loss ($)</label>
                          <input type="number" step="any" id="rk-edit-sl-input" value="${state.editSlVal}" />
                          <div class="pos-edit-pills">
                            <button type="button" class="pos-quick-pill" data-pill-sl="be" data-pos-id="${pos.id}">Break-Even (${formatPrice(pos.entryPrice)})</button>
                            <button type="button" class="pos-quick-pill" data-pill-sl="neg15" data-pos-id="${pos.id}">-1.5% Mark</button>
                            <button type="button" class="pos-quick-pill" data-pill-sl="neg30" data-pos-id="${pos.id}">-3.0% Mark</button>
                          </div>
                        </div>
                        <div class="pos-edit-field">
                          <label>Adjust Take Profit ($)</label>
                          <input type="number" step="any" id="rk-edit-tp-input" value="${state.editTpVal}" />
                          <div class="pos-edit-pills">
                            <button type="button" class="pos-quick-pill" data-pill-tp="pos20" data-pos-id="${pos.id}">+2% Mark</button>
                            <button type="button" class="pos-quick-pill" data-pill-tp="pos50" data-pos-id="${pos.id}">+5% Mark</button>
                          </div>
                        </div>
                      </div>
                      <div class="pos-edit-actions">
                        <button type="button" class="cancel-targets-btn" data-action="cancel-edit-pos">Cancel</button>
                        <button type="button" class="save-targets-btn" data-action="save-edit-pos" data-pos-id="${pos.id}">Save Targets</button>
                      </div>
                    </div>
                  ` : ''}
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  function renderHeroBarHTML() {
    const { tech, livePrice } = getActivePrediction();
    const curTicker = state.tickers[state.selectedSymbol] || { name: state.selectedSymbol, changePct24h: 0, high24h: livePrice, low24h: livePrice };
    return `
      <div class="hero-left">
        <h2>${escapeHtml(curTicker.name)} <span>(${state.selectedSymbol}/USD)</span></h2>
        <div class="hero-price-row">
          <span class="hero-price" id="rk-hero-price">${formatPrice(livePrice)}</span>
          <span class="hero-chg ${curTicker.changePct24h >= 0 ? 'pos' : 'neg'}" id="rk-hero-chg">
            ${curTicker.changePct24h >= 0 ? '▲ +' : '▼ '}${curTicker.changePct24h.toFixed(2)}%
          </span>
        </div>
      </div>
      <div class="hero-stats">
        <div><small>24h High</small><strong id="rk-hero-high">${formatPrice(curTicker.high24h || livePrice)}</strong></div>
        <div><small>24h Low</small><strong id="rk-hero-low">${formatPrice(curTicker.low24h || livePrice)}</strong></div>
        <div><small>RSI (14)</small><strong class="${tech.rsi14 > 70 ? 'neg' : tech.rsi14 < 30 ? 'pos' : ''}">${tech.rsi14.toFixed(1)}</strong></div>
        <div><small>Buy Pressure</small><strong class="${tech.buyPressurePct >= 52 ? 'pos' : tech.buyPressurePct <= 48 ? 'neg' : ''}">${tech.buyPressurePct.toFixed(0)}%</strong></div>
        <div><small>Support / Res</small><strong>${formatPrice(tech.support)} / ${formatPrice(tech.resistance)}</strong></div>
      </div>
    `;
  }

  function renderChartToolbarHTML() {
    return `
      <div class="timeframe-group">
        ${['1m', '5m', '15m', '1h', '4h', '1d'].map(tf => `<button type="button" class="tf-btn ${state.timeframe === tf ? 'active' : ''}" data-tf="${tf}">${tf.toUpperCase()}</button>`).join('')}
      </div>
      <div class="indicator-toggles">
        <button type="button" class="ind-chip ${state.chartShowEMA ? 'on' : ''}" data-toggle="ema"><span class="dot ema-dot"></span> EMA 9/21/50</button>
        <button type="button" class="ind-chip ${state.chartShowBB ? 'on' : ''}" data-toggle="bb"><span class="dot bb-dot"></span> Bollinger</button>
        <button type="button" class="ind-chip ${state.chartShowVWAP ? 'on' : ''}" data-toggle="vwap"><span class="dot vwap-dot"></span> VWAP</button>
        <button type="button" class="ind-chip ${state.chartShowTargets ? 'on' : ''}" data-toggle="targets"><span class="dot target-dot"></span> AI Targets</button>
        <button type="button" class="ind-chip on" data-toggle="subpane">Oscillator: ${state.chartSubPane}</button>
        <button type="button" class="ind-chip reset-btn" data-action="fit-chart">Fit View</button>
        <button type="button" class="ind-chip reset-btn" data-action="live-edge">Live Edge ▸</button>
      </div>
    `;
  }

  function renderWatchlistItemsHTML() {
    return COINS.map(coin => {
      const t = state.tickers[coin.symbol] || { price: 0, changePct24h: 0 };
      const isPos = t.changePct24h >= 0;
      return `
        <button type="button" class="watch-item ${coin.symbol === state.selectedSymbol ? 'selected' : ''}" data-watch-coin="${coin.symbol}">
          <div class="watch-left">
            <span class="coin-badge-dot" style="background:${coin.color}"></span>
            <div>
              <div class="watch-sym">${coin.symbol}</div>
              <div class="watch-name">${coin.name}</div>
            </div>
          </div>
          <div class="watch-right">
            <div class="watch-price" id="watch-price-${coin.symbol}">${formatPrice(t.price)}</div>
            <div class="watch-chg ${isPos ? 'pos' : 'neg'}" id="watch-chg-${coin.symbol}">${isPos ? '+' : ''}${t.changePct24h.toFixed(2)}%</div>
          </div>
        </button>
      `;
    }).join('');
  }

  function renderRadarHTML() {
    return `
      <div class="radar-panel">
        <div class="pred-header">
          <div>
            <div class="pred-eyebrow">CROSS-MARKET QUANTITATIVE & INTERNET SENTIMENT MATRIX</div>
            <h3 class="pred-title">All-Coin Good-Faith Opportunity Radar</h3>
          </div>
        </div>
        <table class="radar-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Live Price</th>
              <th>24h Change</th>
              <th>Internet Mentions</th>
              <th>Net Web Sentiment</th>
              <th>Suggested Bias</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${COINS.map(c => {
              const t = state.tickers[c.symbol] || { price: 0, changePct24h: 0 };
              const cats = state.catalysts.filter(x => x.affectedCoins.includes(c.symbol));
              const avgS = cats.length ? Math.round(cats.reduce((s, x) => s + x.sentimentScore, 0) / cats.length) : 0;
              const comb = Math.round(t.changePct24h * 4.5 + avgS * 0.65);
              const dir = comb >= 18 ? 'BULLISH BIAS' : comb <= -18 ? 'BEARISH BIAS' : 'NEUTRAL / RANGE';
              return `
                <tr>
                  <td><strong>${c.symbol}</strong> <span style="color:#64748b">${c.name}</span></td>
                  <td class="mono">${formatPrice(t.price)}</td>
                  <td class="mono ${t.changePct24h >= 0 ? 'pos' : 'neg'}">${t.changePct24h >= 0 ? '+' : ''}${t.changePct24h.toFixed(2)}%</td>
                  <td>${cats.length} articles/posts</td>
                  <td class="mono ${avgS > 5 ? 'pos' : avgS < -5 ? 'neg' : ''}">${avgS > 0 ? '+' : ''}${avgS}</td>
                  <td><span class="sent-badge ${comb >= 18 ? 'bull' : comb <= -18 ? 'bear' : 'neutral'}">${dir}</span></td>
                  <td><button type="button" class="tf-btn active" data-radar-coin="${c.symbol}">Inspect Chart & Thesis ▸</button></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function bindSearchForm() {
    const searchForm = document.getElementById('rk-web-search-form');
    if (searchForm) {
      searchForm.onsubmit = (e) => {
        e.preventDefault();
        const inp = document.getElementById('rk-web-search-input');
        state.searchQuery = inp ? inp.value : '';
        scanInternetFeeds(state.searchQuery);
      };
    }
  }

  function bindPaperInputs() {
    const slInp = document.getElementById('rk-sl-input');
    if (slInp) slInp.oninput = (e) => { state.paperStopLoss = e.target.value; };
    const tpInp = document.getElementById('rk-tp-input');
    if (tpInp) tpInp.oninput = (e) => { state.paperTakeProfit = e.target.value; };

    const editSlInp = document.getElementById('rk-edit-sl-input');
    if (editSlInp) editSlInp.oninput = (e) => { state.editSlVal = e.target.value; };
    const editTpInp = document.getElementById('rk-edit-tp-input');
    if (editTpInp) editTpInp.oninput = (e) => { state.editTpVal = e.target.value; };
  }

  function updateTabsDOM() {
    const tab = state.activeTab;
    const navBtns = document.querySelectorAll('.main-nav .nav-btn');
    for (let i = 0; i < navBtns.length; i++) {
      navBtns[i].classList.toggle('active', navBtns[i].dataset.tab === tab);
    }
    const dash = document.getElementById('view-dashboard');
    const radar = document.getElementById('view-radar');
    const internet = document.getElementById('view-internet');
    const paper = document.getElementById('view-paper');

    if (dash) dash.style.display = (tab === 'DASHBOARD' ? 'grid' : 'none');
    if (radar) radar.style.display = (tab === 'RADAR' ? 'block' : 'none');
    if (internet) internet.style.display = (tab === 'INTERNET' ? 'block' : 'none');
    if (paper) paper.style.display = (tab === 'PAPER' ? 'block' : 'none');
  }

  function updateWatchlistSelection() {
    const items = document.querySelectorAll('.watch-item');
    for (let i = 0; i < items.length; i++) {
      items[i].classList.toggle('selected', items[i].dataset.watchCoin === state.selectedSymbol);
    }
  }

  function updateNavCounters(openCount) {
    const paperBtn = document.querySelector('.main-nav [data-tab="PAPER"]');
    if (paperBtn) paperBtn.textContent = '⚡ Paper Trader (' + openCount + ')';
    const netBtn = document.querySelector('.main-nav [data-tab="INTERNET"]');
    if (netBtn) netBtn.textContent = '🌐 Internet Catalyst Scanner (' + state.catalysts.length + ')';
  }

  function initAppShellOnce() {
    const root = document.getElementById('root');
    if (!root || document.getElementById('view-dashboard')) return;

    const { pred, livePrice } = getActivePrediction();
    const openCount = state.positions.filter(p => !p.closedAt).length;

    root.innerHTML = `
      <div class="app-shell">
        <header class="top-bar">
          <div class="brand-group">
            <div class="brand-orb"></div>
            <div>
              <div class="brand-title">RADIANT KEPLER</div>
              <div class="brand-sub">Real-Time Crypto Intelligence & Good-Faith Prediction Terminal</div>
            </div>
          </div>

          <nav class="main-nav">
            <button type="button" class="nav-btn ${state.activeTab === 'DASHBOARD' ? 'active' : ''}" data-tab="DASHBOARD">◈ Command Dashboard</button>
            <button type="button" class="nav-btn ${state.activeTab === 'RADAR' ? 'active' : ''}" data-tab="RADAR">◎ Market Opportunity Radar</button>
            <button type="button" class="nav-btn ${state.activeTab === 'INTERNET' ? 'active' : ''}" data-tab="INTERNET">🌐 Internet Catalyst Scanner (${state.catalysts.length})</button>
            <button type="button" class="nav-btn ${state.activeTab === 'PAPER' ? 'active' : ''}" data-tab="PAPER">⚡ Paper Trader (${openCount})</button>
          </nav>

          <div class="status-cluster">
            <div class="status-pill">
              <span class="live-dot ${state.wsConnected ? 'online' : 'connecting'}"></span>
              <span id="rk-tick-status">${state.wsConnected ? 'LIVE STREAM (' + state.ticksCount.toLocaleString() + ' ticks)' : 'CONNECTING STREAM…'}</span>
            </div>
            <div class="status-pill">
              <span>F&G Index:</span>
              <strong id="rk-fg-stat">${state.fearGreed.value} (${escapeHtml(state.fearGreed.classification)})</strong>
            </div>
          </div>
        </header>

        <div class="workspace-body">
          <aside class="watchlist-sidebar">
            <div class="sidebar-header"><span>LIVE WATCHLIST (USD)</span><small>24H %</small></div>
            <div class="watchlist-scroll" id="rk-watchlist-scroll">
              ${renderWatchlistItemsHTML()}
            </div>
            <div class="sidebar-footer-box">
              <div class="sf-title">Good-Faith Trading Principle</div>
              <p>Signals combine 5 transparent pillars: EMA/VWAP Trend, RSI/MACD Momentum, Orderflow Delta, Live Web News, and Macro Regime. Never risk &gt;1–2% per trade.</p>
            </div>
          </aside>

          <main id="view-dashboard" class="dashboard-grid tab-view-pane" style="display: grid;">
            <div class="center-column">
              <div class="coin-hero-bar" id="rk-hero-bar">
                ${renderHeroBarHTML()}
              </div>

              <div class="chart-panel">
                <div class="chart-toolbar" id="rk-chart-toolbar">
                  ${renderChartToolbarHTML()}
                </div>
                <div class="chart-hud-bar" id="rk-chart-hud"></div>
                <div class="tv-chart-wrapper">
                  <div id="tv-main-container" class="tv-main-chart"></div>
                  <div id="tv-sub-container" class="tv-sub-chart"></div>
                </div>
              </div>

              <div id="rk-paper-box">
                ${renderPaperTraderHTML(pred, livePrice)}
              </div>
            </div>

            <div class="right-column">
              <div id="rk-pred-box">
                ${renderPredictionCardHTML(pred)}
              </div>
              <div id="rk-scanner-box">
                ${renderInternetScannerHTML()}
              </div>
            </div>
          </main>

          <main id="view-radar" class="full-tab-view tab-view-pane" style="display: none;"></main>
          <main id="view-internet" class="full-tab-view tab-view-pane" style="display: none;"></main>
          <main id="view-paper" class="full-tab-view tab-view-pane" style="display: none;"></main>
        </div>
      </div>
    `;
  }

  function renderAll() {
    initAppShellOnce();

    const { tech, pred, livePrice } = getActivePrediction();
    const openCount = state.positions.filter(p => !p.closedAt).length;

    // 1. Update Tab views
    updateTabsDOM();

    // 2. Update dynamic panels
    const heroBar = document.getElementById('rk-hero-bar');
    if (heroBar) heroBar.innerHTML = renderHeroBarHTML();

    const chartToolbar = document.getElementById('rk-chart-toolbar');
    if (chartToolbar) chartToolbar.innerHTML = renderChartToolbarHTML();

    const paperBox = document.getElementById('rk-paper-box');
    if (paperBox) paperBox.innerHTML = renderPaperTraderHTML(pred, livePrice);

    const predBox = document.getElementById('rk-pred-box');
    if (predBox) predBox.innerHTML = renderPredictionCardHTML(pred);

    const scannerBox = document.getElementById('rk-scanner-box');
    if (scannerBox) scannerBox.innerHTML = renderInternetScannerHTML();

    if (state.activeTab === 'RADAR') {
      const radarView = document.getElementById('view-radar');
      if (radarView) radarView.innerHTML = renderRadarHTML();
    } else if (state.activeTab === 'INTERNET') {
      const internetView = document.getElementById('view-internet');
      if (internetView) internetView.innerHTML = renderInternetScannerHTML();
    } else if (state.activeTab === 'PAPER') {
      const paperView = document.getElementById('view-paper');
      if (paperView) paperView.innerHTML = renderPaperTraderHTML(pred, livePrice);
    }

    // 3. Update Watchlist selection
    updateWatchlistSelection();

    // 4. Update Top Bar Nav counter
    updateNavCounters(openCount);

    // 5. Update TradingView Charts
    if (state.activeTab === 'DASHBOARD') {
      initOrUpdateTradingView(tech, pred);
    }

    bindSearchForm();
    bindPaperInputs();
  }

  // Global Event Delegation
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    e.preventDefault();

    if (btn.dataset.tab) {
      state.activeTab = btn.dataset.tab;
      renderAll();
      return;
    }
    if (btn.dataset.watchCoin) {
      state.selectedSymbol = btn.dataset.watchCoin;
      state.candles = generateFallbackCandles(state.selectedSymbol, state.timeframe);
      syncPaperInputsToPrediction();
      renderAll();
      loadCandles(state.selectedSymbol, state.timeframe);
      return;
    }
    if (btn.dataset.radarCoin) {
      state.selectedSymbol = btn.dataset.radarCoin;
      state.activeTab = 'DASHBOARD';
      state.candles = generateFallbackCandles(state.selectedSymbol, state.timeframe);
      syncPaperInputsToPrediction();
      renderAll();
      loadCandles(state.selectedSymbol, state.timeframe);
      return;
    }
    if (btn.dataset.tf) {
      state.timeframe = btn.dataset.tf;
      state.candles = generateFallbackCandles(state.selectedSymbol, state.timeframe);
      renderAll();
      loadCandles(state.selectedSymbol, state.timeframe);
      return;
    }
    if (btn.dataset.toggle) {
      const t = btn.dataset.toggle;
      if (t === 'ema') state.chartShowEMA = !state.chartShowEMA;
      if (t === 'bb') state.chartShowBB = !state.chartShowBB;
      if (t === 'vwap') state.chartShowVWAP = !state.chartShowVWAP;
      if (t === 'targets') state.chartShowTargets = !state.chartShowTargets;
      if (t === 'subpane') state.chartSubPane = state.chartSubPane === 'RSI' ? 'MACD' : 'RSI';
      renderAll();
      return;
    }
    if (btn.dataset.action === 'fit-chart') {
      if (tvState.mainChart) tvState.mainChart.timeScale().fitContent();
      return;
    }
    if (btn.dataset.action === 'live-edge') {
      if (tvState.mainChart) tvState.mainChart.timeScale().scrollToRealTime();
      return;
    }
    if (btn.dataset.filter) {
      state.scannerFilter = btn.dataset.filter;
      renderAll();
      return;
    }
    if (btn.dataset.selectCoin) {
      const c = btn.dataset.selectCoin;
      if (c && c !== 'MARKET') {
        state.selectedSymbol = c;
        state.activeTab = 'DASHBOARD';
        loadCandles(state.selectedSymbol, state.timeframe);
        renderAll();
      }
      return;
    }
    if (btn.dataset.paperSide) {
      state.paperSide = btn.dataset.paperSide;
      const { livePrice } = getActivePrediction();
      const dec = livePrice >= 10 ? 2 : 4;
      if (state.paperSide === 'LONG') {
        state.paperStopLoss = (livePrice * 0.982).toFixed(dec);
        state.paperTakeProfit = (livePrice * 1.032).toFixed(dec);
      } else {
        state.paperStopLoss = (livePrice * 1.018).toFixed(dec);
        state.paperTakeProfit = (livePrice * 0.968).toFixed(dec);
      }
      renderAll();
      return;
    }
    if (btn.dataset.riskPct) {
      state.paperRiskPct = parseFloat(btn.dataset.riskPct);
      renderAll();
      return;
    }
    if (btn.dataset.modifyPos) {
      const id = btn.dataset.modifyPos;
      const pos = state.positions.find(p => p.id === id);
      if (pos) {
        state.editingPosId = (state.editingPosId === id ? null : id);
        const dec = pos.entryPrice >= 10 ? 2 : 4;
        state.editSlVal = pos.stopLoss.toFixed(dec);
        state.editTpVal = pos.takeProfit.toFixed(dec);
        renderAll();
      }
      return;
    }
    if (btn.dataset.pillSl) {
      const id = btn.dataset.posId;
      const pos = state.positions.find(p => p.id === id);
      if (pos) {
        const mark = (state.tickers[pos.symbol] && state.tickers[pos.symbol].price) || pos.entryPrice;
        const dec = pos.entryPrice >= 10 ? 2 : 4;
        const type = btn.dataset.pillSl;
        if (type === 'be') {
          state.editSlVal = pos.entryPrice.toFixed(dec);
        } else if (type === 'neg15') {
          const v = pos.side === 'LONG' ? mark * 0.985 : mark * 1.015;
          state.editSlVal = v.toFixed(dec);
        } else if (type === 'neg30') {
          const v = pos.side === 'LONG' ? mark * 0.97 : mark * 1.03;
          state.editSlVal = v.toFixed(dec);
        }
        const slInp = document.getElementById('rk-edit-sl-input');
        if (slInp) slInp.value = state.editSlVal;
      }
      return;
    }
    if (btn.dataset.pillTp) {
      const id = btn.dataset.posId;
      const pos = state.positions.find(p => p.id === id);
      if (pos) {
        const mark = (state.tickers[pos.symbol] && state.tickers[pos.symbol].price) || pos.entryPrice;
        const dec = pos.entryPrice >= 10 ? 2 : 4;
        const type = btn.dataset.pillTp;
        if (type === 'pos20') {
          const v = pos.side === 'LONG' ? mark * 1.02 : mark * 0.98;
          state.editTpVal = v.toFixed(dec);
        } else if (type === 'pos50') {
          const v = pos.side === 'LONG' ? mark * 1.05 : mark * 0.95;
          state.editTpVal = v.toFixed(dec);
        }
        const tpInp = document.getElementById('rk-edit-tp-input');
        if (tpInp) tpInp.value = state.editTpVal;
      }
      return;
    }
    if (btn.dataset.closePos) {
      const id = btn.dataset.closePos;
      for (let i = 0; i < state.positions.length; i++) {
        const pos = state.positions[i];
        if (pos.id === id && !pos.closedAt) {
          const mark = (state.tickers[pos.symbol] && state.tickers[pos.symbol].price) || pos.entryPrice;
          const diff = pos.side === 'LONG' ? mark - pos.entryPrice : pos.entryPrice - mark;
          pos.closedAt = Date.now();
          pos.closePrice = mark;
          pos.closeReason = 'MANUAL';
          pos.realizedPnl = diff * pos.sizeCoins;
          state.cashBalance += pos.notionalUsd + pos.realizedPnl;
        }
      }
      savePaperState();
      renderAll();
      return;
    }

    const action = btn.dataset.action;
    if (action === 'refresh-scan') {
      scanInternetFeeds(state.searchQuery);
    } else if (action === 'sync-ai-levels') {
      syncPaperInputsToPrediction();
      renderAll();
    } else if (action === 'reset-paper') {
      state.cashBalance = 100000;
      state.positions = [];
      savePaperState();
      renderAll();
    } else if (action === 'open-paper-order' || action === 'quick-sim-trade') {
      const { pred, livePrice } = getActivePrediction();
      if (action === 'quick-sim-trade') {
        syncPaperInputsToPrediction();
      }
      const slNum = parseFloat(state.paperStopLoss) || pred.stopLoss;
      const tpNum = parseFloat(state.paperTakeProfit) || pred.takeProfit1;
      const stopDist = Math.max(Math.abs(livePrice - slNum), livePrice * 0.002);
      const maxRiskUsd = (state.cashBalance * state.paperRiskPct) / 100;
      const notional = Math.min((maxRiskUsd / stopDist) * livePrice, state.cashBalance * 0.95);
      if (notional >= 10) {
        state.cashBalance -= notional;
        state.positions.unshift({
          id: 'pos_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          symbol: state.selectedSymbol,
          side: state.paperSide,
          entryPrice: livePrice,
          sizeCoins: notional / livePrice,
          notionalUsd: notional,
          stopLoss: slNum,
          takeProfit: tpNum,
          openedAt: Date.now()
        });
        savePaperState();
        renderAll();
      }
    } else if (action === 'cancel-edit-pos') {
      state.editingPosId = null;
      renderAll();
    } else if (action === 'save-edit-pos') {
      const id = btn.dataset.posId;
      const pos = state.positions.find(p => p.id === id);
      const sl = parseFloat(state.editSlVal);
      const tp = parseFloat(state.editTpVal);
      if (pos && Number.isFinite(sl) && Number.isFinite(tp) && sl > 0 && tp > 0) {
        pos.stopLoss = sl;
        pos.takeProfit = tp;
        state.editingPosId = null;
        savePaperState();
        const { tech, pred } = getActivePrediction();
        initOrUpdateTradingView(tech, pred);
        renderAll();
      }
    }
  });

  // Boot
  syncPaperInputsToPrediction();
  renderAll();
  loadInitialTickers();
  loadCandles(state.selectedSymbol, state.timeframe);
  scanInternetFeeds();
  connectWebSockets();
  setInterval(() => scanInternetFeeds(state.searchQuery), 90000);
})();
"""

HTML_CONTENT = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Radiant Kepler — Crypto Market Intelligence & Good-Faith Predictions</title>
    <style>
{styles_css}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
{lc_standalone_js}
    </script>
    <script>
{APP_JS}
    </script>
  </body>
</html>
"""

os.makedirs(DIST_DIR, exist_ok=True)
with open(os.path.join(DIST_DIR, "index.html"), "w", encoding="utf-8") as f:
    f.write(HTML_CONTENT)

os.makedirs(APP_RES_DIST, exist_ok=True)
shutil.copyfile(
    os.path.join(DIST_DIR, "index.html"),
    os.path.join(APP_RES_DIST, "index.html"),
)
print("Successfully built dist/index.html with TradingView Lightweight Charts!")
