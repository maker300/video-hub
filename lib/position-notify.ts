// Targeted per-position bell notifications.
//
// When a LiveTrade settles (admin close, auto-close via check-outcomes, or
// cancel/reject), each position holder gets their OWN bell row with their
// personal P/L breakdown — instead of only a broadcast "trade closed" ping.
// Zero new CPU: this runs inside the same DB transaction that closes the
// positions, adding one createMany insert.
//
// Deep-link goes to /analysis/live-trades?tab=mine so the user lands on
// their positions tab immediately.

import { prisma } from '@/lib/prisma'

export type CloseKind =
  | 'tp1_hit'        // auto-closed at TP1
  | 'sl_hit'         // auto-closed at SL
  | 'manual_close'   // admin hit Set Close
  | 'cancelled'      // admin cancelled — refund
  | 'expired'        // outcome expired

interface PositionSummary {
  userId:    string
  amountBtc: number
  pnlBtc:    number | null   // null on cancelled — nothing settled
}

interface NotifyPositionsOpts {
  tradeDisplay: string           // e.g. "XAU/USD"
  decision:     'BUY' | 'SELL'
  kind:         CloseKind
  positions:    PositionSummary[]
  /** Leveraged % return applied to the whole trade. Used in the headline. */
  leveragedPct?: number
  /** Close price for context. */
  closePrice?:   number
}

// ── Wording per outcome ──────────────────────────────────────────────────────

function headline(opts: NotifyPositionsOpts, p: PositionSummary): string {
  const dir = `${opts.decision} ${opts.tradeDisplay}`
  const pnl = p.pnlBtc ?? 0
  const sign = pnl >= 0 ? '+' : ''
  const pct  = opts.leveragedPct != null ? `${opts.leveragedPct >= 0 ? '+' : ''}${(opts.leveragedPct * 100).toFixed(2)}%` : ''

  switch (opts.kind) {
    case 'tp1_hit':      return `🎯 TP1 hit · ${dir} · ${sign}${pnl.toFixed(8)} BTC${pct ? ` (${pct})` : ''}`
    case 'sl_hit':       return `🛑 SL hit · ${dir} · ${sign}${pnl.toFixed(8)} BTC${pct ? ` (${pct})` : ''}`
    case 'manual_close': return `Position closed · ${dir} · ${sign}${pnl.toFixed(8)} BTC${pct ? ` (${pct})` : ''}`
    case 'expired':      return `Trade expired · ${dir} · ${sign}${pnl.toFixed(8)} BTC${pct ? ` (${pct})` : ''}`
    case 'cancelled':    return `Trade cancelled · ${dir} — stake refunded`
  }
}

function body(opts: NotifyPositionsOpts, p: PositionSummary): string {
  const pnl = p.pnlBtc ?? 0
  const sign = pnl >= 0 ? '+' : ''
  const closeCtx = opts.closePrice ? ` at ${opts.closePrice}` : ''

  switch (opts.kind) {
    case 'tp1_hit':
      return `Your ${opts.decision} ${opts.tradeDisplay} position (${p.amountBtc.toFixed(8)} BTC stake) hit TP1${closeCtx} and settled at ${sign}${pnl.toFixed(8)} BTC. Balance updated.`
    case 'sl_hit':
      return `Your ${opts.decision} ${opts.tradeDisplay} position (${p.amountBtc.toFixed(8)} BTC stake) was stopped out${closeCtx} at ${sign}${pnl.toFixed(8)} BTC. Balance updated.`
    case 'manual_close':
      return `Admin closed the ${opts.decision} ${opts.tradeDisplay} trade${closeCtx}. Your ${p.amountBtc.toFixed(8)} BTC position settled at ${sign}${pnl.toFixed(8)} BTC.`
    case 'expired':
      return `Your ${opts.decision} ${opts.tradeDisplay} position (${p.amountBtc.toFixed(8)} BTC stake) expired at ${sign}${pnl.toFixed(8)} BTC. Balance updated.`
    case 'cancelled':
      return `The ${opts.decision} ${opts.tradeDisplay} trade was cancelled by admin. Your ${p.amountBtc.toFixed(8)} BTC stake was refunded to your balance.`
  }
}

/**
 * Write one AdminNotification row per position holder with their personal
 * P/L. Fire-and-forget at the call site — errors log but don't block the
 * close transaction.
 *
 * Returns the set of userIds that got a targeted notification so the caller
 * can skip them when firing the broadcast to non-participants.
 */
export async function notifyPositionOwners(opts: NotifyPositionsOpts): Promise<Set<string>> {
  const notified = new Set<string>()
  if (opts.positions.length === 0) return notified

  try {
    await prisma.adminNotification.createMany({
      data: opts.positions.map(p => ({
        userId:  p.userId,
        subject: headline(opts, p),
        message: body(opts, p),
        linkUrl: '/analysis/live-trades?tab=mine',
      })),
      skipDuplicates: true,
    })
    for (const p of opts.positions) notified.add(p.userId)
  } catch (err) {
    console.error('[position-notify] failed:', err)
  }
  return notified
}
