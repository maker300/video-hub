// Admin manual token adjustment.
//
// Sits alongside the analysis-access controls: with access no longer sold as a
// timed plan, "give this user some runs" is the grant an admin actually needs.
// Every adjustment is written to TokenLedger with the admin's note, so a manual
// grant is as auditable as a purchase or a refund.
import { NextResponse } from 'next/server'
import { getAdminSession, getSessionInfo } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

// GET — current balance plus recent movements, for the admin modal
export async function GET(_req: Request, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const db = prisma as any

  const [user, ledger] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: { tokenBalance: true } }),
    db.tokenLedger.findMany({
      where:   { userId: id },
      orderBy: { createdAt: 'desc' },
      take:    10,
      select:  { delta: true, reason: true, balance: true, reference: true, createdAt: true },
    }),
  ])

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json({ balance: user.tokenBalance, ledger })
}

// POST { delta, note } — grant (positive) or revoke (negative)
export async function POST(req: Request, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const session = await getSessionInfo()

  const body = await req.json().catch(() => ({})) as { delta?: number; note?: string }
  const delta = Math.trunc(Number(body.delta))

  if (!Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: 'Enter a non-zero whole number of tokens.' }, { status: 400 })
  }
  // Bounded so a mistyped figure cannot mint an unusable balance in one click.
  if (Math.abs(delta) > 100_000) {
    return NextResponse.json({ error: 'Adjustment is limited to 100,000 tokens at a time.' }, { status: 400 })
  }

  const note = (body.note ?? '').trim().slice(0, 200)

  try {
    const balance = await prisma.$transaction(async tx => {
      const db = tx as any

      if (delta < 0) {
        // Revoking uses the same conditional UPDATE as a spend, so a balance
        // cannot be driven negative by a concurrent run or a double-click.
        const done = await tx.user.updateMany({
          where: { id, tokenBalance: { gte: -delta } },
          data:  { tokenBalance: { decrement: -delta } },
        })
        if (done.count === 0) throw new Error('INSUFFICIENT')
      } else {
        const exists = await tx.user.updateMany({
          where: { id },
          data:  { tokenBalance: { increment: delta } },
        })
        if (exists.count === 0) throw new Error('NOT_FOUND')
      }

      const user = await tx.user.findUnique({ where: { id }, select: { tokenBalance: true } })
      const newBalance = user?.tokenBalance ?? 0

      await db.tokenLedger.create({
        data: {
          userId:    id,
          delta,
          reason:    delta > 0 ? 'admin_grant' : 'admin_revoke',
          balance:   newBalance,
          reference: [note, session.email ? `by ${session.email}` : null].filter(Boolean).join(' | ') || null,
        },
      })

      return newBalance
    })

    return NextResponse.json({ ok: true, balance })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown'
    if (msg === 'INSUFFICIENT') {
      return NextResponse.json({ error: 'User does not have that many tokens to remove.' }, { status: 400 })
    }
    if (msg === 'NOT_FOUND') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    console.error('[admin/users/tokens]', e)
    return NextResponse.json({ error: 'Failed to adjust tokens' }, { status: 500 })
  }
}
