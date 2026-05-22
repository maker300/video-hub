import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { sendBulkEmail } from '@/lib/email'
import { buildBroadcastEmail, buildBroadcastText } from '@/lib/email-templates'

export async function POST(req: Request) {
  try {
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json() as {
      to:      'all' | string[]
      subject: string
      message: string
    }

    if (!body.subject?.trim() || !body.message?.trim()) {
      return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 })
    }
    if (body.subject.length > 200) {
      return NextResponse.json({ error: 'Subject must be 200 characters or fewer.' }, { status: 400 })
    }
    if (body.message.length > 10_000) {
      return NextResponse.json({ error: 'Message must be 10,000 characters or fewer.' }, { status: 400 })
    }

    let recipients: { name: string | null; email: string }[]

    if (body.to === 'all') {
      recipients = await prisma.user.findMany({
        select: { name: true, email: true },
        orderBy: { createdAt: 'desc' },
      })
    } else {
      recipients = await prisma.user.findMany({
        where: { id: { in: body.to } },
        select: { name: true, email: true },
      })
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients found.' }, { status: 400 })
    }

    if (!process.env.BREVO_API_KEY) {
      return NextResponse.json({
        preview:    true,
        recipients: recipients.map(r => r.email),
        subject:    body.subject,
        message:    body.message,
        note:       'BREVO_API_KEY not configured — set it in Vercel environment variables to send real emails.',
      })
    }

    const { sent, failed, errors } = await sendBulkEmail(
      recipients,
      body.subject,
      (name) => buildBroadcastEmail(name, body.subject, body.message),
      (name) => buildBroadcastText(name, body.message),
    )

    // Store in-app notification for each recipient so the bell picks it up
    const recipientIds = await prisma.user.findMany({
      where:  body.to === 'all' ? {} : { id: { in: body.to } },
      select: { id: true },
    })
    await prisma.adminNotification.createMany({
      data: recipientIds.map(u => ({
        userId:  u.id,
        subject: body.subject,
        message: body.message,
      })),
      skipDuplicates: true,
    })

    return NextResponse.json({ sent, failed, total: recipients.length, errors: errors.slice(0, 5) })
  } catch (err) {
    console.error('[admin/notify POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
