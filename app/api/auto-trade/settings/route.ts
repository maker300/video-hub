// Auto-trade user settings — read + update.
//
// GET returns a MASKED key preview only (first 8 chars + length), never the
// full token. Generating a new one is the only way to see it in full.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitiseSettings } from '@/lib/auto-trade'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const db = prisma as any
  const u = await db.user.findUnique({
    where:  { id: userId },
    select: {
      tokenBalance: true,
      autoTradeApiKey: true, autoTradeKeyCreatedAt: true,
      autoTradeEnabled: true, autoTradeKillSwitch: true,
      autoTradeMaxRiskPct: true, autoTradeMaxConcurrent: true,
      autoTradeMinConfidence: true, autoTradeAllowedSlugs: true,
    },
  })
  if (!u) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const recent = await db.autoTradeDispatch.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    take:    20,
    select: {
      id: true, display: true, decision: true, confidence: true,
      status: true, brokerTicket: true, filledPrice: true,
      ackNote: true, createdAt: true, ackedAt: true,
    },
  })

  return NextResponse.json({
    hasKey:        !!u.autoTradeApiKey,
    keyPreview:    u.autoTradeApiKey ? `${u.autoTradeApiKey.slice(0, 12)}…` : null,
    keyCreatedAt:  u.autoTradeKeyCreatedAt,
    tokenBalance:  u.tokenBalance,
    enabled:       u.autoTradeEnabled,
    killSwitch:    u.autoTradeKillSwitch,
    maxRiskPct:    u.autoTradeMaxRiskPct,
    maxConcurrent: u.autoTradeMaxConcurrent,
    minConfidence: u.autoTradeMinConfidence,
    allowedSlugs:  Array.isArray(u.autoTradeAllowedSlugs) ? u.autoTradeAllowedSlugs : [],
    recent,
  })
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const db   = prisma as any

  const data: Record<string, unknown> = {}

  if ('enabled' in body)    data.autoTradeEnabled    = !!body.enabled
  if ('killSwitch' in body) data.autoTradeKillSwitch = !!body.killSwitch

  if ('maxRiskPct' in body || 'maxConcurrent' in body || 'minConfidence' in body) {
    const current = await db.user.findUnique({
      where:  { id: userId },
      select: { autoTradeMaxRiskPct: true, autoTradeMaxConcurrent: true, autoTradeMinConfidence: true },
    })
    const s = sanitiseSettings({
      maxRiskPct:    'maxRiskPct'    in body ? body.maxRiskPct    : current?.autoTradeMaxRiskPct,
      maxConcurrent: 'maxConcurrent' in body ? body.maxConcurrent : current?.autoTradeMaxConcurrent,
      minConfidence: 'minConfidence' in body ? body.minConfidence : current?.autoTradeMinConfidence,
    })
    data.autoTradeMaxRiskPct    = s.maxRiskPct
    data.autoTradeMaxConcurrent = s.maxConcurrent
    data.autoTradeMinConfidence = s.minConfidence
  }

  if ('allowedSlugs' in body) {
    const raw = Array.isArray(body.allowedSlugs) ? body.allowedSlugs : []
    // Slug shape only — this value is echoed to the EA, keep it inert.
    data.autoTradeAllowedSlugs = raw
      .filter((s): s is string => typeof s === 'string' && /^[a-z0-9-]{2,24}$/.test(s))
      .slice(0, 40)
  }

  // Refuse to enable auto-trade without a key — the EA would have nothing
  // to authenticate with and the toggle would be a lie.
  if (data.autoTradeEnabled === true) {
    const u = await db.user.findUnique({ where: { id: userId }, select: { autoTradeApiKey: true } })
    if (!u?.autoTradeApiKey) {
      return NextResponse.json({ error: 'Generate an API key before enabling auto-execute.' }, { status: 400 })
    }
  }

  await db.user.update({ where: { id: userId }, data })
  return NextResponse.json({ ok: true })
}
