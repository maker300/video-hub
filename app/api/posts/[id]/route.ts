// Soft-delete a post. Owner or admin only.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

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
