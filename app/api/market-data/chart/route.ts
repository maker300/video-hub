import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import YahooFinance from 'yahoo-finance2'

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] })

// ── Types ──────────────────────────────────────────────────────────────────────

export interface OHLCBar {
  time:   number   // Unix seconds
  open:   number
  high:   number
  low:    number
  close:  number
  volume: number
}

export interface ChartResponse {
  symbol:    string
  interval:  string
  bars:      OHLCBar[]
  updatedAt: number
}

// ── Slug → Yahoo symbol (same as detail route) ────────────────────────────────

const SLUG_TO_SYMBOL: Record<string, string> = {
  // Forex — 10 pairs
  'eur-usd':  'EURUSD=X', 'gbp-usd':  'GBPUSD=X', 'usd-jpy':  'USDJPY=X',
  'aud-usd':  'AUDUSD=X', 'usd-cad':  'USDCAD=X', 'usd-chf':  'USDCHF=X',
  'nzd-usd':  'NZDUSD=X', 'eur-gbp':  'EURGBP=X', 'gbp-jpy':  'GBPJPY=X',
  'eur-jpy':  'EURJPY=X',
  // Commodities — 9
  'xau-usd':  'GC=F',  'xag-usd': 'SI=F',  'wti-usd': 'CL=F',  'copper': 'HG=F',
  // Indices — 3
  'sp-500':   'ES=F',  'dj-30':   'YM=F',  'nas-100': 'NQ=F',
  // Stocks — 4
  'apple':    'AAPL',  'microsoft': 'MSFT', 'google':  'GOOGL', 'tesla':  'TSLA',
  // Crypto — 6
  'btc-usd':  'BTC-USD', 'eth-usd':  'ETH-USD', 'sol-usd':  'SOL-USD',
  'xrp-usd':  'XRP-USD', 'bnb-usd':  'BNB-USD', 'doge-usd': 'DOGE-USD',
}

// ── Interval config ───────────────────────────────────────────────────────────

type YFInterval = '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m' | '1d' | '1wk' | '1mo'

interface IntervalConfig {
  yfInterval: YFInterval
  lookbackMs: number
  useChart:   boolean   // kept for reference, chart() used for all now
}

const INTERVAL_MAP: Record<string, IntervalConfig> = {
  '1m':  { yfInterval: '1m',  lookbackMs:  1 * 24 * 60 * 60 * 1000, useChart: true  },
  '5m':  { yfInterval: '5m',  lookbackMs:  5 * 24 * 60 * 60 * 1000, useChart: true  },
  '15m': { yfInterval: '15m', lookbackMs:  8 * 24 * 60 * 60 * 1000, useChart: true  },
  '30m': { yfInterval: '30m', lookbackMs: 14 * 24 * 60 * 60 * 1000, useChart: true  },
  '1h':  { yfInterval: '60m', lookbackMs: 21 * 24 * 60 * 60 * 1000, useChart: true  },
  '4h':  { yfInterval: '60m', lookbackMs: 60 * 24 * 60 * 60 * 1000, useChart: true  }, // aggregate client-side
  '1d':  { yfInterval: '1d',  lookbackMs: 365 * 24 * 60 * 60 * 1000, useChart: false },
  '1w':  { yfInterval: '1wk', lookbackMs: 3 * 365 * 24 * 60 * 60 * 1000, useChart: false },
  '1M':  { yfInterval: '1mo', lookbackMs: 10 * 365 * 24 * 60 * 60 * 1000, useChart: false },
}

// ── Per-interval cache (symbol:interval → bars) ───────────────────────────────

const cache = new Map<string, { bars: OHLCBar[]; ts: number }>()
const TTL   = new Map<string, number>([
  ['1m', 30_000], ['5m', 60_000], ['15m', 2 * 60_000],
  ['30m', 3 * 60_000], ['1h', 5 * 60_000], ['4h', 5 * 60_000],
  ['1d', 5 * 60_000], ['1w', 15 * 60_000], ['1M', 30 * 60_000],
])

// ── Helpers ───────────────────────────────────────────────────────────────────

type ChartRow = { date?: Date; open?: number|null; high?: number|null; low?: number|null; close?: number|null; volume?: number|null }
type HistRow  = ChartRow

function toBar(r: ChartRow | HistRow, dateMs?: number): OHLCBar | null {
  const c = typeof r.close  === 'number' && isFinite(r.close)  ? r.close  : null
  const o = typeof r.open   === 'number' && isFinite(r.open)   ? r.open   : c
  const h = typeof r.high   === 'number' && isFinite(r.high)   ? r.high   : c
  const l = typeof r.low    === 'number' && isFinite(r.low)    ? r.low    : c
  if (!c) return null
  const ms = dateMs ?? (r.date instanceof Date ? r.date.getTime() : 0)
  if (!ms) return null
  return {
    time:   Math.floor(ms / 1000),
    open:   o!,
    high:   h!,
    low:    l!,
    close:  c,
    volume: typeof r.volume === 'number' && isFinite(r.volume) ? r.volume : 0,
  }
}

function aggregate4H(bars: OHLCBar[]): OHLCBar[] {
  const out: OHLCBar[] = []
  for (let i = 0; i < bars.length; i += 4) {
    const slice = bars.slice(i, i + 4)
    if (slice.length === 0) continue
    out.push({
      time:   slice[0].time,
      open:   slice[0].open,
      high:   Math.max(...slice.map(b => b.high)),
      low:    Math.min(...slice.map(b => b.low)),
      close:  slice[slice.length - 1].close,
      volume: slice.reduce((s, b) => s + b.volume, 0),
    })
  }
  return out
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url      = new URL(req.url)
  const slug     = url.searchParams.get('symbol') ?? ''
  const interval = url.searchParams.get('interval') ?? '1d'
  const force    = url.searchParams.get('refresh') === '1'

  const yfSym = SLUG_TO_SYMBOL[slug.toLowerCase()]
  if (!yfSym) return NextResponse.json({ error: 'Unknown symbol' }, { status: 404 })

  const cfg = INTERVAL_MAP[interval]
  if (!cfg) return NextResponse.json({ error: 'Unknown interval' }, { status: 400 })

  const cacheKey = `${slug}:${interval}`
  const now      = Date.now()
  const ttl      = TTL.get(interval) ?? 5 * 60_000
  const cached   = cache.get(cacheKey)
  if (!force && cached && now - cached.ts < ttl) {
    return NextResponse.json({ symbol: yfSym, interval, bars: cached.bars, updatedAt: cached.ts } satisfies ChartResponse)
  }

  try {
    const period1 = new Date(now - cfg.lookbackMs).toISOString().split('T')[0]
    const period2 = new Date(now).toISOString().split('T')[0]

    let bars: OHLCBar[] = []

    // Use chart() for everything — historical() is deprecated in yahoo-finance2 v3
    {
      type CR = { quotes?: ChartRow[] } | ChartRow[]
      const iv  = cfg.yfInterval as YFInterval
      const raw = await yf.chart(yfSym, { period1, period2, interval: iv }, { validateResult: false }) as CR
      const rows: ChartRow[] = Array.isArray(raw) ? raw : ((raw as { quotes?: ChartRow[] }).quotes ?? [])
      bars = rows
        .map(r => toBar(r, r.date instanceof Date ? r.date.getTime() : undefined))
        .filter((b): b is OHLCBar => b !== null)
    }

    // Aggregate 1h → 4h
    if (interval === '4h') bars = aggregate4H(bars)

    // Remove duplicates and sort
    const seen = new Set<number>()
    bars = bars.filter(b => { if (seen.has(b.time)) return false; seen.add(b.time); return true })
    bars.sort((a, b) => a.time - b.time)

    cache.set(cacheKey, { bars, ts: now })
    return NextResponse.json({ symbol: yfSym, interval, bars, updatedAt: now } satisfies ChartResponse)

  } catch (err) {
    console.error('[market-data/chart]', err)
    const stale = cache.get(cacheKey)
    if (stale) return NextResponse.json({ symbol: yfSym, interval, bars: stale.bars, updatedAt: stale.ts } satisfies ChartResponse)
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 })
  }
}
