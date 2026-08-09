import Stripe from 'stripe'

// Token packs replaced the old time-based access plans. lib/plans.ts is kept
// only because admin grants still reference the `type` strings it defined
// (one_month, six_months…) on existing AnalysisAccess rows.
export { TOKEN_PACKS } from './tokens'
export type { TokenPackId } from './tokens'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia' as any,
})
