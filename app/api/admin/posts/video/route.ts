// Admin-only: create a YouTube video embed as a feed post.
//
// The URL is parsed into a bare 11-char YouTube video id so the client
// side can build the embed iframe without trusting any part of the URL
// string. Accepts every common shape:
//   https://www.youtube.com/watch?v=<ID>
//   https://youtu.be/<ID>
//   https://youtube.com/shorts/<ID>
//   https://www.youtube.com/embed/<ID>
// Anything else (playlists, live, etc) is rejected — one video per post.
//
// Video posts get expiresAt set far in the future (2100-01-01) so the
// existing 24h purge cron (which reads `expiresAt < now`) leaves them
// alone. They're removed only when admin calls DELETE on this route.
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const CAPTION_MAX = 300
const FAR_FUTURE  = new Date('2100-01-01T00:00:00Z')

function extractYouTubeId(rawUrl: string): string | null {
  const url = rawUrl.trim()
  if (!url) return null

  // Accept a bare 11-char id too, so admins can paste just the id if they
  // already have it copied.
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url

  let u: URL
  try { u = new URL(url) } catch { return null }

  const host = u.hostname.replace(/^www\./, '')
  let id: string | null = null

  if (host === 'youtu.be') {
    // youtu.be/<ID>
    id = u.pathname.slice(1).split('/')[0] || null
  } else if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (u.pathname === '/watch') {
      id = u.searchParams.get('v')
    } else {
      // /shorts/<ID> or /embed/<ID> or /v/<ID>
      const m = u.pathname.match(/^\/(?:shorts|embed|v)\/([a-zA-Z0-9_-]{11})/)
      if (m) id = m[1]
    }
  }

  if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return id
  return null
}

export async function POST(req: Request) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({})) as { url?: string; caption?: string }
  const id = extractYouTubeId(body.url ?? '')
  if (!id) {
    return NextResponse.json({ error: 'Not a recognised YouTube video URL. Paste a full URL or the 11-character video id.' }, { status: 400 })
  }

  const caption = typeof body.caption === 'string' ? body.caption.trim().slice(0, CAPTION_MAX) : ''

  const post = await (prisma as any).post.create({
    data: {
      authorType:     'admin_video',
      content:        caption,           // may be empty — the video itself is the payload
      youtubeVideoId: id,
      expiresAt:      FAR_FUTURE,        // never purged by the 24h cron
    },
  })

  return NextResponse.json({ ok: true, id: post.id, videoId: id })
}
