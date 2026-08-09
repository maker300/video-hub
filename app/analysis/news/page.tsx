// /analysis/news — FM News agent feed: macro prints and what's scheduled next.
// Access: any signed-in user. Macro releases are public information and there is
// no reason to gate them behind the analysis subscription.
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import NewsFeedClient from './NewsFeedClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Economic Calendar & Macro Releases — Forex Mastery',
  description: 'CPI, PPI, employment and rate decisions as they print, with the instruments each release has exposure to.',
}

export default async function NewsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/auth/signin?callbackUrl=/analysis/news')

  return <NewsFeedClient />
}
