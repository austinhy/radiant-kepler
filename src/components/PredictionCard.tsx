import React from 'react';
import { PredictionSignal } from '../types/market';
import { formatPrice } from '../engine/predictor';

interface PredictionCardProps {
  signal: PredictionSignal;
  onExecutePaperTrade: (signal: PredictionSignal) => void;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({
  signal,
  onExecutePaperTrade,
}) => {
  const isBull = signal.compositeScore >= 15;
  const isBear = signal.compositeScore <= -15;

  const badgeClass = isBull
    ? 'signal-badge bull'
    : isBear
    ? 'signal-badge bear'
    : 'signal-badge neutral';

  return (
    <div className="prediction-card">
      <div className="pred-header">
        <div>
          <div className="pred-eyebrow">
            GOOD-FAITH QUANT + CATALYST ENGINE • {signal.timeframe.toUpperCase()}
          </div>
          <h3 className="pred-title">
            {signal.symbol}/USD Intelligence Forecast
          </h3>
        </div>
        <div className={badgeClass}>{signal.direction}</div>
      </div>

      <div className="pred-metrics-row">
        <div className="pred-stat-box">
          <span className="stat-label">Composite Edge</span>
          <span
            className={`stat-val ${
              signal.compositeScore > 0
                ? 'pos'
                : signal.compositeScore < 0
                ? 'neg'
                : ''
            }`}
          >
            {signal.compositeScore > 0 ? '+' : ''}
            {signal.compositeScore} / 100
          </span>
        </div>

        <div className="pred-stat-box">
          <span className="stat-label">Model Confidence</span>
          <span className="stat-val">{signal.confidence}%</span>
          <div className="mini-meter">
            <div
              className="mini-meter-fill"
              style={{
                width: `${signal.confidence}%`,
                background: isBull
                  ? '#10B981'
                  : isBear
                  ? '#F43F5E'
                  : '#F59E0B',
              }}
            />
          </div>
        </div>

        <div className="pred-stat-box">
          <span className="stat-label">Risk / Reward</span>
          <span className="stat-val">1 : {signal.riskRewardRatio}</span>
        </div>

        <div className="pred-stat-box">
          <span className="stat-label">Market Regime</span>
          <span className="stat-val regime-text">{signal.regime}</span>
        </div>
      </div>

      {!signal.actionable && signal.skipReason && (
        <div className="good-faith-warning">
          <strong>Good-Faith Capital Guardrail:</strong> {signal.skipReason}
        </div>
      )}

      <div className="trade-levels-grid">
        <div className="level-cell entry">
          <span className="level-label">Optimal Entry Zone</span>
          <strong className="level-price">
            {formatPrice(signal.entryZone[0])} –{' '}
            {formatPrice(signal.entryZone[1])}
          </strong>
          <span className="level-sub">{signal.horizonText}</span>
        </div>

        <div className="level-cell tp1">
          <span className="level-label">Take-Profit 1 (1.65R)</span>
          <strong className="level-price">
            {formatPrice(signal.takeProfit1)}
          </strong>
          <span className="level-sub">
            {signal.expectedMovePct > 0 ? '+' : ''}
            {signal.expectedMovePct}% target
          </span>
        </div>

        <div className="level-cell tp2">
          <span className="level-label">Take-Profit 2 (Runner)</span>
          <strong className="level-price">
            {formatPrice(signal.takeProfit2)}
          </strong>
          <span className="level-sub">2.75R extension</span>
        </div>

        <div className="level-cell sl">
          <span className="level-label">Hard Stop / Invalidation</span>
          <strong className="level-price">{formatPrice(signal.stopLoss)}</strong>
          <span className="level-sub">1.35x ATR structure stop</span>
        </div>
      </div>

      <div className="pillars-section">
        <div className="section-subtitle">
          <span>5-Pillar Signal Attribution</span>
          <span>Based on {signal.catalystsUsed} live internet catalysts</span>
        </div>
        <div className="pillars-list">
          {signal.pillars.map((p) => {
            const pct = Math.min(100, Math.abs(p.score));
            const color =
              p.score >= 14
                ? '#10B981'
                : p.score <= -14
                ? '#F43F5E'
                : '#94A3B8';
            return (
              <div key={p.id} className="pillar-row">
                <div className="pillar-top">
                  <span className="pillar-name">
                    {p.name}{' '}
                    <small>({Math.round(p.weight * 100)}% wt)</small>
                  </span>
                  <span className="pillar-metric">{p.metricText}</span>
                  <span className="pillar-score" style={{ color }}>
                    {p.score > 0 ? '+' : ''}
                    {p.score}
                  </span>
                </div>
                <div className="pillar-bar-track">
                  <div
                    className="pillar-bar-fill"
                    style={{
                      width: `${pct}%`,
                      background: color,
                    }}
                  />
                </div>
                <div className="pillar-desc">{p.summary}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="thesis-columns">
        <div className="thesis-box bull">
          <h4>▲ Bullish Confluence</h4>
          <ul>
            {signal.bullThesis.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="thesis-box bear">
          <h4>▼ Bearish Risks & Headwinds</h4>
          <ul>
            {signal.bearThesis.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="invalidation-footer">
        <div className="inv-text">
          <strong>Invalidation Trigger:</strong> {signal.invalidationCondition}
        </div>
        <button
          className="paper-exec-btn"
          onClick={() => onExecutePaperTrade(signal)}
        >
          Simulate {signal.compositeScore >= 0 ? 'LONG' : 'SHORT'} in Paper
          Trader ▸
        </button>
      </div>
    </div>
  );
};
