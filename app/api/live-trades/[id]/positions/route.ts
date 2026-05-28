// Team + Admin: open a position in a LiveTrade.
//   POST body: { amountBtc: number }
//   Deducts amountBtc from User.teamBalanceBtc atomically — one position per
//   user per trade (enforced by @@unique).
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
    select:  { id: true, status: true },
  })
  if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
  if (trade.status !== 'pending' && trade.status !== 'open') {
    return NextResponse.json({ error: 'Trade is no longer joinable' }, { status: 400 })
  }

  try {
    const result = await prisma.$transaction(async tx => {
      // Re-fetch with lock semantics: read current balance, then conditionally update.
      const user = await tx.user.findUnique({
        where:  { id: session.id! },
        select: { teamBalanceBtc: true },
      })
      if (!user) throw new Error('USER_NOT_FOUND')
      if (user.teamBalanceBtc < amount) throw new Error('INSUFFICIENT_BALANCE')

      // Create the position (unique constraint guarantees no duplicate)
      const position = await tx.liveTradePosition.create({
        data: { liveTradeId, userId: session.id!, amountBtc: amount },
      })

      // Atomic decrement (decrement vs set to avoid races with admin balance edits)
      await tx.user.update({
        where: { id: session.id! },
        data:  { teamBalanceBtc: { decrement: amount } },
      })

      return position
    })

    return NextResponse.json({ ok: true, positionId: result.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    if (msg === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json({ error: 'Insufficient BTC balance' }, { status: 400 })
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
