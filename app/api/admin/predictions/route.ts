import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const predictions = await prisma.fMPrediction.findMany({
    where:   { outcome: { not: 'pending' } },
    orderBy: { generatedAt: 'desc' },
    take:    100,
    select: {
      id:          true,
      display:     true,
      slug:        true,
      decision:    true,
      confidence:  true,
      entryLow:    true,
      entryHigh:   true,
      stopLoss:    true,
      tp1:         true,
      tp2:         true,
      tp3:         true,
      rrRatio:     true,
      outcome:     true,
      priceAtCall: true,
      generatedAt: true,
    },
  })

  return NextResponse.json(predictions)
}
