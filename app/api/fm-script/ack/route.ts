// EA acknowledgement endpoint — the terminal reports what actually happened
// after it received a signal.
//
// This is what turns "we sent a signal" into "we know the user's broker
// filled it at 1.10527 on ticket 88213". Without it the profile page can
// only ever say "dispatched", which is useless for judging real performance.
//
// Body: { dispatchId, status, brokerTicket?, filledPrice?, note? }
//   status: 'filled' | 'rejected' | 'error' | 'skipped'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateEA } from '@/lib/auto-trade'

export const dynamic = 'force-dynamic'

const VALID = new Set(['filled', 'rejected', 'error', 'skipped'])

export async function POST(req: Request) {
  const user = await authenticateEA(req)
  if (!user) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as {
    dispatchId?: string; status?: string
    brokerTicket?: string; filledPrice?: number; note?: string
  }

  const signalAlertId = typeof body.dispatchId === 'string' ? body.dispatchId : ''
  const status        = typeof body.status === 'string' ? body.status : ''
  if (!signalAlertId || !VALID.has(status)) {
    return NextResponse.json({ error: 'dispatchId and a valid status are required' }, { status: 400 })
  }

  const db = prisma as any

  // Scoped by userId so one user's EA can never ack another user's dispatch.
  const existing = await db.autoTradeDispatch.findUnique({
    where:  { userId_signalAlertId: { userId: user.id, signalAlertId } },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Unknown dispatch' }, { status: 404 })

  const filledPrice = typeof body.filledPrice === 'number' && Number.isFinite(body.filledPrice)
    ? body.filledPrice : null

  await db.autoTradeDispatch.update({
    where: { id: existing.id },
    data: {
      status,
      brokerTicket: typeof body.brokerTicket === 'string' ? body.brokerTicket.slice(0, 64) : null,
      filledPrice,
      filledAt:     status === 'filled' ? new Date() : null,
      ackNote:      typeof body.note === 'string' ? body.note.slice(0, 300) : null,
      ackedAt:      new Date(),
    },
  })

  return NextResponse.json({ ok: true })
}
