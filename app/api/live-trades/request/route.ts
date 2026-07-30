// Team-member-initiated trade request.
//
// Flow:
//   1. Team user clicks Buy/Sell on FM Trader popup
//   2. Modal asks for stake amount + leverage (default 1:10)
//   3. We create a LiveTrade with status='awaiting_approval' and:
//        - requestedByUserId = caller's id
//        - requestedAmountBtc = their stake
//        - leverage = their choice
//   4. The user's stake + slippage is debited from teamBalanceBtc immediately
//   5. Admin gets a Telegram + bell alert linking to the Live Trade page
//   6. Admin approves/rejects from the Live Trade page (admin route handles that)
//
// Schema: existing LiveTrade table, with new requestedByUserId / requestedAmountBtc cols.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionInfo } from '@/lib/adminAuth'
import { slippagePctFor, PERFORMANCE_FEE_PCT } from '@/lib/slippage'
import { alertAdmins } from '@/lib/admin-alert'

export const dynamic = 'force-dynamic'

const ALLOWED_LEVERAGE = [2, 5, 10, 30, 50, 100, 200]

export async function POST(req: Request) {
  const session = await getSessionInfo()
  if (!session.id || (session.role !== 'team' && session.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden — team membership required' }, { status: 403 })
  }

  const body = await req.json() as {
    slug:       string
    display:    string
    decision:   'BUY' | 'SELL'
    entryLow:   number
    entryHigh:  number
    stopLoss:   number
    tp1:        number
    tp2:        number
    tp3:        number
    rrRatio:    string
    confidence: number
    setupGrade?:    string
    predictionId?:  string
    note?:          string
    amountBtc:      number
    leverage?:      number | null   // null = spot / 1×
  }

  if (!body.slug || !body.display || !body.decision || !body.stopLoss || !body.tp1) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (body.decision !== 'BUY' && body.decision !== 'SELL') {
    return NextResponse.json({ error: 'Decision must be BUY or SELL' }, { status: 400 })
  }

  const amount = Number(body.amountBtc)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Stake amount must be positive' }, { status: 400 })
  }

  const leverage =
    typeof body.leverage === 'number' && ALLOWED_LEVERAGE.includes(body.leverage)
      ? body.leverage
      : null   // null = spot / 1×

  const slippagePct = slippagePctFor(body.slug)
  const lev         = leverage ?? 1
  const slippageBtc = amount * slippagePct * lev
  const totalDebit  = amount + slippageBtc

  // Atomic: balance check + debit + create trade
  let trade: { id: string } | null = null
  try {
    trade = await prisma.$transaction(async tx => {
      const user = await tx.user.findUnique({
        where:  { id: session.id! },
        select: { teamBalanceBtc: true, name: true, email: true },
      })
      if (!user) throw new Error('USER_NOT_FOUND')
      if (user.teamBalanceBtc < totalDebit) throw new Error('INSUFFICIENT_BALANCE')

      const created = await tx.liveTrade.create({
        data: {
          slug:        body.slug,
          display:     body.display,
          decision:    body.decision,
          entryLow:    body.entryLow,
          entryHigh:   body.entryHigh,
          stopLoss:    body.stopLoss,
          tp1:         body.tp1,
          tp2:         body.tp2,
          tp3:         body.tp3,
          rrRatio:     body.rrRatio,
          confidence:  body.confidence,
          setupGrade:  body.setupGrade,
          predictionId: body.predictionId,
          note:        body.note,
          // Team-initiated metadata
          status:             'awaiting_approval',
          requestedByUserId:  session.id!,
          requestedAmountBtc: amount,
          leverage,
          slippagePct,
          feePct:             PERFORMANCE_FEE_PCT,
        },
        select: { id: true },
      })

      // Reserve the stake — debit balance immediately so the user can't
      // double-spend it on another trade while admin reviews.
      await tx.user.update({
        where: { id: session.id! },
        data:  { teamBalanceBtc: { decrement: totalDebit } },
      })

      return created
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'INSUFFICIENT_BALANCE') {
      return NextResponse.json({
        error: `Insufficient BTC balance — need ${totalDebit.toFixed(8)} (stake ${amount} + slippage ${slippageBtc.toFixed(8)})`,
      }, { status: 400 })
    }
    if (msg === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    console.error('[live-trades/request]', e)
    return NextResponse.json({ error: 'Failed to create trade request' }, { status: 500 })
  }

  // Fire-and-forget admin alert (Telegram + bell)
  const lvLabel = leverage ? `1:${leverage}` : 'spot'
  void alertAdmins({
    subject: `Trade request · ${body.decision} ${body.display} (${lvLabel})`,
    message: `A team member has requested a ${body.decision} on ${body.display}, ${lvLabel}, ${amount} BTC stake. Review on the Live Trade page and approve or reject.`,
    linkUrl: '/analysis/live-trades?tab=admin',
    telegramHtml: `<b>📥 Trade request</b>\n${body.decision} <b>${body.display}</b> · ${lvLabel} · <code>${amount}</code> BTC\nEntry zone: <code>${body.entryLow}</code>–<code>${body.entryHigh}</code>\nSL: <code>${body.stopLoss}</code> · TP1: <code>${body.tp1}</code>\n<a href="https://forexmastery.org/analysis/live-trades?tab=admin">Open Live Trade →</a>`,
  })

  return NextResponse.json({ ok: true, tradeId: trade.id })
}
