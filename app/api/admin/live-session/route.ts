// "Go live now" — admin starts/stops a live trading session.
//
// Starting one immediately notifies every active coaching subscriber by bell,
// email and Telegram, and raises a banner on the site. The promise sold is
// "a seat in every live trading session we run that month", and a session
// nobody hears about in time is the same as no session at all — so the
// notification burst is the whole point of this endpoint.
//
// State lives in a single AdminSetting row rather than its own table: there
// is only ever one live session, and it is transient.
import { NextResponse } from 'next/server'
import { getAdminSession, getSessionInfo } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { sendBulkEmail } from '@/lib/email'
import { buildBroadcastEmail, buildBroadcastText } from '@/lib/email-templates'
import { sendTelegramMessage } from '@/lib/telegram'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const KEY = 'live_session'

export interface LiveSessionState {
  live:      boolean
  url:       string | null
  title:     string | null
  startedAt: string | null
}

async function readState(): Promise<LiveSessionState> {
  const row = await (prisma as any).adminSetting.findUnique({ where: { key: KEY } })
  const v = (row?.value ?? {}) as Partial<LiveSessionState>
  return {
    live:      !!v.live,
    url:       v.url ?? null,
    title:     v.title ?? null,
    startedAt: v.startedAt ?? null,
  }
}

export async function GET() {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json(await readState())
}

export async function POST(req: Request) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const me = await getSessionInfo()

  const body = await req.json().catch(() => ({})) as {
    action?: 'start' | 'stop'; url?: string; title?: string; notify?: boolean
  }

  // ── Stop ───────────────────────────────────────────────────────────────
  if (body.action === 'stop') {
    const value = { live: false, url: null, title: null, startedAt: null }
    await (prisma as any).adminSetting.upsert({
      where:  { key: KEY },
      update: { value: value as unknown as Prisma.InputJsonValue },
      create: { key: KEY, value: value as unknown as Prisma.InputJsonValue },
    })
    return NextResponse.json({ ok: true, ...value })
  }

  // ── Start ──────────────────────────────────────────────────────────────
  const url = (body.url ?? '').trim()
  // Only https links — this URL is emailed to paying subscribers and rendered
  // as an anchor, so it must never carry a javascript: or data: scheme.
  if (!/^https:\/\/[^\s]+$/i.test(url)) {
    return NextResponse.json({ error: 'Provide a valid https:// meeting link.' }, { status: 400 })
  }
  const title = (body.title ?? '').trim().slice(0, 120) || 'Live trading session'

  const startedAt = new Date()
  const value = { live: true, url, title, startedAt: startedAt.toISOString() }
  await (prisma as any).adminSetting.upsert({
    where:  { key: KEY },
    update: { value: value as unknown as Prisma.InputJsonValue },
    create: { key: KEY, value: value as unknown as Prisma.InputJsonValue },
  })

  // Recipients: anyone whose coaching entitlement is currently live. Mirrors
  // getCoachingAccess — active, past_due (mid-dunning), or cancelled but
  // still inside the paid period.
  let notified = 0
  if (body.notify !== false) {
    const subs = await (prisma as any).user.findMany({
      where: {
        OR: [
          { coachingStatus: { in: ['active', 'past_due'] } },
          { coachingStatus: 'cancelled', coachingEndsAt: { gt: new Date() } },
          { coachingLegacyFree: true },
        ],
      },
      select: { id: true, name: true, email: true },
    })
    notified = subs.length

    if (subs.length > 0) {
      // linkUrl is the meeting link itself — an external https:// URL, not
      // /coaching — so tapping the bell notification joins the session in
      // one step instead of dropping the subscriber on the coaching page to
      // find the join button themselves.
      await (prisma as any).adminNotification.createMany({
        data: subs.map((u: any) => ({
          userId:  u.id,
          subject: `🔴 Live now — ${title}`,
          message: `A live trading session has just started. Tap to join now.`,
          linkUrl: url,
        })),
      }).catch((e: unknown) => console.error('[live-session] bell failed:', e))

      const real = subs.filter((u: any) => !u.email.endsWith('@forexmastery.internal'))
      if (real.length > 0) {
        const subject = `Live now — ${title}`
        const message =
          `We've just gone live.\n\n` +
          `Join here: ${url}\n\n` +
          `This is included with your coaching subscription. If you can't make it, ` +
          `we'll be live again — you get a seat in every session we run this month.`
        await sendBulkEmail(
          real.map((u: any) => ({ name: u.name, email: u.email })),
          subject,
          (name) => buildBroadcastEmail(name, subject, message),
          (name) => buildBroadcastText(name, message),
        ).catch(e => console.error('[live-session] email failed:', e))
      }
    }

    await sendTelegramMessage(
      `🔴 <b>Live trading session started</b>\n\n${title}\n\n` +
      `Notified ${notified} coaching subscriber${notified === 1 ? '' : 's'}.\n` +
      `Started by ${me.email ?? 'admin'}`
    ).catch(e => console.error('[live-session] telegram failed:', e))
  }

  return NextResponse.json({ ok: true, ...value, notified })
}
