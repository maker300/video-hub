import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { TOKEN_PACKS, type TokenPackId } from '@/lib/tokens'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'You must be signed in to buy tokens.' }, { status: 401 })
  }

  let packId: TokenPackId
  try {
    const body = await req.json()
    packId = body.packId
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

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
