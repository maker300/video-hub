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
    const session = event.data.object as any
    const meta    = session.metadata ?? {}
    const userId  = meta.userId as string | undefined
    const packId  = meta.packId as string | undefined
    const tokens  = parseInt(meta.tokens ?? '0', 10)

    if (!userId || !packId || !Number.isFinite(tokens) || tokens <= 0) {
      console.error('[stripe/webhook] Missing or invalid token metadata', meta)
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    try {
      // Claim the event and credit the tokens in one transaction. Stripe retries
      // on any non-2xx and does not guarantee exactly-once delivery, so without
      // the claim a repeated delivery would credit the same purchase twice.
      //
      // Claiming inside the transaction (rather than before it) means a failed
      // credit rolls the claim back too, so Stripe's retry still works.
      const balance = await prisma.$transaction(async tx => {
        const db = tx as any

        await db.stripeEvent.create({
          data: { eventId: event.id, type: event.type },
        })

        const user = await tx.user.update({
          where:  { id: userId },
          data:   { tokenBalance: { increment: tokens } },
          select: { tokenBalance: true },
        })

        await db.tokenLedger.create({
          data: {
            userId,
            delta:     tokens,
            reason:    'purchase',
            balance:   user.tokenBalance,
            reference: `${packId} | stripe:${event.id}`,
          },
        })

        return user.tokenBalance
      })

      console.log(`[stripe/webhook] Credited ${tokens} tokens: userId=${userId} pack=${packId} balance=${balance}`)
    } catch (err) {
      // P2002 on stripeEvent.eventId — we have already handled this delivery.
      // Acknowledge with a 2xx so Stripe stops retrying.
      if ((err as { code?: string })?.code === 'P2002') {
        console.log(`[stripe/webhook] Duplicate delivery ignored: ${event.id}`)
        return NextResponse.json({ received: true, duplicate: true })
      }
      console.error('[stripe/webhook] DB error:', err)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
