// Soft-delete a post. Owner or admin only.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

const MAX_LEN = 2000

// PATCH — edit a post's text.
//
// Admins can edit anything, including the agent's own posts: those are
// generated, so they will occasionally be wrong, clumsy, or need a human
// correction after the fact. Users may edit their own. The change is marked as
// edited rather than applied silently, since readers may have acted on what it
// said before.
export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id as string | undefined
  const isAdmin = (session?.user as any)?.role === 'admin'
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { id } = await params
  const db = prisma as any

  const post = await db.post.findUnique({ where: { id }, select: { userId: true, deletedAt: true, authorType: true } })
  if (!post || post.deletedAt) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  const mine = post.userId === userId && post.authorType === 'user'
  if (!mine && !isAdmin) {
    return NextResponse.json({ error: 'You can only edit your own posts.' }, { status: 403 })
  }

  const body    = await req.json().catch(() => ({})) as { content?: string }
  const content = (body.content ?? '').trim()
  if (!content) return NextResponse.json({ error: 'Post cannot be empty.' }, { status: 400 })
  if (content.length > MAX_LEN) {
    return NextResponse.json({ error: `Posts are limited to ${MAX_LEN} characters.` }, { status: 400 })
  }

  const updated = await db.post.update({
    where: { id },
    data:  { content, editedAt: new Date(), editedBy: session!.user?.email ?? 'admin' },
    select: { content: true, editedAt: true },
  })

  return NextResponse.json({ ok: true, ...updated })
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id as string | undefined
  const isAdmin = (session?.user as any)?.role === 'admin'
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { id } = await params
  const db = prisma as any

  const post = await db.post.findUnique({ where: { id }, select: { userId: true, deletedAt: true } })
  if (!post || post.deletedAt) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  if (post.userId !== userId && !isAdmin) {
    return NextResponse.json({ error: 'You can only delete your own posts.' }, { status: 403 })
  }

  // Soft delete — keeps the thread coherent for anyone mid-read and leaves a
  // record of what was removed.
  await db.post.update({ where: { id }, data: { deletedAt: new Date() } })
  return NextResponse.json({ ok: true })
}
