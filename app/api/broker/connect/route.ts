// Admin-only: test Telegram bot connection + get chat ID
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

// GET — verify bot token, return bot info and env var status
export async function GET() {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const token  = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  const eaKey  = process.env.EA_API_KEY
  const balance = process.env.BROKER_BALANCE_USD

  if (!token) {
    return NextResponse.json({
      connected: false,
      error: 'TELEGRAM_BOT_TOKEN not set in Vercel environment variables',
      chatIdSet: !!chatId,
      eaKeySet:  !!eaKey,
      balanceSet: !!balance,
    })
  }

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getMe`)
    const d = await r.json() as { ok: boolean; result?: { first_name: string; username: string }; description?: string }
    if (!d.ok) {
      return NextResponse.json({ connected: false, error: d.description ?? 'Invalid bot token', chatIdSet: !!chatId, eaKeySet: !!eaKey, balanceSet: !!balance })
    }
    return NextResponse.json({
      connected:   true,
      botName:     d.result!.first_name,
      botUsername: d.result!.username,
      chatIdSet:   !!chatId,
      eaKeySet:    !!eaKey,
      balanceSet:  !!balance,
      balance:     balance ? parseFloat(balance) : null,
    })
  } catch {
    return NextResponse.json({ connected: false, error: 'Failed to reach Telegram API', chatIdSet: !!chatId, eaKeySet: !!eaKey, balanceSet: !!balance })
  }
}

// POST — call getUpdates to detect the admin's Telegram chat ID
// Admin must send any message to the bot first, then click "Get My Chat ID"
export async function POST() {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 400 })

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=5`)
    const d = await r.json() as { ok: boolean; result?: Array<{ message?: { chat: { id: number }; from?: { first_name: string } } }>; description?: string }

    if (!d.ok) return NextResponse.json({ error: d.description ?? 'Failed to get updates' }, { status: 400 })

    const messages = (d.result ?? []).filter(u => u.message)
    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages found. Send any message to your bot first, then click Get Chat ID again.' },
        { status: 404 },
      )
    }

    const latest = messages[messages.length - 1]
    const chatId = String(latest.message!.chat.id)
    const from   = latest.message!.from?.first_name ?? 'Unknown'

    return NextResponse.json({
      chatId,
      from,
      instructions: `Add TELEGRAM_CHAT_ID=${chatId} to your Vercel environment variables and redeploy.`,
    })
  } catch {
    return NextResponse.json({ error: 'Request to Telegram failed' }, { status: 500 })
  }
}
