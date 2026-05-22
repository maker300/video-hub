export const PLANS = [
  {
    id:       'monthly',
    label:    '1 Month',
    price:    60_00,
    currency: 'gbp',
    desc:     'Full access for 30 days',
    duration: 'one_month',
    days:     30,
    popular:  false,
  },
  {
    id:       'three_months',
    label:    '3 Months',
    price:    156_00,
    currency: 'gbp',
    desc:     'Save £24.00 vs monthly',
    duration: 'three_months',
    days:     90,
    popular:  true,
  },
  {
    id:       'six_months',
    label:    '6 Months',
    price:    276_00,
    currency: 'gbp',
    desc:     'Save £84.00 vs monthly',
    duration: 'six_months',
    days:     180,
    popular:  false,
  },
  {
    id:       'twelve_months',
    label:    '12 Months',
    price:    456_00,
    currency: 'gbp',
    desc:     'Save £264.00 vs monthly',
    duration: 'twelve_months',
    days:     365,
    popular:  false,
  },
] as const

export type PlanId = typeof PLANS[number]['id']
