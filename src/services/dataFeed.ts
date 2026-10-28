import {
  Candle,
  CoinSymbol,
  FearGreedData,
  InternetCatalyst,
  TickerData,
  Timeframe,
} from '../types/market';
import {
  COINS,
  parseRedditJsonToCatalysts,
  parseRssXmlToCatalysts,
} from '../engine/sentiment';

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        nativeBridge?: {
          postMessage: (msg: unknown) => void;
        };
      };
    };
    __RK_NATIVE_CALLBACKS__?: Record<
      string,
      { resolve: (val: string) => void; reject: (err: Error) => void }
    >;
    __TAURI_INTERNALS__?: unknown;
  }
}

export async function nativeFetchText(url: string): Promise<string> {
  // 1. Native macOS WKWebView Bridge (RadiantKepler.app)
  if (window.webkit?.messageHandlers?.nativeBridge) {
    if (!window.__RK_NATIVE_CALLBACKS__) {
      window.__RK_NATIVE_CALLBACKS__ = {};
    }
    const reqId =
      'req_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (window.__RK_NATIVE_CALLBACKS__?.[reqId]) {
          delete window.__RK_NATIVE_CALLBACKS__[reqId];
          reject(new Error(`Timeout fetching ${url}`));
        }
      }, 9500);

      window.__RK_NATIVE_CALLBACKS__![reqId] = {
        resolve: (body: string) => {
          clearTimeout(timer);
          resolve(body);
        },
        reject: (err: Error) => {
          clearTimeout(timer);
          reject(err);
        },
      };

      window.webkit!.messageHandlers!.nativeBridge!.postMessage({
        id: reqId,
        action: 'fetch_url',
        url,
      });
    });
  }

  // 2. Tauri Rust IPC Backend
  if (window.__TAURI_INTERNALS__) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<string>('fetch_url_text', { url });
    } catch {
      // Fallback to standard fetch
    }
  }

  // 3. Direct Browser Fetch
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return await resp.text();
}

const BINANCE_INTERVAL_MAP: Record<Timeframe, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
};

const COINBASE_GRANULARITY_MAP: Record<Timeframe, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

export async function fetchCandles(
  symbol: CoinSymbol,
  timeframe: Timeframe
): Promise<Candle[]> {
  const meta = COINS.find((c) => c.symbol === symbol) || COINS[0];

  // Try 1: Binance Vision Public Market Data API (Global & US accessible, fast & accurate)
  try {
    const interval = BINANCE_INTERVAL_MAP[timeframe];
    const url = `https://data-api.binance.vision/api/v3/klines?symbol=${meta.binanceSymbol}&interval=${interval}&limit=300`;
    const rawText = await nativeFetchText(url);
    const data = JSON.parse(rawText);
    if (Array.isArray(data) && data.length > 10) {
      return data.map((row: (string | number)[]) => ({
        time: Math.floor(Number(row[0]) / 1000),
        open: parseFloat(String(row[1])),
        high: parseFloat(String(row[2])),
        low: parseFloat(String(row[3])),
        close: parseFloat(String(row[4])),
        volume: parseFloat(String(row[5])),
      }));
    }
  } catch {
    // Fallback to Coinbase Exchange API
  }

  // Try 2: Coinbase Exchange Public Candles API
  try {
    const gran = COINBASE_GRANULARITY_MAP[timeframe] || 3600;
    const url = `https://api.exchange.coinbase.com/products/${meta.coinbaseProduct}/candles?granularity=${gran}`;
    const rawText = await nativeFetchText(url);
    const data = JSON.parse(rawText);
    if (Array.isArray(data) && data.length > 10) {
      return data
        .slice(0, 300)
        .reverse()
        .map((row: number[]) => ({
          time: Number(row[0]),
          low: Number(row[1]),
          high: Number(row[2]),
          open: Number(row[3]),
          close: Number(row[4]),
          volume: Number(row[5]),
        }));
    }
  } catch {
    // Fallback
  }

  return generateFallbackCandles(symbol, timeframe);
}

const DEFAULT_BASE_PRICES: Record<CoinSymbol, number> = {
  BTC: 91450,
  ETH: 3180,
  SOL: 194.5,
  XRP: 1.48,
  BNB: 645,
  DOGE: 0.285,
  AVAX: 32.4,
  LINK: 18.6,
  SUI: 3.35,
  ADA: 0.78,
};

export function generateFallbackCandles(
  symbol: CoinSymbol,
  timeframe: Timeframe
): Candle[] {
  const base = DEFAULT_BASE_PRICES[symbol] || 100;
  const stepSec = COINBASE_GRANULARITY_MAP[timeframe] || 3600;
  const nowSec = Math.floor(Date.now() / 1000);
  const candles: Candle[] = [];
  let price = base * 0.965;
  let seed = symbol.charCodeAt(0) * 137 + timeframe.charCodeAt(0) * 31;

  for (let i = 240; i >= 0; i--) {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const r1 = seed / 4294967296 - 0.492;
    const change = price * r1 * 0.014;
    const open = price;
    const close = Math.max(base * 0.1, open + change);
    const wickUp = Math.abs(change) * 0.65 + price * 0.0025;
    const wickDown = Math.abs(change) * 0.55 + price * 0.0025;
    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDown;
    const volume = (base > 1000 ? 180 : 45000) * (0.6 + Math.abs(r1) * 2.5);
    candles.push({
      time: nowSec - i * stepSec,
      open,
      high,
      low,
      close,
      volume,
    });
    price = close;
  }
  return candles;
}

export async function fetchInitialTickers(): Promise<
  Record<CoinSymbol, TickerData>
> {
  const map = {} as Record<CoinSymbol, TickerData>;

  // Initialize defaults first
  for (const c of COINS) {
    const p = DEFAULT_BASE_PRICES[c.symbol];
    map[c.symbol] = {
      symbol: c.symbol,
      name: c.name,
      price: p,
      change24h: 0,
      changePct24h: 0,
      high24h: p * 1.02,
      low24h: p * 0.98,
      volume24h: 0,
      lastUpdated: Date.now(),
      sparkline: [p * 0.99, p * 0.995, p * 1.002, p],
      bid: p * 0.9998,
      ask: p * 1.0002,
      flash: null,
    };
  }

  try {
    const symbolsParam = encodeURIComponent(
      JSON.stringify(COINS.map((c) => c.binanceSymbol))
    );
    const url = `https://data-api.binance.vision/api/v3/ticker/24hr?symbols=${symbolsParam}`;
    const rawText = await nativeFetchText(url);
    const arr = JSON.parse(rawText);
    if (Array.isArray(arr)) {
      for (const item of arr) {
        const coin = COINS.find((c) => c.binanceSymbol === item.symbol);
        if (!coin) continue;
        const lastPrice = parseFloat(item.lastPrice);
        const priceChange = parseFloat(item.priceChange);
        const priceChangePct = parseFloat(item.priceChangePercent);
        const high = parseFloat(item.highPrice);
        const low = parseFloat(item.lowPrice);
        const quoteVol = parseFloat(item.quoteVolume);
        const openPrice = parseFloat(item.openPrice) || lastPrice;

        map[coin.symbol] = {
          symbol: coin.symbol,
          name: coin.name,
          price: lastPrice,
          change24h: priceChange,
          changePct24h: priceChangePct,
          high24h: high,
          low24h: low,
          volume24h: quoteVol,
          lastUpdated: Date.now(),
          sparkline: [
            openPrice,
            low + (high - low) * 0.35,
            low + (high - low) * 0.65,
            lastPrice,
          ],
          bid: parseFloat(item.bidPrice) || lastPrice * 0.9999,
          ask: parseFloat(item.askPrice) || lastPrice * 1.0001,
          flash: null,
        };
      }
    }
  } catch {
    // Will immediately populate from Coinbase WebSocket
  }

  return map;
}

const INTERNET_FEEDS: Array<{ name: string; url: string; type: 'rss' | 'reddit' }> = [
  {
    name: 'CoinDesk',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    type: 'rss',
  },
  {
    name: 'Cointelegraph',
    url: 'https://cointelegraph.com/rss',
    type: 'rss',
  },
  {
    name: 'Decrypt',
    url: 'https://decrypt.co/feed',
    type: 'rss',
  },
  {
    name: 'Macro & Fed Pulse (Google News)',
    url: 'https://news.google.com/rss/search?q=Federal+Reserve+OR+CPI+inflation+OR+Bitcoin+ETF+OR+SEC+crypto+when:2d&hl=en-US&gl=US&ceid=US:en',
    type: 'rss',
  },
  {
    name: 'CryptoCurrency',
    url: 'https://www.reddit.com/r/CryptoCurrency/hot.json?limit=12',
    type: 'reddit',
  },
];

export async function fetchAllInternetCatalysts(
  customQuery?: string
): Promise<InternetCatalyst[]> {
  const feedsToFetch = [...INTERNET_FEEDS];
  if (customQuery && customQuery.trim().length > 1) {
    const q = encodeURIComponent(customQuery.trim());
    feedsToFetch.unshift({
      name: `Web Search: "${customQuery.trim()}"`,
      url: `https://news.google.com/rss/search?q=${q}+when:7d&hl=en-US&gl=US&ceid=US:en`,
      type: 'rss',
    });
  }

  const results = await Promise.allSettled(
    feedsToFetch.map(async (feed) => {
      const text = await nativeFetchText(feed.url);
      if (feed.type === 'reddit') {
        return parseRedditJsonToCatalysts(text, feed.name);
      }
      return parseRssXmlToCatalysts(text, feed.name);
    })
  );

  const combined: InternetCatalyst[] = [];
  const seenTitles = new Set<string>();

  for (const res of results) {
    if (res.status === 'fulfilled') {
      for (const item of res.value) {
        const key = item.title.toLowerCase().slice(0, 48);
        if (!seenTitles.has(key)) {
          seenTitles.add(key);
          combined.push(item);
        }
      }
    }
  }

  // Sort by recency + high impact
  combined.sort((a, b) => b.publishedAt - a.publishedAt);
  return combined.slice(0, 60);
}

export async function fetchFearGreedIndex(): Promise<FearGreedData> {
  try {
    const raw = await nativeFetchText('https://api.alternative.me/fng/?limit=2');
    const json = JSON.parse(raw);
    const curr = json?.data?.[0];
    const prev = json?.data?.[1];
    if (curr) {
      return {
        value: Number(curr.value) || 55,
        classification: String(curr.value_classification || 'Greed'),
        previousValue: Number(prev?.value) || 52,
        updatedAt: Date.now(),
      };
    }
  } catch {
    // Fallback
  }
  return {
    value: 58,
    classification: 'Greed',
    previousValue: 54,
    updatedAt: Date.now(),
  };
}
