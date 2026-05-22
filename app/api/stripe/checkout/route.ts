import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe, PLANS } from '@/lib/stripe'
import type { PlanId } from '@/lib/stripe'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'You must be signed in to purchase a plan.' }, { status: 401 })
  }

  let planId: PlanId
  try {
    const body = await req.json()
    planId = body.planId
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const plan = PLANS.find(p => p.id === planId)
  if (!plan) {
    return NextResponse.json({ error: 'Invalid plan.' }, { status: 400 })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode:           'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency:     plan.currency,
            unit_amount:  plan.price,
            product_data: {
              name:        `ForexMastery Analysis — ${plan.label}`,
              description: `Full access to the Market Analysis page for ${plan.label.toLowerCase()}. ${plan.desc}.`,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: session.user.email ?? undefined,
      metadata: {
        userId:   (session.user as any).id,
        planId:   plan.id,
        duration: plan.duration,
        days:     String(plan.days),
      },
      success_url: `${baseUrl}/analysis?payment=success`,
      cancel_url:  `${baseUrl}/analysis/plans?payment=cancelled`,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (err) {
    console.error('[stripe/checkout]', err)
    return NextResponse.json({ error: 'Failed to create checkout session. Please try again.' }, { status: 500 })
  }
}
