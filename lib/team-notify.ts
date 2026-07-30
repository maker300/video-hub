// Team-user notifications for Live Trade lifecycle events.
//   * Bell: AdminNotification row per team user (navbar reads /api/notifications/all)
//   * Email: optional — only the initial 'sent to live trade' event emails;
//            subsequent (entry set / closed) are bell-only to avoid inbox spam
import { prisma } from '@/lib/prisma'
import { sendBulkEmail } from '@/lib/email'
import { buildBroadcastEmail, buildBroadcastText } from '@/lib/email-templates'

export interface TeamNotifyOpts {
  subject:  string
  message:  string
  email?:   boolean   // default false — bell only
  linkUrl?: string    // optional deep-link target for the bell row
  /**
   * User ids to omit from the broadcast (both bell and email). Live Trade
   * close paths pass the set of position holders here so they aren't
   * double-notified — they already got a targeted per-position bell with
   * their own P/L.
   */
  skipUserIds?: Set<string> | string[]
}

/**
 * Send a Live Trade notification to every team user (and admins, since they
 * also see the bell). Bell delivery is always on; email is opt-in.
 *
 * Fire-and-forget at the call site is fine — errors are logged but won't
 * surface to the caller (notifications must never block trade lifecycle).
 */
export async function notifyTeamUsers(opts: TeamNotifyOpts): Promise<void> {
  try {
    const recipients = await prisma.user.findMany({
      where:  { role: { in: ['team', 'admin'] } },
      select: { id: true, name: true, email: true },
    })
    if (recipients.length === 0) return

    // Skip participants who already got a targeted per-position notification
    const skip = new Set(Array.isArray(opts.skipUserIds) ? opts.skipUserIds : opts.skipUserIds ?? [])
    const nonParticipants = recipients.filter(u => !skip.has(u.id))
    if (nonParticipants.length === 0) return

    // Bell notifications — always
    await prisma.adminNotification.createMany({
      data: nonParticipants.map(u => ({
        userId:  u.id,
        subject: opts.subject,
        message: opts.message,
        linkUrl: opts.linkUrl,
      })),
      skipDuplicates: true,
    }).catch(err => console.error('[team-notify] bell failed:', err))

    // Email — only on the first event (admin sends trade to live)
    if (opts.email && process.env.RESEND_API_KEY) {
      // Filter out the env-based admin (no real email) — only deliver to real
      // inboxes. The internal admin email exists for FK integrity, not delivery.
      const emailRecipients = nonParticipants.filter(r => !r.email.endsWith('@forexmastery.internal'))
      if (emailRecipients.length > 0) {
        await sendBulkEmail(
          emailRecipients,
          opts.subject,
          (name) => buildBroadcastEmail(name, opts.subject, opts.message),
          (name) => buildBroadcastText(name, opts.message),
        ).catch(err => console.error('[team-notify] email failed:', err))
      }
    }
  } catch (err) {
    console.error('[team-notify] fatal:', err)
  }
}
