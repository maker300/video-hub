// Admin: list + create LiveTrades.
//   GET   → all trades with positions (full audit view)
//   POST  → create a new live trade from raw fields OR from a prediction
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession, getSessionInfo } from '@/lib/adminAuth'
import { notifyTeamUsers } from '@/lib/team-notify'

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

  // The env-based admin (ADMIN_EMAIL) doesn't have a DB user row by default.
  // Upsert one so we have a stable userId to record on approvedBy. This also
  // handles regular admin users who do have a row — both paths produce the
  // same record.
  const admin = await prisma.user.upsert({
    where:  { email: session.email },
    create: { email: session.email, name: 'Admin', role: 'admin' },
    update: {},
    select: { id: true },
  })

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
    suggestedAmountBtc?: number
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
      suggestedAmountBtc:
        typeof body.suggestedAmountBtc === 'number' && body.suggestedAmountBtc > 0
          ? body.suggestedAmountBtc
          : null,
      approvedBy:  admin.id,
    },
  })

  // Email + bell to all team users — only event that emails. Fire-and-forget.
  const suggestion = body.suggestedAmountBtc && body.suggestedAmountBtc > 0
    ? ` Suggested stake: ${body.suggestedAmountBtc} BTC.`
    : ''
  void notifyTeamUsers({
    email:   true,
    linkUrl: '/analysis/live-trades',
    subject: `New Live Trade — ${body.decision} ${body.display}`,
    message: [
      `Admin has approved a new live trade: ${body.decision} ${body.display} (confidence ${body.confidence}%).`,
      `Entry zone: ${body.entryLow} – ${body.entryHigh} · Stop: ${body.stopLoss} · TP1: ${body.tp1} · TP2: ${body.tp2} · TP3: ${body.tp3}`,
      `Status: awaiting entry price.${suggestion}`,
      ``,
      `Open the Live Trade page to join: https://forexmastery.org/analysis/live-trades`,
      body.note ? `\nNote from admin: ${body.note}` : '',
    ].filter(Boolean).join('\n'),
  })

  return NextResponse.json({ id: trade.id, ok: true })
}
