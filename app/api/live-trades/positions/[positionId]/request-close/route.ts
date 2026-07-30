// Team-user-initiated close request.
//
// Closing on the trade level is admin-only (closing settles ALL participants
// together), so this endpoint is a *nudge*: the position is stamped with a
// closeRequestedAt timestamp, the admin gets a Telegram alert (no bell —
// admin requested Telegram-only for this), and the requester's card on the
// Live Trade page shows a "Close requested" badge so they know it's pending.
//
// When admin actually closes the trade, the existing notifyTeamUsers flow
// fires a bell notification to all participants — including the requester.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionInfo } from '@/lib/adminAuth'
import { sendTelegramMessage } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ positionId: string }> }

export async function POST(req: Request, { params }: Params) {
  const session = await getSessionInfo()
  if (!session.id || (session.role !== 'team' && session.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { positionId } = await params
  const body = await req.json().catch(() => ({})) as { reason?: string }

  const position = await prisma.liveTradePosition.findUnique({
    where:   { id: positionId },
    include: { liveTrade: true, user: { select: { name: true, email: true } } },
  })
  if (!position) return NextResponse.json({ error: 'Position not found' }, { status: 404 })

  // Only the position's owner can request close (admins can already Set Close
  // directly from the trade card — they don't go through this flow).
  if (position.userId !== session.id) {
    return NextResponse.json({ error: 'Only the position owner can request close' }, { status: 403 })
  }
  if (position.status !== 'open') {
    return NextResponse.json({ error: 'Position is already closed' }, { status: 400 })
  }
  if (position.liveTrade.status !== 'open' && position.liveTrade.status !== 'pending') {
    return NextResponse.json({ error: 'Trade is not active' }, { status: 400 })
  }
  if (position.closeRequestedAt) {
    return NextResponse.json({ ok: true, alreadyRequested: true })
  }

  const updated = await prisma.liveTradePosition.update({
    where: { id: positionId },
    data:  {
      closeRequestedAt:    new Date(),
      closeRequestReason:  body.reason?.trim()?.slice(0, 200) ?? null,
    },
    select: { id: true, closeRequestedAt: true },
  })

  // Telegram-only admin alert
  const who   = position.user?.name ?? position.user?.email ?? `user ${position.userId.slice(0, 8)}…`
  const lvLabel = position.liveTrade.leverage ? `1:${position.liveTrade.leverage}` : 'spot'
  void sendTelegramMessage(
    `<b>🟠 Close requested</b>\n${who} wants to close their position on ${position.liveTrade.decision} <b>${position.liveTrade.display}</b> (${lvLabel}, <code>${position.amountBtc}</code> BTC).\n` +
    (body.reason?.trim() ? `Reason: <i>${body.reason.trim().slice(0, 200)}</i>\n` : '') +
    `<a href="https://forexmastery.org/analysis/live-trades?tab=admin">Open Live Trade →</a>`,
  ).catch(() => { /* non-critical */ })

  return NextResponse.json({ ok: true, position: updated })
}

// Cancel a pending close request (team user changed their mind).
export async function DELETE(_req: Request, { params }: Params) {
  const session = await getSessionInfo()
  if (!session.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { positionId } = await params
  const position = await prisma.liveTradePosition.findUnique({
    where:  { id: positionId },
    select: { userId: true, status: true, closeRequestedAt: true },
  })
  if (!position) return NextResponse.json({ error: 'Position not found' }, { status: 404 })
  if (position.userId !== session.id) {
    return NextResponse.json({ error: 'Only the position owner can cancel' }, { status: 403 })
  }
  if (!position.closeRequestedAt) {
    return NextResponse.json({ ok: true, alreadyCancelled: true })
  }
  await prisma.liveTradePosition.update({
    where: { id: positionId },
    data:  { closeRequestedAt: null, closeRequestReason: null },
  })
  return NextResponse.json({ ok: true })
}
