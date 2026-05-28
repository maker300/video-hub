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
  }

  const trade = await prisma.liveTrade.findUnique({
    where:   { id },
    include: { positions: true },
  })
  if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 })

  // Cancel the trade — refund any open positions at face value
  if (body.cancel) {
    if (trade.status === 'closed') return NextResponse.json({ error: 'Already closed' }, { status: 400 })
    await prisma.$transaction(async tx => {
      // Refund every open position at zero PnL
      for (const pos of trade.positions.filter(p => p.status === 'open')) {
        await tx.user.update({
          where: { id: pos.userId },
          data:  { teamBalanceBtc: { increment: pos.amountBtc } },
        })
        await tx.liveTradePosition.update({
          where: { id: pos.id },
          data:  { status: 'closed', pnlBtc: 0, closedAt: new Date() },
        })
      }
      await tx.liveTrade.update({
        where: { id },
        data:  { status: 'cancelled', closedAt: new Date() },
      })
    })
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
    // Leveraged PnL multiplier: a 0.5% move at 1:500 leverage = 250% on stake
    const leverage    = trade.leverage    ?? 300
    const slippagePct = trade.slippagePct ?? 0.0005
    const feePct      = trade.feePct      ?? 0.10

    await prisma.$transaction(async tx => {
      for (const pos of trade.positions.filter(p => p.status === 'open')) {
        // Settlement breakdown — Gross → Slippage → Fee → Net (floored at -stake)
        const grossPnlBtc = pos.amountBtc * pnlPct * leverage
        const slippageBtc = pos.amountBtc * slippagePct * leverage       // always positive, always reduces PnL
        const afterSlip   = grossPnlBtc - slippageBtc
        const feeBtc      = afterSlip > 0 ? afterSlip * feePct : 0       // perf fee on profitable closes only
        const netRaw      = afterSlip - feeBtc
        const pnlBtc      = Math.max(netRaw, -pos.amountBtc)             // can't lose more than stake

        await tx.user.update({
          where: { id: pos.userId },
          data:  { teamBalanceBtc: { increment: pos.amountBtc + pnlBtc } },
        })
        await tx.liveTradePosition.update({
          where: { id: pos.id },
          data:  {
            status:      'closed',
            grossPnlBtc, slippageBtc, feeBtc, pnlBtc,
            closedAt:    new Date(),
          },
        })
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
    // Bell-only notification — close summary uses LEVERAGED % so user
    // sees the impact on their actual stake (capped at -100%)
    const leveragedPct = Math.max(pnlPct * leverage, -1)
    const pct = (leveragedPct * 100).toFixed(2)
    const sign = leveragedPct > 0 ? '+' : ''
    void notifyTeamUsers({
      email:   false,
      linkUrl: '/analysis/live-trades',
      subject: `${trade.decision} ${trade.display} closed at ${body.closePrice} (${sign}${pct}%)`,
      message: `Admin has closed the ${trade.decision} ${trade.display} trade at ${body.closePrice}. Outcome: ${sign}${pct}%. All positions have been settled and balances updated. Open the Live Trade page to review your result.`,
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
