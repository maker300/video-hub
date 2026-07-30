// Admin emergency cleanup — three operations:
//   GET                                  → category list with row counts
//   GET ?scan=<key>                      → individual rows in one category + their auto-delete countdown
//   DELETE body { keys: [...] }          → wipe entire categories (rows past auto-rule threshold)
//   DELETE body { items: { key: ids[] } }→ delete specific rows the admin selected after a scan
//
// Every category has an `autoTtlMs` (or null when there's no time-based auto-clean).
// The scan response includes `autoDeleteAt` so the UI can render "auto-cleans in 2h 14m".
// Effects of deletion are spelled out per-category in the `description` field so the
// admin understands what gets affected before pressing the button.
import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export type CleanupKey =
  | 'expiredPasswordTokens'
  | 'expiredSessions'
  | 'expiredVerificationTokens'
  | 'oldPageViews'
  | 'resolvedTickets'
  | 'readNotifications'
  | 'resolvedPredictions'
  | 'rejectedBrokerTrades'
  | 'oldSignalAlerts'
  | 'readTradeUpdates'
  | 'draftScripts'
  | 'lessonAudio'
  | 'liveTradeHistory'
  | 'inactiveAnalysisAccess'
  | 'completedWithdrawals'
  | 'rejectedWithdrawals'

export interface CleanupItem {
  key:         CleanupKey
  label:       string
  description: string        // what the rows are + what gets affected if cleaned
  count:       number        // rows currently *over* the auto-clean threshold (ready to clean)
  totalCount:  number        // total rows in this category (over + under threshold)
  autoTtlMs:   number | null // null = no time-based auto-clean (manual / status-only)
}

const D  = 24 * 60 * 60 * 1000
const H1 =      60 * 60 * 1000

const NINETY_DAYS = new Date(Date.now() - 90 * D)
const THIRTY_DAYS = new Date(Date.now() - 30 * D)
const SEVEN_DAYS  = new Date(Date.now() -  7 * D)
const ONE_DAY     = new Date(Date.now() -      D)

// ── GET — category list (counts) OR scan a single category (rows) ────────────

export async function GET(req: NextRequest) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const scanKey = searchParams.get('scan') as CleanupKey | null

  if (scanKey) return scanCategory(scanKey)
  return categorySummary()
}

// ── Category summary ──────────────────────────────────────────────────────────

async function categorySummary() {
  const now = new Date()
  const [
    expiredPasswordTokens,    totalPasswordTokens,
    expiredSessions,          totalSessions,
    expiredVerificationTokens, totalVerificationTokens,
    oldPageViews,             totalPageViews,
    resolvedTickets,
    readNotifications,        totalReadNotifications,
    resolvedPredictions,      totalResolvedPredictions,
    rejectedBrokerTrades,
    oldSignalAlerts,          totalSignalAlerts,
    readTradeUpdates,         totalReadTradeUpdates,
    draftScripts,
    lessonAudio,
    liveTradeHistory,         totalLiveTradeHistory,
    inactiveAnalysisAccess,
    completedWithdrawals,     totalCompletedWithdrawals,
    rejectedWithdrawals,
  ] = await Promise.all([
    prisma.passwordResetToken.count({ where: { expires: { lt: now } } }),
    prisma.passwordResetToken.count(),
    prisma.session.count({ where: { expires: { lt: now } } }),
    prisma.session.count(),
    prisma.verificationToken.count({ where: { expires: { lt: now } } }),
    prisma.verificationToken.count(),
    prisma.pageView.count({ where: { createdAt: { lt: NINETY_DAYS } } }),
    prisma.pageView.count(),
    prisma.supportTicket.count({ where: { status: 'resolved' } }),
    prisma.adminNotification.count({ where: { read: true, readAt: { lt: ONE_DAY } } }),
    prisma.adminNotification.count({ where: { read: true } }),
    prisma.fMPrediction.count({ where: { outcome: { not: 'pending' }, createdAt: { lt: THIRTY_DAYS } } }),
    prisma.fMPrediction.count({ where: { outcome: { not: 'pending' } } }),
    prisma.brokerTrade.count({ where: { status: { in: ['expired', 'rejected'] } } }),
    prisma.signalAlert.count({ where: { sentAt: { lt: SEVEN_DAYS } } }),
    prisma.signalAlert.count(),
    prisma.tradeUpdate.count({ where: { read: true, createdAt: { lt: ONE_DAY } } }),
    prisma.tradeUpdate.count({ where: { read: true } }),
    prisma.tradeScript.count({ where: { status: 'draft' } }),
    prisma.lessonAudio.count(),
    prisma.liveTrade.count({ where: { status: { in: ['closed', 'cancelled'] }, closedAt: { lt: SEVEN_DAYS } } }),
    prisma.liveTrade.count({ where: { status: { in: ['closed', 'cancelled'] } } }),
    prisma.analysisAccess.count({ where: { active: false, endDate: { lt: THIRTY_DAYS } } }),
    prisma.withdrawal.count({ where: { status: 'completed', processedAt: { lt: THIRTY_DAYS } } }),
    prisma.withdrawal.count({ where: { status: 'completed' } }),
    prisma.withdrawal.count({ where: { status: 'rejected' } }),
  ])

  const items: CleanupItem[] = [
    {
      key: 'expiredPasswordTokens',
      label: 'Expired Password Reset Tokens',
      description: 'One-time password-reset links that are past their expiry time. Already unusable. Deleting has zero user impact — these links no longer work even before deletion.',
      count: expiredPasswordTokens, totalCount: totalPasswordTokens, autoTtlMs: null,
    },
    {
      key: 'expiredSessions',
      label: 'Expired NextAuth Sessions',
      description: 'Login session rows whose expiry has already passed. Cannot be used to authenticate. Deleting has zero user impact — active sessions are untouched.',
      count: expiredSessions, totalCount: totalSessions, autoTtlMs: null,
    },
    {
      key: 'expiredVerificationTokens',
      label: 'Expired Verification Tokens',
      description: 'Email verification tokens sent on signup, past their expiry. Deleting these is safe — users who never confirmed can request a new token.',
      count: expiredVerificationTokens, totalCount: totalVerificationTokens, autoTtlMs: null,
    },
    {
      key: 'oldPageViews',
      label: 'Page Views older than 90 days',
      description: 'Anonymous page-view rows used by admin analytics (URL + timestamp). Deleting prunes analytics history beyond 90 days — visit/top-page charts lose deep history. Active users unaffected.',
      count: oldPageViews, totalCount: totalPageViews, autoTtlMs: 90 * D,
    },
    {
      key: 'resolvedTickets',
      label: 'Resolved Support Tickets',
      description: 'Support chats marked as resolved. Deleting removes users\' past support history and admin\'s audit trail. Open tickets are untouched.',
      count: resolvedTickets, totalCount: resolvedTickets, autoTtlMs: null,
    },
    {
      key: 'readNotifications',
      label: 'Read Admin Broadcasts',
      description: 'Admin-broadcast messages the user has already opened. Auto-deletes 24h after being read on every nav fetch. Deleting now removes users\' past-announcement history; unread broadcasts are untouched.',
      count: readNotifications, totalCount: totalReadNotifications, autoTtlMs: D,
    },
    {
      key: 'resolvedPredictions',
      label: 'FM Predictions older than 30 days',
      description: 'Closed FM Trader predictions (outcome decided — TP1/TP2/TP3/SL/expired) more than 30 days old. Deleting removes users\' historic prediction list. Pending predictions are untouched.',
      count: resolvedPredictions, totalCount: totalResolvedPredictions, autoTtlMs: 30 * D,
    },
    {
      key: 'rejectedBrokerTrades',
      label: 'Rejected / Expired Broker Trades',
      description: 'Broker auto-execute attempts that the broker rejected or that expired without filling. Deleting removes the failed-execution log. Live or filled trades unaffected.',
      count: rejectedBrokerTrades, totalCount: rejectedBrokerTrades, autoTtlMs: null,
    },
    {
      key: 'oldSignalAlerts',
      label: 'Signal Alerts older than 7 days',
      description: 'Dedup rows that prevent the same signal from re-alerting team users. Deleting means a still-active 7+ day signal could re-fire — at that age the signal is stale anyway.',
      count: oldSignalAlerts, totalCount: totalSignalAlerts, autoTtlMs: 7 * D,
    },
    {
      key: 'readTradeUpdates',
      label: 'Read Trade Update Alerts',
      description: 'TP / SL / breakeven notifications the user has already viewed. Auto-deletes 24h after read. Deleting removes users\' past TP/SL alert history; unread alerts are untouched.',
      count: readTradeUpdates, totalCount: totalReadTradeUpdates, autoTtlMs: D,
    },
    {
      key: 'draftScripts',
      label: 'Draft Trade Scripts',
      description: 'Trade-script bots saved as drafts but never published live. Deleting wipes admin\'s unfinished work. Published / live scripts are untouched.',
      count: draftScripts, totalCount: draftScripts, autoTtlMs: null,
    },
    {
      key: 'lessonAudio',
      label: 'Cached Lesson Audio',
      description: 'Pre-generated voice narration for course lessons. Deleting forces re-generation on next playback (~1-2s delay + small TTS API cost per lesson). Audio quality unchanged once regenerated.',
      count: lessonAudio, totalCount: lessonAudio, autoTtlMs: null,
    },
    {
      key: 'liveTradeHistory',
      label: 'Live Trade History (closed + cancelled)',
      description: 'Closed and cancelled Live Trades plus all participating positions (cascade). Auto-purges 7 days after close. Deleting removes team users\' Live Trade history & PnL records; balances and open/pending trades untouched.',
      count: liveTradeHistory, totalCount: totalLiveTradeHistory, autoTtlMs: 7 * D,
    },
    {
      key: 'inactiveAnalysisAccess',
      label: 'Inactive Analysis Access (30+ days)',
      description: 'Analysis-page access grants that were revoked or whose end date has passed by more than 30 days. Deleting removes the audit log; users with active access are untouched.',
      count: inactiveAnalysisAccess, totalCount: inactiveAnalysisAccess, autoTtlMs: 30 * D,
    },
    {
      key: 'completedWithdrawals',
      label: 'Completed Withdrawals (30+ days)',
      description: 'BTC withdrawal requests that admin already paid out, more than 30 days old. Deleting removes the payout audit trail (txHash, address). User balances and recent withdrawals are untouched.',
      count: completedWithdrawals, totalCount: totalCompletedWithdrawals, autoTtlMs: 30 * D,
    },
    {
      key: 'rejectedWithdrawals',
      label: 'Rejected Withdrawals',
      description: 'BTC withdrawal requests the admin rejected (refunds already processed back to the user\'s balance). Deleting removes the rejection audit trail. User balances unaffected — refund was applied at rejection time.',
      count: rejectedWithdrawals, totalCount: rejectedWithdrawals, autoTtlMs: null,
    },
  ]

  return NextResponse.json({ items })
}

// ── Scan one category — return row-level rows + auto-delete countdown ────────

interface ScanRow {
  id:           string
  label:        string
  sublabel?:    string
  timestamp:    number          // when row entered the queue (createdAt / readAt / closedAt / expires)
  autoDeleteAt: number | null   // when the auto-rule will remove it (null = no time rule)
}

async function scanCategory(key: CleanupKey) {
  const now = Date.now()
  const cap = 500   // safety cap so a huge table doesn't blow up the response

  let rows: ScanRow[] = []
  let autoTtlMs: number | null = null

  switch (key) {
    case 'expiredPasswordTokens': {
      const r = await prisma.passwordResetToken.findMany({
        orderBy: { expires: 'asc' }, take: cap,
        select: { token: true, email: true, expires: true },
      })
      rows = r.map(x => ({
        id: x.token, label: x.email,
        timestamp: x.expires.getTime(),
        autoDeleteAt: x.expires.getTime(),   // already-expired rule — same instant
      }))
      break
    }
    case 'expiredSessions': {
      const r = await prisma.session.findMany({
        orderBy: { expires: 'asc' }, take: cap,
        select: { id: true, sessionToken: true, userId: true, expires: true },
      })
      rows = r.map(x => ({
        id: x.id, label: `user ${x.userId.slice(0, 8)}…`,
        sublabel: x.sessionToken.slice(0, 16) + '…',
        timestamp: x.expires.getTime(),
        autoDeleteAt: x.expires.getTime(),
      }))
      break
    }
    case 'expiredVerificationTokens': {
      const r = await prisma.verificationToken.findMany({
        orderBy: { expires: 'asc' }, take: cap,
        select: { token: true, identifier: true, expires: true },
      })
      rows = r.map(x => ({
        id: x.token, label: x.identifier,
        timestamp: x.expires.getTime(),
        autoDeleteAt: x.expires.getTime(),
      }))
      break
    }
    case 'oldPageViews': {
      autoTtlMs = 90 * D
      const r = await prisma.pageView.findMany({
        orderBy: { createdAt: 'asc' }, take: cap,
        select: { id: true, path: true, createdAt: true },
      })
      rows = r.map(x => ({
        id: x.id, label: x.path,
        timestamp: x.createdAt.getTime(),
        autoDeleteAt: x.createdAt.getTime() + autoTtlMs!,
      }))
      break
    }
    case 'resolvedTickets': {
      const r = await prisma.supportTicket.findMany({
        where: { status: 'resolved' },
        orderBy: { resolvedAt: 'asc' }, take: cap,
        select: { id: true, subject: true, guestEmail: true, userId: true, resolvedAt: true, createdAt: true },
      })
      rows = r.map(x => ({
        id: x.id, label: x.subject,
        sublabel: x.guestEmail ?? (x.userId ? `user ${x.userId.slice(0, 8)}…` : undefined),
        timestamp: (x.resolvedAt ?? x.createdAt).getTime(),
        autoDeleteAt: null,
      }))
      break
    }
    case 'readNotifications': {
      autoTtlMs = D
      const r = await prisma.adminNotification.findMany({
        where: { read: true },
        orderBy: { readAt: 'asc' }, take: cap,
        select: { id: true, subject: true, readAt: true, createdAt: true },
      })
      rows = r.map(x => ({
        id: x.id, label: x.subject,
        timestamp: (x.readAt ?? x.createdAt).getTime(),
        autoDeleteAt: (x.readAt ?? x.createdAt).getTime() + autoTtlMs!,
      }))
      break
    }
    case 'resolvedPredictions': {
      autoTtlMs = 30 * D
      const r = await prisma.fMPrediction.findMany({
        where: { outcome: { not: 'pending' } },
        orderBy: { createdAt: 'asc' }, take: cap,
        select: { id: true, slug: true, display: true, decision: true, outcome: true, createdAt: true },
      })
      rows = r.map(x => ({
        id: x.id, label: `${x.decision} ${x.display}`,
        sublabel: `outcome: ${x.outcome}`,
        timestamp: x.createdAt.getTime(),
        autoDeleteAt: x.createdAt.getTime() + autoTtlMs!,
      }))
      break
    }
    case 'rejectedBrokerTrades': {
      const r = await prisma.brokerTrade.findMany({
        where: { status: { in: ['expired', 'rejected'] } },
        orderBy: { createdAt: 'asc' }, take: cap,
        select: { id: true, display: true, decision: true, status: true, createdAt: true },
      })
      rows = r.map(x => ({
        id: x.id, label: `${x.decision} ${x.display}`,
        sublabel: `status: ${x.status}`,
        timestamp: x.createdAt.getTime(),
        autoDeleteAt: null,
      }))
      break
    }
    case 'oldSignalAlerts': {
      autoTtlMs = 7 * D
      const r = await prisma.signalAlert.findMany({
        orderBy: { sentAt: 'asc' }, take: cap,
        select: { id: true, slug: true, display: true, decision: true, sentAt: true },
      })
      rows = r.map(x => ({
        id: x.id, label: `${x.decision} ${x.display}`,
        timestamp: x.sentAt.getTime(),
        autoDeleteAt: x.sentAt.getTime() + autoTtlMs!,
      }))
      break
    }
    case 'readTradeUpdates': {
      autoTtlMs = D
      const r = await prisma.tradeUpdate.findMany({
        where: { read: true },
        orderBy: { createdAt: 'asc' }, take: cap,
        select: { id: true, display: true, type: true, createdAt: true },
      })
      rows = r.map(x => ({
        id: x.id, label: `${x.type} · ${x.display}`,
        timestamp: x.createdAt.getTime(),
        autoDeleteAt: x.createdAt.getTime() + autoTtlMs!,
      }))
      break
    }
    case 'draftScripts': {
      const r = await prisma.tradeScript.findMany({
        where: { status: 'draft' },
        orderBy: { createdAt: 'asc' }, take: cap,
        select: { id: true, title: true, createdAt: true },
      })
      rows = r.map(x => ({
        id: x.id, label: x.title,
        timestamp: x.createdAt.getTime(),
        autoDeleteAt: null,
      }))
      break
    }
    case 'lessonAudio': {
      const r = await prisma.lessonAudio.findMany({
        orderBy: { createdAt: 'asc' }, take: cap,
        select: { id: true, lessonId: true, createdAt: true },
      })
      rows = r.map(x => ({
        id: x.id, label: x.lessonId,
        timestamp: x.createdAt.getTime(),
        autoDeleteAt: null,
      }))
      break
    }
    case 'liveTradeHistory': {
      autoTtlMs = 7 * D
      const r = await prisma.liveTrade.findMany({
        where: { status: { in: ['closed', 'cancelled'] } },
        orderBy: { closedAt: 'asc' }, take: cap,
        select: { id: true, slug: true, display: true, decision: true, status: true, closedAt: true, createdAt: true },
      })
      rows = r.map(x => {
        const t = (x.closedAt ?? x.createdAt).getTime()
        return {
          id: x.id, label: `${x.decision} ${x.display}`,
          sublabel: `status: ${x.status}`,
          timestamp: t,
          autoDeleteAt: t + autoTtlMs!,
        }
      })
      break
    }
    case 'inactiveAnalysisAccess': {
      autoTtlMs = 30 * D
      const r = await prisma.analysisAccess.findMany({
        where: { active: false },
        orderBy: { endDate: 'asc' }, take: cap,
        select: { id: true, userId: true, type: true, endDate: true },
      })
      rows = r.map(x => ({
        id: x.id, label: `user ${x.userId.slice(0, 8)}…`,
        sublabel: x.type,
        timestamp: x.endDate.getTime(),
        autoDeleteAt: x.endDate.getTime() + autoTtlMs!,
      }))
      break
    }
    case 'completedWithdrawals': {
      autoTtlMs = 30 * D
      const r = await prisma.withdrawal.findMany({
        where: { status: 'completed' },
        orderBy: { processedAt: 'asc' }, take: cap,
        select: { id: true, userId: true, amountBtc: true, processedAt: true, createdAt: true },
      })
      rows = r.map(x => {
        const t = (x.processedAt ?? x.createdAt).getTime()
        return {
          id: x.id, label: `${x.amountBtc} BTC`,
          sublabel: `user ${x.userId.slice(0, 8)}…`,
          timestamp: t,
          autoDeleteAt: t + autoTtlMs!,
        }
      })
      break
    }
    case 'rejectedWithdrawals': {
      const r = await prisma.withdrawal.findMany({
        where: { status: 'rejected' },
        orderBy: { processedAt: 'asc' }, take: cap,
        select: { id: true, userId: true, amountBtc: true, processedAt: true, createdAt: true },
      })
      rows = r.map(x => ({
        id: x.id, label: `${x.amountBtc} BTC`,
        sublabel: `user ${x.userId.slice(0, 8)}…`,
        timestamp: (x.processedAt ?? x.createdAt).getTime(),
        autoDeleteAt: null,
      }))
      break
    }
    default:
      return NextResponse.json({ error: 'Unknown key' }, { status: 400 })
  }

  return NextResponse.json({ key, autoTtlMs, now, rows })
}

// ── DELETE — wipe whole categories (legacy) OR delete specific rows ──────────

export async function DELETE(req: NextRequest) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as {
    keys?:  CleanupKey[]
    items?: Partial<Record<CleanupKey, string[]>>
  }

  const results: Record<string, number> = {}

  // Branch A: targeted delete — admin picked specific rows after a scan.
  if (body.items && typeof body.items === 'object') {
    for (const [k, ids] of Object.entries(body.items)) {
      const key = k as CleanupKey
      if (!Array.isArray(ids) || ids.length === 0) continue
      try {
        results[key] = await deleteSpecific(key, ids)
      } catch (err) {
        results[key] = -1
        console.error(`[cleanup] selective failed key=${key}:`, err)
      }
    }
    const total = Object.values(results).filter(v => v >= 0).reduce((s, v) => s + v, 0)
    return NextResponse.json({ results, total })
  }

  // Branch B: bulk delete entire categories (rows past auto-threshold)
  const keys = body?.keys ?? []
  if (!Array.isArray(keys) || keys.length === 0) {
    return NextResponse.json({ error: 'No keys provided' }, { status: 400 })
  }
  for (const key of keys) {
    try {
      results[key] = await deleteBulk(key)
    } catch (err) {
      results[key] = -1
      console.error(`[cleanup] bulk failed key=${key}:`, err)
    }
  }
  const total = Object.values(results).filter(v => v >= 0).reduce((s, v) => s + v, 0)
  return NextResponse.json({ results, total })
}

// ── Delete helpers ───────────────────────────────────────────────────────────

async function deleteBulk(key: CleanupKey): Promise<number> {
  const now = new Date()
  switch (key) {
    case 'expiredPasswordTokens':     return (await prisma.passwordResetToken.deleteMany({ where: { expires: { lt: now } } })).count
    case 'expiredSessions':           return (await prisma.session.deleteMany({ where: { expires: { lt: now } } })).count
    case 'expiredVerificationTokens': return (await prisma.verificationToken.deleteMany({ where: { expires: { lt: now } } })).count
    case 'oldPageViews':              return (await prisma.pageView.deleteMany({ where: { createdAt: { lt: NINETY_DAYS } } })).count
    case 'resolvedTickets':           return (await prisma.supportTicket.deleteMany({ where: { status: 'resolved' } })).count
    case 'readNotifications':         return (await prisma.adminNotification.deleteMany({ where: { read: true, readAt: { lt: ONE_DAY } } })).count
    case 'resolvedPredictions':       return (await prisma.fMPrediction.deleteMany({ where: { outcome: { not: 'pending' }, createdAt: { lt: THIRTY_DAYS } } })).count
    case 'rejectedBrokerTrades':      return (await prisma.brokerTrade.deleteMany({ where: { status: { in: ['expired', 'rejected'] } } })).count
    case 'oldSignalAlerts':           return (await prisma.signalAlert.deleteMany({ where: { sentAt: { lt: SEVEN_DAYS } } })).count
    case 'readTradeUpdates':          return (await prisma.tradeUpdate.deleteMany({ where: { read: true, createdAt: { lt: ONE_DAY } } })).count
    case 'draftScripts':              return (await prisma.tradeScript.deleteMany({ where: { status: 'draft' } })).count
    case 'lessonAudio':               return (await prisma.lessonAudio.deleteMany()).count
    case 'liveTradeHistory':          return (await prisma.liveTrade.deleteMany({ where: { status: { in: ['closed', 'cancelled'] }, closedAt: { lt: SEVEN_DAYS } } })).count
    case 'inactiveAnalysisAccess':    return (await prisma.analysisAccess.deleteMany({ where: { active: false, endDate: { lt: THIRTY_DAYS } } })).count
    case 'completedWithdrawals':      return (await prisma.withdrawal.deleteMany({ where: { status: 'completed', processedAt: { lt: THIRTY_DAYS } } })).count
    case 'rejectedWithdrawals':       return (await prisma.withdrawal.deleteMany({ where: { status: 'rejected' } })).count
  }
}

async function deleteSpecific(key: CleanupKey, ids: string[]): Promise<number> {
  switch (key) {
    // Password and verification tokens key off `token` (not `id`)
    case 'expiredPasswordTokens':     return (await prisma.passwordResetToken.deleteMany({ where: { token: { in: ids } } })).count
    case 'expiredVerificationTokens': return (await prisma.verificationToken.deleteMany({ where: { token: { in: ids } } })).count
    case 'expiredSessions':           return (await prisma.session.deleteMany({ where: { id: { in: ids } } })).count
    case 'oldPageViews':              return (await prisma.pageView.deleteMany({ where: { id: { in: ids } } })).count
    case 'resolvedTickets':           return (await prisma.supportTicket.deleteMany({ where: { id: { in: ids }, status: 'resolved' } })).count
    case 'readNotifications':         return (await prisma.adminNotification.deleteMany({ where: { id: { in: ids }, read: true } })).count
    case 'resolvedPredictions':       return (await prisma.fMPrediction.deleteMany({ where: { id: { in: ids }, outcome: { not: 'pending' } } })).count
    case 'rejectedBrokerTrades':      return (await prisma.brokerTrade.deleteMany({ where: { id: { in: ids }, status: { in: ['expired', 'rejected'] } } })).count
    case 'oldSignalAlerts':           return (await prisma.signalAlert.deleteMany({ where: { id: { in: ids } } })).count
    case 'readTradeUpdates':          return (await prisma.tradeUpdate.deleteMany({ where: { id: { in: ids }, read: true } })).count
    case 'draftScripts':              return (await prisma.tradeScript.deleteMany({ where: { id: { in: ids }, status: 'draft' } })).count
    case 'lessonAudio':               return (await prisma.lessonAudio.deleteMany({ where: { id: { in: ids } } })).count
    case 'liveTradeHistory':          return (await prisma.liveTrade.deleteMany({ where: { id: { in: ids }, status: { in: ['closed', 'cancelled'] } } })).count
    case 'inactiveAnalysisAccess':    return (await prisma.analysisAccess.deleteMany({ where: { id: { in: ids }, active: false } })).count
    case 'completedWithdrawals':      return (await prisma.withdrawal.deleteMany({ where: { id: { in: ids }, status: 'completed' } })).count
    case 'rejectedWithdrawals':       return (await prisma.withdrawal.deleteMany({ where: { id: { in: ids }, status: 'rejected' } })).count
  }
}

// Avoid unused-var warning when H1 isn't used in this file.
void H1
