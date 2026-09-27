// Admin: confirm, complete or cancel a coaching session request.
//
// Confirming is the moment a request turns into a commitment, so it also
// notifies the subscriber (bell + email) with the time and the join link.
// Without that the user would have to keep refreshing /coaching to find out
// whether anyone had acted on their request.
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { sendBulkEmail } from '@/lib/email'
import { buildBroadcastEmail, buildBroadcastText } from '@/lib/email-templates'

type Params = { params: Promise<{ id: string }> }

const VALID = new Set(['scheduled', 'done', 'cancelled', 'requested'])

export async function PATCH(req: Request, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => ({})) as {
    status?: string; scheduledAt?: string; meetingUrl?: string; adminNote?: string
  }

  const status = typeof body.status === 'string' ? body.status : ''
  if (!VALID.has(status)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
  }

  const db = prisma as any
  const existing = await db.coachingRequest.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // The meeting link is emailed and rendered as a link — https only.
  const meetingUrl = typeof body.meetingUrl === 'string' ? body.meetingUrl.trim() : ''
  if (status === 'scheduled') {
    if (!body.scheduledAt) {
      return NextResponse.json({ error: 'A date and time is required to confirm.' }, { status: 400 })
    }
    if (meetingUrl && !/^https:\/\/[^\s]+$/i.test(meetingUrl)) {
      return NextResponse.json({ error: 'Meeting link must be a valid https:// URL.' }, { status: 400 })
    }
  }

  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: 'Invalid date.' }, { status: 400 })
  }

  await db.coachingRequest.update({
    where: { id },
    data: {
      status,
      scheduledAt: status === 'scheduled' ? scheduledAt : existing.scheduledAt,
      meetingUrl:  meetingUrl || existing.meetingUrl,
      adminNote:   typeof body.adminNote === 'string' ? body.adminNote.slice(0, 500) : existing.adminNote,
    },
  })

  // Tell the subscriber their session is confirmed.
  if (status === 'scheduled' && existing.user && scheduledAt) {
    const when = scheduledAt.toUTCString()
    void db.adminNotification.create({
      data: {
        userId:  existing.user.id,
        subject: `Coaching session confirmed — ${when}`,
        message: `Your 1-on-1 session is confirmed for ${when}.` +
                 (meetingUrl || existing.meetingUrl ? ` Join link is on your coaching page.` : ''),
        linkUrl: '/coaching',
      },
    }).catch((e: unknown) => console.error('[coaching] bell failed:', e))

    if (!existing.user.email.endsWith('@forexmastery.internal')) {
      const subject = 'Your coaching session is confirmed'
      const message =
        `Your 1-on-1 coaching session is confirmed for ${when}.\n\n` +
        (meetingUrl || existing.meetingUrl ? `Join here: ${meetingUrl || existing.meetingUrl}\n\n` : '') +
        `You can see this any time on your coaching page. If the time no longer works, reply to this email.`
      void sendBulkEmail(
        [{ name: existing.user.name, email: existing.user.email }],
        subject,
        (name) => buildBroadcastEmail(name, subject, message),
        (name) => buildBroadcastText(name, message),
      ).catch(e => console.error('[coaching] confirm email failed:', e))
    }
  }

  return NextResponse.json({ ok: true })
}
