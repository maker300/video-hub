/**
 * FM Trader Rule Engine — Learning Agent
 *
 * When Claude makes a prediction and an outcome resolves (TP hit / SL hit),
 * this module extracts the market features that were present at prediction time,
 * and uses them to update a persistent set of feature weights stored in the DB.
 *
 * The rule engine loads those weights on every request. Over time — as hundreds
 * of outcomes accumulate — the rule engine learns which market conditions
 * consistently lead to winning trades and which consistently lead to losses.
 *
 * Algorithm: per-feature Exponential Moving Average (EMA) of outcome scores.
 *   outcome score: +1 = win (any TP hit), -1 = loss (SL hit), 0 = expired
 *   update rule:   ema_new = ema_old + α × (outcome - ema_old)
 *   α = LEARNING_RATE (controls adaptation speed)
 *
 * After ≥ MIN_OBSERVATIONS per feature, the learned EMA is used to boost
 * or penalise the rule engine's confidence by up to ±MAX_BOOST points.
 *
 * Features are 0-1 normalised values representing how strongly each market
 * signal was present at prediction time.
 */

import { prisma } from '@/lib/prisma'
import type { FMTraderRequest } from '@/lib/fm-trader-types'

// ── Constants ─────────────────────────────────────────────────────────────────

const LEARNING_RATE    = 0.08  // EMA adaptation speed (0.05 = slow, 0.15 = fast)
const ACTIVE_THRESHOLD = 0.25  // Feature must score above this to count as "active"
const MIN_OBSERVATIONS = 15    // Min observations before a feature influences output
const MAX_BOOST        = 18    // Maximum confidence adjustment in either direction (points)
const CACHE_TTL        = 15 * 60 * 1000  // 15 min in-memory cache

// ── Types ─────────────────────────────────────────────────────────────────────

/** 0-1 normalised value per market feature. 1 = strongly present. */
export type FeatureVector = Record<string, number>

/** Per-feature learning state */
interface FeatureState {
  ema:   number  // EMA of outcome scores (-1 to +1). Positive = feature predicts wins.
  count: number  // Resolved predictions where this feature was active (≥ ACTIVE_THRESHOLD)
}

export interface LearnedWeights {
  features:     Record<string, FeatureState>
  totalLearned: number   // Total resolved predictions processed so far
  updatedAt:    string
}

/** Market snapshot stored with every prediction — used to learn from outcome later */
export interface MarketSnapshot {
  decision:     string
  features:     FeatureVector
  rawScore:     number    // Rule engine composite score
  claudeUsed:   boolean   // Whether Claude made this prediction or the rule engine
  learnedBoost: number    // Learned confidence adjustment that was applied
}

// ── Initial weights (all neutral — no prior belief) ───────────────────────────

const FEATURE_NAMES = [
  'rsi_1H_directional',   // RSI on 1H is in the winning zone for this direction
  'rsi_4H_directional',   // RSI on 4H supports direction
  'rsi_daily_directional',// RSI on Daily supports direction
  'ema_aligned_1H',       // EMA stack (9>21>50) aligned with direction on 1H
  'ema_aligned_4H',       // EMA stack aligned with direction on 4H
  'ema_aligned_daily',    // EMA stack aligned with direction on Daily
  'ema_aligned_weekly',   // Weekly trend agrees with direction
  'multi_tf_confluence',  // 3+ timeframes agree on direction
  'candle_confirms_1H',   // 1H signal/candle pattern supports direction
  'candle_confirms_4H',   // 4H signal supports direction
  'volume_elevated',      // Volume elevated above average
  'correlation_confirms', // Inter-market correlation confirms direction
  'correlation_conflicts',// Inter-market correlation conflicts (inverse signal)
  'session_peak',         // London/NY overlap — highest liquidity
  'session_good',         // London or NY session — decent liquidity
  'near_key_support',     // Price near support level (for BUY)
  'near_key_resistance',  // Price near resistance level (for SELL)
  'pdh_pdl_break',        // Breaks above PDH (BUY) or below PDL (SELL)
  'weekly_aligned',            // Weekly trend confirms direction strongly
  'atr_moderate',              // ATR is moderate — not extreme volatility
  'setup_grade_a',             // Rule engine graded the setup as Grade A
  'setup_grade_b',             // Rule engine graded the setup as Grade B
  'liquidity_sweep_confirmed', // Liquidity sweep (stop hunt) detected on 1H
  'order_block_hit',           // Price entered an active order block zone
  'pd_zone_optimal',           // Entry in optimal PD zone
  'fvg_active',                // Active Fair Value Gap in trend direction
  'bos_confirmed',             // Break of Structure (continuation)
  'choch_warning',             // Change of Character (negative — reversal warning)
  'eq_liquidity_target',       // EQH/EQL liquidity pool ahead
  'macd_confirms',             // MACD momentum confirms direction
] as const

const DEFAULT_WEIGHTS: LearnedWeights = {
  features:     Object.fromEntries(FEATURE_NAMES.map(f => [f, { ema: 0, count: 0 }])),
  totalLearned: 0,
  updatedAt:    new Date().toISOString(),
}

// ── In-memory cache ───────────────────────────────────────────────────────────

let weightsCache: { data: LearnedWeights; ts: number } | null = null

// ── Feature extraction ────────────────────────────────────────────────────────

/**
 * Convert raw market data into a normalised feature vector (0-1 per feature).
 * Called at prediction time — result stored in marketSnapshot for later learning.
 */
export function extractFeatures(
  d:              FMTraderRequest,
  decision:       'BUY' | 'SELL',
  rawScore:       number,
  institutional?: {
    grade?:        'A' | 'B' | 'C'
    hasSweep?:     boolean
    hasOB?:        boolean
    pdQuality?:    'optimal' | 'good' | 'fair' | 'poor'
    hasFVG?:       boolean
    hasBOS?:       boolean
    hasCHoCH?:     boolean
    hasEqLevels?:  boolean
    macdConfirms?: boolean
  },
): FeatureVector {
  const isBuy = decision === 'BUY'
  const tf1H  = d.timeframes.find(t => t.key === '1h')
  const tf4H  = d.timeframes.find(t => t.key === '4h')
  const tfD   = d.timeframes.find(t => t.key === 'daily')
  const tfW   = d.timeframes.find(t => t.key === 'weekly')
  const mc    = d.marketContext

  // ── RSI — directional fit ─────────────────────────────────────────────────
  // Mirror the rule engine's actual RSI logic from runAnalysis():
  //   BUY:  RSI 50–68 = momentum sweet spot (+6 conf); RSI > 75 = overbought (-8 conf)
  //   SELL: RSI 32–50 = momentum sweet spot (+6 conf); RSI < 25 = oversold   (-8 conf)
  // The rule engine is MOMENTUM-based, not mean-reversion. The previous learner
  // scored the opposite condition (low RSI = strong BUY) which trained the model
  // on the wrong features. Fixed: BUY rewards high-but-not-extreme RSI.
  function rsiScore(rsi: number | undefined): number {
    if (!rsi || rsi <= 0) return 0
    if (isBuy) {
      // BUY: engine rewards RSI 50–68 momentum zone
      if (rsi >= 50 && rsi <= 68) return 1.0   // ideal bullish momentum
      if (rsi >= 45 && rsi < 50)  return 0.5   // approaching momentum zone
      if (rsi > 68 && rsi < 75)   return 0.3   // strong but not extreme
      if (rsi >= 75)              return 0     // overbought — engine penalised
      return 0                                 // below 45 = bearish RSI, not a BUY feature
    } else {
      // SELL: engine rewards RSI 32–50 momentum zone
      if (rsi >= 32 && rsi <= 50) return 1.0   // ideal bearish momentum
      if (rsi > 50 && rsi <= 55)  return 0.5   // approaching momentum zone
      if (rsi > 25 && rsi < 32)   return 0.3   // strong but not extreme
      if (rsi <= 25)              return 0     // oversold — engine penalised
      return 0                                 // above 55 = bullish RSI, not a SELL feature
    }
  }

  // ── EMA alignment — stacked in the direction of trade ────────────────────
  function emaAlignment(tf: typeof tf1H): number {
    if (!tf || !tf.ema9 || !tf.ema21 || !tf.ema50) return 0
    const above21  = isBuy ? d.price > tf.ema21 : d.price < tf.ema21
    const above50  = isBuy ? d.price > tf.ema50 : d.price < tf.ema50
    const ema9v21  = isBuy ? tf.ema9 > tf.ema21 : tf.ema9 < tf.ema21
    const ema21v50 = isBuy ? tf.ema21 > tf.ema50 : tf.ema21 < tf.ema50
    return (above21 ? 0.3 : 0) + (above50 ? 0.2 : 0) + (ema9v21 ? 0.3 : 0) + (ema21v50 ? 0.2 : 0)
  }

  // ── Timeframe signal alignment ────────────────────────────────────────────
  function tfSignalScore(tf: typeof tf1H): number {
    if (!tf) return 0
    if (isBuy) {
      if (tf.signal === 'STRONG BUY') return 1.0
      if (tf.signal === 'BUY')        return 0.7
      return 0
    } else {
      if (tf.signal === 'STRONG SELL') return 1.0
      if (tf.signal === 'SELL')        return 0.7
      return 0
    }
  }

  // ── Multi-timeframe confluence ────────────────────────────────────────────
  const bullishTFs = [tf1H, tf4H, tfD, tfW].filter(tf =>
    tf && (tf.signal === 'BUY' || tf.signal === 'STRONG BUY')
  ).length
  const bearishTFs = [tf1H, tf4H, tfD, tfW].filter(tf =>
    tf && (tf.signal === 'SELL' || tf.signal === 'STRONG SELL')
  ).length
  const alignedTFs = isBuy ? bullishTFs : bearishTFs
  const multiTFConfluence = alignedTFs >= 4 ? 1.0 : alignedTFs === 3 ? 0.75 : alignedTFs === 2 ? 0.4 : 0

  // ── Session quality ───────────────────────────────────────────────────────
  const slot = parseInt(d.sessionSlot, 10)
  const sessionPeakScore = (slot >= 12 && slot <= 15) ? 1.0
    : (slot === 8 || slot === 9 || slot === 16 || slot === 17) ? 0.7
    : (slot >= 10 && slot <= 11) ? 0.5
    : 0.1  // dead session or crypto off-hours

  // ── Key level proximity ───────────────────────────────────────────────────
  const kl     = d.keyLevels
  const pct    = (a: number, b: number) => Math.abs(a - b) / Math.max(a, b)
  const nearS1 = pct(d.price, kl.support1) < 0.005
  const nearS2 = pct(d.price, kl.support2) < 0.007
  const nearR1 = pct(d.price, kl.resistance1) < 0.005
  const nearR2 = pct(d.price, kl.resistance2) < 0.007
  const nearSupport    = isBuy  ? ((nearS1 ? 0.7 : 0) + (nearS2 ? 0.3 : 0)) : 0
  const nearResistance = !isBuy ? ((nearR1 ? 0.7 : 0) + (nearR2 ? 0.3 : 0)) : 0

  // ── PDH/PDL break ─────────────────────────────────────────────────────────
  const pdh = mc?.prevDayHigh ?? 0
  const pdl = mc?.prevDayLow  ?? 0
  const pdhBreak = isBuy  && pdh > 0 && d.price > pdh ? 1 : 0
  const pdlBreak = !isBuy && pdl > 0 && d.price < pdl ? 1 : 0

  // ── Weekly trend ──────────────────────────────────────────────────────────
  const weeklyAligned = tfW
    ? isBuy
      ? (tfW.signal === 'STRONG BUY' ? 1 : tfW.signal === 'BUY' ? 0.6 : 0)
      : (tfW.signal === 'STRONG SELL' ? 1 : tfW.signal === 'SELL' ? 0.6 : 0)
    : 0

  // ── Volume ────────────────────────────────────────────────────────────────
  // Use the real volumeRatio from marketContext where available.
  // Forex is excluded (Twelve Data tick count ≠ real volume — not reliable as a feature).
  // For forex: always 0 so the learner never accumulates a meaningless volume weight.
  const isForex = d.category === 'forex'
  const realVolRatio = mc?.volumeRatio ?? 0
  const volumeProxy = isForex ? 0
    : realVolRatio >= 2.0 ? 1.0
    : realVolRatio >= 1.5 ? 0.8
    : realVolRatio >= 1.0 ? 0.5
    : realVolRatio >= 0.7 ? 0.2
    : 0  // thin volume = feature not active

  // ── ATR moderateness ─────────────────────────────────────────────────────
  const atr14  = mc?.atr14 ?? 0
  const atrPct = atr14 > 0 ? (atr14 / d.price) * 100 : 0
  const atrModerate = atrPct > 0.3 && atrPct < 2.5 ? 1 : atrPct > 0 ? 0.4 : 0

  // ── Inter-market correlation ──────────────────────────────────────────────
  const corrConfirms  = d.intermarket?.signal === 'confirms'  ? 1.0 : 0
  const corrConflicts = d.intermarket?.signal === 'conflicts' ? 1.0 : 0

  return {
    rsi_1H_directional:    rsiScore(tf1H?.rsi),
    rsi_4H_directional:    rsiScore(tf4H?.rsi),
    rsi_daily_directional: rsiScore(tfD?.rsi),
    ema_aligned_1H:        emaAlignment(tf1H),
    ema_aligned_4H:        emaAlignment(tf4H),
    ema_aligned_daily:     emaAlignment(tfD),
    ema_aligned_weekly:    weeklyAligned,
    multi_tf_confluence:   multiTFConfluence,
    candle_confirms_1H:    tfSignalScore(tf1H),
    candle_confirms_4H:    tfSignalScore(tf4H),
    volume_elevated:       volumeProxy,
    correlation_confirms:  corrConfirms,
    correlation_conflicts: corrConflicts,
    session_peak:          sessionPeakScore >= 0.9 ? 1 : 0,
    session_good:          sessionPeakScore >= 0.45 ? 1 : 0,
    near_key_support:      Math.min(1, nearSupport),
    near_key_resistance:   Math.min(1, nearResistance),
    pdh_pdl_break:         isBuy ? pdhBreak : pdlBreak,
    weekly_aligned:            weeklyAligned,
    atr_moderate:              atrModerate,
    setup_grade_a:             institutional?.grade === 'A'           ? 1.0 : 0,
    setup_grade_b:             institutional?.grade === 'B'           ? 1.0 : 0,
    liquidity_sweep_confirmed: institutional?.hasSweep                ? 1.0 : 0,
    order_block_hit:           institutional?.hasOB                   ? 1.0 : 0,
    pd_zone_optimal:           institutional?.pdQuality === 'optimal' ? 1.0 : 0,
    fvg_active:                institutional?.hasFVG                  ? 1.0 : 0,
    bos_confirmed:             institutional?.hasBOS                  ? 1.0 : 0,
    choch_warning:             institutional?.hasCHoCH                ? 1.0 : 0,
    eq_liquidity_target:       institutional?.hasEqLevels             ? 1.0 : 0,
    macd_confirms:             institutional?.macdConfirms            ? 1.0 : 0,
  }
}

// ── Weight loading ─────────────────────────────────────────────────────────────

export async function getLearnedWeights(): Promise<LearnedWeights> {
  if (weightsCache && Date.now() - weightsCache.ts < CACHE_TTL) {
    return weightsCache.data
  }
  try {
    const record = await (prisma as any).ruleWeights.findUnique({ where: { id: 'singleton' } })
    if (!record) {
      weightsCache = { data: DEFAULT_WEIGHTS, ts: Date.now() }
      return DEFAULT_WEIGHTS
    }
    const data = record.weights as LearnedWeights
    // Ensure all features exist (in case new features were added after initial write)
    for (const f of FEATURE_NAMES) {
      if (!data.features[f]) data.features[f] = { ema: 0, count: 0 }
    }
    weightsCache = { data, ts: Date.now() }
    return data
  } catch {
    return DEFAULT_WEIGHTS
  }
}

// ── Learning update ────────────────────────────────────────────────────────────

/**
 * Called by the cron job after resolving a prediction outcome.
 * outcome: +1 = win (any TP hit), -1 = loss (SL hit), 0 = expired (neutral)
 */
export async function learnFromOutcome(
  features:   FeatureVector,
  outcomeVal: number,           // +1, -1, or 0
): Promise<void> {
  const current = await getLearnedWeights()

  // Deep copy features map
  const updatedFeatures = Object.fromEntries(
    Object.entries(current.features).map(([k, v]) => [k, { ...v }])
  )

  for (const [feat, strength] of Object.entries(features)) {
    if (strength < ACTIVE_THRESHOLD) continue  // Feature not active enough to learn from

    const state = updatedFeatures[feat] ?? { ema: 0, count: 0 }
    // EMA update: weighted by feature strength (stronger signal = more weight)
    const effectiveRate = LEARNING_RATE * Math.min(1, strength)
    updatedFeatures[feat] = {
      ema:   state.ema + effectiveRate * (outcomeVal - state.ema),
      count: state.count + 1,
    }
  }

  const updated: LearnedWeights = {
    features:     updatedFeatures,
    totalLearned: (current.totalLearned ?? 0) + 1,
    updatedAt:    new Date().toISOString(),
  }

  try {
    await (prisma as any).ruleWeights.upsert({
      where:  { id: 'singleton' },
      create: { id: 'singleton', weights: updated, totalLearned: updated.totalLearned },
      update: { weights: updated, totalLearned: updated.totalLearned },
    })
    // Invalidate cache so next request loads fresh weights
    weightsCache = { data: updated, ts: Date.now() }
  } catch (err) {
    console.error('[rule-learner] Failed to save weights:', err)
  }
}

// ── Confidence boost calculation ───────────────────────────────────────────────

/**
 * Compute a confidence adjustment (in percentage points) based on learned weights.
 * Returns a number in the range [-MAX_BOOST, +MAX_BOOST].
 * Returns 0 if there is not enough data yet.
 */
export function computeLearnedBoost(
  features: FeatureVector,
  weights:  LearnedWeights,
): number {
  if (!weights.totalLearned || weights.totalLearned < 30) return 0  // Need data first

  let boost        = 0
  let activeCount  = 0
  let totalWeight  = 0

  for (const [feat, strength] of Object.entries(features)) {
    if (strength < ACTIVE_THRESHOLD) continue

    const state = weights.features[feat]
    if (!state || state.count < MIN_OBSERVATIONS) continue  // Not enough data for this feature

    // boost contribution = feature_strength × ema_win_bias × scaling
    // ema ranges from -1 (always loses) to +1 (always wins)
    // We scale by 3.5 so max contribution per feature ≈ 3.5 pts
    boost       += strength * state.ema * 3.5
    activeCount += 1
    totalWeight += strength
  }

  if (activeCount === 0) return 0

  // Normalise by number of features that fired so no single feature dominates
  const normalised = boost / Math.sqrt(Math.max(1, activeCount))
  return Math.round(Math.max(-MAX_BOOST, Math.min(MAX_BOOST, normalised)))
}

/**
 * Returns a human-readable explanation of what the learning agent has observed.
 * Used in the Claude prompt to give the model awareness of historical patterns.
 */
export function buildLearningContext(weights: LearnedWeights): string {
  if (!weights.totalLearned || weights.totalLearned < 30) {
    return `Learning agent: ${weights.totalLearned ?? 0} outcomes recorded — insufficient data for pattern adjustment yet (need 30+).`
  }

  // Find strongest positive and negative features
  const sorted = Object.entries(weights.features)
    .filter(([, s]) => s.count >= MIN_OBSERVATIONS)
    .sort((a, b) => Math.abs(b[1].ema) - Math.abs(a[1].ema))
    .slice(0, 6)

  const wins   = sorted.filter(([, s]) => s.ema > 0.2)
  const losses = sorted.filter(([, s]) => s.ema < -0.2)

  const winStr   = wins.map(([f, s]) =>
    `${f.replace(/_/g, ' ')} (win bias: +${(s.ema * 100).toFixed(0)}%, n=${s.count})`
  ).join('; ')
  const lossStr  = losses.map(([f, s]) =>
    `${f.replace(/_/g, ' ')} (loss bias: ${(s.ema * 100).toFixed(0)}%, n=${s.count})`
  ).join('; ')

  return [
    `Learning agent (${weights.totalLearned} outcomes processed):`,
    wins.length   ? `Historically profitable conditions: ${winStr}.` : '',
    losses.length ? `Historically losing conditions: ${lossStr}.` : '',
  ].filter(Boolean).join(' ')
}
