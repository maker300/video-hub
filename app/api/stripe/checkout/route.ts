import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { TOKEN_PACKS, type TokenPackId } from '@/lib/tokens'
import {
  getCourseAccess, formatGbp, COURSE_BONUS_TOKENS, COURSE_LIVE_CALLS,
} from '@/lib/course-pricing'
import {
  getCoachingAccess, COACHING_PRICE_MONTHLY, COACHING_SESSIONS_PER_MONTH,
} from '@/lib/coaching'
import {
  getActiveEvaluation, tierAt, EVAL_TIERS,
  EVAL_PHASE1_TARGET_PCT, EVAL_PHASE2_TARGET_PCT,
  EVAL_PROFIT_SPLIT_PCT, gbp,
} from '@/lib/evaluation'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'You must be signed in to buy tokens.' }, { status: 401 })
  }

  let body: { packId?: TokenPackId; kind?: string; tier?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const baseUrlEarly = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const userId = (session.user as { id?: string }).id

  // ── Course purchase ───────────────────────────────────────────────────
  // One-off payment. Price is resolved SERVER-SIDE from the user's record,
  // never taken from the request body — otherwise anyone could post the
  // legacy price and buy at £50.
  if (body.kind === 'course') {
    const access = await getCourseAccess(userId)
    if (access.purchased) {
      return NextResponse.json({ error: 'You already have course access.' }, { status: 400 })
    }

    try {
      const cs = await stripe.checkout.sessions.create({
        mode:                 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency:    'gbp',
            unit_amount: access.price,
            product_data: {
              name: 'Forex Mastery — Full Course Access',
              description:
                `Lifetime access to every module and lesson, ${COURSE_LIVE_CALLS} weekly live group calls with a moderator, ` +
                `and ${COURSE_BONUS_TOKENS} bonus FM Trader tokens.` +
                (access.legacy ? ` Existing-member price (${formatGbp(access.price)}).` : ''),
            },
          },
          quantity: 1,
        }],
        customer_email: session.user.email ?? undefined,
        metadata: {
          userId:     userId ?? '',
          kind:       'course',
          pricePaid:  String(access.price),
          legacy:     String(access.legacy),
        },
        success_url: `${baseUrlEarly}/course?purchase=success`,
        cancel_url:  `${baseUrlEarly}/course/purchase?purchase=cancelled`,
      })
      return NextResponse.json({ url: cs.url })
    } catch (err) {
      console.error('[stripe/checkout:course]', err)
      return NextResponse.json({ error: 'Failed to start checkout. Please try again.' }, { status: 500 })
    }
  }


  // ── Coaching subscription ─────────────────────────────────────────────
  // Recurring monthly, so mode: 'subscription' with a recurring price_data.
  // Every other product on the site is one-off; this is the only place that
  // creates an ongoing billing relationship, and Stripe owns its lifecycle.
  if (body.kind === 'coaching') {
    const coaching = await getCoachingAccess(userId)
    if (coaching.active) {
      return NextResponse.json({ error: 'You already have an active coaching subscription.' }, { status: 400 })
    }

    try {
      const cs = await stripe.checkout.sessions.create({
        mode:                 'subscription',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency:   'gbp',
            unit_amount: COACHING_PRICE_MONTHLY,
            recurring:  { interval: 'month' },
            product_data: {
              name:        'Forex Mastery — 1-on-1 Coaching',
              description:
                `${COACHING_SESSIONS_PER_MONTH} private training sessions a month with a trading professional, ` +
                'plus access to every live trading session run that month. Cancel any time.',
            },
          },
          quantity: 1,
        }],
        customer_email: session.user.email ?? undefined,
        metadata:              { userId: userId ?? '', kind: 'coaching' },
        // Mirrored onto the subscription so lifecycle webhooks (renewal,
        // cancellation) can identify the user without a DB lookup by email.
        subscription_data: { metadata: { userId: userId ?? '', kind: 'coaching' } },
        success_url: `${baseUrlEarly}/coaching?subscribed=1`,
        cancel_url:  `${baseUrlEarly}/coaching?cancelled=1`,
      })
      return NextResponse.json({ url: cs.url })
    } catch (err) {
      console.error('[stripe/checkout:coaching]', err)
      return NextResponse.json({ error: 'Failed to start checkout. Please try again.' }, { status: 500 })
    }
  }


  // ── Funded-account evaluation ─────────────────────────────────────────
  // One-off fee for a skills evaluation on a simulated account. The member
  // trades it themselves; we never take custody of member funds. Terms are
  // snapshotted onto the Evaluation row by the webhook so a later price or
  // rule change cannot alter a challenge already in progress.
  if (body.kind === 'evaluation') {
    const existing = await getActiveEvaluation(userId)
    if (existing) {
      return NextResponse.json(
        { error: 'You already have an active evaluation. Finish or fail it before starting another.' },
        { status: 400 },
      )
    }

    // Tier index is validated server-side against the real list — the fee
    // charged always matches the tier, never a client-supplied amount.
    const tierIndex = Number.isInteger(body.tier) && body.tier! >= 0 && body.tier! < EVAL_TIERS.length
      ? (body.tier as number)
      : 0
    const tier = tierAt(tierIndex)

    try {
      const cs = await stripe.checkout.sessions.create({
        mode:                 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency:    'gbp',
            unit_amount: tier.fee,
            product_data: {
              name: `Forex Mastery — ${gbp(tier.accountSize)} Funded Account Evaluation`,
              description:
                `Two-phase evaluation on ${gbp(tier.accountSize)} simulated accounts: ` +
                `+${EVAL_PHASE1_TARGET_PCT}% in Phase 1, then +${EVAL_PHASE2_TARGET_PCT}% in Phase 2. ` +
                `Clear both and trade ${gbp(tier.accountSize)} of our capital on a ${EVAL_PROFIT_SPLIT_PCT}% profit split.`,
            },
          },
          quantity: 1,
        }],
        customer_email: session.user.email ?? undefined,
        metadata: { userId: userId ?? '', kind: 'evaluation', tier: String(tierIndex) },
        success_url: `${baseUrlEarly}/funded?purchase=success`,
        cancel_url:  `${baseUrlEarly}/funded?purchase=cancelled`,
      })
      return NextResponse.json({ url: cs.url })
    } catch (err) {
      console.error('[stripe/checkout:evaluation]', err)
      return NextResponse.json({ error: 'Failed to start checkout. Please try again.' }, { status: 500 })
    }
  }

  const packId = body.packId as TokenPackId

  const pack = TOKEN_PACKS.find(p => p.id === packId)
  if (!pack) {
    return NextResponse.json({ error: 'Invalid token pack.' }, { status: 400 })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode:                 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency:    pack.currency,
            unit_amount: pack.price,
            product_data: {
              name:        `ForexMastery — ${pack.tokens} FM Trader tokens`,
              description: `${pack.tokens} tokens. One token runs FM Trader once on any instrument. Tokens do not expire.`,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: session.user.email ?? undefined,
      // The webhook credits from these values. `tokens` is authoritative and is
      // read from the pack here rather than the client, so a tampered request
      // body cannot buy a small pack and be credited a large one.
      metadata: {
        userId: (session.user as any).id,
        packId: pack.id,
        tokens: String(pack.tokens),
      },
      success_url: `${baseUrl}/analysis?payment=success`,
      cancel_url:  `${baseUrl}/analysis/tokens?payment=cancelled`,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('[stripe/checkout]', err)
    return NextResponse.json({ error: 'Failed to create checkout session. Please try again.' }, { status: 500 })
  }
}
