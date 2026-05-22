import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

const db = prisma as any

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  const ip = getClientIp(req)
  if (!rateLimit(`${ip}:support-escalate`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many escalations.' }, { status: 429 })
  }

  let body: {
    subject: string
    priority: string
    reason: string
    messages: { role: string; content: string }[]
    guestName?: string
    guestEmail?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { subject, priority, reason, messages, guestName, guestEmail } = body

  if (!subject || !messages?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const allowedPriorities = ['low', 'normal', 'high']
  const safePriority = allowedPriorities.includes(priority) ? priority : 'normal'

  try {
    const ticket = await db.supportTicket.create({
      data: {
        userId:     session?.user?.id && (session.user as any).role !== 'admin'
                    ? session.user.id as string
                    : null,
        guestName:  guestName?.slice(0, 100) || (session?.user?.name ?? null),
        guestEmail: guestEmail?.slice(0, 200) || (session?.user?.email ?? null),
        subject:    subject.slice(0, 200),
        messages:   messages.slice(-30).map(m => ({
                      role:    m.role,
                      content: String(m.content).slice(0, 4000),
                    })),
        status:     'open',
        priority:   safePriority,
        adminNote:  reason?.slice(0, 500) || null,
      },
    })

    return NextResponse.json({ ok: true, ticketId: ticket.id })
  } catch (err) {
    console.error('[support/escalate]', err)
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
  }
}
