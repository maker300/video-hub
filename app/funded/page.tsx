import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import FundedClient from './FundedClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title:       'Funded Account Evaluation — Forex Mastery',
  description: 'Trade a £25,000 simulated account. Pass the evaluation and trade our capital on an 80% profit split.',
}

export default async function FundedPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/auth/signin?callbackUrl=/funded')
  return <FundedClient />
}
