// Admin: list + create LiveTrades.
//   GET   → all trades with positions (full audit view)
//   POST  → create a new live trade from raw fields OR from a prediction
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession, getSessionInfo } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const trades = await prisma.liveTrade.findMany({
    orderBy: { createdAt: 'desc' },
    take:    100,
    include: {
      positions: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { openedAt: 'desc' },
      },
    },
  })
  return NextResponse.json(trades)
}

export async function POST(req: Request) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const session = await getSessionInfo()
  if (!session.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await prisma.user.findUnique({ where: { email: session.email }, select: { id: true } })
  if (!admin) return NextResponse.json({ error: 'Admin record not found' }, { status: 500 })

  const body = await req.json() as {
    slug:       string
    display:    string
    decision:   'BUY' | 'SELL'
    entryLow:   number
    entryHigh:  number
    stopLoss:   number
    tp1:        number
    tp2:        number
    tp3:        number
    rrRatio:    string
    confidence: number
    setupGrade?: string
    predictionId?: string
    note?:      string
  }

  if (!body.slug || !body.display || !body.decision || !body.stopLoss || !body.tp1) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (body.decision !== 'BUY' && body.decision !== 'SELL') {
    return NextResponse.json({ error: 'Decision must be BUY or SELL' }, { status: 400 })
  }

  const trade = await prisma.liveTrade.create({
    data: {
      slug:        body.slug,
      display:     body.display,
      decision:    body.decision,
      entryLow:    body.entryLow,
      entryHigh:   body.entryHigh,
      stopLoss:    body.stopLoss,
      tp1:         body.tp1,
      tp2:         body.tp2,
      tp3:         body.tp3,
      rrRatio:     body.rrRatio,
      confidence:  body.confidence,
      setupGrade:  body.setupGrade,
      predictionId: body.predictionId,
      note:        body.note,
      approvedBy:  admin.id,
    },
  })

  return NextResponse.json({ id: trade.id, ok: true })
}
