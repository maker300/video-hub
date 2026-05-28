// Deposit notification — team user pings the admin that they've sent BTC.
// There's no on-chain monitoring; this is the human-in-the-loop signal so
// admin knows to look for the incoming transaction and credit the balance.
//
// POST body: { amountBtc?: number, txHash?: string, note?: string }
//   All fields optional — even a bare ping is useful.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionInfo } from '@/lib/adminAuth'
import { alertAdmins } from '@/lib/admin-alert'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getSessionInfo()
  if (!session.id || (session.role !== 'admin' && session.role !== 'team')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({})) as {
    amountBtc?: number
    txHash?:    string
    note?:      string
  }
  const amount = Number.isFinite(Number(body.amountBtc)) && Number(body.amountBtc) > 0
    ? Number(body.amountBtc) : null
  const txHash = (body.txHash ?? '').trim() || null
  const note   = (body.note   ?? '').trim() || null

  const user = await prisma.user.findUnique({
    where:  { id: session.id },
    select: { name: true, email: true },
  })
  const who = user?.name ?? user?.email ?? 'A team user'

  void alertAdmins({
    linkUrl: '/analysis/live-trades',
    subject: `⬇ Incoming deposit — ${who}`,
    message: [
      `${who} has sent a BTC deposit and is waiting for the team balance to be credited.`,
      amount ? `Amount: ${amount} BTC.` : '',
      txHash ? `Tx: ${txHash}.` : 'No tx hash provided yet.',
      note   ? `Note: ${note}.` : '',
      `Verify on-chain and update the user balance from the admin panel.`,
    ].filter(Boolean).join(' '),
    telegramHtml: [
      `⬇ <b>Incoming Deposit</b>`,
      ``,
      `<b>${who}</b>`,
      user?.email && user.name ? `<i>${user.email}</i>` : '',
      ``,
      amount ? `Amount: <b>${amount} BTC</b>` : '<i>Amount not specified</i>',
      txHash ? `Tx: <code>${txHash}</code>` : '',
      note   ? `Note: ${note}` : '',
      ``,
      `Verify on-chain and credit balance in /admin`,
    ].filter(Boolean).join('\n'),
  })

  return NextResponse.json({ ok: true })
}
