import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

const db = prisma as any
type Params = { params: Promise<{ id: string }> }

// PATCH — update status / add admin note / send reply
export async function PATCH(req: Request, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  let body: { status?: string; adminNote?: string; priority?: string; adminReply?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowed_statuses   = ['open', 'in_progress', 'resolved']
  const allowed_priorities = ['low', 'normal', 'high']

  const data: Record<string, unknown> = {}
  if (body.status    && allowed_statuses.includes(body.status))    data.status    = body.status
  if (body.priority  && allowed_priorities.includes(body.priority)) data.priority  = body.priority
  if (body.adminNote !== undefined) data.adminNote = body.adminNote?.slice(0, 2000) ?? null

  if (body.status === 'resolved') {
    data.resolvedAt = new Date()
  } else if (body.status && body.status !== 'resolved') {
    data.resolvedAt = null
  }

  // Admin reply to user
  if (body.adminReply !== undefined && body.adminReply.trim()) {
    data.adminReply = body.adminReply.slice(0, 5000)
    data.repliedAt  = new Date()
    data.replyRead  = false
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  try {
    const ticket = await db.supportTicket.update({ where: { id }, data })

    return NextResponse.json({ ok: true, ticket })
  } catch (err) {
    console.error('[admin/support PATCH]', err)
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  try {
    await db.supportTicket.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/support DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 })
  }
}

