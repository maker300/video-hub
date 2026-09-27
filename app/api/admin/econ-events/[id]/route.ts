// Admin: edit a calendar event's figures.
//
// Supplying an actual runs the same path an automatic figure would: the
// surprise is recomputed, the agent's feed post is rewritten with the real
// number, and one notification goes out. figureAnnouncedAt gates that second
// announcement so repeated edits (a typo correction, say) do not re-alert.
//
// The publish pipeline (surprise, feed post, Telegram, bell) is factored
// into lib/publish-actual so the cron auto-fetch loop can call the same
// code path — one implementation, one place to fix bugs.
//
// Restricted to admin so a wrong figure can't be broadcast to every
// USD-pair subscriber by a team member's mistake. The Claude auto-fetch
// handles primary filings; this screen is a correction / fallback path.
import { NextResponse } from 'next/server'
import { getSessionInfo } from '@/lib/adminAuth'
import { publishActual } from '@/lib/publish-actual'

type Params = { params: Promise<{ id: string }> }

const num = (v: unknown): number | null | undefined => {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await getSessionInfo()
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id }  = await params

  const body = await req.json().catch(() => ({})) as {
    actual?: unknown; forecast?: unknown; previous?: unknown; unit?: string
    note?: string
  }

  try {
    const result = await publishActual({
      eventId:  id,
      actual:   num(body.actual),
      forecast: num(body.forecast),
      previous: num(body.previous),
      unit:     typeof body.unit === 'string' ? (body.unit.trim() || null) : undefined,
      note:     typeof body.note === 'string' ? (body.note.trim().slice(0, 600) || null) : undefined,
      editedBy: session.email ?? 'admin',
    })

    // Preserve the previous response shape so the admin UI does not need
    // to change: it reads `d.announced`, `d.notified`, `d.print`.
    if (!result.announced) {
      return NextResponse.json({ ok: true, announced: false, event: result.eventSummary })
    }
    return NextResponse.json({ ok: true, announced: true, notified: result.notified, print: result.print })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update event'
    const status  = message.includes('not found') ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
