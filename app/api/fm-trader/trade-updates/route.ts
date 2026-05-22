import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const H24 = 24 * 60 * 60 * 1000

// GET — return trade updates for current user, pruning those older than 24hrs first
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ updates: [] })

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!user) return NextResponse.json({ updates: [] })

  // Prune: delete trade update notifications older than 24hrs regardless of read status
  await prisma.tradeUpdate.deleteMany({
    where: {
      userId:    user.id,
      createdAt: { lt: new Date(Date.now() - H24) },
    },
  }).catch(() => {})

  const updates = await prisma.tradeUpdate.findMany({
    where:   { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take:    50,
  })
  return NextResponse.json({ updates })
}

// PATCH — mark all as read
export async function PATCH() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ ok: false })

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!user) return NextResponse.json({ ok: false })

  await prisma.tradeUpdate.updateMany({ where: { userId: user.id, read: false }, data: { read: true } })
  return NextResponse.json({ ok: true })
}
