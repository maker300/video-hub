// Course pricing — single source of truth.
//
// The course was free until 2026-09-22. Accounts created before that date
// signed up under "free / lifetime access" terms, so they are NOT charged
// automatically and never will be: they are offered a reduced legacy price
// and must actively choose to pay, like any other purchase. Accounts created
// after the cutover pay the standard price.
//
// Prices are in PENCE (Stripe's smallest unit) — never floats. The same
// reason TokenLedger.delta and User.tokenBalance are Int.

import { prisma } from '@/lib/prisma'

export const COURSE_PRICE_STANDARD = 100_00   // £100.00 — new members
export const COURSE_PRICE_LEGACY   =  50_00   // £50.00  — pre-existing members

// What buying the course includes beyond the lessons themselves.
//
// Tokens: the signup grant dropped to 10, so a course purchase taking a user
// to 20 is the headline "double your tokens" benefit. Granted once, on the
// webhook, inside the same transaction that sets the entitlement.
export const COURSE_BONUS_TOKENS = 10

// Live sessions: one moderated video call per week for four weeks from the
// purchase date. Scheduling happens outside the app for now — this constant
// exists so the number is stated identically in checkout, the purchase page
// and the receipt, rather than being retyped in three places.
export const COURSE_LIVE_CALLS       = 4
export const COURSE_LIVE_CALL_WEEKS  = 4

/** Date the course switched from free to paid. */
export const COURSE_PAID_FROM = new Date('2026-09-22T00:00:00Z')

export function formatGbp(pence: number): string {
  return `£${(pence / 100).toFixed(pence % 100 === 0 ? 0 : 2)}`
}

export interface CourseAccess {
  purchased:   boolean
  /** Price this specific user would pay right now, in pence. */
  price:       number
  /** True when they qualify for the reduced pre-existing-member price. */
  legacy:      boolean
  purchasedAt: Date | null
}

/**
 * Resolve a user's course entitlement and applicable price.
 *
 * Returns `purchased: false` with the standard price for signed-out visitors
 * so the pricing page can render without a session.
 */
export async function getCourseAccess(userId: string | null | undefined): Promise<CourseAccess> {
  if (!userId) {
    return { purchased: false, price: COURSE_PRICE_STANDARD, legacy: false, purchasedAt: null }
  }

  const u = await (prisma as any).user.findUnique({
    where:  { id: userId },
    select: {
      role: true,
      coursePurchased: true, coursePurchasedAt: true, courseLegacyPricing: true,
    },
  })
  if (!u) {
    return { purchased: false, price: COURSE_PRICE_STANDARD, legacy: false, purchasedAt: null }
  }

  // Staff always have access — they need to review content they didn't buy.
  const staff = u.role === 'admin' || u.role === 'team'

  return {
    purchased:   staff || u.coursePurchased,
    price:       u.courseLegacyPricing ? COURSE_PRICE_LEGACY : COURSE_PRICE_STANDARD,
    legacy:      u.courseLegacyPricing,
    purchasedAt: u.coursePurchasedAt ?? null,
  }
}
