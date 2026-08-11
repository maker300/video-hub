import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import CalendarAdminClient from './CalendarAdminClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Calendar Figures — Admin' }

export default async function CalendarAdminPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/auth/signin?callbackUrl=/admin/calendar')
  if ((session.user as { role?: string }).role !== 'admin') redirect('/analysis')
  return <CalendarAdminClient />
}
