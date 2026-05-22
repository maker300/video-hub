// Admin-only: auto-detect chat ID from recent updates and send a test Telegram alert
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function POST() {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token) {
    return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN is not set in Vercel environment variables.' }, { status: 400 })
  }

  // If no TELEGRAM_CHAT_ID, try to detect it from recent updates
  let targetChatId = chatId
  if (!targetChatId) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=10`)
      const d = await r.json() as { ok: boolean; result?: Array<{ message?: { chat: { id: number }; from?: { first_name: string } } }> }
      if (!d.ok || !d.result?.length) {
        return NextResponse.json({
          error: 'Could not detect your chat ID. Send any message to your bot on Telegram first, then try again.',
        }, { status: 404 })
      }
      const msgs = d.result.filter(u => u.message)
      if (!msgs.length) {
        return NextResponse.json({
          error: 'No messages found. Open Telegram, search for your bot, and send it any message first.',
        }, { status: 404 })
      }
      targetChatId = String(msgs[msgs.length - 1].message!.chat.id)
    } catch {
      return NextResponse.json({ error: 'Failed to reach Telegram API.' }, { status: 500 })
    }
  }

  // Send the test message
  const text =
    `✅ <b>FM Trader — Test Alert</b>\n\n` +
    `Your Telegram notifications are working!\n\n` +
    `📡 <b>What you'll receive automatically:</b>\n` +
    `• Hourly scans of 10 major pairs (Mon–Fri, 06:00–21:00 UTC)\n` +
    `• Only signals with Confidence > 65% and Confluence > 60%\n` +
    `• Top 5 setups per scan, no repeat alerts within 3 hours\n\n` +
    `📈 <b>Example signal format:</b>\n` +
    `1️⃣ BUY EUR/USD\n` +
    `• Confidence: 74% · Confluence: 78%\n` +
    `• Entry: 1.08500 – 1.08750\n` +
    `• SL: 1.08100 · TP1: 1.09200 · R/R 1:2.8\n\n` +
    `<i>Chat ID used: ${targetChatId}${!chatId ? ' (auto-detected — add TELEGRAM_CHAT_ID=' + targetChatId + ' to Vercel env vars)' : ''}</i>`

  try {
    const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: targetChatId, text, parse_mode: 'HTML' }),
    })
    const sendData = await sendRes.json() as { ok: boolean; description?: string }
    if (!sendData.ok) {
      return NextResponse.json({ error: `Telegram error: ${sendData.description}` }, { status: 400 })
    }
    return NextResponse.json({
      sent:     true,
      chatId:   targetChatId,
      autoDetected: !chatId,
      instructions: !chatId
        ? `Add TELEGRAM_CHAT_ID=${targetChatId} to your Vercel environment variables and redeploy to make this permanent.`
        : 'Notification sent successfully.',
    })
  } catch {
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 })
  }
}
