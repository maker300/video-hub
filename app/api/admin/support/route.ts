import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

const db = prisma as any

// GET — list all support tickets
export async function GET() {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const tickets = await db.supportTicket.findMany({
      orderBy: [
        { status: 'asc' },        // open first
        { priority: 'desc' },     // high priority first within status
        { createdAt: 'desc' },
      ],
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    })
    return NextResponse.json(tickets)
  } catch (err) {
    console.error('[admin/support GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
