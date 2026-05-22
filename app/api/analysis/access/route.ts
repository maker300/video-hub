import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const db = prisma as any

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ hasAccess: false, reason: 'not_logged_in' })

    if (session.user.role === 'admin') return NextResponse.json({ hasAccess: true, reason: 'admin' })

    let access: any = null
    try {
      access = await db.analysisAccess.findUnique({ where: { userId: session.user.id } })
    } catch { /* table may not exist */ }

    if (!access) return NextResponse.json({ hasAccess: false, reason: 'no_grant' })
    if (!access.active) return NextResponse.json({ hasAccess: false, reason: 'revoked' })
    // Check expiry for all fixed-term types (monthly_rollover never expires)
    const FIXED_TERM = ['one_week', 'one_month', 'three_months', 'six_months', 'twelve_months']
    if (FIXED_TERM.includes(access.type) && new Date(access.endDate) <= new Date()) {
      return NextResponse.json({ hasAccess: false, reason: 'expired', expiredAt: access.endDate })
    }

    return NextResponse.json({ hasAccess: true, type: access.type, endDate: access.endDate, reason: 'granted' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[analysis/access GET]', msg)
    return NextResponse.json({ hasAccess: false, reason: 'error' })
  }
}
