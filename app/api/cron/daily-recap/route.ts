// FM Trader's daily recap — one post a day, written as a short video script.
//
// Run once daily, late enough that the day's trades have had time to resolve
// (21:00 UTC is a reasonable slot: New York is winding down and most intraday
// calls have hit a level or expired).
//
// Posts on losing days too. A recap that only appears when the numbers are good
// teaches nothing and quietly misrepresents the strategy.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { gatherRecap, writeRecap } from '@/lib/daily-recap'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')

  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    const { getAdminSession } = await import('@/lib/adminAuth')
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db  = prisma as any
  const now = new Date()

  // One recap per day. A retry, a manual trigger, or an overlapping cron tick
  // must not produce a second.
  const dayStart = new Date(now); dayStart.setUTCHours(0, 0, 0, 0)
  const existing = await db.post.findFirst({
    where:  { authorType: 'agent', economicEventId: null, createdAt: { gte: dayStart } },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ ok: true, skipped: 'recap already posted today', postId: existing.id })
  }

  const data = await gatherRecap(now)
  const script = await writeRecap(data)

  if (!script) {
    // Better to post nothing than a broken or invented recap.
    return NextResponse.json(
      { ok: false, error: 'recap generation failed — nothing posted', data },
      { status: 502 },
    )
  }

  const post = await db.post.create({
    data: {
      authorType: 'agent',
      content:    script,
      expiresAt:  new Date(now.getTime() + 24 * 60 * 60 * 1000),
    },
  })

  return NextResponse.json({
    ok: true,
    postId: post.id,
    stats: {
      total: data.total, resolved: data.resolved,
      wins: data.wins, losses: data.losses, winRatePct: data.winRatePct,
    },
  })
}
