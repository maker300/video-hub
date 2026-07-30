// Team + Admin: list live trades visible to the current user.
// Returns: open trades (joinable) + every trade the user has a position in.
//   * Team:  trade.positions contains ONLY the user's own position.
//   * Admin: trade.positions still contains only the admin's own position (for the
//            "Your position" inline display); a separate `allPositions` array
//            carries every participant with user details for admin visibility.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionInfo } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSessionInfo()
  if (!session.id || (session.role !== 'admin' && session.role !== 'team')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isAdmin = session.role === 'admin'

  // Recent live trades (open + recently closed for history).
  // Admins see EVERY trade regardless of participation; team users see:
  //   • broadcast trades (pending / open)
  //   • their own positions (any status)
  //   • their own awaiting_approval / rejected requests (so they know where
  //     a buy/sell they just placed sits in the admin queue)
  const trades = await prisma.liveTrade.findMany({
    where: isAdmin
      ? {}
      : {
          OR: [
            { status: { in: ['pending', 'open'] } },
            { positions: { some: { userId: session.id } } },
            { requestedByUserId: session.id },
          ],
        },
    orderBy: { createdAt: 'desc' },
    take:    100,
    include: {
      positions: {
        where:  { userId: session.id },
        select: {
          id: true, amountBtc: true,
          grossPnlBtc: true, slippageBtc: true, feeBtc: true, pnlBtc: true,
          status: true, openedAt: true, closedAt: true,
          closeRequestedAt: true, closeRequestReason: true,
        },
      },
      _count: { select: { positions: true } },
    },
  })

  // Admin-only second pass: fetch every position for these trades with user
  // details, and attach as `allPositions`. Two queries instead of a single
  // unfiltered include because the `positions` field is already filtered by
  // userId in the first query.
  if (isAdmin && trades.length > 0) {
    const ids = trades.map(t => t.id)
    const all = await prisma.liveTradePosition.findMany({
      where:   { liveTradeId: { in: ids } },
      select: {
        id: true, liveTradeId: true, amountBtc: true,
        grossPnlBtc: true, slippageBtc: true, feeBtc: true, pnlBtc: true,
        status: true, openedAt: true, closedAt: true,
        closeRequestedAt: true, closeRequestReason: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { openedAt: 'desc' },
    })
    const byTrade = new Map<string, typeof all>()
    for (const p of all) {
      const list = byTrade.get(p.liveTradeId) ?? []
      list.push(p)
      byTrade.set(p.liveTradeId, list)
    }
    for (const t of trades as unknown as Array<{ id: string; allPositions?: unknown }>) {
      t.allPositions = byTrade.get(t.id) ?? []
    }
  }

  const me = await prisma.user.findUnique({
    where:  { id: session.id },
    select: {
      id: true, name: true, email: true, role: true,
      teamBalanceBtc: true, btcWithdrawalAddress: true,
    },
  })

  return NextResponse.json({ me, trades })
}
