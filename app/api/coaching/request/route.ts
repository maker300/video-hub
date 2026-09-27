// Coaching session requests — subscriber submits preferred times, admin
// confirms out of band.
//
// Deliberately not a calendar integration. Real scheduling (availability,
// timezones, reschedules, reminders, no-shows) is a product in itself; until
// that exists, a request form plus an admin alert is the honest version and
// it does not pretend to book anything automatically.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCoachingAccess } from '@/lib/coaching'
import { alertAdmins } from '@/lib/admin-alert'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const access = await getCoachingAccess(userId)
  const requests = await (prisma as any).coachingRequest.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    take:    20,
    select: {
      id: true, preferredTime: true, topic: true, status: true,
      scheduledAt: true, meetingUrl: true, createdAt: true,
    },
  })

  return NextResponse.json({ access, requests })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as { id?: string } | undefined)?.id
  const email   = session?.user?.email
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  // A request notifies a human, so it is worth rate limiting.
  if (!rateLimit(`${getClientIp(req)}:coaching-req`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  const access = await getCoachingAccess(userId)
  if (!access.active) {
    return NextResponse.json({ error: 'An active coaching subscription is required.' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({})) as {
    preferredTime?: string; topic?: string; timezone?: string
  }
  const preferredTime = (body.preferredTime ?? '').trim().slice(0, 300)
  if (!preferredTime) {
    return NextResponse.json({ error: 'Tell us when you are available.' }, { status: 400 })
  }

  const created = await (prisma as any).coachingRequest.create({
    data: {
      userId,
      preferredTime,
      topic:    typeof body.topic === 'string' ? body.topic.trim().slice(0, 200) || null : null,
      timezone: typeof body.timezone === 'string' ? body.timezone.trim().slice(0, 60) || null : null,
    },
  })

  void alertAdmins({
    linkUrl: '/admin',
    subject: `Coaching session requested — ${email ?? userId}`,
    message:
      `${email ?? userId} has requested a 1-on-1 coaching session.\n\n` +
      `Availability: ${preferredTime}\n` +
      (body.topic ? `Topic: ${body.topic}\n` : '') +
      (body.timezone ? `Timezone: ${body.timezone}\n` : '') +
      `\nConfirm a time with them directly and send the meeting link.`,
    telegramHtml:
      `🎓 <b>Coaching session requested</b>\n\n` +
      `From: ${email ?? userId}\n` +
      `Availability: ${preferredTime}\n` +
      (body.topic ? `Topic: ${body.topic}\n` : ''),
  }).catch(e => console.error('[coaching] admin alert failed:', e))

  return NextResponse.json({ ok: true, id: created.id })
}
