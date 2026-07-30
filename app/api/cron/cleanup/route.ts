import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic    = 'force-dynamic'
export const maxDuration = 60

const days = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)

export async function GET(req: Request) {
  // No fallback value: this used to default to the literal 'dev', which turned
  // a publicly guessable string into a valid credential for a route that runs
  // bulk deletes whenever CRON_SECRET was missing. Unset now means the header
  // path is simply unavailable and only an admin session gets through.
  const cronSecret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')

  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    const { getAdminSession } = await import('@/lib/adminAuth')
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff30 = days(30)
  const cutoff10 = days(10)
  const cutoff7  = days(7)
  const cutoff1  = days(1)

  const [signals, trades, predictions, subscriptions, settings, pageViews, tradeUpdates, adminNotifs] = await Promise.all([
    // SignalAlert — older than 30 days
    prisma.signalAlert.deleteMany({ where: { sentAt: { lt: cutoff30 } } }),

    // BrokerTrade — older than 10 days
    prisma.brokerTrade.deleteMany({ where: { createdAt: { lt: cutoff10 } } }),

    // FMPrediction — older than 30 days
    prisma.fMPrediction.deleteMany({ where: { createdAt: { lt: cutoff30 } } }),

    // PairSubscription — older than 30 days
    prisma.pairSubscription.deleteMany({ where: { createdAt: { lt: cutoff30 } } }),

    // AdminSetting — older than 30 days
    prisma.adminSetting.deleteMany({ where: { updatedAt: { lt: cutoff30 } } }),

    // PageView — older than 7 days (analytics only need recent data)
    prisma.pageView.deleteMany({ where: { createdAt: { lt: cutoff7 } } }),

    // TradeUpdate — older than 24 hrs (advisory notifications are short-lived)
    prisma.tradeUpdate.deleteMany({ where: { createdAt: { lt: cutoff1 } } }),

    // AdminNotification — read + older than 24hrs, or unread + older than 30 days
    prisma.adminNotification.deleteMany({
      where: {
        OR: [
          { read: true,  readAt:    { lt: cutoff1 } },
          { read: false, createdAt: { lt: cutoff30 } },
        ],
      },
    }),
  ])

  return NextResponse.json({
    cleaned: {
      signalAlerts:       signals.count,
      brokerTrades:       trades.count,
      fmPredictions:      predictions.count,
      pairSubscriptions:  subscriptions.count,
      adminSettings:      settings.count,
      pageViews:          pageViews.count,
      tradeUpdates:       tradeUpdates.count,
      adminNotifications: adminNotifs.count,
    },
    cutoffs: { days30: cutoff30.toISOString(), days10: cutoff10.toISOString(), days7: cutoff7.toISOString(), days1: cutoff1.toISOString() },
  })
}
