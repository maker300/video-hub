// Member's own evaluation state + history.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeProgress, computeFunded, currentTerms, EVAL_TIERS, PAYOUT_MINIMUM } from '@/lib/evaluation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const rows = await (prisma as any).evaluation.findMany({
    where:   { userId },
    orderBy: { startedAt: 'desc' },
    take:    10,
    include: { payouts: { orderBy: { requestedAt: 'desc' }, take: 10 } },
  })

  const evaluations = rows.map((e: any) => ({
    id: e.id, status: e.status, phase: e.phase,
    accountSize: e.accountSize, feePaid: e.feePaid,
    profitTargetPct: e.profitTargetPct, maxDrawdownPct: e.maxDrawdownPct,
    maxDailyLossPct: e.maxDailyLossPct, minTradingDays: e.minTradingDays,
    profitSplitPct: e.profitSplitPct,
    breachReason: e.breachReason,
    startedAt: e.startedAt, passedAt: e.passedAt, endedAt: e.endedAt,
    lastEquityAt: e.lastEquityAt,
    fundedBalance: e.fundedBalance, fundedAt: e.fundedAt,
    phase1TargetPct: e.phase1TargetPct, phase2TargetPct: e.phase2TargetPct,
    phase1PassedAt: e.phase1PassedAt,
    progress: computeProgress(e),
    funded:   e.status === 'funded' ? computeFunded(e) : null,
    payouts:  (e.payouts ?? []).map((p: any) => ({
      id: p.id, amount: p.amount, grossProfit: p.grossProfit,
      status: p.status, requestedAt: p.requestedAt, paidAt: p.paidAt, note: p.note,
    })),
  }))

  const tiers = EVAL_TIERS.map((_, i) => currentTerms(i))
  return NextResponse.json({ evaluations, tiers, terms: tiers[0], payoutMinimum: PAYOUT_MINIMUM })
}
