// Admin: edit a calendar event's figures.
//
// Supplying an actual runs the same path an automatic figure would: the
// surprise is recomputed, the agent's feed post is rewritten with the real
// number, and one notification goes out. figureAnnouncedAt gates that second
// announcement so repeated edits (a typo correction, say) do not re-alert.
import { NextResponse } from 'next/server'
import { getAdminSession, getSessionInfo } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { classifySurprise, formatPrint, currencyBias, isCommentaryEvent } from '@/lib/econ-calendar'
import { slugsForCurrency, displayForSlug } from '@/lib/market-map'
import { sendTelegramMessage } from '@/lib/telegram'

type Params = { params: Promise<{ id: string }> }

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function PATCH(req: Request, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const session = await getSessionInfo()
  const { id }  = await params
  const db      = prisma as any

  const body = await req.json().catch(() => ({})) as {
    actual?: unknown; forecast?: unknown; previous?: unknown; unit?: string
    note?: string
  }

  const existing = await db.economicEvent.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const actual   = 'actual'   in body ? num(body.actual)   : existing.actual
  const forecast = 'forecast' in body ? num(body.forecast) : existing.forecast
  const previous = 'previous' in body ? num(body.previous) : existing.previous
  const unit     = typeof body.unit === 'string' ? (body.unit.trim() || null) : existing.unit
  const note     = typeof body.note === 'string' ? (body.note.trim().slice(0, 600) || null) : existing.note

  const { surprise, dir } = classifySurprise(actual, forecast)
  const now = new Date()

  const updated = await db.economicEvent.update({
    where: { id },
    data: {
      actual, forecast, previous, unit, note,
      surprise, surpriseDir: dir,
      releasedAt: actual != null ? (existing.releasedAt ?? now) : null,
      editedBy:   session.email ?? 'admin',
      editedAt:   now,
    },
  })

  // Numeric releases publish when a figure arrives; commentary events publish
  // when a takeaway is written, since a note is the only content they will ever
  // have. Either way it announces once.
  const commentary     = isCommentaryEvent(updated.event, forecast, previous)
  const hasContent     = commentary ? !!note : actual != null
  const shouldAnnounce = hasContent && !existing.figureAnnouncedAt
  if (!shouldAnnounce) {
    return NextResponse.json({ ok: true, announced: false, event: { id, actual, forecast, previous, surpriseDir: dir } })
  }

  const slugs    = slugsForCurrency(updated.currency)
  const affected = slugs.map(displayForSlug).join(', ')
  const print    = commentary ? updated.event : formatPrint({ actual, forecast, previous, unit })
  const dirNote  =
    dir === 'hotter' ? ' — above expectations'
    : dir === 'cooler' ? ' — below expectations'
    : dir === 'inline' ? ' — in line with expectations'
    : ''
  const bias = currencyBias(updated.event, dir)
  const biasLine =
    bias === 'positive' ? `Reads positive for ${updated.currency}`
    : bias === 'negative' ? `Reads negative for ${updated.currency}`
    : `Neutral for ${updated.currency} — in line with expectations`

  const content = [
    `${updated.currency} — ${updated.event}`,
    ``,
    ...(commentary
      ? [note ?? '']
      : [`${print}${dirNote}`, biasLine]),
    ``,
    `Instruments with exposure: ${affected}`,
    ``,
    `First-order read only — how this actually moves price depends on positioning and what was already priced in. Check the pair analysis before trading.`,
  ].join('\n')

  // Rewrite the agent's existing post rather than adding a second one: the feed
  // should show the release once, now carrying the real number.
  const post = await db.post.findUnique({ where: { economicEventId: id } })
  if (post) {
    await db.post.update({ where: { id: post.id }, data: { content } })
  } else {
    await db.post.create({
      data: {
        authorType: 'agent', economicEventId: id, content,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
    })
  }

  await sendTelegramMessage(
    `📊 <b>${updated.currency} — ${updated.event}</b>\n\n` +
    `<b>${print}</b>${dirNote}\n${biasLine}\n\n` +
    `Instruments with exposure: ${affected}\n` +
    `🔗 https://forexmastery.org/analysis/news`
  ).catch(e => console.error('[econ-events] telegram failed:', e))

  const subs = await prisma.pairSubscription.findMany({
    where: { slug: { in: slugs } }, select: { userId: true }, distinct: ['userId'],
  })
  if (subs.length > 0) {
    await prisma.adminNotification.createMany({
      data: subs.map(s => ({
        userId:  s.userId,
        subject: `${updated.currency} ${updated.event}: ${print}`,
        message: `${updated.event} came in at ${print}${dirNote}. ${biasLine}. Instruments you follow with exposure: ${affected}. First-order read — check the pair analysis for direction.`,
        linkUrl: '/analysis/news',
      })),
    }).catch(e => console.error('[econ-events] bell failed:', e))
  }

  await db.economicEvent.update({ where: { id }, data: { figureAnnouncedAt: now } })

  return NextResponse.json({ ok: true, announced: true, notified: subs.length, print })
}
