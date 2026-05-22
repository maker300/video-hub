// Admin-only: approve, reject, or retry a trade
// On approve/retry: marks status → 'approved', sends Telegram notification
// Actual MT4 execution is handled by the EA polling /api/broker/pending
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { sendTelegramMessage } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { tradeId, action } = await req.json() as { tradeId: string; action: 'approve' | 'reject' | 'retry' | 'cancel' }

  const trade = await prisma.brokerTrade.findUnique({ where: { id: tradeId } })
  if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 })

  // ── Cancel in-flight trade — stops EA from picking it up again ───────────
  if (action === 'cancel') {
    if (!['approved', 'executing', 'failed'].includes(trade.status)) {
      return NextResponse.json({ error: 'Only in-flight or failed trades can be cancelled' }, { status: 409 })
    }
    await prisma.brokerTrade.update({
      where: { id: tradeId },
      data:  { status: 'rejected', rejectedAt: new Date() },
    })
    return NextResponse.json({ status: 'cancelled' })
  }

  // ── Retry failed trade — re-queue for EA without expiry check ────────────
  if (action === 'retry') {
    if (trade.status !== 'failed') {
      return NextResponse.json({ error: 'Only failed trades can be retried' }, { status: 409 })
    }
    await prisma.brokerTrade.update({
      where: { id: tradeId },
      data:  { status: 'approved', approvedAt: new Date() },
    })
    return NextResponse.json({ status: 'approved' })
  }

  if (trade.status !== 'pending') {
    return NextResponse.json({ error: `Trade is already ${trade.status}` }, { status: 409 })
  }

  if (new Date() > trade.expiresAt) {
    await prisma.brokerTrade.update({ where: { id: tradeId }, data: { status: 'expired' } })
    return NextResponse.json({ error: 'Approval window expired' }, { status: 410 })
  }

  // ── Reject ────────────────────────────────────────────────────────────────
  if (action === 'reject') {
    await prisma.brokerTrade.update({
      where: { id: tradeId },
      data:  { status: 'rejected', rejectedAt: new Date() },
    })
    return NextResponse.json({ status: 'rejected' })
  }

  // ── Approve → notify Telegram, EA will execute ────────────────────────────
  await prisma.brokerTrade.update({
    where: { id: tradeId },
    data:  { status: 'approved', approvedAt: new Date() },
  })

  const dir   = trade.decision === 'BUY' ? '📈' : '📉'
  const entry = ((trade.entryLow + trade.entryHigh) / 2).toFixed(5)

  await sendTelegramMessage(
    `🤖 <b>FM Trader — Trade Approved ✅</b>\n\n` +
    `${dir} <b>${trade.decision} ${trade.display}</b>\n` +
    `💡 Confidence: ${trade.confidence}%\n\n` +
    `📍 Entry: ${trade.entryLow.toFixed(5)} – ${trade.entryHigh.toFixed(5)}\n` +
    `🛡 Stop Loss: ${trade.stopLoss.toFixed(5)}\n` +
    `🎯 TP1: ${trade.tp1.toFixed(5)}\n` +
    `🎯 TP2: ${trade.tp2.toFixed(5)}\n` +
    `🎯 TP3: ${trade.tp3.toFixed(5)}\n` +
    `📐 R/R: ${trade.rrRatio}\n` +
    `📦 Lots: ${trade.lotSize.toFixed(2)}\n\n` +
    `⏳ Sending to MT4 EA for execution...`
  )

  return NextResponse.json({ status: 'approved', entry })
}
