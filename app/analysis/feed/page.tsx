import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import FeedClient from './FeedClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Trader Feed — Forex Mastery',
  description: 'Share trades and ideas with other traders, and see macro releases as they land.',
}

export default async function FeedPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/auth/signin?callbackUrl=/analysis/feed')
  return <FeedClient />
}
