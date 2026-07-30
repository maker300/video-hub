// Admin endpoint — generate or view a lesson's video manifest.
//
//   GET  /api/admin/lesson-manifest/[lessonId]    → returns the stored manifest (or 404)
//   POST /api/admin/lesson-manifest/[lessonId]    → Claude rebuilds the plan and saves
//   PATCH /api/admin/lesson-manifest/[lessonId]   → body { status: 'approved' | 'draft' }
import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { buildManifestForLesson, getStoredManifest } from '@/lib/lesson-manifest'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

type Params = { params: Promise<{ lessonId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { lessonId } = await params
  const manifest = await getStoredManifest(lessonId)
  if (!manifest) return NextResponse.json({ error: 'No manifest yet — POST to generate' }, { status: 404 })
  const row = await prisma.lessonVideoManifest.findUnique({ where: { lessonId }, select: { status: true, updatedAt: true } })
  return NextResponse.json({ manifest, status: row?.status ?? 'draft', updatedAt: row?.updatedAt })
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { lessonId } = await params
  const manifest = await buildManifestForLesson(lessonId)
  if (!manifest) return NextResponse.json({ error: 'Lesson not found or has no segments' }, { status: 404 })
  return NextResponse.json({ manifest })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { lessonId } = await params
  const body = await req.json().catch(() => ({})) as { status?: 'approved' | 'draft' }
  if (body.status !== 'approved' && body.status !== 'draft') {
    return NextResponse.json({ error: 'status must be approved or draft' }, { status: 400 })
  }
  const updated = await prisma.lessonVideoManifest.update({
    where:  { lessonId },
    data:   { status: body.status },
    select: { status: true, updatedAt: true },
  })
  return NextResponse.json({ ok: true, status: updated.status, updatedAt: updated.updatedAt })
}
