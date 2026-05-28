// /analysis/live-trades — admin-approved tradeable positions for team users
// Access: admin + team only. Other roles redirect to /analysis.
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import LiveTradesClient from './LiveTradesClient'

export const dynamic = 'force-dynamic'

export default async function LiveTradesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/auth/signin?callbackUrl=/analysis/live-trades')

  const role = (session.user as { role?: string }).role
  if (role !== 'admin' && role !== 'team') redirect('/analysis')

  return <LiveTradesClient isAdmin={role === 'admin'} />
}
