import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — return slug list for authenticated user
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ slugs: [] })

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!user) return NextResponse.json({ slugs: [] })

  const subs = await prisma.pairSubscription.findMany({
    where:  { userId: user.id },
    select: { slug: true },
  })
  return NextResponse.json({ slugs: subs.map(s => s.slug) })
}

// POST — subscribe { slug, display }
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { slug, display } = await req.json() as { slug: string; display: string }
  if (!slug || !display) return NextResponse.json({ error: 'Missing slug or display' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await prisma.pairSubscription.upsert({
    where:  { userId_slug: { userId: user.id, slug } },
    create: { userId: user.id, slug, display },
    update: {},
  })
  return NextResponse.json({ subscribed: true })
}

// DELETE — unsubscribe { slug }
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { slug } = await req.json() as { slug: string }
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await prisma.pairSubscription.deleteMany({ where: { userId: user.id, slug } })
  return NextResponse.json({ subscribed: false })
}
