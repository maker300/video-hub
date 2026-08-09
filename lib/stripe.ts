import Stripe from 'stripe'

// Token packs replaced the old time-based access plans. lib/plans.ts is gone;
// existing AnalysisAccess rows still carry its `type` strings (one_month,
// six_months…) as plain data, which the admin grant UI continues to read.
export { TOKEN_PACKS } from './tokens'
export type { TokenPackId } from './tokens'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia' as any,
})
