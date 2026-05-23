import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const H24 = 24 * 60 * 60 * 1000

// Combined endpoint — replaces 3 separate Navbar polls with 1.
// Returns signals, trade updates, and admin broadcast notifications in one round-trip.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ signals: [], tradeUpdates: [], adminNotifications: [] })
  }

  const user = await prisma.user.findUnique({
    where:  { email: session.user.email },
    select: { id: true },
  })

  // ── Signals ────────────────────────────────────────────────────────────────
  const approvedAlerts = await prisma.signalAlert.findMany({
    where:   { notifiedAt: { not: null } },
    orderBy: { notifiedAt: 'desc' },
    take:    50,
  })

  let subscribedAlerts: typeof approvedAlerts = []
  if (user) {
    const subs = await prisma.pairSubscription.findMany({
      where:  { userId: user.id },
      select: { slug: true },
    })
    if (subs.length > 0) {
      const slugs = subs.map(s => s.slug)
      const since = new Date(Date.now() - H24)
      subscribedAlerts = await prisma.signalAlert.findMany({
        where:   { slug: { in: slugs }, sentAt: { gte: since } },
        orderBy: { sentAt: 'desc' },
        take:    50,
      })
    }
  }

  const seenIds = new Set<string>()
  const uniqueAlerts = [...approvedAlerts, ...subscribedAlerts].filter(a => {
    if (seenIds.has(a.id)) return false
    seenIds.add(a.id)
    return true
  })
  uniqueAlerts.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())

  const signals = uniqueAlerts.map(a => ({
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

  // ── Trade updates ──────────────────────────────────────────────────────────
  let tradeUpdates: object[] = []
  if (user) {
    // Prune on-fetch:
    //   • read + older than 24h → delete (user has seen them)
    //   • unread + older than 7 days → delete (won't be relevant anymore)
    // This preserves unread outcome notifications (TP/SL hits) for up to a
    // week so users who log in days later still see their trade results.
    const now = Date.now()
    await prisma.tradeUpdate.deleteMany({
      where: {
        userId: user.id,
        OR: [
          { read: true,  createdAt: { lt: new Date(now - H24) } },
          { read: false, createdAt: { lt: new Date(now - 7 * H24) } },
        ],
      },
    }).catch(() => {})

    const updates = await prisma.tradeUpdate.findMany({
      where:   { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take:    50,
    })
    tradeUpdates = updates.map(u => ({
      id:           u.id,
      predictionId: u.predictionId,
      slug:         u.slug,
      display:      u.display,
      type:         u.type,
      message:      u.message,
      currentPrice: u.currentPrice,
      suggestedSL:  u.suggestedSL,
      read:         u.read,
      createdAt:    u.createdAt,
    }))
  }

  // ── Admin broadcast notifications ──────────────────────────────────────────
  let adminNotifications: object[] = []
  if (user) {
    const now = new Date()

    // Prune: read + older than 24hrs, OR unread + older than 30 days
    await prisma.adminNotification.deleteMany({
      where: {
        userId: user.id,
        OR: [
          { read: true,  readAt:    { lt: new Date(now.getTime() - H24) } },
          { read: false, createdAt: { lt: new Date(now.getTime() - 30 * H24) } },
        ],
      },
    }).catch(() => {})

    const notifs = await prisma.adminNotification.findMany({
      where:   { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take:    50,
    })

    // Mark all unread as read now that we're surfacing them
    const unreadIds = notifs.filter(n => !n.read).map(n => n.id)
    if (unreadIds.length > 0) {
      await prisma.adminNotification.updateMany({
        where: { id: { in: unreadIds } },
        data:  { read: true, readAt: now },
      }).catch(() => {})
    }

    adminNotifications = notifs.map(n => ({
      id:        n.id,
      subject:   n.subject,
      message:   n.message,
      read:      n.read,
      createdAt: n.createdAt,
    }))
  }

  return NextResponse.json({ signals, tradeUpdates, adminNotifications })
}
