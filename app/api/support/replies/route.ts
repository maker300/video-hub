import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const db = prisma as any

// GET /api/support/replies?ticketId=xxx
// Returns an unread admin reply for the given ticket and marks it as read.
// Requires: authenticated session. Only returns data if the ticket belongs to the caller.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as { id?: string }).id
  const { searchParams } = new URL(req.url)
  const ticketId = searchParams.get('ticketId')?.trim()

  if (!ticketId || !userId) return NextResponse.json({ reply: null })

  try {
    const ticket = await db.supportTicket.findUnique({
      where:  { id: ticketId },
      select: { userId: true, adminReply: true, repliedAt: true, replyRead: true },
    })

    // Ownership check — only the ticket owner can read the reply
    if (!ticket || ticket.userId !== userId) {
      return NextResponse.json({ reply: null })
    }

    if (!ticket.adminReply || ticket.replyRead) {
      return NextResponse.json({ reply: null })
    }

    // Mark as read
    await db.supportTicket.update({
      where: { id: ticketId },
      data:  { replyRead: true },
    })

    return NextResponse.json({
      reply:     ticket.adminReply,
      repliedAt: ticket.repliedAt,
    })
  } catch {
    return NextResponse.json({ reply: null })
  }
}
