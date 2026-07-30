import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import YahooFinance from 'yahoo-finance2'

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] })

// ── Slug → Yahoo symbol map ────────────────────────────────────────────────────

export const SLUG_TO_SYMBOL: Record<string, string> = {
  // Forex — 10 most-traded pairs
  'eur-usd':  'EURUSD=X',
  'gbp-usd':  'GBPUSD=X',
  'usd-jpy':  'USDJPY=X',
  'aud-usd':  'AUDUSD=X',
  'usd-cad':  'USDCAD=X',
  'usd-chf':  'USDCHF=X',
  'nzd-usd':  'NZDUSD=X',
  'eur-gbp':  'EURGBP=X',
  'gbp-jpy':  'GBPJPY=X',
  'eur-jpy':  'EURJPY=X',
  // Commodities — liquid, high-conviction instruments only
  'xau-usd':  'GC=F',
  'xag-usd':  'SI=F',
  'wti-usd':  'CL=F',
  'copper':   'HG=F',
  // Indices — US majors + DXY
  'sp-500':   'ES=F',
  'dj-30':    'YM=F',
  'nas-100':  'NQ=F',
  'us-dxy':   'DX-Y.NYB',
  // Stocks
  'apple':     'AAPL',
  'microsoft': 'MSFT',
  'google':    'GOOGL',
  'tesla':     'TSLA',
  // Crypto — 6 highest-liquidity tokens
  'btc-usd':  'BTC-USD',
  'eth-usd':  'ETH-USD',
  'sol-usd':  'SOL-USD',
  'xrp-usd':  'XRP-USD',
  'bnb-usd':  'BNB-USD',
  'doge-usd': 'DOGE-USD',
}

export const SLUG_META: Record<string, { display: string; name: string; category: string }> = {
  // Forex — 10 most-traded pairs
  'eur-usd':  { display: 'EUR/USD',  name: 'Euro / US Dollar',               category: 'forex'     },
  'gbp-usd':  { display: 'GBP/USD',  name: 'British Pound / US Dollar',      category: 'forex'     },
  'usd-jpy':  { display: 'USD/JPY',  name: 'US Dollar / Japanese Yen',       category: 'forex'     },
  'aud-usd':  { display: 'AUD/USD',  name: 'Australian Dollar / USD',        category: 'forex'     },
  'usd-cad':  { display: 'USD/CAD',  name: 'US Dollar / Canadian Dollar',    category: 'forex'     },
  'usd-chf':  { display: 'USD/CHF',  name: 'US Dollar / Swiss Franc',        category: 'forex'     },
  'nzd-usd':  { display: 'NZD/USD',  name: 'New Zealand Dollar / USD',       category: 'forex'     },
  'eur-gbp':  { display: 'EUR/GBP',  name: 'Euro / British Pound',           category: 'forex'     },
  'gbp-jpy':  { display: 'GBP/JPY',  name: 'British Pound / Japanese Yen',   category: 'forex'     },
  'eur-jpy':  { display: 'EUR/JPY',  name: 'Euro / Japanese Yen',            category: 'forex'     },
  // Commodities
  'xau-usd':  { display: 'XAU/USD',  name: 'Gold',          category: 'commodity' },
  'xag-usd':  { display: 'XAG/USD',  name: 'Silver',        category: 'commodity' },
  'wti-usd':  { display: 'WTI/USD',  name: 'Crude Oil WTI', category: 'commodity' },
  'copper':   { display: 'COPPER',   name: 'Copper',        category: 'commodity' },
  // Indices — US majors + DXY
  'sp-500':   { display: 'S&P 500',  name: 'S&P 500 Futures',      category: 'indices' },
  'dj-30':    { display: 'DJ 30',    name: 'Dow Jones 30 Futures',  category: 'indices' },
  'nas-100':  { display: 'NAS 100',  name: 'NASDAQ 100 Futures',    category: 'indices' },
  'us-dxy':   { display: 'US DXY',   name: 'US Dollar Index',       category: 'indices' },
  // Stocks
  'apple':     { display: 'APPLE',     name: 'Apple Inc.',        category: 'stocks' },
  'microsoft': { display: 'MICROSOFT', name: 'Microsoft Corp.',   category: 'stocks' },
  'google':    { display: 'GOOGLE',    name: 'Alphabet (Google)', category: 'stocks' },
  'tesla':     { display: 'TESLA',     name: 'Tesla Inc.',        category: 'stocks' },
  // Crypto — 6 highest-liquidity tokens
  'btc-usd':  { display: 'BTC/USD',  name: 'Bitcoin',      category: 'crypto' },
  'eth-usd':  { display: 'ETH/USD',  name: 'Ethereum',     category: 'crypto' },
  'sol-usd':  { display: 'SOL/USD',  name: 'Solana',       category: 'crypto' },
  'xrp-usd':  { display: 'XRP/USD',  name: 'Ripple XRP',   category: 'crypto' },
  'bnb-usd':  { display: 'BNB/USD',  name: 'Binance Coin', category: 'crypto' },
  'doge-usd': { display: 'DOGE/USD', name: 'Dogecoin',     category: 'crypto' },
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type Signal = 'STRONG BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG SELL'

export interface Candle { o: number; h: number; l: number; c: number }

export interface TimeframeAnalysis {
  label:    string      // "Weekly" | "Daily" | "4 Hour" | "1 Hour"
  key:      string      // "weekly" | "daily" | "4h" | "1h"
  signal:   Signal
  rsi:      number
  ema9:     number
  ema21:    number
  ema50:    number
  ema200:   number
  close:    number
  high:     number
  low:      number
  candles:  Candle[]
  analysis: string
}

export interface MarketContext {
  atr14:          number   // True 14-period ATR from daily bars
  prevDayHigh:    number   // Previous day high (PDH) — key institutional level
  prevDayLow:     number   // Previous day low  (PDL) — key institutional level
  prevDayClose:   number   // Previous day close (PDC)
  swingHigh:      number   // Highest high of last 20 daily bars — macro swing high
  swingLow:       number   // Lowest  low  of last 20 daily bars — macro swing low
  avgVolume20:    number   // 20-day average volume — used to gauge conviction
  volumeRatio:    number   // today's volume / avgVolume20 (>1.5 = elevated, <0.5 = thin)
  last3Candles1H: { o: number; h: number; l: number; c: number }[]  // 3 most recent CLOSED 1H candles
  last3Candles4H: { o: number; h: number; l: number; c: number }[]  // 3 most recent CLOSED 4H candles
  prevClosed1H:   { o: number; h: number; l: number; c: number }    // the institutional signal candle
}

export interface DataQuality {
  score:     number    // 0–100 (100 = perfect)
  freshness: string    // human label: 'Fresh' | 'Acceptable' | 'Stale'
  issues:    string[]  // list of detected problems
}

export interface IntermarketData {
  dxyChangePct:  number
  dxyDirection:  'rising' | 'falling' | 'flat'
  goldChangePct: number
  goldDirection: 'rising' | 'falling' | 'flat'
  vixLevel:      number
}

export interface DetailData {
  slug:         string
  symbol:       string
  display:      string
  name:         string
  category:     string
  price:        number
  change:       number
  changePct:    number
  high:         number
  low:          number
  open:         number
  volume:       number
  overallSignal: Signal
  timeframes:   TimeframeAnalysis[]
  keyLevels: {
    resistance1: number
    resistance2: number
    support1:    number
    support2:    number
    pivot:       number
  }
  marketContext: MarketContext
  dataQuality:   DataQuality
  intermarket:   IntermarketData
  updatedAt: number
}

// ── Cache ─────────────────────────────────────────────────────────────────────

const detailCache = new Map<string, { data: DetailData; ts: number }>()
const CACHE_TTL   = 5 * 60 * 1000

// ── Technical helpers ─────────────────────────────────────────────────────────

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50
  const changes = closes.slice(1).map((c, i) => c - closes[i])
  let avgGain = 0, avgLoss = 0
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i]
    else avgLoss -= changes[i]
  }
  avgGain /= period; avgLoss /= period
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + Math.max(changes[i], 0)) / period
    avgLoss = (avgLoss * (period - 1) + Math.max(-changes[i], 0)) / period
  }
  return avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
}

function calcEMA(closes: number[], period: number): number {
  if (closes.length < period) return closes[closes.length - 1] ?? 0
  const k = 2 / (period + 1)
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k)
  return ema
}

// True ATR14 from daily OHLC rows
function calcATR14(highs: number[], lows: number[], closes: number[]): number {
  const len = Math.min(highs.length, lows.length, closes.length)
  if (len < 2) return 0
  const trs: number[] = []
  for (let i = 1; i < len; i++) {
    const tr = Math.max(
      highs[i]  - lows[i],
      Math.abs(highs[i]  - closes[i - 1]),
      Math.abs(lows[i]   - closes[i - 1]),
    )
    trs.push(tr)
  }
  // Wilder smoothing for the last 14 TRs
  const period = 14
  if (trs.length < period) return trs.reduce((a, b) => a + b, 0) / trs.length
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period
  }
  return atr
}

// Swing high/low over last N daily bars
function calcSwingHighLow(highs: number[], lows: number[], n = 20): { swingHigh: number; swingLow: number } {
  const slice_h = highs.slice(-n)
  const slice_l = lows.slice(-n)
  return {
    swingHigh: slice_h.length ? Math.max(...slice_h) : 0,
    swingLow:  slice_l.length ? Math.min(...slice_l) : 0,
  }
}

// Detect single-candle reversal patterns for the last 3 candles
// Returns last 3 candles as {o,h,l,c}
function lastNCandles(
  opens: number[], highs: number[], lows: number[], closes: number[], n = 3
): { o: number; h: number; l: number; c: number }[] {
  const len   = closes.length
  const start = Math.max(0, len - n)
  return closes.slice(start).map((c, i) => ({
    o: opens[start + i]  ?? c,
    h: highs[start + i]  ?? c,
    l: lows[start + i]   ?? c,
    c,
  })).filter(x => x.c > 0)
}

// Same formula as the list route so signals are consistent across both pages
function scoreSignal(rsi: number, ema9: number, ema21: number, ema50: number, ema200: number, close: number): Signal {
  let score = 0
  if (rsi < 30)       score += 2
  else if (rsi < 40)  score += 1
  else if (rsi > 70)  score -= 2
  else if (rsi > 60)  score -= 1
  score += (ema9  > ema21  ? 1 : -1)
  score += (ema21 > ema50  ? 1 : -1)
  score += (close > ema21  ? 1 : -1)
  score += (close > ema50  ? 1 : -1)
  if (ema200 > 0) score += (close > ema200 ? 1 : -1)
  // Range -7 to +7
  if (score >= 4)  return 'STRONG BUY'
  if (score >= 2)  return 'BUY'
  if (score <= -4) return 'STRONG SELL'
  if (score <= -2) return 'SELL'
  return 'NEUTRAL'
}

function buildAnalysis(label: string, signal: Signal, rsi: number, ema9: number, ema21: number, ema50: number, ema200: number, close: number): string {
  const parts: string[] = []

  // RSI analysis
  if (rsi >= 70)
    parts.push(`On the ${label} chart, RSI is at ${rsi.toFixed(0)} — overbought. Momentum may be exhausting and a corrective pullback becomes increasingly likely.`)
  else if (rsi <= 30)
    parts.push(`On the ${label} chart, RSI is at ${rsi.toFixed(0)} — oversold. Selling pressure appears stretched and a bounce or reversal could be imminent.`)
  else if (rsi > 55)
    parts.push(`The ${label} RSI reads ${rsi.toFixed(0)}, indicating bullish momentum. Buyers remain in control with room to run before overbought conditions.`)
  else if (rsi < 45)
    parts.push(`The ${label} RSI reads ${rsi.toFixed(0)}, showing bearish momentum. Sellers have the near-term edge on this timeframe.`)
  else
    parts.push(`The ${label} RSI at ${rsi.toFixed(0)} is neutral, reflecting balanced market conditions without a strong directional bias.`)

  // EMA structure
  if (ema9 > ema21 && ema21 > ema50 && ema50 > ema200)
    parts.push(`All four EMAs are perfectly bullishly aligned — a strong confirmation of the uptrend on the ${label} timeframe.`)
  else if (ema9 < ema21 && ema21 < ema50 && ema50 < ema200)
    parts.push(`All four EMAs are bearishly stacked, confirming sustained downside pressure on the ${label} chart.`)
  else if (ema9 > ema21 && ema21 > ema50)
    parts.push(`EMA9, EMA21, and EMA50 are bullishly aligned. The EMA200 is the remaining hurdle for a full bull confirmation on the ${label}.`)
  else if (ema9 < ema21 && ema21 < ema50)
    parts.push(`Short and medium EMAs are bearishly stacked. Price needs to reclaim EMA21 on the ${label} before any sustained bullish case.`)
  else
    parts.push(`EMA structure is mixed on the ${label} — the market is in a period of consolidation or trend transition.`)

  // Price position
  if (close > ema21 && close > ema50)
    parts.push(`Price is trading above both EMA21 and EMA50, which now act as dynamic support levels.`)
  else if (close < ema21 && close < ema50)
    parts.push(`Price is below both EMA21 and EMA50, which are acting as overhead resistance on the ${label}.`)

  return parts.join(' ')
}

function calcPivotLevels(high: number, low: number, close: number) {
  const pivot = (high + low + close) / 3
  return {
    pivot,
    resistance1: 2 * pivot - low,
    resistance2: pivot + (high - low),
    support1:    2 * pivot - high,
    support2:    pivot - (high - low),
  }
}

function consensusSignal(signals: Signal[]): Signal {
  // Use the same majority-count logic as the client-side consensus bar so they
  // always tally. A weighted-average approach can return NEUTRAL when no
  // timeframe is actually neutral (e.g. 2 BUY + 2 SELL averages to 0).
  const bullish     = signals.filter(s => s === 'STRONG BUY' || s === 'BUY').length
  const bearish     = signals.filter(s => s === 'STRONG SELL' || s === 'SELL').length
  const strongBull  = signals.filter(s => s === 'STRONG BUY').length
  const strongBear  = signals.filter(s => s === 'STRONG SELL').length

  if (bullish > bearish) {
    // More bullish TFs — STRONG BUY if at least half the bullish ones are strong
    return strongBull >= bullish / 2 ? 'STRONG BUY' : 'BUY'
  }
  if (bearish > bullish) {
    return strongBear >= bearish / 2 ? 'STRONG SELL' : 'SELL'
  }
  return 'NEUTRAL'
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

type ChartRow = { close?: number | null; high?: number | null; low?: number | null; open?: number | null; date?: Date }
type HistRow  = ChartRow
type QuoteRow  = Record<string, unknown>

function closesFrom(rows: HistRow[]): number[] {
  return rows.map(r => r.close).filter((c): c is number => typeof c === 'number' && c > 0)
}

function aggregate4H(rows: ChartRow[]): ChartRow[] {
  // Group 1H bars into proper UTC 4H buckets: 00–04, 04–08, 08–12, 12–16, 16–20, 20–24
  // Naive sequential grouping (i += 4) misaligns when data doesn't start at a 4H boundary.
  const buckets = new Map<string, ChartRow[]>()
  for (const row of rows) {
    if (!row.date || typeof row.close !== 'number' || row.close <= 0) continue
    const d    = new Date(row.date)
    const h    = d.getUTCHours()
    const slot = Math.floor(h / 4) * 4   // 0, 4, 8, 12, 16, 20
    const key  = `${d.getUTCFullYear()}-${String(d.getUTCMonth()).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}-${slot}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(row)
  }
  const out: ChartRow[] = []
  for (const [, slice] of buckets) {
    if (slice.length === 0) continue
    out.push({
      date:  slice[0].date,
      open:  slice[0].open,
      high:  Math.max(...slice.map(r => r.high ?? 0)),
      low:   Math.min(...slice.map(r => r.low  ?? Infinity)),
      close: slice[slice.length - 1].close,
    })
  }
  // Map preserves insertion order which is chronological since Yahoo returns sorted rows
  return out
}

function buildCandles(opens: number[], highs: number[], lows: number[], closes: number[], n = 40): Candle[] {
  const len   = closes.length
  const start = Math.max(0, len - n)
  return closes.slice(start).map((c, i) => ({
    o: opens[start + i]  ?? c,
    h: highs[start + i]  ?? c,
    l: lows[start + i]   ?? c,
    c,
  })).filter(c => c.c > 0)
}

// ── Twelve Data 1H source (optional upgrade — set TWELVE_DATA_API_KEY in env) ──
// Free tier: 800 credits/day, 8 req/min. Falls back to Yahoo if unavailable.

const TWELVE_DATA_SYMBOLS: Record<string, string> = {
  // Forex
  'eur-usd': 'EUR/USD', 'gbp-usd': 'GBP/USD', 'usd-jpy': 'USD/JPY',
  'aud-usd': 'AUD/USD', 'usd-cad': 'USD/CAD', 'usd-chf': 'USD/CHF',
  'nzd-usd': 'NZD/USD', 'eur-gbp': 'EUR/GBP', 'gbp-jpy': 'GBP/JPY',
  'eur-jpy': 'EUR/JPY', 'eur-aud': 'EUR/AUD', 'eur-cad': 'EUR/CAD',
  'gbp-aud': 'GBP/AUD', 'gbp-cad': 'GBP/CAD', 'aud-jpy': 'AUD/JPY',
  'eur-chf': 'EUR/CHF', 'gbp-chf': 'GBP/CHF', 'usd-mxn': 'USD/MXN',
  'aud-cad': 'AUD/CAD', 'usd-sgd': 'USD/SGD',
  // Commodities
  'xau-usd': 'XAU/USD', 'xag-usd': 'XAG/USD', 'wti-usd': 'WTI/USD',
  'copper':  'COPPER',  'brent':   'BRENT',
  // Crypto
  'btc-usd': 'BTC/USD', 'eth-usd': 'ETH/USD', 'sol-usd': 'SOL/USD',
  'xrp-usd': 'XRP/USD', 'bnb-usd': 'BNB/USD', 'doge-usd': 'DOGE/USD',
  // Indices
  'sp-500': 'SPX', 'nas-100': 'NDX', 'dj-30': 'DJI', 'us-dxy': 'DX',
}

interface TwelveRow { datetime: string; open: string; high: string; low: string; close: string }

interface TwelveIntraday {
  rows15m: ChartRow[]
  rows30m: ChartRow[]
  rows1H:  ChartRow[]
  rows4H:  ChartRow[]
}

// ── Aggregate 15m bars into 30m buckets ──────────────────────────────────────
function aggregate30m(rows: ChartRow[]): ChartRow[] {
  const buckets = new Map<string, ChartRow[]>()
  for (const row of rows) {
    if (!row.date || typeof row.close !== 'number' || row.close <= 0) continue
    const d    = new Date(row.date)
    const slot = Math.floor(d.getUTCMinutes() / 30) * 30  // 0 or 30
    const key  = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}-${slot}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(row)
  }
  const out: ChartRow[] = []
  for (const [, slice] of buckets) {
    if (slice.length === 0) continue
    out.push({
      date:  slice[0].date,
      open:  slice[0].open,
      high:  Math.max(...slice.map(r => r.high ?? 0)),
      low:   Math.min(...slice.map(r => r.low  ?? Infinity)),
      close: slice[slice.length - 1].close,
    })
  }
  return out
}

// Fetch 1H + 15m from Twelve Data — still 2 credits per pair.
// 30m and 4H are derived by aggregating 15m and 1H bars respectively.
// Daily and Weekly always from Yahoo (free, no credit limit).
async function fetchTwelveDataIntraday(slug: string): Promise<TwelveIntraday | null> {
  const key   = process.env.TWELVE_DATA_API_KEY
  const tdSym = TWELVE_DATA_SYMBOLS[slug]
  if (!key || !tdSym) return null

  const td = async (interval: string, outputsize: number, revalidate: number): Promise<ChartRow[] | null> => {
    try {
      const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(tdSym)}&interval=${interval}&outputsize=${outputsize}&apikey=${key}`
      const res = await fetch(url, { next: { revalidate } })
      if (!res.ok) return null
      const json = await res.json() as { status?: string; values?: TwelveRow[]; code?: number }
      if (json.status === 'error' || json.code === 429 || !json.values?.length) return null
      return [...json.values].reverse().map(v => ({
        open:  parseFloat(v.open),
        high:  parseFloat(v.high),
        low:   parseFloat(v.low),
        close: parseFloat(v.close),
        date:  new Date(v.datetime),
      }))
    } catch { return null }
  }

  const [rows15m, rows1H] = await Promise.all([
    td('15min', 300, 120),  //  2 min revalidate — freshest short-TF data
    td('1h',    200, 300),  //  5 min revalidate
  ])

  if (!rows1H) return null

  return {
    rows15m: rows15m ?? [],
    rows30m: aggregate30m(rows15m ?? []),
    rows1H,
    rows4H:  aggregate4H(rows1H),
  }
}

// ── Polygon.io 1H source (stocks + crypto — strong free tier) ────────────────
// Polygon free: unlimited REST calls, 15-min delayed for stocks, near-real-time
// for crypto. Better data quality than Yahoo for US equities and top crypto.
// Forex via Polygon requires a paid plan — Twelve Data handles forex instead.

const POLYGON_SYMBOLS: Record<string, string> = {
  // Stocks — Polygon has best-in-class US equity data
  'apple':    'AAPL', 'microsoft': 'MSFT', 'google': 'GOOGL', 'tesla': 'TSLA',
  // Crypto — X: prefix, near-real-time on free tier
  'btc-usd':  'X:BTCUSD', 'eth-usd':  'X:ETHUSD', 'sol-usd':  'X:SOLUSD',
  'xrp-usd':  'X:XRPUSD', 'bnb-usd':  'X:BNBUSD', 'doge-usd': 'X:DOGEUSD',
}

interface PolygonResult { o: number; h: number; l: number; c: number; t: number }

async function fetchPolygonIntraday(slug: string): Promise<TwelveIntraday | null> {
  const key    = process.env.POLYGON_API_KEY
  const ticker = POLYGON_SYMBOLS[slug]
  if (!key || !ticker) return null

  const to   = new Date()
  const from = new Date(to.getTime() - 10 * 24 * 60 * 60 * 1000)  // 10 days back
  const fmt  = (d: Date) => d.toISOString().split('T')[0]

  const pg = async (multiplier: number, timespan: string, revalidate: number): Promise<ChartRow[] | null> => {
    try {
      const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${fmt(from)}/${fmt(to)}?adjusted=true&sort=asc&limit=300&apiKey=${key}`
      const res = await fetch(url, { next: { revalidate } })
      if (!res.ok) return null
      const json = await res.json() as { status?: string; results?: PolygonResult[] }
      if (json.status === 'ERROR' || !json.results?.length) return null
      return json.results.map(r => ({
        open: r.o, high: r.h, low: r.l, close: r.c,
        date: new Date(r.t),
      }))
    } catch { return null }
  }

  const [rows15m, rows1H] = await Promise.all([
    pg(15, 'minute', 120),
    pg(1,  'hour',   300),
  ])

  if (!rows1H) return null

  return {
    rows15m: rows15m ?? [],
    rows30m: aggregate30m(rows15m ?? []),
    rows1H,
    rows4H:  aggregate4H(rows1H),
  }
}

// ── Data quality validation ───────────────────────────────────────────────────

function validateData(
  quotePrice: number,
  tf1H: TimeframeAnalysis,
  tf4H: TimeframeAnalysis,
  tfDaily: TimeframeAnalysis,
): DataQuality {
  const issues: string[] = []
  let score = 100

  // 1. 1H close should be within 1% of the live quote price
  if (tf1H.close > 0 && Math.abs(tf1H.close - quotePrice) / quotePrice > 0.01) {
    issues.push(`1H close (${tf1H.close.toFixed(4)}) diverges >1% from quote price — possible stale intraday candle`)
    score -= 20
  }
  // 2. EMA values should be non-zero and in a reasonable range of price
  const emaOk = (ema: number) => ema > 0 && Math.abs(ema - quotePrice) / quotePrice < 0.30
  if (!emaOk(tf1H.ema9) || !emaOk(tf1H.ema21)) {
    issues.push('1H EMA values appear invalid — indicator calculation may have insufficient data')
    score -= 15
  }
  if (!emaOk(tf4H.ema9) || !emaOk(tf4H.ema21)) {
    issues.push('4H EMA values appear invalid')
    score -= 10
  }
  // 3. RSI should be in a realistic range
  if (tf1H.rsi < 5 || tf1H.rsi > 95) {
    issues.push(`1H RSI (${tf1H.rsi.toFixed(1)}) is at an extreme — data may be corrupted`)
    score -= 15
  }
  // 4. Daily close should be within 5% of quote
  if (tfDaily.close > 0 && Math.abs(tfDaily.close - quotePrice) / quotePrice > 0.05) {
    issues.push(`Daily close diverges >5% from live quote — market may have gapped`)
    score -= 10
  }

  const freshness: DataQuality['freshness'] =
    score >= 90 ? 'Fresh' : score >= 70 ? 'Acceptable' : 'Stale'
  return { score: Math.max(0, score), freshness, issues }
}

// ── Inter-market context (DXY + Gold + VIX via Yahoo) ────────────────────────
// Cached separately with a short TTL — changes every few minutes

const intermarketCache = new Map<string, { data: IntermarketData; ts: number }>()
const INTERMARKET_TTL  = 3 * 60 * 1000  // 3 min

async function fetchIntermarket(): Promise<IntermarketData> {
  const cached = intermarketCache.get('global')
  if (cached && Date.now() - cached.ts < INTERMARKET_TTL) return cached.data

  try {
    const [dxyQ, goldQ, vixQ] = await Promise.all([
      yf.quote('DX-Y.NYB', {}, { validateResult: false }) as Promise<QuoteRow>,
      yf.quote('GC=F',      {}, { validateResult: false }) as Promise<QuoteRow>,
      yf.quote('^VIX',      {}, { validateResult: false }) as Promise<QuoteRow>,
    ])
    const safeN = (v: unknown, fb = 0) => typeof v === 'number' && isFinite(v) ? v : fb
    const direction = (pct: number): 'rising' | 'falling' | 'flat' =>
      pct >  0.15 ? 'rising' : pct < -0.15 ? 'falling' : 'flat'

    const dxyChangePct  = safeN(dxyQ.regularMarketChangePercent)
    const goldChangePct = safeN(goldQ.regularMarketChangePercent)
    const vixLevel      = safeN(vixQ.regularMarketPrice, 15)

    const data: IntermarketData = {
      dxyChangePct, dxyDirection:  direction(dxyChangePct),
      goldChangePct, goldDirection: direction(goldChangePct),
      vixLevel,
    }
    intermarketCache.set('global', { data, ts: Date.now() })
    return data
  } catch {
    // Return flat/neutral defaults if fetch fails
    return { dxyChangePct: 0, dxyDirection: 'flat', goldChangePct: 0, goldDirection: 'flat', vixLevel: 15 }
  }
}

async function buildTimeframe(
  label: string, key: string,
  closes: number[], highs: number[], lows: number[], opens: number[]
): Promise<TimeframeAnalysis> {
  const close  = closes[closes.length - 1] ?? 0
  const high   = highs[highs.length - 1]   ?? close
  const low    = lows[lows.length - 1]     ?? close
  const rsi    = calcRSI(closes)
  const ema9   = calcEMA(closes, 9)
  const ema21  = calcEMA(closes, 21)
  const ema50  = calcEMA(closes, 50)
  const ema200 = calcEMA(closes, 200)
  const signal = scoreSignal(rsi, ema9, ema21, ema50, ema200, close)
  return {
    label, key, signal, rsi, ema9, ema21, ema50, ema200, close, high, low,
    candles:  buildCandles(opens, highs, lows, closes, 75),
    analysis: buildAnalysis(label, signal, rsi, ema9, ema21, ema50, ema200, close),
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const session    = await getServerSession(authOptions)
  const cronHeader = req.headers.get('x-cron-secret')
  // No 'dev' fallback — an unset CRON_SECRET must not leave a guessable string
  // standing in as a valid credential.
  const cronSecret = process.env.CRON_SECRET
  if (!session && (!cronSecret || cronHeader !== cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { symbol: slugRaw } = await params
  const slug   = slugRaw.toLowerCase()
  const yfSym  = SLUG_TO_SYMBOL[slug]
  const meta   = SLUG_META[slug]

  if (!yfSym || !meta) return NextResponse.json({ error: 'Unknown symbol' }, { status: 404 })

  // Serve cache
  const cached = detailCache.get(slug)
  const now    = Date.now()
  const forceRefresh = new URL(req.url).searchParams.get('refresh') === '1'
  if (!forceRefresh && cached && now - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    const today = new Date().toISOString().split('T')[0]

    // ── Fetch all data in parallel (all via chart() — historical() is deprecated in v3) ──
    const chartRows = (raw: { quotes?: ChartRow[] } | ChartRow[]): ChartRow[] =>
      Array.isArray(raw) ? raw : (raw as { quotes?: ChartRow[] }).quotes ?? []

    const [quoteRaw, weeklyRaw, dailyRaw, intradayRaw, twelveDataIntraday, polygonIntraday, intermarket] = await Promise.all([
      yf.quote(yfSym, {}, { validateResult: false }) as Promise<QuoteRow>,

      yf.chart(yfSym, {
        period1:  new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],  // 5yr → ~260 weekly bars for EMA200
        period2:  today,
        interval: '1wk',
      }, { validateResult: false }) as Promise<{ quotes?: ChartRow[] } | ChartRow[]>,

      yf.chart(yfSym, {
        period1:  new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period2:  today,
        interval: '1d',
      }, { validateResult: false }) as Promise<{ quotes?: ChartRow[] } | ChartRow[]>,

      yf.chart(yfSym, {
        period1:  new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],  // 60d → ~360 4H bars for proper EMA200
        period2:  today,
        interval: '60m',
      }, { validateResult: false }) as Promise<{ quotes?: ChartRow[] } | ChartRow[]>,

      // Twelve Data: forex + commodities intraday (best data quality for these)
      fetchTwelveDataIntraday(slug),

      // Polygon.io: stocks + crypto intraday (best data quality for US equities + crypto)
      fetchPolygonIntraday(slug),

      // Inter-market context: DXY, Gold, VIX (short-TTL cached separately)
      fetchIntermarket(),
    ])

    const yahooWeeklyRows:   ChartRow[] = chartRows(weeklyRaw)
    const yahooDailyRows:    ChartRow[] = chartRows(dailyRaw)
    const yahooIntradayRows: ChartRow[] = chartRows(intradayRaw)

    // Source priority for intraday timeframes (15m, 30m, 1H, 4H):
    //   1. Twelve Data  — forex, commodities (best for these asset classes)
    //   2. Polygon.io   — stocks, crypto (best for US equities + crypto)
    //   3. Yahoo 60m    — universal fallback for 1H/4H (no 15m/30m available)
    // Daily + Weekly always from Yahoo (free, no API cost, sufficient accuracy)
    const td  = twelveDataIntraday
    const pg  = polygonIntraday

    const intradayRows: ChartRow[] = (td && (td.rows1H?.length ?? 0) >= 50)
      ? td.rows1H
      : (pg && (pg.rows1H?.length ?? 0) >= 50)
      ? pg.rows1H
      : yahooIntradayRows

    const fourHRows: ChartRow[] = (td && (td.rows4H?.length ?? 0) >= 20)
      ? td.rows4H
      : (pg && (pg.rows4H?.length ?? 0) >= 20)
      ? pg.rows4H
      : aggregate4H(yahooIntradayRows)

    // 15m and 30m only available from Twelve Data / Polygon — no Yahoo fallback
    const fifteenMRows: ChartRow[] = (td && (td.rows15m?.length ?? 0) >= 30)
      ? td.rows15m
      : (pg && (pg.rows15m?.length ?? 0) >= 30)
      ? pg.rows15m
      : []

    const thirtyMRows: ChartRow[] = (td && (td.rows30m?.length ?? 0) >= 20)
      ? td.rows30m
      : (pg && (pg.rows30m?.length ?? 0) >= 20)
      ? pg.rows30m
      : []

    const dailyRows:    ChartRow[] = yahooDailyRows   // always Yahoo — free, reliable
    const weeklyRows:   ChartRow[] = yahooWeeklyRows  // always Yahoo — free, reliable

    // Closes/highs/lows/opens helpers
    const rowOHLC = (rows: HistRow[]) => ({
      closes: rows.map(r => r.close).filter((c): c is number => typeof c === 'number' && c > 0),
      highs:  rows.map(r => r.high ).filter((h): h is number => typeof h === 'number' && h > 0),
      lows:   rows.map(r => r.low  ).filter((l): l is number => typeof l === 'number' && l > 0),
      opens:  rows.map(r => r.open ).filter((o): o is number => typeof o === 'number' && o > 0),
    })
    const chartOHLC = (rows: ChartRow[]) => ({
      closes: rows.map(r => r.close).filter((c): c is number => typeof c === 'number' && c > 0),
      highs:  rows.map(r => r.high ).filter((h): h is number => typeof h === 'number' && h > 0),
      lows:   rows.map(r => r.low  ).filter((l): l is number => typeof l === 'number' && l > 0),
      opens:  rows.map(r => r.open ).filter((o): o is number => typeof o === 'number' && o > 0),
    })

    // Strip forming (incomplete) daily candle — if the last daily row's date is today,
    // it is the partially-closed candle for the current session.
    const todayUtc  = new Date().toISOString().slice(0, 10)  // "YYYY-MM-DD"
    const lastDailyDate = dailyRows[dailyRows.length - 1]?.date
      ? new Date(dailyRows[dailyRows.length - 1].date!).toISOString().slice(0, 10)
      : ''
    const closedDailyRows = lastDailyDate === todayUtc
      ? dailyRows.slice(0, -1)
      : dailyRows

    // Strip forming (incomplete) weekly candle — if the last weekly row's date is within
    // the current ISO week (Mon–Sun), the candle is still building.
    const getISOWeek = (d: Date) => {
      const tmp = new Date(d)
      tmp.setUTCHours(0, 0, 0, 0)
      tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
      const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
      return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
    }
    const nowDate        = new Date()
    const currentISOWeek = getISOWeek(nowDate)
    const currentYear    = nowDate.getUTCFullYear()
    const lastWeeklyDate = weeklyRows[weeklyRows.length - 1]?.date
      ? new Date(weeklyRows[weeklyRows.length - 1].date!)
      : null
    const lastWeekIsCurrentWeek = lastWeeklyDate
      ? getISOWeek(lastWeeklyDate) === currentISOWeek && lastWeeklyDate.getUTCFullYear() === currentYear
      : false
    const closedWeeklyRows = lastWeekIsCurrentWeek
      ? weeklyRows.slice(0, -1)
      : weeklyRows

    const wkd = rowOHLC(closedWeeklyRows)
    const dly = rowOHLC(closedDailyRows)
    const weekly1h = chartOHLC(intradayRows)
    const weekly4h = chartOHLC(fourHRows)

    // ── Build timeframes ─────────────────────────────────────────────────────
    // Exclude the currently-forming (incomplete) candle — use only CLOSED candles.
    // Yahoo includes a partial candle only when the market is open. When it's closed
    // (weekends, after-hours) all rows are already closed.
    // Detect: if the last 1H row closed within the current UTC hour → forming candle.
    const nowUtcHour = new Date().getUTCHours()
    const lastClose1H = intradayRows[intradayRows.length - 1]
    const lastRowHour1H = lastClose1H?.date
      ? new Date(lastClose1H.date).getUTCHours()
      : -1
    // A row is "forming" if its hour matches the current UTC hour (market is open)
    const hasFormingCandle1H = lastRowHour1H === nowUtcHour

    const closed1H = {
      closes: hasFormingCandle1H ? weekly1h.closes.slice(0, -1) : weekly1h.closes,
      highs:  hasFormingCandle1H ? weekly1h.highs.slice(0, -1)  : weekly1h.highs,
      lows:   hasFormingCandle1H ? weekly1h.lows.slice(0, -1)   : weekly1h.lows,
      opens:  hasFormingCandle1H ? weekly1h.opens.slice(0, -1)  : weekly1h.opens,
    }

    // Same logic for 4H: forming if the last 4H bar's slot matches the current UTC 4H slot
    const lastRow4H = fourHRows[fourHRows.length - 1]
    const lastRowHour4H = lastRow4H?.date ? new Date(lastRow4H.date).getUTCHours() : -1
    const currentSlot4H = Math.floor(nowUtcHour / 4) * 4
    const hasFormingCandle4H = lastRowHour4H === currentSlot4H

    const closed4H = {
      closes: hasFormingCandle4H ? weekly4h.closes.slice(0, -1) : weekly4h.closes,
      highs:  hasFormingCandle4H ? weekly4h.highs.slice(0, -1)  : weekly4h.highs,
      lows:   hasFormingCandle4H ? weekly4h.lows.slice(0, -1)   : weekly4h.lows,
      opens:  hasFormingCandle4H ? weekly4h.opens.slice(0, -1)  : weekly4h.opens,
    }

    // 30m forming candle: strip last bar if it started within the current 30m slot
    const currentSlot30m = Math.floor(nowUtcHour * 60 / 30)  // 0–47 (48 slots per day)
    const lastRow30m     = thirtyMRows[thirtyMRows.length - 1]
    const lastRowSlot30m = lastRow30m?.date
      ? Math.floor((new Date(lastRow30m.date).getUTCHours() * 60 + new Date(lastRow30m.date).getUTCMinutes()) / 30)
      : -1
    const hasForming30m = lastRowSlot30m === currentSlot30m
    const chart30m      = chartOHLC(thirtyMRows)
    const closed30m     = {
      closes: hasForming30m ? chart30m.closes.slice(0, -1) : chart30m.closes,
      highs:  hasForming30m ? chart30m.highs.slice(0, -1)  : chart30m.highs,
      lows:   hasForming30m ? chart30m.lows.slice(0, -1)   : chart30m.lows,
      opens:  hasForming30m ? chart30m.opens.slice(0, -1)  : chart30m.opens,
    }

    // 15m forming candle: strip last bar if it started within the current 15m slot
    const currentSlot15m = Math.floor(nowUtcHour * 60 / 15)  // 0–95 (96 slots per day)
    const lastRow15m     = fifteenMRows[fifteenMRows.length - 1]
    const lastRowSlot15m = lastRow15m?.date
      ? Math.floor((new Date(lastRow15m.date).getUTCHours() * 60 + new Date(lastRow15m.date).getUTCMinutes()) / 15)
      : -1
    const hasForming15m = lastRowSlot15m === currentSlot15m
    const chart15m      = chartOHLC(fifteenMRows)
    const closed15m     = {
      closes: hasForming15m ? chart15m.closes.slice(0, -1) : chart15m.closes,
      highs:  hasForming15m ? chart15m.highs.slice(0, -1)  : chart15m.highs,
      lows:   hasForming15m ? chart15m.lows.slice(0, -1)   : chart15m.lows,
      opens:  hasForming15m ? chart15m.opens.slice(0, -1)  : chart15m.opens,
    }

    const [tfWeekly, tfDaily, tf4H, tf1H, tf30m, tf15m] = await Promise.all([
      buildTimeframe('Weekly', 'weekly', wkd.closes, wkd.highs, wkd.lows, wkd.opens),
      buildTimeframe('Daily',  'daily',  dly.closes, dly.highs, dly.lows, dly.opens),
      buildTimeframe('4 Hour', '4h',     closed4H.closes, closed4H.highs, closed4H.lows, closed4H.opens),
      buildTimeframe('1 Hour', '1h',     closed1H.closes, closed1H.highs, closed1H.lows, closed1H.opens),
      closed30m.closes.length >= 10
        ? buildTimeframe('30 Min', '30m', closed30m.closes, closed30m.highs, closed30m.lows, closed30m.opens)
        : Promise.resolve(null),
      closed15m.closes.length >= 10
        ? buildTimeframe('15 Min', '15m', closed15m.closes, closed15m.highs, closed15m.lows, closed15m.opens)
        : Promise.resolve(null),
    ])

    const timeframes = [tfWeekly, tfDaily, tf4H, tf1H, ...(tf30m ? [tf30m] : []), ...(tf15m ? [tf15m] : [])]
    // Overall signal = consensus across all 4 timeframes so it always matches
    // the Multi-Timeframe Consensus panel shown on the detail page.
    const overallSignal = consensusSignal(timeframes.map(tf => tf.signal))

    // ── Quote data ───────────────────────────────────────────────────────────
    const safeN = (v: unknown, fb = 0) => typeof v === 'number' && isFinite(v) ? v : fb
    const price     = safeN(quoteRaw.regularMarketPrice)
    const change    = safeN(quoteRaw.regularMarketChange)
    const changePct = safeN(quoteRaw.regularMarketChangePercent)
    const high      = safeN(quoteRaw.regularMarketDayHigh,  price)
    const low       = safeN(quoteRaw.regularMarketDayLow,   price)
    const open      = safeN(quoteRaw.regularMarketOpen,     price)
    const volume    = safeN(quoteRaw.regularMarketVolume)

    // ── Pivot / key levels (based on previous daily bar) ─────────────────────
    const lastDaily = closedDailyRows[closedDailyRows.length - 1] // last fully closed day
    const prevHigh  = safeN(lastDaily?.high,  high)
    const prevLow   = safeN(lastDaily?.low,   low)
    const prevClose = safeN(lastDaily?.close, price)
    const keyLevels = calcPivotLevels(prevHigh, prevLow, prevClose)

    // ── Market context — senior analyst signals ───────────────────────────────
    // ATR14 from full daily history
    const atr14 = calcATR14(dly.highs, dly.lows, dly.closes)

    // Swing high/low over last 20 closed daily bars (forming candle already excluded above)
    const { swingHigh, swingLow } = calcSwingHighLow(
      dly.highs, dly.lows, 20
    )

    // 20-day average volume — Yahoo daily rows have volume; Twelve Data daily does not
    // Use yahooDailyRows for volume regardless of which source we use for price
    const dailyVolumes = (yahooDailyRows as { volume?: number | null }[])
      .map(r => (r as { volume?: number | null }).volume)
      .filter((v): v is number => typeof v === 'number' && v > 0)
    const avgVolume20   = dailyVolumes.length >= 5
      ? dailyVolumes.slice(-21, -1).reduce((a, b) => a + b, 0) / Math.max(1, dailyVolumes.slice(-21, -1).length)
      : 0
    const volumeRatio   = avgVolume20 > 0 && volume > 0 ? volume / avgVolume20 : 1

    // Last 3 CLOSED candles on 1H and 4H for pattern detection.
    // Closed candles only — the forming candle is already excluded via closed1H/closed4H.
    const last3Candles1H = lastNCandles(closed1H.opens, closed1H.highs, closed1H.lows, closed1H.closes, 3)
    const last3Candles4H = lastNCandles(closed4H.opens, closed4H.highs, closed4H.lows, closed4H.closes, 3)

    // The single most recent closed 1H candle — the institutional "signal candle".
    // Claude's session analysis is rooted in this candle's structure.
    const prevClosed1H: { o: number; h: number; l: number; c: number } = closed1H.closes.length > 0
      ? {
          o: closed1H.opens[closed1H.opens.length - 1]   ?? 0,
          h: closed1H.highs[closed1H.highs.length - 1]   ?? 0,
          l: closed1H.lows[closed1H.lows.length - 1]     ?? 0,
          c: closed1H.closes[closed1H.closes.length - 1] ?? 0,
        }
      : { o: price, h: price, l: price, c: price }
    const marketContext: MarketContext = {
      atr14,
      prevDayHigh:  prevHigh,
      prevDayLow:   prevLow,
      prevDayClose: prevClose,
      swingHigh,
      swingLow,
      avgVolume20,
      volumeRatio,
      last3Candles1H,
      last3Candles4H,
      prevClosed1H,
    }

    const dataQuality = validateData(price, tf1H, tf4H, tfDaily)
    const using1H  = (td && (td.rows1H?.length  ?? 0) >= 50) ? 'Twelve Data' : (pg && (pg.rows1H?.length  ?? 0) >= 50) ? 'Polygon' : 'Yahoo'
    const using4H  = (td && (td.rows4H?.length  ?? 0) >= 20) ? 'Twelve Data' : (pg && (pg.rows4H?.length  ?? 0) >= 20) ? 'Polygon' : 'Yahoo'
    const using15m = (td && (td.rows15m?.length ?? 0) >= 30) ? 'Twelve Data' : (pg && (pg.rows15m?.length ?? 0) >= 30) ? 'Polygon' : 'None'
    const using30m = using15m  // 30m is derived from 15m source
    if (using1H !== 'Yahoo' || using4H !== 'Yahoo') {
      const shortTF = using15m !== 'None' ? ` · 15m/30m: ${using15m}` : ''
      dataQuality.issues.unshift(`✓ Intraday source — 1H: ${using1H}, 4H: ${using4H}${shortTF}`)
      dataQuality.score = Math.min(100, dataQuality.score + (using15m !== 'None' ? 8 : 5))
    } else if (using15m !== 'None') {
      dataQuality.issues.unshift(`✓ Short-TF source — 15m/30m: ${using15m}`)
      dataQuality.score = Math.min(100, dataQuality.score + 3)
    }
    void using30m

    const data: DetailData = {
      slug, symbol: yfSym, display: meta.display, name: meta.name, category: meta.category,
      price, change, changePct, high, low, open, volume,
      overallSignal, timeframes, keyLevels, marketContext, dataQuality, intermarket, updatedAt: now,
    }

    detailCache.set(slug, { data, ts: now })
    return NextResponse.json(data)

  } catch (err) {
    console.error('[market-data/symbol]', err)
    const stale = detailCache.get(slug)
    if (stale) return NextResponse.json({ ...stale.data, stale: true })
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
