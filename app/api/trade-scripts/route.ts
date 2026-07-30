import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkScriptKey } from '@/lib/scriptAuth'

export const dynamic = 'force-dynamic'

// Public endpoint — returns approved scripts for Video Hub to consume.
// Secured by FM_SCRIPT_API_KEY header (set the same key in Video Hub env).
export async function GET(req: Request) {
  if (!checkScriptKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scripts = await prisma.tradeScript.findMany({
    where:   { status: 'approved' },
    orderBy: { approvedAt: 'desc' },
    take:    20,
    select: {
      id:            true,
      title:         true,
      segments:      true,
      predictionIds: true,
      approvedAt:    true,
      createdAt:     true,
    },
  })

  // Also include the prediction data Video Hub needs to render forex charts
  const allPredIds = scripts.flatMap(s => s.predictionIds as string[])
  const predictions = allPredIds.length
    ? await prisma.fMPrediction.findMany({
        where:  { id: { in: allPredIds } },
        select: {
          id:          true,
          display:     true,
          decision:    true,
          entryLow:    true,
          entryHigh:   true,
          stopLoss:    true,
          tp1:         true,
          tp2:         true,
          tp3:         true,
          priceAtCall: true,
          outcome:     true,
          priceAtOutcome: true,
          generatedAt: true,
        },
      })
    : []

  const predMap = Object.fromEntries(predictions.map(p => [p.id, p]))

  const enriched = scripts.map(s => ({
    ...s,
    predictions: (s.predictionIds as string[]).map(id => predMap[id]).filter(Boolean),
  }))

  return NextResponse.json(enriched)
}
