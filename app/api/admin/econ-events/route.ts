// Admin: list calendar events for manual figure entry.
//
// The free calendar feed publishes a schedule but no actuals, so until a paid
// source is wired in an admin types the figure after each release. Doing so
// runs the same pipeline an automatic figure would.
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { displayForSlug } from '@/lib/market-map'
import { isCommentaryEvent } from '@/lib/econ-calendar'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const db  = prisma as any
  const now = new Date()

  const events = await db.economicEvent.findMany({
    orderBy: { scheduledAt: 'asc' },
    take:    60,
  })

  return NextResponse.json({
    events: events.map((e: any) => ({
      id:          e.id,
      currency:    e.currency,
      event:       e.event,
      impact:      e.impact,
      scheduledAt: e.scheduledAt,
      actual:      e.actual,
      forecast:    e.forecast,
      previous:    e.previous,
      unit:        e.unit,
      surpriseDir: e.surpriseDir,
      // Past its time and still without a figure — these are the rows an admin
      // needs to act on, so the UI can sort them to the top.
      isCommentary: isCommentaryEvent(e.event, e.forecast, e.previous),
      note:         e.note ?? null,
      // Only numeric releases need a figure typed in; a press conference never
      // will, so it must not sit in the queue looking unfinished.
      needsFigure: e.actual == null && new Date(e.scheduledAt) < now
                   && !isCommentaryEvent(e.event, e.forecast, e.previous),
      figureAnnouncedAt: e.figureAnnouncedAt,
      editedBy:    e.editedBy,
      affected:    (e.affectedSlugs as string[] ?? []).map(displayForSlug),
    })),
  })
}
