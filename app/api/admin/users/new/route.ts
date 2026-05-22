import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

const SETTING_KEY = 'users_last_seen_at'

// GET — return count of users created since admin last opened the Users tab
export async function GET() {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ count: 0 }, { status: 403 })

  const setting = await prisma.adminSetting.findUnique({ where: { key: SETTING_KEY } })
  const since   = setting ? new Date(setting.value as string) : new Date(0)

  const count = await prisma.user.count({ where: { createdAt: { gt: since } } })
  return NextResponse.json({ count })
}

// POST — mark Users tab as seen (reset badge)
export async function POST() {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ ok: false }, { status: 403 })

  await prisma.adminSetting.upsert({
    where:  { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: new Date().toISOString() },
    update: { value: new Date().toISOString() },
  })
  return NextResponse.json({ ok: true })
}
