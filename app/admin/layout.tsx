// Server-side admin guard — runs before the page is ever rendered.
// The admin page.tsx itself is 'use client' so its role check is client-only.
// This layout enforces auth on the server so no HTML is ever delivered to non-admins.
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/adminAuth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) redirect('/')
  return <>{children}</>
}
