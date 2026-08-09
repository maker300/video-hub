// Resend transactional email sender.
// Resend has significantly better Gmail inbox placement than Brevo's shared IPs.
//
// ⚠ Always build the HTML with a template from lib/email-templates.ts. Do not
// hand-write markup for a send, however one-off it seems.
//
// Those templates deliberately avoid centered tables, branded header bars, card
// shadows, large CTA buttons and footers, because Gmail reads that combination
// as a mailing list and files it under Promotions. A broadcast sent on
// 2026-08-09 bypassed them with hand-rolled HTML carrying all five, and landed
// in Promotions for every recipient — the templates were fine, the caller was
// not. Broadcasts go through buildBroadcastEmail (see app/api/admin/notify).

const RESEND_API = 'https://api.resend.com/emails'

export interface EmailPayload {
  to:       { email: string; name?: string }[]
  subject:  string
  html:     string
  text?:    string
  replyTo?: string
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — email not sent. Subject:', payload.subject)
    return
  }

  const fromEmail = process.env.EMAIL_FROM_ADDRESS ?? 'team@forexmastery.org'
  const fromName  = process.env.EMAIL_FROM_NAME    ?? 'Forex Mastery'

  const body: Record<string, unknown> = {
    from:    `${fromName} <${fromEmail}>`,
    to:      payload.to.map(r => r.name ? `${r.name} <${r.email}>` : r.email),
    subject: payload.subject,
    html:    payload.html,
    text:    payload.text,
  }

  if (payload.replyTo) {
    body.reply_to = payload.replyTo
  }

  const res = await fetch(RESEND_API, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Resend API ${res.status}: ${err}`)
  }
}

// Send to many recipients independently (bulk broadcast).
// Returns { sent, failed, errors } so callers can surface partial failures.
export async function sendBulkEmail(
  recipients: { email: string; name?: string | null }[],
  subject: string,
  buildHtml: (name: string | null, email: string) => string,
  buildText?: (name: string | null) => string,
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = await Promise.allSettled(
    recipients.map(r =>
      sendEmail({
        to:   [{ email: r.email, name: r.name ?? undefined }],
        subject,
        html: buildHtml(r.name ?? null, r.email),
        text: buildText?.(r.name ?? null),
      })
    )
  )
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => String(r.reason))

  if (errors.length) console.error('[email] sendBulkEmail failures:', errors)

  return {
    sent:   results.filter(r => r.status === 'fulfilled').length,
    failed: errors.length,
    errors,
  }
}
