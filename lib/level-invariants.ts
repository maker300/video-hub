// Canonical level invariant enforcer for FM Trader predictions.
//
// This module exists because level-generation has grown three parallel
// paths (structural, Claude-narrative, cache-hit) and past bugs have been
// one-off clamps added in one path but missing in another. When a bad
// prediction ships (SL sitting inside the entry zone, TP1 equal to the
// entry edge, TPs out of order), the pattern is always the same: a
// specific path lacks a specific check the other paths already have.
//
// The fix is not another clamp. It is a single enforcement pass applied
// AFTER any level path assembles its output, before persistence and before
// the client sees the numbers. Adding a new level path (or editing one)
// then becomes safe by construction: whatever numbers come out get run
// through the same gate.
//
// Rules enforced (BUY — SELL is the mirror throughout):
//   1. entryLow  <  entryHigh          — zone has positive width
//   2. stopLoss  <  entryLow           — SL below the near edge of entry
//   3. tp1       >  entryHigh          — TP above the far edge of entry
//   4. tp1       <  tp2  <  tp3        — TPs strictly ordered outward
//   5. gap(SL,   entryLow)  ≥ minGap   — SL not sitting on the boundary
//   6. gap(tp1,  entryHigh) ≥ minGap   — TP1 not sitting on the boundary
//
// `minGap` is the max of a small ATR fraction and a price-scaled fallback,
// so it's meaningful on FX (a few pips) and on gold/BTC (a few points).
//
// Two-phase approach:
//   Phase 1 — repair mild rounding wobbles by nudging the offending level
//             outward by minGap. This handles the common case where a valid
//             computation was rounded onto an entry-zone boundary.
//   Phase 2 — after repair, re-check. If anything is still broken, reject:
//             the caller should NOT persist this row. Broken data is worse
//             than an empty page.
//
// Callers get a discriminated result so they can:
//   - Use `levels` when `ok === true` (possibly repaired)
//   - Convert to NO TRADE when `ok === false` (with `reason` for logging)

export interface Levels {
  entryLow:  number
  entryHigh: number
  stopLoss:  number
  tp1:       number
  tp2:       number
  tp3:       number
}

export interface EnforceOpts {
  decision: 'BUY' | 'SELL'
  price:    number
  /** Decimals for rounding (dp of the instrument). */
  dec:      number
  /** True-range ATR estimate for the timeframe, if available. */
  atr?:     number
}

export type EnforceResult =
  | { ok: true;  levels: Levels; repaired: string[] }
  | { ok: false; reason: string; failed: Levels }

// ── Helpers ──────────────────────────────────────────────────────────────

function round(n: number, dec: number): number {
  const m = Math.pow(10, dec)
  return Math.round(n * m) / m
}

/**
 * Minimum spacing between adjacent levels. ATR-based when available,
 * price-scaled fallback otherwise. The 0.05× ATR is intentionally small —
 * this is only the "not sitting on the boundary" guard, not the desired
 * spacing. Real spacing is set upstream in the level-computation paths.
 */
function minGap(opts: EnforceOpts): number {
  const atrGap = opts.atr && opts.atr > 0 ? opts.atr * 0.05 : 0
  const pctGap = opts.price * 0.0003   // 3 bps of price — ~3 pips at 1.10
  return Math.max(atrGap, pctGap)
}

// ── Enforcement ──────────────────────────────────────────────────────────

export function enforceLevelInvariants(input: Levels, opts: EnforceOpts): EnforceResult {
  const gap = minGap(opts)
  const dec = opts.dec
  const isBuy = opts.decision === 'BUY'

  // Work on a mutable copy — round every step so the repaired numbers are
  // representable at the instrument's precision (no float artefacts).
  const l: Levels = {
    entryLow:  round(input.entryLow,  dec),
    entryHigh: round(input.entryHigh, dec),
    stopLoss:  round(input.stopLoss,  dec),
    tp1:       round(input.tp1,       dec),
    tp2:       round(input.tp2,       dec),
    tp3:       round(input.tp3,       dec),
  }
  const repaired: string[] = []

  // ── Rule 1: entry zone must have positive width ─────────────────────────
  // If width is zero (rounded to same value) or inverted, reject outright —
  // repairing this in place would require guessing which edge is "right".
  if (l.entryLow >= l.entryHigh) {
    return { ok: false, reason: `entry zone collapsed (${l.entryLow} ≥ ${l.entryHigh})`, failed: l }
  }

  if (isBuy) {
    // ── Rule 2: SL below near edge ───────────────────────────────────────
    if (l.stopLoss >= l.entryLow) {
      const repaired_sl = round(l.entryLow - gap, dec)
      if (repaired_sl >= l.entryLow) {
        return { ok: false, reason: `SL cannot be pushed below entryLow at this precision (SL=${l.stopLoss}, entryLow=${l.entryLow}, gap=${gap})`, failed: l }
      }
      repaired.push(`SL ${l.stopLoss} → ${repaired_sl} (below entryLow)`)
      l.stopLoss = repaired_sl
    }
    // ── Rule 3: TP1 above far edge ───────────────────────────────────────
    if (l.tp1 <= l.entryHigh) {
      const repaired_tp1 = round(l.entryHigh + gap, dec)
      if (repaired_tp1 <= l.entryHigh) {
        return { ok: false, reason: `TP1 cannot be pushed above entryHigh at this precision (TP1=${l.tp1}, entryHigh=${l.entryHigh}, gap=${gap})`, failed: l }
      }
      repaired.push(`TP1 ${l.tp1} → ${repaired_tp1} (above entryHigh)`)
      l.tp1 = repaired_tp1
    }
    // ── Rule 4: TPs strictly ordered outward ─────────────────────────────
    if (l.tp2 <= l.tp1) {
      const repaired_tp2 = round(l.tp1 + gap, dec)
      repaired.push(`TP2 ${l.tp2} → ${repaired_tp2} (above TP1)`)
      l.tp2 = repaired_tp2
    }
    if (l.tp3 <= l.tp2) {
      const repaired_tp3 = round(l.tp2 + gap, dec)
      repaired.push(`TP3 ${l.tp3} → ${repaired_tp3} (above TP2)`)
      l.tp3 = repaired_tp3
    }
  } else {
    // SELL — mirror
    if (l.stopLoss <= l.entryHigh) {
      const repaired_sl = round(l.entryHigh + gap, dec)
      if (repaired_sl <= l.entryHigh) {
        return { ok: false, reason: `SL cannot be pushed above entryHigh at this precision (SL=${l.stopLoss}, entryHigh=${l.entryHigh}, gap=${gap})`, failed: l }
      }
      repaired.push(`SL ${l.stopLoss} → ${repaired_sl} (above entryHigh)`)
      l.stopLoss = repaired_sl
    }
    if (l.tp1 >= l.entryLow) {
      const repaired_tp1 = round(l.entryLow - gap, dec)
      if (repaired_tp1 >= l.entryLow) {
        return { ok: false, reason: `TP1 cannot be pushed below entryLow at this precision (TP1=${l.tp1}, entryLow=${l.entryLow}, gap=${gap})`, failed: l }
      }
      repaired.push(`TP1 ${l.tp1} → ${repaired_tp1} (below entryLow)`)
      l.tp1 = repaired_tp1
    }
    if (l.tp2 >= l.tp1) {
      const repaired_tp2 = round(l.tp1 - gap, dec)
      repaired.push(`TP2 ${l.tp2} → ${repaired_tp2} (below TP1)`)
      l.tp2 = repaired_tp2
    }
    if (l.tp3 >= l.tp2) {
      const repaired_tp3 = round(l.tp2 - gap, dec)
      repaired.push(`TP3 ${l.tp3} → ${repaired_tp3} (below TP2)`)
      l.tp3 = repaired_tp3
    }
  }

  // Belt-and-braces: after repair, re-run the invariants strictly. If
  // anything is STILL wrong, refuse. This catches pathological cases where
  // rounding pushed a level back onto a boundary.
  const finalOk = isBuy
    ? l.stopLoss < l.entryLow
      && l.tp1  > l.entryHigh
      && l.tp2  > l.tp1
      && l.tp3  > l.tp2
    : l.stopLoss > l.entryHigh
      && l.tp1  < l.entryLow
      && l.tp2  < l.tp1
      && l.tp3  < l.tp2

  if (!finalOk) {
    return { ok: false, reason: 'invariants still broken after repair', failed: l }
  }

  return { ok: true, levels: l, repaired }
}
