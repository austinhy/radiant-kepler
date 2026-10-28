# Radiant Kepler — Crypto Market Intelligence & Good-Faith Prediction Terminal

A fast, lightweight desktop application for watching the crypto market in real time, scanning the general internet for market-moving catalysts (crypto news, Federal Reserve / macro reports, SEC & ETF flows, and social sentiment), and generating transparent, good-faith quantitative trade predictions.

---

## Quick Launch (Zero Setup Required on macOS)

A pre-compiled native macOS desktop bundle (`RadiantKepler.app`) using Apple's native `AppKit` + `WKWebView` engine is ready to run immediately:

```bash
chmod +x run-desktop.sh
./run-desktop.sh
```

Or double-click **`RadiantKepler.app`** directly in Finder.

---

## Tauri + React / TypeScript Workflow

The project also includes the full **Tauri 2.0 + React 18 + TypeScript + Vite** source tree:

```bash
npm install
npm run tauri dev
```

---

## Key Features

1. **Real-Time Multi-Exchange Market Stream**:
   - Sub-second live price and 24h volume streaming via **Coinbase Exchange WebSocket** (`wss://ws-feed.exchange.coinbase.com`) and **Binance Vision WebSocket** (`wss://data-stream.binance.vision/stream`).
   - Supports 10 major liquid assets (`BTC`, `ETH`, `SOL`, `XRP`, `BNB`, `DOGE`, `AVAX`, `LINK`, `SUI`, `ADA`) across 6 timeframes (`1m`, `5m`, `15m`, `1h`, `4h`, `1d`).

2. **Interactive High-DPI Candlestick & Indicator Chart**:
   - Hardware-accelerated HTML5 Canvas rendering with scroll-to-zoom and drag-to-pan.
   - Toggleable **EMA 9 / 21 / 50**, **Bollinger Bands (20, 2)** shaded channel, **Session VWAP**, and **RSI-14 / MACD (12, 26, 9)** oscillator sub-pane.
   - Direct chart overlays for the prediction engine's **Take-Profit 1 (`TP1`)** and **Hard Stop-Loss / Invalidation** levels.

3. **Live Internet Catalyst & Macro Intelligence Scanner**:
   - Native desktop HTTP bridge fetches live RSS and JSON feeds without browser CORS restrictions:
     - **Crypto News**: CoinDesk, Cointelegraph, Decrypt
     - **Macro & Regulatory**: Google News Macro/Federal Reserve/CPI/ETF/SEC live feeds
     - **Community Pulse**: Reddit `r/CryptoCurrency` hot posts
     - **Sentiment Positioning**: Alternative.me Crypto Fear & Greed Index
   - **Live Custom Web Search**: Search any macro or crypto topic in real time and score its bullish/bearish market impact.

4. **Explainable Good-Faith Prediction Engine**:
   - 5-Pillar Quantitative Decomposition:
     - **Trend & EMA Structure (25%)**
     - **Momentum & Oscillators (20%)**
     - **Volume & Orderflow Delta (20%)**
     - **Internet & News Catalysts (20%)**
     - **Macro & ETF Regime (15%)**
   - Displays **Composite Score (`-100` to `+100`)**, **Confidence (`%`)**, **Risk-to-Reward Ratio**, **ATR-based Entry / TP1 / TP2 / Stop-Loss**, **Bull vs. Bear Thesis**, and **Good-Faith Capital Guardrails** when signals conflict.

5. **Paper Trading Simulator & Risk Sizer**:
   - `$100,000` simulated portfolio with automatic position sizing based on account risk % (`0.5%`, `1.0%`, `2.0%`) and stop-loss distance.
   - Real-time Unrealized PnL updates and automatic Stop-Loss / Take-Profit execution on live WebSocket ticks.
