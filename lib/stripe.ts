import Stripe from 'stripe'
export { PLANS } from './plans'
export type { PlanId } from './plans'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia' as any,
})
