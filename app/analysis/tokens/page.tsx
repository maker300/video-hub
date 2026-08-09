import { Suspense } from 'react'
import TokensClient from './TokensClient'

export const metadata = {
  title: 'Buy FM Trader Tokens — Forex Mastery',
  description: 'One token runs FM Trader once on any instrument. Charts and analysis stay free.',
}

// TokensClient reads the ?payment=cancelled query param via useSearchParams,
// which forces a client-side bailout during prerender unless it sits inside a
// Suspense boundary. Same pattern as PaymentSuccessBanner on /analysis.
export default function TokensPage() {
  return (
    <Suspense fallback={null}>
      <TokensClient />
    </Suspense>
  )
}
