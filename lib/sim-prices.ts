// Price source for the simulated trading engine.
//
// Reuses the same Yahoo feed the rest of the platform runs on, so a
// simulated fill is priced off exactly the same data as FM Trader analysis.
import YahooFinance from 'yahoo-finance2'
import { SLUG_TO_SYMBOL } from '@/app/api/market-data/[symbol]/route'

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

// Instruments a member may trade on a simulated account. Restricted to the
// set we already scan and have symbol mappings for — an instrument we cannot
// price is an instrument we cannot settle a stop on.
export const SIM_INSTRUMENTS: Array<{ slug: string; display: string }> = [
  { slug: 'eur-usd', display: 'EUR/USD' }, { slug: 'gbp-usd', display: 'GBP/USD' },
  { slug: 'usd-jpy', display: 'USD/JPY' }, { slug: 'aud-usd', display: 'AUD/USD' },
  { slug: 'usd-cad', display: 'USD/CAD' }, { slug: 'usd-chf', display: 'USD/CHF' },
  { slug: 'nzd-usd', display: 'NZD/USD' }, { slug: 'eur-gbp', display: 'EUR/GBP' },
  { slug: 'gbp-jpy', display: 'GBP/JPY' }, { slug: 'eur-jpy', display: 'EUR/JPY' },
  { slug: 'xau-usd', display: 'XAU/USD' }, { slug: 'xag-usd', display: 'XAG/USD' },
  { slug: 'wti-usd', display: 'WTI/USD' },
  { slug: 'sp-500',  display: 'S&P 500' }, { slug: 'nas-100', display: 'NAS 100' },
  { slug: 'dj-30',   display: 'DOW 30'  },
  { slug: 'btc-usd', display: 'BTC/USD' }, { slug: 'eth-usd', display: 'ETH/USD' },
  { slug: 'sol-usd', display: 'SOL/USD' }, { slug: 'xrp-usd', display: 'XRP/USD' },
]

const BY_SLUG = new Map(SIM_INSTRUMENTS.map(i => [i.slug, i]))
export function isTradableSlug(slug: string) { return BY_SLUG.has(slug) }
export function displayFor(slug: string) { return BY_SLUG.get(slug)?.display ?? slug }

// Short in-process cache. Several requests per minute per user would
// otherwise hammer Yahoo for prices that barely move in that window.
//
// Deliberately ALWAYS fetches the full instrument list, never just the
// slugs a caller asked for. The cache is a single shared object keyed only
// by time, not by which slugs were requested — if it stored whatever subset
// the last caller wanted, a caller asking for one open position's slug
// (settleEquity, position-close) would silently overwrite the cache with a
// map missing every other instrument, and the order ticket for anything
// else would show no live price at all. The `slugs` param is kept for
// callers that only care about a few, but it just narrows what's RETURNED.
let cache: { at: number; prices: Record<string, number> } | null = null
const TTL_MS = 10_000

export async function getSimPrices(slugs?: string[]): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return pick(cache.prices, slugs)
  }

  const wanted = SIM_INSTRUMENTS.map(i => i.slug)
  const symbols = wanted.map(s => SLUG_TO_SYMBOL[s]).filter(Boolean) as string[]
  const prices: Record<string, number> = {}

  try {
    const quotes = await yf.quote(symbols, {}, { validateResult: false }) as unknown
    const list = Array.isArray(quotes) ? quotes : [quotes]
    for (const q of list as Array<Record<string, unknown>>) {
      const sym = q.symbol as string
      const px  = typeof q.regularMarketPrice === 'number' ? q.regularMarketPrice : null
      if (!sym || px === null) continue
      const slug = wanted.find(s => SLUG_TO_SYMBOL[s] === sym)
      if (slug) prices[slug] = px
    }
  } catch (e) {
    console.error('[sim-prices] quote failed:', e)
    // Fall back to the previous cache rather than returning nothing — a
    // momentary feed blip should not blank every open position's P/L.
    if (cache) return pick(cache.prices, slugs)
  }

  cache = { at: Date.now(), prices }
  return pick(prices, slugs)
}

function pick(prices: Record<string, number>, slugs?: string[]): Record<string, number> {
  if (!slugs?.length) return prices
  const out: Record<string, number> = {}
  for (const s of slugs) if (s in prices) out[s] = prices[s]
  return out
}
