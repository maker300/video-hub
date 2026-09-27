// Equity heartbeat from the member's MT5 terminal.
//
// The EA already authenticates with the user's auto-trade key, so it reports
// account equity on the same credential. Every report runs the evaluation
// rules: breach checks first, then the pass check.
//
// Why the server decides, not the EA: the EA runs on the member's machine
// and its inputs are entirely under their control. Pass/fail has money
// attached, so the judgement has to happen somewhere they cannot edit.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateEA } from '@/lib/auto-trade'
import {
  checkRules, utcDayKey, gbp,
} from '@/lib/evaluation'
import { alertAdmins } from '@/lib/admin-alert'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const user = await authenticateEA(req)
  if (!user) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { equity?: number; balance?: number }
  // Equity arrives from MT5 as a decimal currency amount; store pence.
  const equityRaw = typeof body.equity === 'number' && Number.isFinite(body.equity) ? body.equity : null
  if (equityRaw === null || equityRaw < 0) {
    return NextResponse.json({ error: 'A non-negative numeric equity is required.' }, { status: 400 })
  }
  const equity = Math.round(equityRaw * 100)

  const db = prisma as any
  const evaluation = await db.evaluation.findFirst({
    where:   { userId: user.id, status: { in: ['evaluation', 'funded'] } },
    orderBy: { startedAt: 'desc' },
  })
  if (!evaluation) {
    return NextResponse.json({ ok: true, tracked: false, reason: 'no active evaluation' })
  }

  const today = utcDayKey()
  const isNewDay = evaluation.dayStartedOn !== today

  // A "trading day" is any UTC day on which the terminal reported in. That
  // is a deliberately generous reading of the min-trading-days rule — we are
  // testing consistency, not punishing someone for a quiet session.
  const tradingDays = isNewDay ? evaluation.tradingDays + 1 : evaluation.tradingDays

  // Start-of-day equity anchors the daily-loss rule and resets each UTC day.
  const dayStartEquity = isNewDay ? equity : (evaluation.dayStartEquity ?? equity)
  const peakEquity     = Math.max(evaluation.peakEquity ?? evaluation.accountSize, equity)

  const isFunded = evaluation.status === 'funded'
  const verdict = checkRules({
    // On a funded account the yardstick is the funded balance, not the
    // original evaluation size, and the profit target no longer applies —
    // an unreachable target keeps checkRules from ever returning 'passed'.
    accountSize:     isFunded ? (evaluation.fundedBalance ?? evaluation.accountSize) : evaluation.accountSize,
    profitTargetPct: isFunded ? Number.MAX_SAFE_INTEGER : evaluation.profitTargetPct,
    peakEquity:      evaluation.peakEquity,
    dayStartEquity,
    maxDrawdownPct:  evaluation.maxDrawdownPct,
    maxDailyLossPct: evaluation.maxDailyLossPct,
    minTradingDays:  evaluation.minTradingDays,
    tradingDays,
  }, equity)

  const data: Record<string, unknown> = {
    currentEquity: equity,
    peakEquity,
    tradingDays,
    dayStartEquity,
    dayStartedOn:  today,
    lastEquityAt:  new Date(),
  }

  if (verdict.outcome === 'breached') {
    // Applies to both stages. During evaluation it ends the challenge;
    // on a funded account it revokes the account and stops further risk
    // to firm capital.
    data.status       = 'breached'
    data.breachReason = evaluation.status === 'funded'
      ? `Funded account revoked. ${verdict.reason}`
      : verdict.reason
    data.endedAt      = new Date()
  } else if (verdict.outcome === 'passed' && evaluation.status === 'evaluation') {
    if (evaluation.phase === 'phase1') {
      // Cleared phase 1 — advance to phase 2 on a FRESH account. Equity,
      // peak and the daily anchor all reset to the starting balance so
      // phase 2 is a clean run, not a continuation of phase 1's cushion.
      data.phase           = 'phase2'
      data.profitTargetPct = evaluation.phase2TargetPct
      data.phase1PassedAt  = new Date()
      data.currentEquity   = evaluation.accountSize
      data.peakEquity      = evaluation.accountSize
      data.dayStartEquity  = evaluation.accountSize
      data.dayStartedOn    = null
      data.tradingDays     = 0
    } else {
      // Cleared phase 2 — ready to be funded.
      data.status   = 'passed'
      data.passedAt = new Date()
    }
  }

  await db.evaluation.update({ where: { id: evaluation.id }, data })

  // Tell the member, and tell admin — a pass means someone has to fund an
  // account, and a breach on a FUNDED account means real capital was lost.
  if (data.phase === 'phase2') {
    // Phase 1 cleared — tell them, and make clear the account resets.
    void db.adminNotification.create({
      data: {
        userId:  user.id,
        subject: '✅ Phase 1 passed — Phase 2 unlocked',
        message: `You cleared Phase 1. Phase 2 starts on a fresh ${gbp(evaluation.accountSize)} account with a +${evaluation.phase2TargetPct}% target. Your equity has been reset to the starting balance.`,
        linkUrl: '/funded',
      },
    }).catch(() => {})
  }

  if (data.status === 'passed' || data.status === 'breached') {
    const passed = data.status === 'passed'
    void db.adminNotification.create({
      data: {
        userId:  user.id,
        subject: passed
          ? '🎉 Evaluation passed — funded account next'
          : 'Evaluation ended — rule breached',
        message: passed
          ? `You cleared both phases. We'll be in touch shortly to set up your funded account on a ${evaluation.profitSplitPct}% profit split.`
          : verdict.outcome === 'breached' ? verdict.reason : 'Rule breached.',
        linkUrl: '/funded',
      },
    }).catch(() => {})

    void alertAdmins({
      linkUrl: '/admin',
      subject: passed
        ? `Evaluation PASSED — ${user.email}`
        : `Evaluation breached — ${user.email}`,
      message: passed
        ? `${user.email} cleared BOTH phases with equity ${gbp(equity)}. Issue their funded account.`
        : `${user.email} breached: ${verdict.outcome === 'breached' ? verdict.reason : ''}`,
    }).catch(() => {})
  }

  return NextResponse.json({
    ok:      true,
    tracked: true,
    status:  (data.status as string) ?? evaluation.status,
    phase:   (data.phase as string) ?? evaluation.phase,
    equity,
    peakEquity,
    tradingDays,
  })
}
