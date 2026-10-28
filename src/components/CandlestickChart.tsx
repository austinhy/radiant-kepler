import React, { useEffect, useRef, useState } from 'react';
import {
  Candle,
  CoinSymbol,
  PredictionSignal,
  TechnicalSnapshot,
  Timeframe,
} from '../types/market';
import { formatPrice } from '../engine/predictor';

interface CandlestickChartProps {
  symbol: CoinSymbol;
  timeframe: Timeframe;
  candles: Candle[];
  tech: TechnicalSnapshot;
  prediction: PredictionSignal;
  onTimeframeChange: (tf: Timeframe) => void;
}

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  symbol,
  timeframe,
  candles,
  tech,
  prediction,
  onTimeframeChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [showEMA, setShowEMA] = useState(true);
  const [showBB, setShowBB] = useState(true);
  const [showVWAP, setShowVWAP] = useState(true);
  const [showTargets, setShowTargets] = useState(true);
  const [subPane, setSubPane] = useState<'RSI' | 'MACD'>('RSI');
  const [visibleCount, setVisibleCount] = useState(72);
  const [panOffset, setPanOffset] = useState(0); // candles from right
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null
  );
  const dragStartRef = useRef<{ x: number; offset: number } | null>(null);

  useEffect(() => {
    setPanOffset(0);
  }, [symbol, timeframe]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || candles.length === 0) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(400, rect.width);
    const height = Math.max(320, rect.height);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Layout dimensions
    const rightAxisWidth = 84;
    const bottomAxisHeight = 24;
    const subChartHeight = 86;
    const chartWidth = width - rightAxisWidth;
    const mainHeight = height - bottomAxisHeight - subChartHeight - 10;
    const subTop = mainHeight + 10;

    // Clear background
    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, width, height);

    // Visible slice
    const count = Math.min(candles.length, Math.max(24, visibleCount));
    const endIdx = Math.max(count, candles.length - panOffset);
    const startIdx = Math.max(0, endIdx - count);
    const slice = candles.slice(startIdx, endIdx);
    if (slice.length === 0) return;

    // Compute min/max price in visible window
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVol = 0;

    for (let i = 0; i < slice.length; i++) {
      const c = slice[i];
      const gIdx = startIdx + i;
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
      if (showBB && tech.bbUpperSeries[gIdx] && tech.bbLowerSeries[gIdx]) {
        if (tech.bbUpperSeries[gIdx] > maxPrice)
          maxPrice = tech.bbUpperSeries[gIdx];
        if (tech.bbLowerSeries[gIdx] < minPrice)
          minPrice = tech.bbLowerSeries[gIdx];
      }
    }

    if (showTargets && panOffset === 0) {
      maxPrice = Math.max(maxPrice, prediction.takeProfit1, prediction.stopLoss);
      minPrice = Math.min(minPrice, prediction.takeProfit1, prediction.stopLoss);
    }

    const pad = (maxPrice - minPrice) * 0.08 || maxPrice * 0.01;
    minPrice -= pad;
    maxPrice += pad;
    const priceSpan = Math.max(maxPrice - minPrice, 0.000001);

    const priceToY = (p: number) =>
      12 + ((maxPrice - p) / priceSpan) * (mainHeight - 24);
    const yToPrice = (y: number) =>
      maxPrice - ((y - 12) / (mainHeight - 24)) * priceSpan;

    const stepX = chartWidth / slice.length;
    const idxToX = (localIdx: number) => (localIdx + 0.5) * stepX;

    // Subtle horizontal grid lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)';
    ctx.lineWidth = 1;
    const gridSteps = 6;
    ctx.font = '11px "SF Mono", "JetBrains Mono", monospace';
    ctx.fillStyle = '#64748B';
    for (let i = 0; i <= gridSteps; i++) {
      const y = 12 + ((mainHeight - 24) / gridSteps) * i;
      const pVal = yToPrice(y);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
      ctx.fillText(formatPrice(pVal).replace('$', ''), chartWidth + 8, y + 4);
    }

    // Vertical time grid lines
    const timeStep = Math.max(1, Math.floor(slice.length / 6));
    for (let i = 0; i < slice.length; i += timeStep) {
      const x = idxToX(i);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height - bottomAxisHeight);
      ctx.stroke();

      const dt = new Date(slice[i].time * 1000);
      const label =
        timeframe === '1d'
          ? dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : dt.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });
      ctx.fillStyle = '#64748B';
      ctx.fillText(label, Math.max(4, x - 18), height - 7);
    }

    // Bollinger Bands Shaded Channel
    if (showBB && tech.bbUpperSeries.length >= endIdx) {
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < slice.length; i++) {
        const x = idxToX(i);
        const y = priceToY(tech.bbUpperSeries[startIdx + i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let i = slice.length - 1; i >= 0; i--) {
        const x = idxToX(i);
        const y = priceToY(tech.bbLowerSeries[startIdx + i]);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.fill();

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < slice.length; i++) {
        const x = idxToX(i);
        const y = priceToY(tech.bbUpperSeries[startIdx + i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.beginPath();
      for (let i = 0; i < slice.length; i++) {
        const x = idxToX(i);
        const y = priceToY(tech.bbLowerSeries[startIdx + i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Volume histogram at bottom of main pane
    const volMaxHeight = mainHeight * 0.18;
    for (let i = 0; i < slice.length; i++) {
      const c = slice[i];
      const x = idxToX(i);
      const barW = Math.max(2, stepX * 0.62);
      const barH = maxVol > 0 ? (c.volume / maxVol) * volMaxHeight : 0;
      const isUp = c.close >= c.open;
      ctx.fillStyle = isUp
        ? 'rgba(16, 185, 129, 0.18)'
        : 'rgba(244, 63, 94, 0.18)';
      ctx.fillRect(x - barW / 2, mainHeight - barH, barW, barH);
    }

    // Candlesticks
    for (let i = 0; i < slice.length; i++) {
      const c = slice[i];
      const x = idxToX(i);
      const isUp = c.close >= c.open;
      const color = isUp ? '#10B981' : '#F43F5E';

      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);
      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1.8, Math.abs(closeY - openY));
      const bodyW = Math.max(2.5, Math.min(14, stepX * 0.68));
      ctx.fillStyle = color;
      ctx.fillRect(x - bodyW / 2, bodyTop, bodyW, bodyHeight);
    }

    // Helper for line series
    const drawSeries = (
      series: number[],
      color: string,
      widthLine = 1.5,
      dashed = false
    ) => {
      if (series.length < endIdx) return;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = widthLine;
      if (dashed) ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i < slice.length; i++) {
        const x = idxToX(i);
        const y = priceToY(series[startIdx + i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    };

    if (showEMA) {
      drawSeries(tech.ema9Series, '#38BDF8', 1.6);
      drawSeries(tech.ema21Series, '#A855F7', 1.6);
      drawSeries(tech.ema50Series, '#F59E0B', 1.3);
    }

    if (showVWAP) {
      drawSeries(tech.vwapSeries, '#EAB308', 1.4, true);
    }

    // Prediction Target & Stop-Loss Overlays
    const drawLevelLine = (
      priceVal: number,
      label: string,
      color: string,
      bgBadge: string
    ) => {
      if (priceVal < minPrice || priceVal > maxPrice) return;
      const y = priceToY(priceVal);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Right axis badge
      ctx.fillStyle = bgBadge;
      ctx.fillRect(chartWidth + 2, y - 9, rightAxisWidth - 4, 18);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px "SF Mono", monospace';
      ctx.fillText(
        formatPrice(priceVal).replace('$', ''),
        chartWidth + 6,
        y + 3
      );

      // Label tag inside right edge of chart
      const tagWidth = ctx.measureText(label).width + 12;
      ctx.fillStyle = bgBadge;
      ctx.fillRect(chartWidth - tagWidth - 8, y - 10, tagWidth, 18);
      ctx.fillStyle = '#F8FAFC';
      ctx.fillText(label, chartWidth - tagWidth - 2, y + 3);
      ctx.restore();
    };

    if (showTargets) {
      drawLevelLine(
        prediction.takeProfit1,
        `TP1 (${prediction.expectedMovePct > 0 ? '+' : ''}${prediction.expectedMovePct}%)`,
        '#10B981',
        'rgba(16, 185, 129, 0.85)'
      );
      drawLevelLine(
        prediction.stopLoss,
        'STOP / INVALIDATION',
        '#F43F5E',
        'rgba(244, 63, 94, 0.85)'
      );
    }

    // Live current price line
    const lastClose = slice[slice.length - 1].close;
    drawLevelLine(
      lastClose,
      'LIVE',
      '#6366F1',
      '#4F46E5'
    );

    // Sub-chart separator
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    ctx.beginPath();
    ctx.moveTo(0, subTop);
    ctx.lineTo(width, subTop);
    ctx.stroke();

    // Render Sub-pane (RSI-14 or MACD)
    ctx.save();
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
    if (subPane === 'RSI') {
      ctx.fillText(
        `RSI (14): ${tech.rsi14.toFixed(1)}`,
        10,
        subTop + 14
      );
      const rsiToY = (r: number) =>
        subTop + 10 + ((100 - r) / 100) * (subChartHeight - 18);

      // 70 / 30 levels
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.25)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, rsiToY(70));
      ctx.lineTo(chartWidth, rsiToY(70));
      ctx.stroke();

      ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.beginPath();
      ctx.moveTo(0, rsiToY(30));
      ctx.lineTo(chartWidth, rsiToY(30));
      ctx.stroke();
      ctx.setLineDash([]);

      // RSI curve
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < slice.length; i++) {
        const val = tech.rsiSeries[startIdx + i] ?? 50;
        const x = idxToX(i);
        const y = rsiToY(val);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else {
      ctx.fillText(
        `MACD Histogram: ${tech.macd.histogram.toFixed(4)}`,
        10,
        subTop + 14
      );
      const histSlice = slice.map(
        (_, i) => tech.macdHistSeries[startIdx + i] ?? 0
      );
      const maxAbs = Math.max(
        ...histSlice.map((v) => Math.abs(v)),
        0.00001
      );
      const midY = subTop + subChartHeight / 2 + 4;
      for (let i = 0; i < slice.length; i++) {
        const val = histSlice[i];
        const x = idxToX(i);
        const h = (val / maxAbs) * (subChartHeight * 0.38);
        const barW = Math.max(2, stepX * 0.6);
        ctx.fillStyle =
          val >= 0 ? 'rgba(16, 185, 129, 0.65)' : 'rgba(244, 63, 94, 0.65)';
        ctx.fillRect(
          x - barW / 2,
          val >= 0 ? midY - h : midY,
          barW,
          Math.abs(h)
        );
      }
    }
    ctx.restore();

    // Crosshair on hover
    if (
      mousePos &&
      hoverIdx !== null &&
      hoverIdx >= 0 &&
      hoverIdx < slice.length
    ) {
      const cx = idxToX(hoverIdx);
      ctx.save();
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, height - bottomAxisHeight);
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(chartWidth, mousePos.y);
      ctx.stroke();
      ctx.restore();
    }
  }, [
    candles,
    tech,
    prediction,
    showEMA,
    showBB,
    showVWAP,
    showTargets,
    subPane,
    visibleCount,
    panOffset,
    hoverIdx,
    mousePos,
    symbol,
    timeframe,
  ]);

  const count = Math.min(candles.length, Math.max(24, visibleCount));
  const endIdx = Math.max(count, candles.length - panOffset);
  const startIdx = Math.max(0, endIdx - count);
  const slice = candles.slice(startIdx, endIdx);
  const inspectedCandle =
    hoverIdx !== null && slice[hoverIdx]
      ? slice[hoverIdx]
      : slice[slice.length - 1];

  return (
    <div className="chart-panel">
      <div className="chart-toolbar">
        <div className="timeframe-group">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              className={`tf-btn ${timeframe === tf ? 'active' : ''}`}
              onClick={() => onTimeframeChange(tf)}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="indicator-toggles">
          <button
            className={`ind-chip ${showEMA ? 'on' : ''}`}
            onClick={() => setShowEMA(!showEMA)}
            title="Toggle EMA 9 / 21 / 50"
          >
            <span className="dot ema-dot" /> EMA 9/21/50
          </button>
          <button
            className={`ind-chip ${showBB ? 'on' : ''}`}
            onClick={() => setShowBB(!showBB)}
            title="Toggle Bollinger Bands (20, 2)"
          >
            <span className="dot bb-dot" /> Bollinger
          </button>
          <button
            className={`ind-chip ${showVWAP ? 'on' : ''}`}
            onClick={() => setShowVWAP(!showVWAP)}
            title="Toggle Session VWAP"
          >
            <span className="dot vwap-dot" /> VWAP
          </button>
          <button
            className={`ind-chip ${showTargets ? 'on' : ''}`}
            onClick={() => setShowTargets(!showTargets)}
            title="Show Good-Faith Prediction TP1 & Stop-Loss Lines"
          >
            <span className="dot target-dot" /> AI Targets
          </button>
          <button
            className="ind-chip on"
            onClick={() => setSubPane(subPane === 'RSI' ? 'MACD' : 'RSI')}
            title="Switch Oscillator Sub-Pane"
          >
            Oscillator: {subPane}
          </button>
          {panOffset > 0 && (
            <button
              className="ind-chip reset-btn"
              onClick={() => setPanOffset(0)}
            >
              Live Edge ▸
            </button>
          )}
        </div>
      </div>

      {inspectedCandle && (
        <div className="chart-hud-bar">
          <span>
            O: <strong>{formatPrice(inspectedCandle.open)}</strong>
          </span>
          <span>
            H: <strong>{formatPrice(inspectedCandle.high)}</strong>
          </span>
          <span>
            L: <strong>{formatPrice(inspectedCandle.low)}</strong>
          </span>
          <span>
            C: <strong>{formatPrice(inspectedCandle.close)}</strong>
          </span>
          <span className="hud-ema9">EMA9: {formatPrice(tech.ema9)}</span>
          <span className="hud-ema21">EMA21: {formatPrice(tech.ema21)}</span>
          <span className="hud-vwap">VWAP: {formatPrice(tech.vwap)}</span>
          <span>ATR(14): {formatPrice(tech.atr14)}</span>
        </div>
      )}

      <div
        ref={containerRef}
        className="chart-canvas-wrap"
        onWheel={(e) => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? 8 : -8;
          setVisibleCount((prev) =>
            Math.max(28, Math.min(candles.length, prev + delta))
          );
        }}
        onMouseDown={(e) => {
          dragStartRef.current = { x: e.clientX, offset: panOffset };
        }}
        onMouseMove={(e) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          setMousePos({ x, y });

          const chartW = rect.width - 84;
          if (x >= 0 && x <= chartW && slice.length > 0) {
            const idx = Math.floor((x / chartW) * slice.length);
            setHoverIdx(Math.max(0, Math.min(slice.length - 1, idx)));
          } else {
            setHoverIdx(null);
          }

          if (dragStartRef.current) {
            const dx = e.clientX - dragStartRef.current.x;
            const candleShift = Math.round((dx / chartW) * slice.length);
            const maxOffset = Math.max(0, candles.length - slice.length);
            setPanOffset(
              Math.max(
                0,
                Math.min(maxOffset, dragStartRef.current.offset + candleShift)
              )
            );
          }
        }}
        onMouseUp={() => {
          dragStartRef.current = null;
        }}
        onMouseLeave={() => {
          dragStartRef.current = null;
          setHoverIdx(null);
          setMousePos(null);
        }}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};
