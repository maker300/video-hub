// 1-on-1 coaching subscription.
//
// Distinct from the group calls bundled with the course: those are four
// scheduled group sessions included in the one-off course price. This is a
// recurring monthly product for private sessions with a trading professional.
// Keep that distinction in every piece of user-facing copy — a course buyer
// who thinks they are being charged twice for the same thing will churn.

import { prisma } from '@/lib/prisma'

export const COACHING_PRICE_MONTHLY = 50_00   // £50.00 / month

// What a month of coaching actually includes:
//   • 4 scheduled one-to-one training sessions
//   • PLUS every live trading session run that month — however many there
//     are. Not capped, because it depends on how often the desk goes live,
//     and capping it would understate the offer.
export const COACHING_SESSIONS_PER_MONTH = 4

export interface CoachingAccess {
  active:     boolean
  status:     string | null
  startedAt:  Date | null
  endsAt:     Date | null
  free:       boolean   // true if this access is the unbilled legacy grant, not a paid subscription
}

/**
 * Is this user entitled to book coaching right now?
 *
 * `past_due` deliberately still counts as active: Stripe retries failed
 * payments for days, and locking someone out mid-dunning over a card that
 * expired is a bad experience for a product they are actively paying for.
 * Stripe moves them to `cancelled` if it ultimately fails, which does lock.
 *
 * `coachingLegacyFree` grants the same access with no Stripe subscription
 * behind it at all — backfilled once for everyone who had an account when
 * coaching was made free for current users.
 */
export async function getCoachingAccess(userId: string | null | undefined): Promise<CoachingAccess> {
  if (!userId) return { active: false, status: null, startedAt: null, endsAt: null, free: false }

  const u = await (prisma as any).user.findUnique({
    where:  { id: userId },
    select: {
      role: true, coachingLegacyFree: true,
      coachingStatus: true, coachingStartedAt: true, coachingEndsAt: true,
    },
  })
  if (!u) return { active: false, status: null, startedAt: null, endsAt: null, free: false }

  const staff   = u.role === 'admin' || u.role === 'team'
  const live    = u.coachingStatus === 'active' || u.coachingStatus === 'past_due'
  // A cancelled subscription keeps access until the paid period ends.
  const inGrace = u.coachingStatus === 'cancelled'
                  && u.coachingEndsAt instanceof Date
                  && u.coachingEndsAt.getTime() > Date.now()
  const free = staff || u.coachingLegacyFree === true

  return {
    active:    free || live || inGrace,
    status:    u.coachingStatus ?? null,
    startedAt: u.coachingStartedAt ?? null,
    endsAt:    u.coachingEndsAt ?? null,
    free,
  }
}

/**
 * Start of the subscriber's current billing month.
 *
 * Anniversary-based, not calendar-based: someone who subscribed on the 20th
 * gets their 4 sessions from the 20th to the 19th, matching what Stripe
 * actually bills them for. Using calendar months would hand a late-month
 * subscriber a fresh allowance days after they paid.
 */
export function currentPeriodStart(startedAt: Date | null): Date {
  const now = new Date()
  if (!startedAt) {
    // No recorded start (legacy/staff) — fall back to the calendar month.
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  }
  const anchorDay = startedAt.getUTCDate()
  // This month's anniversary; if it hasn't happened yet, use last month's.
  const candidate = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(),
    Math.min(anchorDay, daysInMonth(now.getUTCFullYear(), now.getUTCMonth())),
    startedAt.getUTCHours(), startedAt.getUTCMinutes(),
  ))
  if (candidate.getTime() <= now.getTime()) return candidate
  const pm = now.getUTCMonth() - 1
  const y  = pm < 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear()
  const m  = pm < 0 ? 11 : pm
  return new Date(Date.UTC(y, m, Math.min(anchorDay, daysInMonth(y, m)),
    startedAt.getUTCHours(), startedAt.getUTCMinutes()))
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
}

/**
 * Sessions consumed in the current billing month.
 *
 * Counts `scheduled` as well as `done`: once a slot is booked it is spent
 * from the subscriber's allowance, otherwise someone could book four, attend
 * none, and book four more.
 */
export async function countSessionsUsed(userId: string, startedAt: Date | null): Promise<number> {
  const since = currentPeriodStart(startedAt)
  return (prisma as any).coachingRequest.count({
    where: {
      userId,
      status: { in: ['scheduled', 'done'] },
      // Dated by the confirmed slot where there is one, else the request.
      OR: [
        { scheduledAt: { gte: since } },
        { scheduledAt: null, createdAt: { gte: since } },
      ],
    },
  })
}
