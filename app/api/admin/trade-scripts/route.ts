import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import type { Prisma } from '@prisma/client'

export const dynamic   = 'force-dynamic'
export const maxDuration = 60

const client = new Anthropic()

export interface ScriptSegment {
  id:          string
  type:        'intro' | 'setup' | 'entry' | 'progress' | 'outcome' | 'summary'
  headline:    string
  narration:   string   // what the YouTube narrator says
  duration:    number   // seconds this slide should last
  showChart:   boolean  // whether Video Hub should attach a forex chart clip
  chartLabel?: string   // short label shown on the chart (e.g. "Entry Zone")
}

// GET — list all trade scripts for the admin
export async function GET() {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const scripts = await prisma.tradeScript.findMany({
    orderBy: { createdAt: 'desc' },
    take:    50,
  })
  return NextResponse.json(scripts)
}

// POST — generate a YouTube script from selected prediction IDs
export async function POST(req: Request) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { predictionIds } = await req.json() as { predictionIds: string[] }
  if (!predictionIds?.length) {
    return NextResponse.json({ error: 'No predictions selected' }, { status: 400 })
  }

  // Fetch selected predictions with full analysis data
  const predictions = await prisma.fMPrediction.findMany({
    where:   { id: { in: predictionIds } },
    orderBy: { createdAt: 'asc' },
    include: { tradeUpdates: { orderBy: { createdAt: 'asc' } } },
  })

  if (!predictions.length) {
    return NextResponse.json({ error: 'Predictions not found' }, { status: 404 })
  }

  // Build context for Claude
  const tradeContext = predictions.map(p => {
    const advisories = p.tradeUpdates.map(u =>
      `  - ${u.type.replace('_', ' ')}: ${u.message}`
    ).join('\n')

    return `
TRADE: ${p.decision} ${p.display}
Confidence: ${p.confidence}%  |  R:R ${p.rrRatio}
Entry Zone: ${p.entryLow} – ${p.entryHigh}
Stop Loss: ${p.stopLoss}  |  TP1: ${p.tp1}  |  TP2: ${p.tp2}  |  TP3: ${p.tp3}
Price at call: ${p.priceAtCall}
Generated: ${new Date(p.generatedAt).toUTCString()}
Outcome: ${p.outcome}${p.priceAtOutcome ? ` @ ${p.priceAtOutcome}` : ''}
${p.thesis ? `Analysis: ${p.thesis}` : ''}
${p.technicalBreakdown ? `Technical: ${p.technicalBreakdown}` : ''}
${p.marketBias ? `Market bias: ${p.marketBias}` : ''}
${p.traderNote ? `Trader note: ${p.traderNote}` : ''}
${advisories ? `Advisories during trade:\n${advisories}` : ''}`.trim()
  }).join('\n\n---\n\n')

  const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const pairNames = [...new Set(predictions.map(p => p.display))].join(', ')
  const title = `${pairNames} — ${todayStr}`

  const prompt = `You are a professional forex YouTube trading analyst. Write a YouTube video script reviewing the following FM Trader trade(s) from today.

The script must be engaging, educational, and describe exactly what happened — the setup, entry, any adjustments made during the trade, and the final outcome.

TRADES TO REVIEW:
${tradeContext}

OUTPUT FORMAT — return ONLY a JSON array of segments, no markdown, no extra text:
[
  {
    "id": "seg_1",
    "type": "intro",
    "headline": "Short catchy title (max 8 words)",
    "narration": "What the narrator says — 2-4 engaging sentences introducing the trade(s) and hooking the viewer.",
    "duration": 8,
    "showChart": false
  },
  {
    "id": "seg_2",
    "type": "setup",
    "headline": "The Setup",
    "narration": "Describe the market conditions and why FM Trader identified this opportunity. What did the analysis show?",
    "duration": 10,
    "showChart": true,
    "chartLabel": "Setup"
  },
  {
    "id": "seg_3",
    "type": "entry",
    "headline": "Entry: [actual entry zone]",
    "narration": "Describe the entry zone, confidence level, stop loss placement, and risk-to-reward.",
    "duration": 10,
    "showChart": true,
    "chartLabel": "Entry Zone"
  },
  {
    "id": "seg_4",
    "type": "progress",
    "headline": "Trade in Progress",
    "narration": "What happened during the trade? Any advisories issued (cancel/move SL to BE/trail SL)? How did price move?",
    "duration": 10,
    "showChart": true,
    "chartLabel": "Trade Progress"
  },
  {
    "id": "seg_5",
    "type": "outcome",
    "headline": "Outcome: [actual result]",
    "narration": "Describe the final outcome — TP hit, SL hit, or expired. What was the final price? What was the lesson?",
    "duration": 10,
    "showChart": true,
    "chartLabel": "Outcome"
  },
  {
    "id": "seg_6",
    "type": "summary",
    "headline": "Key Takeaways",
    "narration": "Summarise the trade in 2-3 bullet point style sentences. What should viewers learn? End with a call to action.",
    "duration": 8,
    "showChart": false
  }
]

Rules:
- Use the ACTUAL numbers from the trade data (entry price, SL, TP, outcome price)
- Narration should sound natural when spoken aloud
- If there were multiple trades, cover each one across segments (add extra progress/outcome segments)
- Keep durations between 6-15 seconds per segment
- showChart: true means Video Hub will render a forex chart for this segment`

  let segments: ScriptSegment[]
  try {
    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages:   [{ role: 'user', content: prompt }],
    })
    const raw = (message.content[0] as { text: string }).text.trim()
    const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    segments = JSON.parse(jsonStr) as ScriptSegment[]
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Claude API error'
    return NextResponse.json({ error: `Script generation failed: ${msg}` }, { status: 502 })
  }

  const script = await prisma.tradeScript.create({
    data: {
      title,
      predictionIds: predictionIds as unknown as Prisma.InputJsonValue,
      segments:      segments     as unknown as Prisma.InputJsonValue,
      status:        'draft',
    },
  })

  return NextResponse.json(script)
}
