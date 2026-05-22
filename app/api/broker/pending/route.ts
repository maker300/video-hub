// EA-only: returns the next approved trade for the MT4 EA to execute
// Authenticated via x-ea-key header (set EA_API_KEY in Vercel env)
// Returns 200 + trade JSON, or 204 if nothing is ready
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SLUG_TO_MT4 } from '@/lib/metaapi'

export const dynamic = 'force-dynamic'

function checkEaKey(req: Request): boolean {
  const expected = process.env.EA_API_KEY
  if (!expected) return false
  return req.headers.get('x-ea-key') === expected
}

export async function GET(req: Request) {
  if (!checkEaKey(req)) return new Response('Unauthorized', { status: 401 })

  // Auto-expire timed-out approvals before picking up
  await prisma.brokerTrade.updateMany({
    where: { status: 'approved', expiresAt: { lt: new Date() } },
    data:  { status: 'expired' },
  })

  // Grab the oldest approved trade and immediately mark it as 'executing'
  // (prevents double-pickup if the EA polls twice before confirming)
  const trade = await prisma.brokerTrade.findFirst({
    where:   { status: 'approved' },
    orderBy: { approvedAt: 'asc' },
  })

  if (!trade) return new Response(null, { status: 204 })

  await prisma.brokerTrade.update({
    where: { id: trade.id },
    data:  { status: 'executing' },
  })

  const symbol = SLUG_TO_MT4[trade.slug] ?? trade.slug.toUpperCase().replace('-', '')

  return NextResponse.json({
    id:     trade.id,
    symbol,
    type:   trade.decision,   // 'BUY' | 'SELL'
    lots:   trade.lotSize,
    sl:     trade.stopLoss,
    tp:     trade.tp1,        // initial TP; TP2/3 managed manually
  })
}
