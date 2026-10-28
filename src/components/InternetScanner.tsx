import React, { useState } from 'react';
import {
  CoinSymbol,
  FearGreedData,
  InternetCatalyst,
} from '../types/market';

interface InternetScannerProps {
  selectedSymbol: CoinSymbol;
  catalysts: InternetCatalyst[];
  fearGreed: FearGreedData;
  isScanning: boolean;
  lastScanTime: number;
  onRefreshScan: (customQuery?: string) => void;
  onSelectCoin: (coin: CoinSymbol) => void;
}

export const InternetScanner: React.FC<InternetScannerProps> = ({
  selectedSymbol,
  catalysts,
  fearGreed,
  isScanning,
  lastScanTime,
  onRefreshScan,
  onSelectCoin,
}) => {
  const [filter, setFilter] = useState<
    'ALL' | 'COIN' | 'MACRO' | 'ETF' | 'REDDIT' | 'HIGH'
  >('ALL');
  const [searchInput, setSearchInput] = useState('');

  const filtered = catalysts.filter((item) => {
    if (filter === 'COIN') {
      return (
        item.affectedCoins.includes(selectedSymbol) ||
        item.affectedCoins.includes('MARKET')
      );
    }
    if (filter === 'MACRO') return item.category === 'macro-economy';
    if (filter === 'ETF') return item.category === 'regulatory-etf';
    if (filter === 'REDDIT') return item.category === 'social-reddit';
    if (filter === 'HIGH') return item.impactLevel === 'HIGH';
    return true;
  });

  const bullCount = filtered.filter((c) => c.sentimentLabel === 'BULLISH').length;
  const bearCount = filtered.filter((c) => c.sentimentLabel === 'BEARISH').length;
  const netPulse =
    filtered.length > 0
      ? Math.round(
          filtered.reduce((s, c) => s + c.sentimentScore, 0) / filtered.length
        )
      : 0;

  const formatAgo = (ts: number) => {
    const diffMin = Math.max(1, Math.floor((Date.now() - ts) / 60000));
    if (diffMin < 60) return `${diffMin}m ago`;
    const hrs = Math.floor(diffMin / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="scanner-panel">
      <div className="scanner-header">
        <div>
          <div className="pred-eyebrow">
            LIVE WEB • RSS • GOOGLE NEWS MACRO • REDDIT PULSE
          </div>
          <h3 className="pred-title">Internet Catalyst & Sentiment Feed</h3>
        </div>
        <button
          className="scan-btn"
          disabled={isScanning}
          onClick={() => onRefreshScan(searchInput)}
        >
          {isScanning ? 'Scanning Web…' : '↻ Scan Live Internet'}
        </button>
      </div>

      <div className="scanner-summary-bar">
        <div className="pulse-pill">
          <span>Fear & Greed:</span>
          <strong
            style={{
              color:
                fearGreed.value >= 55
                  ? '#10B981'
                  : fearGreed.value <= 40
                  ? '#F43F5E'
                  : '#F59E0B',
            }}
          >
            {fearGreed.value} ({fearGreed.classification})
          </strong>
        </div>
        <div className="pulse-pill">
          <span>Net Web Sentiment:</span>
          <strong
            className={netPulse > 5 ? 'pos' : netPulse < -5 ? 'neg' : ''}
          >
            {netPulse > 0 ? '+' : ''}
            {netPulse}
          </strong>
        </div>
        <div className="pulse-pill">
          <span className="pos">▲ {bullCount} Bullish</span>
          <span>•</span>
          <span className="neg">▼ {bearCount} Bearish</span>
        </div>
        <div className="pulse-pill muted">
          Updated {formatAgo(lastScanTime)}
        </div>
      </div>

      <form
        className="web-search-row"
        onSubmit={(e) => {
          e.preventDefault();
          onRefreshScan(searchInput);
        }}
      >
        <input
          type="text"
          className="web-search-input"
          placeholder="Search live internet for market catalysts (e.g. 'Fed rate cut', 'Solana ETF', 'CPI inflation')…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <button type="submit" className="web-search-submit" disabled={isScanning}>
          Search Web
        </button>
        {searchInput && (
          <button
            type="button"
            className="web-search-clear"
            onClick={() => {
              setSearchInput('');
              onRefreshScan('');
            }}
          >
            Clear
          </button>
        )}
      </form>

      <div className="scanner-filter-tabs">
        <button
          className={`filter-tab ${filter === 'ALL' ? 'active' : ''}`}
          onClick={() => setFilter('ALL')}
        >
          All Feeds ({catalysts.length})
        </button>
        <button
          className={`filter-tab ${filter === 'COIN' ? 'active' : ''}`}
          onClick={() => setFilter('COIN')}
        >
          {selectedSymbol} & Macro
        </button>
        <button
          className={`filter-tab ${filter === 'HIGH' ? 'active' : ''}`}
          onClick={() => setFilter('HIGH')}
        >
          ⚡ High Impact
        </button>
        <button
          className={`filter-tab ${filter === 'MACRO' ? 'active' : ''}`}
          onClick={() => setFilter('MACRO')}
        >
          🏛 Macro / Fed
        </button>
        <button
          className={`filter-tab ${filter === 'ETF' ? 'active' : ''}`}
          onClick={() => setFilter('ETF')}
        >
          ⚖ SEC / ETFs
        </button>
        <button
          className={`filter-tab ${filter === 'REDDIT' ? 'active' : ''}`}
          onClick={() => setFilter('REDDIT')}
        >
          💬 Social / Reddit
        </button>
      </div>

      <div className="catalyst-feed-list">
        {filtered.map((item) => {
          const isBull = item.sentimentLabel === 'BULLISH';
          const isBear = item.sentimentLabel === 'BEARISH';
          return (
            <div
              key={item.id}
              className={`catalyst-item ${
                item.impactLevel === 'HIGH' ? 'high-impact' : ''
              }`}
            >
              <div className="catalyst-meta">
                <span className="catalyst-source">{item.source}</span>
                <span className="catalyst-time">
                  {formatAgo(item.publishedAt)}
                </span>
                {item.impactLevel === 'HIGH' && (
                  <span className="impact-badge">HIGH IMPACT</span>
                )}
                <span
                  className={`sent-badge ${
                    isBull ? 'bull' : isBear ? 'bear' : 'neutral'
                  }`}
                >
                  {item.sentimentLabel} ({item.sentimentScore > 0 ? '+' : ''}
                  {item.sentimentScore})
                </span>
              </div>

              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="catalyst-title"
              >
                {item.title}
              </a>

              {item.summary && item.summary !== item.title && (
                <p className="catalyst-summary">{item.summary}</p>
              )}

              <div className="catalyst-tags">
                {item.affectedCoins.map((c) => (
                  <button
                    key={c}
                    className={`coin-tag ${
                      c === selectedSymbol ? 'selected' : ''
                    }`}
                    onClick={() => {
                      if (c !== 'MARKET') onSelectCoin(c);
                    }}
                  >
                    {c === 'MARKET' ? '🌐 MACRO / MARKET' : `$${c}`}
                  </button>
                ))}
                {item.matchedKeywords.map((kw, idx) => (
                  <span key={idx} className="kw-tag">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
