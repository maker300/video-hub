// Simulated trading — read account state, open a position.
//
// GET also SETTLES any stop loss or take profit that has been reached since
// the last read, then pushes the resulting equity through the evaluation
// rules. That means a trader who closes the tab mid-trade still has their
// stops honoured the next time anything touches the account, rather than
// the position drifting untouched.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSimPrices, SIM_INSTRUMENTS, isTradableSlug, displayFor } from '@/lib/sim-prices'
import {
  accountState, positionPnl, hitLevel, validateOrder,
  SIM_LEVERAGE, MIN_LOTS, MAX_LOTS,
} from '@/lib/sim-trading'
import { settleEquity } from '@/lib/sim-settle'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const db = prisma as any
  const evaluation = await db.evaluation.findFirst({
    where:   { userId, status: { in: ['evaluation', 'funded'] } },
    orderBy: { startedAt: 'desc' },
  })
  if (!evaluation) {
    return NextResponse.json({ active: false, instruments: SIM_INSTRUMENTS })
  }

  const result = await settleEquity(evaluation.id)

  return NextResponse.json({
    active: true,
    evaluationId: evaluation.id,
    status: result.status,
    phase:  result.phase,
    instruments: SIM_INSTRUMENTS,
    prices: result.prices,
    account: result.account,
    positions: result.open,
    history: result.recentClosed,
    leverage: SIM_LEVERAGE,
    minLots: MIN_LOTS,
    maxLots: MAX_LOTS,
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    slug?: string; side?: string; lots?: number
    stopLoss?: number | null; takeProfit?: number | null
  }
  const slug = typeof body.slug === 'string' ? body.slug : ''
  if (!isTradableSlug(slug)) {
    return NextResponse.json({ error: 'That instrument is not available.' }, { status: 400 })
  }

  const db = prisma as any
  const evaluation = await db.evaluation.findFirst({
    where:   { userId, status: { in: ['evaluation', 'funded'] } },
    orderBy: { startedAt: 'desc' },
  })
  if (!evaluation) {
    return NextResponse.json({ error: 'No active account. Start an evaluation first.' }, { status: 400 })
  }

  // Settle first so the margin check runs against the true current equity —
  // otherwise a trader could open against margin that a pending stop has
  // already consumed.
  const state = await settleEquity(evaluation.id)
  if (state.status === 'breached' || state.status === 'passed') {
    return NextResponse.json({ error: 'This account is no longer tradable.' }, { status: 400 })
  }

  const price = state.prices[slug]
  const lots  = Number(body.lots)
  const check = validateOrder({
    slug, side: body.side ?? '', lots, price,
    stopLoss:   body.stopLoss   ?? null,
    takeProfit: body.takeProfit ?? null,
  }, state.account.freeMargin)
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

  const pos = await db.simPosition.create({
    data: {
      evaluationId: evaluation.id,
      userId,
      slug,
      display:    displayFor(slug),
      side:       body.side,
      lots,
      openPrice:  price,
      stopLoss:   body.stopLoss   ?? null,
      takeProfit: body.takeProfit ?? null,
    },
  })

  return NextResponse.json({ ok: true, id: pos.id, openPrice: price })
}
