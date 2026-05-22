// Admin-only: create a pending trade approval from an FM Trader signal
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { calcLotSize, SLUG_TO_MT4 } from '@/lib/metaapi'

export const dynamic = 'force-dynamic'

export interface BrokerSignalBody {
  slug:          string
  display:       string
  decision:      'BUY' | 'SELL'
  confidence:    number
  entryLow:      number
  entryHigh:     number
  stopLoss:      number
  tp1:           number
  tp2:           number
  tp3:           number
  rrRatio:       string
  priceAtSignal: number
  riskPct:       number   // e.g. 1.0 = 1% account risk
}

export async function POST(req: Request) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as BrokerSignalBody

  const mt4Symbol = SLUG_TO_MT4[body.slug]
  if (!mt4Symbol) {
    return NextResponse.json({ error: `No MT4 symbol mapping for ${body.slug}` }, { status: 400 })
  }

  // Use BROKER_BALANCE_USD env var for lot size calculation (set in Vercel)
  const balance = parseFloat(process.env.BROKER_BALANCE_USD ?? '0')
  let lotSize   = 0.01
  if (balance > 0) {
    const entry = (body.entryLow + body.entryHigh) / 2
    lotSize     = calcLotSize(balance, body.riskPct, entry, body.stopLoss, mt4Symbol)
  }

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)  // 5-minute approval window

  const trade = await prisma.brokerTrade.create({
    data: {
      slug:          body.slug,
      display:       body.display,
      decision:      body.decision,
      confidence:    body.confidence,
      entryLow:      body.entryLow,
      entryHigh:     body.entryHigh,
      stopLoss:      body.stopLoss,
      tp1:           body.tp1,
      tp2:           body.tp2,
      tp3:           body.tp3,
      rrRatio:       body.rrRatio,
      lotSize,
      priceAtSignal: body.priceAtSignal,
      status:        'pending',
      expiresAt,
    },
  })

  return NextResponse.json({ id: trade.id, lotSize, expiresAt })
}

// GET — list pending + recent trades (admin dashboard)
export async function GET() {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Auto-expire timed-out pending approvals
  await prisma.brokerTrade.updateMany({
    where: { status: 'pending', expiresAt: { lt: new Date() } },
    data:  { status: 'expired' },
  })

  const trades = await prisma.brokerTrade.findMany({
    orderBy: { createdAt: 'desc' },
    take:    50,
  })

  return NextResponse.json(trades)
}
