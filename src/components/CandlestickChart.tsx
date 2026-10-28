import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineStyle,
  CrosshairMode,
  ColorType,
} from 'lightweight-charts';
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
  const mainContainerRef = useRef<HTMLDivElement | null>(null);
  const subContainerRef = useRef<HTMLDivElement | null>(null);

  const mainChartRef = useRef<IChartApi | null>(null);
  const subChartRef = useRef<IChartApi | null>(null);

  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const ema9SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const priceLinesRef = useRef<any[]>([]);

  const [showEMA, setShowEMA] = useState(true);
  const [showBB, setShowBB] = useState(true);
  const [showVWAP, setShowVWAP] = useState(true);
  const [showTargets, setShowTargets] = useState(true);
  const [subPane, setSubPane] = useState<'RSI' | 'MACD'>('RSI');

  const [hudData, setHudData] = useState<{
    time?: string;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    changePct?: number;
    volume?: number;
    ema9?: number;
    ema21?: number;
    vwap?: number;
    rsi?: number;
  }>({});

  // 1. Initialize Main TradingView Chart
  useEffect(() => {
    if (!mainContainerRef.current) return;

    const chart = createChart(mainContainerRef.current, {
      width: mainContainerRef.current.clientWidth,
      height: 380,
      layout: {
        background: { type: ColorType.Solid, color: '#090D16' },
        textColor: '#94A3B8',
        fontSize: 11,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.05)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.05)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(226, 232, 240, 0.35)',
          width: 1,
          style: LineStyle.Dashed,
        },
        horzLine: {
          color: 'rgba(226, 232, 240, 0.35)',
          width: 1,
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(148, 163, 184, 0.12)',
        scaleMargins: { top: 0.08, bottom: 0.22 },
        autoScale: true,
      },
      timeScale: {
        borderColor: 'rgba(148, 163, 184, 0.12)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10B981',
      downColor: '#F43F5E',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#F43F5E',
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    const ema9Series = chart.addLineSeries({
      color: '#38BDF8',
      lineWidth: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const ema21Series = chart.addLineSeries({
      color: '#A855F7',
      lineWidth: 2,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const ema50Series = chart.addLineSeries({
      color: '#F59E0B',
      lineWidth: 1,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const vwapSeries = chart.addLineSeries({
      color: '#EAB308',
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const bbUpperSeries = chart.addLineSeries({
      color: 'rgba(56, 189, 248, 0.45)',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      crosshairMarkerVisible: false,
      title: 'BB Upper',
    });

    const bbLowerSeries = chart.addLineSeries({
      color: 'rgba(56, 189, 248, 0.45)',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      crosshairMarkerVisible: false,
      title: 'BB Lower',
    });

    mainChartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    ema9SeriesRef.current = ema9Series;
    ema21SeriesRef.current = ema21Series;
    ema50SeriesRef.current = ema50Series;
    vwapSeriesRef.current = vwapSeries;
    bbUpperSeriesRef.current = bbUpperSeries;
    bbLowerSeriesRef.current = bbLowerSeries;

    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) {
        return;
      }
      const cData = param.seriesData.get(candleSeries) as any;
      const vData = param.seriesData.get(volumeSeries) as any;
      const e9 = param.seriesData.get(ema9Series) as any;
      const e21 = param.seriesData.get(ema21Series) as any;
      const vw = param.seriesData.get(vwapSeries) as any;

      if (cData) {
        const chg =
          cData.open > 0 ? ((cData.close - cData.open) / cData.open) * 100 : 0;
        const timeStr =
          typeof param.time === 'number'
            ? new Date(param.time * 1000).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : String(param.time);

        setHudData({
          time: timeStr,
          open: cData.open,
          high: cData.high,
          low: cData.low,
          close: cData.close,
          changePct: chg,
          volume: vData ? vData.value : undefined,
          ema9: e9 ? e9.value : undefined,
          ema21: e21 ? e21.value : undefined,
          vwap: vw ? vw.value : undefined,
        });
      }
    });

    const handleResize = () => {
      if (mainContainerRef.current) {
        chart.applyOptions({ width: mainContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      mainChartRef.current = null;
    };
  }, []);

  // 2. Initialize Sub-Chart (RSI or MACD)
  useEffect(() => {
    if (!subContainerRef.current) return;

    const subChart = createChart(subContainerRef.current, {
      width: subContainerRef.current.clientWidth,
      height: 100,
      layout: {
        background: { type: ColorType.Solid, color: '#070A12' },
        textColor: '#64748B',
        fontSize: 10,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.04)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: 'rgba(148, 163, 184, 0.12)',
        scaleMargins: { top: 0.15, bottom: 0.15 },
        autoScale: true,
      },
      timeScale: {
        borderColor: 'rgba(148, 163, 184, 0.12)',
        visible: false,
      },
    });

    subChartRef.current = subChart;

    // Synchronize time scales
    const syncMain = (range: any) => {
      if (mainChartRef.current && range) {
        mainChartRef.current.timeScale().setVisibleLogicalRange(range);
      }
    };
    const syncSub = (range: any) => {
      if (subChartRef.current && range) {
        subChartRef.current.timeScale().setVisibleLogicalRange(range);
      }
    };

    if (mainChartRef.current) {
      mainChartRef.current.timeScale().subscribeVisibleLogicalRangeChange(syncSub);
    }
    subChart.timeScale().subscribeVisibleLogicalRangeChange(syncMain);

    const handleResize = () => {
      if (subContainerRef.current) {
        subChart.applyOptions({ width: subContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      subChart.remove();
      subChartRef.current = null;
    };
  }, []);

  // 3. Populate Main Chart Data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0)
      return;

    // Filter and ensure strictly ascending timestamps for TradingView
    const sorted = [...candles].sort((a, b) => a.time - b.time);
    const uniqueCandles: Candle[] = [];
    const seen = new Set<number>();
    for (const c of sorted) {
      if (!seen.has(c.time)) {
        seen.add(c.time);
        uniqueCandles.push(c);
      }
    }

    candleSeriesRef.current.setData(
      uniqueCandles.map((c) => ({
        time: c.time as any,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    volumeSeriesRef.current.setData(
      uniqueCandles.map((c) => ({
        time: c.time as any,
        value: c.volume,
        color:
          c.close >= c.open
            ? 'rgba(16, 185, 129, 0.28)'
            : 'rgba(244, 63, 94, 0.28)',
      }))
    );

    // Indicator series data
    if (ema9SeriesRef.current) {
      ema9SeriesRef.current.setData(
        showEMA
          ? uniqueCandles.map((c, i) => ({
              time: c.time as any,
              value: tech.ema9Series[i] || c.close,
            }))
          : []
      );
    }

    if (ema21SeriesRef.current) {
      ema21SeriesRef.current.setData(
        showEMA
          ? uniqueCandles.map((c, i) => ({
              time: c.time as any,
              value: tech.ema21Series[i] || c.close,
            }))
          : []
      );
    }

    if (ema50SeriesRef.current) {
      ema50SeriesRef.current.setData(
        showEMA
          ? uniqueCandles.map((c, i) => ({
              time: c.time as any,
              value: tech.ema50Series[i] || c.close,
            }))
          : []
      );
    }

    if (vwapSeriesRef.current) {
      vwapSeriesRef.current.setData(
        showVWAP
          ? uniqueCandles.map((c, i) => ({
              time: c.time as any,
              value: tech.vwapSeries[i] || c.close,
            }))
          : []
      );
    }

    if (bbUpperSeriesRef.current && bbLowerSeriesRef.current) {
      bbUpperSeriesRef.current.setData(
        showBB
          ? uniqueCandles.map((c, i) => ({
              time: c.time as any,
              value: tech.bbUpperSeries[i] || c.close,
            }))
          : []
      );
      bbLowerSeriesRef.current.setData(
        showBB
          ? uniqueCandles.map((c, i) => ({
              time: c.time as any,
              value: tech.bbLowerSeries[i] || c.close,
            }))
          : []
      );
    }

    // AI Prediction Price Lines
    for (const pl of priceLinesRef.current) {
      candleSeriesRef.current.removePriceLine(pl);
    }
    priceLinesRef.current = [];

    if (showTargets && prediction && prediction.takeProfit1) {
      const tp1 = candleSeriesRef.current.createPriceLine({
        price: prediction.takeProfit1,
        color: '#10B981',
        lineWidth: 1.5 as any,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `TP1 (${prediction.expectedMovePct > 0 ? '+' : ''}${
          prediction.expectedMovePct
        }%)`,
      });
      const sl = candleSeriesRef.current.createPriceLine({
        price: prediction.stopLoss,
        color: '#F43F5E',
        lineWidth: 1.5 as any,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'STOP / INVALIDATION',
      });
      const tp2 = candleSeriesRef.current.createPriceLine({
        price: prediction.takeProfit2,
        color: '#34D399',
        lineWidth: 1 as any,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: 'TP2 (Runner)',
      });
      priceLinesRef.current = [tp1, sl, tp2];
    }
  }, [candles, tech, prediction, showEMA, showBB, showVWAP, showTargets]);

  // 4. Populate Sub-Chart (RSI or MACD)
  useEffect(() => {
    if (!subChartRef.current || candles.length === 0) return;

    const subChart = subChartRef.current;
    // Clear old series by re-creating or clearing
    const sorted = [...candles].sort((a, b) => a.time - b.time);
    const uniqueCandles: Candle[] = [];
    const seen = new Set<number>();
    for (const c of sorted) {
      if (!seen.has(c.time)) {
        seen.add(c.time);
        uniqueCandles.push(c);
      }
    }

    if (subPane === 'RSI') {
      const rsiLine = subChart.addLineSeries({
        color: '#38BDF8',
        lineWidth: 1.5,
        title: 'RSI (14)',
      });
      rsiLine.createPriceLine({
        price: 70,
        color: 'rgba(244, 63, 94, 0.4)',
        lineWidth: 1 as any,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '70',
      });
      rsiLine.createPriceLine({
        price: 30,
        color: 'rgba(16, 185, 129, 0.4)',
        lineWidth: 1 as any,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '30',
      });
      rsiLine.setData(
        uniqueCandles.map((c, i) => ({
          time: c.time as any,
          value: tech.rsiSeries[i] || 50,
        }))
      );
      return () => {
        subChart.removeSeries(rsiLine);
      };
    } else {
      const macdHist = subChart.addHistogramSeries({
        title: 'MACD Histogram',
      });
      macdHist.setData(
        uniqueCandles.map((c, i) => {
          const val = tech.macdHistSeries[i] || 0;
          return {
            time: c.time as any,
            value: val,
            color:
              val >= 0
                ? 'rgba(16, 185, 129, 0.75)'
                : 'rgba(244, 63, 94, 0.75)',
          };
        })
      );
      return () => {
        subChart.removeSeries(macdHist);
      };
    }
  }, [candles, tech, subPane]);

  const lastCandle = candles[candles.length - 1];
  const displayOpen = hudData.open ?? lastCandle?.open ?? 0;
  const displayHigh = hudData.high ?? lastCandle?.high ?? 0;
  const displayLow = hudData.low ?? lastCandle?.low ?? 0;
  const displayClose = hudData.close ?? lastCandle?.close ?? 0;
  const displayEma9 = hudData.ema9 ?? tech.ema9 ?? 0;
  const displayEma21 = hudData.ema21 ?? tech.ema21 ?? 0;
  const displayVwap = hudData.vwap ?? tech.vwap ?? 0;
  const chgPct =
    hudData.changePct ??
    (displayOpen > 0 ? ((displayClose - displayOpen) / displayOpen) * 100 : 0);

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
            title="Show Good-Faith Prediction Target & Invalidation Levels"
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
          <button
            className="ind-chip reset-btn"
            onClick={() => {
              mainChartRef.current?.timeScale().resetTimeScale();
              subChartRef.current?.timeScale().resetTimeScale();
            }}
            title="Reset View & Fit Content"
          >
            Fit View
          </button>
          <button
            className="ind-chip reset-btn"
            onClick={() => {
              mainChartRef.current?.timeScale().scrollToRealTime();
              subChartRef.current?.timeScale().scrollToRealTime();
            }}
            title="Scroll to Real-Time Edge"
          >
            Live Edge ▸
          </button>
        </div>
      </div>

      <div className="chart-hud-bar">
        {hudData.time && <span className="hud-time">{hudData.time}</span>}
        <span>
          O: <strong>{formatPrice(displayOpen)}</strong>
        </span>
        <span>
          H: <strong>{formatPrice(displayHigh)}</strong>
        </span>
        <span>
          L: <strong>{formatPrice(displayLow)}</strong>
        </span>
        <span>
          C: <strong>{formatPrice(displayClose)}</strong>
        </span>
        <span className={chgPct >= 0 ? 'pos' : 'neg'}>
          {chgPct >= 0 ? '+' : ''}
          {chgPct.toFixed(2)}%
        </span>
        <span className="hud-ema9">EMA9: {formatPrice(displayEma9)}</span>
        <span className="hud-ema21">EMA21: {formatPrice(displayEma21)}</span>
        <span className="hud-vwap">VWAP: {formatPrice(displayVwap)}</span>
        <span>RSI(14): {tech.rsi14.toFixed(1)}</span>
        <span>ATR(14): {formatPrice(tech.atr14)}</span>
      </div>

      <div className="tv-chart-wrapper">
        <div ref={mainContainerRef} className="tv-main-chart" />
        <div ref={subContainerRef} className="tv-sub-chart" />
      </div>
    </div>
  );
};
