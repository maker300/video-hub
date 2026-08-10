// Community feed — list and create posts. Text only, no media.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

const MAX_LEN = 2000

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const url    = new URL(req.url)
  const cursor = url.searchParams.get('cursor')

  const db = prisma as any
  const posts = await db.post.findMany({
    where:   { deletedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    take:    21,                                   // 21 to detect a next page
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      user:     { select: { id: true, name: true, image: true, role: true } },
      likes:    { select: { userId: true } },
      _count:   { select: { comments: true } },
    },
  })

  const hasMore = posts.length > 20
  const page    = hasMore ? posts.slice(0, 20) : posts

  return NextResponse.json({
    posts: page.map((p: any) => ({
      id:         p.id,
      authorType: p.authorType,
      content:    p.content,
      createdAt:  p.createdAt,
      author:     p.authorType === 'agent'
        ? { name: 'FM Trader', role: 'agent' }
        : { id: p.user?.id, name: p.user?.name ?? 'Trader', image: p.user?.image, role: p.user?.role },
      likeCount:  p.likes.length,
      likedByMe:  p.likes.some((l: any) => l.userId === userId),
      commentCount: p._count.comments,
      canDelete:  p.userId === userId || (session!.user as any)?.role === 'admin',
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as any)?.id as string | undefined
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  // Posting is cheap to abuse and expensive to moderate.
  if (!rateLimit(`${getClientIp(req)}:post`, 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Slow down — try again in a few minutes.' }, { status: 429 })
  }

  const body    = await req.json().catch(() => ({})) as { content?: string }
  const content = (body.content ?? '').trim()

  if (!content) return NextResponse.json({ error: 'Write something first.' }, { status: 400 })
  if (content.length > MAX_LEN) {
    return NextResponse.json({ error: `Posts are limited to ${MAX_LEN} characters.` }, { status: 400 })
  }

  // 24-hour lifespan, same for every post.
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const post = await (prisma as any).post.create({
    data: { userId, authorType: 'user', content, expiresAt },
  })

  return NextResponse.json({ ok: true, id: post.id })
}
