import type { BondingMarket } from '../types';

const GAMMA_API = import.meta.env.DEV ? '/api/gamma' : 'https://gamma-api.polymarket.com';
const CLOB_API = import.meta.env.DEV ? '/api/clob' : 'https://clob.polymarket.com';
const PAGE_SIZE = 100;
const CLOB_BATCH_SIZE = 200; // POST /books supports up to 500; stay conservative
const MAX_RETRIES = 2;
const RETRY_DELAY = 1500;
const PAGE_DELAY = 200;

interface GammaMarket {
  question: string | null;
  slug: string | null;
  outcomes: string | null;
  outcomePrices: string | null;
  endDateIso: string | null;
  volume: string | null;
  volumeNum: number | null;
  volume24hr: number | null;
  lastTradePrice: number | null;
  bestBid: number | null;
  bestAsk: number | null;
  clobTokenIds: string | null;
  enableOrderBook: boolean | null;
  acceptingOrders: boolean | null;
  active: boolean | null;
  closed: boolean | null;
}

interface GammaTag {
  label: string;
}

interface GammaEvent {
  id: string;
  slug: string | null;
  tags: GammaTag[] | null;
  markets: GammaMarket[];
}

function parseJsonString<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function fetchWithRetry(url: string): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res;
    if (res.status === 502 || res.status === 503 || res.status === 429) {
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY * (attempt + 1)));
        continue;
      }
    }
    throw new Error(`Gamma API error: ${res.status}`);
  }
  throw new Error('Gamma API: max retries exceeded');
}

interface ClobBook {
  asset_id: string;
  bids: { price: string; size: string }[];
  asks: { price: string; size: string }[];
}

/**
 * Batch-check which tokens have real asks on the CLOB order book.
 *
 * Why this exists:
 * Gamma API's bestBid/bestAsk fields ONLY refer to clobTokenIds[0] (the Yes
 * token), not the market as a whole. When token[0] has no asks, Gamma reports
 * bestAsk = 1 (a sentinel, not a real price). The CLOB's /price, /spread, and
 * /midpoint endpoints also can't help — they synthesize virtual prices from the
 * complement token, masking one-sided books.
 *
 * The only reliable way to know if a market is actually tradeable is to check
 * the raw order book via POST /books. If the dominant outcome token has no asks,
 * nobody is selling it and you can't buy in — so we filter it out.
 *
 * POST /books silently omits tokens with no book from the response array,
 * so absence from the response = no book = not tradeable.
 */
async function getTokensWithAsks(tokenIds: string[]): Promise<{ asks: Set<string>; clobAvailable: boolean }> {
  const hasAsks = new Set<string>();
  let successCount = 0;
  for (let i = 0; i < tokenIds.length; i += CLOB_BATCH_SIZE) {
    const batch = tokenIds.slice(i, i + CLOB_BATCH_SIZE);
    const body = batch.map((token_id) => ({ token_id }));
    try {
      const res = await fetch(`${CLOB_API}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) continue;
      successCount++;
      const books: ClobBook[] = await res.json();
      for (const book of books) {
        if (book.asks && book.asks.length > 0) {
          hasAsks.add(book.asset_id);
        }
      }
    } catch {
      // Network error — skip this batch
    }
  }
  // If CLOB is unavailable (e.g. 403 from Pi IP), return all tokens as valid
  // rather than showing nothing. User can verify liquidity on Polymarket.
  return { asks: hasAsks, clobAvailable: successCount > 0 };
}

export type FetchProgress = {
  phase: 'fetching' | 'processing';
  loaded: number;
  page: number;
};

async function fetchEventsInHorizon(
  horizonHours: number,
  onProgress?: (p: FetchProgress) => void,
): Promise<GammaEvent[]> {
  const all: GammaEvent[] = [];
  let offset = 0;
  let page = 1;

  const now = new Date();
  // Look back 3 hours so live games running past their scheduled end time are still captured.
  // The local timeRemaining check below handles true expiry filtering.
  const endDateMin = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
  const endDateMax = new Date(now.getTime() + horizonHours * 60 * 60 * 1000).toISOString();

  while (true) {
    onProgress?.({ phase: 'fetching', loaded: all.length, page });

    const params = new URLSearchParams({
      active: 'true',
      closed: 'false',
      order: 'endDate',
      ascending: 'true',
      end_date_min: endDateMin,
      end_date_max: endDateMax,
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });

    const res = await fetchWithRetry(`${GAMMA_API}/events?${params}`);
    const batch: GammaEvent[] = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    page++;
    await new Promise((r) => setTimeout(r, PAGE_DELAY));
  }

  onProgress?.({ phase: 'processing', loaded: all.length, page });
  return all;
}

export async function fetchBondingMarkets(
  threshold: number,
  horizonHours: number,
  onProgress?: (p: FetchProgress) => void,
  includeLive: boolean = false,
): Promise<BondingMarket[]> {
  const events = await fetchEventsInHorizon(horizonHours, onProgress);
  const now = Date.now();
  const horizonMs = horizonHours * 60 * 60 * 1000;
  // Phase 1: Gamma pre-filter (cheap, no extra API calls).
  // Filters on threshold, time horizon, volume, and orderbook availability.
  // Does NOT check actual order book liquidity — that's Phase 2 below.
  const candidates: { dominantTokenId: string; market: BondingMarket; isLive: boolean }[] = [];

  for (const event of events) {
    if (!event.markets) continue;

    for (const m of event.markets) {
      if (!m.question || !m.endDateIso || !m.outcomes || !m.outcomePrices) continue;
      if (!m.enableOrderBook) continue;
      const isLive = m.acceptingOrders === false;
      if (!includeLive && isLive) continue;

      // endDateIso can be date-only ("2026-03-21") which parses as midnight UTC.
      // Treat date-only as end-of-day so markets don't disappear prematurely.
      const endIso = m.endDateIso.includes('T') ? m.endDateIso : `${m.endDateIso}T23:59:59Z`;
      const endTime = new Date(endIso).getTime();
      if (isNaN(endTime)) continue;

      const timeRemaining = endTime - now;
      const minTime = includeLive ? -3 * 60 * 60 * 1000 : 0;
      if (timeRemaining < minTime || timeRemaining > horizonMs) continue;

      const outcomes = parseJsonString<string[]>(m.outcomes);
      const prices = parseJsonString<string[]>(m.outcomePrices);
      if (!outcomes || !prices || outcomes.length !== prices.length) continue;

      let maxPrice = 0;
      let dominantIdx = 0;
      for (let i = 0; i < prices.length; i++) {
        const p = parseFloat(prices[i]);
        if (p > maxPrice) {
          maxPrice = p;
          dominantIdx = i;
        }
      }

      if (maxPrice < threshold / 100) continue;

      const vol = m.volumeNum ?? (parseFloat(m.volume ?? '0') || 0);
      if (vol <= 0) continue;

      const clobTokenIds = parseJsonString<string[]>(m.clobTokenIds) ?? [];
      const dominantTokenId = clobTokenIds[dominantIdx] ?? null;
      if (!dominantTokenId) continue;

      const spread = m.bestAsk != null && m.bestBid != null
        ? Math.abs(m.bestAsk - m.bestBid)
        : null;

      const tags = (event.tags ?? []).map((t) => t.label).filter(Boolean);

      candidates.push({
        dominantTokenId,
        isLive,
        market: {
          question: m.question,
          slug: m.slug ?? '',
          eventSlug: event.slug ?? m.slug ?? '',
          probability: maxPrice,
          dominantOutcome: outcomes[dominantIdx],
          timeRemaining,
          endDate: m.endDateIso,
          volume: vol,
          volume24hr: m.volume24hr ?? 0,
          spread,
          clobTokenIds,
          tags,
        },
      });
    }
  }

  // Phase 2: CLOB verification.
  // The Gamma pre-filter above is cheap but can't detect one-sided books.
  // We batch all dominant token IDs into one POST /books call and drop any
  // market where the dominant token has no asks (i.e. untradeable).
  const nonLiveCandidates = candidates.filter((c) => !c.isLive);
  const allDominantTokens = nonLiveCandidates.map((c) => c.dominantTokenId);
  let clobAvailable = true;
  let tokensWithAsks = new Set<string>();
  if (allDominantTokens.length > 0) {
    const result = await getTokensWithAsks(allDominantTokens);
    tokensWithAsks = result.asks;
    clobAvailable = result.clobAvailable;
  }

  const results: BondingMarket[] = candidates
    .filter((c) => c.isLive || !clobAvailable || tokensWithAsks.has(c.dominantTokenId))
    .map((c) => c.market);

  results.sort((a, b) => b.probability - a.probability);
  return results;
}
