import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''
  const secret    = process.env.STRIPE_WEBHOOK_SECRET

  if (!secret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session  = event.data.object as any
    const meta     = session.metadata ?? {}
    const userId   = meta.userId   as string | undefined
    const duration = meta.duration as string | undefined
    const days     = parseInt(meta.days ?? '30', 10)

    if (!userId || !duration) {
      console.error('[stripe/webhook] Missing metadata', meta)
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    const now = new Date()

    try {
      const db = prisma as any
      const existing = await db.analysisAccess.findUnique({ where: { userId } })

      // If the user has active access that hasn't expired yet, extend from their
      // current endDate so they don't lose remaining time. Otherwise start fresh.
      const baseDate = (existing?.active && existing.endDate && new Date(existing.endDate) > now)
        ? new Date(existing.endDate)
        : now

      const startDate = now
      const endDate   = new Date(baseDate)
      endDate.setDate(endDate.getDate() + days)

      const extendedFrom = baseDate > now
        ? `extended from ${baseDate.toISOString().split('T')[0]}`
        : 'started fresh'

      if (existing) {
        await db.analysisAccess.update({
          where: { userId },
          data: {
            type:      duration,
            startDate,
            endDate,
            active:    true,
            grantedAt: now,
            note:      `Purchased via Stripe — ${meta.planId} (${extendedFrom})`,
          },
        })
      } else {
        await db.analysisAccess.create({
          data: {
            userId,
            type:      duration,
            startDate,
            endDate,
            active:    true,
            grantedAt: now,
            note:      `Purchased via Stripe — ${meta.planId} (${extendedFrom})`,
          },
        })
      }

      console.log(`[stripe/webhook] Access granted: userId=${userId} plan=${duration} days=${days} endDate=${endDate.toISOString()} (${extendedFrom})`)
    } catch (err) {
      console.error('[stripe/webhook] DB error:', err)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
