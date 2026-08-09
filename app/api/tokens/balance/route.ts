// Current token balance plus recent ledger entries, for the buy page and the
// FM Trader UI. Signed-in users only, and always scoped to the caller — the
// ledger is a financial record and must never be readable across users.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const db = prisma as any

  const [user, ledger] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { tokenBalance: true } }),
    db.tokenLedger.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    20,
      select:  { delta: true, reason: true, balance: true, reference: true, createdAt: true },
    }),
  ])

  return NextResponse.json({
    balance: user?.tokenBalance ?? 0,
    // Admins are not charged for runs, so the UI can suppress "out of tokens"
    // prompts for them rather than showing a balance that never moves.
    exempt:  (session!.user as any)?.role === 'admin',
    ledger,
  })
}
