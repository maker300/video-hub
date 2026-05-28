import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

type Params = { params: Promise<{ id: string }> }

// PATCH — update user name / email / role / password
export async function PATCH(req: Request, { params }: Params) {
  try {
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    let body: { name?: string; email?: string; role?: string; password?: string; teamBalanceBtc?: number } = {}
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (body.name  !== undefined) data.name  = body.name?.trim() || null
    if (body.email !== undefined) data.email = body.email.trim().toLowerCase()
    if (body.role  !== undefined) {
      const ALLOWED_ROLES = ['user', 'team', 'admin']
      if (!ALLOWED_ROLES.includes(body.role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      data.role = body.role
    }
    if (body.teamBalanceBtc !== undefined) {
      const v = Number(body.teamBalanceBtc)
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: 'teamBalanceBtc must be a non-negative number' }, { status: 400 })
      }
      data.teamBalanceBtc = v
    }

    if (body.password) {
      if (body.password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
      }
      data.password = await bcrypt.hash(body.password, 12)
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const user = await prisma.user.update({ where: { id }, data })
    return NextResponse.json({ ok: true, id: user.id })
  } catch (err) {
    console.error('[admin/users PATCH]', err)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// DELETE — remove a user and all their data
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id } = await params
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/users DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
