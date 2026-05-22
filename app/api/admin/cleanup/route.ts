import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export type CleanupKey =
  | 'expiredPasswordTokens'
  | 'oldPageViews'
  | 'resolvedTickets'
  | 'readNotifications'
  | 'resolvedPredictions'
  | 'rejectedBrokerTrades'
  | 'oldSignalAlerts'
  | 'readTradeUpdates'
  | 'draftScripts'
  | 'lessonAudio'

export interface CleanupItem {
  key:         CleanupKey
  label:       string
  description: string
  count:       number
}

const NINETY_DAYS = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
const THIRTY_DAYS = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
const SEVEN_DAYS  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000)

// ── GET — return counts for each cleanup category ────────────────────────────

export async function GET() {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [
    expiredPasswordTokens,
    oldPageViews,
    resolvedTickets,
    readNotifications,
    resolvedPredictions,
    rejectedBrokerTrades,
    oldSignalAlerts,
    readTradeUpdates,
    draftScripts,
    lessonAudio,
  ] = await Promise.all([
    prisma.passwordResetToken.count({ where: { expires: { lt: new Date() } } }),
    prisma.pageView.count({ where: { createdAt: { lt: NINETY_DAYS } } }),
    prisma.supportTicket.count({ where: { status: 'resolved' } }),
    prisma.adminNotification.count({ where: { read: true, readAt: { lt: THIRTY_DAYS } } }),
    prisma.fMPrediction.count({ where: { outcome: { not: 'pending' }, createdAt: { lt: THIRTY_DAYS } } }),
    prisma.brokerTrade.count({ where: { status: { in: ['expired', 'rejected'] } } }),
    prisma.signalAlert.count({ where: { sentAt: { lt: SEVEN_DAYS } } }),
    prisma.tradeUpdate.count({ where: { read: true } }),
    prisma.tradeScript.count({ where: { status: 'draft' } }),
    prisma.lessonAudio.count(),
  ])

  const items: CleanupItem[] = [
    {
      key: 'expiredPasswordTokens',
      label: 'Expired Password Reset Tokens',
      description: 'Tokens past their expiry date — safe to remove any time.',
      count: expiredPasswordTokens,
    },
    {
      key: 'oldPageViews',
      label: 'Page Views older than 90 days',
      description: 'Analytics rows from more than 90 days ago.',
      count: oldPageViews,
    },
    {
      key: 'resolvedTickets',
      label: 'Resolved Support Tickets',
      description: 'Tickets marked as resolved.',
      count: resolvedTickets,
    },
    {
      key: 'readNotifications',
      label: 'Read Admin Notifications (30+ days old)',
      description: 'Broadcast messages already read and older than 30 days.',
      count: readNotifications,
    },
    {
      key: 'resolvedPredictions',
      label: 'FM Predictions older than 30 days',
      description: 'Closed predictions (non-pending outcome) from 30+ days ago.',
      count: resolvedPredictions,
    },
    {
      key: 'rejectedBrokerTrades',
      label: 'Rejected / Expired Broker Trades',
      description: 'Trades that were rejected or expired without execution.',
      count: rejectedBrokerTrades,
    },
    {
      key: 'oldSignalAlerts',
      label: 'Signal Alerts older than 7 days',
      description: 'Dedup signal records from more than 7 days ago.',
      count: oldSignalAlerts,
    },
    {
      key: 'readTradeUpdates',
      label: 'Read Trade Update Notifications',
      description: 'In-app trade update alerts already read by users.',
      count: readTradeUpdates,
    },
    {
      key: 'draftScripts',
      label: 'Draft Trade Scripts',
      description: 'Unapproved / draft trade scripts that were never published.',
      count: draftScripts,
    },
    {
      key: 'lessonAudio',
      label: 'All Cached Lesson Audio',
      description: 'Forces re-generation of all lesson audio on next playback.',
      count: lessonAudio,
    },
  ]

  return NextResponse.json({ items })
}

// ── DELETE — execute selected cleanup operations ──────────────────────────────

export async function DELETE(req: NextRequest) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as { keys: CleanupKey[] }
  const keys = body?.keys ?? []
  if (!Array.isArray(keys) || keys.length === 0) {
    return NextResponse.json({ error: 'No keys provided' }, { status: 400 })
  }

  const results: Record<string, number> = {}

  for (const key of keys) {
    try {
      switch (key) {
        case 'expiredPasswordTokens': {
          const r = await prisma.passwordResetToken.deleteMany({ where: { expires: { lt: new Date() } } })
          results[key] = r.count
          break
        }
        case 'oldPageViews': {
          const r = await prisma.pageView.deleteMany({ where: { createdAt: { lt: NINETY_DAYS } } })
          results[key] = r.count
          break
        }
        case 'resolvedTickets': {
          const r = await prisma.supportTicket.deleteMany({ where: { status: 'resolved' } })
          results[key] = r.count
          break
        }
        case 'readNotifications': {
          const r = await prisma.adminNotification.deleteMany({ where: { read: true, readAt: { lt: THIRTY_DAYS } } })
          results[key] = r.count
          break
        }
        case 'resolvedPredictions': {
          const r = await prisma.fMPrediction.deleteMany({ where: { outcome: { not: 'pending' }, createdAt: { lt: THIRTY_DAYS } } })
          results[key] = r.count
          break
        }
        case 'rejectedBrokerTrades': {
          const r = await prisma.brokerTrade.deleteMany({ where: { status: { in: ['expired', 'rejected'] } } })
          results[key] = r.count
          break
        }
        case 'oldSignalAlerts': {
          const r = await prisma.signalAlert.deleteMany({ where: { sentAt: { lt: SEVEN_DAYS } } })
          results[key] = r.count
          break
        }
        case 'readTradeUpdates': {
          const r = await prisma.tradeUpdate.deleteMany({ where: { read: true } })
          results[key] = r.count
          break
        }
        case 'draftScripts': {
          const r = await prisma.tradeScript.deleteMany({ where: { status: 'draft' } })
          results[key] = r.count
          break
        }
        case 'lessonAudio': {
          const r = await prisma.lessonAudio.deleteMany()
          results[key] = r.count
          break
        }
      }
    } catch (err) {
      results[key] = -1
      console.error(`[cleanup] failed key=${key}:`, err)
    }
  }

  const total = Object.values(results).filter(v => v >= 0).reduce((s, v) => s + v, 0)
  return NextResponse.json({ results, total })
}
