import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { COURSE_BONUS_TOKENS } from '@/lib/course-pricing'
import { currentTerms } from '@/lib/evaluation'

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


  // ── Coaching subscription lifecycle ──────────────────────────────────
  // Stripe is the source of truth for billing state; these handlers just
  // mirror it onto the User row so the app can gate the booking page
  // without calling Stripe on every request.
  //
  // Not wrapped in the StripeEvent idempotency claim: unlike token credits
  // these writes are IDEMPOTENT BY NATURE (setting status to the same value
  // twice is a no-op), and subscription events arrive repeatedly over the
  // life of a subscription — claiming each one would bloat the table for no
  // benefit.
  if (event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted' ||
      event.type === 'customer.subscription.created') {
    const sub    = event.data.object as any
    const userId = sub.metadata?.userId as string | undefined
    if (!userId || sub.metadata?.kind !== 'coaching') {
      return NextResponse.json({ received: true, ignored: 'not a coaching subscription' })
    }

    // Stripe statuses → ours. `canceled` (US spelling) is Stripe's.
    const raw = sub.status as string
    const status =
      raw === 'active' || raw === 'trialing' ? 'active'
      : raw === 'past_due' || raw === 'unpaid' ? 'past_due'
      : 'cancelled'

    // When a cancellation is scheduled, access runs to the period end.
    const endsAt = sub.cancel_at_period_end && sub.current_period_end
      ? new Date(sub.current_period_end * 1000)
      : raw === 'canceled' && sub.ended_at
        ? new Date(sub.ended_at * 1000)
        : null

    try {
      await (prisma as any).user.update({
        where: { id: userId },
        data: {
          coachingStatus: status,
          coachingSubId:  sub.id,
          coachingEndsAt: endsAt,
          ...(status === 'active' ? { coachingStartedAt: new Date(sub.start_date * 1000) } : {}),
        },
      })
      console.log(`[stripe/webhook] coaching ${event.type}: userId=${userId} status=${status}`)
    } catch (err) {
      console.error('[stripe/webhook] coaching update failed:', err)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    return NextResponse.json({ received: true })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any
    const meta    = session.metadata ?? {}
    const userId  = meta.userId as string | undefined
    const packId  = meta.packId as string | undefined
    const tokens  = parseInt(meta.tokens ?? '0', 10)

    // Coaching checkouts are finalised by the subscription.* handlers
    // above; nothing to do here beyond acknowledging the event.
    if (meta.kind === 'coaching') {
      return NextResponse.json({ received: true, handled: 'coaching-subscription' })
    }

    // ── Funded-account evaluation ──────────────────────────────────────
    // Creates the challenge with the terms frozen at purchase time.
    if (meta.kind === 'evaluation') {
      if (!userId) {
        console.error('[stripe/webhook] evaluation missing userId', meta)
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
      }
      const tierIndex = Number.parseInt(meta.tier ?? '0', 10)
      const terms = currentTerms(Number.isFinite(tierIndex) ? tierIndex : 0)
      try {
        await prisma.$transaction(async tx => {
          const db = tx as any
          await db.stripeEvent.create({ data: { eventId: event.id, type: event.type } })
          await db.evaluation.create({
            data: {
              userId,
              status: 'evaluation',
              phase:  'phase1',
              ...terms,
              // Start flat at the account size; equity arrives from the EA.
              currentEquity: terms.accountSize,
              peakEquity:    terms.accountSize,
              stripeRef:     event.id,
            },
          })
        })
        console.log(`[stripe/webhook] evaluation started: userId=${userId}`)
      } catch (err) {
        if ((err as { code?: string })?.code === 'P2002') {
          console.log(`[stripe/webhook] Duplicate evaluation delivery ignored: ${event.id}`)
          return NextResponse.json({ received: true, duplicate: true })
        }
        console.error('[stripe/webhook] evaluation DB error:', err)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }
      return NextResponse.json({ received: true })
    }

    // ── Course purchase ────────────────────────────────────────────────
    // Same exactly-once guarantee as the token path: the StripeEvent claim
    // and the entitlement write share one transaction, so a retried
    // delivery can't double-apply and a failed write leaves the claim
    // rolled back for Stripe to retry.
    if (meta.kind === 'course') {
      const pricePaid = parseInt(meta.pricePaid ?? '0', 10)
      if (!userId) {
        console.error('[stripe/webhook] course purchase missing userId', meta)
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
      }
      try {
        await prisma.$transaction(async tx => {
          const db = tx as any
          await db.stripeEvent.create({ data: { eventId: event.id, type: event.type } })

          // Entitlement + bundled tokens in one write. A course purchase
          // includes COURSE_BONUS_TOKENS, so a new member goes from the
          // 10-token signup grant to 20.
          const user = await db.user.update({
            where: { id: userId },
            data: {
              coursePurchased:   true,
              coursePurchasedAt: new Date(),
              coursePricePaid:   Number.isFinite(pricePaid) && pricePaid > 0 ? pricePaid : null,
              tokenBalance:      { increment: COURSE_BONUS_TOKENS },
            },
            select: { tokenBalance: true },
          })

          await db.tokenLedger.create({
            data: {
              userId,
              delta:     COURSE_BONUS_TOKENS,
              reason:    'course_purchase_bonus',
              balance:   user.tokenBalance,
              reference: `course | stripe:${event.id}`,
            },
          })
        })
        console.log(`[stripe/webhook] Course access granted: userId=${userId} paid=${pricePaid} tokens+${COURSE_BONUS_TOKENS}`)
      } catch (err) {
        if ((err as { code?: string })?.code === 'P2002') {
          console.log(`[stripe/webhook] Duplicate course delivery ignored: ${event.id}`)
          return NextResponse.json({ received: true, duplicate: true })
        }
        console.error('[stripe/webhook] course DB error:', err)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }
      return NextResponse.json({ received: true })
    }

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
