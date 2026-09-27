// Shared publish path for macro-release actuals.
//
// Called from:
//   • /api/admin/econ-events/[id] PATCH — when an admin or team member types
//     the figure in by hand
//   • cron/econ-news auto-fetch loop — when Claude finds the figure online
//
// Both paths do exactly the same thing once we have a number: update the
// event row, recompute the surprise, rewrite the agent's existing feed post
// with the real print, send a Telegram nudge, bell every subscriber to an
// affected pair, and stamp `figureAnnouncedAt` so a follow-up edit (typo
// fix) doesn't re-alert.

import { prisma } from '@/lib/prisma'
import { classifySurprise, formatPrint, currencyBias, isCommentaryEvent } from '@/lib/econ-calendar'
import { slugsForCurrency, displayForSlug } from '@/lib/market-map'
import { sendTelegramMessage } from '@/lib/telegram'

export interface PublishActualOpts {
  eventId:  string
  /** null means clear (used by admin correction); a number means the print. */
  actual?:   number | null
  forecast?: number | null
  previous?: number | null
  unit?:     string | null
  note?:     string | null
  /** What to record on editedBy. Email for humans, "agent" for auto-fetch. */
  editedBy:  string
}

export interface PublishActualResult {
  ok:        true
  announced: boolean
  notified:  number
  print:     string | null
  eventSummary: {
    id:          string
    actual:      number | null
    forecast:    number | null
    previous:    number | null
    surpriseDir: string | null
  }
}

export async function publishActual(opts: PublishActualOpts): Promise<PublishActualResult> {
  const db = prisma as any
  const now = new Date()

  const existing = await db.economicEvent.findUnique({ where: { id: opts.eventId } })
  if (!existing) throw new Error(`event not found: ${opts.eventId}`)

  const actual   = opts.actual   !== undefined ? opts.actual   : existing.actual
  const forecast = opts.forecast !== undefined ? opts.forecast : existing.forecast
  const previous = opts.previous !== undefined ? opts.previous : existing.previous
  const unit     = opts.unit     !== undefined ? opts.unit     : existing.unit
  const note     = opts.note     !== undefined ? opts.note     : existing.note

  const { surprise, dir } = classifySurprise(actual, forecast)

  const updated = await db.economicEvent.update({
    where: { id: opts.eventId },
    data: {
      actual, forecast, previous, unit, note,
      surprise, surpriseDir: dir,
      releasedAt: actual != null ? (existing.releasedAt ?? now) : null,
      editedBy:   opts.editedBy,
      editedAt:   now,
    },
  })

  // Commentary events publish on a takeaway; numeric events publish on a
  // figure. figureAnnouncedAt gates the outbound alert (Telegram + bell),
  // NOT the feed-post content — a typo correction still needs to update the
  // agent's post so the calendar and feed do not diverge.
  const commentary  = isCommentaryEvent(updated.event, forecast, previous)
  const hasContent  = commentary ? !!note : actual != null

  if (!hasContent) {
    return {
      ok: true, announced: false, notified: 0, print: null,
      eventSummary: { id: opts.eventId, actual, forecast, previous, surpriseDir: dir },
    }
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
    ...(commentary ? [note ?? ''] : [`${print}${dirNote}`, biasLine]),
    ``,
    `Instruments with exposure: ${affected}`,
    ``,
    `First-order read only — how this actually moves price depends on positioning and what was already priced in. Check the pair analysis before trading.`,
  ].join('\n')

  // Always keep the agent's feed post in sync with the DB — the calendar and
  // the feed must not tell different stories about the same release. Create
  // on first publish, update on every subsequent edit.
  const post = await db.post.findUnique({ where: { economicEventId: opts.eventId } })
  if (post) {
    await db.post.update({ where: { id: post.id }, data: { content } })
  } else {
    await db.post.create({
      data: {
        authorType: 'agent', economicEventId: opts.eventId, content,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
    })
  }

  // Outbound announcement (Telegram + bell) fires exactly once per event.
  // Suppressed on corrections so a typo fix does not re-alert users.
  if (existing.figureAnnouncedAt) {
    return {
      ok: true, announced: false, notified: 0, print,
      eventSummary: { id: opts.eventId, actual, forecast, previous, surpriseDir: dir },
    }
  }

  await sendTelegramMessage(
    `📊 <b>${updated.currency} — ${updated.event}</b>\n\n` +
    `<b>${print}</b>${dirNote}\n${biasLine}\n\n` +
    `Instruments with exposure: ${affected}\n` +
    `🔗 https://forexmastery.org/analysis/news`
  ).catch(e => console.error('[publish-actual] telegram failed:', e))

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
    }).catch(e => console.error('[publish-actual] bell failed:', e))
  }

  await db.economicEvent.update({ where: { id: opts.eventId }, data: { figureAnnouncedAt: now } })

  return {
    ok: true, announced: true, notified: subs.length, print,
    eventSummary: { id: opts.eventId, actual, forecast, previous, surpriseDir: dir },
  }
}
