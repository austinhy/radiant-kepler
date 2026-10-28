import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Candle,
  CoinSymbol,
  FearGreedData,
  InternetCatalyst,
  PaperPosition,
  PredictionSignal,
  TickerData,
  Timeframe,
} from './types/market';
import { COINS } from './engine/sentiment';
import { computeTechnicalSnapshot } from './engine/indicators';
import { formatPrice, generatePredictionSignal } from './engine/predictor';
import {
  fetchAllInternetCatalysts,
  fetchCandles,
  fetchFearGreedIndex,
  fetchInitialTickers,
  generateFallbackCandles,
} from './services/dataFeed';
import { CandlestickChart } from './components/CandlestickChart';
import { PredictionCard } from './components/PredictionCard';
import { InternetScanner } from './components/InternetScanner';
import { PaperTrader } from './components/PaperTrader';

type ActiveTab = 'DASHBOARD' | 'RADAR' | 'INTERNET' | 'PAPER';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('DASHBOARD');
  const [selectedSymbol, setSelectedSymbol] = useState<CoinSymbol>('BTC');
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');

  const [tickers, setTickers] = useState<Record<CoinSymbol, TickerData>>(() => {
    const init = {} as Record<CoinSymbol, TickerData>;
    for (const c of COINS) {
      init[c.symbol] = {
        symbol: c.symbol,
        name: c.name,
        price: c.symbol === 'BTC' ? 91450 : c.symbol === 'ETH' ? 3180 : 100,
        change24h: 0,
        changePct24h: 0,
        high24h: 0,
        low24h: 0,
        volume24h: 0,
        lastUpdated: Date.now(),
        sparkline: [],
        bid: 0,
        ask: 0,
        flash: null,
      };
    }
    return init;
  });

  const [candles, setCandles] = useState<Candle[]>(() =>
    generateFallbackCandles('BTC', '15m')
  );
  const [catalysts, setCatalysts] = useState<InternetCatalyst[]>([]);
  const [fearGreed, setFearGreed] = useState<FearGreedData>({
    value: 61,
    classification: 'Greed',
    previousValue: 56,
    updatedAt: Date.now(),
  });
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScanTime, setLastScanTime] = useState<number>(Date.now());
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [ticksCount, setTicksCount] = useState<number>(0);

  // Paper Trading State (persisted to localStorage)
  const [cashBalance, setCashBalance] = useState<number>(() => {
    const saved = localStorage.getItem('rk_cash_balance');
    return saved ? parseFloat(saved) : 100000;
  });
  const [positions, setPositions] = useState<PaperPosition[]>(() => {
    try {
      const saved = localStorage.getItem('rk_paper_positions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('rk_cash_balance', String(cashBalance));
  }, [cashBalance]);

  useEffect(() => {
    localStorage.setItem('rk_paper_positions', JSON.stringify(positions));
  }, [positions]);

  // Initial load of 24h tickers, candles, and internet catalysts
  const refreshInternetScan = useCallback(async (customQuery?: string) => {
    setIsScanning(true);
    try {
      const [items, fg] = await Promise.all([
        fetchAllInternetCatalysts(customQuery),
        fetchFearGreedIndex(),
      ]);
      if (items.length > 0) {
        setCatalysts(items);
      }
      setFearGreed(fg);
      setLastScanTime(Date.now());
    } finally {
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialTickers().then((t) => setTickers(t));
    refreshInternetScan();
    const interval = setInterval(() => refreshInternetScan(), 90000);
    return () => clearInterval(interval);
  }, [refreshInternetScan]);

  // Load candles whenever coin or timeframe changes
  useEffect(() => {
    let active = true;
    fetchCandles(selectedSymbol, timeframe).then((c) => {
      if (active && c.length > 0) {
        setCandles(c);
      }
    });
    return () => {
      active = false;
    };
  }, [selectedSymbol, timeframe]);

  // Live Multi-Exchange WebSocket (Coinbase Exchange + Binance Vision fallback)
  const selectedSymbolRef = useRef(selectedSymbol);
  selectedSymbolRef.current = selectedSymbol;

  useEffect(() => {
    let cbSocket: WebSocket | null = null;
    let binSocket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const handleLiveTick = (
      sym: CoinSymbol,
      price: number,
      open24h?: number,
      high24h?: number,
      low24h?: number,
      vol24h?: number
    ) => {
      if (!Number.isFinite(price) || price <= 0) return;
      setTicksCount((c) => c + 1);

      setTickers((prev) => {
        const cur = prev[sym];
        if (!cur) return prev;
        const flash =
          price > cur.price ? 'up' : price < cur.price ? 'down' : cur.flash;
        const baseOpen = open24h || cur.price - cur.change24h || price;
        const change24h = price - baseOpen;
        const changePct24h = baseOpen > 0 ? (change24h / baseOpen) * 100 : 0;

        return {
          ...prev,
          [sym]: {
            ...cur,
            price,
            change24h,
            changePct24h,
            high24h: high24h || Math.max(cur.high24h, price),
            low24h:
              low24h || (cur.low24h > 0 ? Math.min(cur.low24h, price) : price),
            volume24h: vol24h !== undefined ? vol24h : cur.volume24h,
            lastUpdated: Date.now(),
            flash,
          },
        };
      });

      // Update live candle if this is the active symbol
      if (sym === selectedSymbolRef.current) {
        setCandles((prev) => {
          if (prev.length === 0) return prev;
          const copy = prev.slice();
          const last = { ...copy[copy.length - 1] };
          last.close = price;
          if (price > last.high) last.high = price;
          if (price < last.low) last.low = price;
          copy[copy.length - 1] = last;
          return copy;
        });
      }
    };

    const connectWebSockets = () => {
      try {
        cbSocket = new WebSocket('wss://ws-feed.exchange.coinbase.com');
        cbSocket.onopen = () => {
          setWsConnected(true);
          cbSocket?.send(
            JSON.stringify({
              type: 'subscribe',
              product_ids: COINS.map((c) => c.coinbaseProduct),
              channels: ['ticker'],
            })
          );
        };
        cbSocket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'ticker' && msg.product_id && msg.price) {
              const coin = COINS.find(
                (c) => c.coinbaseProduct === msg.product_id
              );
              if (coin) {
                const p = parseFloat(msg.price);
                const open24 = msg.open_24h ? parseFloat(msg.open_24h) : undefined;
                const high24 = msg.high_24h ? parseFloat(msg.high_24h) : undefined;
                const low24 = msg.low_24h ? parseFloat(msg.low_24h) : undefined;
                const vol24 = msg.volume_24h
                  ? parseFloat(msg.volume_24h) * p
                  : undefined;
                handleLiveTick(coin.symbol, p, open24, high24, low24, vol24);
              }
            }
          } catch {
            // ignore malformed frame
          }
        };
        cbSocket.onclose = () => {
          setWsConnected(false);
          reconnectTimer = setTimeout(connectWebSockets, 4000);
        };
      } catch {
        // Fallback
      }

      // Secondary stream for BNB & global pairs via Binance Vision
      try {
        const streams = COINS.map(
          (c) => `${c.binanceSymbol.toLowerCase()}@miniTicker`
        ).join('/');
        binSocket = new WebSocket(
          `wss://data-stream.binance.vision/stream?streams=${streams}`
        );
        binSocket.onopen = () => setWsConnected(true);
        binSocket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            const d = payload?.data;
            if (d && d.s && d.c) {
              const coin = COINS.find((c) => c.binanceSymbol === d.s);
              if (coin) {
                handleLiveTick(
                  coin.symbol,
                  parseFloat(d.c),
                  parseFloat(d.o),
                  parseFloat(d.h),
                  parseFloat(d.l),
                  parseFloat(d.q)
                );
              }
            }
          } catch {
            // ignore
          }
        };
      } catch {
        // ignore
      }
    };

    connectWebSockets();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      cbSocket?.close();
      binSocket?.close();
    };
  }, []);

  // Auto-check Paper Positions against live prices for Stop-Loss / Take-Profit execution
  useEffect(() => {
    setPositions((prev) => {
      let changed = false;
      let cashDelta = 0;

      const updated = prev.map((pos) => {
        if (pos.closedAt) return pos;
        const mark = tickers[pos.symbol]?.price;
        if (!mark) return pos;

        if (pos.side === 'LONG') {
          if (mark <= pos.stopLoss) {
            changed = true;
            const pnl = (mark - pos.entryPrice) * pos.sizeCoins;
            cashDelta += pos.notionalUsd + pnl;
            return {
              ...pos,
              closedAt: Date.now(),
              closePrice: mark,
              closeReason: 'STOP_LOSS' as const,
              realizedPnl: pnl,
            };
          }
          if (mark >= pos.takeProfit) {
            changed = true;
            const pnl = (mark - pos.entryPrice) * pos.sizeCoins;
            cashDelta += pos.notionalUsd + pnl;
            return {
              ...pos,
              closedAt: Date.now(),
              closePrice: mark,
              closeReason: 'TAKE_PROFIT' as const,
              realizedPnl: pnl,
            };
          }
        } else {
          if (mark >= pos.stopLoss) {
            changed = true;
            const pnl = (pos.entryPrice - mark) * pos.sizeCoins;
            cashDelta += pos.notionalUsd + pnl;
            return {
              ...pos,
              closedAt: Date.now(),
              closePrice: mark,
              closeReason: 'STOP_LOSS' as const,
              realizedPnl: pnl,
            };
          }
          if (mark <= pos.takeProfit) {
            changed = true;
            const pnl = (pos.entryPrice - mark) * pos.sizeCoins;
            cashDelta += pos.notionalUsd + pnl;
            return {
              ...pos,
              closedAt: Date.now(),
              closePrice: mark,
              closeReason: 'TAKE_PROFIT' as const,
              realizedPnl: pnl,
            };
          }
        }
        return pos;
      });

      if (changed && cashDelta !== 0) {
        setCashBalance((c) => c + cashDelta);
      }
      return changed ? updated : prev;
    });
  }, [tickers]);

  // Compute technical snapshot & good-faith prediction for active coin
  const tech = useMemo(() => computeTechnicalSnapshot(candles), [candles]);
  const currentTicker = tickers[selectedSymbol];
  const livePrice =
    currentTicker?.price || candles[candles.length - 1]?.close || 1;

  const prediction: PredictionSignal = useMemo(
    () =>
      generatePredictionSignal({
        symbol: selectedSymbol,
        timeframe,
        currentPrice: livePrice,
        tech,
        catalysts,
        fearGreed,
      }),
    [selectedSymbol, timeframe, livePrice, tech, catalysts, fearGreed]
  );

  const handleOpenPaperPosition = useCallback(
    (posData: Omit<PaperPosition, 'id' | 'openedAt'>) => {
      if (posData.notionalUsd > cashBalance) return;
      setCashBalance((c) => c - posData.notionalUsd);
      setPositions((prev) => [
        {
          ...posData,
          id: 'pos_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          openedAt: Date.now(),
        },
        ...prev,
      ]);
    },
    [cashBalance]
  );

  const handleClosePaperPosition = useCallback(
    (id: string, reason: 'MANUAL' = 'MANUAL') => {
      setPositions((prev) =>
        prev.map((pos) => {
          if (pos.id !== id || pos.closedAt) return pos;
          const mark = tickers[pos.symbol]?.price || pos.entryPrice;
          const diff =
            pos.side === 'LONG'
              ? mark - pos.entryPrice
              : pos.entryPrice - mark;
          const pnl = diff * pos.sizeCoins;
          setCashBalance((c) => c + pos.notionalUsd + pnl);
          return {
            ...pos,
            closedAt: Date.now(),
            closePrice: mark,
            closeReason: reason,
            realizedPnl: pnl,
          };
        })
      );
    },
    [tickers]
  );

  const handleQuickSimulateSignal = useCallback(
    (sig: PredictionSignal) => {
      const side = sig.compositeScore >= 0 ? 'LONG' : 'SHORT';
      const price = sig.currentPrice;
      const stopDist = Math.max(Math.abs(price - sig.stopLoss), price * 0.004);
      const riskUsd = cashBalance * 0.01; // 1% account risk
      const notional = Math.min((riskUsd / stopDist) * price, cashBalance * 0.5);
      const sizeCoins = notional / price;

      handleOpenPaperPosition({
        symbol: sig.symbol,
        side,
        entryPrice: price,
        sizeCoins,
        notionalUsd: notional,
        stopLoss: sig.stopLoss,
        takeProfit: sig.takeProfit1,
        thesisSnapshot: `${sig.direction} (${sig.confidence}% conf)`,
        predictionConfidence: sig.confidence,
      });
    },
    [cashBalance, handleOpenPaperPosition]
  );

  return (
    <div className="app-shell">
      {/* Top Command Header */}
      <header className="top-bar">
        <div className="brand-group">
          <div className="brand-orb" />
          <div>
            <div className="brand-title">RADIANT KEPLER</div>
            <div className="brand-sub">
              Real-Time Crypto Intelligence & Good-Faith Prediction Terminal
            </div>
          </div>
        </div>

        <nav className="main-nav">
          <button
            className={`nav-btn ${activeTab === 'DASHBOARD' ? 'active' : ''}`}
            onClick={() => setActiveTab('DASHBOARD')}
          >
            ◈ Command Dashboard
          </button>
          <button
            className={`nav-btn ${activeTab === 'RADAR' ? 'active' : ''}`}
            onClick={() => setActiveTab('RADAR')}
          >
            ◎ Market Opportunity Radar
          </button>
          <button
            className={`nav-btn ${activeTab === 'INTERNET' ? 'active' : ''}`}
            onClick={() => setActiveTab('INTERNET')}
          >
            🌐 Internet Catalyst Scanner ({catalysts.length})
          </button>
          <button
            className={`nav-btn ${activeTab === 'PAPER' ? 'active' : ''}`}
            onClick={() => setActiveTab('PAPER')}
          >
            ⚡ Paper Trader ({positions.filter((p) => !p.closedAt).length})
          </button>
        </nav>

        <div className="status-cluster">
          <div className="status-pill">
            <span
              className={`live-dot ${wsConnected ? 'online' : 'connecting'}`}
            />
            <span>
              {wsConnected
                ? `LIVE STREAM (${ticksCount.toLocaleString()} ticks)`
                : 'CONNECTING STREAM…'}
            </span>
          </div>
          <div className="status-pill fg-pill">
            <span>F&G Index:</span>
            <strong>
              {fearGreed.value} ({fearGreed.classification})
            </strong>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="workspace-body">
        {/* Left Sidebar Watchlist */}
        <aside className="watchlist-sidebar">
          <div className="sidebar-header">
            <span>LIVE WATCHLIST (USD)</span>
            <small>24H %</small>
          </div>
          <div className="watchlist-scroll">
            {COINS.map((coin) => {
              const t = tickers[coin.symbol];
              const isSelected = coin.symbol === selectedSymbol;
              const isPos = (t?.changePct24h || 0) >= 0;
              return (
                <button
                  key={coin.symbol}
                  className={`watch-item ${isSelected ? 'selected' : ''} ${
                    t?.flash === 'up'
                      ? 'flash-up'
                      : t?.flash === 'down'
                      ? 'flash-down'
                      : ''
                  }`}
                  onClick={() => setSelectedSymbol(coin.symbol)}
                >
                  <div className="watch-left">
                    <span
                      className="coin-badge-dot"
                      style={{ background: coin.color }}
                    />
                    <div>
                      <div className="watch-sym">{coin.symbol}</div>
                      <div className="watch-name">{coin.name}</div>
                    </div>
                  </div>
                  <div className="watch-right">
                    <div className="watch-price">
                      {formatPrice(t?.price || 0)}
                    </div>
                    <div className={`watch-chg ${isPos ? 'pos' : 'neg'}`}>
                      {isPos ? '+' : ''}
                      {(t?.changePct24h || 0).toFixed(2)}%
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="sidebar-footer-box">
            <div className="sf-title">Good-Faith Trading Principle</div>
            <p>
              Signals combine 5 transparent pillars: EMA/VWAP Trend, RSI/MACD
              Momentum, Orderflow Delta, Live Web News, and Macro Regime. Never
              risk &gt;1–2% per trade.
            </p>
          </div>
        </aside>

        {/* Main Center & Right Panels */}
        {activeTab === 'DASHBOARD' && (
          <main className="dashboard-grid">
            <div className="center-column">
              {/* Active Coin Hero Header */}
              <div className="coin-hero-bar">
                <div className="hero-left">
                  <h2>
                    {currentTicker?.name} <span>({selectedSymbol}/USD)</span>
                  </h2>
                  <div className="hero-price-row">
                    <span className="hero-price">{formatPrice(livePrice)}</span>
                    <span
                      className={`hero-chg ${
                        (currentTicker?.changePct24h || 0) >= 0 ? 'pos' : 'neg'
                      }`}
                    >
                      {(currentTicker?.changePct24h || 0) >= 0 ? '▲ +' : '▼ '}
                      {(currentTicker?.changePct24h || 0).toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="hero-stats">
                  <div>
                    <small>24h High</small>
                    <strong>{formatPrice(currentTicker?.high24h || livePrice)}</strong>
                  </div>
                  <div>
                    <small>24h Low</small>
                    <strong>{formatPrice(currentTicker?.low24h || livePrice)}</strong>
                  </div>
                  <div>
                    <small>RSI (14)</small>
                    <strong
                      className={
                        tech.rsi14 > 70
                          ? 'neg'
                          : tech.rsi14 < 30
                          ? 'pos'
                          : ''
                      }
                    >
                      {tech.rsi14.toFixed(1)}
                    </strong>
                  </div>
                  <div>
                    <small>Buy Pressure</small>
                    <strong
                      className={
                        tech.buyPressurePct >= 52
                          ? 'pos'
                          : tech.buyPressurePct <= 48
                          ? 'neg'
                          : ''
                      }
                    >
                      {tech.buyPressurePct.toFixed(0)}%
                    </strong>
                  </div>
                  <div>
                    <small>Support / Res</small>
                    <strong>
                      {formatPrice(tech.support)} / {formatPrice(tech.resistance)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Interactive High-DPI Candlestick & Target Chart */}
              <CandlestickChart
                symbol={selectedSymbol}
                timeframe={timeframe}
                candles={candles}
                tech={tech}
                prediction={prediction}
                onTimeframeChange={setTimeframe}
              />

              {/* Paper Trader Simulator */}
              <PaperTrader
                selectedSymbol={selectedSymbol}
                tickers={tickers}
                prediction={prediction}
                positions={positions}
                cashBalance={cashBalance}
                onOpenPosition={handleOpenPaperPosition}
                onClosePosition={handleClosePaperPosition}
                onResetAccount={() => {
                  setCashBalance(100000);
                  setPositions([]);
                }}
              />
            </div>

            <div className="right-column">
              {/* Explainable Good-Faith Prediction Card */}
              <PredictionCard
                signal={prediction}
                onExecutePaperTrade={handleQuickSimulateSignal}
              />

              {/* Live Internet Catalyst & Sentiment Scanner */}
              <InternetScanner
                selectedSymbol={selectedSymbol}
                catalysts={catalysts}
                fearGreed={fearGreed}
                isScanning={isScanning}
                lastScanTime={lastScanTime}
                onRefreshScan={refreshInternetScan}
                onSelectCoin={(c) => setSelectedSymbol(c)}
              />
            </div>
          </main>
        )}

        {activeTab === 'RADAR' && (
          <main className="full-tab-view">
            <div className="radar-panel">
              <div className="pred-header">
                <div>
                  <div className="pred-eyebrow">
                    CROSS-MARKET QUANTITATIVE & INTERNET SENTIMENT MATRIX
                  </div>
                  <h3 className="pred-title">
                    All-Coin Good-Faith Opportunity Radar
                  </h3>
                </div>
              </div>
              <table className="radar-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Live Price</th>
                    <th>24h Change</th>
                    <th>Internet Mentions</th>
                    <th>Net Web Sentiment</th>
                    <th>Suggested Action</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {COINS.map((c) => {
                    const t = tickers[c.symbol];
                    const coinCats = catalysts.filter((cat) =>
                      cat.affectedCoins.includes(c.symbol)
                    );
                    const avgSent =
                      coinCats.length > 0
                        ? Math.round(
                            coinCats.reduce((s, x) => s + x.sentimentScore, 0) /
                              coinCats.length
                          )
                        : 0;
                    const comb = Math.round(
                      (t?.changePct24h || 0) * 4.5 + avgSent * 0.65
                    );
                    const dir =
                      comb >= 18
                        ? 'BULLISH BIAS'
                        : comb <= -18
                        ? 'BEARISH BIAS'
                        : 'NEUTRAL / RANGE';

                    return (
                      <tr key={c.symbol}>
                        <td>
                          <strong>{c.symbol}</strong>{' '}
                          <span className="muted-inline">{c.name}</span>
                        </td>
                        <td className="mono">{formatPrice(t?.price || 0)}</td>
                        <td
                          className={`mono ${
                            (t?.changePct24h || 0) >= 0 ? 'pos' : 'neg'
                          }`}
                        >
                          {(t?.changePct24h || 0) >= 0 ? '+' : ''}
                          {(t?.changePct24h || 0).toFixed(2)}%
                        </td>
                        <td>{coinCats.length} articles/posts</td>
                        <td
                          className={`mono ${
                            avgSent > 5 ? 'pos' : avgSent < -5 ? 'neg' : ''
                          }`}
                        >
                          {avgSent > 0 ? '+' : ''}
                          {avgSent}
                        </td>
                        <td>
                          <span
                            className={`sent-badge ${
                              comb >= 18
                                ? 'bull'
                                : comb <= -18
                                ? 'bear'
                                : 'neutral'
                            }`}
                          >
                            {dir}
                          </span>
                        </td>
                        <td>
                          <button
                            className="tf-btn active"
                            onClick={() => {
                              setSelectedSymbol(c.symbol);
                              setActiveTab('DASHBOARD');
                            }}
                          >
                            Inspect Chart & Thesis ▸
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </main>
        )}

        {activeTab === 'INTERNET' && (
          <main className="full-tab-view">
            <InternetScanner
              selectedSymbol={selectedSymbol}
              catalysts={catalysts}
              fearGreed={fearGreed}
              isScanning={isScanning}
              lastScanTime={lastScanTime}
              onRefreshScan={refreshInternetScan}
              onSelectCoin={(c) => {
                setSelectedSymbol(c);
                setActiveTab('DASHBOARD');
              }}
            />
          </main>
        )}

        {activeTab === 'PAPER' && (
          <main className="full-tab-view">
            <PaperTrader
              selectedSymbol={selectedSymbol}
              tickers={tickers}
              prediction={prediction}
              positions={positions}
              cashBalance={cashBalance}
              onOpenPosition={handleOpenPaperPosition}
              onClosePosition={handleClosePaperPosition}
              onResetAccount={() => {
                setCashBalance(100000);
                setPositions([]);
              }}
            />
          </main>
        )}
      </div>
    </div>
  );
};
