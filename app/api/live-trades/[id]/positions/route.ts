// Team + Admin: open a position in a LiveTrade.
//   POST body: { amountBtc: number }
//   Deducts (amountBtc + slippageBtc) from User.teamBalanceBtc atomically —
//   slippage is charged ONCE upfront (round-trip cost), so settlement at close
//   only computes gross PnL and the performance fee. One position per user per
//   trade (enforced by @@unique).
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionInfo } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const session = await getSessionInfo()
  if (!session.id || (session.role !== 'admin' && session.role !== 'team')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: liveTradeId } = await params
  const body = await req.json() as { amountBtc?: number }
  const amount = Number(body.amountBtc)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
  }

  const trade = await prisma.liveTrade.findUnique({
    where:   { id: liveTradeId },
    select:  { id: true, status: true, suggestedAmountBtc: true, slippagePct: true, leverage: true },
  })
  if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
  // Locking rule: once admin sets entry price, the trade is in session and
  // no new participants can join. Existing positions stay until close.
  if (trade.status !== 'pending') {
    const reason = trade.status === 'open'      ? 'Trade is now in session — entry price has been set'
                 : trade.status === 'closed'    ? 'Trade has closed'
                 : trade.status === 'cancelled' ? 'Trade was cancelled'
                                                : 'Trade is no longer joinable'
    return NextResponse.json({ error: reason }, { status: 400 })
  }
  // If admin set a suggested starting amount, enforce it as the MINIMUM stake —
  // team users can accept or add more, but not go below.
  if (trade.suggestedAmountBtc && amount < trade.suggestedAmountBtc) {
    return NextResponse.json(
      { error: `Minimum stake for this trade is ${trade.suggestedAmountBtc} BTC` },
      { status: 400 },
    )
  }

  // Round-trip slippage charged ONCE at open. Same formula as the old close-time
  // math (stake × rate × leverage) — just moved upfront so the close path stays
  // simple and the user sees a single, predictable cost when they enter.
  // leverage null = spot (1×) — slippage scales with exposure, so a no-leverage
  // trade pays minimal slippage.
  const lev         = trade.leverage ?? 1
  const slippageBtc = amount * trade.slippagePct * lev
  const totalDebit  = amount + slippageBtc

  try {
    const result = await prisma.$transaction(async tx => {
      // Create the position (unique constraint guarantees no duplicate)
      const position = await tx.liveTradePosition.create({
        data: { liveTradeId, userId: session.id!, amountBtc: amount, slippageBtc },
      })

      // Debit stake + upfront slippage. The balance check is part of the same
      // statement rather than a preceding read: under Read Committed, a
      // read-then-write lets two concurrent requests (on two different trades,
      // where the @@unique doesn't apply) both pass the check and both
      // decrement, overdrawing the account. Matching zero rows means the
      // balance was insufficient at write time.
      const debited = await tx.user.updateMany({
        where: { id: session.id!, teamBalanceBtc: { gte: totalDebit } },
        data:  { teamBalanceBtc: { decrement: totalDebit } },
      })

      if (debited.count === 0) {
        const exists = await tx.user.findUnique({
          where:  { id: session.id! },
          select: { id: true },
        })
        // Throwing rolls back the position created above.
        throw new Error(exists ? 'INSUFFICIENT_BALANCE' : 'USER_NOT_FOUND')
      }

      return position
    })

    return NextResponse.json({ ok: true, positionId: result.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    if (msg === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json(
        { error: `Insufficient BTC balance — stake ${amount} + slippage ${slippageBtc.toFixed(6)} requires ${totalDebit.toFixed(6)} BTC` },
        { status: 400 },
      )
    }
    if (msg === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    // Unique violation = already has position in this trade
    if (msg.includes('Unique constraint') || msg.includes('P2002')) {
      return NextResponse.json({ error: 'You already have a position in this trade' }, { status: 409 })
    }
    console.error('[live-trades/positions POST]', e)
    return NextResponse.json({ error: 'Failed to open position' }, { status: 500 })
  }
}
