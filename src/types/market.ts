export type CoinSymbol =
  | 'BTC'
  | 'ETH'
  | 'SOL'
  | 'XRP'
  | 'BNB'
  | 'DOGE'
  | 'AVAX'
  | 'LINK'
  | 'SUI'
  | 'ADA';

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface CoinMeta {
  symbol: CoinSymbol;
  name: string;
  coinbaseProduct: string;
  binanceSymbol: string;
  krakenPair: string;
  color: string;
  category: string;
  keywords: string[];
}

export interface Candle {
  time: number; // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TickerData {
  symbol: CoinSymbol;
  name: string;
  price: number;
  change24h: number;
  changePct24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  lastUpdated: number;
  sparkline: number[];
  bid: number;
  ask: number;
  flash?: 'up' | 'down' | null;
}

export interface TechnicalSnapshot {
  ema9: number;
  ema21: number;
  ema50: number;
  sma20: number;
  rsi14: number;
  stochRsi: number;
  macd: {
    line: number;
    signal: number;
    histogram: number;
    prevHistogram: number;
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
    widthPct: number;
    percentB: number;
  };
  atr14: number;
  atrPct: number;
  vwap: number;
  support: number;
  resistance: number;
  volumeRatio: number;
  buyPressurePct: number;
  ema9Series: number[];
  ema21Series: number[];
  ema50Series: number[];
  bbUpperSeries: number[];
  bbLowerSeries: number[];
  vwapSeries: number[];
  rsiSeries: number[];
  macdHistSeries: number[];
}

export type CatalystCategory =
  | 'crypto-news'
  | 'macro-economy'
  | 'regulatory-etf'
  | 'social-reddit'
  | 'onchain-flow';

export interface InternetCatalyst {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: CatalystCategory;
  url: string;
  publishedAt: number;
  sentimentScore: number; // -100 to +100
  sentimentLabel: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  affectedCoins: (CoinSymbol | 'MARKET')[];
  matchedKeywords: string[];
}

export interface PillarScore {
  id: string;
  name: string;
  weight: number; // e.g., 0.25
  score: number; // -100 to +100
  status: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  summary: string;
  metricText: string;
}

export type SignalDirection =
  | 'STRONG LONG'
  | 'MODERATE LONG'
  | 'NEUTRAL / WAIT'
  | 'MODERATE SHORT'
  | 'STRONG SHORT';

export interface PredictionSignal {
  symbol: CoinSymbol;
  timeframe: Timeframe;
  generatedAt: number;
  currentPrice: number;
  direction: SignalDirection;
  compositeScore: number; // -100 to +100
  confidence: number; // 0 to 100%
  regime: string;
  actionable: boolean;
  skipReason?: string;
  entryZone: [number, number];
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskRewardRatio: number;
  expectedMovePct: number;
  horizonText: string;
  pillars: PillarScore[];
  bullThesis: string[];
  bearThesis: string[];
  invalidationCondition: string;
  catalystsUsed: number;
}

export interface PaperPosition {
  id: string;
  symbol: CoinSymbol;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  sizeCoins: number;
  notionalUsd: number;
  stopLoss: number;
  takeProfit: number;
  openedAt: number;
  closedAt?: number;
  closePrice?: number;
  closeReason?: 'MANUAL' | 'TAKE_PROFIT' | 'STOP_LOSS';
  realizedPnl?: number;
  thesisSnapshot: string;
  predictionConfidence: number;
}

export interface FearGreedData {
  value: number;
  classification: string;
  previousValue: number;
  updatedAt: number;
}
