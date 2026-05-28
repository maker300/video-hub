// Admin: list every withdrawal with the requesting user's details.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAdminSession } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = await prisma.withdrawal.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],  // pending first
    take:    100,
    include: {
      user: { select: { id: true, name: true, email: true, teamBalanceBtc: true } },
    },
  })
  return NextResponse.json(rows)
}
