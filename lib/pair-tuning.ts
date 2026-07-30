// Per-pair / per-horizon outcome-based tuning for SL & TP bounds.
//
// Premise: the static [min, max] R-multiples in `recalcLevels` and the Claude
// clamp are educated guesses. After a pair has 20+ resolved predictions we can
// nudge those bounds based on what actually happened — keeping the trades
// pair-aware rather than one-size-fits-all.
//
// Adjustments returned are MULTIPLIERS on the static bounds (1.0 = no change).
// We never invert the relationships (a TP3 multiplier is never > 1.0 if its
// hit-rate is below TP2's), so the order TP1 < TP2 < TP3 is preserved.
//
// Why multiplier-of-static rather than absolute values? It keeps the static
// table as the "anchor" — we never drift more than 30% in any direction even
// on a pair that empirically wants tighter or wider targets.

import { prisma } from '@/lib/prisma'

const RECENT_DAYS  = 30                                // window for hit-rate stats
const MIN_SAMPLES  = 10                                // below this, return identity (no enough signal)
const RECENT_MS    = RECENT_DAYS * 24 * 60 * 60 * 1000
const CACHE_TTL_MS = 5 * 60_000                         // 5-min in-process cache

export interface PairTuning {
  /** Multiplier applied to BOTH min and max R for TP1. 1.0 = no change. */
  tp1Mult: number
  /** Same for TP2. */
  tp2Mult: number
  /** Same for TP3. */
  tp3Mult: number
  /** Multiplier on SL floor — tighten if too many noise-stops. */
  slFloorMult: number
  /** Multiplier on SL ceiling — narrow if wide stops never resolve. */
  slCeilingMult: number
  /** Diagnostic: how many resolved trades the tuning is based on. */
  samples: number
  /** Diagnostic: hit-rate at each target. */
  tp1Rate: number
  tp2Rate: number
  tp3Rate: number
  slRate:  number
  expiredRate: number
}

const IDENTITY: PairTuning = {
  tp1Mult: 1, tp2Mult: 1, tp3Mult: 1,
  slFloorMult: 1, slCeilingMult: 1,
  samples: 0, tp1Rate: 0, tp2Rate: 0, tp3Rate: 0, slRate: 0, expiredRate: 0,
}

const cache: Map<string, { ts: number; tuning: PairTuning }> = new Map()

function key(slug: string, horizon: 'intraday' | 'swing'): string {
  return `${slug}:${horizon}`
}

/**
 * Read recent outcomes for this pair+horizon, compute hit rates, and derive
 * multipliers that nudge bounds based on what actually worked.
 *
 * Adjustment philosophy:
 *   • TP1 hit rate < 35%  →  tp1Mult 0.85 (bring TP1 closer)
 *   • TP1 hit rate > 70%  →  tp1Mult 1.15 (push TP1 farther — leaving money)
 *   • Same pattern for TP2 (target 25%-55% hit rate)
 *   • Same pattern for TP3 (target 10%-30% hit rate)
 *   • SL hit > 50%        →  slFloorMult 1.15 (push stop further out)
 *   • Expired > 40%       →  slCeilingMult 0.9 (cap wider stops — kills slow trades)
 */
export async function getPairTuning(
  slug:    string,
  horizon: 'intraday' | 'swing' = 'intraday',
): Promise<PairTuning> {
  const k = key(slug, horizon)
  const c = cache.get(k)
  if (c && Date.now() - c.ts < CACHE_TTL_MS) return c.tuning

  try {
    const since = new Date(Date.now() - RECENT_MS)
    // Only count FILLED trades — predictions where price actually entered the
    // zone. Otherwise an "sl_hit" on a trade that never filled would tell us
    // nothing about the bounds and would skew tuning toward false tightening.
    const rows = await prisma.fMPrediction.findMany({
      where: {
        slug,
        tradeHorizon: horizon,
        outcome:      { not: 'pending' },
        filled:       true,
        createdAt:    { gte: since },
      },
      select: { outcome: true },
    })

    const n = rows.length
    if (n < MIN_SAMPLES) {
      cache.set(k, { ts: Date.now(), tuning: { ...IDENTITY, samples: n } })
      return cache.get(k)!.tuning
    }

    let tp1 = 0, tp2 = 0, tp3 = 0, sl = 0, expired = 0
    for (const r of rows) {
      const o = r.outcome
      // tp3_hit implies tp1+tp2 also hit; tp2_hit implies tp1 also hit
      if (o === 'tp1_hit') tp1++
      else if (o === 'tp2_hit') { tp1++; tp2++ }
      else if (o === 'tp3_hit') { tp1++; tp2++; tp3++ }
      else if (o === 'sl_hit') sl++
      else if (o === 'expired') expired++
    }

    const tp1Rate = tp1 / n
    const tp2Rate = tp2 / n
    const tp3Rate = tp3 / n
    const slRate  = sl  / n
    const expRate = expired / n

    // Build adjustment multipliers. Stay inside [0.70, 1.30] so we never
    // drift more than 30% from the static anchor.
    const clamp = (v: number) => Math.min(1.30, Math.max(0.70, v))

    let tp1Mult = 1, tp2Mult = 1, tp3Mult = 1
    if (tp1Rate < 0.35) tp1Mult = 0.85       // bring TP1 in
    else if (tp1Rate > 0.70) tp1Mult = 1.15  // push TP1 out

    if (tp2Rate < 0.25) tp2Mult = 0.85
    else if (tp2Rate > 0.55) tp2Mult = 1.15

    if (tp3Rate < 0.10) tp3Mult = 0.80
    else if (tp3Rate > 0.30) tp3Mult = 1.15

    // Preserve TP1 < TP2 < TP3 ordering by lifting any later TP that ended up tighter
    tp2Mult = Math.max(tp2Mult, tp1Mult)
    tp3Mult = Math.max(tp3Mult, tp2Mult)

    // SL bounds — tighten the floor if SL hit a lot, narrow ceiling if expirations dominate
    const slFloorMult   = slRate  > 0.50 ? 1.15 : 1.0
    const slCeilingMult = expRate > 0.40 ? 0.90 : 1.0

    const tuning: PairTuning = {
      tp1Mult: clamp(tp1Mult), tp2Mult: clamp(tp2Mult), tp3Mult: clamp(tp3Mult),
      slFloorMult: clamp(slFloorMult), slCeilingMult: clamp(slCeilingMult),
      samples: n,
      tp1Rate, tp2Rate, tp3Rate, slRate, expiredRate: expRate,
    }
    cache.set(k, { ts: Date.now(), tuning })
    return tuning
  } catch {
    return IDENTITY
  }
}

/** Apply tp tuning multipliers to a TPBoundSet. */
export function applyTuningToTPBounds(
  bounds: { tp1: [number, number]; tp2: [number, number]; tp3: [number, number] },
  tuning: PairTuning,
): { tp1: [number, number]; tp2: [number, number]; tp3: [number, number] } {
  return {
    tp1: [bounds.tp1[0] * tuning.tp1Mult, bounds.tp1[1] * tuning.tp1Mult],
    tp2: [bounds.tp2[0] * tuning.tp2Mult, bounds.tp2[1] * tuning.tp2Mult],
    tp3: [bounds.tp3[0] * tuning.tp3Mult, bounds.tp3[1] * tuning.tp3Mult],
  }
}
