// Manual close of a simulated position — trader-initiated, at the current
// market price rather than a stop/take-profit level.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSimPrices } from '@/lib/sim-prices'
import { positionPnl } from '@/lib/sim-trading'
import { settleEquity } from '@/lib/sim-settle'

export const dynamic = 'force-dynamic'

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { id } = await params
  const db = prisma as any

  const pos = await db.simPosition.findUnique({ where: { id } })
  if (!pos || pos.userId !== userId) {
    return NextResponse.json({ error: 'Position not found.' }, { status: 404 })
  }
  if (pos.status !== 'open') {
    return NextResponse.json({ error: 'Position is already closed.' }, { status: 400 })
  }

  // Settle first — a pending stop/target may have already triggered, in
  // which case this position no longer exists to be manually closed.
  await settleEquity(pos.evaluationId)

  const stillOpen = await db.simPosition.findUnique({ where: { id } })
  if (!stillOpen || stillOpen.status !== 'open') {
    return NextResponse.json({ error: 'Position was already closed by a stop or target.' }, { status: 400 })
  }

  const prices = await getSimPrices([stillOpen.slug])
  const price  = prices[stillOpen.slug]
  if (typeof price !== 'number') {
    return NextResponse.json({ error: 'No live price available right now.' }, { status: 400 })
  }

  await db.simPosition.update({
    where: { id },
    data: {
      status: 'closed',
      closePrice: price,
      pnl: positionPnl(stillOpen, price),
      closeReason: 'manual',
      closedAt: new Date(),
    },
  })

  // Re-settle so the response reflects the account after this close.
  const result = await settleEquity(pos.evaluationId)
  return NextResponse.json({ ok: true, account: result.account, positions: result.open, history: result.recentClosed })
}
