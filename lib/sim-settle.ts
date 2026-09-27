// Settlement pass for a simulated account.
//
// One function, called from every read and before every write, that:
//   1. closes any position whose stop loss or take profit has been reached
//   2. recomputes balance and equity from what is actually on the books
//   3. feeds that equity through the evaluation rules (breach / phase pass)
//
// Centralised deliberately. Equity drives money — pass, fail, and payout
// size all hang off it — so there must be exactly one place that computes
// it, not one implementation per endpoint that can drift apart.

import { prisma } from '@/lib/prisma'
import { getSimPrices } from '@/lib/sim-prices'
import { accountState, positionPnl, hitLevel, type OpenPositionLike } from '@/lib/sim-trading'
import { checkRules, utcDayKey, gbp } from '@/lib/evaluation'
import { alertAdmins } from '@/lib/admin-alert'

export async function settleEquity(evaluationId: string) {
  const db = prisma as any

  const evaluation = await db.evaluation.findUnique({ where: { id: evaluationId } })
  if (!evaluation) throw new Error('evaluation not found')

  const open = await db.simPosition.findMany({
    where: { evaluationId, status: 'open' },
    orderBy: { openedAt: 'desc' },
  })

  // Full instrument list, not just the slugs this account has open — the
  // returned prices double as the live feed for the order ticket, which
  // needs every tradable instrument, not only the ones already in play.
  const prices = await getSimPrices()

  // ── 1. Settle stops and targets ────────────────────────────────────────
  for (const p of open as OpenPositionLike[]) {
    const px = prices[p.slug]
    if (typeof px !== 'number') continue
    const reason = hitLevel(p, px)
    if (!reason) continue

    // Fill AT the level, not at the polled price. The level is where the
    // order would have triggered; the polled price may be far past it
    // simply because we sampled late, and charging the trader for our
    // sampling interval would be wrong.
    const fill = reason === 'stop_loss' ? (p.stopLoss as number) : (p.takeProfit as number)
    await db.simPosition.update({
      where: { id: p.id },
      data: {
        status: 'closed',
        closePrice: fill,
        pnl: positionPnl(p, fill),
        closeReason: reason,
        closedAt: new Date(),
      },
    })
  }

  // ── 2. Recompute from the books ────────────────────────────────────────
  const stillOpen = await db.simPosition.findMany({
    where: { evaluationId, status: 'open' },
    orderBy: { openedAt: 'desc' },
  })
  const closedAgg = await db.simPosition.aggregate({
    where: { evaluationId, status: 'closed' },
    _sum:  { pnl: true },
  })
  const closedPnl = closedAgg._sum.pnl ?? 0

  // On a funded account the starting point is the funded balance, not the
  // evaluation account size.
  const startingBalance = evaluation.status === 'funded'
    ? (evaluation.fundedBalance ?? evaluation.accountSize)
    : evaluation.accountSize

  const account = accountState(startingBalance, closedPnl, stillOpen as OpenPositionLike[], prices)

  // ── 3. Run the evaluation rules on the resulting equity ────────────────
  const today    = utcDayKey()
  const isNewDay = evaluation.dayStartedOn !== today
  const tradingDays    = isNewDay ? evaluation.tradingDays + 1 : evaluation.tradingDays
  const dayStartEquity = isNewDay ? account.equity : (evaluation.dayStartEquity ?? account.equity)
  const peakEquity     = Math.max(evaluation.peakEquity ?? startingBalance, account.equity)
  const isFunded       = evaluation.status === 'funded'

  const verdict = checkRules({
    accountSize:     startingBalance,
    profitTargetPct: isFunded ? Number.MAX_SAFE_INTEGER : evaluation.profitTargetPct,
    peakEquity:      evaluation.peakEquity,
    dayStartEquity,
    maxDrawdownPct:  evaluation.maxDrawdownPct,
    maxDailyLossPct: evaluation.maxDailyLossPct,
    minTradingDays:  evaluation.minTradingDays,
    tradingDays,
  }, account.equity)

  const data: Record<string, unknown> = {
    currentEquity: account.equity,
    peakEquity,
    tradingDays,
    dayStartEquity,
    dayStartedOn: today,
    lastEquityAt: new Date(),
  }

  let advanced = false
  if (verdict.outcome === 'breached') {
    data.status       = 'breached'
    data.breachReason = isFunded ? `Funded account revoked. ${verdict.reason}` : verdict.reason
    data.endedAt      = new Date()
    // A breached account must not keep running positions.
    await db.simPosition.updateMany({
      where: { evaluationId, status: 'open' },
      data:  { status: 'closed', closeReason: 'account_breached', closedAt: new Date() },
    })
  } else if (verdict.outcome === 'passed' && evaluation.status === 'evaluation') {
    if (evaluation.phase === 'phase1') {
      advanced = true
      data.phase           = 'phase2'
      data.profitTargetPct = evaluation.phase2TargetPct
      data.phase1PassedAt  = new Date()
      data.currentEquity   = evaluation.accountSize
      data.peakEquity      = evaluation.accountSize
      data.dayStartEquity  = evaluation.accountSize
      data.dayStartedOn    = null
      data.tradingDays     = 0
      // Fresh account means a clean book — phase 1's trades do not carry.
      await db.simPosition.updateMany({
        where: { evaluationId, status: 'open' },
        data:  { status: 'closed', closeReason: 'phase_complete', closedAt: new Date() },
      })
    } else {
      data.status   = 'passed'
      data.passedAt = new Date()
    }
  }

  await db.evaluation.update({ where: { id: evaluationId }, data })

  // ── Notifications on state change ──────────────────────────────────────
  if (data.status === 'breached' || data.status === 'passed' || advanced) {
    const subject = advanced
      ? '✅ Phase 1 passed — Phase 2 unlocked'
      : data.status === 'passed'
        ? '🎉 Both phases cleared — funded account next'
        : 'Account closed — rule breached'
    const message = advanced
      ? `You cleared Phase 1. Phase 2 starts on a fresh ${gbp(evaluation.accountSize)} account with a +${evaluation.phase2TargetPct}% target, and any open positions were closed.`
      : data.status === 'passed'
        ? `You cleared both phases. We'll set up your funded account shortly on a ${evaluation.profitSplitPct}% profit split.`
        : String(data.breachReason ?? 'Rule breached.')

    void db.adminNotification.create({
      data: { userId: evaluation.userId, subject, message, linkUrl: '/funded' },
    }).catch(() => {})

    if (!advanced) {
      void alertAdmins({
        linkUrl: '/admin',
        subject: data.status === 'passed'
          ? 'Evaluation PASSED — ready to fund'
          : 'Evaluation breached',
        message: `${subject}\n\nEquity ${gbp(account.equity)} over ${tradingDays} trading days.`,
      }).catch(() => {})
    }
  }

  const recentClosed = await db.simPosition.findMany({
    where: { evaluationId, status: 'closed' },
    orderBy: { closedAt: 'desc' },
    take: 20,
  })

  const finalStatus = (data.status as string) ?? evaluation.status
  const finalPhase  = (data.phase  as string) ?? evaluation.phase

  return {
    status: finalStatus,
    phase:  finalPhase,
    prices,
    account,
    // Live P/L attached so the client does not recompute it independently.
    open: (finalStatus === 'breached' ? [] : stillOpen).map((p: any) => ({
      id: p.id, slug: p.slug, display: p.display, side: p.side,
      lots: p.lots, openPrice: p.openPrice,
      stopLoss: p.stopLoss, takeProfit: p.takeProfit,
      openedAt: p.openedAt,
      currentPrice: prices[p.slug] ?? null,
      pnl: typeof prices[p.slug] === 'number' ? positionPnl(p, prices[p.slug]) : null,
    })),
    recentClosed: recentClosed.map((p: any) => ({
      id: p.id, display: p.display, side: p.side, lots: p.lots,
      openPrice: p.openPrice, closePrice: p.closePrice,
      pnl: p.pnl, closeReason: p.closeReason, closedAt: p.closedAt,
    })),
  }
}
