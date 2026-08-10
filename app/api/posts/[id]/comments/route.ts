// Comments on a post. Text only; rendered as plain text by the client, never
// as HTML — user-authored content must not reach a markup sink.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

type Params = { params: Promise<{ id: string }> }

const MAX_LEN = 1000

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { id: postId } = await params
  const db = prisma as any

  const comments = await db.postComment.findMany({
    where:   { postId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    take:    200,
    include: { user: { select: { id: true, name: true, image: true, role: true } } },
  })

  const isAdmin = (session!.user as any)?.role === 'admin'
  return NextResponse.json({
    comments: comments.map((c: any) => ({
      id:        c.id,
      content:   c.content,
      createdAt: c.createdAt,
      author:    { id: c.user?.id, name: c.user?.name ?? 'Trader', image: c.user?.image, role: c.user?.role },
      canDelete: c.userId === userId || isAdmin,
    })),
  })
}

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  if (!rateLimit(`${getClientIp(req)}:comment`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Slow down — try again in a few minutes.' }, { status: 429 })
  }

  const { id: postId } = await params
  const body    = await req.json().catch(() => ({})) as { content?: string }
  const content = (body.content ?? '').trim()

  if (!content) return NextResponse.json({ error: 'Write something first.' }, { status: 400 })
  if (content.length > MAX_LEN) {
    return NextResponse.json({ error: `Comments are limited to ${MAX_LEN} characters.` }, { status: 400 })
  }

  const db = prisma as any
  const post = await db.post.findUnique({ where: { id: postId }, select: { deletedAt: true } })
  if (!post || post.deletedAt) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  const c = await db.postComment.create({ data: { postId, userId, content } })
  return NextResponse.json({ ok: true, id: c.id })
}

export async function DELETE(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id as string | undefined
  const isAdmin = (session?.user as any)?.role === 'admin'
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const commentId = new URL(req.url).searchParams.get('commentId')
  if (!commentId) return NextResponse.json({ error: 'commentId required' }, { status: 400 })

  const db = prisma as any
  const c = await db.postComment.findUnique({ where: { id: commentId }, select: { userId: true } })
  if (!c) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
  if (c.userId !== userId && !isAdmin) {
    return NextResponse.json({ error: 'You can only delete your own comments.' }, { status: 403 })
  }

  await db.postComment.update({ where: { id: commentId }, data: { deletedAt: new Date() } })
  return NextResponse.json({ ok: true })
}
