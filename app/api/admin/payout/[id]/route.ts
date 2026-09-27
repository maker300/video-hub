// Admin: mark a payout paid or rejected.
//
// Paying it moves the evaluation's baseline up to the equity the profit was
// measured at. That is the step that stops the same gains being withdrawn
// twice, so it happens in the SAME transaction as the status change.
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { gbp } from '@/lib/evaluation'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => ({})) as { status?: string; note?: string }
  const status = body.status === 'paid' ? 'paid' : body.status === 'rejected' ? 'rejected' : null
  if (!status) return NextResponse.json({ error: 'status must be paid or rejected.' }, { status: 400 })

  const db = prisma as any
  const p = await db.evaluationPayout.findUnique({
    where: { id },
    include: { evaluation: { include: { user: { select: { id: true, email: true } } } } },
  })
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (p.status !== 'requested') {
    return NextResponse.json({ error: 'This payout has already been settled.' }, { status: 400 })
  }

  await prisma.$transaction(async (tx) => {
    const t = tx as any
    await t.evaluationPayout.update({
      where: { id },
      data: {
        status,
        paidAt: status === 'paid' ? new Date() : null,
        note:   typeof body.note === 'string' ? body.note.slice(0, 300) : null,
      },
    })

    if (status === 'paid') {
      // Baseline moves up by the gross profit that was just settled.
      const e = p.evaluation
      const newBaseline = (e.fundedBaseline ?? e.fundedBalance ?? 0) + p.grossProfit
      await t.evaluation.update({
        where: { id: e.id },
        data:  { fundedBaseline: newBaseline },
      })
    }
  })

  if (p.evaluation?.user) {
    void db.adminNotification.create({
      data: {
        userId:  p.evaluation.user.id,
        subject: status === 'paid'
          ? `Payout sent — ${gbp(p.amount)}`
          : 'Payout request declined',
        message: status === 'paid'
          ? `Your payout of ${gbp(p.amount)} has been sent. Your profit baseline has moved up accordingly.`
          : (body.note || 'Your payout request was not approved.'),
        linkUrl: '/funded',
      },
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
