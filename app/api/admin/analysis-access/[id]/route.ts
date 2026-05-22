import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

// GET — fetch current access status for a user
export async function GET(_req: Request, { params }: Params) {
  try {
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const access = await (prisma as any).analysisAccess.findUnique({ where: { userId: id } })
    return NextResponse.json(access ?? null)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[analysis-access GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST — grant or update access
export async function POST(req: Request, { params }: Params) {
  try {
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params

    let body: { type?: string; startDate?: string; note?: string } = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { type, startDate: startDateStr, note } = body

    const VALID_TYPES = ['one_week', 'one_month', 'three_months', 'six_months', 'twelve_months', 'monthly_rollover']
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `Invalid access type: "${type}"` }, { status: 400 })
    }

    // Verify user exists
    const user = await (prisma as any).user.findUnique({ where: { id }, select: { id: true } })
    if (!user) return NextResponse.json({ error: `User not found: ${id}` }, { status: 404 })

    const startDate = startDateStr
      ? new Date(startDateStr.includes('T') ? startDateStr : `${startDateStr}T00:00:00.000Z`)
      : new Date()
    const endDate = new Date(startDate)
    const daysMap: Record<string, number> = {
      one_week:      7,
      one_month:     30,
      three_months:  90,
      six_months:    180,
      twelve_months: 365,
    }
    const daysToAdd = daysMap[type] ?? 30
    if (type !== 'monthly_rollover') endDate.setDate(endDate.getDate() + daysToAdd)

    const existing = await (prisma as any).analysisAccess.findUnique({ where: { userId: id } })

    const access = existing
      ? await (prisma as any).analysisAccess.update({
          where: { userId: id },
          data: {
            type,
            startDate,
            endDate,
            active:    true,
            grantedAt: new Date(),
            note:      note?.trim() || null,
          },
        })
      : await (prisma as any).analysisAccess.create({
          data: {
            userId:    id,
            type,
            startDate,
            endDate,
            active:    true,
            grantedAt: new Date(),
            note:      note?.trim() || null,
          },
        })

    return NextResponse.json(access)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[analysis-access POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE — revoke access
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    const existing = await (prisma as any).analysisAccess.findUnique({ where: { userId: id } })
    if (!existing) return NextResponse.json({ success: true })

    await (prisma as any).analysisAccess.update({
      where: { userId: id },
      data:  { active: false },
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[analysis-access DELETE]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
