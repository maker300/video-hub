import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import YahooFinance from 'yahoo-finance2'

// v3 requires instantiation
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] })

// ── Types ──────────────────────────────────────────────────────────────────────

export type SignalType = 'STRONG BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG SELL'
export type TrendType  = 'bullish' | 'bearish' | 'ranging'

export interface NewsItem {
  title:       string
  link:        string
  publisher:   string
  publishedAt: number
}

export interface Candle { o: number; h: number; l: number; c: number }

export interface InstrumentData {
  symbol:      string
  display:     string
  name:        string
  category:    'forex' | 'commodity' | 'crypto' | 'indices' | 'stocks'
  price:       number
  change:      number
  changePct:   number
  high:        number
  low:         number
  open:        number
  volume:      number
  rsi:         number
  ema9:        number
  ema21:       number
  ema50:       number
  signal:      SignalType
  trend:       TrendType
  candles:     Candle[]
  analysis:    string
  prediction:  string
  news:        NewsItem[]
}

export interface MarketData {
  instruments:  InstrumentData[]
  updatedAt:    number
  bullCount:    number
  bearCount:    number
  neutralCount: number
  weekend:      boolean   // true Sat/Sun — non-crypto prices are from Friday close
}

// ── Instrument definitions ─────────────────────────────────────────────────────

const INSTRUMENTS = [
  // ── Forex (10) ───────────────────────────────────────────────────────────────
  { symbol: 'EURUSD=X',  display: 'EUR/USD',  name: 'Euro / US Dollar',               category: 'forex' as const, newsQuery: 'EUR USD euro dollar forex'           },
  { symbol: 'GBPUSD=X',  display: 'GBP/USD',  name: 'British Pound / US Dollar',      category: 'forex' as const, newsQuery: 'GBP USD sterling pound forex'         },
  { symbol: 'USDJPY=X',  display: 'USD/JPY',  name: 'US Dollar / Japanese Yen',       category: 'forex' as const, newsQuery: 'USD JPY yen Japan forex'              },
  { symbol: 'AUDUSD=X',  display: 'AUD/USD',  name: 'Australian Dollar / USD',        category: 'forex' as const, newsQuery: 'AUD USD australian dollar forex'      },
  { symbol: 'USDCAD=X',  display: 'USD/CAD',  name: 'US Dollar / Canadian Dollar',    category: 'forex' as const, newsQuery: 'USD CAD canadian dollar forex'        },
  { symbol: 'USDCHF=X',  display: 'USD/CHF',  name: 'US Dollar / Swiss Franc',        category: 'forex' as const, newsQuery: 'USD CHF swiss franc dollar forex'     },
  { symbol: 'NZDUSD=X',  display: 'NZD/USD',  name: 'New Zealand Dollar / USD',       category: 'forex' as const, newsQuery: 'NZD USD new zealand dollar forex'     },
  { symbol: 'EURGBP=X',  display: 'EUR/GBP',  name: 'Euro / British Pound',           category: 'forex' as const, newsQuery: 'EUR GBP euro pound forex cross'       },
  { symbol: 'GBPJPY=X',  display: 'GBP/JPY',  name: 'British Pound / Japanese Yen',   category: 'forex' as const, newsQuery: 'GBP JPY pound yen forex cross'        },
  { symbol: 'EURJPY=X',  display: 'EUR/JPY',  name: 'Euro / Japanese Yen',            category: 'forex' as const, newsQuery: 'EUR JPY euro yen forex cross'         },
  // ── Commodities (4) ──────────────────────────────────────────────────────────
  { symbol: 'GC=F',  display: 'XAU/USD',  name: 'Gold',           category: 'commodity' as const, newsQuery: 'gold price XAU precious metals'    },
  { symbol: 'SI=F',  display: 'XAG/USD',  name: 'Silver',         category: 'commodity' as const, newsQuery: 'silver XAG price commodities'      },
  { symbol: 'CL=F',  display: 'WTI/USD',  name: 'Crude Oil WTI',  category: 'commodity' as const, newsQuery: 'WTI crude oil price energy barrel' },
  { symbol: 'HG=F',  display: 'COPPER',   name: 'Copper',         category: 'commodity' as const, newsQuery: 'copper price commodity metals'      },
  // ── Indices (4) ──────────────────────────────────────────────────────────────
  { symbol: 'ES=F',      display: 'S&P 500',  name: 'S&P 500 Futures',      category: 'indices' as const, newsQuery: 'S&P 500 index stock market futures'        },
  { symbol: 'YM=F',      display: 'DJ 30',    name: 'Dow Jones 30 Futures',  category: 'indices' as const, newsQuery: 'Dow Jones industrial average stock market'  },
  { symbol: 'NQ=F',      display: 'NAS 100',  name: 'NASDAQ 100 Futures',    category: 'indices' as const, newsQuery: 'NASDAQ 100 technology index futures'        },
  { symbol: 'DX-Y.NYB',  display: 'US DXY',   name: 'US Dollar Index',       category: 'indices' as const, newsQuery: 'US dollar index DXY currency strength Fed' },
  // ── Stocks (4) ───────────────────────────────────────────────────────────────
  { symbol: 'AAPL',  display: 'APPLE',     name: 'Apple Inc.',        category: 'stocks' as const, newsQuery: 'Apple AAPL stock earnings technology'       },
  { symbol: 'MSFT',  display: 'MICROSOFT', name: 'Microsoft Corp.',   category: 'stocks' as const, newsQuery: 'Microsoft MSFT stock earnings technology'   },
  { symbol: 'GOOGL', display: 'GOOGLE',    name: 'Alphabet (Google)', category: 'stocks' as const, newsQuery: 'Google Alphabet GOOGL stock earnings'       },
  { symbol: 'TSLA',  display: 'TESLA',     name: 'Tesla Inc.',        category: 'stocks' as const, newsQuery: 'Tesla TSLA stock EV earnings Elon Musk'     },
  // ── Crypto (6) ───────────────────────────────────────────────────────────────
  { symbol: 'BTC-USD',   display: 'BTC/USD',  name: 'Bitcoin',      category: 'crypto' as const, newsQuery: 'Bitcoin BTC price crypto'    },
  { symbol: 'ETH-USD',   display: 'ETH/USD',  name: 'Ethereum',     category: 'crypto' as const, newsQuery: 'Ethereum ETH crypto price'   },
  { symbol: 'SOL-USD',   display: 'SOL/USD',  name: 'Solana',       category: 'crypto' as const, newsQuery: 'Solana SOL crypto'           },
  { symbol: 'XRP-USD',   display: 'XRP/USD',  name: 'Ripple XRP',   category: 'crypto' as const, newsQuery: 'XRP Ripple crypto price'     },
  { symbol: 'BNB-USD',   display: 'BNB/USD',  name: 'Binance Coin', category: 'crypto' as const, newsQuery: 'BNB Binance coin crypto'     },
  { symbol: 'DOGE-USD',  display: 'DOGE/USD', name: 'Dogecoin',     category: 'crypto' as const, newsQuery: 'Dogecoin DOGE crypto price'  },
]

// ── Weekend / market-hours helpers ────────────────────────────────────────────

/**
 * Forex/commodity/index markets are closed:
 *   Saturday 00:00 UTC → Sunday 21:59 UTC
 * They reopen Sunday 22:00 UTC (5 pm ET).
 */
function isMarketWeekend(): boolean {
  const now  = new Date()
  const day  = now.getUTCDay()   // 0=Sun, 6=Sat
  const hour = now.getUTCHours()
  if (day === 6) return true                  // all Saturday
  if (day === 0 && hour < 22) return true     // Sunday before 10 pm UTC
  return false
}

// ── Cache ──────────────────────────────────────────────────────────────────────

// Separate cache for non-crypto (forex/commodity/indices) vs crypto.
// Non-crypto is never refreshed on weekends so Friday's close is preserved.
let cachedMarket:        InstrumentData[] | null = null
let cacheMarketTs:       number                  = 0
let cacheMarketWeekend:  boolean                 = false  // was cache built during weekend?

let cachedCrypto:        InstrumentData[] | null = null
let cacheCryptoTs:       number                  = 0

const CACHE_TTL     = 5 * 60 * 1000          // 5 min — weekdays
const CACHE_TTL_WKD = 60 * 60 * 1000         // 1 hr  — crypto on weekends

// ── Technical analysis helpers ─────────────────────────────────────────────────

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50
  const changes = closes.slice(1).map((c, i) => c - closes[i])
  const gains   = changes.map(c => c > 0 ? c : 0)
  const losses  = changes.map(c => c < 0 ? -c : 0)
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period
  }
  if (avgLoss === 0) return 100
  return 100 - 100 / (1 + avgGain / avgLoss)
}

function calcEMA(closes: number[], period: number): number {
  if (closes.length === 0) return 0
  if (closes.length < period) return closes[closes.length - 1]
  const k = 2 / (period + 1)
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k)
  return ema
}

function generateSignal(rsi: number, ema9: number, ema21: number, ema50: number, ema200: number, close: number): SignalType {
  let score = 0
  // RSI contribution (-2 to +2)
  if (rsi < 30)       score += 2
  else if (rsi < 40)  score += 1
  else if (rsi > 70)  score -= 2
  else if (rsi > 60)  score -= 1
  // EMA crossover signals (-1 to +1 each)
  score += (ema9  > ema21  ? 1 : -1)   // short-term momentum
  score += (ema21 > ema50  ? 1 : -1)   // medium-term trend
  score += (close > ema21  ? 1 : -1)   // price vs mean
  score += (close > ema50  ? 1 : -1)   // longer-term bias
  // EMA200: long-term trend direction (-1 to +1)
  if (ema200 > 0) score += (close > ema200 ? 1 : -1)
  // Range is -7 to +7.
  if (score >= 4)  return 'STRONG BUY'
  if (score >= 2)  return 'BUY'
  if (score <= -4) return 'STRONG SELL'
  if (score <= -2) return 'SELL'
  return 'NEUTRAL'
}

function getTrend(ema9: number, ema21: number, ema50: number): TrendType {
  if (ema9 > ema21 && ema21 > ema50) return 'bullish'
  if (ema9 < ema21 && ema21 < ema50) return 'bearish'
  return 'ranging'
}

function generateAnalysis(
  name: string, rsi: number, ema9: number, ema21: number, ema50: number, changePct: number
): string {
  const parts: string[] = []
  if (rsi >= 70)
    parts.push(`${name} is in overbought territory (RSI ${rsi.toFixed(0)}), signalling potential exhaustion of the current rally with increasing pullback risk.`)
  else if (rsi <= 30)
    parts.push(`${name} has reached oversold territory (RSI ${rsi.toFixed(0)}), suggesting selling pressure may be nearing exhaustion — watch for reversal signals.`)
  else if (rsi >= 60)
    parts.push(`${name} shows solid bullish momentum (RSI ${rsi.toFixed(0)}), favouring buyers while approaching levels that warrant caution.`)
  else if (rsi <= 40)
    parts.push(`${name} displays bearish momentum (RSI ${rsi.toFixed(0)}), keeping sellers in near-term control.`)
  else
    parts.push(`${name} is in neutral territory (RSI ${rsi.toFixed(0)}), with neither bulls nor bears holding a decisive edge.`)

  if (ema9 > ema21 && ema21 > ema50)
    parts.push(`All EMAs are stacked bullishly (EMA9 > EMA21 > EMA50), confirming an uptrend on the daily timeframe.`)
  else if (ema9 < ema21 && ema21 < ema50)
    parts.push(`Bearish EMA alignment (EMA9 < EMA21 < EMA50) confirms the downtrend remains intact on the daily chart.`)
  else if (ema9 > ema21)
    parts.push(`The short-term EMA has crossed above the medium-term EMA — an early signal of emerging bullish momentum.`)
  else
    parts.push(`The short-term EMA remains below the medium-term EMA, indicating near-term bearish pressure.`)

  if (Math.abs(changePct) > 1.5)
    parts.push(`Today's ${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}% session move is significant — watch for follow-through or mean-reversion in the next session.`)
  else if (Math.abs(changePct) > 0.3)
    parts.push(`The ${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}% daily move reflects ${changePct > 0 ? 'ongoing buying interest' : 'continued selling pressure'} in the current session.`)

  return parts.join(' ')
}

function generatePrediction(signal: SignalType): string {
  switch (signal) {
    case 'STRONG BUY':  return `Bullish bias. Look for long entries on pullbacks to EMA9/EMA21 support. Target continuation of the uptrend with stops below the recent swing low.`
    case 'BUY':         return `Cautiously bullish. Wait for a clean retest of EMA9 or a break above intraday resistance before entering long. Target a 1:2 risk/reward or better.`
    case 'NEUTRAL':     return `No directional edge. Market is ranging — trade the boundaries of the consolidation zone or wait for a confirmed breakout with volume before committing.`
    case 'SELL':        return `Cautiously bearish. Look for relief rallies into moving average resistance as short entries. Keep stops tight above the recent swing high.`
    case 'STRONG SELL': return `Bearish bias. Rallies are likely to be sold. Focus on short entries at EMA21/EMA50 resistance with targets at the next major support level.`
  }
}

// ── Yahoo Finance type helpers ────────────────────────────────────────────────

type AnyQuote   = Record<string, unknown>
type AnyHistRow = { close?: number | null; open?: number | null; high?: number | null; low?: number | null; date?: Date }
type AnyChartResult = { quotes?: AnyHistRow[] } | AnyHistRow[]

function safeNum(val: unknown, fallback = 0): number {
  return typeof val === 'number' && isFinite(val) ? val : fallback
}

function closesOnly(rows: AnyHistRow[]): number[] {
  return rows.map(r => r.close).filter((c): c is number => typeof c === 'number' && c > 0)
}

// Aggregate daily rows into weekly bars (group by ISO week)
function aggregateWeekly(rows: AnyHistRow[]): AnyHistRow[] {
  const weeks = new Map<string, AnyHistRow[]>()
  for (const r of rows) {
    if (!r.date) continue
    const d   = new Date(r.date)
    // ISO week key: year + week number
    const day = d.getUTCDay() || 7
    const thu = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 4 - day))
    const key = `${thu.getUTCFullYear()}-W${String(Math.ceil((((thu.getTime() - Date.UTC(thu.getUTCFullYear(), 0, 1)) / 86400000) + 1) / 7)).padStart(2, '0')}`
    if (!weeks.has(key)) weeks.set(key, [])
    weeks.get(key)!.push(r)
  }
  return Array.from(weeks.values()).map(wk => ({
    date:  wk[0].date,
    open:  wk[0].open,
    high:  Math.max(...wk.map(r => r.high ?? 0)),
    low:   Math.min(...wk.map(r => r.low  ?? Infinity).filter(v => v < Infinity)),
    close: wk[wk.length - 1].close,
  }))
}

// Aggregate 1H bars into 4H bars
function aggregate4H(rows: AnyHistRow[]): AnyHistRow[] {
  const out: AnyHistRow[] = []
  for (let i = 0; i < rows.length; i += 4) {
    const slice = rows.slice(i, i + 4).filter(r => typeof r.close === 'number' && (r.close ?? 0) > 0)
    if (slice.length === 0) continue
    out.push({
      date:  slice[0].date,
      open:  slice[0].open,
      high:  Math.max(...slice.map(r => r.high ?? 0)),
      low:   Math.min(...slice.map(r => r.low  ?? Infinity).filter(v => v < Infinity)),
      close: slice[slice.length - 1].close,
    })
  }
  return out
}

// Consensus across multiple TF signals — same logic as detail page
function consensusSignal(signals: SignalType[]): SignalType {
  const bull  = signals.filter(s => s === 'STRONG BUY'  || s === 'BUY').length
  const bear  = signals.filter(s => s === 'STRONG SELL' || s === 'SELL').length
  const sBull = signals.filter(s => s === 'STRONG BUY').length
  const sBear = signals.filter(s => s === 'STRONG SELL').length
  if (bull > bear) return sBull >= bull / 2 ? 'STRONG BUY'  : 'BUY'
  if (bear > bull) return sBear >= bear / 2 ? 'STRONG SELL' : 'SELL'
  return 'NEUTRAL'
}

// ── Main fetch function ────────────────────────────────────────────────────────

async function buildInstruments(subset = INSTRUMENTS): Promise<InstrumentData[]> {
  const symbols = subset.map(i => i.symbol)
  if (symbols.length === 0) return []

  const today   = new Date().toISOString().split('T')[0]
  const period1Daily   = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]  // 2yr → ~104 weekly bars for reliable EMA50
  const period1Intraday = new Date(Date.now() - 60  * 24 * 60 * 60 * 1000).toISOString().split('T')[0]  // 60d → ~360 4H bars for EMA200

  // Fetch quotes (batch), daily history, and 1H intraday history in parallel
  const [quotesRaw, dailyRaws, intradayRaws] = await Promise.all([
    yf.quote(symbols, {}, { validateResult: false }) as Promise<AnyQuote[]>,

    Promise.all(subset.map(async (inst) => {
      try {
        const raw = await yf.chart(inst.symbol, { period1: period1Daily, period2: today, interval: '1d' }, { validateResult: false }) as AnyChartResult
        return Array.isArray(raw) ? raw : (raw as { quotes?: AnyHistRow[] }).quotes ?? []
      } catch { return [] as AnyHistRow[] }
    })),

    Promise.all(subset.map(async (inst) => {
      try {
        const raw = await yf.chart(inst.symbol, { period1: period1Intraday, period2: today, interval: '60m' }, { validateResult: false }) as AnyChartResult
        return Array.isArray(raw) ? raw : (raw as { quotes?: AnyHistRow[] }).quotes ?? []
      } catch { return [] as AnyHistRow[] }
    })),
  ])

  const quoteMap = new Map<string, AnyQuote>()
  quotesRaw.forEach((q) => { const sym = q.symbol as string; if (sym) quoteMap.set(sym, q) })

  // Fetch news sequentially in pairs to avoid rate limiting
  type SearchNews = { title?: string; link?: string; publisher?: string; providerPublishTime?: Date | number }
  const newsResults: NewsItem[][] = []
  for (let i = 0; i < subset.length; i += 2) {
    const batch = subset.slice(i, i + 2)
    const batchNews = await Promise.all(batch.map(async (inst) => {
      try {
        const res = await yf.search(inst.newsQuery, { newsCount: 3 }, { validateResult: false }) as { news?: SearchNews[] }
        return (res.news ?? []).slice(0, 3).map((n) => ({
          title:       String(n.title       ?? ''),
          link:        String(n.link        ?? ''),
          publisher:   String(n.publisher   ?? ''),
          publishedAt: n.providerPublishTime instanceof Date
            ? n.providerPublishTime.getTime()
            : (typeof n.providerPublishTime === 'number' ? n.providerPublishTime * 1000 : Date.now()),
        })) as NewsItem[]
      } catch { return [] as NewsItem[] }
    }))
    newsResults.push(...batchNews)
    if (i + 2 < subset.length) await new Promise(r => setTimeout(r, 300))
  }

  return subset.map((inst, idx) => {
    const q         = quoteMap.get(inst.symbol) ?? {}
    const price     = safeNum(q.regularMarketPrice)
    const change    = safeNum(q.regularMarketChange)
    const changePct = safeNum(q.regularMarketChangePercent)
    const high      = safeNum(q.regularMarketDayHigh, price)
    const low       = safeNum(q.regularMarketDayLow, price)
    const open      = safeNum(q.regularMarketOpen, price)
    const volume    = safeNum(q.regularMarketVolume)

    const dailyRows    = dailyRaws[idx]
    const intradayRows = intradayRaws[idx]
    const weeklyRows   = aggregateWeekly(dailyRows)
    const fourHRows    = aggregate4H(intradayRows)

    // Compute signals for all 4 timeframes — use last bar close, same as detail page
    const signal1TF = (rows: AnyHistRow[]): SignalType => {
      const cls  = closesOnly(rows)
      if (cls.length < 5) return 'NEUTRAL'
      const rsi  = calcRSI(cls)
      const e9   = calcEMA(cls, 9)
      const e21  = calcEMA(cls, 21)
      const e50  = calcEMA(cls, 50)
      const e200 = calcEMA(cls, 200)
      return generateSignal(rsi, e9, e21, e50, e200, cls[cls.length - 1])
    }

    const sigWeekly = signal1TF(weeklyRows)
    const sigDaily  = signal1TF(dailyRows)
    const sig4H     = signal1TF(fourHRows)
    const sig1H     = signal1TF(intradayRows)

    // Overall = 4-TF consensus (same as detail page overallSignal)
    const signal = consensusSignal([sigWeekly, sigDaily, sig4H, sig1H])
    const trend  = getTrend(
      calcEMA(closesOnly(dailyRows), 9),
      calcEMA(closesOnly(dailyRows), 21),
      calcEMA(closesOnly(dailyRows), 50),
    )

    // Daily EMAs for display / analysis text
    const dailyCloses = closesOnly(dailyRows)
    const rsi    = calcRSI(dailyCloses)
    const ema9   = calcEMA(dailyCloses, 9)
    const ema21  = calcEMA(dailyCloses, 21)
    const ema50  = calcEMA(dailyCloses, 50)

    // Build OHLC candles from last 30 daily bars
    const candles: Candle[] = dailyRows.slice(-30).map(r => ({
      o: safeNum(r.open,  safeNum(r.close, 0)),
      h: safeNum(r.high,  safeNum(r.close, 0)),
      l: safeNum(r.low,   safeNum(r.close, 0)),
      c: safeNum(r.close, 0),
    })).filter(c => c.c > 0)

    return {
      symbol: inst.symbol, display: inst.display, name: inst.name, category: inst.category,
      price, change, changePct, high, low, open, volume,
      rsi, ema9, ema21, ema50, signal, trend,
      candles,
      analysis:   generateAnalysis(inst.name, rsi, ema9, ema21, ema50, changePct),
      prediction: generatePrediction(signal),
      news:       newsResults[idx],
    }
  })
}

// ── Route handler ──────────────────────────────────────────────────────────────

const CRYPTO_INSTRUMENTS  = INSTRUMENTS.filter(i => i.category === 'crypto')
const MARKET_INSTRUMENTS  = INSTRUMENTS.filter(i => i.category !== 'crypto')

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url          = new URL(req.url)
  const forceRefresh = url.searchParams.get('refresh') === '1'
  const now          = Date.now()
  const weekend      = isMarketWeekend()

  // If markets just reopened (cache was built during weekend, now it's a weekday),
  // flush the non-crypto cache so we get fresh live prices immediately.
  if (!weekend && cacheMarketWeekend && cachedMarket) {
    cachedMarket       = null
    cacheMarketTs      = 0
    cacheMarketWeekend = false
  }

  const headers = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'CDN-Cache-Control': 'no-store',
    'Vercel-CDN-Cache-Control': 'no-store',
  }

  try {
    // ── Crypto: always refresh (24/7 market) ────────────────────────────────
    const cryptoStale = !cachedCrypto || now - cacheCryptoTs > (weekend ? CACHE_TTL_WKD : CACHE_TTL)
    if (forceRefresh || cryptoStale) {
      const fresh = await buildInstruments(CRYPTO_INSTRUMENTS)
      if (fresh.length > 0) { cachedCrypto = fresh; cacheCryptoTs = now }
    }

    // ── Non-crypto: always fetch when cache is empty (cold start), then:
    //    weekdays → refresh every 5 min
    //    weekends → keep Friday close (don't overwrite unless prices are valid)
    const marketEmpty = !cachedMarket
    const marketStale = !cachedMarket || now - cacheMarketTs > CACHE_TTL
    if (marketEmpty || forceRefresh || (!weekend && marketStale)) {
      const fresh = await buildInstruments(MARKET_INSTRUMENTS)
      const hasValidPrices = fresh.some(i => i.price > 0)
      if (hasValidPrices) {
        if (!weekend || marketEmpty) {
          cachedMarket       = fresh
          cacheMarketTs      = now
          cacheMarketWeekend = weekend
        }
      }
    }

    // Combine both halves
    const instruments: InstrumentData[] = [
      ...(cachedMarket ?? []),
      ...(cachedCrypto  ?? []),
    ]

    if (instruments.length === 0) {
      return NextResponse.json({ error: 'No market data available yet' }, { status: 503, headers })
    }

    const bullCount    = instruments.filter(i => i.signal === 'STRONG BUY' || i.signal === 'BUY').length
    const bearCount    = instruments.filter(i => i.signal === 'STRONG SELL' || i.signal === 'SELL').length
    const neutralCount = instruments.filter(i => i.signal === 'NEUTRAL').length

    const data: MarketData = {
      instruments,
      updatedAt:    now,
      bullCount,
      bearCount,
      neutralCount,
      weekend,
    } as MarketData & { weekend: boolean }

    return NextResponse.json(data, { headers })
  } catch (err) {
    console.error('[market-data]', err)
    const fallback = [...(cachedMarket ?? []), ...(cachedCrypto ?? [])]
    if (fallback.length > 0) {
      return NextResponse.json({ instruments: fallback, updatedAt: now, bullCount: 0, bearCount: 0, neutralCount: 0, weekend, stale: true }, { headers })
    }
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500, headers })
  }
}
