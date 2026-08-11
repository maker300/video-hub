// FM News agent — polls the economic calendar, records scheduled releases, and
// alerts once the actual print lands.
//
// Run every ~5 minutes. Most ticks do nothing: the calendar is upserted and no
// event has newly resolved. The alert fires on the transition from "actual is
// null" to "actual has a value", gated on notifiedAt so a release is announced
// exactly once no matter how often the poller sees it afterwards.
//
// The agent reports the print and which tracked instruments it bears on. It
// does NOT call a direction — how a surprise maps to price depends on
// positioning and what was already priced in, and issuing confident directional
// calls with no measured accuracy behind them is precisely the failure mode the
// FM Trader learner just had to be reset for. Direction stays with the per-pair
// analysis, which is measured.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ACTIVE_PROVIDER, classifySurprise, formatPrint, currencyBias } from '@/lib/econ-calendar'
import { slugsForCurrency, displayForSlug } from '@/lib/market-map'
import { sendTelegramMessage } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

/** Only announce a print this long after its scheduled time — stale data from a
 *  backfilled calendar row shouldn't page anyone. */
const RELEASE_GRACE_MS = 3 * 60 * 60 * 1000  // 3 hours

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')

  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    const { getAdminSession } = await import('@/lib/adminAuth')
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db  = prisma as any
  const now = new Date()

  // ── 1. Pull the calendar window ────────────────────────────────────────────
  // Back a day so a print that landed while we were down is still picked up;
  // forward a week so the feed can show what's coming.
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const to   = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  let events
  try {
    events = await ACTIVE_PROVIDER.fetchWindow(from, to)
  } catch (e) {
    // Includes the "calendar is a paid endpoint" case — surfaced, not swallowed,
    // so a silently dead agent is visible in the logs rather than looking idle.
    console.error(`[econ-news] provider ${ACTIVE_PROVIDER.name} failed:`, e)
    return NextResponse.json(
      { ok: false, provider: ACTIVE_PROVIDER.name, error: String(e) },
      { status: 502 },
    )
  }

  // ── 2. Upsert, and collect the ones that just resolved ─────────────────────
  const newlyReleased: Array<{
    id: string; event: string; currency: string; impact: string
    actual: number | null; forecast: number | null; previous: number | null
    unit: string | null; surpriseDir: string | null; affectedSlugs: string[]
  }> = []

  for (const e of events) {
    const affectedSlugs = slugsForCurrency(e.currency)
    if (affectedSlugs.length === 0) continue  // nothing we cover

    const { surprise, dir } = classifySurprise(e.actual, e.forecast)
    const hasPrint = e.actual != null

    const existing = await db.economicEvent.findUnique({
      where:  { eventKey: e.eventKey },
      select: { id: true, actual: true, notifiedAt: true },
    })

    const data = {
      country:     e.country,
      currency:    e.currency,
      event:       e.event,
      impact:      e.impact,
      scheduledAt: e.scheduledAt,
      actual:      e.actual,
      forecast:    e.forecast,
      previous:    e.previous,
      unit:        e.unit,
      surprise,
      surpriseDir: dir,
      affectedSlugs,
      releasedAt:  hasPrint ? (e.scheduledAt <= now ? e.scheduledAt : now) : null,
    }

    const row = existing
      ? await db.economicEvent.update({ where: { eventKey: e.eventKey }, data })
      : await db.economicEvent.create({ data: { eventKey: e.eventKey, ...data } })

    // Announce when the scheduled time passes, not when a figure appears.
    //
    // The original trigger waited for `actual` to go from null to a value. The
    // current provider never publishes actuals at all — 74 rows, zero carrying
    // the key, including a rate decision four hours past — so that trigger could
    // never fire and the agent stayed silent through every release. Firing on
    // the clock still gives users the thing that matters: this just landed, here
    // is what it touches, here is what was expected. If a provider with actuals
    // is wired in later, the figure is included automatically.
    const isDue        = e.scheduledAt <= now
    const notAnnounced = !existing?.notifiedAt
    const isRecent     = now.getTime() - e.scheduledAt.getTime() < RELEASE_GRACE_MS

    if (isDue && notAnnounced && isRecent) {
      newlyReleased.push({
        id: row.id, event: e.event, currency: e.currency, impact: e.impact,
        actual: e.actual, forecast: e.forecast, previous: e.previous,
        unit: e.unit, surpriseDir: dir, affectedSlugs,
      })
    }
  }

  // ── 3. Announce ────────────────────────────────────────────────────────────
  for (const r of newlyReleased) {
    const hasFigure = r.actual != null
    const print     = hasFigure
      ? formatPrint(r)
      : r.forecast != null
        ? `figure pending — ${r.forecast}${r.unit ?? ''} was expected`
        : 'figure pending'
    const affected  = r.affectedSlugs.map(displayForSlug).join(', ')
    const dirNote  =
      r.surpriseDir === 'hotter' ? ' — above expectations'
      : r.surpriseDir === 'cooler' ? ' — below expectations'
      : r.surpriseDir === 'inline' ? ' — in line with expectations'
      : ''

    // Telegram broadcast
    await sendTelegramMessage(
      `📊 <b>${r.currency} — ${r.event}</b>\n\n` +
      `<b>${print}</b>${dirNote}\n\n` +
      `Instruments with exposure: ${affected}\n` +
      `<i>Exposure only — open the pair analysis for a directional read.</i>\n` +
      `🔗 https://forexmastery.org/analysis/news`
    ).catch(e => console.error('[econ-news] telegram failed:', e))

    // Bell — only users following an affected pair, one notification each even
    // if they follow several of the instruments this release touches.
    const subs = await prisma.pairSubscription.findMany({
      where:  { slug: { in: r.affectedSlugs } },
      select: { userId: true },
      distinct: ['userId'],
    })

    if (subs.length > 0) {
      await prisma.adminNotification.createMany({
        data: subs.map(s => ({
          userId:  s.userId,
          subject: `${r.currency} ${r.event}: ${print}`,
          message: `${r.event} came in at ${print}${dirNote}. Instruments you follow with exposure to ${r.currency}: ${affected}. This is an exposure flag, not a trade call — check the pair analysis for direction.`,
          linkUrl: '/analysis/news',
        })),
      }).catch(e => console.error('[econ-news] bell notify failed:', e))
    }

    // Publish to the community feed. economicEventId is unique, so a release
    // can only ever produce one post no matter how the poller behaves.
    const bias = currencyBias(r.event, r.surpriseDir as any)
    const biasLine = !hasFigure
      ? `Watch ${r.currency} for the reaction — the number is not in our data feed yet.`
      : bias === 'positive' ? `Reads positive for ${r.currency}`
      : bias === 'negative' ? `Reads negative for ${r.currency}`
      : `Neutral for ${r.currency} — in line with expectations`

    await db.post.create({
      data: {
        authorType:      'agent',
        economicEventId: r.id,
        expiresAt:       new Date(Date.now() + 24 * 60 * 60 * 1000),
        content: [
          `${r.currency} — ${r.event}`,
          ``,
          `${print}${dirNote}`,
          biasLine,
          ``,
          `Instruments with exposure: ${affected}`,
          ``,
          `First-order read only — how this actually moves price depends on positioning and what was already priced in. Check the pair analysis before trading.`,
        ].join('\n'),
      },
    }).catch((e: unknown) => console.error('[econ-news] feed post failed:', e))

    await db.economicEvent.update({
      where: { id: r.id },
      data:  { notifiedAt: new Date() },
    })
  }

  // Hard-delete posts past their 24 hours. Runs every tick: the query is
  // indexed on expiresAt and the row count is small, so there is no reason to
  // defer it to a daily job. Comments and likes cascade.
  // Calendar entries live 24 hours past their scheduled time, matching how long
  // the page shows them.
  await db.economicEvent.deleteMany({
    where: { scheduledAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  }).catch((e: unknown) => console.error('[econ-news] event purge failed:', e))

  await db.post.deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch((e: unknown) => console.error('[econ-news] post purge failed:', e))

  return NextResponse.json({
    ok:        true,
    provider:  ACTIVE_PROVIDER.name,
    scanned:   events.length,
    announced: newlyReleased.length,
    events:    newlyReleased.map(r => `${r.currency} ${r.event}`),
  })
}
