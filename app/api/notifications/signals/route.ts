import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Returns signals for in-app bell display.
// Two sources:
//   1. Admin-approved signals (notifiedAt set) — shown to all logged-in users.
//   2. Any signal for pairs the current user has subscribed to — shown only to them,
//      regardless of admin approval, so subscribed users never miss a signal.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ signals: [] })

  // Fetch admin-approved signals
  const approvedAlerts = await prisma.signalAlert.findMany({
    where:   { notifiedAt: { not: null } },
    orderBy: { notifiedAt: 'desc' },
    take:    50,
  })

  // Fetch this user's pair subscriptions
  const user = await prisma.user.findUnique({
    where:  { email: session.user.email },
    select: { id: true },
  })

  let subscribedAlerts: typeof approvedAlerts = []
  if (user) {
    const subs = await prisma.pairSubscription.findMany({
      where:  { userId: user.id },
      select: { slug: true },
    })
    if (subs.length > 0) {
      const slugs = subs.map(s => s.slug)
      // All signals for subscribed pairs in the last 24 hours (approved or not)
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
      subscribedAlerts = await prisma.signalAlert.findMany({
        where:   { slug: { in: slugs }, sentAt: { gte: since } },
        orderBy: { sentAt: 'desc' },
        take:    50,
      })
    }
  }

  // Merge, deduplicate by id, sort newest first
  const merged = [...approvedAlerts, ...subscribedAlerts]
  const seen   = new Set<string>()
  const unique = merged.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true })
  unique.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())

  const signals = unique.map(a => ({
    id:            a.id,
    slug:          a.slug,
    display:       a.display,
    decision:      a.decision,
    confidence:    a.confidence,
    entryLow:      a.entryLow,
    entryHigh:     a.entryHigh,
    priceAtSignal: a.price,
    stopLoss:      a.stopLoss,
    tp1:           a.tp1,
    rrRatio:       a.rrRatio,
    createdAt:     a.sentAt,
  }))

  return NextResponse.json({ signals })
}
