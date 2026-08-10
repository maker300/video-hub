import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id:            true,
        name:          true,
        email:         true,
        role:          true,
        teamBalanceBtc: true,
        tokenBalance:  true,
        password:      true,
        createdAt:     true,
        emailVerified: true,
        image:         true,
        lastSeenAt:    true,
        accounts:        { select: { provider: true } },
        progress:        { select: { id: true, completed: true } },
        subscription:    { select: { plan: true, status: true } },
        analysisAccess:  true,
      },
    })

    const sanitised = users.map(({ password, ...u }: { password: string | null; [key: string]: unknown }) => ({
      ...u,
      hasPassword: !!password,
    }))

    return NextResponse.json(sanitised)
  } catch (err) {
    console.error('[admin/users GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
