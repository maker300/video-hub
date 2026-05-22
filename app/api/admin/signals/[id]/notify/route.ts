import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { sendBulkEmail } from '@/lib/email'
import { buildSignalEmail, buildSignalText } from '@/lib/email-templates'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json() as { to: 'all' | string[] }

  const signal = await prisma.signalAlert.findUnique({ where: { id } })
  if (!signal) return NextResponse.json({ error: 'Signal not found' }, { status: 404 })
  if (signal.notifiedAt) return NextResponse.json({ error: 'Already notified' }, { status: 409 })

  // Persist recipient preference for next approval
  const prefValue = {
    mode:    body.to === 'all' ? 'all' : 'selected',
    userIds: body.to === 'all' ? [] : body.to,
  }
  await prisma.adminSetting.upsert({
    where:  { key: 'signal_notify_recipients' },
    create: { key: 'signal_notify_recipients', value: prefValue },
    update: { value: prefValue },
  })

  let recipients = body.to === 'all'
    ? await prisma.user.findMany({ select: { id: true, name: true, email: true } })
    : await prisma.user.findMany({
        where:  { id: { in: body.to } },
        select: { id: true, name: true, email: true },
      })

  // Always include users subscribed to this pair even if not in the explicit recipient list
  if (body.to !== 'all') {
    const subs = await prisma.pairSubscription.findMany({
      where:   { slug: signal.slug },
      include: { user: { select: { id: true, name: true, email: true } } },
    })
    const existingIds = new Set(recipients.map(r => r.id))
    for (const s of subs) {
      if (!existingIds.has(s.user.id)) recipients.push(s.user)
    }
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'No recipients found' }, { status: 400 })
  }

  const dir     = signal.decision === 'BUY' ? 'buy' : 'sell'
  const subject = `New ${dir} signal on ${signal.display}`

  const { sent, failed, errors } = await sendBulkEmail(
    recipients,
    subject,
    (name) => buildSignalEmail(name, signal),
    (name) => buildSignalText(name, signal),
  )

  await prisma.signalAlert.update({
    where: { id },
    data: {
      notifiedAt: new Date(),
      notifiedTo: body.to === 'all' ? 'all' : JSON.stringify(body.to),
    },
  })

  return NextResponse.json({ sent, failed, total: recipients.length, errors: errors.slice(0, 5) })
}
