// Funded-account evaluation — product terms and rule engine.
//
// LEGAL SHAPE: the member pays for a skills evaluation and trades a demo
// account themselves. We do not pool member funds and do not trade on their
// behalf. At the funded stage the capital at risk is OURS, so a losing
// funded trader costs the firm, never another member. Keep it that way.
//
// All money is in PENCE (Int). Never floats — same reasoning as tokenBalance.

import { prisma } from '@/lib/prisma'

// ── Current product terms ────────────────────────────────────────────────
// Snapshotted onto each Evaluation row at purchase, so editing these values
// never changes the rules of a challenge already in progress.
//
// Three fee tiers, each buying a bigger simulated account — and the funded
// balance on passing equals that same account size, so "£30 gets you a
// £1,000 funded account" is literally true end to end.
export interface EvalTier { fee: number; accountSize: number }
export const EVAL_TIERS: EvalTier[] = [
  { fee: 30_00,  accountSize: 1_000_00 },  // £30  → £1,000
  { fee: 50_00,  accountSize: 2_000_00 },  // £50  → £2,000
  { fee: 100_00, accountSize: 5_000_00 },  // £100 → £5,000
]

/** Safe tier lookup — an out-of-range index falls back to the first tier. */
export function tierAt(index: number): EvalTier {
  return EVAL_TIERS[index] ?? EVAL_TIERS[0]
}

// Two phases. Phase 1 proves the edge, phase 2 repeats it on a fresh
// account — tracking resets between them, so phase 2 starts flat. Same
// targets and risk rules across every tier; only the account size scales.
export const EVAL_PHASE1_TARGET_PCT = 20      // +20%
export const EVAL_PHASE2_TARGET_PCT = 40      // +40%

export const EVAL_MAX_DRAWDOWN_PCT   = 10     // peak-to-trough, total
export const EVAL_MAX_DAILY_LOSS_PCT = 5      // from start-of-day equity
export const EVAL_MIN_TRADING_DAYS   = 5
export const EVAL_PROFIT_SPLIT_PCT   = 80     // trader's share once funded

export function gbp(pence: number): string {
  return `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export interface EvalTerms {
  feePaid: number; accountSize: number; fundedBalance: number
  profitTargetPct: number; phase1TargetPct: number; phase2TargetPct: number
  maxDrawdownPct: number; maxDailyLossPct: number
  minTradingDays: number; profitSplitPct: number
}

export function currentTerms(tierIndex = 0): EvalTerms {
  const tier = tierAt(tierIndex)
  return {
    feePaid:         tier.fee,
    accountSize:     tier.accountSize,
    // The funded balance IS the tier's account size — not a separate number.
    fundedBalance:   tier.accountSize,
    // A new challenge always starts on phase 1's target.
    profitTargetPct: EVAL_PHASE1_TARGET_PCT,
    phase1TargetPct: EVAL_PHASE1_TARGET_PCT,
    phase2TargetPct: EVAL_PHASE2_TARGET_PCT,
    maxDrawdownPct:  EVAL_MAX_DRAWDOWN_PCT,
    maxDailyLossPct: EVAL_MAX_DAILY_LOSS_PCT,
    minTradingDays:  EVAL_MIN_TRADING_DAYS,
    profitSplitPct:  EVAL_PROFIT_SPLIT_PCT,
  }
}

/** Human label for the stage a challenge is in. */
export function phaseLabel(phase: string): string {
  if (phase === 'phase1') return 'Phase 1 of 2'
  if (phase === 'phase2') return 'Phase 2 of 2'
  if (phase === 'funded') return 'Funded'
  return phase
}

// ── Derived progress ─────────────────────────────────────────────────────

export interface EvalProgress {
  equity:          number
  startingBalance: number
  profit:          number      // can be negative
  profitPct:       number
  targetEquity:    number
  drawdownFloor:   number      // equity below this = total-drawdown breach
  dailyLossFloor:  number | null
  progressPct:     number      // 0-100 toward the profit target
  tradingDays:     number
  daysRemaining:   number
  canPass:         boolean
}

export function computeProgress(e: {
  accountSize: number; currentEquity: number | null; peakEquity: number | null
  profitTargetPct: number; maxDrawdownPct: number; maxDailyLossPct: number
  minTradingDays: number; tradingDays: number; dayStartEquity: number | null
}): EvalProgress {
  const start  = e.accountSize
  const equity = e.currentEquity ?? start
  const peak   = Math.max(e.peakEquity ?? start, start)

  const profit       = equity - start
  const targetEquity = Math.round(start * (1 + e.profitTargetPct / 100))
  // Drawdown is peak-to-trough: a trader who runs to +6% then gives it all
  // back has drawn down from the peak, not from the starting balance.
  const drawdownFloor = Math.round(peak * (1 - e.maxDrawdownPct / 100))
  const dailyLossFloor = e.dayStartEquity != null
    ? Math.round(e.dayStartEquity * (1 - e.maxDailyLossPct / 100))
    : null

  const targetProfit = targetEquity - start
  const progressPct  = targetProfit > 0
    ? Math.max(0, Math.min(100, (profit / targetProfit) * 100))
    : 0

  return {
    equity, startingBalance: start, profit,
    profitPct:      start > 0 ? (profit / start) * 100 : 0,
    targetEquity, drawdownFloor, dailyLossFloor, progressPct,
    tradingDays:   e.tradingDays,
    daysRemaining: Math.max(0, e.minTradingDays - e.tradingDays),
    canPass:       equity >= targetEquity && e.tradingDays >= e.minTradingDays,
  }
}

export type RuleCheck =
  | { outcome: 'ok' }
  | { outcome: 'passed' }
  | { outcome: 'breached'; reason: string }

/**
 * Evaluate the rules against a freshly reported equity figure.
 *
 * Breach checks run BEFORE the pass check: a trader who hits the profit
 * target on the same tick that they blow the daily-loss limit has still
 * broken a rule, and letting the pass win would be the wrong way round.
 */
export function checkRules(e: {
  accountSize: number; peakEquity: number | null; dayStartEquity: number | null
  profitTargetPct: number; maxDrawdownPct: number; maxDailyLossPct: number
  minTradingDays: number; tradingDays: number
}, equity: number): RuleCheck {
  const start = e.accountSize
  const peak  = Math.max(e.peakEquity ?? start, start)

  const drawdownFloor = Math.round(peak * (1 - e.maxDrawdownPct / 100))
  if (equity <= drawdownFloor) {
    return {
      outcome: 'breached',
      reason: `Maximum drawdown exceeded — equity ${gbp(equity)} fell to or below ${gbp(drawdownFloor)} (${e.maxDrawdownPct}% from peak ${gbp(peak)}).`,
    }
  }

  if (e.dayStartEquity != null) {
    const floor = Math.round(e.dayStartEquity * (1 - e.maxDailyLossPct / 100))
    if (equity <= floor) {
      return {
        outcome: 'breached',
        reason: `Daily loss limit exceeded — equity ${gbp(equity)} fell to or below ${gbp(floor)} (${e.maxDailyLossPct}% of today's opening ${gbp(e.dayStartEquity)}).`,
      }
    }
  }

  const targetEquity = Math.round(start * (1 + e.profitTargetPct / 100))
  if (equity >= targetEquity && e.tradingDays >= e.minTradingDays) {
    return { outcome: 'passed' }
  }

  return { outcome: 'ok' }
}

/** UTC date key used to detect a new trading day. */
export function utcDayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10)
}

/** The member's active challenge, if any. */
export async function getActiveEvaluation(userId: string | null | undefined) {
  if (!userId) return null
  return (prisma as any).evaluation.findFirst({
    where:   { userId, status: { in: ['evaluation', 'passed', 'funded'] } },
    orderBy: { startedAt: 'desc' },
  })
}

// ── Funded stage ─────────────────────────────────────────────────────────

/** Minimum withdrawable profit, so payouts aren't requested for pennies. */
export const PAYOUT_MINIMUM = 100_00   // £100 of trader share

export interface FundedProgress {
  equity:          number
  baseline:        number   // profit counts above this
  grossProfit:     number   // equity - baseline, floored at 0
  traderShare:     number   // grossProfit × split
  firmShare:       number
  drawdownFloor:   number
  canRequestPayout: boolean
}

/**
 * Payout maths for a funded account.
 *
 * Profit is measured against the baseline (high-water mark), NOT the
 * starting balance. After a payout the baseline moves up to the equity it
 * was taken at, so a trader cannot withdraw against the same gains twice —
 * and a trader who is underwater has to climb back above their previous
 * high before anything is withdrawable again.
 */
export function computeFunded(e: {
  fundedBalance: number | null; fundedBaseline: number | null
  currentEquity: number | null; peakEquity: number | null
  maxDrawdownPct: number; profitSplitPct: number
}): FundedProgress {
  const balance  = e.fundedBalance ?? 0
  const baseline = e.fundedBaseline ?? balance
  const equity   = e.currentEquity ?? balance
  const peak     = Math.max(e.peakEquity ?? balance, balance)

  const grossProfit = Math.max(0, equity - baseline)
  const traderShare = Math.round(grossProfit * (e.profitSplitPct / 100))

  return {
    equity, baseline, grossProfit, traderShare,
    firmShare:      grossProfit - traderShare,
    drawdownFloor:  Math.round(peak * (1 - e.maxDrawdownPct / 100)),
    canRequestPayout: traderShare >= PAYOUT_MINIMUM,
  }
}
