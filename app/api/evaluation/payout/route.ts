// Trader requests their share of funded-account profit.
//
// The amount is computed SERVER-SIDE from current equity against the
// baseline — never taken from the request body, or anyone could ask for an
// arbitrary figure. The baseline only moves when the payout is actually
// marked paid, so a pending request cannot be double-submitted for the
// same profit.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeFunded, gbp, PAYOUT_MINIMUM } from '@/lib/evaluation'
import { alertAdmins } from '@/lib/admin-alert'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as { id?: string } | undefined)?.id
  const email   = session?.user?.email
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const db = prisma as any
  const e = await db.evaluation.findFirst({
    where:   { userId, status: 'funded' },
    orderBy: { fundedAt: 'desc' },
    include: { payouts: { where: { status: 'requested' } } },
  })
  if (!e) return NextResponse.json({ error: 'No funded account found.' }, { status: 400 })

  if (e.payouts.length > 0) {
    return NextResponse.json({ error: 'You already have a payout request pending.' }, { status: 400 })
  }

  const f = computeFunded(e)
  if (!f.canRequestPayout) {
    return NextResponse.json(
      { error: `Minimum payout is ${gbp(PAYOUT_MINIMUM)}. Your withdrawable share is currently ${gbp(f.traderShare)}.` },
      { status: 400 },
    )
  }

  const payout = await db.evaluationPayout.create({
    data: {
      evaluationId: e.id,
      amount:       f.traderShare,
      grossProfit:  f.grossProfit,
    },
  })

  void alertAdmins({
    linkUrl: '/admin',
    subject: `Payout requested — ${gbp(f.traderShare)} to ${email}`,
    message:
      `${email} has requested a funded-account payout.\n\n` +
      `Gross profit: ${gbp(f.grossProfit)}\n` +
      `Their share (${e.profitSplitPct}%): ${gbp(f.traderShare)}\n` +
      `Firm share: ${gbp(f.firmShare)}\n` +
      `Equity: ${gbp(f.equity)} against baseline ${gbp(f.baseline)}\n\n` +
      `Marking it paid moves their baseline up so the same profit cannot be claimed twice.`,
    telegramHtml:
      `💸 <b>Payout requested</b>\n\n${email}\n` +
      `Share: <b>${gbp(f.traderShare)}</b> of ${gbp(f.grossProfit)} profit`,
  }).catch(() => {})

  return NextResponse.json({ ok: true, id: payout.id, amount: f.traderShare })
}
