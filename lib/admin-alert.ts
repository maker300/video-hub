// Cash-movement alerts to admin — bell + Telegram.
//
// Bell: writes an AdminNotification row for every DB-backed admin user so it
//       lands in the navbar bell on next /api/notifications/all poll.
// Telegram: single message to the admin chat (TELEGRAM_CHAT_ID env).
//
// Used by deposit + withdrawal flows. Fire-and-forget at call sites —
// failures log but never block the trade lifecycle.
import { prisma } from '@/lib/prisma'
import { sendTelegramMessage } from '@/lib/telegram'

export interface AdminAlertOpts {
  subject:       string
  message:       string
  telegramHtml?: string   // optional richer telegram body — falls back to message
  linkUrl?:      string   // optional deep-link target for the bell row
}

export async function alertAdmins(opts: AdminAlertOpts): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where:  { role: 'admin' },
      select: { id: true },
    })
    if (admins.length > 0) {
      await prisma.adminNotification.createMany({
        data: admins.map(a => ({
          userId:  a.id,
          subject: opts.subject,
          message: opts.message,
          linkUrl: opts.linkUrl,
        })),
        skipDuplicates: true,
      }).catch(err => console.error('[admin-alert] bell failed:', err))
    }

    // Telegram — same channel as broker / FM Trader alerts
    await sendTelegramMessage(opts.telegramHtml ?? `<b>${opts.subject}</b>\n\n${opts.message}`).catch(err =>
      console.error('[admin-alert] telegram failed:', err),
    )
  } catch (err) {
    console.error('[admin-alert] fatal:', err)
  }
}
