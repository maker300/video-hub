import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import DetailClient from './DetailClient'
import AnalysisAccessDenied from '../AnalysisAccessDenied'
import { SLUG_META } from '@/app/api/market-data/[symbol]/route'

const db = prisma as any

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params
  const meta = SLUG_META[symbol.toLowerCase()]
  return {
    title: meta ? `${meta.display} Analysis — Forex Mastery` : 'Market Analysis — Forex Mastery',
    description: meta ? `Multi-timeframe technical analysis and signals for ${meta.name}.` : '',
  }
}

function isAccessValid(access: any): boolean {
  if (!access || !access.active) return false
  if (access.type === 'monthly_rollover') return true
  return new Date(access.endDate) > new Date()
}

export default async function SymbolPage({ params }: { params: Promise<{ symbol: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin?callbackUrl=/analysis')

  const { symbol } = await params
  const slug = symbol.toLowerCase()
  if (!SLUG_META[slug]) redirect('/analysis')

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
      <Navbar />
      <DetailClient slug={slug} />
    </div>
  )
}
