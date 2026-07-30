// Admin: read / write performance (cost-saver) flags + request-volume meter.
//
// GET    → current flags + rolling 7-day request count broken down by route
//          (path prefix). Lets the admin see which surface is driving CPU
//          before deciding what to throttle.
// PATCH  → merge partial flag updates. Supports a `preset` shortcut value
//          'lowPower' that flips multiple flags at once for emergency use.
import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { getPerfFlags, setPerfFlags, DEFAULT_FLAGS, type PerfFlags } from '@/lib/perf-flags'

export const dynamic = 'force-dynamic'

const D7 = 7 * 24 * 60 * 60 * 1000

// Coarse buckets for the request-volume meter. PageView is captured on most
// nav events client-side and is the only "free" rough proxy for traffic since
// Vercel doesn't expose Fluid Active CPU from inside a function.
const ROUTE_BUCKETS: Array<{ label: string; matches: (p: string) => boolean }> = [
  { label: 'Live Trade page',    matches: p => p.startsWith('/analysis/live-trades') },
  { label: 'FM Trader analysis', matches: p => p.startsWith('/analysis/') && p !== '/analysis' && !p.startsWith('/analysis/live-trades') },
  { label: 'Analysis hub',       matches: p => p === '/analysis' || p === '/analysis/' },
  { label: 'Course player',      matches: p => p.startsWith('/course') },
  { label: 'Admin panel',        matches: p => p.startsWith('/admin') },
  { label: 'Auth / profile',     matches: p => p.startsWith('/auth') || p.startsWith('/profile') },
]

export async function GET() {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const flags = await getPerfFlags()

  const since = new Date(Date.now() - D7)
  const views = await prisma.pageView.findMany({
    where:  { createdAt: { gte: since } },
    select: { path: true },
  }).catch(() => [])

  const buckets = ROUTE_BUCKETS.map(b => ({ label: b.label, count: 0 }))
  let other = 0
  for (const v of views) {
    const idx = ROUTE_BUCKETS.findIndex(b => b.matches(v.path))
    if (idx >= 0) buckets[idx].count++
    else other++
  }
  const totalRequests = views.length

  return NextResponse.json({
    flags,
    defaults: DEFAULT_FLAGS,
    requestVolume: {
      windowDays: 7,
      total:      totalRequests,
      buckets:    [...buckets, { label: 'Other', count: other }],
    },
  })
}

export async function PATCH(req: NextRequest) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as Partial<PerfFlags> & { preset?: 'lowPower' | 'normal' }

  let patch: Partial<PerfFlags> = {}

  if (body.preset === 'lowPower') {
    // Emergency throttle — keeps the rule engine running, kills everything
    // that's expensive or optional.
    patch = {
      claudeNarrative:   false,
      lessonAudio:       false,
      lessonImageGen:    false,
      autoCheckOutcomes: false,
      cronScan:          false,
      liveTradePoll:     'slow',
      marketLivePoll:    'slow',
      fmTraderStreaming: false,
    }
  } else if (body.preset === 'normal') {
    patch = DEFAULT_FLAGS
  } else {
    // Targeted patch — only known flag keys are accepted
    const allowed: (keyof PerfFlags)[] = [
      'claudeNarrative', 'lessonAudio', 'lessonImageGen', 'autoCheckOutcomes', 'cronScan',
      'liveTradePoll', 'marketLivePoll', 'fmTraderStreaming',
    ]
    for (const k of allowed) {
      if (k in body) (patch as Record<string, unknown>)[k] = (body as Record<string, unknown>)[k]
    }
  }

  const flags = await setPerfFlags(patch)
  return NextResponse.json({ flags })
}
