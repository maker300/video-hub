import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

const db = prisma as any

export async function GET() {
  try {
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const since14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

    // All page views in last 30 days
    let views: { path: string; createdAt: Date }[] = []
    try {
      views = await db.pageView.findMany({
        where:   { createdAt: { gte: since30 } },
        select:  { path: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      })
    } catch { /* table may not exist yet */ }

    // ── Pie chart: group by section ──────────────────────────────────────────
    const sectionMap: Record<string, number> = {}
    for (const v of views) {
      let section = 'Other'
      if (v.path === '/' || v.path === '') section = 'Home'
      else if (v.path.startsWith('/analysis')) section = 'Analysis'
      else if (v.path.startsWith('/course'))   section = 'Course'
      else if (v.path.startsWith('/profile'))  section = 'Profile'
      else if (v.path.startsWith('/admin'))    section = 'Admin'
      sectionMap[section] = (sectionMap[section] ?? 0) + 1
    }
    const pieData = Object.entries(sectionMap)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)

    // ── Bar chart: daily totals for last 14 days ─────────────────────────────
    const dailyMap: Record<string, number> = {}
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      dailyMap[d.toISOString().slice(0, 10)] = 0
    }
    for (const v of views) {
      if (v.createdAt < since14) continue
      const key = new Date(v.createdAt).toISOString().slice(0, 10)
      if (key in dailyMap) dailyMap[key]++
    }
    const dailyData = Object.entries(dailyMap).map(([date, count]) => ({ date, count }))

    // ── Analysis access stats ────────────────────────────────────────────────
    let totalAccess = 0, activeAccess = 0, rolloverAccess = 0
    try {
      ;[totalAccess, activeAccess, rolloverAccess] = await Promise.all([
        db.analysisAccess.count(),
        db.analysisAccess.count({
          where: {
            active: true,
            OR: [
              { type: 'monthly_rollover' },
              { type: 'one_month', endDate: { gt: new Date() } },
            ],
          },
        }),
        db.analysisAccess.count({ where: { type: 'monthly_rollover', active: true } }),
      ])
    } catch { /* safe fallback */ }

    return NextResponse.json({
      pieData,
      dailyData,
      totalViews: views.length,
      analysisAccess: { total: totalAccess, active: activeAccess, rollover: rolloverAccess },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[admin/analytics GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
