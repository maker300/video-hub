// Admin bypass: grant a funded account without payment and without running
// the evaluation phases. For admin access/testing of the trading terminal —
// never exposed to members.
import { NextResponse } from 'next/server'
import { getSessionInfo } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { getActiveEvaluation, tierAt, EVAL_TIERS, currentTerms } from '@/lib/evaluation'

export async function POST(req: Request) {
  const { id: adminId, role } = await getSessionInfo()
  if (role !== 'admin' || !adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({})) as { userId?: string; tier?: number }
  const targetUserId = typeof body.userId === 'string' && body.userId ? body.userId : adminId

  const tierIndex = Number.isInteger(body.tier) && body.tier! >= 0 && body.tier! < EVAL_TIERS.length
    ? (body.tier as number)
    : EVAL_TIERS.length - 1
  const tier = tierAt(tierIndex)
  const terms = currentTerms(tierIndex)

  const existing = await getActiveEvaluation(targetUserId)
  if (existing) {
    return NextResponse.json(
      { error: 'That account already has an active evaluation or funded account.' },
      { status: 400 },
    )
  }

  const db = prisma as any
  const evaluation = await db.evaluation.create({
    data: {
      userId: targetUserId,
      status: 'funded',
      phase:  'funded',
      ...terms,
      feePaid: 0,
      currentEquity:  tier.accountSize,
      peakEquity:     tier.accountSize,
      fundedAt:       new Date(),
      fundedBalance:  tier.accountSize,
      fundedBaseline: tier.accountSize,
      stripeRef:      `admin-grant-${Date.now()}`,
    },
  })

  return NextResponse.json({ ok: true, evaluationId: evaluation.id, accountSize: tier.accountSize })
}
