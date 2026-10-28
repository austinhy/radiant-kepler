import {
  CatalystCategory,
  CoinMeta,
  CoinSymbol,
  InternetCatalyst,
} from '../types/market';

export const COINS: CoinMeta[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    coinbaseProduct: 'BTC-USD',
    binanceSymbol: 'BTCUSDT',
    krakenPair: 'XXBTZUSD',
    color: '#F7931A',
    category: 'Layer 1 / Store of Value',
    keywords: ['bitcoin', 'btc', 'satoshi', 'ibit', 'fbtc', 'halving', 'saylor', 'microstrategy'],
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    coinbaseProduct: 'ETH-USD',
    binanceSymbol: 'ETHUSDT',
    krakenPair: 'XETHZUSD',
    color: '#627EEA',
    category: 'Smart Contracts / L1',
    keywords: ['ethereum', 'eth', 'ether', 'vitalik', 'pectra', 'layer-2', 'l2', 'etha'],
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    coinbaseProduct: 'SOL-USD',
    binanceSymbol: 'SOLUSDT',
    krakenPair: 'SOLUSD',
    color: '#14F195',
    category: 'High-Speed L1',
    keywords: ['solana', 'sol', 'firedancer', 'jupiter', 'raydium'],
  },
  {
    symbol: 'XRP',
    name: 'XRP',
    coinbaseProduct: 'XRP-USD',
    binanceSymbol: 'XRPUSDT',
    krakenPair: 'XXRPZUSD',
    color: '#00AAE4',
    category: 'Global Payments',
    keywords: ['xrp', 'ripple', 'rlusd', 'garlinghouse'],
  },
  {
    symbol: 'BNB',
    name: 'BNB',
    coinbaseProduct: 'BNB-USD',
    binanceSymbol: 'BNBUSDT',
    krakenPair: 'BNBUSD',
    color: '#F3BA2F',
    category: 'Exchange / BNB Chain',
    keywords: ['bnb', 'binance chain', 'bsc', 'launchpad'],
  },
  {
    symbol: 'DOGE',
    name: 'Dogecoin',
    coinbaseProduct: 'DOGE-USD',
    binanceSymbol: 'DOGEUSDT',
    krakenPair: 'XDGUSD',
    color: '#C2A633',
    category: 'Payments / Meme',
    keywords: ['dogecoin', 'doge', 'elon'],
  },
  {
    symbol: 'AVAX',
    name: 'Avalanche',
    coinbaseProduct: 'AVAX-USD',
    binanceSymbol: 'AVAXUSDT',
    krakenPair: 'AVAXUSD',
    color: '#E84142',
    category: 'Subnets / L1',
    keywords: ['avalanche', 'avax'],
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    coinbaseProduct: 'LINK-USD',
    binanceSymbol: 'LINKUSDT',
    krakenPair: 'LINKUSD',
    color: '#2A5ADA',
    category: 'Oracle / RWA Infrastructure',
    keywords: ['chainlink', 'link', 'ccip', 'oracle', 'swift'],
  },
  {
    symbol: 'SUI',
    name: 'Sui',
    coinbaseProduct: 'SUI-USD',
    binanceSymbol: 'SUIUSDT',
    krakenPair: 'SUIUSD',
    color: '#4DA2FF',
    category: 'Move L1',
    keywords: ['sui', 'mysten'],
  },
  {
    symbol: 'ADA',
    name: 'Cardano',
    coinbaseProduct: 'ADA-USD',
    binanceSymbol: 'ADAUSDT',
    krakenPair: 'ADAUSD',
    color: '#3CC8C8',
    category: 'PoS Layer 1',
    keywords: ['cardano', 'ada', 'hoskinson'],
  },
];

const BULLISH_LEXICON: Array<[string, number]> = [
  ['etf inflow', 46],
  ['record inflow', 52],
  ['net inflow', 38],
  ['inflows', 28],
  ['rate cut', 44],
  ['dovish', 36],
  ['inflation cools', 40],
  ['lower inflation', 35],
  ['sec approves', 55],
  ['approval', 32],
  ['approved', 34],
  ['institutional buying', 45],
  ['accumulating', 30],
  ['accumulation', 30],
  ['all-time high', 42],
  ['ath', 30],
  ['breakout', 32],
  ['surges', 30],
  ['soars', 34],
  ['rallies', 28],
  ['rally', 24],
  ['bullish', 30],
  ['short squeeze', 40],
  ['strategic reserve', 48],
  ['treasury reserve', 42],
  ['partnership', 25],
  ['adoption', 28],
  ['upgrade', 22],
  ['mainnet', 25],
  ['whale bought', 34],
  ['whales buy', 34],
  ['exchange outflow', 32],
  ['supply shock', 36],
  ['outperform', 24],
  ['rebound', 22],
  ['recovery', 20],
  ['gains', 18],
  ['jumps', 24],
  [' climbs', 18],
  ['dismisses lawsuit', 50],
  ['drops charges', 48],
];

const BEARISH_LEXICON: Array<[string, number]> = [
  ['hack', -55],
  ['hacked', -58],
  ['exploit', -54],
  ['drained', -55],
  ['sec lawsuit', -48],
  ['sued', -40],
  ['subpoena', -42],
  ['etf outflow', -45],
  ['record outflow', -52],
  ['net outflow', -38],
  ['outflows', -28],
  ['rate hike', -46],
  ['hawkish', -38],
  ['hot inflation', -40],
  ['sticky inflation', -34],
  ['liquidated', -38],
  ['liquidations', -34],
  ['bankruptcy', -56],
  ['insolvent', -55],
  ['halted withdrawals', -58],
  ['delist', -44],
  ['ban', -42],
  ['crackdown', -38],
  ['plunges', -36],
  ['crashes', -45],
  ['slumps', -30],
  ['dumps', -34],
  ['tumbles', -30],
  ['bearish', -30],
  ['sell-off', -34],
  ['selloff', -34],
  ['capitulation', -36],
  ['recession', -38],
  ['tariff', -28],
  ['sanctions', -26],
  ['rejected', -36],
  ['delays decision', -25],
  ['whale dumped', -36],
  ['drops', -20],
  ['falls', -18],
  ['declines', -18],
  ['fear', -20],
];

const NEGATIONS = ['no ', 'not ', 'never ', 'denies ', 'denied ', 'without ', 'unlikely '];

export function scoreCatalystText(
  title: string,
  summary: string,
  source: string
): {
  sentimentScore: number;
  sentimentLabel: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  impactLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  affectedCoins: (CoinSymbol | 'MARKET')[];
  category: CatalystCategory;
  matchedKeywords: string[];
} {
  const fullText = `${title} ${summary}`.toLowerCase();
  const titleLower = title.toLowerCase();

  let rawScore = 0;
  const matchedKeywords: string[] = [];

  for (const [phrase, weight] of BULLISH_LEXICON) {
    const idx = fullText.indexOf(phrase);
    if (idx !== -1) {
      const prefix = fullText.slice(Math.max(0, idx - 18), idx);
      const isNegated = NEGATIONS.some((n) => prefix.includes(n));
      const inTitle = titleLower.includes(phrase) ? 1.25 : 0.85;
      rawScore += (isNegated ? -weight * 0.8 : weight) * inTitle;
      matchedKeywords.push(isNegated ? `not ${phrase}` : phrase);
    }
  }

  for (const [phrase, weight] of BEARISH_LEXICON) {
    const idx = fullText.indexOf(phrase);
    if (idx !== -1) {
      const prefix = fullText.slice(Math.max(0, idx - 18), idx);
      const isNegated = NEGATIONS.some((n) => prefix.includes(n));
      const inTitle = titleLower.includes(phrase) ? 1.25 : 0.85;
      rawScore += (isNegated ? -weight * 0.7 : weight) * inTitle;
      matchedKeywords.push(isNegated ? `not ${phrase}` : phrase);
    }
  }

  // Clamp between -96 and +96
  const sentimentScore = Math.round(Math.max(-96, Math.min(96, rawScore)));
  const sentimentLabel: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
    sentimentScore >= 14 ? 'BULLISH' : sentimentScore <= -14 ? 'BEARISH' : 'NEUTRAL';

  // Detect affected coins
  const affectedCoins: (CoinSymbol | 'MARKET')[] = [];
  for (const coin of COINS) {
    const matched = coin.keywords.some((kw) => {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      return regex.test(fullText);
    });
    if (matched) {
      affectedCoins.push(coin.symbol);
    }
  }

  // Detect category
  let category: CatalystCategory = 'crypto-news';
  if (
    /\b(fed|federal reserve|powell|cpi|inflation|fomc|treasury|yield|gdp|jobs report|macro|rate cut|rate hike|tariff)\b/i.test(
      fullText
    )
  ) {
    category = 'macro-economy';
    if (!affectedCoins.includes('MARKET')) affectedCoins.push('MARKET');
  } else if (/\b(sec|etf|blackrock|fidelity|grayscale|cftc|regulation|congress|senate|lawsuit)\b/i.test(fullText)) {
    category = 'regulatory-etf';
  } else if (/\b(whale|on-chain|onchain|inflow|outflow|wallet|minted|burned|tvl|open interest)\b/i.test(fullText)) {
    category = 'onchain-flow';
  } else if (source.toLowerCase().includes('reddit')) {
    category = 'social-reddit';
  }

  if (affectedCoins.length === 0) {
    affectedCoins.push('MARKET');
  }

  const absScore = Math.abs(sentimentScore);
  const impactLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
    absScore >= 42 || category === 'macro-economy' || category === 'regulatory-etf'
      ? 'HIGH'
      : absScore >= 20
      ? 'MEDIUM'
      : 'LOW';

  return {
    sentimentScore,
    sentimentLabel,
    impactLevel,
    affectedCoins,
    category,
    matchedKeywords: matchedKeywords.slice(0, 4),
  };
}

function stripHtml(html: string): string {
  return html
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

export function parseRssXmlToCatalysts(
  xmlText: string,
  sourceName: string
): InternetCatalyst[] {
  const items: InternetCatalyst[] = [];
  const itemBlocks = xmlText.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) || [];

  for (let i = 0; i < Math.min(itemBlocks.length, 15); i++) {
    const block = itemBlocks[i];
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch =
      block.match(/<description[^>]*>([\s\S]*?)<\/description>/i) ||
      block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) ||
      block.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
    const linkMatch =
      block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) ||
      block.match(/<link[^>]*href=["']([^"']+)["']/i);
    const dateMatch =
      block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
      block.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
      block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);

    const rawTitle = titleMatch ? stripHtml(titleMatch[1]) : '';
    if (!rawTitle || rawTitle.length < 10) continue;

    const rawSummary = descMatch ? stripHtml(descMatch[1]).slice(0, 260) : '';
    const url = linkMatch ? stripHtml(linkMatch[1]) : 'https://news.google.com';
    const parsedTime = dateMatch ? Date.parse(stripHtml(dateMatch[1])) : Date.now();
    const publishedAt = Number.isNaN(parsedTime) ? Date.now() - i * 300_000 : parsedTime;

    const scored = scoreCatalystText(rawTitle, rawSummary, sourceName);

    items.push({
      id: `${sourceName}-${i}-${rawTitle.slice(0, 24).replace(/\W+/g, '')}`,
      title: rawTitle,
      summary: rawSummary || rawTitle,
      source: sourceName,
      category: scored.category,
      url,
      publishedAt,
      sentimentScore: scored.sentimentScore,
      sentimentLabel: scored.sentimentLabel,
      impactLevel: scored.impactLevel,
      affectedCoins: scored.affectedCoins,
      matchedKeywords: scored.matchedKeywords,
    });
  }

  return items;
}

export function parseRedditJsonToCatalysts(
  jsonText: string,
  subreddit: string
): InternetCatalyst[] {
  try {
    const parsed = JSON.parse(jsonText);
    const children = parsed?.data?.children || [];
    const results: InternetCatalyst[] = [];

    for (let i = 0; i < Math.min(children.length, 12); i++) {
      const post = children[i]?.data;
      if (!post || post.stickied || !post.title) continue;
      const title = String(post.title).trim();
      const summary = String(post.selftext || '').slice(0, 220).trim();
      const url = post.permalink
        ? `https://www.reddit.com${post.permalink}`
        : 'https://www.reddit.com';
      const publishedAt = post.created_utc ? post.created_utc * 1000 : Date.now();
      const scored = scoreCatalystText(title, summary, `Reddit r/${subreddit}`);

      results.push({
        id: `reddit-${subreddit}-${post.id || i}`,
        title,
        summary:
          summary ||
          `Upvotes: ${post.ups ?? 0} • Comments: ${post.num_comments ?? 0} on r/${subreddit}`,
        source: `Reddit r/${subreddit}`,
        category: 'social-reddit',
        url,
        publishedAt,
        sentimentScore: scored.sentimentScore,
        sentimentLabel: scored.sentimentLabel,
        impactLevel: scored.impactLevel,
        affectedCoins: scored.affectedCoins,
        matchedKeywords: scored.matchedKeywords,
      });
    }
    return results;
  } catch {
    return [];
  }
}
