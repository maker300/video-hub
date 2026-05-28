// Team + Admin: list my withdrawals (GET) + submit a new request (POST).
//
// POST escrows the requested amount immediately by decrementing
// User.teamBalanceBtc in the same transaction that creates the Withdrawal
// row. This prevents the user from re-spending the same balance.
// If admin later rejects, balance is refunded (see /api/admin/withdrawals/[id]).
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionInfo } from '@/lib/adminAuth'
import { alertAdmins } from '@/lib/admin-alert'

export const dynamic = 'force-dynamic'

const MIN_BTC = 0.0001
// Basic sanity check — BTC addresses are 26–62 chars, alphanumeric (legacy/segwit/bech32)
const BTC_ADDR_RE = /^(bc1|tb1|[13]|2|m|n)[a-zA-HJ-NP-Z0-9]{20,80}$/i

export async function GET() {
  const session = await getSessionInfo()
  if (!session.id || (session.role !== 'admin' && session.role !== 'team')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = await prisma.withdrawal.findMany({
    where:   { userId: session.id },
    orderBy: { createdAt: 'desc' },
    take:    50,
  })
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const session = await getSessionInfo()
  if (!session.id || (session.role !== 'admin' && session.role !== 'team')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({})) as { amountBtc?: number; btcAddress?: string }
  const amount = Number(body.amountBtc)
  const address = (body.btcAddress ?? '').trim()

  if (!Number.isFinite(amount) || amount < MIN_BTC) {
    return NextResponse.json({ error: `Minimum withdrawal is ${MIN_BTC} BTC` }, { status: 400 })
  }
  if (!address || !BTC_ADDR_RE.test(address)) {
    return NextResponse.json({ error: 'Enter a valid BTC address' }, { status: 400 })
  }

  try {
    const out = await prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({
        where:  { id: session.id! },
        select: { teamBalanceBtc: true },
      })
      if (!user) throw new Error('USER_NOT_FOUND')
      if (user.teamBalanceBtc < amount) throw new Error('INSUFFICIENT_BALANCE')

      // Escrow: decrement immediately. Refund happens only on admin rejection.
      // Also save the address on the user's profile so the next withdrawal
      // pre-fills with it (saves the user from re-typing).
      await tx.user.update({
        where: { id: session.id! },
        data:  {
          teamBalanceBtc:       { decrement: amount },
          btcWithdrawalAddress: address,
        },
      })

      return tx.withdrawal.create({
        data: {
          userId:     session.id!,
          amountBtc:  amount,
          btcAddress: address,
        },
      })
    })
    // Notify admin — bell + telegram. Fire-and-forget.
    void (async () => {
      const requester = await prisma.user.findUnique({
        where:  { id: session.id! },
        select: { name: true, email: true, teamBalanceBtc: true },
      })
      const who = requester?.name ?? requester?.email ?? 'A team user'
      const remaining = requester ? requester.teamBalanceBtc.toFixed(6) : '—'
      void alertAdmins({
        linkUrl: '/analysis/live-trades?tab=withdrawals',
        subject: `⬆ Withdrawal request — ${amount} BTC`,
        message: `${who} has requested a withdrawal of ${amount} BTC to ${address}. Remaining balance: ${remaining} BTC. Review and approve in the Live Trade → Withdrawals tab.`,
        telegramHtml: [
          `⬆ <b>Withdrawal Request</b>`,
          ``,
          `<b>${who}</b>`,
          requester?.email && requester.name ? `<i>${requester.email}</i>` : '',
          ``,
          `Amount: <b>${amount} BTC</b>`,
          `To: <code>${address}</code>`,
          `Remaining balance: ${remaining} BTC`,
          ``,
          `🔗 https://forexmastery.org/analysis/live-trades`,
        ].filter(Boolean).join('\n'),
      })
    })()

    return NextResponse.json({ ok: true, id: out.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown'
    if (msg === 'INSUFFICIENT_BALANCE') return NextResponse.json({ error: 'Insufficient BTC balance' }, { status: 400 })
    if (msg === 'USER_NOT_FOUND')       return NextResponse.json({ error: 'User not found' }, { status: 404 })
    console.error('[withdrawals POST]', e)
    return NextResponse.json({ error: 'Failed to submit withdrawal' }, { status: 500 })
  }
}
