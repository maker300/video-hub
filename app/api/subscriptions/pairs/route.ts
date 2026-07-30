import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { buildBroadcastEmail, buildBroadcastText } from '@/lib/email-templates'

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

  const user = await prisma.user.findUnique({
    where:  { email: session.user.email },
    select: { id: true, name: true, email: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Upsert returns the pre-existing state as well — checking for "new sub"
  // vs "already subscribed" so we don't spam the same confirmation email
  // if the user re-clicks Subscribe.
  const existing = await prisma.pairSubscription.findUnique({
    where:  { userId_slug: { userId: user.id, slug } },
    select: { id: true },
  })
  await prisma.pairSubscription.upsert({
    where:  { userId_slug: { userId: user.id, slug } },
    create: { userId: user.id, slug, display },
    update: {},
  })

  // Confirmation email — proves email delivery works to the user, and
  // sets expectation that future BUY/SELL signals for this pair will
  // arrive in their inbox as well as their bell.
  if (!existing && !user.email.endsWith('@forexmastery.internal')) {
    const subject = `Subscribed to ${display} signals`
    const message =
      `You're subscribed to ${display} — every time a BUY or SELL signal fires for this pair, ` +
      `you'll get an email and a bell notification.\n\n` +
      `Signals include the entry zone, stop loss, TP1 and confidence score, and drop straight ` +
      `into your inbox as soon as the market scanner picks them up.\n\n` +
      `You can unsubscribe any time from the FM Trader popup on ${display}.`
    void sendEmail({
      to:      [{ email: user.email, name: user.name ?? undefined }],
      subject,
      html:    buildBroadcastEmail(user.name ?? null, subject, message),
      text:    buildBroadcastText(user.name ?? null, message),
    }).catch(err => console.error('[subscriptions/pairs] confirmation email failed:', err))
  }

  return NextResponse.json({ subscribed: true, wasNew: !existing })
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
