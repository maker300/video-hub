import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { id } = await params

  // Admin is stored in env, not in the DB — detect via session role
  const isAdmin = (session.user as { role?: string })?.role === 'admin'

  if (isAdmin) {
    const pred = await prisma.fMPrediction.findUnique({ where: { id }, select: { id: true } })
    if (!pred) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await prisma.fMPrediction.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const pred = await prisma.fMPrediction.findUnique({ where: { id }, select: { userId: true } })
  if (!pred) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (pred.userId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.fMPrediction.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
