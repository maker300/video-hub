import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import DetailClient from './DetailClient'
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

export default async function SymbolPage({ params }: { params: Promise<{ symbol: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin?callbackUrl=/analysis')

  const { symbol } = await params
  const slug = symbol.toLowerCase()
  if (!SLUG_META[slug]) redirect('/analysis')

  // Analysis pages are open to any signed-in user. Access used to be sold as a
  // timed plan (AnalysisAccess); the product now charges per FM Trader run
  // instead, so gating the charts as well would be a second paywall over
  // something that costs nothing to serve. Existing admin-granted AnalysisAccess
  // rows are left in place and simply no longer consulted here.

  return (
    <div className="min-h-screen bg-[#0A0F1E]">
      <Navbar />
      <DetailClient slug={slug} />
    </div>
  )
}
