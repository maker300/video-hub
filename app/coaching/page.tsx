import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getCoachingAccess, COACHING_PRICE_MONTHLY, COACHING_SESSIONS_PER_MONTH,
  countSessionsUsed, currentPeriodStart,
} from '@/lib/coaching'
import CoachingClient from './CoachingClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title:       '1-on-1 Coaching — Forex Mastery',
  description: 'Private video sessions with a trading professional. £50/month, cancel any time.',
}

export default async function CoachingPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/auth/signin?callbackUrl=/coaching')

  const userId = (session.user as { id?: string }).id
  const access = await getCoachingAccess(userId)

  // Allowance context — how many of this month's sessions are spent, and
  // when the allowance resets. Both shown on the page so neither side has
  // to guess where they stand.
  const used        = access.active && userId ? await countSessionsUsed(userId, access.startedAt) : 0
  const periodStart = currentPeriodStart(access.startedAt)
  const periodEnd   = new Date(periodStart)
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1)

  return (
    <CoachingClient
      active={access.active}
      free={access.free}
      status={access.status}
      endsAt={access.endsAt ? access.endsAt.toISOString() : null}
      price={COACHING_PRICE_MONTHLY}
      sessionsPerMonth={COACHING_SESSIONS_PER_MONTH}
      sessionsUsed={used}
      periodResetsAt={periodEnd.toISOString()}
    />
  )
}
