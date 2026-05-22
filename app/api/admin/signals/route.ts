import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const since = new Date(Date.now() - 5 * 60 * 60 * 1000)

  const [alerts, savedPref] = await Promise.all([
    prisma.signalAlert.findMany({
      where: { sentAt: { gte: since } },
      orderBy: { sentAt: 'desc' },
      take: 20,
    }),
    prisma.adminSetting.findUnique({ where: { key: 'signal_notify_recipients' } }),
  ])

  return NextResponse.json({
    alerts,
    savedRecipients: (savedPref?.value ?? { mode: 'all', userIds: [] }) as {
      mode: 'all' | 'selected'
      userIds: string[]
    },
  })
}
