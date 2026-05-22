import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import AnalysisClient from './AnalysisClient'
import AnalysisAccessDenied from './AnalysisAccessDenied'
import PaymentSuccessBanner from './PaymentSuccessBanner'

const db = prisma as any

export const metadata = {
  title: 'Market Analysis — Forex Mastery',
  description: 'Live technical analysis and predictions for major forex pairs, gold, silver, and cryptocurrencies.',
}

function isAccessValid(access: any): boolean {
  if (!access || !access.active) return false
  if (access.type === 'monthly_rollover') return true
  return new Date(access.endDate) > new Date()
}

export default async function AnalysisPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin?callbackUrl=/analysis')

  let hasAccess = session.user?.role === 'admin'

  if (!hasAccess) {
    try {
      const access = await db.analysisAccess.findUnique({
        where: { userId: session.user!.id as string },
      })
      hasAccess = isAccessValid(access)
    } catch {
      hasAccess = false
    }
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#0A0F1E]">
        <Navbar />
        <AnalysisAccessDenied />
      </div>
    )
  }

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
