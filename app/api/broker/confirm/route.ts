// EA-only: confirms a trade has been executed (or failed) in MT4
// Body: { tradeId, orderId, fillPrice }
// orderId = "-1" signals execution failure → reverts to 'approved' for retry
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTelegramMessage } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

function checkEaKey(req: Request): boolean {
  const expected = process.env.EA_API_KEY
  if (!expected) return false
  return req.headers.get('x-ea-key') === expected
}

export async function POST(req: Request) {
  if (!checkEaKey(req)) return new Response('Unauthorized', { status: 401 })

  const { tradeId, orderId, fillPrice } = await req.json() as {
    tradeId:   string
    orderId:   string
    fillPrice: number
  }

  const trade = await prisma.brokerTrade.findUnique({ where: { id: tradeId } })
  if (!trade) return NextResponse.json({ error: 'Trade not found' }, { status: 404 })

  // orderId of "-1" = MT4 OrderSend failed → mark as 'failed' so EA stops retrying
  // One alert is sent; admin can manually retry from the panel
  if (orderId === '-1' || parseInt(orderId) < 0) {
    await prisma.brokerTrade.update({
      where: { id: tradeId },
      data:  { status: 'failed' },
    })

    await sendTelegramMessage(
      `⚠️ <b>FM Trader — Execution Failed</b>\n\n` +
      `${trade.decision} ${trade.display} could not be placed by the MT4 EA.\n` +
      `Check your MT4 terminal — tap below to retry from the admin panel.\n` +
      `🔗 forexmastery.org/admin/broker`
    )

    return NextResponse.json({ status: 'failed' })
  }

  await prisma.brokerTrade.update({
    where: { id: tradeId },
    data:  {
      status:        'executed',
      executedAt:    new Date(),
      brokerOrderId: orderId,
      executedPrice: fillPrice,
    },
  })

  await sendTelegramMessage(
    `✅ <b>FM Trader — Trade Executed</b>\n\n` +
    `${trade.decision === 'BUY' ? '📈' : '📉'} <b>${trade.decision} ${trade.display}</b>\n` +
    `🎫 MT4 Order #${orderId}\n` +
    `💰 Fill price: ${fillPrice.toFixed(5)}\n` +
    `📦 Lots: ${trade.lotSize.toFixed(2)}\n` +
    `🛡 SL: ${trade.stopLoss.toFixed(5)} | 🎯 TP1: ${trade.tp1.toFixed(5)}`
  )

  return NextResponse.json({ status: 'executed', orderId, fillPrice })
}
