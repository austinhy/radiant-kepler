import React, { useEffect, useState } from 'react';
import {
  CoinSymbol,
  PaperPosition,
  PredictionSignal,
  TickerData,
} from '../types/market';
import { formatPrice } from '../engine/predictor';

interface PaperTraderProps {
  selectedSymbol: CoinSymbol;
  tickers: Record<CoinSymbol, TickerData>;
  prediction: PredictionSignal;
  positions: PaperPosition[];
  cashBalance: number;
  onOpenPosition: (pos: Omit<PaperPosition, 'id' | 'openedAt'>) => void;
  onClosePosition: (id: string, reason?: 'MANUAL') => void;
  onUpdatePositionTargets?: (id: string, stopLoss: number, takeProfit: number) => void;
  onResetAccount: () => void;
}

export const PaperTrader: React.FC<PaperTraderProps> = ({
  selectedSymbol,
  tickers,
  prediction,
  positions,
  cashBalance,
  onOpenPosition,
  onClosePosition,
  onUpdatePositionTargets,
  onResetAccount,
}) => {
  const livePrice =
    tickers[selectedSymbol]?.price || prediction.currentPrice || 1;

  const [side, setSide] = useState<'LONG' | 'SHORT'>(
    prediction.compositeScore >= 0 ? 'LONG' : 'SHORT'
  );
  const [riskPct, setRiskPct] = useState<number>(1.0);
  const [stopLossInput, setStopLossInput] = useState<string>(
    prediction.stopLoss.toFixed(livePrice >= 10 ? 2 : 4)
  );
  const [takeProfitInput, setTakeProfitInput] = useState<string>(
    prediction.takeProfit1.toFixed(livePrice >= 10 ? 2 : 4)
  );

  const [editingPosId, setEditingPosId] = useState<string | null>(null);
  const [editSlInput, setEditSlInput] = useState<string>('');
  const [editTpInput, setEditTpInput] = useState<string>('');

  // Sync defaults when selectedSymbol changes
  useEffect(() => {
    setSide(prediction.compositeScore >= 0 ? 'LONG' : 'SHORT');
    const dec = livePrice >= 10 ? 2 : 4;
    setStopLossInput(prediction.stopLoss.toFixed(dec));
    setTakeProfitInput(prediction.takeProfit1.toFixed(dec));
  }, [selectedSymbol]);

  const openPositions = positions.filter((p) => !p.closedAt);
  const closedPositions = positions.filter((p) => p.closedAt);

  // Compute live unrealized PnL
  let totalUnrealizedPnl = 0;
  let totalAllocatedMargin = 0;
  for (const pos of openPositions) {
    const mark = tickers[pos.symbol]?.price || pos.entryPrice;
    const diff =
      pos.side === 'LONG' ? mark - pos.entryPrice : pos.entryPrice - mark;
    totalUnrealizedPnl += diff * pos.sizeCoins;
    totalAllocatedMargin += pos.notionalUsd;
  }

  const totalRealizedPnl = closedPositions.reduce(
    (sum, p) => sum + (p.realizedPnl || 0),
    0
  );
  const totalEquity = cashBalance + totalAllocatedMargin + totalUnrealizedPnl;

  const wins = closedPositions.filter((p) => (p.realizedPnl || 0) > 0).length;
  const winRate =
    closedPositions.length > 0
      ? Math.round((wins / closedPositions.length) * 100)
      : 0;

  // Smart Position Sizer math
  const slNum = parseFloat(stopLossInput) || livePrice * 0.98;
  const tpNum = parseFloat(takeProfitInput) || livePrice * 1.03;
  const perCoinStopDist = Math.max(
    Math.abs(livePrice - slNum),
    livePrice * 0.002
  );
  const maxRiskDollars = (totalEquity * riskPct) / 100;
  const rawCoins = maxRiskDollars / perCoinStopDist;
  const cappedNotional = Math.min(rawCoins * livePrice, cashBalance * 0.95);
  const finalSizeCoins = cappedNotional / Math.max(livePrice, 0.00001);
  const estRewardDollars = Math.abs(tpNum - livePrice) * finalSizeCoins;
  const estRR =
    maxRiskDollars > 0
      ? (estRewardDollars / Math.min(maxRiskDollars, cappedNotional)).toFixed(2)
      : '0.00';

  return (
    <div className="paper-trader-panel">
      <div className="pred-header">
        <div>
          <div className="pred-eyebrow">
            PAPER TRADING SIMULATOR & RISK-SIZED EXECUTION
          </div>
          <h3 className="pred-title">
            Simulated Portfolio & Prediction Scorecard
          </h3>
        </div>
        <button className="reset-acct-btn" onClick={onResetAccount}>
          Reset $100k Sim
        </button>
      </div>

      <div className="portfolio-stats-grid">
        <div className="port-stat">
          <span className="stat-label">Simulated Equity</span>
          <strong className="stat-val">{formatPrice(totalEquity)}</strong>
        </div>
        <div className="port-stat">
          <span className="stat-label">Unrealized PnL</span>
          <strong
            className={`stat-val ${
              totalUnrealizedPnl > 0
                ? 'pos'
                : totalUnrealizedPnl < 0
                ? 'neg'
                : ''
            }`}
          >
            {totalUnrealizedPnl >= 0 ? '+' : ''}
            {formatPrice(totalUnrealizedPnl)}
          </strong>
        </div>
        <div className="port-stat">
          <span className="stat-label">Realized PnL</span>
          <strong
            className={`stat-val ${
              totalRealizedPnl > 0 ? 'pos' : totalRealizedPnl < 0 ? 'neg' : ''
            }`}
          >
            {totalRealizedPnl >= 0 ? '+' : ''}
            {formatPrice(totalRealizedPnl)}
          </strong>
        </div>
        <div className="port-stat">
          <span className="stat-label">Win Rate ({closedPositions.length})</span>
          <strong className="stat-val">{winRate}%</strong>
        </div>
      </div>

      <div className="order-ticket-box">
        <div className="ticket-top">
          <div className="side-toggle">
            <button
              className={`side-btn long ${side === 'LONG' ? 'active' : ''}`}
              onClick={() => {
                setSide('LONG');
                const dec = livePrice >= 10 ? 2 : 4;
                setStopLossInput((livePrice * 0.982).toFixed(dec));
                setTakeProfitInput((livePrice * 1.032).toFixed(dec));
              }}
            >
              LONG {selectedSymbol}
            </button>
            <button
              className={`side-btn short ${side === 'SHORT' ? 'active' : ''}`}
              onClick={() => {
                setSide('SHORT');
                const dec = livePrice >= 10 ? 2 : 4;
                setStopLossInput((livePrice * 1.018).toFixed(dec));
                setTakeProfitInput((livePrice * 0.968).toFixed(dec));
              }}
            >
              SHORT {selectedSymbol}
            </button>
          </div>
          <button
            className="sync-ai-btn"
            onClick={() => {
              setSide(prediction.compositeScore >= 0 ? 'LONG' : 'SHORT');
              const dec = livePrice >= 10 ? 2 : 4;
              setStopLossInput(prediction.stopLoss.toFixed(dec));
              setTakeProfitInput(prediction.takeProfit1.toFixed(dec));
            }}
          >
            ⚡ Sync AI Levels
          </button>
        </div>

        <div className="ticket-inputs-row">
          <div className="input-field">
            <label>Account Risk %</label>
            <div className="risk-pills">
              {[0.5, 1.0, 2.0].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`risk-pill ${riskPct === r ? 'active' : ''}`}
                  onClick={() => setRiskPct(r)}
                >
                  {r}%
                </button>
              ))}
            </div>
          </div>

          <div className="input-field">
            <label>Stop-Loss ($)</label>
            <input
              type="number"
              step="any"
              value={stopLossInput}
              onChange={(e) => setStopLossInput(e.target.value)}
            />
          </div>

          <div className="input-field">
            <label>Take-Profit ($)</label>
            <input
              type="number"
              step="any"
              value={takeProfitInput}
              onChange={(e) => setTakeProfitInput(e.target.value)}
            />
          </div>
        </div>

        <div className="sizing-preview">
          <span>
            Auto-Sized Position:{' '}
            <strong>
              {finalSizeCoins.toFixed(4)} {selectedSymbol} (
              {formatPrice(cappedNotional)})
            </strong>
          </span>
          <span>
            Max Stop Loss: <strong className="neg">-{formatPrice(maxRiskDollars)}</strong>
          </span>
          <span>
            Target Gain: <strong className="pos">+{formatPrice(estRewardDollars)}</strong>{' '}
            (1:{estRR})
          </span>
        </div>

        <button
          className={`place-order-btn ${side.toLowerCase()}`}
          disabled={cappedNotional < 10}
          onClick={() => {
            onOpenPosition({
              symbol: selectedSymbol,
              side,
              entryPrice: livePrice,
              sizeCoins: finalSizeCoins,
              notionalUsd: cappedNotional,
              stopLoss: slNum,
              takeProfit: tpNum,
              thesisSnapshot: `${prediction.direction} (${prediction.confidence}% conf)`,
              predictionConfidence: prediction.confidence,
            });
          }}
        >
          Open Paper {side} @ {formatPrice(livePrice)}
        </button>
      </div>

      <div className="positions-section">
        <div className="section-subtitle">
          <span>Active Paper Positions ({openPositions.length})</span>
          <span>Auto-triggers TP/SL on live WebSocket ticks</span>
        </div>

        {openPositions.length === 0 ? (
          <div className="empty-positions">
            No active paper positions. Click &ldquo;Simulate in Paper
            Trader&rdquo; on any prediction card or open a position above.
          </div>
        ) : (
          <div className="positions-list">
            {openPositions.map((pos) => {
              const mark = tickers[pos.symbol]?.price || pos.entryPrice;
              const diff =
                pos.side === 'LONG'
                  ? mark - pos.entryPrice
                  : pos.entryPrice - mark;
              const pnlUsd = diff * pos.sizeCoins;
              const pnlPct = (pnlUsd / Math.max(pos.notionalUsd, 1)) * 100;

              return (
                <React.Fragment key={pos.id}>
                  <div className="position-row">
                    <div className="pos-main">
                    <span
                      className={`pos-badge ${
                        pos.side === 'LONG' ? 'long' : 'short'
                      }`}
                    >
                      {pos.side}
                    </span>
                    <strong>{pos.symbol}/USD</strong>
                    <span className="pos-size">
                      {pos.sizeCoins.toFixed(4)} ({formatPrice(pos.notionalUsd)})
                    </span>
                  </div>
                  <div className="pos-prices">
                    <span>Entry: {formatPrice(pos.entryPrice)}</span>
                    <span>Mark: {formatPrice(mark)}</span>
                    <span className="neg">SL: {formatPrice(pos.stopLoss)}</span>
                    <span className="pos">TP: {formatPrice(pos.takeProfit)}</span>
                  </div>
                  <div className="pos-pnl-col">
                    <strong className={pnlUsd >= 0 ? 'pos' : 'neg'}>
                      {pnlUsd >= 0 ? '+' : ''}
                      {formatPrice(pnlUsd)} ({pnlPct >= 0 ? '+' : ''}
                      {pnlPct.toFixed(2)}%)
                    </strong>
                    <button
                      className="modify-sl-tp-btn"
                      onClick={() => {
                        setEditingPosId(pos.id);
                        const dec = pos.entryPrice >= 10 ? 2 : 4;
                        setEditSlInput(pos.stopLoss.toFixed(dec));
                        setEditTpInput(pos.takeProfit.toFixed(dec));
                      }}
                    >
                      Modify SL/TP
                    </button>
                    <button
                      className="close-pos-btn"
                      onClick={() => onClosePosition(pos.id, 'MANUAL')}
                    >
                      Close @ Market
                    </button>
                  </div>
                </div>
                {editingPosId === pos.id && (
                  <div className="pos-edit-box">
                    <div className="pos-edit-row">
                      <div className="pos-edit-field">
                        <label>Adjust Stop Loss ($)</label>
                        <input
                          type="number"
                          step="any"
                          value={editSlInput}
                          onChange={(e) => setEditSlInput(e.target.value)}
                        />
                        <div className="pos-edit-pills">
                          <button
                            type="button"
                            className="pos-quick-pill"
                            onClick={() => {
                              const dec = pos.entryPrice >= 10 ? 2 : 4;
                              setEditSlInput(pos.entryPrice.toFixed(dec));
                            }}
                          >
                            Break-Even ({formatPrice(pos.entryPrice)})
                          </button>
                          <button
                            type="button"
                            className="pos-quick-pill"
                            onClick={() => {
                              const dec = pos.entryPrice >= 10 ? 2 : 4;
                              const val = pos.side === 'LONG' ? mark * 0.985 : mark * 1.015;
                              setEditSlInput(val.toFixed(dec));
                            }}
                          >
                            -1.5% Mark
                          </button>
                          <button
                            type="button"
                            className="pos-quick-pill"
                            onClick={() => {
                              const dec = pos.entryPrice >= 10 ? 2 : 4;
                              const val = pos.side === 'LONG' ? mark * 0.97 : mark * 1.03;
                              setEditSlInput(val.toFixed(dec));
                            }}
                          >
                            -3.0% Mark
                          </button>
                        </div>
                      </div>
                      <div className="pos-edit-field">
                        <label>Adjust Take Profit ($)</label>
                        <input
                          type="number"
                          step="any"
                          value={editTpInput}
                          onChange={(e) => setEditTpInput(e.target.value)}
                        />
                        <div className="pos-edit-pills">
                          <button
                            type="button"
                            className="pos-quick-pill"
                            onClick={() => {
                              const dec = pos.entryPrice >= 10 ? 2 : 4;
                              const val = pos.side === 'LONG' ? mark * 1.02 : mark * 0.98;
                              setEditTpInput(val.toFixed(dec));
                            }}
                          >
                            +2% Mark
                          </button>
                          <button
                            type="button"
                            className="pos-quick-pill"
                            onClick={() => {
                              const dec = pos.entryPrice >= 10 ? 2 : 4;
                              const val = pos.side === 'LONG' ? mark * 1.05 : mark * 0.95;
                              setEditTpInput(val.toFixed(dec));
                            }}
                          >
                            +5% Mark
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="pos-edit-actions">
                      <button
                        type="button"
                        className="cancel-targets-btn"
                        onClick={() => setEditingPosId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="save-targets-btn"
                        onClick={() => {
                          const sl = parseFloat(editSlInput);
                          const tp = parseFloat(editTpInput);
                          if (Number.isFinite(sl) && Number.isFinite(tp) && sl > 0 && tp > 0) {
                            onUpdatePositionTargets?.(pos.id, sl, tp);
                            setEditingPosId(null);
                          }
                        }}
                      >
                        Save Targets
                      </button>
                    </div>
                  </div>
                )}
              </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
