import { NextResponse, after } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { debitTokens, creditTokens, TOKENS_PER_RUN } from '@/lib/tokens'
import {
  SESSION_SLOTS, CRYPTO_SESSION_SLOTS,
  type FMTraderRequest, type FMTraderResponse,
} from '@/lib/fm-trader-types'
// Local aliases matching the inline types in FMTraderRequest / MarketContext
type Candle = { o: number; h: number; l: number; c: number }
type TFData = {
  label: string; key: string; signal: string; rsi: number
  ema9: number; ema21: number; ema50: number; ema200: number
  close: number; high: number; low: number; analysis: string
  candles: Candle[]
}
type MarketContext = {
  atr14: number; prevDayHigh: number; prevDayLow: number; prevDayClose: number
  swingHigh: number; swingLow: number; avgVolume20: number; volumeRatio: number
  last3Candles1H: Candle[]; last3Candles4H: Candle[]
  prevClosed1H: Candle
}
import {
  extractFeatures, getLearnedWeights, computeLearnedBoost, buildLearningContext,
  type MarketSnapshot,
} from '@/lib/rule-engine-learner'

// Helper: find slot metadata across both forex and crypto slot arrays
const ALL_SLOTS = [...SESSION_SLOTS, ...CRYPTO_SESSION_SLOTS]
const FALLBACK_SLOT = SESSION_SLOTS[1]  // 09:00 London Morning
function findSlot(id: string) {
  return ALL_SLOTS.find(s => s.id === id) ?? FALLBACK_SLOT
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Claude calls routinely take 5–15s on full analyses; the streaming response
// then awaits Claude before persisting the prediction. Vercel Hobby kills
// functions at 10s by default, which was truncating the DB save. Bump to 30s
// so the full slow path (Claude + DB write) always completes.
export const maxDuration = 30

// ── DXY correlation table ─────────────────────────────────────────────────────
// Correlation coefficient between pair and DXY. Range: -1 to +1.
// Positive = pair moves WITH DXY (USD-base pairs). Negative = inverse (EUR/USD etc).
// If DXY is rising and a pair has -0.9 correlation, a BUY signal conflicts.
const DXY_CORRELATION: Record<string, number> = {
  // Forex — USD-quote (DXY up = pair down)
  'eur-usd': -0.90, 'gbp-usd': -0.75, 'aud-usd': -0.65, 'nzd-usd': -0.60,
  // Forex — USD-base (DXY up = pair up)
  'usd-jpy': +0.55, 'usd-cad': +0.65, 'usd-chf': +0.55,
  // Cross pairs
  'eur-gbp': +0.10, 'gbp-jpy': -0.25, 'eur-jpy': -0.40,
  // Commodities — generally inverse DXY
  'xau-usd': -0.75, 'xag-usd': -0.65, 'wti-usd': -0.45, 'copper': -0.50,
  // Indices — mildly inverse (USD up = tighter financial conditions)
  'sp-500': -0.30, 'nas-100': -0.35, 'dj-30': -0.25,
  // Crypto — loose inverse
  'btc-usd': -0.35, 'eth-usd': -0.30, 'sol-usd': -0.28,
  'xrp-usd': -0.25, 'bnb-usd': -0.28, 'doge-usd': -0.22,
  // Stocks — mildly inverse DXY (stronger USD = weaker multinational earnings)
  'apple': -0.20, 'microsoft': -0.22, 'google': -0.18, 'tesla': -0.15,
}

function calcCorrelationSignal(
  slug: string,
  im: { dxyChangePct: number; dxyDirection: string; goldChangePct: number; goldDirection: string },
  proposedDecision: 'BUY' | 'SELL' | 'NO TRADE',
): { signal: 'confirms' | 'conflicts' | 'neutral'; detail: string } {
  if (proposedDecision === 'NO TRADE') return { signal: 'neutral', detail: '' }

  const corr = DXY_CORRELATION[slug] ?? 0
  if (Math.abs(corr) < 0.20) return { signal: 'neutral', detail: 'Pair has weak DXY correlation — inter-market filter not applied.' }

  const dxyStrong = Math.abs(im.dxyChangePct) >= 0.30  // DXY moving meaningfully
  if (!dxyStrong) return { signal: 'neutral', detail: `DXY flat (${im.dxyChangePct.toFixed(2)}%) — no strong inter-market pressure.` }

  const isBuy = proposedDecision === 'BUY'
  // If corr is negative and DXY is rising → pair should be falling → BUY conflicts
  const dxyRising = im.dxyDirection === 'rising'
  const conflicts = (corr < -0.20 && dxyRising && isBuy)      // EUR/USD BUY while DXY surges
    || (corr < -0.20 && !dxyRising && !isBuy)                  // EUR/USD SELL while DXY drops
    || (corr > +0.20 && dxyRising && !isBuy)                   // USD/JPY SELL while DXY surges
    || (corr > +0.20 && !dxyRising && isBuy)                   // USD/JPY BUY while DXY drops
  const confirms = (corr < -0.20 && dxyRising && !isBuy)
    || (corr < -0.20 && !dxyRising && isBuy)
    || (corr > +0.20 && dxyRising && isBuy)
    || (corr > +0.20 && !dxyRising && !isBuy)

  if (conflicts) {
    return {
      signal: 'conflicts',
      detail: `DXY is ${im.dxyDirection} (${im.dxyChangePct.toFixed(2)}%) while this pair has ${(corr * 100).toFixed(0)}% DXY correlation — this ${proposedDecision} signal is fighting the USD trend. Confidence reduced.`,
    }
  }
  if (confirms) {
    return {
      signal: 'confirms',
      detail: `DXY ${im.dxyDirection} (${im.dxyChangePct.toFixed(2)}%) aligns with this ${proposedDecision} — inter-market correlation confirms direction. Confidence boosted.`,
    }
  }
  return { signal: 'neutral', detail: '' }
}

// ── Per-hour result cache (busts at UTC hour boundary) ───────────────────────
const cache = new Map<string, { data: FMTraderResponse; ts: number; expiresAt: number }>()

// Remove any cache entries that have passed their UTC hour expiry.
// Called before every cache read so stale results never slip through.
function pruneCache(nowTs: number) {
  for (const [key, entry] of cache.entries()) {
    if (nowTs >= entry.expiresAt) cache.delete(key)
  }
}

// Cache is valid for the ENTIRE session (UTC hour) — it expires at the next hour boundary.
// A prediction is made once per session based on the just-closed 1H candle, then served
// to all users until the next session opens and a new first user triggers a fresh call.
// CACHE_MAX_AGE_MS is intentionally the full hour so no mid-session refreshes occur.
const CACHE_MAX_AGE_MS = 60 * 60 * 1000   // full UTC hour = full session

// ── Prediction expiry — uniform per horizon, NOT per category ────────────────
// Previously intraday windows varied by category (crypto 24h, commodities 12h,
// forex/indices 8h) which made forex/indices trade history disappear earlier
// than crypto on the same kind of setup. Same horizon now = same window for
// every pair.
//
//   intraday → 24 hours (one full UTC day so overnight intraday holds resolve)
//   swing    → 7 days   (swing trades need a full week to develop)
//
// `category` is kept in the signature so existing callers don't need updating,
// but it is no longer used.
function predictionExpiresAt(_category: string, nowTs: number, horizon: 'intraday' | 'swing' = 'intraday'): Date {
  const ms = horizon === 'swing'
    ? 7 * 24 * 60 * 60 * 1000   // 7 days
    : 24 * 60 * 60 * 1000        // 24 hours
  return new Date(nowTs + ms)
}

// ── Decimal / format helpers ──────────────────────────────────────────────────
function dp(price: number) {
  if (price >= 10000) return 2
  if (price >= 100)   return 2
  if (price >= 1)     return 4
  return 5
}
function f(price: number | undefined, dec?: number) {
  if (!price || !isFinite(price)) return '0'
  return price.toFixed(dec ?? dp(price))
}
function round(n: number, dec: number) {
  const m = Math.pow(10, dec)
  return Math.round(n * m) / m
}
function pctOf(price: number, pct: number) { return price * (1 + pct / 100) }

// ── Signal weight ─────────────────────────────────────────────────────────────
function sigWeight(s: string): number {
  switch (s) {
    case 'STRONG BUY':  return  2
    case 'BUY':         return  1
    case 'NEUTRAL':     return  0
    case 'SELL':        return -1
    case 'STRONG SELL': return -2
    default:            return  0
  }
}

// ── EMA stack score for one timeframe ─────────────────────────────────────────
function emaStackScore(ema9: number, ema21: number, ema50: number, ema200: number, close: number): number {
  let s = 0
  if (ema9 > ema21 && ema21 > ema50 && ema50 > ema200) s += 2    // full bull
  else if (ema9 > ema21 && ema21 > ema50)               s += 1    // partial bull
  else if (ema9 < ema21 && ema21 < ema50 && ema50 < ema200) s -= 2 // full bear
  else if (ema9 < ema21 && ema21 < ema50)               s -= 1    // partial bear
  if (close > ema9  && close > ema21)  s += 1   // price above short EMAs
  else if (close < ema9 && close < ema21) s -= 1
  return s
}

// ── RSI score (directional bias from RSI level) ───────────────────────────────
function rsiScore(rsi: number): number {
  if (rsi <= 25) return  2   // deeply oversold → expect bounce
  if (rsi <= 35) return  1
  if (rsi <= 45) return  0.5
  if (rsi >= 75) return -2   // deeply overbought → expect pullback
  if (rsi >= 65) return -1
  if (rsi >= 55) return -0.5
  return 0
}

// ── Pivot proximity score ─────────────────────────────────────────────────────
function levelScore(price: number, kl: FMTraderRequest['keyLevels']): number {
  const { pivot, resistance1, resistance2, support1, support2 } = kl
  let s = 0
  const within = (lvl: number, pct = 0.005) => Math.abs(price - lvl) / price < pct
  if (within(support2, 0.004) || within(support1, 0.004)) s += 1.5  // at strong support
  if (within(resistance1, 0.004) || within(resistance2, 0.004)) s -= 1.5
  if (within(pivot, 0.003)) s += 0                                   // neutral at pivot
  if (price > pivot)   s += 0.5
  else                 s -= 0.5
  // Distance from nearest support/resistance
  const distToR1 = (resistance1 - price) / price
  const distToS1 = (price - support1)    / price
  if (distToR1 > 0 && distToR1 < 0.002) s -= 1  // very close to R1 → dangerous for BUY
  if (distToS1 > 0 && distToS1 < 0.002) s += 1  // very close to S1 → dangerous for SELL
  return s
}

// ── Session multiplier (hourly slots) ────────────────────────────────────────
function sessionMultiplier(slotId: string, category: string): number {
  const isCrypto = category === 'crypto'

  // Crypto: 24/7 — no dead session, but liquidity varies
  if (isCrypto) {
    // London/NY overlap (12-16 UTC) = highest crypto liquidity
    if (slotId === '12' || slotId === '13' || slotId === '14' || slotId === '15') return 1.10
    // London open / NY open = strong crypto volume
    if (slotId === '08' || slotId === '09' || slotId === '16') return 1.06
    // Asian peak (02-06 UTC) = decent crypto volume
    if (slotId === '02' || slotId === '03' || slotId === '04') return 1.02
    // Late NY / early Asia / pre-London — lighter but tradeable
    return 0.95
  }

  // Forex / commodities / indices: institutional session weights
  if (slotId === '12' || slotId === '13' || slotId === '14') return 1.12
  if (slotId === '08' && (category === 'forex' || category === 'commodity')) return 1.06
  if (slotId === '09' || slotId === '10' || slotId === '11') return 1.02
  if (slotId === '16' && (category === 'indices' || category === 'forex')) return 1.05
  if (slotId === '17') return 0.95
  if (slotId === '15' || slotId === '18' || slotId === '19') return 0.90
  if (slotId === '20' || slotId === '21') return 0.72
  return 1.0
}

// ── Day-of-week multiplier ────────────────────────────────────────────────────
function dowMultiplier(): number {
  const d = new Date().getDay()
  if (d === 1) return 0.88  // Monday — slow open, Asian hangover
  if (d === 5) return 0.82  // Friday — position squaring, reversal risk
  if (d === 0 || d === 6) return 0.60  // weekend (crypto markets open, forex closed)
  return 1.0
}

// ── Volatility context ────────────────────────────────────────────────────────
function volatilityLabel(atr: number, price: number): string {
  const atrPct = (atr / price) * 100
  if (atrPct > 2.5) return 'High'
  if (atrPct > 1.0) return 'Moderate'
  return 'Low'
}

// ── ATR estimation using multi-timeframe ranges ───────────────────────────────
// We don't have 14 candles of true range data, so we estimate ATR from the
// ranges of the timeframes we do have — weighted toward shorter TFs for entry
// precision, longer TFs for stop calibration.
function calcATR(d: FMTraderRequest) {
  const tf1H  = d.timeframes.find(t => t.key === '1h')
  const tf4H  = d.timeframes.find(t => t.key === '4h')
  const tfD   = d.timeframes.find(t => t.key === 'daily')

  // Daily range: best single-session volatility measure
  const dayRange = (d.high - d.low) > 0 ? d.high - d.low : d.price * 0.005

  // 1H range: current session micro-volatility
  const h1Range = tf1H && (tf1H.high - tf1H.low) > 0
    ? tf1H.high - tf1H.low
    : dayRange * 0.25

  // 4H range: medium-term volatility context
  const h4Range = tf4H && (tf4H.high - tf4H.low) > 0
    ? tf4H.high - tf4H.low
    : dayRange * 0.55

  // Estimated 14-period daily ATR proxy: use daily range as base,
  // but if daily signal has strong momentum (range > normal), smooth it.
  // For stop/TP sizing we use 0.6×dayRange as a conservative ATR proxy.
  const atrProxy = Math.max(h1Range * 2.5, dayRange * 0.6)

  // Entry zone width: wider for commodities/indices, tighter for forex/crypto
  // Based on category-appropriate tick size
  const entryWidthPct =
    d.category === 'commodity' ? 0.0025 :   // gold: ~$8 at $3300
    d.category === 'indices'   ? 0.0020 :   // S&P: ~10pts at 5000
    d.category === 'crypto'    ? 0.0030 :   // BTC: ~$180 at 60k
    0.0012                                   // forex: ~12 pips at 1.08

  return { dayRange, h1Range, h4Range, atrProxy, entryWidthPct }
}

// ── Effective ATR: prefer true Wilder ATR14 from market-data route ────────────
function effectiveATR(d: FMTraderRequest, atrProxy: number): number {
  const mc = d.marketContext
  return mc && mc.atr14 > 0 ? mc.atr14 : atrProxy
}

// ── Per-timeframe ATR from candle array (true range, last `period` bars) ──────
// More precise than daily ATR for 1H entry-level SL placement.
function calcTFATR(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0
  const start = candles.length - period
  let total = 0
  for (let i = start; i < candles.length; i++) {
    total += Math.max(
      candles[i].h - candles[i].l,
      Math.abs(candles[i].h - candles[i-1].c),
      Math.abs(candles[i].l - candles[i-1].c),
    )
  }
  return total / period
}

// ── Server-side EMA computation from raw candle array ────────────────────────
// Used to cross-validate client-provided EMA values. If the client and server
// EMAs diverge by > 0.5%, the client's candle data may be misaligned or the
// EMA period may differ — we log a warning and use server-computed values for
// Phase 2 decisions that rely on EMA positions.
function computeEMA(candles: Candle[], period: number): number {
  if (candles.length < period) return 0
  const k    = 2 / (period + 1)
  let   ema  = candles.slice(0, period).reduce((s, c) => s + c.c, 0) / period
  for (let i = period; i < candles.length; i++) {
    ema = candles[i].c * k + ema * (1 - k)
  }
  return ema
}

// Validate client-provided EMA9 + EMA21 against server-computed values.
// Returns a corrected TFData with server-computed EMAs when divergence exceeds 0.5%.
// Also derives a server-validated signal from the corrected EMAs and RSI.
function validateAndCorrectTF(tf: TFData): TFData {
  if (!tf.candles || tf.candles.length < 22) return tf
  const serverEMA9  = computeEMA(tf.candles, 9)
  const serverEMA21 = computeEMA(tf.candles, 21)
  if (!serverEMA9 || !serverEMA21) return tf

  const ema9Diverge  = Math.abs(serverEMA9  - tf.ema9)  / (tf.ema9  || 1)
  const ema21Diverge = Math.abs(serverEMA21 - tf.ema21) / (tf.ema21 || 1)

  // If divergence > 0.5%, use server-computed EMAs — client data is misaligned
  if (ema9Diverge > 0.005 || ema21Diverge > 0.005) {
    const corrected = { ...tf, ema9: serverEMA9, ema21: serverEMA21 }
    // Re-derive signal from corrected EMAs + client RSI
    const lastClose  = tf.candles[tf.candles.length - 1].c
    const emaStack   = emaDir(corrected as TFData)
    const stackScore = emaStack === 'UP' ? 1 : emaStack === 'DOWN' ? -1 : 0
    const rsiScore_  = tf.rsi > 55 ? 1 : tf.rsi < 45 ? -1 : 0
    const total      = stackScore + rsiScore_
    const signal     = total >= 2 ? 'STRONG BUY'
      : total === 1 ? 'BUY'
      : total === -1 ? 'SELL'
      : total <= -2 ? 'STRONG SELL'
      : 'NEUTRAL'
    console.warn(`[fm-trader] EMA divergence on ${tf.key}: client EMA9=${(tf.ema9 ?? 0).toFixed(5)} server=${serverEMA9.toFixed(5)} (${(ema9Diverge*100).toFixed(1)}%). Using server values. Signal corrected: ${tf.signal} → ${signal}`)
    return { ...corrected, signal, close: lastClose }
  }
  return tf
}

// ── Candle pattern description (for Claude prompt) ────────────────────────────
function describeCandles(
  candles: { o: number; h: number; l: number; c: number }[],
  dec: number,
): string {
  if (!candles || candles.length === 0) return 'No data'
  return candles.map((c, i) => {
    const body      = Math.abs(c.c - c.o)
    const range     = c.h - c.l || 0.0001
    const upperWick = c.h - Math.max(c.c, c.o)
    const lowerWick = Math.min(c.c, c.o) - c.l
    const dir       = c.c >= c.o ? 'Bull' : 'Bear'
    const isPinBull = lowerWick > body * 2 && lowerWick > upperWick && body < range * 0.35
    const isPinBear = upperWick > body * 2 && upperWick > lowerWick && body < range * 0.35
    const isMaru    = body > range * 0.75
    const pattern   = isPinBull ? 'Bullish Pin Bar (rejection of lows)'
      : isPinBear   ? 'Bearish Pin Bar (rejection of highs)'
      : isMaru      ? `Strong ${dir} Marubozu (momentum)`
      : `${dir} candle`
    const label = i === 0 ? 'Oldest' : i === 1 ? 'Middle' : 'Latest'
    return `[${label}] O:${c.o.toFixed(dec)} H:${c.h.toFixed(dec)} L:${c.l.toFixed(dec)} C:${c.c.toFixed(dec)} → ${pattern}`
  }).join(' | ')
}

// ── Candle pattern scoring ────────────────────────────────────────────────────
// Returns a directional score from the last 2-3 candles:
// positive = bullish pattern, negative = bearish pattern.
function candlePatternScore(candles: { o: number; h: number; l: number; c: number }[]): number {
  if (!candles || candles.length < 2) return 0
  let score = 0
  const c  = candles[candles.length - 1]  // latest candle
  const p  = candles[candles.length - 2]  // previous candle

  const body      = Math.abs(c.c - c.o)
  const range     = c.h - c.l || 0.0001
  const upperWick = c.h - Math.max(c.c, c.o)
  const lowerWick = Math.min(c.c, c.o) - c.l
  const pBody     = Math.abs(p.c - p.o)

  // Pin bars (strong single-candle reversal signal)
  if (lowerWick > body * 2 && lowerWick > upperWick && body < range * 0.35) score += 1.5  // bullish pin bar
  if (upperWick > body * 2 && upperWick > lowerWick && body < range * 0.35) score -= 1.5  // bearish pin bar

  // Engulfing patterns (two-candle reversal)
  const bullEngulf = c.c > c.o && p.c < p.o && body > pBody && c.o <= p.c && c.c >= p.o
  const bearEngulf = c.c < c.o && p.c > p.o && body > pBody && c.o >= p.c && c.c <= p.o
  if (bullEngulf) score += 2.0
  if (bearEngulf) score -= 2.0

  // Marubozu — strong momentum candle (no wicks, pure direction)
  if (c.c > c.o && body > range * 0.75) score += 1.0  // bullish marubozu
  if (c.c < c.o && body > range * 0.75) score -= 1.0  // bearish marubozu

  return score
}

// ── Volume conviction label ───────────────────────────────────────────────────
function volumeLabel(ratio: number): string {
  if (ratio >= 2.0) return 'VERY HIGH — strong institutional conviction'
  if (ratio >= 1.5) return 'Elevated — conviction behind the move'
  if (ratio >= 0.8) return 'Normal'
  if (ratio >= 0.5) return 'Below average — thin market'
  return 'Very thin — unreliable price action'
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXT GENERATORS — all use actual numbers from the data
// ─────────────────────────────────────────────────────────────────────────────

function buildThesis(
  d: FMTraderRequest,
  decision: string,
  score: number,
  bullTFs: number,
  bearTFs: number,
  dec: number,
): string {
  const tf1H    = d.timeframes.find(t => t.key === '1h')
  const tf4H    = d.timeframes.find(t => t.key === '4h')
  const tfDaily = d.timeframes.find(t => t.key === 'daily')
  const price   = d.price

  if (decision === 'NO TRADE') {
    if (bullTFs > 0 && bearTFs > 0) {
      return `${d.display} is showing conflicting signals across timeframes — ${bullTFs} bullish and ${bearTFs} bearish — which is a classic sign of indecision and an impending breakout that has yet to commit. ` +
        `Price at ${f(price, dec)} is sandwiched between Support 1 at ${f(d.keyLevels.support1, dec)} and Resistance 1 at ${f(d.keyLevels.resistance1, dec)}, with no clear directional bias. ` +
        `Waiting for a decisive close above ${f(d.keyLevels.resistance1, dec)} or below ${f(d.keyLevels.support1, dec)} before committing.`
    }
    return `While ${d.display} shows a modest ${decision === 'NO TRADE' ? (score > 0 ? 'bullish' : 'bearish') : ''} lean, the current setup lacks the multi-timeframe confluence required for an A+ entry. ` +
      `RSI on the ${tfDaily ? 'Daily' : '4H'} is at ${(tfDaily ?? tf4H)?.rsi.toFixed(1)}, and price at ${f(price, dec)} is not at a high-probability structural level. ` +
      `Patience is required — the market will offer a cleaner setup.`
  }

  const isBuy = decision === 'BUY'
  const aligned = d.timeframes.filter(t => isBuy ? (t.signal === 'BUY' || t.signal === 'STRONG BUY') : (t.signal === 'SELL' || t.signal === 'STRONG SELL')).map(t => t.label)
  const ema21_1H = tf1H?.ema21 ?? 0
  const rsiStr = tf1H ? `1H RSI at ${tf1H.rsi.toFixed(1)}` : ''

  return `${d.display} presents a ${isBuy ? 'long' : 'short'} opportunity with ${aligned.length} of 4 timeframes aligned ${isBuy ? 'bullish' : 'bearish'} (${aligned.join(', ')}), providing strong multi-timeframe confluence. ` +
    `${rsiStr ? rsiStr + (isBuy ? ` confirms momentum is not yet overextended` : ` signals momentum is fading`) + ', and ' : ''}` +
    `price at ${f(price, dec)} is ${isBuy ? 'holding above' : 'trading below'} the EMA21 at ${f(ema21_1H, dec)} on the 1H chart${isBuy ? ', a bullish structural sign' : ', indicating sellers in control'}. ` +
    `The ${isBuy ? `${f(d.keyLevels.support1, dec)} support level` : `${f(d.keyLevels.resistance1, dec)} resistance level`} provides a clear invalidation reference for this trade.`
}

function buildBreakdown(
  d: FMTraderRequest,
  decision: string,
  score: number,
  dec: number,
  slotMeta: { id: string; name: string; label: string },
  atr: ReturnType<typeof calcATR>,
): string {
  const tfW     = d.timeframes.find(t => t.key === 'weekly')
  const tfD     = d.timeframes.find(t => t.key === 'daily')
  const tf4H    = d.timeframes.find(t => t.key === '4h')
  const tf1H    = d.timeframes.find(t => t.key === '1h')
  const isBuy   = decision === 'BUY'
  const price   = d.price
  const kl      = d.keyLevels

  const p1 = `MARKET STRUCTURE: ${d.display} is currently trading at ${f(price, dec)}, having moved ${d.changePct >= 0 ? '+' : ''}${d.changePct.toFixed(2)}% on the day with a day range of ${f(d.low, dec)}–${f(d.high, dec)} (${f(atr.dayRange, dec)} range). ` +
    `The weekly timeframe signal is ${tfW?.signal ?? 'N/A'} (RSI ${tfW?.rsi.toFixed(1) ?? '—'}), establishing the dominant structural bias. ` +
    `Daily signal is ${tfD?.signal ?? 'N/A'} (RSI ${tfD?.rsi.toFixed(1) ?? '—'}). ` +
    (decision === 'NO TRADE'
      ? `The lack of alignment across major timeframes indicates the market is in a distribution or accumulation phase — no clear directional edge.`
      : `Both higher timeframes ${isBuy ? 'support the bullish case' : 'confirm the bearish narrative'}, giving this trade the backing of institutional-level trend direction.`)

  const p2 = `EMA ALIGNMENT: On the 4H chart, the EMA structure reads EMA9 at ${f(tf4H?.ema9, dec)}, EMA21 at ${f(tf4H?.ema21, dec)}, EMA50 at ${f(tf4H?.ema50, dec)}, and EMA200 at ${f(tf4H?.ema200, dec)}. ` +
    (tf4H && tf4H.ema9 > tf4H.ema21 && tf4H.ema21 > tf4H.ema50
      ? `The bullish EMA stack (9 > 21 > 50) confirms that medium-term momentum is firmly upward. Price at ${f(tf4H.close, dec)} trading ${tf4H.close > tf4H.ema21 ? 'above' : 'below'} EMA21 is ${tf4H.close > tf4H.ema21 ? 'a bullish continuation sign' : 'a warning — bulls need reclaim'}.`
      : tf4H && tf4H.ema9 < tf4H.ema21 && tf4H.ema21 < tf4H.ema50
      ? `The bearish EMA stack (9 < 21 < 50) confirms sellers are in structural control on the 4H. Any rallies toward EMA21 at ${f(tf4H.ema21, dec)} are sell opportunities.`
      : `EMAs are mixed on the 4H, confirming the broader indecision — wait for the stack to realign before sizing in.`) +
    ` On the 1H, EMA9 is at ${f(tf1H?.ema9, dec)} and EMA21 at ${f(tf1H?.ema21, dec)}, with price ${price > (tf1H?.ema21 ?? price) ? 'above' : 'below'} the key 1H EMA21.`

  const p3 = `RSI CONFLUENCE: ` +
    `Weekly RSI: ${tfW?.rsi.toFixed(1) ?? '—'} — ${(tfW?.rsi ?? 50) > 70 ? 'overbought, caution on longs' : (tfW?.rsi ?? 50) < 30 ? 'oversold, caution on shorts' : 'in neutral-to-trending range'}. ` +
    `Daily RSI: ${tfD?.rsi.toFixed(1) ?? '—'} — ${(tfD?.rsi ?? 50) > 60 ? 'bullish momentum present' : (tfD?.rsi ?? 50) < 40 ? 'bearish momentum present' : 'balanced'}. ` +
    `4H RSI: ${tf4H?.rsi.toFixed(1) ?? '—'} — ${(tf4H?.rsi ?? 50) > 65 ? 'approaching overbought, take partial profits early' : (tf4H?.rsi ?? 50) < 35 ? 'approaching oversold, potential bounce zone' : 'room to run'}. ` +
    `1H RSI: ${tf1H?.rsi.toFixed(1) ?? '—'} — ${(tf1H?.rsi ?? 50) > 70 ? 'overbought on entry TF, wait for reset to 50–60 before entering' : (tf1H?.rsi ?? 50) < 30 ? 'oversold on entry TF, ideal for BUY entries' : 'neutral, supports current momentum direction'}. ` +
    (isBuy && (tf4H?.rsi ?? 50) < 60 && (tf1H?.rsi ?? 50) < 65
      ? `RSI has room to run on both the 4H and 1H — not overextended, which improves the probability of reaching TP1 and TP2.`
      : !isBuy && (tf4H?.rsi ?? 50) > 40 && (tf1H?.rsi ?? 50) > 35
      ? `RSI on the 4H and 1H has room to fall further — confirms sellers have capacity to push lower before reaching oversold extremes.`
      : `RSI readings are mixed — manage size accordingly and take TP1 quickly.`)

  const p4 = `KEY LEVEL ANALYSIS: Pivot Point sits at ${f(kl.pivot, dec)}. Price is currently ${price > kl.pivot ? 'above' : 'below'} the pivot, which is a ${price > kl.pivot ? 'bullish' : 'bearish'} structural signal. ` +
    `Resistance 1 at ${f(kl.resistance1, dec)} (${(((kl.resistance1 - price) / price) * 100).toFixed(2)}% away) is the first barrier for bulls. ` +
    `Resistance 2 at ${f(kl.resistance2, dec)} is the major target zone. ` +
    `Support 1 at ${f(kl.support1, dec)} (${(((price - kl.support1) / price) * 100).toFixed(2)}% below current price) is the first defensive level — a close below here on the 1H would invalidate the bullish thesis. ` +
    `Support 2 at ${f(kl.support2, dec)} is the structural floor where institutions are likely to step in.` +
    (decision !== 'NO TRADE'
      ? ` Stop loss is placed ${isBuy ? 'below' : 'above'} the ${isBuy ? `S1 (${f(kl.support1, dec)})` : `R1 (${f(kl.resistance1, dec)})`} to avoid being stopped out by normal volatility while keeping risk defined.`
      : '')

  const sid = slotMeta.id
  const peakHour   = sid === '12' || sid === '13' || sid === '14'
  const londonOpen = sid === '08' || sid === '09' || sid === '10'
  const nySession  = sid === '16' || sid === '17' || sid === '18'
  const thinHour   = sid === '19' || sid === '20' || sid === '21'

  const p5 = `SESSION & LIQUIDITY: The ${slotMeta.name} hour (${slotMeta.label}) is the context for this trade. ` +
    (d.category === 'forex'
      ? `For forex pairs like ${d.display}, this hour offers ${peakHour ? 'peak liquidity with the tightest spreads of the day — ideal for precision entries' : londonOpen ? 'strong London open liquidity — breakout and momentum strategies work well' : nySession ? 'USD-dominated NY flows — watch for London close reversal at 17:00 GMT' : thinHour ? 'reduced liquidity and wider spreads — only take this trade if the setup is exceptional' : 'moderate liquidity with orderly price action'}.`
      : d.category === 'crypto'
      ? `Crypto markets trade 24/7 but volume is ${peakHour || nySession ? 'elevated during US session hours, supporting this setup' : 'thinner at this hour — expect wider percentage swings and potential for fake-outs'}.`
      : d.category === 'commodity'
      ? `${d.display} volume is ${peakHour ? 'at its peak during the NY/London overlap — ideal for commodity trades' : londonOpen ? 'building through the London morning — solid for directional plays' : 'tapering — use wider stops to accommodate thin-market volatility'}.`
      : `Indices trading in the ${slotMeta.name} hour ${londonOpen ? 'benefits from European equity flows' : peakHour ? 'sees peak volume with US futures fully active' : thinHour ? 'are thinning out — watch for mechanical moves near close' : 'are in transition — monitor for volume confirmation'}.`) +
    ` Day range volatility is ${volatilityLabel(atr.dayRange, d.price)} at ${f(atr.dayRange, dec)} (${((atr.dayRange / d.price) * 100).toFixed(2)}% of price).`

  const p6 = `ENTRY PRECISION & TRADE MANAGEMENT: ` +
    (decision === 'NO TRADE'
      ? `With no high-probability setup present, the correct action is to stand aside. Mark the key levels on your chart: watch for a clear break and close above ${f(kl.resistance1, dec)} for a long setup, or a decisive close below ${f(kl.support1, dec)} for a short. Do not chase — wait for the market to show its hand.`
      : `${isBuy ? 'Enter long' : 'Enter short'} in the entry zone around ${f(d.price, dec)}. ` +
        `Once price reaches TP1, move stop to break-even to ensure a risk-free trade. ` +
        `Take 40% off at TP1, 35% at TP2, and let the final 25% run to TP3 with a trailing stop. ` +
        `If price stalls at the ${isBuy ? 'resistance' : 'support'} zone before TP1 — especially if a bearish/bullish reversal candle forms on the 1H — consider closing 50% early. ` +
        `Maximum risk on this trade should not exceed 1–2% of total account capital.`)

  return [p1, p2, p3, p4, p5, p6].join('\n\n')
}

function buildRiskFactors(
  d: FMTraderRequest,
  decision: string,
  dec: number,
  slotId: string,
): string[] {
  const risks: string[] = []
  const kl    = d.keyLevels
  const tf1H  = d.timeframes.find(t => t.key === '1h')
  const tfD   = d.timeframes.find(t => t.key === 'daily')
  const isBuy = decision === 'BUY'

  // Risk 1: opposing major TF
  const opposing = d.timeframes.filter(t =>
    isBuy ? (t.signal === 'SELL' || t.signal === 'STRONG SELL') : (t.signal === 'BUY' || t.signal === 'STRONG BUY')
  )
  if (opposing.length > 0) {
    risks.push(`${opposing.map(t => t.label).join(' and ')} ${opposing.length > 1 ? 'are' : 'is'} ${isBuy ? 'bearish' : 'bullish'} — counter-trend TF pressure could cap gains and requires close monitoring.`)
  }

  // Risk 2: RSI extremes
  if (isBuy && (tfD?.rsi ?? 50) > 65) {
    risks.push(`Daily RSI at ${tfD?.rsi.toFixed(1)} is approaching overbought territory — upside may be limited and a pullback to reset RSI below 60 could materialise before continuation.`)
  } else if (!isBuy && (tfD?.rsi ?? 50) < 35) {
    risks.push(`Daily RSI at ${tfD?.rsi.toFixed(1)} is approaching oversold — a technical bounce is increasingly probable, which could invalidate the short prematurely.`)
  } else {
    risks.push(`RSI divergence risk: if price makes a new ${isBuy ? 'high' : 'low'} while RSI fails to follow, this signals weakening momentum and is an early exit signal.`)
  }

  // Risk 3: nearby key level
  if (isBuy) {
    risks.push(`Resistance 1 at ${f(kl.resistance1, dec)} is only ${(((kl.resistance1 - d.price) / d.price) * 100).toFixed(2)}% away — price may stall or reverse here, and TP1 should account for this level. Watch for rejection candles on the 1H.`)
  } else {
    risks.push(`Support 1 at ${f(kl.support1, dec)} is only ${(((d.price - kl.support1) / d.price) * 100).toFixed(2)}% below — buyers may defend this level strongly and cause a sharp short-covering bounce.`)
  }

  // Risk 4: session / liquidity
  if (slotId === '20' || slotId === '21') {
    risks.push(`End-of-day liquidity is significantly reduced this hour — erratic price spikes, wider spreads, and elevated slippage risk on both entry and stop execution are common.`)
  } else if (slotId === '08') {
    risks.push(`The London open (first 15–30 min) frequently produces false breakouts as algorithms test both sides before committing. Avoid entering in the very first candle — wait for a confirmed directional close.`)
  } else if (slotId === '15' || slotId === '17') {
    risks.push(`This is a London Close transition hour — sharp counter-trend moves are common as European institutions square positions. Reduce position size or wait for the dust to settle before entering.`)
  } else {
    risks.push(`Unexpected macro news releases (central bank statements, economic data) can instantly invalidate technical setups. Always check the economic calendar before entering.`)
  }

  // Risk 5: general / stop hunt
  risks.push(`Stop-hunt risk: institutional traders are aware of clustered retail stops ${isBuy ? `below ${f(kl.support1, dec)}` : `above ${f(kl.resistance1, dec)}`}. A brief spike through this level before reversal is a common pattern — consider placing your stop 2–3 pips/ticks beyond the obvious level to avoid being swept.`)

  return risks.slice(0, 5)
}

function buildSessionContext(d: FMTraderRequest, slotMeta: { id: string; name: string; label: string }, dec: number): string {
  const id = slotMeta.id
  // ── Crypto-only slots (00–07, 22–23) ─────────────────────────────────────
  if (id === '00') return `The 00:00–01:00 UTC hour is the late NY to early Asia transition. ${d.display} crypto trading continues but volume is at its daily low — spreads can widen. This is typically a consolidation or slow drift hour. Avoid over-leveraging and wait for clear price structure before entering.`
  if (id === '01') return `The 01:00–02:00 UTC early Asia hour sees Asian-Pacific crypto traders beginning to engage. ${d.display} volume is low but building. Price often respects key levels closely in this window — clean breakouts of Asian session highs/lows carry through to the Tokyo open.`
  if (id === '02') return `The 02:00–03:00 UTC Asia session is active for ${d.display}. Asian crypto markets (South Korea, Japan, Singapore) are at full activity. Momentum here often sets the tone for the Asian session — watch for trend continuation from the prior NY move.`
  if (id === '03') return `The 03:00–04:00 UTC Asian peak hour sees the highest crypto volume of the Asian session. ${d.display} can make significant moves driven by Asian exchange activity. Institutional Korean and Japanese crypto flows are at their most active — respect the directional signal here.`
  if (id === '04') return `The 04:00–05:00 UTC hour is mid-Asian session. ${d.display} volume is solid with continued Asian market participation. Look for clean structure setups — erratic spikes are less common here than at session opens/closes.`
  if (id === '05') return `The 05:00–06:00 UTC hour sees Asian markets beginning to wind down ahead of European pre-market. ${d.display} volume dips slightly. This is the transition window — Asian trends start to lose momentum and early European positioning can cause short counter-moves.`
  if (id === '06') return `The 06:00–07:00 UTC early European hour sees the first European crypto traders and institutions coming online. ${d.display} can see renewed directional momentum as European sentiment meets Asian price levels. Watch for breakouts from the Asian session range.`
  if (id === '07') return `The 07:00–08:00 UTC pre-London hour is a key positioning window. European institutions prepare for the London open and smart money builds positions for the high-volume session ahead. ${d.display} often forms its last crypto structure before London adds significant volume.`
  if (id === '22') return `The 22:00–23:00 UTC late NY hour is the tail of the US session for crypto. ${d.display} sees reduced US retail participation but Asian crypto markets are beginning to stir. Volume is light — this is an exit and management hour, not an aggressive entry hour.`
  if (id === '23') return `The 23:00–00:00 UTC pre-midnight hour is where late US and early Asia overlap for crypto. ${d.display} is in a low-volume transitional window. Asian session positioning begins to build and this hour often sets the overnight range from which the Asian session breaks. Conservative entries only.`
  // ── Standard forex/institutional slots ────────────────────────────────────
  if (id === '08') return `The London Open (08:00–09:00) is one of the highest-impact hours of the day. European institutions flood the market, breaking out of the tight Asian range. For ${d.display}, expect sharp directional moves in the first 15–30 minutes — but watch for the 'fake breakout' pattern where price spikes one direction before reversing. Once the direction is confirmed with a candle close, momentum entries work well.`
  if (id === '09') return `The London Morning hour (09:00–10:00) is where the open breakout either confirms or reverses. Volume remains elevated and institutional orders are still being filled. For ${d.display}, this is a good hour for trend continuation setups — if the 08:00 move held, this hour tends to extend it with reduced volatility.`
  if (id === '10') return `The 10:00–11:00 hour is London mid-morning — markets have settled from the open and price is establishing its intraday range. This is a patient trader's hour: look for clean retests of the breakout level or EMA support/resistance for high-probability continuation entries.`
  if (id === '11') return `The 11:00–12:00 hour is the pre-overlap window — professional traders begin positioning ahead of the New York open. ${d.display} often forms its last significant intraday structure before the overlap. Watch for accumulation patterns near key levels as smart money positions for the high-volume session ahead.`
  if (id === '12') return `The London/NY Overlap opens (12:00–13:00) — this is the most critical transition of the trading day. US institutions enter just as European volume is at its peak. ${d.display} sees its tightest spreads and most reliable price action here. Breakouts with volume in this hour have the highest follow-through probability.`
  if (id === '13') return `The 13:00–14:00 hour is peak overlap volume — both London and New York desks are fully active. ${d.display} sees the largest order flow and most sustained directional moves of the entire day. Trend trades entered here have the best statistical probability of reaching TP2 and TP3 when the setup is clean.`
  if (id === '14') return `The 14:00–15:00 overlap peak is when major US economic data often drops (e.g. 14:30 GMT for US releases). This hour can extend morning trends or create sharp reversals on data surprises. For ${d.display}, ensure you are aware of any scheduled news releases — they can invalidate technical setups instantly.`
  if (id === '15') return `The 15:00–16:00 London Close hour sees European institutions squaring positions. This frequently causes counter-trend moves against the dominant intraday direction. For ${d.display}, this is a challenging hour — price can whipsaw as London exits and NY reasserts. Tight stops or reduced position size is advisable.`
  if (id === '16') return `The NY Afternoon opens (16:00–17:00) with USD-dominated flows. Post-London, American equities, indices, and commodity-linked currencies dominate. For ${d.display}, this hour often establishes the afternoon trend. If the morning direction reasserts here, it typically runs into the NY close with good momentum.`
  if (id === '17') return `The 17:00–18:00 hour is the London Close Reversal zone — one of the most reliable intraday patterns. As London fully exits, price often makes a sharp counter-move before finding its true afternoon direction. For ${d.display}, be cautious of the first 15 minutes of this hour and wait for confirmation before entering new positions.`
  if (id === '18') return `The 18:00–19:00 NY Late Session hour sees momentum fading as volume decreases. ${d.display} may consolidate or range-trade. This is a poor hour for fresh directional entries — focus on managing open trades, taking partial profits, and tightening stops rather than initiating new positions.`
  if (id === '19') return `The 19:00–20:00 pre-close hour sees active position squaring ahead of end-of-day. ${d.category === 'crypto' ? 'Crypto remains active' : 'Forex and equity-linked pairs see reduced volume'} and price action can be erratic as stops are triggered. Best strategy: close intraday trades before this window and avoid new entries.`
  if (id === '20') return `The 20:00–21:00 end-of-day session has very thin liquidity for most markets. ${d.category === 'crypto' ? `${d.display} (crypto) is an exception — it trades 24/7 and this hour can see significant moves driven by Asian-Pacific early activity.` : `For ${d.display}, spreads widen significantly, price action is erratic, and the risk of artificial stop-hunt spikes is elevated. Only the most exceptional structural setup justifies a new entry.`}`
  return `The 21:00–22:00 Market Close hour is the transition to the Asian session. ${d.category === 'crypto' ? `${d.display} remains active as Pacific crypto markets begin to build volume.` : `Most institutional desks for ${d.display} are closed or operating skeleton crews. This hour is characterised by illiquid conditions — avoid new positions and use this time to review the analysis for tomorrow's London open.`}`
}

function buildMarketBias(d: FMTraderRequest, score: number, dec: number): string {
  const tfW   = d.timeframes.find(t => t.key === 'weekly')
  const tfD   = d.timeframes.find(t => t.key === 'daily')
  const isStructBull = (tfW?.signal === 'BUY' || tfW?.signal === 'STRONG BUY') && (tfD?.signal === 'BUY' || tfD?.signal === 'STRONG BUY')
  const isStructBear = (tfW?.signal === 'SELL' || tfW?.signal === 'STRONG SELL') && (tfD?.signal === 'SELL' || tfD?.signal === 'STRONG SELL')

  const trend = isStructBull
    ? `The dominant structural trend for ${d.display} is BULLISH — the Weekly (${tfW?.signal}) and Daily (${tfD?.signal}) timeframes both confirm upward bias. Longs are with-trend and carry higher probability; shorts are counter-trend and require exceptional confluence.`
    : isStructBear
    ? `The dominant structural trend for ${d.display} is BEARISH — Weekly (${tfW?.signal}) and Daily (${tfD?.signal}) both confirm downward pressure. Short positions are with-trend; any long should be treated as a counter-trend scalp with tighter management.`
    : `${d.display} is in a period of CONSOLIDATION or trend transition — Weekly signal is ${tfW?.signal ?? 'N/A'} and Daily is ${tfD?.signal ?? 'N/A'}. Neither bulls nor bears have established structural dominance, which is why confluence on the lower timeframes is essential before committing.`

  const context = d.changePct > 1.5
    ? ` Today's ${d.changePct.toFixed(2)}% intraday gain reflects strong momentum; avoid fading this move without clear reversal signals.`
    : d.changePct < -1.5
    ? ` The ${Math.abs(d.changePct).toFixed(2)}% intraday drop shows active distribution; avoid catching the falling knife unless at a strong support level.`
    : ` Today's ${d.changePct >= 0 ? '+' : ''}${d.changePct.toFixed(2)}% move is moderate — price is digesting, which often precedes a directional break.`

  return trend + context
}

function buildTraderNote(
  d: FMTraderRequest,
  decision: string,
  confidence: number,
  dec: number,
): string {
  if (decision === 'NO TRADE') {
    return confidence > 55
      ? `I'm watching ${d.display} closely but I won't pull the trigger here — the signals are too mixed and I've learned the hard way that forcing trades in choppy conditions is where most losses come from. I'll have my levels marked and I'm ready to act the moment the market shows its hand.`
      : `${d.display} is not giving me anything to work with right now. No trade is a position too, and patience is the most underrated skill in trading. I'll revisit this in the next session window.`
  }

  const isBuy = decision === 'BUY'
  const sizeNote = confidence >= 80
    ? `I'm taking this at full position size (1.5–2% risk)`
    : confidence >= 70
    ? `I'm sizing this at half risk (0.75–1%) given the moderate confluence`
    : `This is a quarter-size setup (0.25–0.5% risk) — enough to participate if it works, but not enough to hurt if it doesn't`

  return `${sizeNote}. ${isBuy ? 'Long' : 'Short'} ${d.display} at ${f(d.price, dec)} with the stop tucked behind structure. ` +
    (confidence >= 80
      ? `The multi-timeframe alignment is clean and I'm confident in this one — I'll let the trade breathe and target all three TPs.`
      : `I'll be quick to take TP1 and move the stop to break-even because the setup isn't perfect — protecting capital comes first.`)
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAUDE AI NARRATIVE ENGINE
// Claude does NOT make the trading decision — the deterministic rule engine
// (runAnalysis) always makes the BUY/SELL/NO TRADE call. Claude's only job is
// to write a clear, educational explanation of WHY the rule engine decided what
// it did, and what the key risks are.
//
// This separation matters because:
//   1. The rule engine is deterministic, testable, and consistent
//   2. Claude's output is auditable — it explains a decision, not makes one
//   3. When Claude fails, the rule engine output still stands unchanged
// ─────────────────────────────────────────────────────────────────────────────

interface ClaudeNarrative {
  thesis:     string
  marketBias: string
  entryLow:   number
  entryHigh:  number
  stopLoss:   number
  tp1:        number
  tp2:        number
  tp3:        number
}

// Describe EMA alignment in plain English so Claude reasons from structure, not labels
function emaContext(ema9: number, ema21: number, ema50: number, ema200: number, close: number, dec: number): string {
  const f = (n: number) => n.toFixed(dec)
  const aboveBelow = (price: number, ema: number) => price > ema ? 'above' : 'below'
  const stack = ema9 > ema21 && ema21 > ema50 && ema50 > ema200
    ? 'FULLY BULLISH (9>21>50>200)'
    : ema9 < ema21 && ema21 < ema50 && ema50 < ema200
    ? 'FULLY BEARISH (9<21<50<200)'
    : ema9 > ema21 && ema21 > ema50
    ? 'SHORT-TERM BULLISH (9>21>50, but price vs EMA200 matters)'
    : ema9 < ema21 && ema21 < ema50
    ? 'SHORT-TERM BEARISH (9<21<50)'
    : 'MIXED/TRANSITIONING'
  return `EMA stack: ${stack}. Price ${f(close)} is ${aboveBelow(close, ema9)} EMA9(${f(ema9)}), ${aboveBelow(close, ema21)} EMA21(${f(ema21)}), ${aboveBelow(close, ema50)} EMA50(${f(ema50)}), ${aboveBelow(close, ema200)} EMA200(${f(ema200)})`
}

// Describe RSI reading with trading implication
function rsiContext(rsi: number): string {
  if (rsi >= 75) return `${rsi.toFixed(1)} — OVERBOUGHT, exhaustion risk, avoid new longs`
  if (rsi >= 65) return `${rsi.toFixed(1)} — Bullish momentum, room to run but watch for divergence`
  if (rsi >= 55) return `${rsi.toFixed(1)} — Mild bullish bias`
  if (rsi >= 45) return `${rsi.toFixed(1)} — Neutral zone, no strong directional edge`
  if (rsi >= 35) return `${rsi.toFixed(1)} — Mild bearish bias`
  if (rsi >= 25) return `${rsi.toFixed(1)} — Bearish momentum, room to fall further`
  return `${rsi.toFixed(1)} — OVERSOLD, bounce risk, avoid new shorts`
}

// Distance to a level as percentage and readable direction
function distPct(price: number, level: number): string {
  const pct = ((level - price) / price * 100)
  return pct >= 0 ? `+${pct.toFixed(2)}% above` : `${pct.toFixed(2)}% below`
}

async function getClaudeNarrative(
  d:        FMTraderRequest,
  decision: 'BUY' | 'SELL' | 'NO TRADE',
  conf:     number,
  meta?:    FMTraderResponse['institutionalMeta'],
): Promise<ClaudeNarrative | null> {
  // Admin kill-switch — when off, the rule engine still produces decision/SL/TP
  // but the narrative & marketBias prose stay empty. Saves the largest single
  // CPU+token cost per FM Trader call.
  const { getPerfFlags } = await import('@/lib/perf-flags')
  const flags = await getPerfFlags()
  if (!flags.claudeNarrative) return null

  const dec      = dp(d.price)
  const f        = (n: number) => n.toFixed(dec)
  const kl       = d.keyLevels
  const mc       = d.marketContext
  const isBuy    = decision === 'BUY'
  const slotMeta = findSlot(d.sessionSlot)

  const tfW  = d.timeframes.find(t => t.key === 'weekly')
  const tfD  = d.timeframes.find(t => t.key === 'daily')
  const tf4H = d.timeframes.find(t => t.key === '4h')
  const tf1H = d.timeframes.find(t => t.key === '1h')

  const dayRangePct = d.high !== d.low
    ? Math.round(((d.price - d.low) / (d.high - d.low)) * 100)
    : 50

  const pC1H = mc?.prevClosed1H
  const closed1HDesc = pC1H && pC1H.c > 0
    ? (() => {
        const body      = Math.abs(pC1H.c - pC1H.o)
        const range     = pC1H.h - pC1H.l || 0.0001
        const upperWick = pC1H.h - Math.max(pC1H.c, pC1H.o)
        const lowerWick = Math.min(pC1H.c, pC1H.o) - pC1H.l
        const dir       = pC1H.c >= pC1H.o ? 'BULLISH' : 'BEARISH'
        const bodyPct   = (body / range * 100).toFixed(0)
        const isPinBull = lowerWick > body * 2 && lowerWick > upperWick && body < range * 0.35
        const isPinBear = upperWick > body * 2 && upperWick > lowerWick && body < range * 0.35
        const isMaru    = body > range * 0.75
        const pattern   = isPinBull ? 'Bullish Pin Bar'
          : isPinBear ? 'Bearish Pin Bar'
          : isMaru    ? `${dir} Marubozu`
          : `${dir} candle (body ${bodyPct}% of range)`
        return `O:${pC1H.o.toFixed(dec)} H:${pC1H.h.toFixed(dec)} L:${pC1H.l.toFixed(dec)} C:${pC1H.c.toFixed(dec)} | ${pattern}`
      })()
    : 'Not available'

  const learningCtx = d.learningContext ?? ''

  // ── Entry zone (deterministic) ─────────────────────────────────────────────
  const ewp       = d.category === 'crypto' ? 0.003 : d.category === 'indices' ? 0.002 : 0.0012
  const entryHigh = round(isBuy ? d.price * (1 + ewp * 0.4) : d.price * (1 + ewp),       dec)
  const entryLow  = round(isBuy ? d.price * (1 - ewp)       : d.price * (1 - ewp * 0.4), dec)

  // ── ATR buffer ─────────────────────────────────────────────────────────────
  const atr14  = mc?.atr14 ?? 0
  const atrBuf = atr14 > 0 ? atr14 * 0.15 : d.price * 0.001

  // ── Structural candidate lists ─────────────────────────────────────────────
  const recent1H  = tf1H?.candles?.slice(-6) ?? []
  const r1HLows   = recent1H.map(c => c.l).filter(l => l > 0).sort((a, b) => b - a)
  const r1HHighs  = recent1H.map(c => c.h).filter(h => h > 0).sort((a, b) => a - b)

  type Lvl = { label: string; price: number }

  const slCandidates: Lvl[] = (isBuy ? [
    (pC1H?.l ?? 0) > 0 && (pC1H?.l ?? 0) < d.price              ? { label: 'Signal candle low',   price: pC1H!.l }              : null,
    (tf1H?.ema21 ?? 0) > 0 && (tf1H?.ema21 ?? 0) < d.price      ? { label: '1H EMA21',            price: tf1H!.ema21 }          : null,
    (tf1H?.ema50 ?? 0) > 0 && (tf1H?.ema50 ?? 0) < d.price      ? { label: '1H EMA50',            price: tf1H!.ema50 }          : null,
    kl.support1 > 0 && kl.support1 < d.price                     ? { label: 'S1 pivot',            price: kl.support1 }         : null,
    (mc?.prevDayLow ?? 0) > 0 && (mc?.prevDayLow ?? 0) < d.price ? { label: 'Previous Day Low',    price: mc!.prevDayLow! }      : null,
    (mc?.swingLow ?? 0) > 0 && (mc?.swingLow ?? 0) < d.price     ? { label: 'Swing Low',           price: mc!.swingLow! }        : null,
    r1HLows.find(l => l < d.price * 0.9985) !== undefined         ? { label: 'Recent 1H swing low', price: r1HLows.find(l => l < d.price * 0.9985)! } : null,
  ] : [
    (pC1H?.h ?? 0) > 0 && (pC1H?.h ?? 0) > d.price              ? { label: 'Signal candle high',  price: pC1H!.h }              : null,
    (tf1H?.ema21 ?? 0) > 0 && (tf1H?.ema21 ?? 0) > d.price      ? { label: '1H EMA21',            price: tf1H!.ema21 }          : null,
    (tf1H?.ema50 ?? 0) > 0 && (tf1H?.ema50 ?? 0) > d.price      ? { label: '1H EMA50',            price: tf1H!.ema50 }          : null,
    kl.resistance1 > 0 && kl.resistance1 > d.price               ? { label: 'R1 pivot',            price: kl.resistance1 }      : null,
    (mc?.prevDayHigh ?? 0) > 0 && (mc?.prevDayHigh ?? 0) > d.price ? { label: 'Previous Day High', price: mc!.prevDayHigh! }    : null,
    (mc?.swingHigh ?? 0) > 0 && (mc?.swingHigh ?? 0) > d.price   ? { label: 'Swing High',          price: mc!.swingHigh! }       : null,
    r1HHighs.find(h => h > d.price * 1.0015) !== undefined        ? { label: 'Recent 1H swing high',price: r1HHighs.find(h => h > d.price * 1.0015)! } : null,
  ]).filter((x): x is Lvl => x !== null)
    .sort(isBuy ? (a, b) => b.price - a.price : (a, b) => a.price - b.price)

  const tpCandidates: Lvl[] = (isBuy ? [
    kl.resistance1 > d.price                                       ? { label: 'R1 pivot',          price: kl.resistance1 }  : null,
    kl.resistance2 > d.price                                       ? { label: 'R2 pivot',          price: kl.resistance2 }  : null,
    (mc?.prevDayHigh ?? 0) > 0 && (mc?.prevDayHigh ?? 0) > d.price ? { label: 'Previous Day High', price: mc!.prevDayHigh! } : null,
    (mc?.swingHigh ?? 0) > 0 && (mc?.swingHigh ?? 0) > d.price     ? { label: 'Swing High',        price: mc!.swingHigh! }   : null,
    r1HHighs.find(h => h > d.price) !== undefined                   ? { label: 'Recent 1H high',    price: r1HHighs.find(h => h > d.price)! } : null,
    tf4H?.high !== undefined && tf4H.high > d.price                 ? { label: '4H session high',   price: tf4H.high }       : null,
    d.high > d.price                                               ? { label: 'Day high',          price: d.high }          : null,
  ] : [
    kl.support1 > 0 && kl.support1 < d.price                      ? { label: 'S1 pivot',          price: kl.support1 }     : null,
    kl.support2 > 0 && kl.support2 < d.price                      ? { label: 'S2 pivot',          price: kl.support2 }     : null,
    (mc?.prevDayLow ?? 0) > 0 && (mc?.prevDayLow ?? 0) < d.price  ? { label: 'Previous Day Low',  price: mc!.prevDayLow! } : null,
    (mc?.swingLow ?? 0) > 0 && (mc?.swingLow ?? 0) < d.price      ? { label: 'Swing Low',         price: mc!.swingLow! }   : null,
    r1HLows.find(l => l > 0 && l < d.price) !== undefined          ? { label: 'Recent 1H low',     price: r1HLows.find(l => l > 0 && l < d.price)! } : null,
    tf4H?.low !== undefined && tf4H.low > 0 && tf4H.low < d.price  ? { label: '4H session low',    price: tf4H.low }        : null,
    d.low > 0 && d.low < d.price                                   ? { label: 'Day low',           price: d.low }           : null,
  ]).filter((x): x is Lvl => x !== null)
    .sort(isBuy ? (a, b) => a.price - b.price : (a, b) => b.price - a.price)

  // ── Label resolver ─────────────────────────────────────────────────────────
  function resolveLabel(choice: string, list: Lvl[], fallback: number): number {
    if (!choice || choice === 'auto') return fallback
    const exact = list.find(c => c.label === choice)
    if (exact) return exact.price
    const fuzzy = list.find(c =>
      c.label.toLowerCase().includes(choice.toLowerCase()) ||
      choice.toLowerCase().includes(c.label.toLowerCase())
    )
    return fuzzy?.price ?? fallback
  }

  const fmtList = (list: Lvl[]) =>
    list.slice(0, 6).map(l => `  "${l.label}": ${f(l.price)}`).join('\n') || '  (none available — use "auto")'

  const systemPrompt = `You are a professional trading analyst. A deterministic signal engine has already made the BUY/SELL/NO TRADE decision — do NOT change it.

Your two jobs:
1. Write clear prose explaining WHY the indicators produced this decision.
2. For BUY/SELL: select the best stop loss and take profit levels by choosing from the named candidate lists. Return the exact label strings only — do NOT invent or calculate any prices yourself.

SELECTION RULES:
- SL: nearest candidate on the correct side of entry with the strongest structural protection (EMA + pivot confluence beats a lone candle extreme).
- TP1: nearest meaningful target; prefer levels with confluence over isolated ones.
- TP2/TP3: progressively further; prefer zones where multiple levels cluster.
- If no suitable candidate exists, return "auto" and the system will calculate it.
- Be honest about trade weaknesses. Respond ONLY with the JSON — no markdown, no extra text.`

  const userPrompt = `DECISION for ${d.display}: ${decision} (confidence: ${conf}/100)

SIGNAL CANDLE (last closed 1H): ${closed1HDesc}

TIMEFRAME SIGNALS:
Weekly: ${tfW?.signal ?? 'N/A'} | RSI ${tfW?.rsi.toFixed(1) ?? '--'}
Daily:  ${tfD?.signal ?? 'N/A'} | RSI ${tfD?.rsi.toFixed(1) ?? '--'} | ${tfD ? emaContext(tfD.ema9, tfD.ema21, tfD.ema50, tfD.ema200, tfD.close, dec) : ''}
4H:     ${tf4H?.signal ?? 'N/A'} | RSI ${tf4H?.rsi.toFixed(1) ?? '--'} | ${tf4H ? emaContext(tf4H.ema9, tf4H.ema21, tf4H.ema50, tf4H.ema200, tf4H.close, dec) : ''}
1H:     ${tf1H?.signal ?? 'N/A'} | RSI ${tf1H?.rsi.toFixed(1) ?? '--'} | ${tf1H ? emaContext(tf1H.ema9, tf1H.ema21, tf1H.ema50, tf1H.ema200, tf1H.close, dec) : ''}

PRICE DATA:
Current: ${f(d.price)} | Range: ${f(d.low)}–${f(d.high)} (${dayRangePct}% up) | Change: ${d.changePct >= 0 ? '+' : ''}${d.changePct.toFixed(2)}%
ATR14: ${atr14 > 0 ? f(atr14) : 'est ' + f(d.price * 0.005)} | ATR buffer: ${f(atrBuf)} | Session: ${slotMeta.name}
${d.intermarket ? `DXY: ${d.intermarket.dxyChangePct.toFixed(2)}% (${d.intermarket.dxyDirection}) | Gold: ${d.intermarket.goldChangePct.toFixed(2)}% | VIX: ${d.intermarket.vixLevel.toFixed(1)}` : ''}
${learningCtx ? `Context: ${learningCtx}` : ''}
${meta ? `Grade: ${meta.grade} | Confluence: ${meta.confluence}/100 | Regime: ${meta.regime}
${meta.hasSweep ? `✓ Liquidity sweep: ${meta.sweepDetail}` : ''}${meta.hasOB ? `\n✓ Order block (${meta.obStrength}): ${meta.obDetail}` : ''}${meta.hasDivergence ? `\n⚠ RSI divergence: ${meta.divergenceDetail}` : ''}` : ''}
${decision !== 'NO TRADE' ? `
ENTRY ZONE (pre-computed, do not change):
  entryHigh: ${f(entryHigh)}
  entryLow:  ${f(entryLow)}

STOP LOSS CANDIDATES (${isBuy ? 'below entry for BUY' : 'above entry for SELL'}, nearest first):
${fmtList(slCandidates)}
Note: code will subtract (BUY) or add (SELL) ATR buffer ${f(atrBuf)} from your selection.

TAKE PROFIT CANDIDATES (${isBuy ? 'above price for BUY' : 'below price for SELL'}, nearest first):
${fmtList(tpCandidates)}
Minimum R:R enforced by system: TP1 ≥ 1.5×, TP2 ≥ 2.5×, TP3 ≥ 4× — pick the structurally best level and system promotes if needed.
` : ''}
Respond with ONLY this JSON:
{
  "thesis":     "<4-5 sentences: lead with 1H signal candle pattern, explain 4H/daily alignment, cite specific RSI/EMA values, be honest about weaknesses>",
  "marketBias": "<2 sentences: directional expectation next 2-4 hours and the single most important level to watch>",
  "slChoice":   "<exact label string from SL candidates, or \\"auto\\">",
  "tp1Choice":  "<exact label string from TP candidates, or \\"auto\\">",
  "tp2Choice":  "<exact label string from TP candidates, or \\"auto\\">",
  "tp3Choice":  "<exact label string from TP candidates, or \\"auto\\">"
}`

  try {
    const msg = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 700,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    })

    const text = msg.content.find(b => b.type === 'text')?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const raw = JSON.parse(jsonMatch[0]) as {
      thesis: string; marketBias: string
      slChoice: string; tp1Choice: string; tp2Choice: string; tp3Choice: string
    }
    if (!raw.thesis || !raw.marketBias) return null

    if (decision === 'NO TRADE') {
      return { thesis: raw.thesis, marketBias: raw.marketBias, entryLow: 0, entryHigh: 0, stopLoss: 0, tp1: 0, tp2: 0, tp3: 0 }
    }

    // ── Resolve SL label → structural price → apply ATR buffer ────────────────
    const defaultSL  = slCandidates[0]?.price ?? (isBuy ? d.price * (1 - ewp * 3) : d.price * (1 + ewp * 3))
    const rawSLPrice = resolveLabel(raw.slChoice ?? 'auto', slCandidates, defaultSL)
    const stopLoss   = round(isBuy ? rawSLPrice - atrBuf : rawSLPrice + atrBuf, dec)
    const risk       = isBuy ? entryHigh - stopLoss : stopLoss - entryLow

    if (risk <= 0) {
      return { thesis: raw.thesis, marketBias: raw.marketBias, entryLow: 0, entryHigh: 0, stopLoss: 0, tp1: 0, tp2: 0, tp3: 0 }
    }

    // ── Resolve TP labels — promote to next valid candidate if R:R not met ────
    function resolveTP(choice: string, minRR: number, prevTP: number | null): number {
      const fallback  = round(isBuy ? entryHigh + risk * minRR : entryLow - risk * minRR, dec)
      const rawPrice  = resolveLabel(choice ?? 'auto', tpCandidates, fallback)
      const minTarget = isBuy ? entryHigh + risk * minRR : entryLow - risk * minRR
      const meetsRR   = isBuy ? rawPrice >= minTarget : rawPrice <= minTarget
      const clearPrev = prevTP === null || (isBuy ? rawPrice > prevTP * 1.0005 : rawPrice < prevTP * 0.9995)
      if (meetsRR && clearPrev) return round(rawPrice, dec)
      const promoted = tpCandidates.find(c =>
        isBuy
          ? c.price >= minTarget && (prevTP === null || c.price > prevTP * 1.0005)
          : c.price <= minTarget && (prevTP === null || c.price < prevTP * 0.9995)
      )
      return round(promoted?.price ?? fallback, dec)
    }

    const tp1 = resolveTP(raw.tp1Choice, 1.5, null)
    const tp2 = resolveTP(raw.tp2Choice, 2.5, tp1)
    const tp3 = resolveTP(raw.tp3Choice, 4.0, tp2)

    return { thesis: raw.thesis, marketBias: raw.marketBias, entryLow, entryHigh, stopLoss, tp1, tp2, tp3 }

  } catch (err) {
    console.error('[fm-trader/claude-narrative]', err)
    return null
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// INSTITUTIONAL SIGNAL ENGINE — ANALYSIS MODULES
//
// analyzeHigherTimeframes  — macro trend (weekly + daily structure + EMA)
// classify4HStructure      — 4H market state + 1H momentum forecast
// detect1HPattern          — 1H entry trigger (closed candle patterns)
// detectReversalRisk       — 4H + daily reversal risk (continuous background check)
//
// The rule engine makes the BUY/SELL/NO TRADE decision via confidence scoring.
// No module hard-blocks entry — each module informs quality and adjusts confidence.
// ─────────────────────────────────────────────────────────────────────────────

// ── Swing structure: HH/HL = BULLISH, LH/LL = BEARISH ───────────────────────
function swingStructure(candles: Candle[]): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  if (candles.length < 6) return 'NEUTRAL'
  const c = candles.slice(-Math.min(candles.length, 25))

  // 3-bar pivot detection (oldest-first candle array assumed)
  const pivotHighs: number[] = []
  const pivotLows:  number[] = []
  for (let i = 2; i < c.length - 2; i++) {
    if (c[i].h >= c[i-1].h && c[i].h >= c[i-2].h && c[i].h >= c[i+1].h && c[i].h >= c[i+2].h)
      pivotHighs.push(c[i].h)
    if (c[i].l <= c[i-1].l && c[i].l <= c[i-2].l && c[i].l <= c[i+1].l && c[i].l <= c[i+2].l)
      pivotLows.push(c[i].l)
  }

  if (pivotHighs.length >= 2 && pivotLows.length >= 2) {
    const hh = pivotHighs[pivotHighs.length-1] > pivotHighs[pivotHighs.length-2]
    const hl = pivotLows[pivotLows.length-1]   > pivotLows[pivotLows.length-2]
    const lh = pivotHighs[pivotHighs.length-1] < pivotHighs[pivotHighs.length-2]
    const ll = pivotLows[pivotLows.length-1]   < pivotLows[pivotLows.length-2]
    if (hh && hl) return 'BULLISH'
    if (lh && ll) return 'BEARISH'
  }

  // Fallback: only use if enough candles exist AND price moved meaningfully
  // Less than 15 candles = not enough history to call a structure
  if (c.length >= 15) {
    const mid  = c[Math.floor(c.length / 2)].c
    const last = c[c.length - 1].c
    if (last > mid * 1.006) return 'BULLISH'
    if (last < mid * 0.994) return 'BEARISH'
  }
  return 'NEUTRAL'
}

// ── EMA alignment: score 4 comparisons, UP if ≥3 agree ─────────────────────
function emaDir(tf: TFData): 'UP' | 'DOWN' | 'FLAT' {
  const score =
    (tf.close > tf.ema50  ? 1 : -1) +
    (tf.ema9  > tf.ema21  ? 1 : -1) +
    (tf.ema21 > tf.ema50  ? 1 : -1) +
    (tf.ema50 > tf.ema200 ? 1 : -1)
  if (score >=  3) return 'UP'
  if (score <= -3) return 'DOWN'
  return 'FLAT'
}

// ── Higher-timeframe macro trend: Weekly + Daily structure + EMA analysis ────
function analyzeHigherTimeframes(
  tfW: TFData | undefined,
  tfD: TFData | undefined,
): { trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; weeklyBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; dailyBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; lines: string[] } {
  if (!tfW || !tfD) return { trend: 'NEUTRAL', weeklyBias: 'NEUTRAL', dailyBias: 'NEUTRAL', lines: ['Insufficient weekly/daily data'] }

  const wStruct = swingStructure(tfW.candles)
  const wEMA    = emaDir(tfW)
  const dStruct = swingStructure(tfD.candles)
  const dEMA    = emaDir(tfD)

  // Each timeframe is BULLISH only if structure & EMA don't conflict
  const wBull = (wStruct === 'BULLISH' || wEMA === 'UP')   && wStruct !== 'BEARISH' && wEMA !== 'DOWN'
  const wBear = (wStruct === 'BEARISH' || wEMA === 'DOWN') && wStruct !== 'BULLISH' && wEMA !== 'UP'
  const dBull = (dStruct === 'BULLISH' || dEMA === 'UP')   && dStruct !== 'BEARISH' && dEMA !== 'DOWN'
  const dBear = (dStruct === 'BEARISH' || dEMA === 'DOWN') && dStruct !== 'BULLISH' && dEMA !== 'UP'

  const weeklyBias = wBull ? 'BULLISH' : wBear ? 'BEARISH' : 'NEUTRAL'
  const dailyBias  = dBull ? 'BULLISH' : dBear ? 'BEARISH' : 'NEUTRAL'

  const lines = [
    `Weekly: ${wStruct} structure, EMA ${wEMA} → ${weeklyBias}`,
    `Daily:  ${dStruct} structure, EMA ${dEMA} → ${dailyBias}`,
  ]

  // Perfect alignment
  if (weeklyBias === 'BULLISH' && dailyBias === 'BULLISH') return { trend: 'BULLISH', weeklyBias, dailyBias, lines }
  if (weeklyBias === 'BEARISH' && dailyBias === 'BEARISH') return { trend: 'BEARISH', weeklyBias, dailyBias, lines }

  // Daily NEUTRAL = daily is consolidating within the weekly trend (pullback phase on daily).
  // This is NOT a conflict — it is the setup. The weekly direction stands.
  if (weeklyBias === 'BULLISH' && dailyBias === 'NEUTRAL') {
    lines.push(`Daily consolidating within weekly bullish trend — macro bias BULLISH (daily pullback phase)`)
    return { trend: 'BULLISH', weeklyBias, dailyBias, lines }
  }
  if (weeklyBias === 'BEARISH' && dailyBias === 'NEUTRAL') {
    lines.push(`Daily consolidating within weekly bearish trend — macro bias BEARISH (daily pullback phase)`)
    return { trend: 'BEARISH', weeklyBias, dailyBias, lines }
  }

  // Weekly NEUTRAL but daily has a clear direction — use the daily (weekly still choppy)
  if (weeklyBias === 'NEUTRAL' && dailyBias === 'BULLISH') {
    lines.push(`Weekly neutral/ranging — deferring to daily BULLISH trend (reduced confidence)`)
    return { trend: 'BULLISH', weeklyBias, dailyBias, lines }
  }
  if (weeklyBias === 'NEUTRAL' && dailyBias === 'BEARISH') {
    lines.push(`Weekly neutral/ranging — deferring to daily BEARISH trend (reduced confidence)`)
    return { trend: 'BEARISH', weeklyBias, dailyBias, lines }
  }

  // True conflict: weekly and daily actively oppose each other — return NEUTRAL so the
  // caller can inspect weeklyBias and dailyBias to decide whether lower TFs resolve it.
  lines.push(`Active conflict: weekly ${weeklyBias} vs daily ${dailyBias} — checking lower timeframes`)
  return { trend: 'NEUTRAL', weeklyBias, dailyBias, lines }
}

// ── Candle pattern helpers (closed candles only) ─────────────────────────────

function isBullEngulf(prev: Candle, curr: Candle): boolean {
  const pb = Math.abs(prev.c - prev.o), cb = Math.abs(curr.c - curr.o)
  return curr.c > curr.o && curr.o <= prev.c && curr.c >= prev.o && cb >= pb * 0.80
}
function isBearEngulf(prev: Candle, curr: Candle): boolean {
  const pb = Math.abs(prev.c - prev.o), cb = Math.abs(curr.c - curr.o)
  return curr.c < curr.o && curr.o >= prev.c && curr.c <= prev.o && cb >= pb * 0.80
}
function isBullPin(c: Candle): boolean {
  const rng = c.h - c.l; if (!rng) return false
  const body = Math.abs(c.c - c.o)
  const lw = Math.min(c.o, c.c) - c.l, uw = c.h - Math.max(c.o, c.c)
  return lw >= rng * 0.50 && uw <= rng * 0.30 && body <= rng * 0.40  // loosened
}
function isBearPin(c: Candle): boolean {
  const rng = c.h - c.l; if (!rng) return false
  const body = Math.abs(c.c - c.o)
  const uw = c.h - Math.max(c.o, c.c), lw = Math.min(c.o, c.c) - c.l
  return uw >= rng * 0.50 && lw <= rng * 0.30 && body <= rng * 0.40
}
function isBullMaru(c: Candle): boolean {
  const rng = c.h - c.l; if (!rng) return false
  return c.c > c.o && Math.abs(c.c - c.o) >= rng * 0.75  // loosened from 0.80
}
function isBearMaru(c: Candle): boolean {
  const rng = c.h - c.l; if (!rng) return false
  return c.c < c.o && Math.abs(c.c - c.o) >= rng * 0.75
}
function isInsideBar(outer: Candle, inner: Candle): boolean {
  return inner.h <= outer.h && inner.l >= outer.l
}
function isDoji(c: Candle): boolean {
  const rng = c.h - c.l; if (!rng) return false
  return Math.abs(c.c - c.o) <= rng * 0.15  // body ≤15% of range
}
function isTweezerBottom(c1: Candle, c0: Candle): boolean {
  // c1 = bearish, c0 = bullish, both share a similar low (within 0.2% of each other)
  return c1.c < c1.o && c0.c > c0.o && Math.abs(c0.l - c1.l) / (c1.l || 1) < 0.002
}
function isTweezerTop(c1: Candle, c0: Candle): boolean {
  return c1.c > c1.o && c0.c < c0.o && Math.abs(c0.h - c1.h) / (c1.h || 1) < 0.002
}
function isMorningStar(c2: Candle, c1: Candle, c0: Candle): boolean {
  // c2 = bearish body, c1 = small body/doji (star), c0 = bullish body ≥50% of c2
  const b2 = Math.abs(c2.c - c2.o), b0 = Math.abs(c0.c - c0.o)
  const rng1 = c1.h - c1.l
  return c2.c < c2.o && c0.c > c0.o &&
    (rng1 === 0 || Math.abs(c1.c - c1.o) <= rng1 * 0.30) &&  // c1 is small
    b0 >= b2 * 0.50 && c0.c > c1.h  // c0 closes well into c2's body
}
function isEveningStar(c2: Candle, c1: Candle, c0: Candle): boolean {
  const b2 = Math.abs(c2.c - c2.o), b0 = Math.abs(c0.c - c0.o)
  const rng1 = c1.h - c1.l
  return c2.c > c2.o && c0.c < c0.o &&
    (rng1 === 0 || Math.abs(c1.c - c1.o) <= rng1 * 0.30) &&
    b0 >= b2 * 0.50 && c0.c < c1.l
}
function isThreeSoldiers(c2: Candle, c1: Candle, c0: Candle): boolean {
  // Three consecutive bullish candles, each closing higher than the previous
  return c2.c > c2.o && c1.c > c1.o && c0.c > c0.o &&
    c1.c > c2.c && c0.c > c1.c &&
    Math.abs(c0.c - c0.o) >= (c0.h - c0.l) * 0.45  // last candle has decent body
}
function isThreeCrows(c2: Candle, c1: Candle, c0: Candle): boolean {
  return c2.c < c2.o && c1.c < c1.o && c0.c < c0.o &&
    c1.c < c2.c && c0.c < c1.c &&
    Math.abs(c0.c - c0.o) >= (c0.h - c0.l) * 0.45
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTITUTIONAL ANALYSIS MODULES
// These six modules run in parallel with the 4-phase engine and feed into the
// final confidence score, setup grade, and technicalBreakdown.
// They do NOT block entry — they inform quality assessment only.
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. Market Regime Detector ────────────────────────────────────────────────
// Reads 4H candles to classify the current market environment.
// VOLATILE: ATR% > 3.5 — abnormally wide candles, stop-hunt risk
// TRENDING_UP/DOWN: confirmed swing structure (HH+HL or LH+LL)
// RANGING: price oscillating inside a tight band with no clear directional swing
function detectRegime(candles: Candle[]): 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'VOLATILE' {
  if (candles.length < 10) return 'RANGING'
  const c = candles.slice(-20)

  // ATR% volatility check
  let totalTR = 0
  for (let i = 1; i < c.length; i++) {
    totalTR += Math.max(c[i].h - c[i].l, Math.abs(c[i].h - c[i-1].c), Math.abs(c[i].l - c[i-1].c))
  }
  const avgATR  = totalTR / (c.length - 1)
  const avgClose = c.reduce((s, x) => s + x.c, 0) / c.length
  if (avgATR / avgClose > 0.035) return 'VOLATILE'

  // Swing structure
  const struct = swingStructure(candles)
  if (struct === 'BULLISH') return 'TRENDING_UP'
  if (struct === 'BEARISH') return 'TRENDING_DOWN'

  // Tight band = ranging
  const hi = Math.max(...c.map(x => x.h))
  const lo = Math.min(...c.map(x => x.l))
  if ((hi - lo) / avgClose < 0.03) return 'RANGING'

  return 'RANGING'
}

// ── 2. Multi-Timeframe Confluence Score (0–100) ──────────────────────────────
// Each timeframe is weighted by its influence on price action.
// 15m/30m are deliberately weighted ~0: they flip too often during pullbacks
// (which is the engine's preferred entry setup), so giving them confluence
// weight adds more variance than signal. They're used for entry-timing hints
// in riskFactors but never for scoring.
function calcMultiTFConfluence(
  tfs:   TFData[],
  trend: 'BULLISH' | 'BEARISH',
): { score: number; details: string[] } {
  const bull = trend === 'BULLISH'
  const weightMap: Record<string, number> = { weekly: 28, daily: 24, '4h': 24, '1h': 20 }
  const details: string[] = []
  let raw = 0, maxRaw = 0

  for (const tf of tfs) {
    // Skip 15m/30m entirely — they're entry-timing tools, not confluence drivers
    if (tf.key === '15m' || tf.key === '30m') continue
    const w  = weightMap[tf.key] ?? 4
    maxRaw  += w + 5 + 3  // signal + RSI bonus cap + EMA stack cap

    // Signal alignment score
    // NEUTRAL = no directional information for this timeframe → 0 points.
    // Previously NEUTRAL got 30% which inflated confluence on mixed setups.
    let sigPts: number
    if (bull) {
      sigPts = tf.signal === 'STRONG BUY' ? w
             : tf.signal === 'BUY'        ? Math.round(w * 0.72)
             : 0  // NEUTRAL, SELL, STRONG SELL all contribute 0 toward a bullish confluence
    } else {
      sigPts = tf.signal === 'STRONG SELL' ? w
             : tf.signal === 'SELL'        ? Math.round(w * 0.72)
             : 0  // NEUTRAL, BUY, STRONG BUY all contribute 0 toward a bearish confluence
    }
    raw += sigPts
    details.push(`${tf.label} ${tf.signal}: +${sigPts}pts`)

    // RSI zone: 5pts bonus if in ideal zone, −5pts at extreme
    const rsiGood    = bull ? (tf.rsi > 50 && tf.rsi < 70) : (tf.rsi < 50 && tf.rsi > 30)
    const rsiExtreme = bull ? tf.rsi > 76 : tf.rsi < 24
    if (rsiGood)    { raw += 5; details.push(`  RSI ${tf.rsi.toFixed(0)} ideal (+5)`) }
    else if (rsiExtreme) { raw -= 5; details.push(`  RSI ${tf.rsi.toFixed(0)} extreme (−5)`) }

    // Perfect EMA stack: 3pts bonus
    const bullStack = tf.ema9 > tf.ema21 && tf.ema21 > tf.ema50 && tf.ema50 > tf.ema200
    const bearStack = tf.ema9 < tf.ema21 && tf.ema21 < tf.ema50 && tf.ema50 < tf.ema200
    if (bull && bullStack) { raw += 3; details.push(`  EMA stack aligned bull (+3)`) }
    if (!bull && bearStack){ raw += 3; details.push(`  EMA stack aligned bear (+3)`) }
  }

  const score = Math.min(100, Math.max(0, Math.round(raw / maxRaw * 100)))
  return { score, details }
}

// ── 3. RSI Series Calculator (Wilder smoothing) ──────────────────────────────
// Required for divergence detection — computes RSI at each candle point.
function calcRSISeries(candles: Candle[], period = 14): number[] {
  if (candles.length < period + 1) return []
  let avgG = 0, avgL = 0
  for (let i = 1; i <= period; i++) {
    const d = candles[i].c - candles[i-1].c
    if (d > 0) avgG += d; else avgL += Math.abs(d)
  }
  avgG /= period; avgL /= period
  const out: number[] = []
  for (let i = period; i < candles.length; i++) {
    const d = candles[i].c - candles[i-1].c
    avgG = (avgG * (period-1) + Math.max(d, 0)) / period
    avgL = (avgL * (period-1) + Math.max(-d, 0)) / period
    const rs = avgL === 0 ? 100 : avgG / avgL
    out.push(100 - 100 / (1 + rs))
  }
  return out
}

// ── 4. RSI Divergence Detector ───────────────────────────────────────────────
// Bearish divergence: price making higher highs BUT RSI making lower highs → momentum waning
// Bullish divergence: price making lower lows BUT RSI making higher lows → selling exhausted
// Only meaningful as a warning — never blocks a trade on its own.
function detectDivergence(
  candles: Candle[],
  trend:   'BULLISH' | 'BEARISH',
): { divergence: boolean; type: 'BEARISH' | 'BULLISH' | null; detail: string } {
  const none = { divergence: false, type: null as null, detail: 'No divergence detected' }
  if (candles.length < 20) return none

  const rsi = calcRSISeries(candles)
  if (rsi.length < 4) return none

  const n = candles.length, r = rsi.length
  const c2 = candles[n-5], c1 = candles[n-3], c0 = candles[n-1]
  const r2 = rsi[r-5]   ?? rsi[0], r1 = rsi[r-3] ?? rsi[0], r0 = rsi[r-1]

  if (trend === 'BULLISH' && c0.h > c2.h && r0 < r2 - 3) {
    return {
      divergence: true, type: 'BEARISH',
      detail: `Bearish divergence on 4H: price made a higher high (${c0.h.toFixed(4)} > ${c2.h.toFixed(4)}) but RSI declined (${r0.toFixed(1)} < ${r2.toFixed(1)}) — buying momentum is waning. Consider TP1 only; avoid TP3.`,
    }
  }
  if (trend === 'BEARISH' && c0.l < c2.l && r0 > r2 + 3) {
    return {
      divergence: true, type: 'BULLISH',
      detail: `Bullish divergence on 4H: price made a lower low (${c0.l.toFixed(4)} < ${c2.l.toFixed(4)}) but RSI rose (${r0.toFixed(1)} > ${r2.toFixed(1)}) — selling momentum is exhausted. Trail stop tightly and target TP1 first.`,
    }
  }
  return none
}

// ── 5. Liquidity Sweep / Stop Hunt Detector ──────────────────────────────────
// Institutional traders deliberately run stops before reversing.
// Pattern: last 1H candle spiked BELOW recent swing lows (for bull trend) then
// closed back ABOVE them → retail longs stopped out → institutions bought the dip.
// This is one of the highest-quality entry signals in Smart Money methodology.
function detectLiquiditySweep(
  candles: Candle[],
  trend:   'BULLISH' | 'BEARISH',
): { sweep: boolean; detail: string } {
  if (candles.length < 6) return { sweep: false, detail: '' }

  const recent = candles.slice(-7)
  const c      = recent[recent.length - 1]   // most recent closed candle
  const prior  = recent.slice(0, -1)

  if (trend === 'BULLISH') {
    const swingLow = Math.min(...prior.map(x => x.l))
    // Spike below prior lows, then closed bullish above them
    if (c.l < swingLow * 0.9998 && c.c > swingLow && c.c > c.o) {
      return {
        sweep: true,
        detail: `Bullish liquidity sweep on last 1H candle: wick spiked below recent low (${swingLow.toFixed(4)}) to grab retail stops, then reversed and closed bullish at ${c.c.toFixed(4)} — institutional buy confirmed. This is a high-conviction entry signal.`,
      }
    }
  } else {
    const swingHigh = Math.max(...prior.map(x => x.h))
    // Spike above prior highs, then closed bearish below them
    if (c.h > swingHigh * 1.0002 && c.c < swingHigh && c.c < c.o) {
      return {
        sweep: true,
        detail: `Bearish liquidity sweep on last 1H candle: wick spiked above recent high (${swingHigh.toFixed(4)}) to grab retail stops, then reversed and closed bearish at ${c.c.toFixed(4)} — institutional sell confirmed. Strong entry signal.`,
      }
    }
  }

  return { sweep: false, detail: '' }
}

// ── 6. Premium / Discount Zone (PD Arrays) ───────────────────────────────────
// Smart Money Concept: institutions buy at discount (lower 50% of swing),
// sell at premium (upper 50% of swing). Equilibrium (50%) is the lowest quality.
// Deep discount (<30%) or deep premium (>70%) = optimal institutional entry.
function getPDZone(
  swingHigh: number, swingLow: number, price: number, trend: 'BULLISH' | 'BEARISH',
): { zone: 'DISCOUNT' | 'EQUILIBRIUM' | 'PREMIUM'; ratio: number; quality: 'optimal' | 'good' | 'fair' | 'poor'; detail: string } {
  const invalid = { zone: 'EQUILIBRIUM' as const, ratio: 0.5, quality: 'fair' as const, detail: 'Swing range not established — PD zone unavailable' }
  if (!swingHigh || !swingLow || swingHigh <= swingLow) return invalid

  const ratio = Math.max(0, Math.min(1, (price - swingLow) / (swingHigh - swingLow)))
  const pct   = Math.round(ratio * 100)

  if (trend === 'BULLISH') {
    if (ratio < 0.30) return { zone: 'DISCOUNT', ratio, quality: 'optimal', detail: `Price at ${pct}% of swing range — deep discount zone (optimal bull entry). Institutions buy here.` }
    if (ratio < 0.50) return { zone: 'DISCOUNT', ratio, quality: 'good',    detail: `Price at ${pct}% of swing range — discount zone (good bull entry quality).` }
    if (ratio <= 0.63) return { zone: 'EQUILIBRIUM', ratio, quality: 'fair', detail: `Price at ${pct}% of swing range — near equilibrium. Bull entry is fair quality, not ideal.` }
    if (ratio <= 0.78) return { zone: 'PREMIUM', ratio, quality: 'poor',    detail: `Price at ${pct}% of swing range — premium zone. Buying at premium is counter-institutional; target TP1 only.` }
    return { zone: 'PREMIUM', ratio, quality: 'poor', detail: `Price at ${pct}% of swing range — deep premium. Chasing long into premium territory — reduce size significantly.` }
  } else {
    if (ratio > 0.70) return { zone: 'PREMIUM', ratio, quality: 'optimal', detail: `Price at ${pct}% of swing range — deep premium (optimal bear entry). Institutions sell here.` }
    if (ratio > 0.50) return { zone: 'PREMIUM', ratio, quality: 'good',    detail: `Price at ${pct}% of swing range — premium zone (good bear entry quality).` }
    if (ratio >= 0.37) return { zone: 'EQUILIBRIUM', ratio, quality: 'fair', detail: `Price at ${pct}% of swing range — near equilibrium. Bear entry is fair quality.` }
    if (ratio >= 0.22) return { zone: 'DISCOUNT', ratio, quality: 'poor',   detail: `Price at ${pct}% of swing range — discount zone. Selling at discount is counter-institutional; target TP1 only.` }
    return { zone: 'DISCOUNT', ratio, quality: 'poor', detail: `Price at ${pct}% of swing range — deep discount. Shorting here is chasing; reduce size.` }
  }
}

// ── 7. Order Block Detector (Smart Money Concepts) ───────────────────────────
// Bullish OB: the last BEARISH candle immediately before a strong 2+ bar bullish impulse.
// When price returns to the body of that candle = institutional demand zone.
// The stronger the impulse that followed the OB, the stronger the zone.
function detectOrderBlock(
  candles: Candle[],
  trend:   'BULLISH' | 'BEARISH',
): { found: boolean; level: number; strength: 'strong' | 'moderate' | null; detail: string } {
  const none = { found: false, level: 0, strength: null as null, detail: '' }
  if (candles.length < 12) return none

  const c = candles
  const n = c.length
  const price = c[n-1].c

  if (trend === 'BULLISH') {
    // Scan last 15 candles for bearish candle followed by bullish impulse
    for (let i = Math.max(0, n - 15); i < n - 4; i++) {
      if (c[i].c >= c[i].o) continue  // skip non-bearish
      let bullRun = 0
      for (let j = i + 1; j < Math.min(i + 6, n - 1); j++) {
        if (c[j].c > c[j].o) bullRun++; else break
      }
      if (bullRun < 2) continue
      // OB zone: body of the bearish candle (c[i].c to c[i].o)
      const obTop = Math.max(c[i].o, c[i].c)
      const obBot = Math.min(c[i].o, c[i].c)
      const inOB  = price >= obBot * 0.9990 && price <= obTop * 1.0010
      if (inOB) {
        const strength = bullRun >= 3 ? 'strong' : 'moderate'
        return {
          found: true, level: (obTop + obBot) / 2, strength,
          detail: `Bullish Order Block at ${((obTop + obBot) / 2).toFixed(4)} (${obBot.toFixed(4)}–${obTop.toFixed(4)}) — last bearish candle before a ${bullRun}-candle impulse. Price has returned to this institutional demand zone (${strength} OB).`,
        }
      }
    }
  } else {
    // Bearish OB: last bullish candle before a bearish impulse
    for (let i = Math.max(0, n - 15); i < n - 4; i++) {
      if (c[i].c <= c[i].o) continue  // skip non-bullish
      let bearRun = 0
      for (let j = i + 1; j < Math.min(i + 6, n - 1); j++) {
        if (c[j].c < c[j].o) bearRun++; else break
      }
      if (bearRun < 2) continue
      const obBot = Math.min(c[i].o, c[i].c)
      const obTop = Math.max(c[i].o, c[i].c)
      const inOB  = price <= obTop * 1.0010 && price >= obBot * 0.9990
      if (inOB) {
        const strength = bearRun >= 3 ? 'strong' : 'moderate'
        return {
          found: true, level: (obTop + obBot) / 2, strength,
          detail: `Bearish Order Block at ${((obTop + obBot) / 2).toFixed(4)} (${obBot.toFixed(4)}–${obTop.toFixed(4)}) — last bullish candle before a ${bearRun}-candle impulse. Price has returned to this institutional supply zone (${strength} OB).`,
        }
      }
    }
  }

  return none
}

// ── 8. Fair Value Gap (FVG / Imbalance) Detector ─────────────────────────────
// ICT/SMC concept: a 3-candle pattern where price moves so fast that candle 1's
// wick and candle 3's wick do NOT overlap, leaving an unfilled "imbalance" zone
// between them. Institutions often return to fill these gaps before continuing.
// Bullish FVG (in uptrend): candle 1 high < candle 3 low → gap between is demand
// Bearish FVG (in downtrend): candle 1 low > candle 3 high → gap is supply
// We report the MOST RECENT unfilled FVG in the trend direction.
function detectFairValueGap(
  candles: Candle[],
  trend:   'BULLISH' | 'BEARISH',
): { found: boolean; top: number; bottom: number; mid: number; age: number; detail: string } {
  const none = { found: false, top: 0, bottom: 0, mid: 0, age: 0, detail: '' }
  if (candles.length < 4) return none
  const n = candles.length
  const price = candles[n-1].c

  // Scan from oldest to newest (last 20 bars) for FVGs in trend direction
  for (let i = Math.max(0, n - 20); i < n - 2; i++) {
    const c1 = candles[i], c3 = candles[i + 2]
    if (trend === 'BULLISH' && c3.l > c1.h) {
      // Bullish FVG between c1.h and c3.l
      const top = c3.l, bot = c1.h, mid = (top + bot) / 2
      // Unfilled if current price hasn't traded back through to bot
      // (any subsequent candle that closed below 'bot' filled it)
      const filled = candles.slice(i + 3).some(c => c.l <= bot)
      if (!filled) {
        const inGap = price >= bot && price <= top
        const age = n - 1 - (i + 2)
        return {
          found: true, top, bottom: bot, mid, age,
          detail: `Bullish FVG (${bot.toFixed(4)}–${top.toFixed(4)}) ${age} bar${age === 1 ? '' : 's'} ago, ${inGap ? 'price currently in gap (high-probability fill zone)' : `price ${price > top ? 'above' : 'below'} gap`}.`,
        }
      }
    }
    if (trend === 'BEARISH' && c3.h < c1.l) {
      // Bearish FVG between c3.h and c1.l
      const top = c1.l, bot = c3.h, mid = (top + bot) / 2
      const filled = candles.slice(i + 3).some(c => c.h >= top)
      if (!filled) {
        const inGap = price >= bot && price <= top
        const age = n - 1 - (i + 2)
        return {
          found: true, top, bottom: bot, mid, age,
          detail: `Bearish FVG (${bot.toFixed(4)}–${top.toFixed(4)}) ${age} bar${age === 1 ? '' : 's'} ago, ${inGap ? 'price currently in gap (high-probability fill zone)' : `price ${price > top ? 'above' : 'below'} gap`}.`,
        }
      }
    }
  }
  return none
}

// ── 9. Break of Structure (BOS) + Change of Character (CHoCH) ────────────────
// Smart Money Concept: identifies whether the most recent structural break
// continues the trend (BOS) or signals a potential reversal (CHoCH).
//
// BOS (bullish trend):  price closes ABOVE the most recent confirmed swing HIGH.
// CHoCH (bullish trend): price closes BELOW the most recent confirmed swing LOW
//                        — first break against trend = character change warning.
// Mirror for bearish trend.
function detectBOSCHoCH(
  candles: Candle[],
  trend:   'BULLISH' | 'BEARISH',
): { bos: boolean; choch: boolean; level: number; detail: string } {
  const none = { bos: false, choch: false, level: 0, detail: '' }
  if (candles.length < 12) return none

  // Identify swing highs and lows in last 25 bars using 2-bar fractal:
  // swing high = a bar with strictly higher high than both neighbours
  const c = candles.slice(-25)
  const swingHighs: { idx: number; price: number }[] = []
  const swingLows:  { idx: number; price: number }[] = []
  for (let i = 1; i < c.length - 1; i++) {
    if (c[i].h > c[i-1].h && c[i].h > c[i+1].h) swingHighs.push({ idx: i, price: c[i].h })
    if (c[i].l < c[i-1].l && c[i].l < c[i+1].l) swingLows.push({ idx: i, price: c[i].l })
  }
  if (swingHighs.length === 0 && swingLows.length === 0) return none

  const last = c[c.length - 1]
  // Most recent swings (highest-index)
  const lastSH = swingHighs.length ? swingHighs[swingHighs.length - 1] : null
  const lastSL = swingLows.length  ? swingLows[swingLows.length - 1]   : null

  if (trend === 'BULLISH') {
    // BOS: last candle closed above the most recent swing high → continuation
    if (lastSH && last.c > lastSH.price) {
      return {
        bos: true, choch: false, level: lastSH.price,
        detail: `Bullish BOS: price closed at ${last.c.toFixed(4)} above the most recent swing high (${lastSH.price.toFixed(4)}) — structural continuation of the bullish trend.`,
      }
    }
    // CHoCH: last candle closed below the most recent swing low → potential reversal
    if (lastSL && last.c < lastSL.price) {
      return {
        bos: false, choch: true, level: lastSL.price,
        detail: `⚠ Bullish CHoCH: price closed at ${last.c.toFixed(4)} below the most recent swing low (${lastSL.price.toFixed(4)}) — first structural break against the bullish trend. Reversal warning.`,
      }
    }
  } else {
    if (lastSL && last.c < lastSL.price) {
      return {
        bos: true, choch: false, level: lastSL.price,
        detail: `Bearish BOS: price closed at ${last.c.toFixed(4)} below the most recent swing low (${lastSL.price.toFixed(4)}) — structural continuation of the bearish trend.`,
      }
    }
    if (lastSH && last.c > lastSH.price) {
      return {
        bos: false, choch: true, level: lastSH.price,
        detail: `⚠ Bearish CHoCH: price closed at ${last.c.toFixed(4)} above the most recent swing high (${lastSH.price.toFixed(4)}) — first structural break against the bearish trend. Reversal warning.`,
      }
    }
  }
  return none
}

// ── 10. Equal Highs / Equal Lows (Liquidity Pools) ───────────────────────────
// Smart Money Concept: when price tests the same swing high/low TWICE within a
// tight tolerance, retail stops cluster there. Institutions sweep these levels
// before reversing. Equal highs = bearish liquidity target. Equal lows = bullish.
// Active EQH ABOVE current price (in a bullish trend) = liquidity to grab on the way up.
function detectEqualLevels(
  candles: Candle[],
  trend:   'BULLISH' | 'BEARISH',
): { found: boolean; level: number; touches: number; detail: string } {
  const none = { found: false, level: 0, touches: 0, detail: '' }
  if (candles.length < 10) return none

  const c = candles.slice(-20)
  const price = c[c.length - 1].c
  const tol   = 0.0015  // 15 bps tolerance — adjustable per instrument volatility

  // Build candidate clusters from highs (for EQH targets in bullish trend)
  // and from lows (for EQL targets in bearish trend).
  const series = trend === 'BULLISH' ? c.map(x => x.h) : c.map(x => x.l)

  let best = { level: 0, touches: 0 }
  for (let i = 0; i < series.length; i++) {
    const pivot = series[i]
    if (pivot <= 0) continue
    let touches = 0
    for (let j = 0; j < series.length; j++) {
      if (Math.abs(series[j] - pivot) / pivot < tol) touches++
    }
    if (touches > best.touches) best = { level: pivot, touches }
  }

  // Need at least 2 touches to be a true equal-level liquidity pool
  if (best.touches < 2) return none

  // Only meaningful if level is in the direction price is moving toward
  if (trend === 'BULLISH' && best.level <= price) return none
  if (trend === 'BEARISH' && best.level >= price) return none

  const dist = Math.abs(best.level - price) / price
  if (dist > 0.025) return none  // too far away to matter (>2.5%)

  const kind = trend === 'BULLISH' ? 'Equal Highs (EQH)' : 'Equal Lows (EQL)'
  const dir  = trend === 'BULLISH' ? 'above' : 'below'
  return {
    found: true, level: best.level, touches: best.touches,
    detail: `${kind} liquidity pool at ${best.level.toFixed(4)} (${best.touches} touches), ${(dist * 100).toFixed(2)}% ${dir} current price — retail stops cluster here; expect institutional sweep before reversal.`,
  }
}

// ── 11. MACD Computation (12/26/9 standard) ──────────────────────────────────
// Momentum confirmation indicator. Used as a confirmation overlay — not a
// primary entry signal. Bullish: MACD line > signal line AND histogram rising.
function calcMACD(
  candles: Candle[],
): { macd: number; signal: number; histogram: number; bullishCross: boolean; bearishCross: boolean } | null {
  if (candles.length < 35) return null
  const closes = candles.map(c => c.c)
  const ema = (period: number): number[] => {
    const k = 2 / (period + 1)
    const out: number[] = []
    out[0] = closes[0]
    for (let i = 1; i < closes.length; i++) out[i] = closes[i] * k + out[i-1] * (1 - k)
    return out
  }
  const ema12 = ema(12)
  const ema26 = ema(26)
  const macdLine: number[] = closes.map((_, i) => ema12[i] - ema26[i])
  // Signal line = 9 EMA of MACD line
  const k = 2 / (9 + 1)
  const sig: number[] = []
  sig[0] = macdLine[0]
  for (let i = 1; i < macdLine.length; i++) sig[i] = macdLine[i] * k + sig[i-1] * (1 - k)

  const n = closes.length - 1
  const macd = macdLine[n], signal = sig[n], hist = macd - signal
  const prevHist = macdLine[n-1] - sig[n-1]
  const bullishCross = prevHist <= 0 && hist > 0
  const bearishCross = prevHist >= 0 && hist < 0
  return { macd, signal, histogram: hist, bullishCross, bearishCross }
}

// ── 12. Setup Grader (A / B / C) ─────────────────────────────────────────────
// Grade A: institutional-quality setup — all or nearly all conditions optimal
// Grade B: solid setup — key conditions met, minor compromises acceptable
// Grade C: minimum criteria met — tradeable but reduced size and expectation
//
// Scoring criteria (total possible: 9):
//   Deep pullback (PULLBACK)       → +2   (micro pullback = +1)
//   Type A candle pattern          → +2   (Type B = +1)
//   Confluence ≥ 72                → +2   (55–71 = +1)
//   Optimal PD zone                → +1   (good = +0.5)
//   Liquidity sweep present        → +1
//   No divergence                  → +0.5
//   Order block present (strong)   → +1   (moderate = +0.5)
//   Trending regime (not volatile) → +0.5
// Grade A: ≥ 7.5 pts | Grade B: ≥ 4.5 | Grade C: below 4.5
interface GradeParams {
  marketState: 'PULLBACK' | 'MICRO_PULLBACK' | 'CONTINUATION' | 'REVERSAL_WARNING' | 'NEUTRAL'
  patternType: 'A' | 'B' | null
  confluence:  number
  regime:      'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING' | 'VOLATILE'
  hasDivergence: boolean
  hasSweep:    boolean
  pdQuality:   'optimal' | 'good' | 'fair' | 'poor'
  hasOB:       boolean
  obStrength:  'strong' | 'moderate' | null
  trend:       'BULLISH' | 'BEARISH'
  // Smart Money additions (max combined bonus: 1.5 pts)
  hasFVG?:     boolean
  fvgFresh?:   boolean  // FVG ≤4 bars old AND price in gap
  hasBOS?:     boolean
  hasCHoCH?:   boolean  // counter-trend break — heavy penalty
  hasEqLevels?:boolean
  macdConfirms?: boolean
}
function gradeSetup(p: GradeParams): 'A' | 'B' | 'C' {
  let pts = 0
  pts += p.marketState === 'PULLBACK'      ? 2 : p.marketState === 'MICRO_PULLBACK' ? 1 : 0
  pts += p.patternType === 'A'             ? 2 : p.patternType === 'B'              ? 1 : 0
  pts += p.confluence >= 72             ? 2 : p.confluence >= 55             ? 1 : 0
  pts += p.pdQuality === 'optimal'      ? 1 : p.pdQuality === 'good'         ? 0.5 : 0
  pts += p.hasSweep                     ? 1 : 0
  pts += !p.hasDivergence               ? 0.5 : 0
  pts += p.obStrength === 'strong'      ? 1 : p.obStrength === 'moderate'    ? 0.5 : 0
  pts += p.regime !== 'VOLATILE' && p.regime !== 'RANGING' ? 0.5 : 0
  // Smart Money bonuses (Max +1.5)
  pts += p.fvgFresh    ? 0.5 : p.hasFVG ? 0.25 : 0
  pts += p.hasBOS      ? 0.5 : 0
  pts += p.macdConfirms ? 0.25 : 0
  pts += p.hasEqLevels ? 0.25 : 0
  // CHoCH is a structural reversal warning — penalty
  pts += p.hasCHoCH    ? -1.5 : 0

  if (pts >= 7.5) return 'A'
  if (pts >= 4.5) return 'B'
  return 'C'
}

// ── 4H market structure + 1H momentum forecast ───────────────────────────────
function classify4HStructure(
  tf4H: TFData | undefined,
  tf1H: TFData | undefined,
  trend: 'BULLISH' | 'BEARISH',
): {
  state: 'PULLBACK' | 'MICRO_PULLBACK' | 'CONTINUATION' | 'REVERSAL_WARNING' | 'NEUTRAL'
  forecast: 'BULLISH_NEXT_1_4H' | 'BEARISH_NEXT_1_4H' | 'UNDECIDED'
  lines: string[]
} {
  if (!tf4H) return { state: 'NEUTRAL', forecast: 'UNDECIDED', lines: ['No 4H data available'] }

  const bull = trend === 'BULLISH'
  const c4   = tf4H.candles

  // 4H reversal warning: strong engulf AGAINST the trend with body > 70% and outside EMA21
  let rev4H = false
  if (c4.length >= 2) {
    const last = c4[c4.length - 1], prev = c4[c4.length - 2]
    rev4H = bull ? isBearEngulf(prev, last) : isBullEngulf(prev, last)
    if (!rev4H) {
      const rng = last.h - last.l, body = Math.abs(last.c - last.o)
      if (bull  && last.c < last.o && body >= rng * 0.70 && last.c < tf4H.ema21) rev4H = true
      if (!bull && last.c > last.o && body >= rng * 0.70 && last.c > tf4H.ema21) rev4H = true
    }
  }

  // Deep pullback: price/EMA9 crossed the 4H EMA21 against the trend
  const deepPullback = bull
    ? tf4H.close < tf4H.ema21 || tf4H.ema9 < tf4H.ema21
    : tf4H.close > tf4H.ema21 || tf4H.ema9 > tf4H.ema21

  // Shallow pullback: price above EMA21 but momentum cooling
  const sig4H       = tf4H.signal
  const rsi4H       = tf4H.rsi
  const nearEMA9_4H = Math.abs(tf4H.close - tf4H.ema9) / tf4H.ema9 < 0.005
  const shallowPullback = bull
    ? !deepPullback && ((sig4H === 'BUY' || sig4H === 'NEUTRAL') || rsi4H < 55 || nearEMA9_4H)
    : !deepPullback && ((sig4H === 'SELL' || sig4H === 'NEUTRAL') || rsi4H > 45 || nearEMA9_4H)

  // Micro-pullback: 4H still strong but 1H has dipped — intraday entry window
  const sig1H        = tf1H?.signal
  const micro1Hbear  = sig1H === 'SELL' || sig1H === 'STRONG SELL' || sig1H === 'NEUTRAL'
  const micro1Hbull  = sig1H === 'BUY'  || sig1H === 'STRONG BUY'  || sig1H === 'NEUTRAL'
  const microPullback = !deepPullback && !shallowPullback && (
    bull  ? micro1Hbear && (sig4H === 'STRONG BUY'  || sig4H === 'BUY')
          : micro1Hbull && (sig4H === 'STRONG SELL' || sig4H === 'SELL')
  )

  // Full alignment: 4H and 1H both strongly in trend direction — highest-quality momentum entry
  const fullAlignment = !deepPullback && !shallowPullback && !microPullback && (
    bull
      ? (sig4H === 'STRONG BUY' || sig4H === 'BUY') && (sig1H === 'STRONG BUY' || sig1H === 'BUY')
      : (sig4H === 'STRONG SELL' || sig4H === 'SELL') && (sig1H === 'STRONG SELL' || sig1H === 'SELL')
  )

  let state: 'PULLBACK' | 'MICRO_PULLBACK' | 'CONTINUATION' | 'REVERSAL_WARNING' | 'NEUTRAL'
  const lines: string[] = []

  if (rev4H) {
    state = 'REVERSAL_WARNING'
    lines.push(`4H: Strong counter-trend candle closed outside EMA21 — reversal warning active (checking daily for confirmation)`)
  } else if (deepPullback) {
    state = 'PULLBACK'
    lines.push(`4H: Deep pullback — price ${bull ? 'below' : 'above'} EMA21, retracing against ${trend.toLowerCase()} trend — entry window open`)
    if (bull ? tf4H.ema9 < tf4H.ema21 : tf4H.ema9 > tf4H.ema21)
      lines.push(`4H EMA9 ${bull ? 'crossed below' : 'crossed above'} EMA21 — momentum shift confirms pullback depth`)
  } else if (shallowPullback) {
    state = 'PULLBACK'
    const reason = (sig4H === 'BUY' || sig4H === 'SELL' || sig4H === 'NEUTRAL')
      ? `signal degraded to ${sig4H}`
      : nearEMA9_4H ? `price at EMA9 first support`
      : `RSI cooled to ${rsi4H.toFixed(0)}`
    lines.push(`4H: Shallow pullback (${reason}) — price above EMA21, momentum pausing — entry window open`)
  } else if (microPullback) {
    state = 'MICRO_PULLBACK'
    lines.push(`4H: ${sig4H} (trend intact) | 1H: ${sig1H} (dipping) — intraday micro-entry window`)
    lines.push(`Buying the 1H dip within the 4H trend is a high-quality intraday setup — 1H entry candle confirmation required`)
  } else if (fullAlignment) {
    state = 'CONTINUATION'
    lines.push(`4H: ${sig4H} | 1H: ${sig1H} — both timeframes ${trend.toLowerCase()}, no pullback in progress`)
    lines.push(`Momentum continuation: trend running on both TFs. No pullback available — entry R:R is lower. Target TP1 first.`)
  } else {
    state = 'CONTINUATION'
    lines.push(`4H: ${sig4H} | RSI ${rsi4H.toFixed(0)} | price ${bull ? 'above' : 'below'} EMA21 — trend extending, no pullback yet`)
    lines.push(`Wait for: 4H RSI to cool, signal to degrade (${bull ? 'STRONG BUY→BUY/NEUTRAL' : 'STRONG SELL→SELL/NEUTRAL'}), or 1H to pull back`)
  }

  // 1H momentum forecast
  let forecast: 'BULLISH_NEXT_1_4H' | 'BEARISH_NEXT_1_4H' | 'UNDECIDED' = 'UNDECIDED'
  if (tf1H) {
    const above9 = tf1H.close > tf1H.ema9
    const rsi    = tf1H.rsi
    if (bull) {
      if (above9 && tf1H.ema9 > tf1H.ema21 && rsi > 50) {
        forecast = 'BULLISH_NEXT_1_4H'
        lines.push(`1H momentum: turning up — price above EMA9, RSI ${rsi.toFixed(0)}`)
      } else if (!above9 && rsi < 50) {
        forecast = 'BEARISH_NEXT_1_4H'
        lines.push(`1H momentum: pullback in progress — price below EMA9, RSI ${rsi.toFixed(0)}`)
      } else {
        lines.push(`1H momentum: transitioning — waiting for clear directional turn`)
      }
    } else {
      if (!above9 && tf1H.ema9 < tf1H.ema21 && rsi < 50) {
        forecast = 'BEARISH_NEXT_1_4H'
        lines.push(`1H momentum: turning down — price below EMA9, RSI ${rsi.toFixed(0)}`)
      } else if (above9 && rsi > 50) {
        forecast = 'BULLISH_NEXT_1_4H'
        lines.push(`1H momentum: counter-trend bounce active`)
      } else {
        lines.push(`1H momentum: transitioning — waiting for clear bearish turn`)
      }
    }
  }

  return { state, forecast, lines }
}

// ── 1H entry trigger: closed candle pattern detection ────────────────────────
function detect1HPattern(
  mc:    MarketContext | undefined,
  tf1H:  TFData | undefined,    // entry-role TF (1H for intraday, 4H for swing)
  trend: 'BULLISH' | 'BEARISH',
  tf4H?: TFData | undefined,    // structure-role TF (4H for intraday, Daily for swing)
  entryCandlesOverride?: Candle[],
  entryLabel: string = '1H',
): { pattern: string | null; patternType: 'A' | 'B' | null; lines: string[] } {
  if (!mc || !tf1H) return { pattern: null, patternType: null, lines: [`No ${entryLabel} data`] }

  const c3 = entryCandlesOverride ?? mc.last3Candles1H
  if (c3.length < 2) return { pattern: null, patternType: null, lines: [`Insufficient closed ${entryLabel} candles`] }

  const c0 = c3[c3.length - 1]           // most recently closed 1H candle (signal candle)
  const c1 = c3.length >= 2 ? c3[c3.length - 2] : c0
  const c2 = c3.length >= 3 ? c3[c3.length - 3] : c1
  const bull = trend === 'BULLISH'

  // ── Type A: Reversal to continue the trend ────────────────────────────────

  if (bull && isBullEngulf(c1, c0))
    return { pattern: 'Bullish Engulfing', patternType: 'A', lines: [
      `TYPE-A:Bullish Engulfing on last closed 1H candle`,
      `Current candle body engulfs the prior candle — reversal signal, pullback ending, bull trend resuming`
    ]}
  if (!bull && isBearEngulf(c1, c0))
    return { pattern: 'Bearish Engulfing', patternType: 'A', lines: [
      `TYPE-A:Bearish Engulfing on last closed 1H candle`,
      `Current candle body engulfs prior candle — reversal signal, bounce ending, bear trend resuming`
    ]}

  if (bull && isBullPin(c0))
    return { pattern: 'Hammer / Bullish Pin Bar', patternType: 'A', lines: [
      `TYPE-A:Hammer/Pin Bar on last closed 1H candle`,
      `Long lower wick: strong rejection of lower prices — pullback is ending, bull trend resuming`
    ]}
  if (!bull && isBearPin(c0))
    return { pattern: 'Shooting Star / Bearish Pin Bar', patternType: 'A', lines: [
      `TYPE-A:Shooting Star on last closed 1H candle`,
      `Long upper wick: strong rejection of higher prices — bounce ending, bear trend resuming`
    ]}

  if (bull && isBullMaru(c0) && c1.c < c1.o)
    return { pattern: 'Bullish Marubozu', patternType: 'A', lines: [
      `TYPE-A:Bullish Marubozu after bearish pullback candle`,
      `Near-wickless bull candle: clean momentum reversal — trend resuming`
    ]}
  if (!bull && isBearMaru(c0) && c1.c > c1.o)
    return { pattern: 'Bearish Marubozu', patternType: 'A', lines: [
      `TYPE-A:Bearish Marubozu after bullish bounce candle`,
      `Near-wickless bear candle: clean momentum reversal — bear trend resuming`
    ]}

  // ── Type B: Continuation after pullback ───────────────────────────────────

  // Inside bar breakout in trend direction
  if (isInsideBar(c2, c1)) {
    const brkBull = c0.c > c2.h && c0.c > c0.o
    const brkBear = c0.c < c2.l && c0.c < c0.o
    if (bull && brkBull)
      return { pattern: 'Inside Bar Bullish Breakout', patternType: 'B', lines: [
        `TYPE-B:Inside bar breakout to the upside`,
        `Prior 1H candle was an inside bar (consolidation); current candle broke above — bull continuation`
      ]}
    if (!bull && brkBear)
      return { pattern: 'Inside Bar Bearish Breakout', patternType: 'B', lines: [
        `TYPE-B:Inside bar breakout to the downside`,
        `Prior 1H candle was an inside bar; current candle broke below — bear continuation`
      ]}
  }

  // Flag / tight consolidation breakout
  const r0 = c0.h - c0.l, r1 = c1.h - c1.l, r2 = c2.h - c2.l
  const avgR = (r0 + r1 + r2) / 3
  if (r1 < avgR * 0.65 && r2 < avgR * 0.65) {
    if (bull && c0.c > Math.max(c1.h, c2.h) && c0.c > c0.o)
      return { pattern: 'Bull Flag / Consolidation Breakout', patternType: 'B', lines: [
        `TYPE-B:Bull flag / consolidation breakout`,
        `Two compressed candles resolved with upside breakout — bull trend continuation`
      ]}
    if (!bull && c0.c < Math.min(c1.l, c2.l) && c0.c < c0.o)
      return { pattern: 'Bear Flag / Consolidation Breakout', patternType: 'B', lines: [
        `TYPE-B:Bear flag / consolidation breakout`,
        `Two compressed candles resolved with downside breakout — bear trend continuation`
      ]}
  }

  // ── Additional Type A patterns ────────────────────────────────────────────

  // Morning Star (3-candle: bearish + small star + bullish recovery) — bull trend entry
  if (bull && isMorningStar(c2, c1, c0))
    return { pattern: 'Morning Star', patternType: 'A', lines: [
      `TYPE-A:Morning Star on last three closed 1H candles`,
      `Three-candle reversal: bearish candle, small indecision star, strong bullish recovery — pullback ending`
    ]}
  // Evening Star (3-candle: bullish + small star + bearish reversal) — bear trend entry
  if (!bull && isEveningStar(c2, c1, c0))
    return { pattern: 'Evening Star', patternType: 'A', lines: [
      `TYPE-A:Evening Star on last three closed 1H candles`,
      `Three-candle reversal: bullish candle, indecision star, strong bearish reversal — bounce ending`
    ]}

  // Tweezer Bottom (bull) / Top (bear) — two-candle rejection at the same level
  if (bull && isTweezerBottom(c1, c0))
    return { pattern: 'Tweezer Bottom', patternType: 'A', lines: [
      `TYPE-A:Tweezer Bottom on last two closed 1H candles`,
      `Two candles tested same low and rejected — double-tap support, pullback likely ending`
    ]}
  if (!bull && isTweezerTop(c1, c0))
    return { pattern: 'Tweezer Top', patternType: 'A', lines: [
      `TYPE-A:Tweezer Top on last two closed 1H candles`,
      `Two candles tested same high and rejected — double-tap resistance, bounce likely ending`
    ]}

  // Doji at support (bull) / resistance (bear) — indecision + context = reversal signal
  if (isDoji(c0)) {
    const nearSupport = bull && c0.l <= tf1H.ema21 * 1.002  // within 0.2% of EMA21 from below
    const nearResist  = !bull && c0.h >= tf1H.ema21 * 0.998
    if (nearSupport)
      return { pattern: 'Doji at EMA21 Support', patternType: 'A', lines: [
        `TYPE-A:Doji formed at 1H EMA21 support`,
        `Indecision candle right at key support level — balance of power shifting, bull resumption likely`
      ]}
    if (nearResist)
      return { pattern: 'Doji at EMA21 Resistance', patternType: 'A', lines: [
        `TYPE-A:Doji formed at 1H EMA21 resistance`,
        `Indecision candle right at key resistance — balance of power shifting, bear resumption likely`
      ]}
  }

  // ── Additional Type B patterns ────────────────────────────────────────────

  // Three Soldiers / Three Crows — sustained momentum shift
  if (bull && isThreeSoldiers(c2, c1, c0))
    return { pattern: 'Three White Soldiers', patternType: 'B', lines: [
      `TYPE-B:Three White Soldiers on last three closed 1H candles`,
      `Three consecutive higher-closing bullish candles — sustained momentum shift, bull trend resuming`
    ]}
  if (!bull && isThreeCrows(c2, c1, c0))
    return { pattern: 'Three Black Crows', patternType: 'B', lines: [
      `TYPE-B:Three Black Crows on last three closed 1H candles`,
      `Three consecutive lower-closing bearish candles — sustained momentum shift, bear trend resuming`
    ]}

  // ── Momentum candle fallback (weakest valid entry) ────────────────────────
  // Last closed candle is in trend direction after at least one counter-trend candle.
  // Lowest confidence but still a valid Type B entry — momentum returning to trend.
  const prevCounterTrend = bull ? c1.c < c1.o : c1.c > c1.o
  const c0InTrend        = bull ? c0.c > c0.o && (c0.c - c0.o) > (c0.h - c0.l) * 0.35
                                : c0.c < c0.o && (c0.o - c0.c) > (c0.h - c0.l) * 0.35
  if (prevCounterTrend && c0InTrend)
    return { pattern: 'Momentum Return Candle', patternType: 'B', lines: [
      `TYPE-B:Momentum return candle after pullback`,
      `Prior candle was counter-trend; current closed ${bull ? 'bullish' : 'bearish'} with body ≥35% of range — momentum returning to ${trend.toLowerCase()} direction`
    ]}

  // ── NEUTRAL 1H ENTRIES: 4H trend dominant — 1H consolidating/pausing ────────
  // These fire when all standard patterns fail but 4H is strongly aligned.
  // They represent the institutional "patience" phase — price is coiling before
  // resuming the dominant 4H trend. All are Type B (continuation).

  const s4H = tf4H?.signal ?? ''
  const strongly4H = bull
    ? (s4H === 'STRONG BUY' || s4H === 'BUY')
    : (s4H === 'STRONG SELL' || s4H === 'SELL')

  if (strongly4H) {
    const bodyC0 = Math.abs(c0.c - c0.o)
    const rangeC0 = c0.h - c0.l
    const rangeC1 = c1.h - c1.l
    const rangeC2 = c2.h - c2.l
    const avgRange = (rangeC0 + rangeC1 + rangeC2) / 3
    const sig1H = tf1H.signal

    // 1. EMA Compression Coil — EMA9 and EMA21 squeezing (within 0.6% of each other on 1H)
    //    Threshold widened from 0.3% to 0.6%: crypto 1H EMAs don't compress as tightly as forex
    //    Price proximity filter removed: when EMAs are coiling, price oscillates around both
    if (tf1H.ema9 > 0 && tf1H.ema21 > 0) {
      const emaGap = Math.abs(tf1H.ema9 - tf1H.ema21) / tf1H.ema21
      if (emaGap < 0.006) {
        return { pattern: 'EMA Compression Coil', patternType: 'B', lines: [
          `TYPE-B:EMA Compression Coil: 1H EMA9/EMA21 within ${(emaGap * 100).toFixed(2)}% of each other`,
          `EMAs squeezing on 1H while 4H is ${s4H} — energy building for ${bull ? 'bullish' : 'bearish'} breakout in dominant trend direction`,
        ]}
      }
    }

    // 2. Range Compression — c0 range ≤ 70% of average (loosened from 55%)
    //    Close ratio: top 45% for bull (loosened from 60%), bottom 45% for bear
    //    Neutral candles often close near midpoint — 55% threshold was too aggressive
    if (rangeC0 > 0 && rangeC0 <= avgRange * 0.70) {
      const closeRatio = (c0.c - c0.l) / rangeC0
      const bullishClose = closeRatio >= 0.45   // closed in upper half of range
      const bearishClose = closeRatio <= 0.55   // closed in lower half of range
      if (bull && bullishClose)
        return { pattern: 'Bullish Range Compression', patternType: 'B', lines: [
          `TYPE-B:Bullish Range Compression: 1H range is ${((rangeC0 / avgRange) * 100).toFixed(0)}% of avg, close at ${(closeRatio * 100).toFixed(0)}% of range`,
          `Compressed 1H candle holding upper half of range within the 4H ${s4H} trend — consolidation before continuation`,
        ]}
      if (!bull && bearishClose)
        return { pattern: 'Bearish Range Compression', patternType: 'B', lines: [
          `TYPE-B:Bearish Range Compression: 1H range is ${((rangeC0 / avgRange) * 100).toFixed(0)}% of avg, close at ${(closeRatio * 100).toFixed(0)}% of range`,
          `Compressed 1H candle holding lower half of range within the 4H ${s4H} trend — consolidation before continuation`,
        ]}
    }

    // 3. Higher-TF Dominance Pause — body ≤ 40% of range (loosened from 25%)
    //    EMA21 proximity loosened: low within 1% of EMA21 (was 0.3%) — neutral candles
    //    often dip slightly below EMA21 before the trend resumes
    if (rangeC0 > 0 && bodyC0 / rangeC0 <= 0.40) {
      const pauseAboveEMA = bull && c0.l > tf1H.ema21 * 0.990   // low stayed within 1% of EMA21
      const pauseBelowEMA = !bull && c0.h < tf1H.ema21 * 1.010
      if (pauseAboveEMA)
        return { pattern: '4H Trend Continuation — 1H Pause Above EMA21', patternType: 'B', lines: [
          `TYPE-B:Higher-TF Dominance: 1H formed a pause candle (body ${((bodyC0 / rangeC0) * 100).toFixed(0)}% of range) near EMA21`,
          `Price consolidating above EMA21 within the 4H ${s4H} trend — this pause is the institutional entry zone`,
        ]}
      if (pauseBelowEMA)
        return { pattern: '4H Trend Continuation — 1H Pause Below EMA21', patternType: 'B', lines: [
          `TYPE-B:Higher-TF Dominance: 1H formed a pause candle (body ${((bodyC0 / rangeC0) * 100).toFixed(0)}% of range) near EMA21`,
          `Price consolidating below EMA21 within the 4H ${s4H} trend — this pause is the institutional entry zone`,
        ]}
    }

    // 4. Doji at key structural level (pivot, prev day high/low, swing high/low)
    if (isDoji(c0) && mc) {
      const levels = [mc.prevDayHigh, mc.prevDayLow, mc.swingHigh, mc.swingLow]
      const atLevel = levels.some(lvl => lvl > 0 && Math.abs(c0.c - lvl) / lvl < 0.003)
      if (atLevel) {
        const nearSup = bull && (c0.l <= mc.prevDayLow * 1.003 || c0.l <= mc.swingLow * 1.003)
        const nearRes = !bull && (c0.h >= mc.prevDayHigh * 0.997 || c0.h >= mc.swingHigh * 0.997)
        if (nearSup || (!nearSup && !nearRes))
          return { pattern: bull ? 'Doji at Key Support Level' : 'Doji at Key Resistance Level', patternType: 'B', lines: [
            `TYPE-B:Doji at structural key level within 0.3% of ${bull ? 'support' : 'resistance'}`,
            `Indecision candle at institutional price memory — 4H ${s4H} context makes this a ${bull ? 'bullish' : 'bearish'} continuation entry`,
          ]}
      }
    }

    // 5. CONDITIONAL FALLBACK — 4H Trend Dominance + 1H genuinely neutral
    //    Fires only when 1H is NEUTRAL (consolidating), not when 1H is already BUY/STRONG BUY.
    //    If 1H is strongly aligned, the setup is CONTINUATION (no pullback) — not an entry trigger.
    //    1H NEUTRAL = the 4H trend is pausing on the entry timeframe, which IS a valid entry.
    //    It is the lowest-quality Type B — signal only, no high conviction.
    const sig1HNeutral = sig1H === 'NEUTRAL'
    if (sig1HNeutral) {
      const location = bull
        ? c0.c >= tf1H.ema21 ? 'above EMA21 support' : 'near EMA21 — tight range expected'
        : c0.c <= tf1H.ema21 ? 'below EMA21 resistance' : 'near EMA21 — tight range expected'
      return { pattern: `4H ${s4H} — 1H Neutral Consolidation`, patternType: 'B', lines: [
        `TYPE-B:4H Trend Dominance: 4H is ${s4H} while 1H (${sig1H}) is consolidating`,
        `1H pausing within the 4H trend — ${location}. Consolidation is the entry setup. Use tight stop and target TP1 first.`,
      ]}
    }
  }

  return { pattern: null, patternType: null, lines: [
    `No qualifying entry pattern on last closed 1H candle`,
    `Monitoring for: Engulfing, Pin Bar, Marubozu, Doji, Tweezer, Morning/Evening Star, Three Soldiers/Crows, Flag, Momentum Return candle`
  ]}
}

// ── Reversal risk: 4H + daily both signalling reversal (continuous check) ────
function detectReversalRisk(
  tf4H: TFData | undefined,
  tfD:  TFData | undefined,
  trend: 'BULLISH' | 'BEARISH',
): { confirmed: boolean; lines: string[] } {
  if (!tf4H || !tfD) return { confirmed: false, lines: [] }

  const c4 = tf4H.candles
  const cD = tfD.candles
  if (c4.length < 3 || cD.length < 2) return { confirmed: false, lines: [] }

  const last4H = c4[c4.length - 1], prev4H = c4[c4.length - 2]
  const lastD  = cD[cD.length - 1], prevD  = cD[cD.length - 2]
  const bull   = trend === 'BULLISH'

  // Trigger 1: 4H reversal pattern against the current trend
  const engulf4H = bull ? isBearEngulf(prev4H, last4H) : isBullEngulf(prev4H, last4H)

  // Double top / bottom: two similar extremes in last 5 bars + rejection
  let doublePattern = false
  if (c4.length >= 5) {
    const sl = c4.slice(-5)
    if (bull) {
      const h1 = Math.max(sl[0].h, sl[1].h, sl[2].h)
      const h2 = Math.max(sl[2].h, sl[3].h, sl[4].h)
      if (h1 > 0 && Math.abs(h1 - h2) / h1 < 0.003 && last4H.c < last4H.o) doublePattern = true
    } else {
      const l1 = Math.min(sl[0].l, sl[1].l, sl[2].l)
      const l2 = Math.min(sl[2].l, sl[3].l, sl[4].l)
      if (l1 > 0 && Math.abs(l1 - l2) / l1 < 0.003 && last4H.c > last4H.o) doublePattern = true
    }
  }

  // Swing point break: last candle closed beyond recent swing extreme
  const recentSwingLow  = Math.min(...c4.slice(-4, -1).map((c: Candle) => c.l))
  const recentSwingHigh = Math.max(...c4.slice(-4, -1).map((c: Candle) => c.h))
  const swingBreak = bull
    ? last4H.c < recentSwingLow  * 0.9995
    : last4H.c > recentSwingHigh * 1.0005

  const has4HTrigger = engulf4H || doublePattern || swingBreak

  // Trigger 2: fully closed daily engulfing candle in same reversal direction
  const hasDailyEngulf = bull ? isBearEngulf(prevD, lastD) : isBullEngulf(prevD, lastD)

  if (has4HTrigger && hasDailyEngulf) {
    const reason4H = engulf4H ? '4H engulfing against trend' : doublePattern ? '4H double top/bottom' : '4H swing point broken'
    return {
      confirmed: true,
      lines: [
        `Reversal risk: ${reason4H} + daily ${bull ? 'bearish' : 'bullish'} engulfing confirmed — both timeframes signalling ${bull ? 'bearish' : 'bullish'} reversal`,
        `${trend} bias remains while lower TFs hold, but position size should be reduced and TP1 prioritised`,
      ]
    }
  }

  return { confirmed: false, lines: [] }
}

// ── Structural TP targeting ───────────────────────────────────────────────────
// TPs are set at actual structural levels (S/R, PDH/PDL, swing H/L) rather than
// pure ATR multiples. ATR-derived values are used as minimum fallbacks only.
// Minimum R-multiples ensure we never take profits before a reasonable reward threshold.
/** [min, max] R-multiples for each TP — bounds that must be respected. */
export type TPBound = [min: number, max: number]
export interface TPBoundSet { tp1: TPBound; tp2: TPBound; tp3: TPBound }

/**
 * Structure-first TP picker.
 *
 * For each TP slot:
 *   1. Build the structural candidate list (resistances/supports + extras).
 *   2. Filter to levels whose R-distance lies inside the slot's [min, max] window.
 *   3. Pick the CLOSEST qualifying level (nearest structure beyond the minimum).
 *   4. If nothing structural fits, fall back to the slot's *min* R-multiple —
 *      a tight, reachable target rather than the old behaviour of jumping to
 *      the arbitrary central R-value.
 *   5. Enforce strict ordering: each subsequent TP must be beyond the previous.
 *
 * This is the fix for "TPs sit at arbitrary R-multiples instead of where price
 * actually has structure to react against." Now Claude's intent (pick from
 * structure) and the formula's intent (respect R-bounds) are aligned.
 */
function computeStructuralTPs(
  direction:  'BUY' | 'SELL',
  entryHigh:  number,
  entryLow:   number,
  risk:       number,
  bounds:     TPBoundSet,
  kl:         FMTraderRequest['keyLevels'],
  mc:         MarketContext | undefined | null,
  dec:        number,
  extraLevels: number[] = [],
  excludeIntradayLevels = false,
): { tp1: number; tp2: number; tp3: number } {
  if (risk <= 0) {
    return {
      tp1: round(direction === 'BUY' ? entryHigh * 1.005 : entryLow * 0.995, dec),
      tp2: round(direction === 'BUY' ? entryHigh * 1.010 : entryLow * 0.990, dec),
      tp3: round(direction === 'BUY' ? entryHigh * 1.015 : entryLow * 0.985, dec),
    }
  }

  const isBuy = direction === 'BUY'
  const refEntry = isBuy ? entryHigh : entryLow

  // R-distance helper — positive number for both BUY and SELL
  const rDist = (price: number) => Math.abs(price - refEntry) / risk

  // Candidate pool: only levels in the trade direction beyond entry
  const allLevels = [
    isBuy ? kl.resistance1 : kl.support1,
    isBuy ? kl.resistance2 : kl.support2,
    excludeIntradayLevels ? 0 : (isBuy ? (mc?.prevDayHigh ?? 0) : (mc?.prevDayLow  ?? 0)),
    excludeIntradayLevels ? 0 : (isBuy ? (mc?.swingHigh   ?? 0) : (mc?.swingLow    ?? 0)),
    ...extraLevels,
  ]

  // Filter to levels in the right direction with sane distance, sort by R-distance ascending
  const levels = allLevels
    .filter(l => l > 0)
    .filter(l => (isBuy ? l > refEntry : l < refEntry))
    .map(l => ({ price: l, r: rDist(l) }))
    .sort((a, b) => a.r - b.r)

  // Pick closest level whose R lies in [min, max] and is beyond `afterPrice`
  const pickForSlot = (slot: TPBound, afterPrice: number | null): number => {
    const [minR, maxR] = slot
    const hit = levels.find(l => {
      if (l.r < minR || l.r > maxR) return false
      if (afterPrice === null) return true
      return isBuy ? l.price > afterPrice * 1.0005 : l.price < afterPrice * 0.9995
    })
    if (hit) return hit.price
    // No structure fits this slot — fall back to the *min* R (tight, reachable),
    // not the average. Better an aggressive TP user can move up than a TP that
    // never gets reached.
    const fallback = isBuy ? refEntry + minR * risk : refEntry - minR * risk
    // Still enforce ordering vs previous TP
    if (afterPrice !== null) {
      return isBuy
        ? Math.max(fallback, afterPrice + risk * 0.1)
        : Math.min(fallback, afterPrice - risk * 0.1)
    }
    return fallback
  }

  const tp1 = pickForSlot(bounds.tp1, null)
  const tp2 = pickForSlot(bounds.tp2, tp1)
  const tp3 = pickForSlot(bounds.tp3, tp2)

  return {
    tp1: round(tp1, dec),
    tp2: round(tp2, dec),
    tp3: round(tp3, dec),
  }
}

// Extract fractal swing highs/lows from a candle series (5-bar fractal):
// a swing high is a bar whose high is strictly greater than both 2 neighbours each side.
function extractSwingExtremes(
  candles: Candle[],
  kind: 'high' | 'low',
  maxOut = 6,
): number[] {
  if (candles.length < 5) return []
  const out: number[] = []
  for (let i = 2; i < candles.length - 2; i++) {
    if (kind === 'high') {
      if (candles[i].h > candles[i-1].h && candles[i].h > candles[i-2].h
        && candles[i].h > candles[i+1].h && candles[i].h > candles[i+2].h) {
        out.push(candles[i].h)
      }
    } else {
      if (candles[i].l < candles[i-1].l && candles[i].l < candles[i-2].l
        && candles[i].l < candles[i+1].l && candles[i].l < candles[i+2].l) {
        out.push(candles[i].l)
      }
    }
  }
  // Last `maxOut` (most recent extremes are most relevant as TP magnets)
  return out.slice(-maxOut)
}

// ── Fresh level recalculation from current price ──────────────────────────────
// Used when serving a cached decision/narrative so entry/SL/TP always reflect
// the live price rather than the price at the time the analysis was first generated.
//
// Branches by horizon:
//   intraday: 1H pattern candle, 1H+Wilder blended ATR, tight SL (~0.2 ATR), TPs 1.5/3/5 R
//   swing:    4H pattern candle, Daily ATR, wide SL (~0.5 ATR daily), TPs 2.5/4.5/8 R,
//             structural anchors from Daily AND Weekly swing highs/lows
function recalcLevels(
  body:       FMTraderRequest,
  decision:   'BUY' | 'SELL',
  setupGrade: 'A' | 'B' | 'C' = 'B',
  // Per-pair empirical tuning — multipliers on TP bounds + SL floor/ceiling.
  // null = use static bounds (no historical data yet). Caller is responsible
  // for looking this up via `getPairTuning(slug, horizon)`.
  tuning?: { tp1Mult: number; tp2Mult: number; tp3Mult: number; slFloorMult: number; slCeilingMult: number } | null,
): { entryLow: number; entryHigh: number; stopLoss: number; tp1: number; tp2: number; tp3: number; rrRatio: string } {
  const dec        = dp(body.price)
  const price      = body.price
  const kl         = body.keyLevels
  const atr        = calcATR(body)
  const atr14Post  = effectiveATR(body, atr.atrProxy)
  const ewp        = atr.entryWidthPct
  const spreadBuf  = body.category === 'forex' ? price * 0.00015 : price * 0.0004
  const horizon    = body.tradeHorizon ?? 'intraday'
  const swing      = horizon === 'swing'

  // Per-horizon entry TF + anchor candle
  const tf1H       = body.timeframes.find(t => t.key === '1h')
  const tf4H       = body.timeframes.find(t => t.key === '4h')
  const tfDaily    = body.timeframes.find(t => t.key === 'daily')
  const tfWeekly   = body.timeframes.find(t => t.key === 'weekly')
  const tfEntry    = swing ? tf4H : tf1H

  const entryEMA9  = tfEntry?.ema9 ?? price
  const entryLowFb = tfEntry?.low  ?? price * 0.995
  const entryHghFb = tfEntry?.high ?? price * 1.005

  // Per-horizon ATR for SL/entry-width sizing
  const dailyCandles  = tfDaily?.candles ?? []
  const fourHCandles  = tf4H?.candles ?? []
  const oneHCandles   = tf1H?.candles ?? []
  const atr1H         = calcTFATR(oneHCandles)
  const atr4H         = calcTFATR(fourHCandles)
  const atrDaily      = calcTFATR(dailyCandles) || atr14Post * 5   // fallback if daily ATR unavailable

  // Intraday: blend 1H ATR with the daily-proxy (existing behaviour)
  // Swing:    blend 4H ATR with the true Daily ATR — gives realistic swing-trade noise width
  const blendedATR = swing
    ? (atr4H > 0 ? atr4H * 0.4 + atrDaily * 0.6 : atrDaily)
    : (atr1H > 0 ? atr1H * 0.6 + atr14Post * 0.4 : atr14Post)

  // Pattern (signal) candle — 1H for intraday, last closed 4H for swing
  const signalCandle      = swing
    ? (body.marketContext?.last3Candles4H?.[body.marketContext.last3Candles4H.length - 1] ?? null)
    : (body.marketContext?.prevClosed1H ?? null)
  const patternCandleLow  = signalCandle && signalCandle.l > 0 ? signalCandle.l : entryLowFb
  const patternCandleHigh = signalCandle && signalCandle.h > 0 ? signalCandle.h : entryHghFb

  // SL multiplier — tight, reachable-target-friendly distances.
  const slMult = swing
    ? (setupGrade === 'A' ? 0.40 : setupGrade === 'B' ? 0.55 : 0.75)
    : (setupGrade === 'A' ? 0.18 : setupGrade === 'B' ? 0.22 : 0.28)

  // Max-width SL cap
  const slCapMult = swing ? 3.0 : 1.5

  // Entry-zone width
  const entryWidthLow  = swing ? ewp * 1.6 : ewp
  const entryWidthHigh = swing ? ewp * 0.7 : ewp * 0.4

  // TP bounds — [min, max] R-multiples per slot. Static "anchor" values that
  // pair tuning (when available) nudges by up to ±30% based on hit-rate history.
  // Same downstream numbers used by the Claude clamp so formula + Claude paths
  // stay in lockstep.
  const staticTpBounds: TPBoundSet = swing
    ? { tp1: [1.5, 3.5], tp2: [2.5, 6.0], tp3: [3.5, 9.0] }
    : { tp1: [1.0, 2.5], tp2: [1.5, 4.0], tp3: [2.0, 6.0] }
  const tpBounds: TPBoundSet = tuning ? {
    tp1: [staticTpBounds.tp1[0] * tuning.tp1Mult, staticTpBounds.tp1[1] * tuning.tp1Mult],
    tp2: [staticTpBounds.tp2[0] * tuning.tp2Mult, staticTpBounds.tp2[1] * tuning.tp2Mult],
    tp3: [staticTpBounds.tp3[0] * tuning.tp3Mult, staticTpBounds.tp3[1] * tuning.tp3Mult],
  } : staticTpBounds

  // Swing-mode TP anchors — pull from Daily and Weekly fractal swing extremes
  // (these are the levels institutions actually target on multi-day holds).
  // We INTENTIONALLY ignore prevDayHigh/Low and the 20-bar swing for swing trades
  // because those are too close — a swing TP should reach prior-week/month structure.
  const swingTPAnchors = swing
    ? [
        ...extractSwingExtremes(dailyCandles,  decision === 'BUY' ? 'high' : 'low', 6),
        ...extractSwingExtremes(tfWeekly?.candles ?? [], decision === 'BUY' ? 'high' : 'low', 4),
        // Recent absolute extremes also count
        ...(dailyCandles.length ? [decision === 'BUY' ? Math.max(...dailyCandles.slice(-30).map(c => c.h)) : Math.min(...dailyCandles.slice(-30).map(c => c.l))] : []),
      ]
    : []

  let entryLow: number, entryHigh: number, stopLoss: number
  let tp1: number, tp2: number, tp3: number

  // Entry-anchor drift cap — matches the same bound applied at the Claude
  // merge step. Keeps the "wait for retest at EMA9" entry concept while
  // preventing the zone from sitting >1×ATR (intraday) / >1.5×ATR (swing)
  // from current price — beyond that, fills get rare within the validity window.
  const entryDriftCap = blendedATR * (swing ? 1.5 : 1.0)

  if (decision === 'BUY') {
    const rawAnchor     = Math.min(price, entryEMA9)
    const clampedAnchor = Math.max(rawAnchor, price - entryDriftCap)
    const entryMid      = clampedAnchor + spreadBuf
    entryLow  = round(entryMid * (1 - entryWidthLow), dec)
    entryHigh = round(entryMid * (1 + entryWidthHigh), dec)
    const patternStop  = patternCandleLow - blendedATR * slMult - spreadBuf
    const maxWidthStop = entryLow - blendedATR * slCapMult
    stopLoss = round(Math.max(patternStop, maxWidthStop), dec)
    const risk = entryHigh - stopLoss
    ;({ tp1, tp2, tp3 } = computeStructuralTPs(
      'BUY', entryHigh, entryLow, risk, tpBounds, kl, body.marketContext, dec,
      swingTPAnchors, /* excludeIntradayLevels */ swing,
    ))
  } else {
    const rawAnchor     = Math.max(price, entryEMA9)
    const clampedAnchor = Math.min(rawAnchor, price + entryDriftCap)
    const entryMid      = clampedAnchor - spreadBuf
    entryHigh = round(entryMid * (1 + entryWidthLow), dec)
    entryLow  = round(entryMid * (1 - entryWidthHigh), dec)
    const patternStop  = patternCandleHigh + blendedATR * slMult + spreadBuf
    const maxWidthStop = entryHigh + blendedATR * slCapMult
    stopLoss = round(Math.min(patternStop, maxWidthStop), dec)
    const risk = stopLoss - entryLow
    ;({ tp1, tp2, tp3 } = computeStructuralTPs(
      'SELL', entryHigh, entryLow, risk, tpBounds, kl, body.marketContext, dec,
      swingTPAnchors, /* excludeIntradayLevels */ swing,
    ))
  }

  const riskPips = decision === 'BUY' ? entryHigh - stopLoss : stopLoss - entryLow
  const rrNum    = riskPips > 0 ? Math.abs(tp2 - (decision === 'BUY' ? entryHigh : entryLow)) / riskPips : 0
  const rrRatio  = riskPips > 0 ? `1:${rrNum.toFixed(1)}` : '—'

  return { entryLow, entryHigh, stopLoss, tp1, tp2, tp3, rrRatio }
}

// ── NO TRADE builder ──────────────────────────────────────────────────────────
function noTrade(
  d:        FMTraderRequest,
  slotMeta: ReturnType<typeof findSlot>,
  atr:      ReturnType<typeof calcATR>,
  dec:      number,
  reasons:  string[],
  bias:     string,
  conf      = 0,
): FMTraderResponse {
  const kl     = d.keyLevels
  const ewp    = atr.entryWidthPct
  const safeConf = Math.max(0, Math.round(conf))
  return {
    decision:           'NO TRADE',
    confidence:         safeConf,
    entryZone:          [round(d.price * (1 - ewp), dec), round(d.price * (1 + ewp), dec)],
    stopLoss:           round(kl.support1, dec),
    tp1:                round(kl.resistance1, dec),
    tp2:                round(kl.resistance2, dec),
    tp3:                round(kl.resistance2 * 1.003, dec),
    rrRatio:            '—',
    timeValidity:       d.tradeHorizon === 'swing'
      ? `Valid for up to 7 days — swing trade, session timing ignored`
      : `Valid for the ${slotMeta.label} hour (${slotMeta.name})`,
    thesis:             reasons[0] ?? 'Entry conditions not met.',
    technicalBreakdown: reasons.filter(Boolean).join('\n'),
    riskFactors:        ['Standing aside — insufficient multi-timeframe confluence for a tradeable setup'],
    sessionContext:     buildSessionContext(d, slotMeta, dec),
    marketBias:         `${d.display}: ${bias}`,
    traderNote:         buildTraderNote(d, 'NO TRADE', safeConf, dec),
    generatedAt:        Date.now(),
  }
}

// ── Main signal engine ────────────────────────────────────────────────────────
export function runAnalysis(d: FMTraderRequest): FMTraderResponse {
  const dec      = dp(d.price)
  const slotMeta = findSlot(d.sessionSlot)
  const atr      = calcATR(d)

  // ── Trade-horizon TF re-aim ────────────────────────────────────────────────
  //   intraday: entry=1H, structure=4H, macroP=Daily, macroS=Weekly
  //   swing:    entry=4H, structure=Daily, macroP=Weekly, macroS=none
  // The variable names below (tf1H/tf4H/tfD/tfW) refer to ROLES, not raw TFs.
  // LBL_ENTRY / LBL_STRUCT / LBL_MACRO are used in user-visible text.
  const horizon = d.tradeHorizon ?? 'intraday'
  const swing   = horizon === 'swing'
  const LBL_ENTRY  = swing ? '4H'     : '1H'
  const LBL_STRUCT = swing ? 'Daily'  : '4H'
  const LBL_MACRO  = swing ? 'Weekly' : 'Daily'

  // Raw TF data (validated EMAs)
  const rawW  = d.timeframes.find(t => t.key === 'weekly')
  const rawD  = d.timeframes.find(t => t.key === 'daily')   ? validateAndCorrectTF(d.timeframes.find(t => t.key === 'daily')!)   : undefined
  const raw4H = d.timeframes.find(t => t.key === '4h')      ? validateAndCorrectTF(d.timeframes.find(t => t.key === '4h')!)      : undefined
  const raw1H = d.timeframes.find(t => t.key === '1h')      ? validateAndCorrectTF(d.timeframes.find(t => t.key === '1h')!)      : undefined

  // Role assignment — swing shifts each role up one rung.
  // (We keep the original variable names so the body of runAnalysis can stay
  // unchanged; they now represent ROLES rather than literal timeframes.)
  const tfW   = swing ? undefined : rawW   // macroS — no role above Weekly for swing
  const tfD   = swing ? rawW      : rawD
  const tf4H  = swing ? rawD      : raw4H
  const tf1H  = swing ? raw4H     : raw1H

  // Short TFs (30m/15m) are intraday-only refinement; skip in swing
  const tf30m = swing ? undefined : d.timeframes.find(t => t.key === '30m')
  const tf15m = swing ? undefined : d.timeframes.find(t => t.key === '15m')
  const mc    = d.marketContext

  // Weekend guard (non-crypto)
  const now = new Date()
  const weekend = (now.getUTCDay() === 0 || now.getUTCDay() === 6) && d.category !== 'crypto'
  if (weekend) return noTrade(d, slotMeta, atr, dec,
    ['Markets closed on weekend — no trade'], 'Weekend — markets closed', 5)

  // ── Step 1: Higher-timeframe macro trend ─────────────────────────────────
  const macro = analyzeHigherTimeframes(tfW, tfD)

  // ── Step 2: Resolve direction when weekly/daily disagree ─────────────────
  // Three scenarios:
  //   dailyCross    — daily is a counter-trend bounce; weekly + 4H + 1H agree (3/4 TFs)
  //   weeklyCross   — weekly is the lone outlier; daily + 4H + 1H agree (3/4 TFs)
  //   intradayOnly  — weekly/daily conflict; only 4H gives working direction
  //   macroConflict — genuine all-timeframe conflict; no reliable direction exists
  let intradayOnly    = false
  let dailyCross      = false
  let weeklyCross     = false
  let macroConflict   = false
  let macroConflictReason = ''

  if (macro.trend === 'NEUTRAL') {
    const s4H = tf4H?.signal, s1H = tf1H?.signal
    const has4HBull = s4H === 'STRONG BUY'  || s4H === 'BUY'
    const has4HBear = s4H === 'STRONG SELL' || s4H === 'SELL'

    const weeklyBearAnd4H1HBear = macro.weeklyBias === 'BEARISH' && has4HBear
      && (s1H === 'STRONG SELL' || s1H === 'SELL')
    const weeklyBullAnd4H1HBull = macro.weeklyBias === 'BULLISH' && has4HBull
      && (s1H === 'STRONG BUY'  || s1H === 'BUY')

    if (weeklyBearAnd4H1HBear || weeklyBullAnd4H1HBull) {
      // 3 TFs agree; daily is a failed retracement against the dominant flow
      dailyCross = true
    } else {
      // Mirror case: daily + 4H + 1H all agree; weekly is the lone counter-trend outlier
      const dailyBullAnd4H1HBull = macro.dailyBias === 'BULLISH' && has4HBull
        && (s1H === 'STRONG BUY' || s1H === 'BUY')
      const dailyBearAnd4H1HBear = macro.dailyBias === 'BEARISH' && has4HBear
        && (s1H === 'STRONG SELL' || s1H === 'SELL')

      if (dailyBullAnd4H1HBull || dailyBearAnd4H1HBear) {
        weeklyCross = true  // 3-TF consensus; weekly is the outlier
      } else {
        const s1HNotOpposing = has4HBull
          ? s1H !== 'STRONG SELL' && s1H !== 'SELL'
          : s1H !== 'STRONG BUY'  && s1H !== 'BUY'
        const notLateSession = d.category === 'crypto'
          || (d.sessionSlot !== '20' && d.sessionSlot !== '21')

        if ((has4HBull || has4HBear) && s1HNotOpposing && notLateSession) {
          intradayOnly = true
        } else {
          macroConflict = true
          macroConflictReason = !has4HBull && !has4HBear
            ? 'Weekly/daily conflict and 4H is also undecided — no reliable intraday direction'
            : !s1HNotOpposing
            ? `Weekly/daily conflict and 1H (${s1H}) opposes 4H (${s4H}) — all timeframes disagree`
            : 'Weekly/daily conflict in a low-liquidity session — no institutional backing'
        }
      }
    }
  }

  // Lower-TF counter-trend override: macro confirmed direction but intraday TFs actively
  // oppose it — working off the actual intraday direction is more honest than forcing macro.
  // Two triggers:
  //   A. Both 4H and 1H signal actively oppose macro (EMA-based — clear flip)
  //   B. 4H EMA is lagging (NEUTRAL) but 1H is STRONGLY opposing — EMA hasn't caught up yet
  //      yet the 1H entry timeframe has clearly turned. This prevents the system from locking
  //      into an impossible direction and returning NO TRADE when a clear intraday opportunity exists.
  if (macro.trend !== 'NEUTRAL' && !intradayOnly && !dailyCross) {
    const _s4H = tf4H?.signal, _s1H = tf1H?.signal
    const lowerTFsOpposeM = macro.trend === 'BEARISH'
      ? ((_s4H === 'STRONG BUY'  || _s4H === 'BUY')  && (_s1H === 'STRONG BUY'  || _s1H === 'BUY'))
        || (_s4H === 'NEUTRAL' && _s1H === 'STRONG BUY')
      : ((_s4H === 'STRONG SELL' || _s4H === 'SELL') && (_s1H === 'STRONG SELL' || _s1H === 'SELL'))
        || (_s4H === 'NEUTRAL' && _s1H === 'STRONG SELL')
    if (lowerTFsOpposeM) intradayOnly = true
  }

  // Working direction: macro (confirmed) → 4H → 1H → weekly
  const trend: 'BULLISH' | 'BEARISH' = (macro.trend !== 'NEUTRAL' && !intradayOnly)
    ? (macro.trend as 'BULLISH' | 'BEARISH')
    : (tf4H?.signal === 'STRONG BUY'  || tf4H?.signal === 'BUY')  ? 'BULLISH'
    : (tf4H?.signal === 'STRONG SELL' || tf4H?.signal === 'SELL') ? 'BEARISH'
    : (tf1H?.signal === 'STRONG BUY'  || tf1H?.signal === 'BUY')  ? 'BULLISH'
    : (tf1H?.signal === 'STRONG SELL' || tf1H?.signal === 'SELL') ? 'BEARISH'
    : macro.weeklyBias === 'BULLISH' ? 'BULLISH' : 'BEARISH'

  // ── Step 3: 4H market structure ───────────────────────────────────────────
  const structure   = classify4HStructure(tf4H, tf1H, trend)
  const isMicroPull = structure.state === 'MICRO_PULLBACK'

  // 4H reversal candle present but 1H has NOT confirmed — likely failed reversal
  const unconfirmedReversal = structure.state === 'REVERSAL_WARNING' && (
    trend === 'BULLISH'
      ? tf1H?.signal === 'BUY' || tf1H?.signal === 'STRONG BUY'
      : tf1H?.signal === 'SELL' || tf1H?.signal === 'STRONG SELL'
  )

  // 4H reversal candle + 1H also confirming reversal — both lower TFs against trend
  const bothTFsReversing = structure.state !== 'PULLBACK' && !isMicroPull &&
    !unconfirmedReversal && structure.state !== 'CONTINUATION' && structure.state !== 'NEUTRAL'

  // ── Step 4: 1H entry trigger ──────────────────────────────────────────────
  // Entry pattern uses the entry-role TF (1H intraday, 4H swing)
  const entryCandlesForPattern = swing ? (mc?.last3Candles4H ?? []) : undefined
  const entrySignal = detect1HPattern(mc, tf1H, trend, tf4H, entryCandlesForPattern, LBL_ENTRY)
  const noPattern   = !entrySignal.pattern

  // ── Step 5: Reversal risk check (4H + daily both confirming reversal) ─────
  const revRisk     = detectReversalRisk(tf4H, tfD, trend)
  let fullReversal  = false
  if (revRisk.confirmed) {
    const s4H = tf4H?.signal, s1H = tf1H?.signal
    const lowerHold = trend === 'BULLISH'
      ? (s4H === 'STRONG BUY' || s4H === 'BUY') && (s1H === 'STRONG BUY' || s1H === 'BUY')
      : (s4H === 'STRONG SELL' || s4H === 'SELL') && (s1H === 'STRONG SELL' || s1H === 'SELL')
    if (!lowerHold) fullReversal = true
  }

  const decision: 'BUY' | 'SELL' = trend === 'BULLISH' ? 'BUY' : 'SELL'

  // ── Step 6: Institutional analysis modules ────────────────────────────────
  const candlesFor4H = tf4H?.candles ?? []
  const candlesFor1H = tf1H?.candles ?? []
  const regime       = detectRegime(candlesFor4H.length >= 14 ? candlesFor4H : candlesFor1H)
  const confluence   = calcMultiTFConfluence(d.timeframes, trend)
  const divergence   = detectDivergence(candlesFor4H, trend)
  const sweep        = detectLiquiditySweep(candlesFor1H, trend)
  const swHigh = mc?.swingHigh ?? 0, swLow = mc?.swingLow ?? 0
  const pdZone       = getPDZone(swHigh, swLow, d.price, trend)
  const orderBlock   = detectOrderBlock(candlesFor1H, trend)
  // Smart Money additions
  const fvg          = detectFairValueGap(candlesFor1H.length >= 6 ? candlesFor1H : candlesFor4H, trend)
  const bosChoch     = detectBOSCHoCH(candlesFor4H.length >= 12 ? candlesFor4H : candlesFor1H, trend)
  const eqLevels     = detectEqualLevels(candlesFor1H.length >= 12 ? candlesFor1H : candlesFor4H, trend)
  const macd         = calcMACD(candlesFor1H.length >= 35 ? candlesFor1H : candlesFor4H)
  const macdConfirms = !!macd && (
    trend === 'BULLISH'
      ? macd.macd > macd.signal && macd.histogram > 0
      : macd.macd < macd.signal && macd.histogram < 0
  )

  // ── Step 7: Setup grade ───────────────────────────────────────────────────
  const grade = gradeSetup({
    marketState:   structure.state,
    patternType:   entrySignal.patternType,
    confluence:    confluence.score,
    regime,
    hasDivergence: divergence.divergence,
    hasSweep:      sweep.sweep,
    pdQuality:     pdZone.quality,
    hasOB:         orderBlock.found,
    obStrength:    orderBlock.strength,
    trend,
    hasFVG:        fvg.found,
    fvgFresh:      fvg.found && fvg.age <= 4 && d.price >= fvg.bottom && d.price <= fvg.top,
    hasBOS:        bosChoch.bos,
    hasCHoCH:      bosChoch.choch,
    hasEqLevels:   eqLevels.found,
    macdConfirms,
  })

  // ── Step 8: Confidence scoring — pure institutional factors ───────────────
  let conf = 44

  // Entry pattern quality
  if (!noPattern && entrySignal.patternType === 'A') conf += 10
  if (!noPattern && entrySignal.patternType === 'B') conf += 5
  if (isMicroPull) conf -= 6

  // Risk deductions
  if (unconfirmedReversal)                   conf -= 20  // 4H reversal unconfirmed by 1H
  if (structure.state === 'CONTINUATION')    conf -= 10  // no pullback entry window
  if (structure.state === 'NEUTRAL')         conf -= 15  // no 4H data
  if (noPattern)                             conf -= 15  // no 1H entry trigger
  if (bothTFsReversing)                      conf -= 30  // 4H + 1H both reversing
  if (fullReversal)                          conf -= 40  // daily + 4H confirmed reversal
  if (macroConflict)                         conf -= 35  // genuine 4-TF conflict
  if (intradayOnly)                          conf -= 20  // no macro backing
  if (weeklyCross)                           conf -= 8   // weekly is headwind; daily+4H+1H consensus valid

  // 1H momentum forecast alignment
  if (structure.forecast === (trend === 'BULLISH' ? 'BULLISH_NEXT_1_4H' : 'BEARISH_NEXT_1_4H')) conf += 6

  // RSI zone quality
  if (tf1H) {
    const rsi = tf1H.rsi
    if (trend === 'BULLISH' && rsi > 50 && rsi < 68) conf += 6
    if (trend === 'BEARISH' && rsi < 50 && rsi > 32) conf += 6
    if (trend === 'BULLISH' && rsi > 75) conf -= 8
    if (trend === 'BEARISH' && rsi < 25) conf -= 8
  }
  if (tfD) {
    if (trend === 'BULLISH' && tfD.rsi > 78) conf -= 6
    if (trend === 'BEARISH' && tfD.rsi < 22) conf -= 6
  }

  // ── 15m/30m: ENTRY TIMING ONLY (no confidence impact) ─────────────────────
  // Originally 15m/30m contributed ±5 conf points, but the engine's bread-and-butter
  // setup is a 1H pullback ending — and by definition a 1H pullback means the
  // 15m/30m are STILL printing counter-trend candles at that exact moment.
  // The old penalty was punishing the engine for the very condition it's meant
  // to reward. Short TFs are now used purely for entry-timing hints in the
  // riskFactors list, never for confidence scoring.

  // Setup grade bonus
  if (grade === 'A') conf += 10
  else if (grade === 'B') conf += 6

  // Multi-TF confluence
  if (confluence.score >= 80) conf += 6
  else if (confluence.score >= 65) conf += 3
  else if (confluence.score < 45) conf -= 5

  // Smart money factors
  if (sweep.sweep) conf += 6
  if (pdZone.quality === 'optimal') conf += 6
  else if (pdZone.quality === 'good') conf += 3
  else if (pdZone.quality === 'poor') conf -= 5
  if (orderBlock.found && orderBlock.strength === 'strong') conf += 6
  else if (orderBlock.found) conf += 3

  // FVG (Fair Value Gap) — price in an active institutional imbalance zone
  if (fvg.found) {
    const inGap = d.price >= fvg.bottom && d.price <= fvg.top
    if (inGap)            conf += 6   // currently in the gap = high-prob fill zone
    else if (fvg.age <= 4) conf += 3   // fresh FVG nearby = institutional reference
  }

  // BOS / CHoCH — structural break confirmation or warning
  if (bosChoch.bos)   conf += 5   // structural continuation in trend direction
  if (bosChoch.choch) conf -= 12  // first counter-trend break = reversal warning

  // EQH/EQL — liquidity pool target ahead = institutional draw on liquidity
  if (eqLevels.found && eqLevels.touches >= 3) conf += 5
  else if (eqLevels.found) conf += 3

  // MACD momentum confirmation
  if (macdConfirms)              conf += 4
  if (macd?.bullishCross && trend === 'BULLISH') conf += 3
  if (macd?.bearishCross && trend === 'BEARISH') conf += 3
  if (macd && trend === 'BULLISH' && macd.macd < macd.signal && macd.histogram < 0) conf -= 3
  if (macd && trend === 'BEARISH' && macd.macd > macd.signal && macd.histogram > 0) conf -= 3

  // Market regime
  if (regime === 'VOLATILE') conf -= 8
  if (regime === 'RANGING')  conf -= 4

  // RSI divergence warning
  if (divergence.divergence) conf -= 8

  // PDH/PDL structural confirmation
  if (mc) {
    const priceAbovePDH = trend === 'BULLISH' && d.price > mc.prevDayHigh && mc.prevDayHigh > 0
    const priceBelowPDL = trend === 'BEARISH' && d.price < mc.prevDayLow  && mc.prevDayLow  > 0
    const priceAtPDH    = trend === 'BULLISH' && mc.prevDayHigh > 0
      && Math.abs(d.price - mc.prevDayHigh) / mc.prevDayHigh < 0.003
    const priceAtPDL    = trend === 'BEARISH' && mc.prevDayLow  > 0
      && Math.abs(d.price - mc.prevDayLow)  / mc.prevDayLow  < 0.003
    if (priceAbovePDH)      conf += 4
    else if (priceAtPDH)    conf -= 3
    if (priceBelowPDL)      conf += 4
    else if (priceAtPDL)    conf -= 3
  }

  // Volume conviction (forex uses tick count — apply only mild signal, never penalty)
  const volRatio      = mc?.volumeRatio ?? 1.0
  const hasRealVolume = d.category !== 'forex'
  if      (volRatio >= 2.0) conf += hasRealVolume ? 8 : 3
  else if (volRatio >= 1.5) conf += hasRealVolume ? 5 : 2
  else if (volRatio <  0.35 && hasRealVolume) conf -= 14
  else if (volRatio <  0.5  && hasRealVolume) conf -= 8
  else if (volRatio <  0.7  && hasRealVolume) conf -= 3

  // Intermarket alignment
  if (d.intermarket) {
    const { signal: corrSig } = calcCorrelationSignal(d.slug, d.intermarket, decision)
    if (corrSig === 'confirms')  conf = Math.min(82, conf + 3)
    if (corrSig === 'conflicts') conf -= 7
  }

  // ── NO TRADE gate: insufficient confluence for a tradeable setup ──────────
  if (conf < 42) {
    const reasons: string[] = []
    if (noPattern)                         reasons.push('no 1H entry trigger on last closed candle')
    if (structure.state === 'NEUTRAL')     reasons.push('no 4H data available')
    if (structure.state === 'CONTINUATION') reasons.push('4H trend extending — no pullback entry window')
    if (unconfirmedReversal)               reasons.push('unconfirmed 4H reversal candle')
    if (bothTFsReversing)                  reasons.push('4H and 1H both signalling reversal against bias')
    if (fullReversal)                      reasons.push('daily + 4H reversal confirmed')
    if (macroConflict)                     reasons.push(macroConflictReason)
    if (intradayOnly)                      reasons.push('no macro backing — intraday direction only')
    if (confluence.score < 40)             reasons.push(`low MTF confluence (${confluence.score}/100)`)
    return noTrade(d, slotMeta, atr, dec,
      [
        `${d.display}: insufficient confluence for ${trend.toLowerCase()} entry (score: ${conf}). ${reasons.length ? reasons.join('; ') : 'multiple stacked risk factors'}`,
        ...macro.lines,
      ],
      `Insufficient confluence: score ${conf}`,
      conf)
  }

  const sessMult = sessionMultiplier(d.sessionSlot, d.category)
  conf = Math.round(Math.min(82, Math.max(42, conf * sessMult)))

  // Confidence caps for specific elevated-risk conditions
  if (revRisk.confirmed) conf = Math.min(conf, 54)
  if (intradayOnly)      conf = Math.min(conf, 54)

  // ── Risk factors ──────────────────────────────────────────────────────────
  const riskFactors: string[] = []

  if (divergence.divergence)
    riskFactors.push(`⚠ RSI DIVERGENCE: ${divergence.detail}`)
  if (bosChoch.choch)
    riskFactors.unshift(`⚠ CHANGE OF CHARACTER (CHoCH): ${bosChoch.detail} This is the first structural break against trend. Reduce size by 50% and use a tight stop — if confirmed by a second close, treat as a full reversal.`)
  if (fvg.found && d.price >= fvg.bottom && d.price <= fvg.top)
    riskFactors.push(`Fair value gap fill in progress: price inside ${trend === 'BULLISH' ? 'bullish' : 'bearish'} FVG (${fvg.bottom.toFixed(dec)}–${fvg.top.toFixed(dec)}) — institutional rebalance zone, high-prob continuation if price holds.`)
  if (eqLevels.found && eqLevels.touches >= 3)
    riskFactors.push(`Liquidity target ahead: ${eqLevels.detail} Expect institutional sweep — TP placement should anticipate this level.`)
  if (pdZone.quality === 'poor')
    riskFactors.push(`⚠ COUNTER-INSTITUTIONAL ENTRY ZONE: ${pdZone.detail}`)
  if (regime === 'VOLATILE')
    riskFactors.push('⚠ VOLATILE REGIME: ATR abnormally elevated — widen stops or reduce size to account for erratic price action')
  if (regime === 'RANGING')
    riskFactors.push('⚠ RANGING MARKET: no confirmed directional swing — target TP1 only, exit quickly if price stalls')
  if (tf1H && tf1H.rsi > 65 && trend === 'BULLISH')
    riskFactors.push(`1H RSI ${tf1H.rsi.toFixed(0)} — entry is late in the 1H move. Target TP1 first, then trail stop to breakeven.`)
  if (tf1H && tf1H.rsi < 35 && trend === 'BEARISH')
    riskFactors.push(`1H RSI ${tf1H.rsi.toFixed(0)} — approaching oversold on the entry timeframe. Trail stop aggressively.`)
  // ── Entry-timing hint from 15m/30m (advisory only, no confidence impact) ──
  // A counter-trend short TF is NORMAL during a pullback — it's what creates the
  // entry opportunity. We only surface a TIMING hint here so the trader knows
  // whether to pull the trigger immediately or wait for the next short-TF close.
  if (tf30m || tf15m) {
    const shortTFs = [tf30m, tf15m].filter((t): t is NonNullable<typeof t> => !!t)
    const shortBull = shortTFs.filter(t => t.signal === 'STRONG BUY'  || t.signal === 'BUY').length
    const shortBear = shortTFs.filter(t => t.signal === 'STRONG SELL' || t.signal === 'SELL').length
    const allAligned = trend === 'BULLISH'
      ? shortBull === shortTFs.length && shortBull > 0
      : shortBear === shortTFs.length && shortBear > 0
    if (allAligned) {
      riskFactors.push(`Entry timing: 15m and 30m both confirm ${trend.toLowerCase()} momentum — trigger ready.`)
    } else {
      const stillCounter = trend === 'BULLISH' ? shortBear > 0 : shortBull > 0
      if (stillCounter) {
        riskFactors.push(`Entry timing: 15m/30m still finishing the pullback — fine to enter at market if the 1H signal is confirmed, or wait for the next 15m close in trend direction for a tighter trigger.`)
      }
    }
  }
  if (tfD && tfD.rsi > 72)
    riskFactors.push(`Daily RSI ${tfD.rsi.toFixed(0)} elevated — upside may be compressed. 50% position size, TP1 only.`)
  if (tfD && tfD.rsi < 28)
    riskFactors.push(`Daily RSI ${tfD.rsi.toFixed(0)} oversold — technical bounce risk. Take TP1 quickly, do not hold to TP3.`)
  if (d.intermarket) {
    const { signal: corrSig, detail: corrDetail } = calcCorrelationSignal(d.slug, d.intermarket, decision)
    if (corrSig === 'conflicts') riskFactors.push(`⚠ INTERMARKET CONFLICT: ${corrDetail}`)
    else if (corrSig === 'confirms') riskFactors.push(`Intermarket confirmation: ${corrDetail}`)
  }

  // Volume
  if (mc) {
    const vr = mc.volumeRatio
    const isForex = d.category === 'forex'
    if (!isForex && vr < 0.35)
      riskFactors.unshift(`⚠ VERY THIN VOLUME (${vr.toFixed(2)}× avg): Institutional desks absent — patterns on thin volume are unreliable. Do NOT trade at normal size. Wait for volume > 0.7× average.`)
    else if (!isForex && vr < 0.5)
      riskFactors.push(`Thin volume (${vr.toFixed(2)}× avg) — momentum may not sustain. 50% position size, TP1 only.`)
    else if (vr >= 2.0)
      riskFactors.push(isForex
        ? `High tick activity (${vr.toFixed(2)}× avg) — elevated participation supports directional bias.`
        : `Very high volume (${vr.toFixed(2)}× avg) — strong institutional conviction. Grade ${grade} setup with real order flow behind it.`)
    else if (vr >= 1.5)
      riskFactors.push(isForex
        ? `Above-average tick activity (${vr.toFixed(2)}× avg).`
        : `Elevated volume (${vr.toFixed(2)}× avg) — above-average conviction supports the ${trend.toLowerCase()} bias.`)
  }

  // PDH/PDL structural notes
  if (mc) {
    const abovePDH = trend === 'BULLISH' && d.price > mc.prevDayHigh && mc.prevDayHigh > 0
    const belowPDL = trend === 'BEARISH' && d.price < mc.prevDayLow  && mc.prevDayLow  > 0
    const atPDH    = trend === 'BULLISH' && mc.prevDayHigh > 0
      && Math.abs(d.price - mc.prevDayHigh) / mc.prevDayHigh < 0.003
    const atPDL    = trend === 'BEARISH' && mc.prevDayLow  > 0
      && Math.abs(d.price - mc.prevDayLow)  / mc.prevDayLow  < 0.003
    if (abovePDH)
      riskFactors.push(`PDH (${mc.prevDayHigh.toFixed(dec)}) cleared — prior day high now acting as support. Bullish range expansion in progress.`)
    else if (atPDH)
      riskFactors.push(`⚠ Price pressing into PDH (${mc.prevDayHigh.toFixed(dec)}) — active resistance. A rejection here invalidates the entry. Wait for a clean hourly close above.`)
    if (belowPDL)
      riskFactors.push(`PDL (${mc.prevDayLow.toFixed(dec)}) broken — prior day low now acting as resistance. Bearish range expansion in progress.`)
    else if (atPDL)
      riskFactors.push(`⚠ Price pressing into PDL (${mc.prevDayLow.toFixed(dec)}) — active support. A bounce here invalidates the entry. Wait for a clean hourly close below.`)
  }

  // Sweep / OB confirmation notes
  if (sweep.sweep)
    riskFactors.push(`Liquidity sweep confirmed: ${sweep.detail}`)
  if (orderBlock.found)
    riskFactors.push(`Order block active (${orderBlock.strength}): ${orderBlock.detail}`)

  if (isMicroPull)
    riskFactors.push('Intraday micro-entry: 4H trend intact, 1H dipped to create entry window. Use 0.8× ATR stop and target TP1 first.')
  if (unconfirmedReversal)
    riskFactors.unshift(`⚠ UNCONFIRMED 4H REVERSAL: A strong counter-trend 4H candle formed but the 1H (${tf1H?.signal}) has not confirmed it — likely a failed reversal or liquidity sweep. Multi-TF confluence still supports ${trend.toLowerCase()}. Reduce to 50% size and target TP1 only.`)
  if (structure.state === 'CONTINUATION')
    riskFactors.push(`4H trend extending without a pullback — continuation entry carries whipsaw risk. MTF confluence supports ${trend.toLowerCase()} but entry R:R is lower. Use 50–75% size and prioritise TP1.`)
  if (structure.state === 'NEUTRAL')
    riskFactors.push(`No 4H data — ${trend.toLowerCase()} signal based on weekly, daily, and 1H only. Verify 4H structure manually before committing.`)
  if (noPattern)
    riskFactors.push(`No entry candle on last closed 1H — trading on MTF confluence only. Use 50% size and wait for the next 1H candle to provide a clear trigger before adding.`)
  if (bothTFsReversing)
    riskFactors.unshift(`⚠ 4H + 1H BOTH REVERSING: Both lower timeframes are signalling against the ${trend.toLowerCase()} bias from higher TFs. If entering, use 25% position size maximum and exit at the first 1H close against trend.`)
  if (fullReversal)
    riskFactors.unshift(`⚠ DAILY REVERSAL CONFIRMED: Daily and 4H have both printed reversal patterns. Highest-risk condition in the system. Maximum 25% position size, TP1 only, treat any 1H close against trend as an immediate exit.`)
  if (revRisk.confirmed && !fullReversal)
    riskFactors.unshift(`⚠ REVERSAL RISK: ${revRisk.lines[0]}. 4H and 1H still hold ${trend.toLowerCase()} bias. Trade with 50% size, target TP1 only, exit if 4H closes against trend.`)
  if (macroConflict)
    riskFactors.unshift(`⚠ TIMEFRAME CONFLICT: ${macroConflictReason}. Using best available direction (${trend.toLowerCase()}) but signal reliability is reduced. 25% position size maximum.`)
  if (intradayOnly)
    riskFactors.unshift(`⚠ INTRADAY SIGNAL ONLY: ${macro.lines.find(l => l.includes('conflict') || l.includes('neutral') || l.includes('Neutral') || l.includes('defer')) ?? 'Weekly/daily not confirming direction'}. Working off 4H bias — no macro backing. Do not hold overnight. 50% position size. TP1 target only unless 4H closes strongly in trend direction.`)
  if (dailyCross) {
    const dominantDir  = trend
    const dailySignal  = macro.dailyBias === 'BULLISH' ? 'BUY' : macro.dailyBias === 'BEARISH' ? 'SELL' : 'NEUTRAL'
    const weeklySignal = macro.weeklyBias
    riskFactors.unshift(`DAILY COUNTER-TREND NOTE: Daily shows ${dailySignal} within a ${weeklySignal} weekly + ${trend} 4H/1H structure. Daily is a temporary retracement against the dominant ${dominantDir.toLowerCase()} flow — reduce size by 25% and move SL to breakeven promptly after TP1.`)
  }
  if (weeklyCross) {
    const weeklyDir = macro.weeklyBias === 'BULLISH' ? 'BUY' : 'SELL'
    riskFactors.unshift(`WEEKLY COUNTER-TREND NOTE: Weekly is still ${weeklyDir} but daily + 4H + 1H all align ${trend.toLowerCase()}. Daily trend has turned — potential weekly trend change in progress. Reduce size by 25%, move SL to breakeven promptly after TP1, and exit if daily closes against the ${trend.toLowerCase()} bias.`)
  }
  if (grade === 'C')
    riskFactors.push('Grade C — minimum criteria met but setup quality is low. 25–50% normal position size.')
  if ((d.sessionSlot === '20' || d.sessionSlot === '21') && d.category !== 'crypto')
    riskFactors.push('Late session — thin liquidity. Widen spread buffer by 2×.')
  if (riskFactors.length === 0)
    riskFactors.push(`Grade ${grade} setup — all institutional conditions aligned. No elevated risk factors at this time.`)

  // ── Technical breakdown (institutional research format) ───────────────────
  const trendLabel = macroConflict
    ? `${trend} (conflict — using best available direction from 4H/1H)`
    : intradayOnly
    ? `${trend} (intraday only — 4H direction, no weekly/daily confirmation)`
    : weeklyCross
    ? `${trend} (3-TF agreement: daily ${macro.dailyBias} + 4H ${tf4H?.signal ?? ''} + 1H ${tf1H?.signal ?? ''}; weekly counter-trend — potential trend change)`
    : dailyCross
    ? `${trend} (3-TF agreement: weekly ${macro.weeklyBias} + 4H ${tf4H?.signal ?? ''} + 1H ${tf1H?.signal ?? ''}; daily counter-trend bounce)`
    : `${trend} (weekly: ${macro.weeklyBias} | daily: ${macro.dailyBias})`

  const structureLabel = structure.state === 'PULLBACK'
    ? `Pullback — price retracing into EMA structure, entry window open`
    : structure.state === 'MICRO_PULLBACK'
    ? `Micro-pullback — 4H ${tf4H?.signal ?? ''} (trend intact), 1H dipping to create intraday entry`
    : structure.state === 'CONTINUATION'
    ? `Continuation — 4H trend extending, no clean pullback (lower entry quality)`
    : structure.state === 'REVERSAL_WARNING'
    ? `Reversal warning — strong counter-trend candle on 4H ${unconfirmedReversal ? '(1H NOT confirming — likely failed reversal)' : '(1H also reversing)'}`
    : structure.state === 'NEUTRAL'
    ? `No 4H data — direction from weekly/daily/1H only`
    : `Full alignment — 4H and 1H both ${trend.toLowerCase()}`

  const patternLabel = noPattern
    ? `No entry candle — trading on MTF confluence (${confluence.score}/100)`
    : `${entrySignal.pattern} (${entrySignal.patternType === 'A' ? 'reversal/rejection signal' : 'continuation signal'})`

  const instBreakdown: string[] = [
    ``,
    `── MARKET ANALYSIS ───────────────────────────────────────────────────────`,
    `DIRECTION:     ${trendLabel}`,
    `4H STRUCTURE:  ${structureLabel}`,
    `ENTRY SIGNAL:  ${patternLabel}`,
    `REVERSAL CHK:  ${revRisk.confirmed ? revRisk.lines[0] : 'No reversal signal active — clear to enter'}`,
    ``,
    `── INSTITUTIONAL QUALITY ─────────────────────────────────────────────────`,
    `GRADE: ${grade}  |  MTF CONFLUENCE: ${confluence.score}/100  |  REGIME: ${regime}`,
    `VOLUME: ${volumeLabel(mc?.volumeRatio ?? 1.0)} (${(mc?.volumeRatio ?? 1.0).toFixed(2)}× 20-day avg)`,
    mc ? `PDH: ${mc.prevDayHigh > 0 ? mc.prevDayHigh.toFixed(dec) : 'N/A'}  PDL: ${mc.prevDayLow > 0 ? mc.prevDayLow.toFixed(dec) : 'N/A'}  Price: ${trend === 'BULLISH' && d.price > mc.prevDayHigh ? 'ABOVE PDH ✓' : trend === 'BEARISH' && d.price < mc.prevDayLow ? 'BELOW PDL ✓' : 'within prior-day range'}` : '',
    `PD ZONE: ${pdZone.detail}`,
    sweep.sweep      ? `✓ LIQUIDITY SWEEP: ${sweep.detail}` : `Liquidity sweep: none on last 1H candle`,
    orderBlock.found ? `✓ ORDER BLOCK (${orderBlock.strength?.toUpperCase()}): ${orderBlock.detail}` : `Order block: not at an active OB zone`,
    fvg.found        ? `✓ FAIR VALUE GAP: ${fvg.detail}` : `Fair value gap: no active FVG in trend direction`,
    bosChoch.bos     ? `✓ BOS: ${bosChoch.detail}` : bosChoch.choch ? `⚠ CHoCH: ${bosChoch.detail}` : `BOS/CHoCH: no recent structural break — trend intact`,
    eqLevels.found   ? `✓ LIQUIDITY POOL: ${eqLevels.detail}` : `Equal highs/lows: no clustered liquidity ahead`,
    macd             ? `MACD: line ${macd.macd.toFixed(5)} ${macdConfirms ? '✓ confirms' : 'does not confirm'} ${trend.toLowerCase()} (signal ${macd.signal.toFixed(5)}, hist ${macd.histogram.toFixed(5)})${macd.bullishCross && trend === 'BULLISH' ? ' — fresh bullish cross' : macd.bearishCross && trend === 'BEARISH' ? ' — fresh bearish cross' : ''}` : `MACD: insufficient candle history`,
    divergence.divergence ? `⚠ RSI DIVERGENCE: ${divergence.detail}` : `RSI divergence: none detected`,
    ``,
    `GRADE ${grade} POSITION SIZING:`,
    grade === 'A'
      ? `All institutional conditions aligned. Full position size (1.5–2% risk). Target all 3 TPs. Move SL to breakeven after TP1.`
      : grade === 'B'
      ? `Solid setup with minor compromises. Half position size (0.75–1% risk). Prioritise TP1 and TP2. Tighten stop if price stalls.`
      : `Minimum criteria met. Quarter size (0.25–0.5% risk). Target TP1 only. Cancel if entry zone not hit within 1 hour.`,
  ]

  const technicalBreakdown = [
    ...macro.lines,
    ...structure.lines,
    ...entrySignal.lines,
    ...(revRisk.confirmed ? revRisk.lines : []),
    ...instBreakdown,
  ].filter(Boolean).join('\n')

  // ── Thesis and market bias ────────────────────────────────────────────────
  const thesis = noPattern
    ? `${trend} on ${d.display} — Grade ${grade} signal (MTF confluence ${confluence.score}/100). ${macro.lines[0] ?? ''}. No 1H entry candle yet — signal based on ${confluence.score >= 65 ? 'strong' : 'moderate'} multi-timeframe alignment${sweep.sweep ? ', supported by a liquidity sweep confirming institutional order flow' : ''}${orderBlock.found ? ` and an active ${orderBlock.strength} order block` : ''}. Use 50% position size.`
    : isMicroPull
    ? `${trend} on ${d.display} — Grade ${grade} intraday micro-entry (confluence ${confluence.score}/100). ${macro.lines[0] ?? ''}. The 4H trend is intact (${tf4H?.signal ?? ''}) and the 1H has pulled back, creating the entry window. ${entrySignal.pattern} on the last closed 1H candle confirms the dip is ending${sweep.sweep ? ', supported by a liquidity sweep' : ''}. ${revRisk.confirmed ? 'Reversal risk active — reduce size and target TP1 only.' : 'Reversal check clear.'}`
    : `${trend} on ${d.display} — Grade ${grade} institutional setup (confluence ${confluence.score}/100). ${macro.lines[0] ?? ''}. The 4H is in ${structureLabel.toLowerCase()}, creating the entry window. ${entrySignal.pattern} on the last closed 1H candle signals the pullback is ending${sweep.sweep ? ', preceded by a liquidity sweep confirming institutional order flow' : ''}${orderBlock.found ? `. Price is at an active ${orderBlock.strength} order block — an institutional demand/supply zone` : ''}. ${revRisk.confirmed ? '⚠ Reversal risk active — reduce size.' : 'Reversal check clear.'}`

  const patternRef = noPattern ? `MTF confluence (${confluence.score}/100)` : entrySignal.pattern
  const marketBias = `${d.display} — Grade ${grade} ${trend}. Confluence: ${confluence.score}/100. ${macro.lines[0] ?? ''}. ${patternRef ?? ''} ${noPattern ? 'supports' : 'confirms'} ${trend.toLowerCase()} bias. ${divergence.divergence ? `⚠ ${divergence.type} divergence active — target conservatively.` : 'No divergence.'}`

  return {
    decision,
    tradeHorizon:       horizon,
    confidence:         conf,
    entryZone:          [0, 0],   // computed in POST handler
    stopLoss:           0,
    tp1: 0, tp2: 0, tp3: 0,
    rrRatio:            '—',
    timeValidity:       swing
      ? `Valid for up to 7 days — swing trade, session timing ignored`
      : `Valid for the ${slotMeta.label} hour (${slotMeta.name})`,
    thesis,
    technicalBreakdown,
    riskFactors,
    sessionContext:     buildSessionContext(d, slotMeta, dec),
    marketBias,
    traderNote:         buildTraderNote(d, decision, conf, dec),
    generatedAt:        Date.now(),
    setupGrade:         grade,
    confluenceScore:    confluence.score,
    institutionalMeta: {
      grade,
      confluence:       confluence.score,
      regime,
      hasSweep:         sweep.sweep,
      sweepDetail:      sweep.detail,
      hasOB:            orderBlock.found,
      obDetail:         orderBlock.detail,
      obStrength:       orderBlock.strength,
      hasDivergence:    divergence.divergence,
      divergenceDetail: divergence.detail,
      pdQuality:        pdZone.quality,
      pdDetail:         pdZone.detail,
      hasFVG:           fvg.found,
      fvgDetail:        fvg.detail,
      hasBOS:           bosChoch.bos,
      hasCHoCH:         bosChoch.choch,
      bosChochDetail:   bosChoch.detail,
      hasEqLevels:      eqLevels.found,
      eqLevelsDetail:   eqLevels.detail,
      macdConfirms,
      macdDetail:       macd
        ? `MACD ${macd.macd.toFixed(5)} vs signal ${macd.signal.toFixed(5)}, hist ${macd.histogram.toFixed(5)}`
        : 'MACD: insufficient candle history',
    },
  }
}

// ── Server-side news blackout (independent of client data) ───────────────────
// Calls our own /api/news/[slug] (15-min cached) to check for HIGH-impact
// ForexFactory events within ±30 min. Fail-open: if the fetch times out we
// do NOT block the trade (the client-side check is still a second layer).
async function serverNewsBlackout(slug: string): Promise<{ blackout: boolean; reason: string }> {
  try {
    const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const res  = await fetch(`${base}/api/news/${slug}`, {
      signal:  AbortSignal.timeout(5_000),
      headers: { 'x-internal': '1' },
    })
    if (!res.ok) return { blackout: false, reason: '' }
    const items = (await res.json()) as Array<{
      title: string; publishedAt: number; impact?: string; isCalendarEvent: boolean
    }>
    const now    = Date.now()
    const WINDOW = 30 * 60 * 1000  // ±30 minutes
    const hit    = items.find(it =>
      it.isCalendarEvent && it.impact === 'high' &&
      Math.abs(it.publishedAt - now) <= WINDOW
    )
    return hit
      ? { blackout: true,  reason: hit.title }
      : { blackout: false, reason: '' }
  } catch {
    return { blackout: false, reason: '' }  // fail open — never block analysis on a fetch error
  }
}

// ── Session/liquidity gate ────────────────────────────────────────────────────
// Outside institutional trading hours, liquidity collapses for forex, commodities,
// and indices. Spreads widen 3–8×, stop hunts are common, and technical levels
// fail more often. The rule: if the market maker isn't open, don't trade.
//
// Active windows (UTC):
//   London:        07:00–16:00
//   New York:      12:00–21:00
//   Combined:      07:00–21:00  ← the only window for most instruments
//   Asian pairs:   23:00–09:00  (JPY, AUD, NZD cross activity)
//   Crypto:        24/7
//
function sessionGate(category: string, slug: string): { blocked: boolean; reason: string } {
  if (category === 'crypto') return { blocked: false, reason: '' }  // 24/7 market

  const utcHr = new Date().getUTCHours()

  // London pre-open starts at 06:00 UTC year-round.
  // In summer (BST, UTC+1) 06:00 UTC = 07:00 London — exact London open.
  // In winter (GMT, UTC+0) 06:00 UTC = 06:00 London — 1 hr pre-open, fine to trade.
  // NY session ends at 22:00 UTC (17:00 ET); include that hour so cutoff is 23.
  const inLondonNY = utcHr >= 6 && utcHr < 23
  if (inLondonNY) return { blocked: false, reason: '' }

  // Sydney / Asian session (23:00–08:59 UTC): instruments with real volume outside London/NY
  //   Currency pairs — JPY, AUD, NZD are the core Asian session FX pairs
  //   Metals       — gold and silver trade actively in Sydney (major physical gold market)
  //   Oil / copper — Asian demand drives meaningful WTI and copper volume overnight
  const isAsianInstrument = /jpy|aud|nzd|xau|xag|wti|copper/.test(slug)
  const inAsian            = utcHr >= 23 || utcHr < 9  // 23:00–08:59 UTC (Sydney + Tokyo)
  if (isAsianInstrument && inAsian) return { blocked: false, reason: '' }

  const sessionLabel =
    utcHr >= 23 ? 'Sydney / early Asian' :
    utcHr < 6   ? 'pre-London Asian'     : 'inter-session'

  return {
    blocked: true,
    reason:  `Dead session (${utcHr.toString().padStart(2, '0')}:00 UTC — ${sessionLabel}). Institutional desks are closed or running skeleton crews. Spreads are 3–8× wider than normal, liquidity is thin, and technical levels are unreliable. Re-run FM Trader during the London session (07:00 UK time) or New York session (12:00–21:00 UTC) for a valid signal.`,
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session   = await getServerSession(authOptions)
  const cronHeader = req.headers.get('x-cron-secret')
  // No 'dev' fallback — an unset CRON_SECRET must not leave a guessable string
  // standing in as a valid credential.
  const cronSecret = process.env.CRON_SECRET
  if (!session && (!cronSecret || cronHeader !== cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Silently resolve pending predictions on every FM Trader call — fire-and-forget.
  // This keeps outcomes near-real-time even though the Vercel cron only runs daily.
  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, '')
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  fetch(`${baseUrl}/api/fm-trader/check-outcomes`, {
    headers: { authorization: `Bearer ${cronSecret}` },
  }).catch(() => {})

  let body: FMTraderRequest
  try {
    body = await req.json() as FMTraderRequest
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.slug || !body.price || !body.timeframes?.length) {
    return NextResponse.json({ error: 'Incomplete market data provided.' }, { status: 400 })
  }

  // ── Token charge ───────────────────────────────────────────────────────────
  // One token per prediction delivered to a user, on any instrument.
  //
  // Charged here, ahead of the cache paths below, because a cached prediction is
  // still a prediction from the user's side — they asked, they got an answer.
  //
  // Not charged for: cron and system calls (no session), scanOnly requests
  // (which feed the scanner rather than a person), and admins.
  //
  // The debit itself is a single conditional UPDATE — see lib/tokens.ts for why
  // it must not be a read-then-write.
  const tokenUserId =
    session && !body.scanOnly && (session.user as any)?.role !== 'admin'
      ? ((session.user as any)?.id as string | undefined)
      : undefined
  let tokenCharged = false


  // A NO TRADE verdict does not cost a token. The user asked for a call and was
  // told to stay out — useful, but not the prediction they paid for. Refunded
  // rather than charged conditionally because the debit has to happen before the
  // cache paths, and the decision is not known until after them.
  //
  // Guarded by tokenRefunded so the several return paths below cannot each
  // credit the same run.
  let tokenRefunded = false
  const settleTokens = async <T,>(result: T): Promise<T> => {
    const decision = (result as { decision?: string } | null)?.decision
    if (tokenCharged && !tokenRefunded && tokenUserId && decision === 'NO TRADE') {
      tokenRefunded = true
      await creditTokens(tokenUserId, TOKENS_PER_RUN, 'refund_no_trade', body.slug)
        .catch(e => console.error('[fm-trader] no-trade refund failed:', e))
    }
    return result
  }

  /** Refund a run that returned no prediction at all (rate limit, hard error). */
  const refundUnused = async (why: string) => {
    if (tokenCharged && !tokenRefunded && tokenUserId) {
      tokenRefunded = true
      await creditTokens(tokenUserId, TOKENS_PER_RUN, 'refund_failed_run', `${body.slug} (${why})`)
        .catch(e => console.error('[fm-trader] refund failed:', e))
    }
  }

  // ── News blackout: client signals a high-impact event is imminent ─────────
  // If a scheduled high-impact event is within ±30 min, we force NO TRADE.
  // A professional desk never enters within this window — the stop would need
  // to be 3-5× normal size to survive the spike.
  if (body.newsBlackout && !body.scanOnly) {
    const dec     = dp(body.price)
    const kl      = body.keyLevels
    const atr     = calcATR(body)
    const ewp     = atr.entryWidthPct
    // Run rule engine to surface real confidence — pure CPU, no IO
    let newsConf = 5
    try { newsConf = Math.max(5, runAnalysis(body).confidence) } catch (e) { console.error('[fm-trader] runAnalysis in newsBlackout:', e); newsConf = 5 }
    const noTradeResult: FMTraderResponse = {
      decision:           'NO TRADE',
      confidence:         newsConf,
      entryZone:          [round(body.price * (1 - ewp), dec), round(body.price * (1 + ewp), dec)],
      stopLoss:           round(kl.support1, dec),
      tp1:                round(kl.resistance1, dec),
      tp2:                round(kl.resistance2, dec),
      tp3:                round(kl.resistance2 * 1.003, dec),
      rrRatio:            '—',
      timeValidity:       'Not valid — standing aside for news event',
      thesis:             `⚠️ NEWS BLACKOUT ACTIVE: ${body.blackoutReason ?? 'A high-impact economic event is scheduled within 30 minutes.'} A professional desk does not enter within this window — the news spike would require a stop 3–5× normal size. Stand aside, let the volatility clear, then re-analyse once price stabilises after the release.`,
      technicalBreakdown: `All technical signals are suspended during a high-impact news window. The market is pricing in the event — spreads widen, liquidity thins, and technical levels become unreliable. Re-run FM Trader 15–20 minutes after the release when price has found a new equilibrium.`,
      riskFactors:        [
        body.blackoutReason ?? 'High-impact economic event imminent — news spike risk.',
        'Spreads typically widen 5–10× during major releases — slippage risk is extreme.',
        'Stop hunts above/below key levels are common immediately before news.',
        'Wait for the initial spike to fully resolve before re-entering.',
        'After the news, re-run FM Trader for a fresh signal based on post-event price action.',
      ],
      sessionContext:     `A high-impact economic event is scheduled near this session window. The standard professional protocol is to stand completely aside from 30 minutes before to 15 minutes after the release. Do not trade this window.`,
      marketBias:         `Market is in pre-news positioning. Direction after the release depends on the data vs expectation. No reliable bias can be determined pre-release.`,
      traderNote:         `I'm sitting this one out. ${body.blackoutReason ?? 'High-impact news is due shortly.'} The risk/reward of trading into a news event is terrible — you are essentially gambling on a binary outcome. I'd rather miss the move than get stopped out by a 50-pip spike. I'll be back at my desk after the dust settles.`,
      generatedAt:        Date.now(),
    }
    return NextResponse.json(await settleTokens(noTradeResult))
  }

  // ── Session/liquidity gate (server-enforced) ───────────────────────────────
  // This is synchronous and free — we check the actual server clock, not the
  // client-supplied sessionSlot (which is local-timezone and can be spoofed).
  // Session gate is intraday-only — swing trades don't care about London open
  const gate = sessionGate(body.category, body.slug)
  if (gate.blocked && !body.scanOnly && body.tradeHorizon !== 'swing') {
    const dec = dp(body.price)
    const kl  = body.keyLevels
    const atr = calcATR(body)
    const ewp = atr.entryWidthPct
    let gateConf = 5
    try { gateConf = Math.max(5, runAnalysis(body).confidence) } catch (e) { console.error('[fm-trader] runAnalysis in sessionGate:', e); gateConf = 5 }
    const deadResult: FMTraderResponse = {
      decision:           'NO TRADE',
      confidence:         gateConf,
      entryZone:          [round(body.price * (1 - ewp), dec), round(body.price * (1 + ewp), dec)],
      stopLoss:           round(kl.support1, dec),
      tp1:                round(kl.resistance1, dec),
      tp2:                round(kl.resistance2, dec),
      tp3:                round(kl.resistance2 * 1.003, dec),
      rrRatio:            '—',
      timeValidity:       'Not valid — outside institutional trading hours',
      thesis:             `⏸ SESSION GATE: ${gate.reason}`,
      technicalBreakdown: `Technical analysis is meaningless in a dead session. With no institutional flow, price is driven by retail noise and liquidity grabs rather than genuine directional conviction. The same setup that fails during Asian dead hours often resolves perfectly in the London open. Patience is the edge.`,
      riskFactors:        [
        'Thin liquidity — spreads 3–8× wider than during London/NY hours.',
        'No institutional order flow to sustain a directional move.',
        'Stop hunts and false breakouts are disproportionately common.',
        'Technical levels are unreliable without real volume to validate them.',
        `Wait for the ${body.category === 'forex' ? 'London open at 07:00 UTC' : 'active session'} for a reliable signal.`,
      ],
      sessionContext:     gate.reason,
      marketBias:         'No meaningful bias — institutional desks are closed or on skeleton crew for this instrument.',
      traderNote:         `Patience. The ${new Date().getUTCHours().toString().padStart(2, '0')}:00 UTC window is dead for this instrument. I could give you a signal, but it would be noise, not analysis. Come back during London (07:00–16:00 UTC) or New York (12:00–21:00 UTC) hours for a signal worth acting on.`,
      generatedAt:        Date.now(),
    }
    return NextResponse.json(await settleTokens(deadResult))
  }

  // ── Server-side news blackout (independent of client-sent flag) ───────────
  // The client check can miss events if the news feed was stale when DetailClient
  // fetched it. This server check hits our own cached endpoint for a second layer.
  const svrNews = await serverNewsBlackout(body.slug)
  if (svrNews.blackout && !body.scanOnly) {
    const dec = dp(body.price)
    const kl  = body.keyLevels
    const atr = calcATR(body)
    const ewp = atr.entryWidthPct
    let svrConf = 5
    try { svrConf = Math.max(5, runAnalysis(body).confidence) } catch (e) { console.error('[fm-trader] runAnalysis in svrNewsBlackout:', e); svrConf = 5 }
    const svrBlackoutResult: FMTraderResponse = {
      decision:           'NO TRADE',
      confidence:         svrConf,
      entryZone:          [round(body.price * (1 - ewp), dec), round(body.price * (1 + ewp), dec)],
      stopLoss:           round(kl.support1, dec),
      tp1:                round(kl.resistance1, dec),
      tp2:                round(kl.resistance2, dec),
      tp3:                round(kl.resistance2 * 1.003, dec),
      rrRatio:            '—',
      timeValidity:       'Not valid — high-impact news event within 30 minutes',
      thesis:             `⚠️ NEWS BLACKOUT (server-confirmed): ${svrNews.reason} A professional desk never enters within 30 minutes of a high-impact release — the spike requires 3–5× normal stop size. Stand aside.`,
      technicalBreakdown: `All technical signals are suspended during a high-impact news window. Re-run FM Trader 15–20 minutes after the release when price has found a new equilibrium.`,
      riskFactors:        [
        svrNews.reason,
        'Spreads typically widen 5–10× during major releases.',
        'Stop hunts above/below key levels are common immediately before news.',
        'Wait for the initial spike to fully resolve before re-entering.',
        'After the news, re-run FM Trader for a fresh signal based on post-event price action.',
      ],
      sessionContext:     `High-impact economic event confirmed within 30 minutes. Stand completely aside.`,
      marketBias:         'Pre-news positioning — no reliable bias can be determined before the release.',
      traderNote:         `Server-confirmed news blackout: ${svrNews.reason}. I'm sitting this one out.`,
      generatedAt:        Date.now(),
    }
    return NextResponse.json(await settleTokens(svrBlackoutResult))
  }

  // ── Shared analysis cache: one Claude call per pair per UTC hour ─────────────
  // In-memory cache serves repeat calls within the same warm Vercel instance.
  // DB-backed shared cache serves ALL users across cold starts — if any user
  // already triggered Claude for this pair this hour, everyone reuses it.
  const nowTs     = Date.now()
  const utcHour   = new Date(nowTs).toISOString().slice(0, 13)  // "2026-04-24T09"
  const hourStart = new Date(`${utcHour}:00:00.000Z`)
  const hourEnd   = new Date(hourStart.getTime() + 60 * 60 * 1000)  // exact UTC hour boundary

  // ── Charge for the run ─────────────────────────────────────────────────────
  // Deliberately placed after the UTC hour boundary is known, and after the
  // news-blackout / dead-session exits above: those all return NO TRADE, which
  // does not cost a token, so not charging beats charging and refunding.
  //
  // One token per prediction per user per hour — not per view. A stored
  // FMPrediction for this user, instrument and horizon in the current hour means
  // they already paid for this call, so reopening the page or coming back to it
  // is free. forceRefresh is an explicit request for a new prediction and always
  // charges.
  if (tokenUserId) {
    const alreadyPaid = body.forceRefresh
      ? null
      : await prisma.fMPrediction.findFirst({
          where: {
            userId:       tokenUserId,
            slug:         body.slug,
            tradeHorizon: body.tradeHorizon ?? 'intraday',
            generatedAt:  { gte: hourStart },
          },
          select: { id: true },
        })

    if (!alreadyPaid) {
      const balance = await debitTokens(tokenUserId, TOKENS_PER_RUN, 'fm_trader_run', body.slug)
      if (balance === null) {
        return NextResponse.json({
          error:   'insufficient_tokens',
          message: 'You are out of FM Trader tokens. Top up to keep running predictions.',
          buyUrl:  '/analysis/tokens',
        }, { status: 402 })
      }
      tokenCharged = true
    }
  }

  // Prune expired entries before reading so stale results never slip through
  pruneCache(nowTs)

  // forceRefresh: user pressed the mid-hour refresh button (available after 30 min).
  // Server guard: reject if called before 30 min into the current UTC hour.
  const minutesIntoHour = Math.floor((nowTs - hourStart.getTime()) / 60_000)
  if (body.forceRefresh && !body.scanOnly) {
    if (minutesIntoHour < 30) {
      await refundUnused('refresh cooldown')
      return NextResponse.json(
        { error: `Refresh available after 30 minutes into the hour. Try again in ${30 - minutesIntoHour} min.` },
        { status: 429 },
      )
    }
    // Bust in-memory cache so fresh Claude analysis is triggered below
    cache.delete(`${body.slug}:${utcHour}:${body.tradeHorizon ?? "intraday"}`)
  }

  // In-memory hit: valid only if within CACHE_MAX_AGE_MS (not just same UTC hour key)
  const memEntry = cache.get(`${body.slug}:${utcHour}:${body.tradeHorizon ?? "intraday"}`)
  const inMemory = memEntry && (nowTs - memEntry.ts) < CACHE_MAX_AGE_MS ? memEntry : null
  if (memEntry && !inMemory) cache.delete(`${body.slug}:${utcHour}:${body.tradeHorizon ?? "intraday"}`)  // expired — evict

  // Resolve the user once here — reused for personal row save
  const dbUser = session?.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
    : null

  // ── Price-drift helper: warn when current price has moved far from cached entry zone ─
  // The analysis (phases, patterns, narrative) remains valid for the UTC hour, but the
  // entry zone and levels are only accurate near the original price. If price has drifted
  // more than 3× the entry zone width from the cached entry midpoint, flag it clearly.
  function staleLevelsWarning(cached: FMTraderResponse, currentPrice: number): string | null {
    if (cached.decision === 'NO TRADE') return null
    const entryMid  = (cached.entryZone[0] + cached.entryZone[1]) / 2
    if (entryMid <= 0) return null
    const zoneWidth = Math.abs(cached.entryZone[1] - cached.entryZone[0])
    // Guard: if zone width is zero or near-zero (data issue), use 0.1% of price as minimum
    const effectiveWidth = zoneWidth > 0 ? zoneWidth : entryMid * 0.001
    const drift = Math.abs(currentPrice - entryMid)
    // Only warn if drifted more than 3× the entry zone width (clearly outside the zone)
    if (drift > effectiveWidth * 3) {
      const dec = dp(currentPrice)
      const dir = currentPrice > entryMid ? 'above' : 'below'
      return `⚠ PRICE MOVED SINCE SIGNAL: Analysis was generated when price was near ${entryMid.toFixed(dec)} — current price ${currentPrice.toFixed(dec)} is now ${dir} the original entry zone. Entry/SL/TP levels may no longer be valid. Re-run FM Trader to generate fresh levels.`
    }
    return null
  }

  if (inMemory && !body.scanOnly) {
    // Recalculate levels from current price before saving or returning.
    const memGrade  = inMemory.data.setupGrade ?? 'B'
    const { getPairTuning: getMemTuning } = await import('@/lib/pair-tuning')
    const memTuning = await getMemTuning(body.slug, body.tradeHorizon ?? 'intraday')
    const memLevels = inMemory.data.decision !== 'NO TRADE'
      ? recalcLevels(body, inMemory.data.decision as 'BUY' | 'SELL', memGrade, memTuning)
      : null
    const memResult = memLevels
      ? { ...inMemory.data, entryZone: [memLevels.entryLow, memLevels.entryHigh] as [number, number], stopLoss: memLevels.stopLoss, tp1: memLevels.tp1, tp2: memLevels.tp2, tp3: memLevels.tp3, rrRatio: memLevels.rrRatio }
      : inMemory.data

    // Save personal row for this user if missing
    if (dbUser && memResult.decision !== 'NO TRADE') {
      const alreadySaved = await prisma.fMPrediction.findFirst({
        where: { userId: dbUser.id, slug: body.slug, tradeHorizon: body.tradeHorizon ?? 'intraday', generatedAt: { gte: hourStart } },
        select: { id: true },
      })
      if (!alreadySaved) {
        const expiresAt = predictionExpiresAt(body.category, nowTs, body.tradeHorizon)
        // after() rather than a bare floating promise: this is a cache-hit fast
        // path, so we don't want to block the response on a write — but an
        // unawaited promise lets the serverless runtime freeze before the insert
        // lands, silently dropping predictions. after() keeps the invocation
        // alive until it completes. Errors are logged, not swallowed; a missing
        // row costs an outcome the learner and pair tuning both need.
        after(async () => {
          try {
            await prisma.fMPrediction.create({
              data: {
                userId: dbUser.id, slug: body.slug, display: body.display,
                category: body.category, sessionSlot: body.sessionSlot,
                tradeHorizon: body.tradeHorizon ?? 'intraday',
                decision: memResult.decision, confidence: memResult.confidence,
                entryLow: memResult.entryZone[0], entryHigh: memResult.entryZone[1],
                stopLoss: memResult.stopLoss, tp1: memResult.tp1,
                tp2: memResult.tp2, tp3: memResult.tp3, rrRatio: memResult.rrRatio,
                priceAtCall: body.price, generatedAt: new Date(memResult.generatedAt), expiresAt,
              },
            })
          } catch (e) {
            console.error('[fm-trader] prediction save failed (mem-cache path):', e)
          }
        })
      }
    }
    return NextResponse.json(await settleTokens(memResult))
  }

  try {
    // ── DB shared cache: check if ANY user already got Claude's answer this hour ─
    // Three guards:
    //   1. generatedAt >= hourStart  — prediction is from the current UTC hour
    //   2. expiresAt > now           — prediction hasn't passed its validity window
    //   3. generatedAt > maxAge      — prediction isn't more than 50 min old (fresh Claude near hour end)
    const maxAgeTs = new Date(nowTs - CACHE_MAX_AGE_MS)
    // forceRefresh bypasses the shared DB cache so a fresh Claude call is made
    const sharedRow = body.forceRefresh ? null : await prisma.fMPrediction.findFirst({
      where: {
        slug: body.slug,
        // Only serve BUY/SELL from shared cache — NO TRADE must never be locked in for
        // the full UTC hour because conditions change. Every NO TRADE re-runs fresh.
        decision: { in: ['BUY', 'SELL'] },
        // Swing predictions and intraday predictions never share — they're computed
        // from different TF stacks, so a swing call must not be served as intraday.
        tradeHorizon: body.tradeHorizon ?? 'intraday',
        generatedAt: { gte: hourStart > maxAgeTs ? hourStart : maxAgeTs },
        expiresAt:   { gt: new Date(nowTs) },
      },
      orderBy: { generatedAt: 'desc' },
      select: {
        decision: true, confidence: true, entryLow: true, entryHigh: true,
        stopLoss: true, tp1: true, tp2: true, tp3: true, rrRatio: true,
        generatedAt: true, expiresAt: true,
        // Claude's stored text — all users get the real analysis, not regenerated fallback
        thesis: true, technicalBreakdown: true, marketBias: true,
        riskFactors: true, sessionContext: true, traderNote: true, timeValidity: true,
      },
    })

    if (sharedRow && !body.scanOnly && !body.forceRefresh) {
      const learnedWeights = await getLearnedWeights(body.tradeHorizon ?? 'intraday')
      const rawScore     = body.timeframes.reduce((s, tf) => s + sigWeight(tf.signal), 0)
      const slotMeta     = findSlot(body.sessionSlot)
      const atr          = calcATR(body)
      const dec          = dp(body.price)
      const decision     = sharedRow.decision as 'BUY' | 'SELL' | 'NO TRADE'

      // Run the CPU-only rule engine ONCE to recover setupGrade AND institutional
      // meta needed by the learner. No Claude call — deterministic math only.
      const freshAnalysis = decision !== 'NO TRADE' ? runAnalysis(body) : null
      const freshGrade    = freshAnalysis?.setupGrade ?? 'B'
      const freshMeta     = freshAnalysis?.institutionalMeta

      const features     = decision !== 'NO TRADE'
        ? extractFeatures(body, decision as 'BUY' | 'SELL', rawScore, freshMeta ? {
            grade:        freshMeta.grade,
            hasSweep:     freshMeta.hasSweep,
            hasOB:        freshMeta.hasOB,
            pdQuality:    freshMeta.pdQuality,
            hasFVG:       freshMeta.hasFVG,
            hasBOS:       freshMeta.hasBOS,
            hasCHoCH:     freshMeta.hasCHoCH,
            hasEqLevels:  freshMeta.hasEqLevels,
            macdConfirms: freshMeta.macdConfirms,
          } : undefined)
        : {}
      const learnedBoost = decision !== 'NO TRADE' ? computeLearnedBoost(features, learnedWeights) : 0
      const { getPairTuning: getSharedTuning } = await import('@/lib/pair-tuning')
      const sharedTuning = await getSharedTuning(body.slug, body.tradeHorizon ?? 'intraday')
      const freshLevels = decision !== 'NO TRADE'
        ? recalcLevels(body, decision as 'BUY' | 'SELL', freshGrade, sharedTuning)
        : null

      const sharedResult: FMTraderResponse = {
        decision,
        confidence:         sharedRow.confidence,
        setupGrade:         freshGrade as 'A' | 'B' | 'C',
        entryZone:          freshLevels ? [freshLevels.entryLow, freshLevels.entryHigh] : [sharedRow.entryLow, sharedRow.entryHigh],
        stopLoss:           freshLevels?.stopLoss ?? sharedRow.stopLoss,
        tp1:                freshLevels?.tp1      ?? sharedRow.tp1,
        tp2:                freshLevels?.tp2      ?? sharedRow.tp2,
        tp3:                freshLevels?.tp3      ?? sharedRow.tp3,
        rrRatio:            freshLevels?.rrRatio  ?? sharedRow.rrRatio,
        timeValidity:       sharedRow.timeValidity    ?? `Valid for the ${slotMeta.label} hour (${slotMeta.name})`,
        thesis:             sharedRow.thesis          ?? buildThesis(body, decision, rawScore, 0, 0, dec),
        technicalBreakdown: sharedRow.technicalBreakdown ?? buildBreakdown(body, decision, rawScore, dec, slotMeta, atr),
        riskFactors:        (sharedRow.riskFactors as string[] | null) ?? buildRiskFactors(body, decision, dec, body.sessionSlot),
        sessionContext:     sharedRow.sessionContext  ?? buildSessionContext(body, slotMeta, dec),
        marketBias:         sharedRow.marketBias      ?? buildMarketBias(body, rawScore, dec),
        traderNote:         sharedRow.traderNote      ?? buildTraderNote(body, decision, sharedRow.confidence, dec),
        generatedAt:        sharedRow.generatedAt.getTime(),
      }

      // Only cache BUY/SELL — never lock users into NO TRADE for the full hour
      if (decision !== 'NO TRADE') {
        cache.set(`${body.slug}:${utcHour}:${body.tradeHorizon ?? "intraday"}`, { data: sharedResult, ts: nowTs, expiresAt: hourEnd.getTime() })
      }

      // Save personal row for this user if they don't have one yet
      if (dbUser && decision !== 'NO TRADE') {
        const alreadySaved = await prisma.fMPrediction.findFirst({
          where: { userId: dbUser.id, slug: body.slug, tradeHorizon: body.tradeHorizon ?? 'intraday', generatedAt: { gte: hourStart } },
          select: { id: true },
        })
        if (!alreadySaved) {
          const expiresAt = predictionExpiresAt(body.category, nowTs, body.tradeHorizon)
          const snapshot: MarketSnapshot = { decision, features, rawScore, claudeUsed: false, learnedBoost }
          // See the mem-cache path above — same reasoning. This row carries the
          // marketSnapshot the learner trains on, so dropping it loses the
          // feature vector as well as the outcome.
          after(async () => {
            try {
              await prisma.fMPrediction.create({
                data: {
                  userId: dbUser.id, slug: body.slug, display: body.display,
                  category: body.category, sessionSlot: body.sessionSlot,
                  tradeHorizon: body.tradeHorizon ?? 'intraday',
                  decision, confidence: sharedRow.confidence,
                  entryLow:  sharedResult.entryZone[0], entryHigh: sharedResult.entryZone[1],
                  stopLoss:  sharedResult.stopLoss, tp1: sharedResult.tp1,
                  tp2: sharedResult.tp2, tp3: sharedResult.tp3, rrRatio: sharedResult.rrRatio,
                  priceAtCall: body.price, marketSnapshot: snapshot as object,
                  generatedAt: sharedRow.generatedAt, expiresAt,
                  thesis: sharedRow.thesis ?? undefined, technicalBreakdown: sharedRow.technicalBreakdown ?? undefined,
                  marketBias: sharedRow.marketBias ?? undefined, riskFactors: sharedRow.riskFactors ?? undefined,
                  sessionContext: sharedRow.sessionContext ?? undefined, traderNote: sharedRow.traderNote ?? undefined,
                  timeValidity: sharedRow.timeValidity ?? undefined,
                },
              })
            } catch (e) {
              console.error('[fm-trader] prediction save failed (shared-cache path):', e)
            }
          })
        }
      }
      return NextResponse.json(await settleTokens(sharedResult))
    }

    // ── No shared result yet — full Claude path ────────────────────────────────
    // STREAMING:
    //   When the client sends `Accept: application/x-ndjson` (the FMTrader UI does),
    //   we stream two NDJSON chunks instead of blocking on Claude:
    //     chunk 1 (~100ms): rule-engine result + fallback levels + rule-engine thesis
    //                       → UI renders the card immediately
    //     chunk 2 (~5–15s): Claude's overrides (thesis, marketBias, possibly levels)
    //                       → UI swaps in the polished text
    //   DB save + cache happen on the server with the MERGED result before close.
    //
    //   When `Accept` is `application/json` (or anything else), we fall back to the
    //   original blocking JSON response for compatibility.
    // Streaming gated by admin flag (fmTraderStreaming). When off, we return
    // a single buffered JSON response — slightly cheaper per-request because
    // we avoid the ReadableStream + double rule-engine encode.
    const { getPerfFlags: _getPerfFlagsForStream } = await import('@/lib/perf-flags')
    const _streamFlags = await _getPerfFlagsForStream()
    const wantsStream = _streamFlags.fmTraderStreaming
      && (req.headers.get('accept') ?? '').includes('application/x-ndjson')

    // ── Step 0: Load learned weights + per-pair win rate → inject into prompt ─
    const [learnedWeights, pairStats] = await Promise.all([
      getLearnedWeights(body.tradeHorizon ?? 'intraday'),
      prisma.fMPrediction.findMany({
        where: {
          slug: body.slug,
          outcome: { in: ['tp1_hit', 'sl_hit'] },
          generatedAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, // last 90 days
        },
        select: { outcome: true },
      }).catch(() => [] as { outcome: string }[]),
    ])

    const pairWins   = pairStats.filter(p => p.outcome === 'tp1_hit').length
    const pairTotal  = pairStats.length
    const pairWinStr = pairTotal >= 5
      ? `Historical win rate for ${body.display}: ${pairWins}/${pairTotal} (${Math.round(pairWins / pairTotal * 100)}%) over last 90 days.`
      : `Historical win rate for ${body.display}: insufficient data (${pairTotal} resolved trades).`

    body.learningContext = buildLearningContext(learnedWeights) + '\n' + pairWinStr

    // Validate client-provided EMA values against server-computed ones.
    // Prevents miscalibrated client-side EMA periods from poisoning the rule engine.
    body = {
      ...body,
      timeframes: body.timeframes.map(tf =>
        (tf.key === 'daily' || tf.key === '4h' || tf.key === '1h')
          ? validateAndCorrectTF(tf)
          : tf
      ),
    }

    // ── Step 1: Rule engine always makes the decision — deterministic, testable ─
    const ruleResult = runAnalysis(body)
    const { decision, confidence } = ruleResult

    // ── Step 2: Compute fallback levels via horizon-aware recalcLevels ─────────
    const dec      = dp(body.price)
    const price    = body.price
    const kl       = body.keyLevels
    const slotMeta = findSlot(body.sessionSlot)
    const atr      = calcATR(body)
    const ewp      = atr.entryWidthPct
    const setupGrade = ruleResult.setupGrade ?? 'B'

    // Per-pair empirical tuning — multipliers on TP/SL bounds drawn from
    // historical hit-rates. Returns identity (no change) when fewer than
    // 10 resolved trades exist for this pair+horizon.
    const { getPairTuning } = await import('@/lib/pair-tuning')
    const pairTuning = await getPairTuning(body.slug, body.tradeHorizon ?? 'intraday')

    let entryLow: number, entryHigh: number, stopLoss: number
    let tp1: number, tp2: number, tp3: number

    if (decision === 'BUY' || decision === 'SELL') {
      const lvl = recalcLevels(body, decision, setupGrade, pairTuning)
      entryLow  = lvl.entryLow
      entryHigh = lvl.entryHigh
      stopLoss  = lvl.stopLoss
      tp1       = lvl.tp1
      tp2       = lvl.tp2
      tp3       = lvl.tp3
    } else {
      entryLow  = round(price * (1 - ewp), dec)
      entryHigh = round(price * (1 + ewp), dec)
      stopLoss  = round(kl.support1, dec)
      tp1 = round(kl.resistance1, dec)
      tp2 = round(kl.resistance2, dec)
      tp3 = round(kl.resistance2 * (1 + 0.003), dec)
    }

    const calcRR = (eL: number, eH: number, sl: number, t2: number) => {
      const r = decision === 'BUY' ? eH - sl : decision === 'SELL' ? sl - eL : 0
      if (r <= 0) return '—'
      const n = Math.abs(t2 - (decision === 'BUY' ? eH : eL)) / r
      return `1:${n.toFixed(1)}`
    }

    const rawScore = body.timeframes.reduce((s, tf) => s + sigWeight(tf.signal), 0)
    const instMeta = ruleResult.institutionalMeta
    const features = decision !== 'NO TRADE'
      ? extractFeatures(body, decision as 'BUY' | 'SELL', rawScore, instMeta ? {
          grade:        instMeta.grade,
          hasSweep:     instMeta.hasSweep,
          hasOB:        instMeta.hasOB,
          pdQuality:    instMeta.pdQuality,
          hasFVG:       instMeta.hasFVG,
          hasBOS:       instMeta.hasBOS,
          hasCHoCH:     instMeta.hasCHoCH,
          hasEqLevels:  instMeta.hasEqLevels,
          macdConfirms: instMeta.macdConfirms,
        } : undefined)
      : {}
    const learnedBoost = decision !== 'NO TRADE'
      ? computeLearnedBoost(features, learnedWeights)
      : 0
    const finalConfidence = decision !== 'NO TRADE'
      ? Math.min(92, Math.max(28, confidence + learnedBoost))
      : confidence

    // PRELIMINARY result — uses rule-engine thesis/marketBias/levels. Sent
    // immediately when streaming so the UI can render the trade card while
    // Claude is still working.
    const preliminary: FMTraderResponse = {
      decision,
      confidence:         finalConfidence,
      setupGrade:         ruleResult.setupGrade,
      confluenceScore:    ruleResult.confluenceScore,
      entryZone:          [entryLow, entryHigh],
      stopLoss,
      tp1, tp2, tp3,
      rrRatio:            calcRR(entryLow, entryHigh, stopLoss, tp2),
      timeValidity:       body.tradeHorizon === 'swing'
        ? `Valid for up to 7 days — swing trade, session timing ignored`
        : `Valid for the ${slotMeta.label} hour (${slotMeta.name})`,
      thesis:             ruleResult.thesis,
      technicalBreakdown: ruleResult.technicalBreakdown,
      riskFactors:        ruleResult.riskFactors,
      sessionContext:     ruleResult.sessionContext,
      marketBias:         ruleResult.marketBias,
      traderNote:         buildTraderNote(body, decision, finalConfidence, dec),
      generatedAt:        Date.now(),
      tradeHorizon:       ruleResult.tradeHorizon,
      institutionalMeta:  ruleResult.institutionalMeta,
    }

    // Shared finishing routine: merge Claude overrides into preliminary,
    // cache, save to DB, fire outcome-checker. Used by both paths so the
    // streaming and non-streaming flows produce identical persisted state.
    const finishSlowPath = async (narrative: Awaited<ReturnType<typeof getClaudeNarrative>>): Promise<FMTraderResponse> => {
      const merged: FMTraderResponse = { ...preliminary }
      if (narrative?.thesis)     merged.thesis     = narrative.thesis
      if (narrative?.marketBias) merged.marketBias = narrative.marketBias

      // Claude levels merge with formula levels, but with ATR-based SOFT CLAMPS
      // that preserve Claude's structural intent while sanding off both extremes:
      //   • SL too tight  → gets pushed out to the noise-floor distance
      //   • SL too wide   → gets pulled in to a still-reasonable ceiling
      //   • TP too close  → gets pushed out to TP-minimum R-multiple
      //   • TP unreachable → gets pulled in to a viable R-multiple
      //
      // Numbers below are calibrated for the signal's validity window
      // (1-2h intraday, multi-day swing) so trades have a real shot at TPs.
      let fEntryLow = entryLow, fEntryHigh = entryHigh, fSL = stopLoss
      let fTP1 = tp1, fTP2 = tp2, fTP3 = tp3
      const clv = narrative
      if (clv && decision !== 'NO TRADE') {
        const isSwing  = (body.tradeHorizon ?? 'intraday') === 'swing'
        const isBuy    = decision === 'BUY'
        const atrUnit  = atr.atrProxy > 0 ? atr.atrProxy : price * 0.005

        // Entry zone — Claude may shift it, but clamp the drift to ±N×ATR
        // from current price so the zone is still fillable inside the window.
        const ENTRY_DRIFT_MULT = isSwing ? 1.5 : 1.0
        const entryDriftCap    = atrUnit * ENTRY_DRIFT_MULT
        const clampNear = (v: number) => Math.min(Math.max(v, price - entryDriftCap), price + entryDriftCap)
        if (clv.entryLow  > 0) fEntryLow  = round(clampNear(clv.entryLow),  dec)
        if (clv.entryHigh > 0) fEntryHigh = round(clampNear(clv.entryHigh), dec)

        // The "reference entry" for SL/TP distance math — opposite end of the
        // entry zone from the trade direction (entryHigh for BUY, entryLow for SELL).
        const refEntry = isBuy ? fEntryHigh : fEntryLow

        // SL bounds — floor prevents noise-stops, ceiling prevents wild stops.
        // Pair tuning nudges the floor up (if SL hit too often) or ceiling down
        // (if too many expirations indicate stops were too distant).
        const SL_FLOOR_MULT   = (isSwing ? 0.50 : 0.30) * pairTuning.slFloorMult
        const SL_CEILING_MULT = (isSwing ? 2.50 : 1.50) * pairTuning.slCeilingMult
        const slFloorDist     = atrUnit * SL_FLOOR_MULT
        const slCeilingDist   = atrUnit * SL_CEILING_MULT
        if (clv.stopLoss > 0) {
          const wantedDist = Math.abs(refEntry - clv.stopLoss)
          const clampedDist = Math.min(Math.max(wantedDist, slFloorDist), slCeilingDist)
          fSL = round(isBuy ? refEntry - clampedDist : refEntry + clampedDist, dec)
        }

        // TPs — bounded as R-multiples of the realised SL distance, with
        // pair-specific multipliers applied (e.g., 0.85 on a pair whose TP1
        // historically hits <35% of the time → pulls TP1 closer).
        const risk = Math.abs(refEntry - fSL)
        if (risk > 0) {
          const staticTP = isSwing
            ? { tp1: [1.5, 3.5], tp2: [2.5, 6.0], tp3: [3.5, 9.0] }
            : { tp1: [1.0, 2.5], tp2: [1.5, 4.0], tp3: [2.0, 6.0] }
          const TP_BOUNDS = {
            tp1: [staticTP.tp1[0] * pairTuning.tp1Mult, staticTP.tp1[1] * pairTuning.tp1Mult],
            tp2: [staticTP.tp2[0] * pairTuning.tp2Mult, staticTP.tp2[1] * pairTuning.tp2Mult],
            tp3: [staticTP.tp3[0] * pairTuning.tp3Mult, staticTP.tp3[1] * pairTuning.tp3Mult],
          }
          const clampTP = (claudeTP: number, [minR, maxR]: number[]): number => {
            if (claudeTP <= 0) return claudeTP   // caller will keep formula value
            const wantedR  = Math.abs(claudeTP - refEntry) / risk
            const clampedR = Math.min(Math.max(wantedR, minR), maxR)
            return round(isBuy ? refEntry + clampedR * risk : refEntry - clampedR * risk, dec)
          }
          const c1 = clampTP(clv.tp1, TP_BOUNDS.tp1); if (c1 > 0) fTP1 = c1
          const c2 = clampTP(clv.tp2, TP_BOUNDS.tp2); if (c2 > 0) fTP2 = c2
          const c3 = clampTP(clv.tp3, TP_BOUNDS.tp3); if (c3 > 0) fTP3 = c3
        }
      }
      merged.entryZone = [fEntryLow, fEntryHigh]
      merged.stopLoss  = fSL
      merged.tp1 = fTP1; merged.tp2 = fTP2; merged.tp3 = fTP3
      merged.rrRatio   = calcRR(fEntryLow, fEntryHigh, fSL, fTP2)

      // Cache (BUY/SELL only)
      if (merged.decision !== 'NO TRADE' && !body.scanOnly) {
        cache.set(`${body.slug}:${utcHour}:${body.tradeHorizon ?? "intraday"}`, { data: merged, ts: nowTs, expiresAt: hourEnd.getTime() })
      }

      // Persist prediction row (awaited — Vercel kills the function on response close)
      if (decision !== 'NO TRADE' && dbUser && !body.scanOnly) {
        try {
          const alreadySaved = await prisma.fMPrediction.findFirst({
            where: { userId: dbUser.id, slug: body.slug, tradeHorizon: body.tradeHorizon ?? 'intraday', generatedAt: { gte: hourStart } },
            select: { id: true },
          })
          if (!alreadySaved) {
            const expiresAt = predictionExpiresAt(body.category, nowTs, body.tradeHorizon)
            const snapshot: MarketSnapshot = {
              decision, features, rawScore, claudeUsed: narrative !== null, learnedBoost,
            }
            await prisma.fMPrediction.create({
              data: {
                userId:            dbUser.id,
                slug:              body.slug,
                display:           body.display,
                category:          body.category,
                sessionSlot:       body.sessionSlot,
                tradeHorizon:      body.tradeHorizon ?? 'intraday',
                decision,
                confidence:        finalConfidence,
                entryLow:          fEntryLow,
                entryHigh:         fEntryHigh,
                stopLoss:          fSL,
                tp1: fTP1, tp2: fTP2, tp3: fTP3,
                rrRatio:           merged.rrRatio,
                priceAtCall:       body.price,
                marketSnapshot:    snapshot as object,
                generatedAt:       new Date(merged.generatedAt),
                expiresAt,
                thesis:            merged.thesis,
                technicalBreakdown: merged.technicalBreakdown,
                marketBias:        merged.marketBias,
                riskFactors:       merged.riskFactors as object,
                sessionContext:    merged.sessionContext,
                traderNote:        merged.traderNote,
                timeValidity:      merged.timeValidity,
              },
            })
          }
        } catch (err) {
          console.error('[fm-trader/save-prediction]', err)
        }
      }

      // Outcome checker — fire-and-forget
      fetch(`${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/fm-trader/check-outcomes`, {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? ''}` },
      }).catch(() => { /* non-critical */ })

      return settleTokens(merged)
    }

    // ── Streaming path: send rule-engine preliminary first, Claude overrides second
    if (wantsStream && decision !== 'NO TRADE' && !body.scanOnly) {
      const stream = new ReadableStream({
        async start(controller) {
          const enc  = new TextEncoder()
          const send = (obj: object) => controller.enqueue(enc.encode(JSON.stringify(obj) + '\n'))
          try {
            // Chunk 1: rule-engine result (~100ms after request)
            send({ ...preliminary, _streaming: 'partial' })

            // Slow part: Claude narrative (5–15s)
            const narrative = await getClaudeNarrative(body, decision, finalConfidence, ruleResult.institutionalMeta)

            const merged = await finishSlowPath(narrative)

            // Chunk 2: overrides (the UI merges these onto chunk 1's state)
            const overrides: Record<string, unknown> = { _streaming: 'final' }
            if (narrative?.thesis     && narrative.thesis     !== preliminary.thesis)     overrides.thesis     = merged.thesis
            if (narrative?.marketBias && narrative.marketBias !== preliminary.marketBias) overrides.marketBias = merged.marketBias
            // Levels: only send if they actually changed
            if (merged.entryZone[0] !== preliminary.entryZone[0] || merged.entryZone[1] !== preliminary.entryZone[1]) overrides.entryZone = merged.entryZone
            if (merged.stopLoss !== preliminary.stopLoss) overrides.stopLoss = merged.stopLoss
            if (merged.tp1      !== preliminary.tp1)      overrides.tp1      = merged.tp1
            if (merged.tp2      !== preliminary.tp2)      overrides.tp2      = merged.tp2
            if (merged.tp3      !== preliminary.tp3)      overrides.tp3      = merged.tp3
            if (merged.rrRatio  !== preliminary.rrRatio)  overrides.rrRatio  = merged.rrRatio
            send(overrides)

            controller.close()
          } catch (e) {
            console.error('[fm-trader stream]', e)
            try { controller.error(e) } catch { /* already closed */ }
          }
        },
      })
      return new NextResponse(stream, {
        headers: {
          'Content-Type':      'application/x-ndjson',
          'Cache-Control':     'no-cache',
          'X-Accel-Buffering': 'no',
          'Transfer-Encoding': 'chunked',
        },
      })
    }

    // ── Non-streaming path (NO TRADE, scanOnly, or no streaming requested) ─────
    const narrative  = decision !== 'NO TRADE' && !body.scanOnly
      ? await getClaudeNarrative(body, decision, finalConfidence, ruleResult.institutionalMeta)
      : null
    const finalResult = await finishSlowPath(narrative)
    return NextResponse.json(finalResult)
  } catch (err) {
    console.error('[fm-trader]', err)
    const stale = cache.get(`${body.slug}:${utcHour}:${body.tradeHorizon ?? "intraday"}`)
    if (stale) {
      const staleDrift = staleLevelsWarning(stale.data, body.price)
      const staleResult = staleDrift
        ? { ...stale.data, riskFactors: [staleDrift, ...(stale.data.riskFactors ?? [])] }
        : stale.data
      return NextResponse.json(await settleTokens(staleResult))
    }
    // Refund — the run failed and the user received nothing. The stale-cache
    // branch above deliberately keeps the charge: they still got a prediction.
    if (tokenCharged && tokenUserId) {
      await creditTokens(tokenUserId, TOKENS_PER_RUN, 'refund_failed_run', body.slug)
        .catch(e => console.error('[fm-trader] token refund failed:', e))
    }
    return NextResponse.json({ error: 'Analysis engine error.' }, { status: 500 })
  }
}
