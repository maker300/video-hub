// Subscriber-facing live-session status.
//
// Returns the join link ONLY to users whose coaching entitlement is live.
// Everyone else gets `live: false` with no URL — the link is a paid benefit
// and must not leak to non-subscribers who happen to hit the endpoint.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCoachingAccess } from '@/lib/coaching'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ live: false })

  const access = await getCoachingAccess(userId)
  if (!access.active) return NextResponse.json({ live: false })

  const row = await (prisma as any).adminSetting.findUnique({ where: { key: 'live_session' } })
  const v = (row?.value ?? {}) as { live?: boolean; url?: string; title?: string; startedAt?: string }
  if (!v.live) return NextResponse.json({ live: false })

  return NextResponse.json({
    live:      true,
    url:       v.url ?? null,
    title:     v.title ?? 'Live trading session',
    startedAt: v.startedAt ?? null,
  })
}
