// Admin: issue a funded account, revoke one, or cancel an evaluation.
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { gbp } from '@/lib/evaluation'
import { sendBulkEmail } from '@/lib/email'
import { buildBroadcastEmail, buildBroadcastText } from '@/lib/email-templates'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => ({})) as {
    action?: 'fund' | 'revoke' | 'cancel'; fundedBalance?: number; note?: string
  }

  const db = prisma as any
  const e = await db.evaluation.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
  if (!e) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // ── Issue the funded account ───────────────────────────────────────────
  if (body.action === 'fund') {
    if (e.status !== 'passed') {
      return NextResponse.json({ error: 'Only a passed evaluation can be funded.' }, { status: 400 })
    }
    // Default to this evaluation's own tier — the funded balance equals the
    // account size the trader was evaluated on.
    const balance = Number.isFinite(body.fundedBalance) && (body.fundedBalance as number) > 0
      ? Math.round(body.fundedBalance as number)
      : e.accountSize

    await db.evaluation.update({
      where: { id },
      data: {
        status: 'funded', phase: 'funded',
        fundedAt:       new Date(),
        fundedBalance:  balance,
        fundedBaseline: balance,
        // Reset the tracking window to the funded account. Carrying the
        // evaluation's peak over would compute the drawdown floor against
        // a balance this account never had.
        currentEquity:  balance,
        peakEquity:     balance,
        dayStartEquity: balance,
        dayStartedOn:   null,
      },
    })

    if (e.user) {
      void db.adminNotification.create({
        data: {
          userId:  e.user.id,
          subject: `Funded account live — ${gbp(balance)}`,
          message: `Your funded account is active with ${gbp(balance)} of our capital, on a ${e.profitSplitPct}% profit split. The same drawdown rules apply. Keep the EA running so your equity keeps reporting.`,
          linkUrl: '/funded',
        },
      }).catch(() => {})

      if (!e.user.email.endsWith('@forexmastery.internal')) {
        const subject = 'Your funded account is live'
        const message =
          `Congratulations — your funded account is active.\n\n` +
          `Balance: ${gbp(balance)} (our capital, not yours)\n` +
          `Your split: ${e.profitSplitPct}% of profits\n\n` +
          `The same drawdown and daily-loss rules apply. Keep the EA running in MT5 so your equity keeps reporting, ` +
          `and request a payout from your funded page once you're in profit.`
        void sendBulkEmail(
          [{ name: e.user.name, email: e.user.email }],
          subject,
          (n) => buildBroadcastEmail(n, subject, message),
          (n) => buildBroadcastText(n, message),
        ).catch(() => {})
      }
    }
    return NextResponse.json({ ok: true, fundedBalance: balance })
  }

  // ── Revoke / cancel ────────────────────────────────────────────────────
  if (body.action === 'revoke' || body.action === 'cancel') {
    await db.evaluation.update({
      where: { id },
      data: {
        status:       body.action === 'revoke' ? 'breached' : 'cancelled',
        breachReason: typeof body.note === 'string' && body.note.trim()
          ? body.note.trim().slice(0, 300)
          : (body.action === 'revoke' ? 'Revoked by admin.' : null),
        endedAt: new Date(),
      },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
}
