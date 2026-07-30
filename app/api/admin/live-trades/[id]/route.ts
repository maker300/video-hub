// Admin: update LiveTrade — set entryPrice (open) / closePrice (close + settle positions)
//   PATCH body: { entryPrice?: number, closePrice?: number, note?: string, cancel?: boolean }
//
// SETTLEMENT: when closePrice is set, all open positions for this trade are
// closed in a single transaction. PnL is computed and the original stake +
// PnL is credited back to each user's teamBalanceBtc.
//
// pnlPct math:
//   BUY:  (close - entry) / entry
//   SELL: (entry - close) / entry
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/adminAuth'
import { notifyTeamUsers } from '@/lib/team-notify'
import { notifyPositionOwners } from '@/lib/position-notify'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as {
    entryPrice?: number
    closePrice?: number
    stopLoss?:   number
    note?:       string
    cancel?:     boolean
    approve?:    boolean          // approve a team-initiated 'awaiting_approval' request
    reject?:     boolean          // reject + refund the requester
  }

  const trade = await prisma.liveTrade.findUnique({
    where:   { id },
    include: { positions: true },
  })
  if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 })

  // ── Approve a team-initiated trade request ─────────────────────────────────
  // Moves status from 'awaiting_approval' → 'pending' AND auto-opens the
  // requester's position with their reserved stake. Other team users can then
  // join the same trade normally once it's pending.
  if (body.approve) {
    if (trade.status !== 'awaiting_approval') {
      return NextResponse.json({ error: 'Only awaiting_approval trades can be approved' }, { status: 400 })
    }
    if (!trade.requestedByUserId || !trade.requestedAmountBtc) {
      return NextResponse.json({ error: 'Trade has no requester data' }, { status: 400 })
    }
    const lev         = trade.leverage    ?? 1
    const slippagePct = trade.slippagePct ?? 0.0005
    const slippageBtc = trade.requestedAmountBtc * slippagePct * lev
    await prisma.$transaction(async tx => {
      await tx.liveTrade.update({
        where: { id },
        data:  { status: 'pending', approvedBy: trade.approvedBy ?? null },
      })
      // Auto-create the requester's position. Stake was already debited at
      // request time, so we just record the position row here.
      await tx.liveTradePosition.create({
        data: {
          liveTradeId: id,
          userId:      trade.requestedByUserId!,
          amountBtc:   trade.requestedAmountBtc!,
          slippageBtc,
        },
      })
    })
    void notifyTeamUsers({
      email:   false,
      linkUrl: '/analysis/live-trades',
      subject: `${trade.decision} ${trade.display} now open for participation`,
      message: `A team member's ${trade.decision} ${trade.display} request was approved. Their position is locked in; you can join the same trade until admin sets the entry price.`,
    })
    return NextResponse.json({ ok: true, approved: true })
  }

  // ── Reject a team-initiated trade request ──────────────────────────────────
  // Refunds the requester's debited stake + slippage, marks trade 'rejected'.
  if (body.reject) {
    if (trade.status !== 'awaiting_approval') {
      return NextResponse.json({ error: 'Only awaiting_approval trades can be rejected' }, { status: 400 })
    }
    if (trade.requestedByUserId && trade.requestedAmountBtc) {
      const lev         = trade.leverage    ?? 1
      const slippagePct = trade.slippagePct ?? 0.0005
      const refund      = trade.requestedAmountBtc + (trade.requestedAmountBtc * slippagePct * lev)
      await prisma.$transaction(async tx => {
        await tx.user.update({
          where: { id: trade.requestedByUserId! },
          data:  { teamBalanceBtc: { increment: refund } },
        })
        await tx.liveTrade.update({
          where: { id },
          data:  { status: 'rejected', closedAt: new Date(), note: body.note ?? trade.note },
        })
      })
    } else {
      await prisma.liveTrade.update({
        where: { id },
        data:  { status: 'rejected', closedAt: new Date() },
      })
    }
    return NextResponse.json({ ok: true, rejected: true })
  }

  // Cancel the trade — refund stake + upfront slippage on any open positions
  if (body.cancel) {
    if (trade.status === 'closed') return NextResponse.json({ error: 'Already closed' }, { status: 400 })
    const refunded: Array<{ userId: string; amountBtc: number }> = []
    await prisma.$transaction(async tx => {
      // Refund every open position at zero PnL. Includes the upfront slippage
      // debit since the round-trip cost was never actually incurred.
      for (const pos of trade.positions.filter(p => p.status === 'open')) {
        const refund = pos.amountBtc + (pos.slippageBtc ?? 0)
        await tx.user.update({
          where: { id: pos.userId },
          data:  { teamBalanceBtc: { increment: refund } },
        })
        await tx.liveTradePosition.update({
          where: { id: pos.id },
          data:  { status: 'closed', pnlBtc: 0, closedAt: new Date() },
        })
        refunded.push({ userId: pos.userId, amountBtc: pos.amountBtc })
      }
      await tx.liveTrade.update({
        where: { id },
        data:  { status: 'cancelled', closedAt: new Date() },
      })
    })
    // Targeted refund notification for each participant.
    if (refunded.length > 0) {
      void notifyPositionOwners({
        tradeDisplay: trade.display,
        decision:     trade.decision as 'BUY' | 'SELL',
        kind:         'cancelled',
        positions:    refunded.map(r => ({ ...r, pnlBtc: null })),
      })
    }
    return NextResponse.json({ ok: true, cancelled: true })
  }

  // Set entry price (move from 'pending' → 'open')
  if (typeof body.entryPrice === 'number' && body.entryPrice > 0) {
    if (trade.status === 'closed' || trade.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot set entry on a closed/cancelled trade' }, { status: 400 })
    }
    await prisma.liveTrade.update({
      where: { id },
      data:  {
        entryPrice: body.entryPrice,
        status:     'open',
        openedAt:   trade.openedAt ?? new Date(),
        note:       body.note ?? trade.note,
      },
    })
    // Bell-only notification — no email this time
    void notifyTeamUsers({
      email:   false,
      linkUrl: '/analysis/live-trades',
      subject: `Trade in session — ${trade.decision} ${trade.display}`,
      message: `Admin has set the entry price for ${trade.decision} ${trade.display} at ${body.entryPrice}. The trade is now in session and no longer accepts new participants. Existing positions will settle when the trade closes.`,
    })
  }

  // Update stop loss — admin can adjust the SL on any live trade (pending or
  // in-session) to tighten risk, trail to break-even, etc. Display-only —
  // doesn't trigger an auto-close, but team users see the new level immediately.
  if (typeof body.stopLoss === 'number' && body.stopLoss > 0) {
    if (trade.status === 'closed' || trade.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot adjust SL on a closed/cancelled trade' }, { status: 400 })
    }
    await prisma.liveTrade.update({
      where: { id },
      data:  { stopLoss: body.stopLoss, note: body.note ?? trade.note },
    })
    void notifyTeamUsers({
      email:   false,
      linkUrl: '/analysis/live-trades',
      subject: `Stop loss updated — ${trade.decision} ${trade.display}`,
      message: `Admin has moved the stop loss on ${trade.decision} ${trade.display} from ${trade.stopLoss} to ${body.stopLoss}. The trade is otherwise unchanged.`,
    })
  }

  // Set close price (move to 'closed', settle all positions)
  if (typeof body.closePrice === 'number' && body.closePrice > 0) {
    if (trade.status === 'closed' || trade.status === 'cancelled') {
      return NextResponse.json({ error: 'Already settled' }, { status: 400 })
    }
    const entry = trade.entryPrice ?? body.entryPrice
    if (!entry || entry <= 0) {
      return NextResponse.json({ error: 'Entry price must be set before closing' }, { status: 400 })
    }
    // Raw price-change % (unleveraged) — stored on the trade for reference
    const pnlPct = trade.decision === 'BUY'
      ? (body.closePrice - entry) / entry
      : (entry - body.closePrice) / entry
    // Leveraged PnL multiplier. Slippage was already charged upfront at
    // position-open time, so close math only computes Gross → Fee → Net.
    // leverage null = spot trade (1×, no amplification)
    const leverage = trade.leverage ?? 1
    const feePct   = trade.feePct   ?? 0.10

    // Settled positions captured out of the transaction so we can send
    // per-position targeted notifications afterwards.
    const settled: Array<{ userId: string; amountBtc: number; pnlBtc: number }> = []
    await prisma.$transaction(async tx => {
      for (const pos of trade.positions.filter(p => p.status === 'open')) {
        // Settlement: Gross → Fee (profit only) → Net (floored at -stake)
        const grossPnlBtc = pos.amountBtc * pnlPct * leverage
        const feeBtc      = grossPnlBtc > 0 ? grossPnlBtc * feePct : 0   // perf fee on PROFIT only — losses pay nothing
        const netRaw      = grossPnlBtc - feeBtc
        const pnlBtc      = Math.max(netRaw, -pos.amountBtc)             // can't lose more than stake

        await tx.user.update({
          where: { id: pos.userId },
          data:  { teamBalanceBtc: { increment: pos.amountBtc + pnlBtc } },
        })
        await tx.liveTradePosition.update({
          where: { id: pos.id },
          data:  {
            status:      'closed',
            grossPnlBtc, feeBtc, pnlBtc,
            closedAt:    new Date(),
          },
        })
        settled.push({ userId: pos.userId, amountBtc: pos.amountBtc, pnlBtc })
      }
      await tx.liveTrade.update({
        where: { id },
        data:  {
          closePrice: body.closePrice,
          pnlPct,
          status:     'closed',
          closedAt:   new Date(),
          note:       body.note ?? trade.note,
        },
      })
    })

    // Bell notifications — close summary uses LEVERAGED % so user sees the
    // impact on their actual stake (capped at -100%).
    const leveragedPct = Math.max(pnlPct * leverage, -1)
    const pct  = (leveragedPct * 100).toFixed(2)
    const sign = leveragedPct > 0 ? '+' : ''

    // Targeted per-position notification for participants — each gets their
    // own P/L in BTC, not just the "trade closed" broadcast.
    const notified = await notifyPositionOwners({
      tradeDisplay: trade.display,
      decision:     trade.decision as 'BUY' | 'SELL',
      kind:         'manual_close',
      positions:    settled,
      leveragedPct,
      closePrice:   body.closePrice,
    })

    // Broadcast to non-participants (so team users watching the market from
    // the sidelines still see the close event on their bell).
    void notifyTeamUsers({
      email:       false,
      linkUrl:     '/analysis/live-trades',
      subject:     `${trade.decision} ${trade.display} closed at ${body.closePrice} (${sign}${pct}%)`,
      message:     `Admin has closed the ${trade.decision} ${trade.display} trade at ${body.closePrice}. Outcome: ${sign}${pct}%. All positions have been settled and balances updated.`,
      skipUserIds: notified,
    })
    return NextResponse.json({ ok: true, pnlPct })
  }

  // Note-only update (no price change)
  if (body.note !== undefined && body.entryPrice === undefined && body.closePrice === undefined && !body.cancel) {
    await prisma.liveTrade.update({ where: { id }, data: { note: body.note } })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const trade = await prisma.liveTrade.findUnique({
    where:   { id },
    include: { positions: { where: { status: 'open' } } },
  })
  if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
  if (trade.positions.length > 0) {
    return NextResponse.json({ error: 'Cannot delete a trade with open positions — cancel it first' }, { status: 400 })
  }
  await prisma.liveTrade.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
