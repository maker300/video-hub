import { prisma } from '@/lib/prisma'

/**
 * Token packs. One token = one FM Trader prediction on any instrument.
 *
 * Prices in pence (Stripe's smallest unit) to avoid float money entirely — the
 * same reason TokenLedger.delta and User.tokenBalance are Int. Bonus scales with
 * pack size, mirroring the "save vs monthly" shape the old plans used.
 */
export const TOKEN_PACKS = [
  {
    id:       'starter',
    label:    'Starter',
    price:    5_00,        // £5.00
    tokens:   100,
    currency: 'gbp',
    popular:  false,
  },
  {
    id:       'trader',
    label:    'Trader',
    price:    20_00,       // £20.00
    tokens:   450,         // +12.5% vs starter rate
    currency: 'gbp',
    popular:  true,
  },
  {
    id:       'pro',
    label:    'Pro',
    price:    50_00,       // £50.00
    tokens:   1250,        // +25% vs starter rate
    currency: 'gbp',
    popular:  false,
  },
] as const

export type TokenPackId = typeof TOKEN_PACKS[number]['id']

/** Pence per token, for "best value" copy. */
export function pencePerToken(pack: { price: number; tokens: number }): number {
  return pack.price / pack.tokens
}

export const TOKENS_PER_RUN = 1

export type LedgerReason =
  | 'purchase'
  | 'fm_trader_run'
  | 'refund_failed_run'
  | 'admin_grant'
  | 'admin_revoke'

/**
 * Debit tokens for an action, atomically.
 *
 * The balance check lives in the `where` clause rather than a preceding read.
 * Under Read Committed a read-then-write lets two concurrent requests both
 * observe the same balance, both pass, and both decrement — the exact defect
 * that let team users overdraw teamBalanceBtc. Matching zero rows means there
 * were not enough tokens at write time.
 *
 * Returns the new balance, or null if the user could not afford it.
 */
export async function debitTokens(
  userId:    string,
  amount:    number,
  reason:    LedgerReason,
  reference?: string,
): Promise<number | null> {
  return prisma.$transaction(async tx => {
    const debited = await tx.user.updateMany({
      where: { id: userId, tokenBalance: { gte: amount } },
      data:  { tokenBalance: { decrement: amount } },
    })
    if (debited.count === 0) return null

    const user = await tx.user.findUnique({
      where:  { id: userId },
      select: { tokenBalance: true },
    })
    const balance = user?.tokenBalance ?? 0

    await tx.tokenLedger.create({
      data: { userId, delta: -amount, reason, balance, reference: reference ?? null },
    })
    return balance
  })
}

/**
 * Credit tokens — a purchase, a refund for a failed run, or an admin grant.
 *
 * Callers are responsible for idempotency. The Stripe path gets it from the
 * unique constraint on StripeEvent.eventId; the refund path from only running
 * inside the catch of a debit that actually succeeded.
 */
export async function creditTokens(
  userId:    string,
  amount:    number,
  reason:    LedgerReason,
  reference?: string,
): Promise<number> {
  return prisma.$transaction(async tx => {
    const user = await tx.user.update({
      where:  { id: userId },
      data:   { tokenBalance: { increment: amount } },
      select: { tokenBalance: true },
    })
    await tx.tokenLedger.create({
      data: {
        userId, delta: amount, reason,
        balance: user.tokenBalance, reference: reference ?? null,
      },
    })
    return user.tokenBalance
  })
}

export async function getBalance(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({
    where:  { id: userId },
    select: { tokenBalance: true },
  })
  return u?.tokenBalance ?? 0
}
