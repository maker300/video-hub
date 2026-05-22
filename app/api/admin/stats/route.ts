import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const db = prisma as any
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const [totalUsers, totalProgress, recentUsers, oauthUsers, todayVisits] = await Promise.all([
      prisma.user.count(),
      prisma.userProgress.count({ where: { completed: true } }),
      prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.account.count(),
      db.pageView.count({ where: { createdAt: { gte: startOfToday } } }).catch(() => 0),
    ])

    return NextResponse.json({ totalUsers, totalProgress, recentUsers, oauthUsers, todayVisits })
  } catch (err) {
    console.error('[admin/stats GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
