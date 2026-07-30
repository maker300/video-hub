// Admin: per-image actions on lesson images.
//
//   PATCH  /api/admin/lesson-images/[id]   body: { status: 'approved'|'rejected'|'pending', rejectReason? }
//                                           or  { regenerate: true } — re-runs Imagen with the stored prompt
//   DELETE /api/admin/lesson-images/[id]   removes the row entirely
import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { generateLessonImage } from '@/lib/imagen'
import { getPerfFlags } from '@/lib/perf-flags'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => ({})) as {
    status?:       'approved' | 'rejected' | 'pending'
    rejectReason?: string
    regenerate?:   boolean
    style?:        'whiteboard' | 'photoreal'   // optional — switch style on regenerate
  }

  const existing = await prisma.lessonImage.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Image not found' }, { status: 404 })

  if (body.regenerate) {
    // Same kill-switch as the batch generate route — block new Imagen calls
    // but leave the existing image (and its approval status) intact.
    const flags = await getPerfFlags()
    if (!flags.lessonImageGen) {
      return NextResponse.json({
        error: 'Lesson image generation is currently disabled by admin to manage CPU / Imagen API cost.',
      }, { status: 503 })
    }
    try {
      // Look up lesson title for whiteboard scene context
      const { courseModules } = await import('@/lib/courseData')
      let lessonTitle = ''
      for (const m of courseModules) {
        const l = m.lessons.find(x => x.id === existing.lessonId)
        if (l) { lessonTitle = l.title; break }
      }
      const style: 'whiteboard' | 'photoreal' =
        body.style === 'photoreal' || body.style === 'whiteboard'
          ? body.style
          : (existing.style === 'photoreal' ? 'photoreal' : 'whiteboard')
      const img = await generateLessonImage(existing.prompt, style, lessonTitle)
      const updated = await prisma.lessonImage.update({
        where: { id },
        data: {
          imageData:    new Uint8Array(img.data),
          mimeType:     img.mimeType,
          prompt:       img.prompt,
          style,
          status:       'pending',
          rejectReason: null,
        },
        select: { id: true, status: true, style: true, updatedAt: true },
      })
      return NextResponse.json({ image: updated })
    } catch (e) {
      return NextResponse.json({ error: 'Regenerate failed: ' + String(e) }, { status: 500 })
    }
  }

  if (body.status && !['approved', 'rejected', 'pending'].includes(body.status)) {
    return NextResponse.json({ error: 'invalid status' }, { status: 400 })
  }
  const updated = await prisma.lessonImage.update({
    where: { id },
    data: {
      status:       body.status ?? existing.status,
      rejectReason: body.status === 'rejected' ? (body.rejectReason ?? null) : null,
    },
    select: { id: true, status: true, rejectReason: true, updatedAt: true },
  })
  return NextResponse.json({ image: updated })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  await prisma.lessonImage.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
