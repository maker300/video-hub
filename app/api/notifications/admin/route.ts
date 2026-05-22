import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const H24 = 24 * 60 * 60 * 1000

// GET — return admin/welcome notifications for current user, pruning expired ones first
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ notifications: [] })

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!user) return NextResponse.json({ notifications: [] })

  const now = new Date()

  // Prune: delete read notifications older than 24hrs, unread older than 30 days
  await prisma.adminNotification.deleteMany({
    where: {
      userId: user.id,
      OR: [
        { read: true,  readAt:    { lt: new Date(now.getTime() - H24) } },
        { read: false, createdAt: { lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
      ],
    },
  }).catch(() => {})

  const notifications = await prisma.adminNotification.findMany({
    where:   { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take:    50,
  })
  return NextResponse.json({ notifications })
}

// PATCH — mark all unread as read, recording readAt timestamp
export async function PATCH() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ ok: false })

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!user) return NextResponse.json({ ok: false })

  await prisma.adminNotification.updateMany({
    where: { userId: user.id, read: false },
    data:  { read: true, readAt: new Date() },
  })
  return NextResponse.json({ ok: true })
}
