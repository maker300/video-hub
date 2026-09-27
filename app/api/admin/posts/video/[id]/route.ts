// Admin-only: hard-delete a video post. Video posts don't participate in
// the soft-delete pattern the rest of the feed uses because they carry no
// user-authored content that a soft delete would need to preserve — the
// video URL is the whole payload, and once admin says "gone", it's gone.
//
// Refuses to delete anything that isn't a video post (defence in depth so
// this endpoint can never be repurposed to delete recap or news posts).
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const db = prisma as any

  const post = await db.post.findUnique({ where: { id }, select: { id: true, authorType: true, youtubeVideoId: true } })
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (post.authorType !== 'admin_video' || !post.youtubeVideoId) {
    return NextResponse.json({ error: 'This endpoint only deletes video posts.' }, { status: 400 })
  }

  await db.post.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
