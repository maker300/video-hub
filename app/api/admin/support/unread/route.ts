import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

const db = prisma as any

// Returns count of open tickets created/updated since admin last checked.
// We use a simple approach: count tickets with status 'open' that have no adminReply yet.
export async function GET() {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const count = await db.supportTicket.count({
      where: {
        status:     'open',
        adminReply: null,
      },
    })
    return NextResponse.json({ count })
  } catch (err) {
    console.error('[admin/support/unread]', err)
    return NextResponse.json({ count: 0 })
  }
}
