import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

const db = prisma as any

export async function POST(req: Request) {
  const ip = getClientIp(req)

  // Hard cap: 10 events per IP per minute (prevents floods)
  if (!rateLimit(`${ip}:track`, 10, 60 * 1000)) {
    return NextResponse.json({ ok: false }, { status: 429 })
  }

  try {
    const body = await req.json() as { path?: string }
    // Validate path — must look like a URL path, not arbitrary data
    const rawPath = body.path ?? '/'
    const path = /^[/a-zA-Z0-9_\-=?&#%.@:[\]]+$/.test(rawPath)
      ? rawPath.slice(0, 200)
      : '/'

    let userId: string | null = null
    try {
      const session = await getServerSession(authOptions)
      // Only store userId for real DB users (admin has id='admin', not in DB)
      if (session?.user?.id && session.user.role !== 'admin') {
        userId = session.user.id as string
      }
    } catch { /* ignore auth errors */ }

    // Dedup: only record the same path once per 10 min per IP+user to cut DB writes
    const dedupKey = `${ip}:${userId ?? 'anon'}:${path}`
    if (!rateLimit(dedupKey, 1, 10 * 60 * 1000)) {
      return NextResponse.json({ ok: true }) // silently skip — no error shown
    }

    try {
      await db.pageView.create({
        data: { path, userId },
      })
    } catch { /* ignore tracking errors — never break the UI */ }

    // Update lastSeenAt for logged-in users so admin can see who is active
    if (userId) {
      try {
        await db.user.update({
          where: { id: userId },
          data: { lastSeenAt: new Date() },
        })
      } catch { /* ignore — never break the UI */ }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
