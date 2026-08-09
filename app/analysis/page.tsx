import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import AnalysisClient from './AnalysisClient'
import PaymentSuccessBanner from './PaymentSuccessBanner'

const db = prisma as any

export const metadata = {
  title: 'Market Analysis — Forex Mastery',
  description: 'Live technical analysis and predictions for major forex pairs, gold, silver, and cryptocurrencies.',
}

export default async function AnalysisPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin?callbackUrl=/analysis')

  // Analysis pages are open to any signed-in user. Access used to be sold as a
  // timed plan (AnalysisAccess); the product now charges per FM Trader run
  // instead, so gating the charts as well would be a second paywall over
  // something that costs nothing to serve. Existing admin-granted AnalysisAccess
  // rows are left in place and simply no longer consulted here.

  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      <Suspense fallback={null}>
        <PaymentSuccessBanner />
      </Suspense>
      <Navbar />
      <AnalysisClient initial={null} />
    </div>
  )
}
