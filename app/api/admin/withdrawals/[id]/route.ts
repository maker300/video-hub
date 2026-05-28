// Admin: complete or reject a pending withdrawal.
//   action='complete' — mark as paid; optional txHash + note. Balance stays
//                       deducted (it was escrowed at request time).
//   action='reject'   — restore balance via increment. Optional note for the user.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession, getSessionInfo } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const session = await getSessionInfo()
  if (!session.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await prisma.user.upsert({
    where:  { email: session.email },
    create: { email: session.email, name: 'Admin', role: 'admin' },
    update: {},
    select: { id: true },
  })

  const { id } = await params
  const body = await req.json().catch(() => ({})) as {
    action: 'complete' | 'reject'
    note?:   string
    txHash?: string
  }

  const w = await prisma.withdrawal.findUnique({ where: { id } })
  if (!w) return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
  if (w.status !== 'pending') {
    return NextResponse.json({ error: `Already ${w.status}` }, { status: 400 })
  }

  if (body.action === 'complete') {
    await prisma.withdrawal.update({
      where: { id },
      data: {
        status:      'completed',
        note:        body.note ?? null,
        txHash:      body.txHash ?? null,
        processedAt: new Date(),
        processedBy: admin.id,
      },
    })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'reject') {
    await prisma.$transaction(async tx => {
      // Refund the escrowed amount
      await tx.user.update({
        where: { id: w.userId },
        data:  { teamBalanceBtc: { increment: w.amountBtc } },
      })
      await tx.withdrawal.update({
        where: { id },
        data: {
          status:      'rejected',
          note:        body.note ?? null,
          processedAt: new Date(),
          processedBy: admin.id,
        },
      })
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action — must be complete or reject' }, { status: 400 })
}
