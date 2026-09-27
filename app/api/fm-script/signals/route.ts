// EA polling endpoint — returns signals this user's MetaTrader EA has not
// been told about yet.
//
// Auth: `Authorization: Bearer fmk_…` (the user's auto-trade API key).
//
// Contract with the EA:
//   • Poll every 5–15s. This endpoint is cheap and idempotent.
//   • Every signal returned is billed 1 token at dispatch time and recorded
//     in AutoTradeDispatch, so the same signal is never returned twice to
//     the same user — even if the EA crashes before acting on it.
//   • An empty `signals` array is the normal, common response.
//   • `serverTime` lets the EA detect clock skew against its own terminal.
//
// Scope: ONLY scheduled-scan signals (SignalAlert) are dispatched. A user's
// own ad-hoc FM Trader runs (FMPrediction) are deliberately excluded so no
// one's private analysis can be fired into someone else's account.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateEA } from '@/lib/auto-trade'
import { debitTokens } from '@/lib/tokens'

export const dynamic = 'force-dynamic'

// How fresh a signal must be to still be worth executing. A macro setup that
// printed 90 minutes ago has usually moved past its entry zone; firing it
// then is worse than not firing at all.
const FRESH_WINDOW_MS = 55 * 60 * 1000

// Never hand the EA a huge batch — if the poller was offline for hours we
// want the most recent few, not a stampede of stale orders.
const MAX_PER_POLL = 3

export async function GET(req: Request) {
  const user = await authenticateEA(req)
  if (!user) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  const now = new Date()
  const base = {
    serverTime:    now.toISOString(),
    pollSeconds:   10,
    maxRiskPct:    user.maxRiskPct,
    maxConcurrent: user.maxConcurrent,
  }

  // Paused states return 200 with an empty list plus a reason, so the EA can
  // surface "paused" in its chart comment instead of looking broken.
  if (!user.enabled)   return NextResponse.json({ ...base, signals: [], paused: 'auto_trade_disabled' })
  if (user.killSwitch) return NextResponse.json({ ...base, signals: [], paused: 'kill_switch_on' })
  if (user.tokenBalance < 1) {
    return NextResponse.json({ ...base, signals: [], paused: 'no_tokens' })
  }

  const db = prisma as any

  const candidates = await db.signalAlert.findMany({
    where:   { sentAt: { gte: new Date(now.getTime() - FRESH_WINDOW_MS) } },
    orderBy: { sentAt: 'desc' },
    take:    20,
  })

  // Already-dispatched filter — one indexed read instead of N.
  const alreadyIds = new Set<string>(
    (await db.autoTradeDispatch.findMany({
      where:  { userId: user.id, signalAlertId: { in: candidates.map((c: any) => c.id) } },
      select: { signalAlertId: true },
    })).map((r: any) => r.signalAlertId)
  )

  const eligible = candidates.filter((c: any) => {
    if (alreadyIds.has(c.id)) return false
    if (c.decision !== 'BUY' && c.decision !== 'SELL') return false
    if ((c.confidence ?? 0) < user.minConfidence) return false
    if (user.allowedSlugs.length > 0 && !user.allowedSlugs.includes(c.slug)) return false

    // Never dispatch a signal without real levels. runAnalysis returns
    // zeroed levels by design and the scanner has to fill them in; if that
    // ever regresses we must not hand an EA a stop loss of 0, which on a
    // live account means an unprotected position. Drop it silently and let
    // the scan-side logging surface the problem.
    const levelsOk =
      Number.isFinite(c.stopLoss) && c.stopLoss > 0 &&
      Number.isFinite(c.tp1)      && c.tp1      > 0 &&
      Number.isFinite(c.entryLow) && c.entryLow > 0 &&
      Number.isFinite(c.entryHigh)&& c.entryHigh> 0
    if (!levelsOk) {
      console.error(`[fm-script] refusing to dispatch ${c.slug} ${c.decision} — zero/invalid levels on SignalAlert ${c.id}`)
      return false
    }
    return true
  }).slice(0, MAX_PER_POLL)

  const dispatched: unknown[] = []

  for (const c of eligible) {
    // Bill first. If the balance ran out mid-loop we stop cleanly rather
    // than handing out signals we haven't charged for.
    const remaining = await debitTokens(user.id, 1, 'auto_trade_dispatch', c.id)
    if (remaining === null) break

    try {
      await db.autoTradeDispatch.create({
        data: {
          userId:        user.id,
          signalAlertId: c.id,
          slug:          c.slug,
          display:       c.display,
          decision:      c.decision,
          confidence:    c.confidence ?? 0,
          entryLow:      c.entryLow,
          entryHigh:     c.entryHigh,
          stopLoss:      c.stopLoss,
          tp1:           c.tp1,
        },
      })
    } catch {
      // Unique violation = another poll from the same EA won the race. The
      // token was already debited for that dispatch row, so don't re-add.
      continue
    }

    dispatched.push({
      dispatchId: c.id,          // EA echoes this back on /ack
      slug:       c.slug,
      display:    c.display,
      decision:   c.decision,
      confidence: c.confidence ?? 0,
      entryLow:   c.entryLow,
      entryHigh:  c.entryHigh,
      stopLoss:   c.stopLoss,
      tp1:        c.tp1,
      rrRatio:    c.rrRatio ?? null,
      sentAt:     c.sentAt,
    })
  }

  return NextResponse.json({ ...base, signals: dispatched })
}
