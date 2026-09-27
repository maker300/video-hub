// Dormant-account policy.
//
// Accounts that go unused for 6 months are deleted automatically. This keeps
// the free tier from accumulating dead registrations forever (the 100-token
// signup grant used to make that expensive) and limits how long we hold
// personal data we have no reason to keep — which is also the GDPR
// storage-limitation position.
//
// NEVER deleted:
//   • Anyone who bought the course
//   • Anyone who ever bought tokens (they paid us; their balance is theirs)
//   • team / admin accounts
//
// Users are warned by email before anything is removed, with enough time to
// act. Signing in resets the clock — `lastSeenAt` is the activity signal.

export const INACTIVITY_MONTHS       = 6
export const INACTIVITY_MS           = INACTIVITY_MONTHS * 30 * 24 * 60 * 60 * 1000
/** Warning goes out this long before the deletion date. */
export const INACTIVITY_WARN_MS      = 14 * 24 * 60 * 60 * 1000   // 14 days

/** Human-readable policy line — reused in signup copy, emails and terms. */
export const INACTIVITY_POLICY_TEXT =
  `Accounts with no sign-in for ${INACTIVITY_MONTHS} months are deleted automatically. ` +
  `Accounts with course access or any token purchase are never deleted. ` +
  `We email you 14 days before, and simply signing in keeps the account.`

/**
 * Prisma `where` fragment identifying accounts eligible for deletion.
 *
 * Exemptions are expressed as NOT-conditions so a user only needs to match
 * one of them to be safe. `tokenLedger.some` catches anyone who has ever
 * paid, including historical purchases whose tokens are long spent.
 */
export function dormantWhere(cutoff: Date) {
  return {
    role: 'user',                       // never touch team/admin
    coursePurchased: false,
    // No sign-in since the cutoff. Accounts that never signed in at all fall
    // back to createdAt so a registration that was abandoned still ages out.
    OR: [
      { lastSeenAt: { lt: cutoff } },
      { lastSeenAt: null, createdAt: { lt: cutoff } },
    ],
    tokenLedger: {
      none: { reason: { in: ['purchase', 'course_purchase_bonus'] } },
    },
  }
}
