// Dormant-account cleanup — warn, then delete.
//
// Two phases per run:
//   1. WARN   — accounts that will cross the 6-month line within 14 days get
//               one email and a `dormantWarnedAt` stamp.
//   2. DELETE — accounts already past 6 months that were warned at least 14
//               days ago are removed. Related rows cascade via Prisma.
//
// A user is never deleted without having been warned first, and signing in
// at any point resets `lastSeenAt` which takes them out of both queries.
//
// Paid users (course or any token purchase) and staff are excluded by
// `dormantWhere` and never appear in either phase.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendBulkEmail } from '@/lib/email'
import { buildBroadcastEmail, buildBroadcastText } from '@/lib/email-templates'
import {
  dormantWhere, INACTIVITY_MS, INACTIVITY_WARN_MS, INACTIVITY_MONTHS,
} from '@/lib/account-lifecycle'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Hard ceiling per run so a backlog can never nuke the user table in one go.
const MAX_DELETES_PER_RUN = 25
const MAX_WARNS_PER_RUN   = 50

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    const { getAdminSession } = await import('@/lib/adminAuth')
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // `dryRun=1` reports what would happen without touching anything. Worth
  // using the first few times this runs against real data.
  const dryRun = new URL(req.url).searchParams.get('dryRun') === '1'

  const db  = prisma as any
  const now = Date.now()

  const deleteCutoff = new Date(now - INACTIVITY_MS)
  // Accounts whose last activity is older than (6 months - 14 days) are
  // inside the warning window but not yet deletable.
  const warnCutoff   = new Date(now - (INACTIVITY_MS - INACTIVITY_WARN_MS))

  // ── Phase 1: warn ──────────────────────────────────────────────────────
  const toWarn = await db.user.findMany({
    where: {
      ...dormantWhere(warnCutoff),
      dormantWarnedAt: null,
    },
    select: { id: true, name: true, email: true, lastSeenAt: true, createdAt: true },
    take: MAX_WARNS_PER_RUN,
  })

  const realToWarn = toWarn.filter((u: any) => !u.email.endsWith('@forexmastery.internal'))

  if (realToWarn.length > 0 && !dryRun) {
    const subject = `Your Forex Mastery account will be closed in 14 days`
    const message =
      `We're getting in touch because there has been no sign-in on your Forex Mastery account for ` +
      `almost ${INACTIVITY_MONTHS} months.\n\n` +
      `Under our dormant-account policy, accounts unused for ${INACTIVITY_MONTHS} months are closed and ` +
      `their data deleted. Your account is scheduled for closure in 14 days.\n\n` +
      `To keep it, just sign in — that's all it takes. Nothing else is required and there is no charge.\n\n` +
      `Note: accounts with course access or any token purchase are never closed for inactivity.`

    await sendBulkEmail(
      realToWarn.map((u: any) => ({ name: u.name, email: u.email })),
      subject,
      (name) => buildBroadcastEmail(name, subject, message),
      (name) => buildBroadcastText(name, message),
    ).catch(e => console.error('[account-cleanup] warn email failed:', e))

    await db.user.updateMany({
      where: { id: { in: realToWarn.map((u: any) => u.id) } },
      data:  { dormantWarnedAt: new Date() },
    })
  }

  // ── Phase 2: delete ────────────────────────────────────────────────────
  // Only accounts that are BOTH past the 6-month line AND were warned at
  // least 14 days ago. The warn stamp is the consent-to-proceed record.
  const warnedBefore = new Date(now - INACTIVITY_WARN_MS)
  const toDelete = await db.user.findMany({
    where: {
      ...dormantWhere(deleteCutoff),
      dormantWarnedAt: { not: null, lte: warnedBefore },
    },
    select: { id: true, email: true, lastSeenAt: true, createdAt: true },
    take: MAX_DELETES_PER_RUN,
  })

  let deleted = 0
  if (toDelete.length > 0 && !dryRun) {
    const res = await db.user.deleteMany({
      where: { id: { in: toDelete.map((u: any) => u.id) } },
    })
    deleted = res.count
    console.log(`[account-cleanup] deleted ${deleted} dormant accounts`)
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    policy: {
      inactivityMonths: INACTIVITY_MONTHS,
      warnDays:         Math.round(INACTIVITY_WARN_MS / 86_400_000),
    },
    warned:  dryRun ? realToWarn.length : realToWarn.length,
    deleted: dryRun ? toDelete.length  : deleted,
    // Emails only in dryRun so a normal run's logs don't carry PII.
    ...(dryRun ? {
      wouldWarn:   realToWarn.map((u: any) => u.email),
      wouldDelete: toDelete.map((u: any) => u.email),
    } : {}),
  })
}
