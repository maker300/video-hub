// Admin: all evaluations, with derived progress for each.
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { computeProgress, computeFunded } from '@/lib/evaluation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = await (prisma as any).evaluation.findMany({
    orderBy: [{ startedAt: 'desc' }],
    take: 50,
    include: {
      user:    { select: { email: true, name: true } },
      payouts: { orderBy: { requestedAt: 'desc' } },
    },
  })

  return NextResponse.json({
    evaluations: rows.map((e: any) => ({
      id: e.id, status: e.status, phase: e.phase,
      profitTargetPct: e.profitTargetPct,
      email: e.user?.email ?? null,
      accountSize: e.accountSize, profitSplitPct: e.profitSplitPct,
      fundedBalance: e.fundedBalance, fundedBaseline: e.fundedBaseline,
      breachReason: e.breachReason,
      startedAt: e.startedAt, passedAt: e.passedAt, fundedAt: e.fundedAt,
      lastEquityAt: e.lastEquityAt,
      progress: computeProgress(e),
      funded:   e.status === 'funded' ? computeFunded(e) : null,
      payouts:  e.payouts.map((p: any) => ({
        id: p.id, amount: p.amount, grossProfit: p.grossProfit,
        status: p.status, requestedAt: p.requestedAt, paidAt: p.paidAt, note: p.note,
      })),
    })),
  })
}
