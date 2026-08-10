// Toggle a like. The unique constraint on (postId, userId) is what makes this
// safe under a double-tap — no read-then-write, no duplicate rows.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { id: postId } = await params
  const db = prisma as any

  const post = await db.post.findUnique({ where: { id: postId }, select: { deletedAt: true } })
  if (!post || post.deletedAt) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  let liked: boolean
  try {
    await db.postLike.create({ data: { postId, userId } })
    liked = true
  } catch (e) {
    // P2002 = already liked, so this tap is an unlike.
    if ((e as { code?: string })?.code !== 'P2002') throw e
    await db.postLike.deleteMany({ where: { postId, userId } })
    liked = false
  }

  const likeCount = await db.postLike.count({ where: { postId } })
  return NextResponse.json({ ok: true, liked, likeCount })
}
