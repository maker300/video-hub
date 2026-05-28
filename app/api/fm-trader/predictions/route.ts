import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { FMTraderResponse } from '@/lib/fm-trader-types'

// ── POST /api/fm-trader/predictions — save a new prediction ──────────────────

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json() as {
    slug:         string
    display:      string
    category:     string
    sessionSlot:  string
    priceAtCall:  number
    tradeHorizon?: 'intraday' | 'swing'
    result:       FMTraderResponse
  }

  if (body.result.decision === 'NO TRADE') {
    return NextResponse.json({ saved: false, reason: 'NO TRADE predictions are not tracked' })
  }

  // Uniform expiry per horizon — forex/indices no longer expire early vs crypto.
  const horizon = body.tradeHorizon ?? body.result.tradeHorizon ?? 'intraday'
  const expMs   = horizon === 'swing' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
  const expiresAt = new Date(Date.now() + expMs)

  const prediction = await prisma.fMPrediction.create({
    data: {
      userId:       user.id,
      slug:         body.slug,
      display:      body.display,
      category:     body.category,
      sessionSlot:  body.sessionSlot,
      tradeHorizon: horizon,
      decision:     body.result.decision,
      confidence:   body.result.confidence,
      entryLow:     body.result.entryZone[0],
      entryHigh:    body.result.entryZone[1],
      stopLoss:     body.result.stopLoss,
      tp1:          body.result.tp1,
      tp2:          body.result.tp2,
      tp3:          body.result.tp3,
      rrRatio:      body.result.rrRatio,
      priceAtCall:  body.priceAtCall,
      generatedAt:  new Date(body.result.generatedAt),
      expiresAt,
    },
  })

  return NextResponse.json({ saved: true, id: prediction.id })
}

// ── GET /api/fm-trader/predictions — recent predictions for current user ──────

const PREDICTION_SELECT = {
  id: true, slug: true, display: true, category: true,
  sessionSlot: true, decision: true, confidence: true,
  entryLow: true, entryHigh: true, stopLoss: true,
  tp1: true, tp2: true, tp3: true, rrRatio: true,
  priceAtCall: true, outcome: true, outcomeAt: true,
  priceAtOutcome: true, generatedAt: true, createdAt: true, expiresAt: true,
} as const

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url   = new URL(req.url)
  const slug  = url.searchParams.get('slug')
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100)

  // Admin is authenticated via env vars — no DB row exists for them.
  // Detect via session role before attempting the DB lookup.
  const isAdmin = (session.user as { role?: string })?.role === 'admin'

  if (isAdmin) {
    const predictions = await prisma.fMPrediction.findMany({
      where:   { ...(slug ? { slug } : {}) },
      orderBy: { createdAt: 'desc' },
      take:    limit,
      select:  PREDICTION_SELECT,
    })
    return NextResponse.json(predictions)
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json([])

  const predictions = await prisma.fMPrediction.findMany({
    where:   { userId: user.id, ...(slug ? { slug } : {}) },
    orderBy: { createdAt: 'desc' },
    take:    limit,
    select:  PREDICTION_SELECT,
  })

  return NextResponse.json(predictions)
}

// ── DELETE /api/fm-trader/predictions — bulk-delete current user's history ────
// Optional ?slug=eur-usd narrows the delete to a single pair; without it,
// every prediction the user has made is wiped. Used by team users to reset
// their FM Trader popup history.
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = (session.user as { role?: string })?.role === 'admin'
  const url     = new URL(req.url)
  const slug    = url.searchParams.get('slug')

  // Admin: support an optional ?userId to clear another user's history
  if (isAdmin) {
    const userId = url.searchParams.get('userId')
    const where  = {
      ...(userId ? { userId } : {}),
      ...(slug   ? { slug   } : {}),
    }
    if (Object.keys(where).length === 0) {
      return NextResponse.json({ error: 'Admin bulk delete requires ?userId or ?slug to avoid wiping every prediction.' }, { status: 400 })
    }
    const r = await prisma.fMPrediction.deleteMany({ where })
    return NextResponse.json({ ok: true, deleted: r.count })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const r = await prisma.fMPrediction.deleteMany({
    where: { userId: user.id, ...(slug ? { slug } : {}) },
  })
  return NextResponse.json({ ok: true, deleted: r.count })
}
