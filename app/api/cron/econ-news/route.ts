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
import { ACTIVE_PROVIDER, classifySurprise, formatPrint, currencyBias, isCommentaryEvent } from '@/lib/econ-calendar'
import { slugsForCurrency, displayForSlug } from '@/lib/market-map'
import { sendTelegramMessage } from '@/lib/telegram'
import { alertAdmins } from '@/lib/admin-alert'

export const dynamic = 'force-dynamic'

/**
 * How late an event may still be announced.
 *
 * Guards against a backfilled calendar row paging everyone about something from
 * last week. Widened from 3 to 8 hours because 3 was tight enough that an
 * outage would silently skip releases — the cron was disabled for 26 consecutive
 * executions once already, and a window shorter than a working day means those
 * hours are simply lost rather than caught up on the next successful run.
 */
const RELEASE_GRACE_MS = 8 * 60 * 60 * 1000

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

    const existing = await db.economicEvent.findUnique({
      where:  { eventKey: e.eventKey },
      select: { id: true, actual: true, notifiedAt: true, releasedAt: true },
    })

    // Preserve a user-filed actual when the provider does not have one.
    //
    // The current calendar provider (ForexFactory scrape) publishes the
    // schedule but never publishes actuals — so a bare `actual: e.actual`
    // would wipe every manual filing on the next ~5-min sync. That is what
    // silently blanked out the July 2026 US CPI figures right after they
    // were entered. The ?? chain means: provider value wins if it has one
    // (so a real feed with actuals still supersedes user data), otherwise
    // keep what was previously stored.
    const finalActual         = e.actual ?? existing?.actual ?? null
    const { surprise, dir }   = classifySurprise(finalActual, e.forecast)
    const finalReleasedAt     = finalActual != null
      ? (existing?.releasedAt ?? (e.scheduledAt <= now ? e.scheduledAt : now))
      : null

    const data = {
      country:     e.country,
      currency:    e.currency,
      event:       e.event,
      impact:      e.impact,
      scheduledAt: e.scheduledAt,
      actual:      finalActual,
      forecast:    e.forecast,
      previous:    e.previous,
      unit:        e.unit,
      surprise,
      surpriseDir: dir,
      affectedSlugs,
      releasedAt:  finalReleasedAt,
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
    const isCommentary = isCommentaryEvent(r.event, r.forecast, r.previous)
    const print     = hasFigure
      ? formatPrint(r)
      : isCommentary
      ? 'Commentary event — watch the tone rather than a number'
      : r.forecast != null
        ? `figure pending — ${r.forecast}${r.unit ?? ''} was expected`
        : 'figure pending'
    const affected  = r.affectedSlugs.map(displayForSlug).join(', ')
    const dirNote  =
      r.surpriseDir === 'hotter' ? ' — above expectations'
      : r.surpriseDir === 'cooler' ? ' — below expectations'
      : r.surpriseDir === 'inline' ? ' — in line with expectations'
      : ''

    // Public Telegram + subscriber bell — only when there is real content to
    // broadcast (a numeric print, or a commentary event whose signal is the
    // tone itself). When a numeric release comes in without a figure yet, the
    // auto-fetch loop below will publish the alert as soon as Claude finds
    // the number — sending a "figure pending" broadcast first just spams
    // subscribers with a placeholder that the real alert supersedes minutes
    // later. Admin still gets the nudge (alertAdmins below) so a fetch that
    // fails does not go unnoticed.
    if (hasFigure || isCommentary) {
      await sendTelegramMessage(
        `📊 <b>${r.currency} — ${r.event}</b>\n\n` +
        `<b>${print}</b>${dirNote}\n\n` +
        `Instruments with exposure: ${affected}\n` +
        `<i>Exposure only — open the pair analysis for a directional read.</i>\n` +
        `🔗 https://forexmastery.org/analysis/news`
      ).catch(e => console.error('[econ-news] telegram failed:', e))

      // Bell — only users following an affected pair, one notification each
      // even if they follow several of the instruments this release touches.
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
    }

    // Publish to the community feed. economicEventId is unique, so a release
    // can only ever produce one post no matter how the poller behaves.
    const bias = currencyBias(r.event, r.surpriseDir as any)
    const biasLine = isCommentary
      ? `No figure attached to this one — ${r.currency} moves on what is said.`
      : !hasFigure
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

    // Nudge an admin to type the figure in. The free calendar feed carries a
    // schedule but no actuals, so a release only becomes useful once someone
    // enters the number — and it is worth nothing an hour later. Only fires
    // when the figure is genuinely missing, so a paid feed would silence it.
    // Only chase a number that can actually exist. A press conference has no
    // figure and never will, so nudging for one is noise.
    if (!hasFigure && !isCommentaryEvent(r.event, r.forecast, r.previous)) {
      await alertAdmins({
        linkUrl: '/admin/calendar',
        subject: `Enter the figure — ${r.currency} ${r.event}`,
        message: `${r.currency} ${r.event} has just released and no figure is in the data feed. Enter the actual to publish it to the feed and alert everyone following ${affected}.`,
        telegramHtml:
          `⏱ <b>Figure needed — ${r.currency} ${r.event}</b>\n\n` +
          `Just released${r.forecast != null ? `, ${r.forecast}${r.unit ?? ''} expected` : ''}.\n` +
          `Nothing will publish until the actual is entered.\n\n` +
          `Exposure: ${affected}\n` +
          `🔗 https://forexmastery.org/admin/calendar`,
      }).catch(e => console.error('[econ-news] admin nudge failed:', e))
    }

    await db.economicEvent.update({
      where: { id: r.id },
      data:  { notifiedAt: new Date() },
    })
  }

  // ── 4. Claude auto-fetch — find missing actuals via web search ───────────
  //
  // Runs on every cron tick. Any release that has just landed and does not
  // yet have a figure is a candidate — Claude searches reputable financial
  // sources for the print and applies it through the same publishActual
  // pipeline the manual entry uses.
  //
  // Chase only the FRESH window. A CPI number is market-moving in the first
  // half hour; after that, alerting people to it is noise. Anything older
  // than FETCH_GRACE_MS is left for a human to backfill if it matters.
  //
  // Guarded to prevent runaway cost / bad data:
  //   • Only if actual is still null AND figureAnnouncedAt is null (no
  //     retry after the figure is already published)
  //   • Only if the event actually has an expected figure (numeric release,
  //     not a speech/press conference)
  //   • At most MAX_SEARCH_ATTEMPTS per event
  //   • At least SEARCH_INTERVAL_MS between attempts on the same event
  //   • Only apply the actual when Claude reports 'high' confidence
  //   • At most FETCH_BUDGET events fetched per tick to keep the cron
  //     within its function-time budget on a burst of simultaneous releases
  const FETCH_GRACE_MS      = 30 * 60 * 1000   // 30 min after release
  const MAX_SEARCH_ATTEMPTS = 5
  const SEARCH_INTERVAL_MS  = 5  * 60 * 1000   // 5 min — one attempt per cron tick
  const FETCH_BUDGET        = 6                // per cron tick — clusters happen at :00 / :30
  const searchCutoff        = new Date(now.getTime() - SEARCH_INTERVAL_MS)
  const releaseFloor        = new Date(now.getTime() - FETCH_GRACE_MS)

  const searchCandidates = await db.economicEvent.findMany({
    where: {
      actual:            null,
      figureAnnouncedAt: null,
      scheduledAt:       { lte: now, gte: releaseFloor },
      searchAttempts:    { lt: MAX_SEARCH_ATTEMPTS },
      OR: [
        { actualsSearchedAt: null },
        { actualsSearchedAt: { lt: searchCutoff } },
      ],
    },
    orderBy: { scheduledAt: 'asc' },
    take:    FETCH_BUDGET,
  })

  const fetched: Array<{ event: string; currency: string; applied: boolean; confidence?: string; actual?: number | null }> = []
  let creditLowSeen = false   // set on the first credit-low error, alerts once at end of loop
  // Admin kill switch — perfFlags.newsAutoFetch. When off, the cron still
  // runs (announces releases, purges old rows) but skips every Claude call
  // so no credits are consumed.
  const { getPerfFlags } = await import('@/lib/perf-flags')
  const perfFlags = await getPerfFlags()
  if (searchCandidates.length > 0 && perfFlags.newsAutoFetch) {
    const { fetchActualsFromWeb } = await import('@/lib/fetch-actuals')
    const { publishActual }       = await import('@/lib/publish-actual')

    for (const ev of searchCandidates) {
      // Skip commentary — there is no number to find. A press conference's
      // signal is the tone in the transcript, not a print, and that stays a
      // human read.
      if (isCommentaryEvent(ev.event, ev.forecast, ev.previous)) continue

      // Stamp the last-attempt timestamp BEFORE the call so concurrent cron
      // ticks throttle correctly. searchAttempts is bumped AFTER the call
      // only if we got a real response back — a Claude billing/rate-limit
      // failure returns null here and we don't want a temporary API outage
      // to burn through the whole 5-attempt budget. When the outage clears,
      // the event resumes retries on the next cron tick.
      await db.economicEvent.update({
        where: { id: ev.id },
        data:  { actualsSearchedAt: now },
      })

      const { result, errorKind } = await fetchActualsFromWeb({
        currency:    ev.currency,
        event:       ev.event,
        scheduledAt: ev.scheduledAt,
        forecast:    ev.forecast,
        previous:    ev.previous,
        unit:        ev.unit,
      })

      // No response at all (Claude API failure — billing, rate limit, timeout).
      // Leave searchAttempts unchanged so the event can retry next tick.
      if (result === null) {
        console.warn(`[econ-news:fetch] ${ev.currency} ${ev.event} → Claude call returned null (errorKind=${errorKind})`)
        fetched.push({ event: ev.event, currency: ev.currency, applied: false, confidence: `error:${errorKind}`, actual: null })
        // Depleted credits blocks EVERY event in this tick — stop the loop
        // and surface it to admin so they can top up. Continuing wastes CPU
        // on calls that will all 400.
        if (errorKind === 'credit_low') {
          creditLowSeen = true
          break
        }
        continue
      }

      // Got a real response — count it against the attempt budget whether
      // it found the number or not (a low-confidence miss is still a used
      // credit and repeatedly re-asking is unlikely to change the answer).
      await db.economicEvent.update({
        where: { id: ev.id },
        data:  { searchAttempts: { increment: 1 } },
      })

      const entry = { event: ev.event, currency: ev.currency, applied: false, confidence: result.confidence, actual: result.actual }
      fetched.push(entry)

      if (result.actual === null || result.confidence !== 'high') {
        console.log(`[econ-news:fetch] ${ev.currency} ${ev.event} → no confident actual (conf=${result.confidence}, actual=${result.actual ?? 'null'}, source=${result.source})`)
        continue
      }

      try {
        await publishActual({
          eventId:  ev.id,
          actual:   result.actual,
          editedBy: `agent:web-search (${result.source})`.slice(0, 200),
        })
        entry.applied = true
        console.log(`[econ-news:fetch] ${ev.currency} ${ev.event} → applied ${result.actual} (source: ${result.source})`)
      } catch (err) {
        console.error(`[econ-news:fetch] publishActual failed for ${ev.id}:`, err)
      }
    }

    // Alert admin once when the Anthropic balance is depleted. Throttled to
    // one alert per 6 hours so a persistent zero-balance state doesn't spam
    // the bell every cron tick. Auto-fetch has been silent-broken for a
    // day at a time waiting for someone to notice — this closes that gap.
    if (creditLowSeen) {
      const setting = await db.adminSetting.findUnique({ where: { key: 'anthropic_credit_alert_at' } })
      const lastAlert = setting?.value ? new Date(setting.value as string).getTime() : 0
      const SIX_HOURS = 6 * 60 * 60 * 1000
      if (Date.now() - lastAlert > SIX_HOURS) {
        await alertAdmins({
          linkUrl: 'https://console.anthropic.com/settings/billing',
          subject: 'Anthropic credits depleted — calendar auto-fetch is silent',
          message: `The FM News auto-fetch is failing on every call because the Anthropic account balance is too low. Calendar releases are being posted without their actual figures. Top up at https://console.anthropic.com/settings/billing to resume auto-fetch on the next cron tick.`,
          telegramHtml:
            `🚨 <b>Anthropic credits depleted</b>\n\n` +
            `The FM News auto-fetch is failing on every call.\n` +
            `Calendar releases posting without figures.\n\n` +
            `🔗 https://console.anthropic.com/settings/billing`,
        }).catch(e => console.error('[econ-news] credit alert failed:', e))
        await db.adminSetting.upsert({
          where:  { key: 'anthropic_credit_alert_at' },
          create: { key: 'anthropic_credit_alert_at', value: new Date().toISOString() },
          update: { value: new Date().toISOString() },
        }).catch(() => {})
      }
    }
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
    fetched,
  })
}
