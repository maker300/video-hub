// Admin: list coaching session requests awaiting action.
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { countSessionsUsed, COACHING_SESSIONS_PER_MONTH } from '@/lib/coaching'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = await (prisma as any).coachingRequest.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 50,
    include: {
      user: { select: { id: true, name: true, email: true, coachingStatus: true, coachingStartedAt: true } },
    },
  })

  // Per-request allowance context so admin can see, at the moment of
  // confirming, whether this person is already at their monthly limit.
  const requests = await Promise.all(rows.map(async (r: any) => ({
    id:            r.id,
    preferredTime: r.preferredTime,
    topic:         r.topic,
    timezone:      r.timezone,
    status:        r.status,
    scheduledAt:   r.scheduledAt,
    meetingUrl:    r.meetingUrl,
    createdAt:     r.createdAt,
    user: {
      name:  r.user?.name ?? null,
      email: r.user?.email ?? null,
      coachingStatus: r.user?.coachingStatus ?? null,
    },
    sessionsUsed: r.user ? await countSessionsUsed(r.user.id, r.user.coachingStartedAt ?? null) : 0,
    sessionsAllowed: COACHING_SESSIONS_PER_MONTH,
  })))

  return NextResponse.json({ requests })
}
