// Shared HTML email templates — minimal personal-email style.
// Gmail classifies newsletter layouts (centered tables, gradient bars, card shadows,
// big CTA buttons, footer disclaimers) as Promotions. All of that is removed here.
// The goal is an email that looks like it came from a person, not a mailing list.

const BASE_URL = process.env.NEXTAUTH_URL ?? 'https://forexmastery.org'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── Shared wrapper ─────────────────────────────────────────────────────────────
// White background, no outer table, no card, no logo bar, no gradient.
// Just a readable content block that looks like a personal email.

function wrap(preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111827">

  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#ffffff;line-height:1px;mso-hide:all">
    ${escapeHtml(preheader)}&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;&#847;
  </div>

  <div style="max-width:540px;margin:0 auto;padding:40px 24px 32px">

    ${body}

  </div>
</body>
</html>`
}

// ── Password reset email ───────────────────────────────────────────────────────

export function buildPasswordResetEmail(name: string | null, resetUrl: string): string {
  const firstName = name ? escapeHtml(name.split(' ')[0]) : null

  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;letter-spacing:-0.2px">
      Reset your password
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6">
      ${firstName ? `Hey ${firstName} —` : 'Hey —'} no worries, it happens to everyone.
    </p>

    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7">
      We received a request to reset the password on your account.
      Click the link below to choose a new one — it's valid for <strong>1 hour</strong>.
    </p>

    <p style="margin:0 0 24px">
      <a href="${resetUrl}"
         style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:7px;font-size:15px;font-weight:600">
        Set new password
      </a>
    </p>

    <p style="margin:0 0 12px;font-size:13px;color:#9ca3af;line-height:1.6">
      Button not working? Copy this link into your browser:<br/>
      <a href="${resetUrl}" style="color:#059669;font-size:12px;word-break:break-all">${resetUrl}</a>
    </p>

    <p style="margin:0 0 0;font-size:13px;color:#9ca3af;line-height:1.6">
      If you didn't request this, you can ignore this email — your password will not change.
    </p>

    <p style="margin:28px 0 0;font-size:15px;color:#374151">— The Forex Mastery Team</p>
  `

  return wrap('Reset your Forex Mastery password — link expires in 1 hour', body)
}

// ── Admin broadcast email ──────────────────────────────────────────────────────

export function buildBroadcastEmail(name: string | null, subject: string, message: string): string {
  const firstName   = name ? escapeHtml(name.split(' ')[0]) : null
  const safeMessage = escapeHtml(message)
    .replace(/\n\n/g, '</p><p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7">')
    .replace(/\n/g, '<br/>')

  const body = `
    <h2 style="margin:0 0 24px;font-size:20px;font-weight:700;color:#111827;letter-spacing:-0.2px;line-height:1.35">
      ${escapeHtml(subject)}
    </h2>

    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7">
      ${firstName ? `Hey ${firstName},` : 'Hey there,'}
    </p>

    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7">${safeMessage}</p>

    <p style="margin:24px 0 0;font-size:15px;color:#374151;line-height:1.7">
      <a href="${BASE_URL}" style="color:#059669;font-weight:600;text-decoration:none">forexmastery.org</a>
    </p>

    <p style="margin:20px 0 0;font-size:15px;color:#374151">— The Forex Mastery Team</p>
  `

  return wrap(subject, body)
}

// ── Signal alert email (admin-approved) ───────────────────────────────────────

export interface SignalData {
  display:    string
  decision:   string
  confidence: number
  confluence: number
  entryLow:   number
  entryHigh:  number
  price:      number
  stopLoss:   number
  tp1:        number
  rrRatio:    string
}

function dpFmt(price: number) {
  if (price >= 100) return 2
  if (price >= 1)   return 4
  return 5
}
function fmtN(n: number, dec: number) {
  return (!n || !isFinite(n)) ? '—' : n.toFixed(dec)
}

export function buildSignalEmail(name: string | null, s: SignalData): string {
  const firstName = name ? escapeHtml(name.split(' ')[0]) : null
  const dir       = s.decision === 'BUY' ? 'buy' : 'sell'

  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7">
      ${firstName ? `Hey ${firstName},` : 'Hey,'}
    </p>

    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7">
      There's a new ${dir} setup on ${escapeHtml(s.display)}. Log in to see the full analysis, entry levels, and targets.
    </p>

    <p style="margin:0 0 0;font-size:15px;color:#374151">— The Forex Mastery Team</p>
  `

  const preheader = `New ${dir} signal on ${s.display} — log in to view the full setup`
  return wrap(preheader, body)
}

export function buildSignalText(name: string | null, s: SignalData): string {
  const firstName = name ? name.split(' ')[0] : null
  const dir = s.decision === 'BUY' ? 'buy' : 'sell'
  return [
    `${firstName ? `Hey ${firstName},` : 'Hey,'}`,
    ``,
    `There's a new ${dir} signal on ${s.display}. Log in to view the full analysis, entry levels, and targets.`,
    ``,
    `forexmastery.org/analysis`,
    ``,
    `— The Forex Mastery Team`,
  ].join('\n')
}

// ── Plain text versions ────────────────────────────────────────────────────────

export function buildPasswordResetText(name: string | null, resetUrl: string): string {
  const firstName = name ? name.split(' ')[0] : null
  return [
    `${firstName ? `Hey ${firstName},` : 'Hey,'}`,
    ``,
    `We received a request to reset your Forex Mastery password.`,
    `Click the link below to set a new password — it expires in 1 hour.`,
    ``,
    resetUrl,
    ``,
    `If you didn't request this, you can ignore this email — your password will not change.`,
    ``,
    `— The Forex Mastery Team`,
  ].join('\n')
}

export function buildBroadcastText(name: string | null, message: string): string {
  const firstName = name ? name.split(' ')[0] : null
  return [
    `${firstName ? `Hey ${firstName},` : 'Hey,'}`,
    ``,
    message,
    ``,
    `${BASE_URL}`,
    ``,
    `— The Forex Mastery Team`,
  ].join('\n')
}

// ── Trade update / advisory emails ────────────────────────────────────────────

interface TradeUpdateData {
  display: string
  decision: string
  type: string
  message: string
  currentPrice: number
  suggestedSL?: number | null
}

export function buildTradeUpdateEmail(name: string | null, t: TradeUpdateData): string {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  const typeLabel = t.type === 'cancel' ? '⚠️ Trade Cancellation Advisory'
    : t.type === 'move_sl_breakeven' ? '🛡️ Move Stop Loss to Break Even'
    : '📈 Trail Stop Loss into Profit'
  return `
<!DOCTYPE html><html><body style="font-family:sans-serif;background:#080e1a;color:#fff;padding:32px;">
<div style="max-width:560px;margin:auto;background:#0d1424;border:1px solid #1e2d45;border-radius:12px;padding:32px;">
  <h2 style="color:#1D9E75;margin:0 0 8px">${typeLabel}</h2>
  <p style="color:#94a3b8;margin:0 0 24px">${greeting}</p>
  <div style="background:#131722;border:1px solid #1e2d45;border-radius:8px;padding:16px;margin-bottom:20px">
    <p style="margin:0 0 8px;font-weight:bold;font-size:16px">${t.decision} ${t.display}</p>
    <p style="margin:0;color:#94a3b8;font-size:14px">${t.message}</p>
    ${t.suggestedSL ? `<p style="margin:8px 0 0;color:#f59e0b;font-size:13px">Suggested SL: <strong>${t.suggestedSL}</strong></p>` : ''}
    <p style="margin:8px 0 0;color:#64748b;font-size:12px">Current price: ${t.currentPrice}</p>
  </div>
  <p style="color:#64748b;font-size:12px;margin:0">This is an advisory from FM Trader. Always apply your own risk management.</p>
</div>
</body></html>`
}

export function buildTradeUpdateText(name: string | null, t: TradeUpdateData): string {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  return `${greeting}\n\nFM Trader Advisory — ${t.decision} ${t.display}\n\n${t.message}${t.suggestedSL ? `\nSuggested SL: ${t.suggestedSL}` : ''}\nCurrent price: ${t.currentPrice}\n\nAlways apply your own risk management.`
}

// ── Welcome / free trial email ────────────────────────────────────────────────

export function buildWelcomeEmail(name: string | null): string {
  const firstName = name ? escapeHtml(name.split(' ')[0]) : null
  const body = `
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7">
      ${firstName ? `Hey ${firstName},` : 'Hey,'}
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7">
      Welcome to <strong>Forex Mastery</strong>! We've activated a <strong>free 1-month trial</strong> on your account — you have full access to FM Trader analysis, live signals, and all pair insights for the next 30 days.
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7">
      Head to the <strong>Analysis</strong> page to run your first FM Trader prediction.
    </p>
    <p style="margin:0 0 0;font-size:15px;color:#374151">— The Forex Mastery Team</p>
  `
  return wrap('Welcome to Forex Mastery — your free 1-month trial is active', body)
}

export function buildWelcomeText(name: string | null): string {
  const firstName = name ? name.split(' ')[0] : null
  return [
    `${firstName ? `Hey ${firstName},` : 'Hey,'}`,
    ``,
    `Welcome to Forex Mastery! We've activated a free 1-month trial on your account.`,
    `You have full access to FM Trader analysis, live signals, and all pair insights for the next 30 days.`,
    ``,
    `Head to the Analysis page to run your first FM Trader prediction:`,
    `${BASE_URL}/analysis`,
    ``,
    `— The Forex Mastery Team`,
  ].join('\n')
}
