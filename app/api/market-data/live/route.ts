import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import YahooFinance from 'yahoo-finance2'

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

// ── Symbol lists by market type ───────────────────────────────────────────────

const FOREX_SYMBOLS = [
  'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'AUDUSD=X', 'USDCAD=X',
  'USDCHF=X', 'NZDUSD=X', 'EURGBP=X', 'GBPJPY=X', 'EURJPY=X',
]

// Commodity + index futures — all on CME with the same session schedule
const FUTURES_SYMBOLS = [
  'GC=F', 'SI=F', 'CL=F', 'HG=F',
  'ES=F', 'YM=F', 'NQ=F',
]

const STOCK_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'TSLA']

const CRYPTO_SYMBOLS = [
  'BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'BNB-USD', 'DOGE-USD',
]

const ALL_NON_CRYPTO = [...FOREX_SYMBOLS, ...FUTURES_SYMBOLS, ...STOCK_SYMBOLS]

// ── Market-hours helpers (all times UTC) ─────────────────────────────────────

/**
 * Forex is 24/5:
 *   Open  — Sun 22:00 UTC
 *   Close — Fri 22:00 UTC
 *   No daily maintenance break.
 */
function isForexOpen(): boolean {
  const now = new Date()
  const day = now.getUTCDay()   // 0=Sun, 6=Sat
  const h   = now.getUTCHours()
  if (day === 6) return false                 // Saturday: always closed
  if (day === 0 && h < 22) return false       // Sunday before 22:00: closed
  if (day === 5 && h >= 22) return false      // Friday after 22:00: closed
  return true
}

/**
 * CME Futures (commodities + indices):
 *   Open  — Sun 23:00 UTC
 *   Close — Fri 22:00 UTC
 *   Daily maintenance break — 22:00–23:00 UTC Mon–Thu
 */
function isFuturesOpen(): boolean {
  const now = new Date()
  const day = now.getUTCDay()
  const h   = now.getUTCHours()
  if (day === 6) return false                 // Saturday: closed
  if (day === 0 && h < 23) return false       // Sunday before 23:00: closed
  if (day === 5 && h >= 22) return false      // Friday after 22:00: closed
  if (h === 22) return false                  // Daily maintenance 22:00–23:00 (Mon–Thu)
  return true
}

/**
 * NYSE / NASDAQ regular session:
 *   Open  — Mon–Fri 14:30 UTC (9:30 am ET)
 *   Close — Mon–Fri 21:00 UTC (4:00 pm ET)
 */
function isStocksOpen(): boolean {
  const now  = new Date()
  const day  = now.getUTCDay()
  if (day === 0 || day === 6) return false    // Weekend: closed
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes()
  return mins >= 14 * 60 + 30 && mins < 21 * 60
}

/** True when at least one non-crypto market is open */
function isAnyMarketOpen(): boolean {
  return isForexOpen() || isFuturesOpen() || isStocksOpen()
}

/** True on weekends (for the client-side badge) */
function isMarketWeekend(): boolean {
  const now  = new Date()
  const day  = now.getUTCDay()
  const hour = now.getUTCHours()
  if (day === 6) return true
  if (day === 0 && hour < 22) return true
  return false
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type LivePrice = { price: number; change: number; changePct: number }
export type LiveData  = {
  prices:       Record<string, LivePrice>
  updatedAt:    number
  weekend:      boolean
  forexOpen:    boolean
  futuresOpen:  boolean
  stocksOpen:   boolean
}

// ── Server-side cache ─────────────────────────────────────────────────────────
// Shared across all concurrent clients — prevents Yahoo rate-limiting.

let liveCache:   LiveData | null = null
let liveCacheTs: number          = 0

// Cache TTL scales with market status:
//   any market open → 8 s (frequent updates needed)
//   all markets closed → 5 min (prices won't change anyway)
function cacheTTL(): number {
  return isAnyMarketOpen() ? 8_000 : 5 * 60 * 1000
}

// In-flight deduplication — only one Yahoo call at a time
let inflight: Promise<LiveData> | null = null

async function fetchFromYahoo(): Promise<LiveData> {
  const weekend     = isMarketWeekend()
  const forexOpen   = isForexOpen()
  const futuresOpen = isFuturesOpen()
  const stocksOpen  = isStocksOpen()

  // Build the list of symbols to fetch — only open markets hit Yahoo
  const symbolsToFetch: string[] = [...CRYPTO_SYMBOLS]
  if (forexOpen)   symbolsToFetch.push(...FOREX_SYMBOLS)
  if (futuresOpen) symbolsToFetch.push(...FUTURES_SYMBOLS)
  if (stocksOpen)  symbolsToFetch.push(...STOCK_SYMBOLS)

  type Q = Record<string, unknown>
  const quotes = await yf.quote(symbolsToFetch, {}, { validateResult: false }) as Q[]

  // Start with last known prices for symbols we didn't fetch (market closed).
  // This ensures closed-market pairs still show their last traded price.
  const prices: Record<string, LivePrice> = {}
  if (liveCache) {
    for (const sym of ALL_NON_CRYPTO) {
      if (!symbolsToFetch.includes(sym) && liveCache.prices[sym]) {
        prices[sym] = liveCache.prices[sym]
      }
    }
  }

  // Overlay fresh quotes
  const n = (v: unknown) => typeof v === 'number' && isFinite(v) ? v : 0
  for (const q of quotes) {
    const sym   = q.symbol as string
    if (!sym) continue
    const price = n(q.regularMarketPrice)
    if (price === 0) continue
    prices[sym] = {
      price,
      change:    n(q.regularMarketChange),
      changePct: n(q.regularMarketChangePercent),
    }
  }

  return { prices, updatedAt: Date.now(), weekend, forexOpen, futuresOpen, stocksOpen }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = Date.now()

  // Serve from cache if still fresh
  if (liveCache && now - liveCacheTs < cacheTTL()) {
    return NextResponse.json(liveCache)
  }

  try {
    // Deduplicate concurrent requests: only one Yahoo call at a time
    if (!inflight) {
      inflight = fetchFromYahoo().finally(() => { inflight = null })
    }
    const data = await inflight

    liveCache   = data
    liveCacheTs = Date.now()

    return NextResponse.json(data satisfies LiveData)
  } catch (err) {
    console.error('[market-data/live]', err)
    if (liveCache) return NextResponse.json(liveCache)
    return NextResponse.json({ error: 'Failed to fetch live prices' }, { status: 500 })
  }
}
