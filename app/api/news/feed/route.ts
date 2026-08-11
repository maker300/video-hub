// FM News feed — released prints and what's scheduled next.
//
// Signed-in users only. The data itself is public macro information, but this
// sits behind /analysis and there is no reason to serve it anonymously.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { displayForSlug } from '@/lib/market-map'
import { formatPrint } from '@/lib/econ-calendar'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  }

  const db  = prisma as any
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // An event whose time has passed but which never received an `actual` used to
  // match neither query — not upcoming (scheduledAt < now) and not released
  // (releasedAt still null) — so it silently vanished from the page the moment
  // it was due. That is every event on the current provider, which does not
  // publish actuals at all.
  //
  // Bucketed by scheduled time instead, and kept for 24 hours after the event.
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [released, upcoming] = await Promise.all([
    db.economicEvent.findMany({
      where:   { scheduledAt: { lt: now, gte: dayAgo } },
      orderBy: { scheduledAt: 'desc' },
      take:    40,
    }),
    db.economicEvent.findMany({
      where:   { scheduledAt: { gte: now } },
      orderBy: { scheduledAt: 'asc' },
      take:    20,
    }),
  ])

  const shape = (e: any) => ({
    id:          e.id,
    event:       e.event,
    currency:    e.currency,
    impact:      e.impact,
    scheduledAt: e.scheduledAt,
    releasedAt:  e.releasedAt,
    print:       e.actual != null ? formatPrint(e) : null,
    // True once the scheduled time has passed with no figure published — the
    // page shows "awaiting result" rather than pretending it is still upcoming.
    awaitingResult: e.actual == null && new Date(e.scheduledAt) < now,
    surpriseDir: e.surpriseDir,
    affected:    (e.affectedSlugs as string[] ?? []).map(s => ({ slug: s, display: displayForSlug(s) })),
  })

  return NextResponse.json({
    released: released.map(shape),
    upcoming: upcoming.map(shape),
  })
}
