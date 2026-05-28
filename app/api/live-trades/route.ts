// Team + Admin: list live trades visible to the current user.
// Returns: open trades (joinable) + every trade the user has a position in.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionInfo } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSessionInfo()
  if (!session.id || (session.role !== 'admin' && session.role !== 'team')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Recent live trades (open + recently closed for history)
  const trades = await prisma.liveTrade.findMany({
    where:   {
      OR: [
        { status: { in: ['pending', 'open'] } },
        // Show closed/cancelled trades the user had a position in (history)
        { positions: { some: { userId: session.id } } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take:    50,
    include: {
      positions: {
        // Only return THIS user's position to keep payload small
        where:  { userId: session.id },
        select: { id: true, amountBtc: true, pnlBtc: true, status: true, openedAt: true, closedAt: true },
      },
      _count: { select: { positions: true } },
    },
  })

  const me = await prisma.user.findUnique({
    where:  { id: session.id },
    select: { id: true, name: true, email: true, role: true, teamBalanceBtc: true },
  })

  return NextResponse.json({ me, trades })
}
