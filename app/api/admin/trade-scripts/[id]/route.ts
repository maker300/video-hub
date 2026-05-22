import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ id: string }> }

// PATCH — approve or reject a script
export async function PATCH(req: Request, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { status } = await req.json() as { status: 'approved' | 'draft' }

  const script = await prisma.tradeScript.update({
    where: { id },
    data: {
      status,
      approvedAt: status === 'approved' ? new Date() : null,
    },
  })
  return NextResponse.json(script)
}

// DELETE — remove a script
export async function DELETE(_req: Request, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await prisma.tradeScript.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
