import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import YahooFinance from 'yahoo-finance2'
import { SLUG_TO_SYMBOL } from '@/app/api/market-data/[symbol]/route'
import { learnFromOutcome, type MarketSnapshot } from '@/lib/rule-engine-learner'
import { sendBulkEmail } from '@/lib/email'
import { buildTradeUpdateEmail, buildTradeUpdateText } from '@/lib/email-templates'
import { sendTelegramMessage } from '@/lib/telegram'

// This route is called by a cron job (or on each FM Trader load) to resolve
// pending predictions. It fetches the latest price for each pending pair and
// checks if TP1, TP2, TP3 or Stop Loss has been hit.
//
// It also runs a full DB housekeeping pass to keep storage lean:
//   • FMPrediction  — delete resolved/expired records older than 30 days
//   • PageView      — delete records older than 30 days (analytics only needs 30 days)
//   • BrokerTrade   — delete records older than 5 hours (runs every tick, not just midnight)
//   • SignalAlert   — delete records older than 5 hours (runs every tick, not just midnight)
//   • Session       — delete expired NextAuth sessions
//   • VerificationToken — delete expired email verification tokens
//   • PasswordResetToken — delete expired password reset tokens
//
// Vercel Cron: add to vercel.json —
//   { "crons": [{ "path": "/api/fm-trader/check-outcomes", "schedule": "*/15 * * * *" }] }

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] })

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: Request) {
  // Allow cron or internal calls only — guard with a secret in prod
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET ?? 'dev'
  if (authHeader !== `Bearer ${cronSecret}`) {
    // Also allow same-origin (no auth header from our own server calls)
    const host = req.headers.get('host') ?? ''
    if (!host.includes('localhost') && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const now             = new Date()
  const utcHour         = now.getUTCHours()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const fiveHoursAgo  = new Date(now.getTime() -  5 * 60 * 60 * 1000)

  // ── 1. Expire predictions past their validity window ─────────────────────
  // Fetch first so we can create outcome notifications, then update.
  const newlyExpired = await prisma.fMPrediction.findMany({
    where:  { outcome: 'pending', expiresAt: { lt: now } },
    select: { id: true, userId: true, slug: true, display: true, decision: true, priceAtCall: true },
  })
  if (newlyExpired.length > 0) {
    await prisma.fMPrediction.updateMany({
      where: { id: { in: newlyExpired.map(p => p.id) } },
      data:  { outcome: 'expired', outcomeAt: now },
    })
    for (const p of newlyExpired) {
      // Bell notification — silent expiry is confusing; the user should know
      // their prediction timed out without hitting TP or SL.
      await prisma.tradeUpdate.create({
        data: {
          predictionId: p.id,
          userId:       p.userId,
          slug:         p.slug,
          display:      p.display,
          type:         'expired',
          message:      `${p.decision} ${p.display} prediction expired without reaching TP or SL. The validity window has passed — re-run FM Trader if you still want to trade this pair.`,
          currentPrice: p.priceAtCall,
        },
      }).catch(() => { /* unique constraint dupe — ignore */ })
    }
  }

  // ── 2. DB housekeeping — runs once per day (at UTC midnight) only ─────────
  // Running these deletes on every cron tick wastes CPU — the rows eligible
  // for deletion don't accumulate faster than once per hour at most.
  // Skipping on non-midnight runs costs nothing: the rows stay a few hours
  // longer but get cleaned at midnight regardless.
  const runHousekeeping = utcHour === 0
  const [
    predDeleted, pageViewDeleted, tradeDeleted, signalDeleted,
    sessDeleted, verifyDeleted, resetDeleted, ticketDeleted, accessDeleted,
  ] = runHousekeeping ? await Promise.allSettled([
    // FMPrediction: keep 30 days so users can review their full history
    // TradeUpdate records are cascade-deleted with their parent FMPrediction,
    // but also explicitly purge any orphaned/old ones here
    prisma.fMPrediction.deleteMany({
      where: { outcome: { not: 'pending' }, createdAt: { lt: thirtyDaysAgo } },
    }).then(async r => {
      await prisma.tradeUpdate.deleteMany({ where: { createdAt: { lt: thirtyDaysAgo } } }).catch(() => {})
      return r
    }),
    // PageView: analytics only needs 30 days; older rows are pure waste
    prisma.pageView.deleteMany({
      where: { createdAt: { lt: thirtyDaysAgo } },
    }),
    prisma.brokerTrade.deleteMany({ where: { createdAt: { lt: new Date(0) } } }), // placeholder — real cleanup runs every tick below
    prisma.signalAlert.deleteMany({ where: { sentAt: { lt: thirtyDaysAgo } } }), // belt-and-suspenders; main cleanup runs every tick below
    // Session (NextAuth): expired sessions are never re-used — safe to purge
    prisma.session.deleteMany({
      where: { expires: { lt: now } },
    }),
    // VerificationToken: expired tokens cannot be used — remove them
    prisma.verificationToken.deleteMany({
      where: { expires: { lt: now } },
    }),
    // PasswordResetToken: expired reset links are dead weight
    prisma.passwordResetToken.deleteMany({
      where: { expires: { lt: now } },
    }),
    // SupportTicket: purge resolved tickets older than 30 days
    prisma.supportTicket.deleteMany({
      where: { status: 'resolved', resolvedAt: { lt: thirtyDaysAgo } },
    }),
    // AnalysisAccess: remove inactive expired access records older than 30 days
    prisma.analysisAccess.deleteMany({
      where: { active: false, endDate: { lt: thirtyDaysAgo } },
    }),
    // lastSeenAt: clear presence data older than 30 days — admin sees full visit history
    prisma.user.updateMany({
      where: { lastSeenAt: { lt: thirtyDaysAgo } },
      data:  { lastSeenAt: null },
    }),
  ]) : Array(9).fill({ status: 'fulfilled', value: { count: 0 } }) as PromiseSettledResult<{ count: number }>[]

  // Rolling cleanup — runs on every tick so records disappear within an hour of
  // turning 5 hours old, regardless of when midnight housekeeping fires.
  await Promise.all([
    prisma.signalAlert.deleteMany({ where: { sentAt:    { lt: fiveHoursAgo } } }),
    prisma.brokerTrade.deleteMany({ where: { createdAt: { lt: fiveHoursAgo } } }),
  ])

  // ── 3. Fetch all pending non-expired predictions (with trade advisory updates) ─
  const pending = await prisma.fMPrediction.findMany({
    where:   { outcome: 'pending', expiresAt: { gte: now } },
    orderBy: { createdAt: 'asc' },
    include: { tradeUpdates: { orderBy: { createdAt: 'desc' } } },
  })

  if (pending.length === 0) {
    return NextResponse.json({
      checked: 0, resolved: 0,
      housekeeping: {
        predictionsDeleted: predDeleted.status    === 'fulfilled' ? predDeleted.value.count    : 0,
        pageViewsDeleted:   pageViewDeleted.status === 'fulfilled' ? pageViewDeleted.value.count : 0,
        tradesDeleted:      tradeDeleted.status   === 'fulfilled' ? tradeDeleted.value.count   : 0,
        signalsDeleted:     signalDeleted.status  === 'fulfilled' ? signalDeleted.value.count  : 0,
        sessionsDeleted:    sessDeleted.status    === 'fulfilled' ? sessDeleted.value.count    : 0,
        tokensDeleted:      (verifyDeleted.status === 'fulfilled' ? verifyDeleted.value.count  : 0) +
                            (resetDeleted.status  === 'fulfilled' ? resetDeleted.value.count   : 0),
        ticketsDeleted:     ticketDeleted.status  === 'fulfilled' ? ticketDeleted.value.count  : 0,
        accessDeleted:      accessDeleted.status  === 'fulfilled' ? accessDeleted.value.count  : 0,
      },
    })
  }

  // Group by slug — one Yahoo quote per unique pair
  const slugSet = [...new Set(pending.map(p => p.slug))]

  const prices: Record<string, number> = {}
  await Promise.allSettled(
    slugSet.map(async slug => {
      const sym = SLUG_TO_SYMBOL[slug]
      if (!sym) return
      try {
        const q = await yf.quote(sym, {}, { validateResult: false }) as Record<string, unknown>
        const p = typeof q.regularMarketPrice === 'number' ? q.regularMarketPrice : 0
        if (p > 0) prices[slug] = p
      } catch { /* skip */ }
    })
  )

  // ── 4. Check each pending prediction against current price ────────────────
  let resolved = 0
  const updates: Promise<unknown>[] = []

  for (const pred of pending) {
    const price = prices[pred.slug]
    if (!price) continue

    const isBuy = pred.decision === 'BUY'
    let outcome: string | null = null

    // Determine effective SL level and outcome label based on any trade advisories.
    // trail_sl fired → user locked profit near TP1; if price drops back, count as tp1_hit.
    // move_sl_breakeven fired → user moved SL to entry; if price drops back, count as expired.
    // No advisory → original SL, outcome = sl_hit.
    const trailUpdate = pred.tradeUpdates.find(u => u.type === 'trail_sl')
    const beUpdate    = pred.tradeUpdates.find(u => u.type === 'move_sl_breakeven')
    let effectiveSL: number
    let slOutcome: string
    if (trailUpdate?.suggestedSL != null) {
      effectiveSL = trailUpdate.suggestedSL
      slOutcome   = 'tp1_hit'   // trailed stop exits with profit
    } else if (beUpdate?.suggestedSL != null) {
      effectiveSL = beUpdate.suggestedSL
      slOutcome   = 'expired'   // break-even exit, no win no loss
    } else {
      effectiveSL = pred.stopLoss
      slOutcome   = 'sl_hit'
    }

    if (isBuy) {
      if (price <= effectiveSL)   outcome = slOutcome
      else if (price >= pred.tp3) outcome = 'tp3_hit'
      else if (price >= pred.tp2) outcome = 'tp2_hit'
      else if (price >= pred.tp1) outcome = 'tp1_hit'
    } else {
      // SELL
      if (price >= effectiveSL)   outcome = slOutcome
      else if (price <= pred.tp3) outcome = 'tp3_hit'
      else if (price <= pred.tp2) outcome = 'tp2_hit'
      else if (price <= pred.tp1) outcome = 'tp1_hit'
    }

    if (outcome) {
      resolved++
      updates.push(
        prisma.fMPrediction.update({
          where: { id: pred.id },
          data:  { outcome, outcomeAt: now, priceAtOutcome: price },
        })
      )

      // ── Bell notification: tell the user their trade closed ─────────────
      // The bell already shows mid-trade advisories; now the conclusion shows too.
      // @@unique([predictionId, userId, type]) prevents duplicates if cron re-runs.
      const dec = price >= 100 ? 2 : price >= 1 ? 4 : 5
      const fmt = (n: number) => n.toFixed(dec)
      const outcomeMessage =
          outcome === 'tp3_hit'  ? `${pred.decision} ${pred.display} hit TP3 (${fmt(pred.tp3)}) — full target reached at price ${fmt(price)}. Maximum reward captured.`
        : outcome === 'tp2_hit' ? `${pred.decision} ${pred.display} hit TP2 (${fmt(pred.tp2)}) at price ${fmt(price)}. Trail stop loss aggressively and let TP3 run if structure supports it.`
        : outcome === 'tp1_hit' ? `${pred.decision} ${pred.display} hit TP1 (${fmt(pred.tp1)}) at price ${fmt(price)}. ${trailUpdate ? 'Trailed stop locked in profit.' : beUpdate ? 'Break-even stop exited the trade flat — no loss.' : 'Move stop loss to break-even and let the remainder run.'}`
        : outcome === 'sl_hit'  ? `${pred.decision} ${pred.display} hit Stop Loss (${fmt(pred.stopLoss)}) at price ${fmt(price)}. Trade closed at planned risk — review setup quality before re-entering.`
        : null
      if (outcomeMessage) {
        updates.push(
          prisma.tradeUpdate.create({
            data: {
              predictionId: pred.id,
              userId:       pred.userId,
              slug:         pred.slug,
              display:      pred.display,
              type:         outcome,                // 'tp1_hit' | 'tp2_hit' | 'tp3_hit' | 'sl_hit'
              message:      outcomeMessage,
              currentPrice: price,
            },
          }).catch(() => null) as Promise<unknown>   // unique-constraint duplicates are fine
        )
      }

      // ── Learning agent: feed this resolved outcome back into the rule weights ──
      // outcome score: +1 = any TP hit (win), -1 = SL hit (loss), 0 = expired
      const snapshot = pred.marketSnapshot as MarketSnapshot | null
      if (snapshot?.features) {
        // Graded outcome: bigger TP hit = stronger win signal for the learner
      const outcomeVal = outcome === 'sl_hit'  ? -1.0
          : outcome === 'tp3_hit' ? +1.5
          : outcome === 'tp2_hit' ? +1.0
          : outcome === 'tp1_hit' ? +0.5
          : 0
        // Fire-and-forget — never block outcome resolution on learning.
        // Learner is binned by horizon so swing outcomes don't pollute intraday weights.
        const predHorizon = (pred.tradeHorizon === 'swing' ? 'swing' : 'intraday') as 'intraday' | 'swing'
        learnFromOutcome(snapshot.features, outcomeVal, predHorizon).catch(e =>
          console.error('[rule-learner] learnFromOutcome failed:', e)
        )
      }
    }
  }

  await Promise.allSettled(updates)

  // ── 4b. Auto-close LiveTrades when matching FM Trader prediction hits TP1 or SL ─
  // When any FMPrediction resolves with outcome 'tp1_hit' (win) or 'sl_hit'
  // (loss), mirror that to any OPEN LiveTrade on the same slug + decision and
  // settle every position at the actual hit price.
  //
  //   tp1_hit → close at pred.tp1 → positive PnL%
  //   sl_hit  → close at pred.stopLoss → negative PnL%
  //
  // TP2/TP3 are stretch goals admins typically scale out of manually so they
  // do NOT auto-close — only TP1 (win lock) and SL (risk lock) trigger.
  for (const pred of pending) {
    const newOutcomePred = await prisma.fMPrediction.findUnique({
      where:  { id: pred.id },
      select: { outcome: true },
    })
    const isTp1 = newOutcomePred?.outcome === 'tp1_hit'
    const isSl  = newOutcomePred?.outcome === 'sl_hit'
    if (!isTp1 && !isSl) continue

    const matches = await prisma.liveTrade.findMany({
      where: {
        slug:     pred.slug,
        decision: pred.decision,
        status:   'open',                       // must already have entry set
      },
      include: { positions: { where: { status: 'open' } } },
    })
    for (const lt of matches) {
      const entry = lt.entryPrice
      if (!entry || entry <= 0) continue
      const closeAt = isTp1 ? pred.tp1 : pred.stopLoss
      const reason  = isTp1 ? 'TP1' : 'SL'
      const pnlPct = lt.decision === 'BUY'
        ? (closeAt - entry) / entry
        : (entry - closeAt) / entry

      try {
        await prisma.$transaction(async tx => {
          for (const pos of lt.positions) {
            const pnlBtc = pos.amountBtc * pnlPct
            await tx.user.update({
              where: { id: pos.userId },
              data:  { teamBalanceBtc: { increment: pos.amountBtc + pnlBtc } },
            })
            await tx.liveTradePosition.update({
              where: { id: pos.id },
              data:  { status: 'closed', pnlBtc, closedAt: new Date() },
            })
          }
          await tx.liveTrade.update({
            where: { id: lt.id },
            data:  {
              closePrice: closeAt,
              pnlPct,
              status:     'closed',
              closedAt:   new Date(),
              note:       `Auto-closed when ${pred.display} ${pred.decision} hit ${reason} (${closeAt})`,
            },
          })
        })
        // Fire-and-forget bell notification (mirrors the admin close path)
        try {
          const { notifyTeamUsers } = await import('@/lib/team-notify')
          const pct  = (pnlPct * 100).toFixed(2)
          const sign = pnlPct > 0 ? '+' : ''
          void notifyTeamUsers({
            email:   false,
            subject: `${lt.decision} ${lt.display} auto-closed at ${reason} (${sign}${pct}%)`,
            message: `The underlying FM Trader signal for ${lt.display} hit ${reason} (${closeAt}). The live trade was auto-closed and all positions settled. Outcome: ${sign}${pct}%. Open the Live Trade page to see your updated balance.`,
          })
        } catch (notifyErr) {
          console.error('[check-outcomes] live-trade notify failed:', notifyErr)
        }
      } catch (e) {
        console.error('[check-outcomes] live-trade auto-close failed:', e)
      }
    }
  }

  // ── 5. Trade monitoring advisories for still-pending predictions ─────────────
  // For each pending prediction that was NOT just resolved, check price position
  // and emit advisories: cancel (urgent), move SL to breakeven, trail SL to profit.
  const stillPending = pending.filter(p => {
    const price = prices[p.slug]
    if (!price) return false
    const isBuy = p.decision === 'BUY'
    // Skip if just resolved (TP/SL hit)
    if (isBuy) {
      if (price <= p.stopLoss || price >= p.tp1) return false
    } else {
      if (price >= p.stopLoss || price <= p.tp1) return false
    }
    return true
  })

  for (const pred of stillPending) {
    const price  = prices[pred.slug]!
    const isBuy  = pred.decision === 'BUY'
    const entry  = (pred.entryLow + pred.entryHigh) / 2
    const dec    = price >= 100 ? 2 : price >= 1 ? 4 : 5
    const fmt    = (n: number) => n.toFixed(dec)

    // Distances
    const slDist   = Math.abs(entry - pred.stopLoss)      // entry → SL
    const tp1Dist  = Math.abs(pred.tp1 - entry)           // entry → TP1

    // -- RULE: Cancel advisory --
    // Price has moved adversely past the entry zone AND is within 35% of the SL distance from entry
    let cancelAdvice = false
    if (isBuy) {
      const distFromEntry = entry - price   // positive = price below entry
      cancelAdvice = price < pred.entryLow && distFromEntry >= slDist * 0.65
    } else {
      const distFromEntry = price - entry
      cancelAdvice = price > pred.entryHigh && distFromEntry >= slDist * 0.65
    }

    // -- RULE: Move SL to break even --
    // Price has moved ≥ 50% of the way from entry to TP1 in the right direction
    let breakEvenAdvice = false
    const suggestedBE = entry  // break even = entry midpoint
    if (isBuy) {
      breakEvenAdvice = price >= entry + tp1Dist * 0.5 && price < pred.tp1
    } else {
      breakEvenAdvice = price <= entry - tp1Dist * 0.5 && price > pred.tp1
    }

    // -- RULE: Trail SL into profit --
    // Price has passed TP1 — suggest trailing above/below TP1 to lock in profit
    let trailAdvice = false
    const suggestedTrail = isBuy ? pred.tp1 - slDist * 0.2 : pred.tp1 + slDist * 0.2
    if (isBuy) {
      trailAdvice = price >= pred.tp1 * 1.001  // slightly past TP1
    } else {
      trailAdvice = price <= pred.tp1 * 0.999
    }

    const advisories: { type: string; message: string; suggestedSL?: number; urgent: boolean }[] = []

    if (cancelAdvice) advisories.push({
      type:    'cancel',
      message: `Price (${fmt(price)}) has moved adversely against your ${pred.decision} ${pred.display} trade and is approaching your stop loss. Consider closing the position to protect your capital.`,
      urgent:  true,
    })
    if (breakEvenAdvice && !cancelAdvice) advisories.push({
      type:       'move_sl_breakeven',
      message:    `Price (${fmt(price)}) has moved ${Math.round(((isBuy ? price - entry : entry - price) / tp1Dist) * 100)}% toward TP1. Consider moving your stop loss to break even at ${fmt(suggestedBE)} to protect the trade.`,
      suggestedSL: suggestedBE,
      urgent:     false,
    })
    if (trailAdvice && !cancelAdvice) advisories.push({
      type:       'trail_sl',
      message:    `Price (${fmt(price)}) has reached TP1 on your ${pred.decision} ${pred.display} trade. Consider trailing your stop loss to ${fmt(suggestedTrail)} to lock in profit as the trade continues.`,
      suggestedSL: suggestedTrail,
      urgent:     false,
    })

    if (advisories.length === 0) continue

    // Find the user who owns this prediction
    const owner = await prisma.user.findUnique({
      where:  { id: pred.userId },
      select: { id: true, name: true, email: true, role: true },
    })
    if (!owner) continue

    for (const adv of advisories) {
      // Upsert — unique constraint prevents duplicate advisories
      let created = false
      try {
        await prisma.tradeUpdate.create({
          data: {
            predictionId: pred.id,
            userId:       owner.id,
            slug:         pred.slug,
            display:      pred.display,
            type:         adv.type,
            message:      adv.message,
            currentPrice: price,
            suggestedSL:  adv.suggestedSL ?? null,
          },
        })
        created = true
      } catch {
        // Already sent this advisory for this prediction — skip
      }
      if (!created) continue

      // Send email for cancel advisories (urgent)
      if (adv.urgent) {
        const subject = `⚠️ Trade Advisory — ${pred.decision} ${pred.display}`
        await sendBulkEmail(
          [owner],
          subject,
          (name) => buildTradeUpdateEmail(name, { display: pred.display, decision: pred.decision, type: adv.type, message: adv.message, currentPrice: price, suggestedSL: adv.suggestedSL }),
          (name) => buildTradeUpdateText(name, { display: pred.display, decision: pred.decision, type: adv.type, message: adv.message, currentPrice: price, suggestedSL: adv.suggestedSL }),
        ).catch(err => console.error('[check-outcomes] trade advisory email error:', err))

        // Telegram for admin
        if (owner.role === 'admin') {
          const icon = pred.decision === 'BUY' ? '📈' : '📉'
          await sendTelegramMessage(
            `⚠️ <b>Trade Cancel Advisory — ${pred.decision} ${pred.display}</b>\n\n${icon} ${adv.message}\n\n🔗 /analysis/${pred.slug}`
          ).catch(() => {})
        }
      }
    }
  }

  return NextResponse.json({
    checked: pending.length,
    resolved,
    slugsChecked: slugSet,
    housekeeping: {
      predictionsDeleted: predDeleted.status    === 'fulfilled' ? predDeleted.value.count    : 0,
      pageViewsDeleted:   pageViewDeleted.status === 'fulfilled' ? pageViewDeleted.value.count : 0,
      sessionsDeleted:    sessDeleted.status    === 'fulfilled' ? sessDeleted.value.count    : 0,
      tokensDeleted:      (verifyDeleted.status === 'fulfilled' ? verifyDeleted.value.count  : 0) +
                          (resetDeleted.status  === 'fulfilled' ? resetDeleted.value.count   : 0),
      ticketsDeleted:     ticketDeleted.status  === 'fulfilled' ? ticketDeleted.value.count  : 0,
      accessDeleted:      accessDeleted.status  === 'fulfilled' ? accessDeleted.value.count  : 0,
    },
  })
}
