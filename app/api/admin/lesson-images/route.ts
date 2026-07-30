// Admin: list + generate lesson images.
//
//   GET  /api/admin/lesson-images?lessonId=X  → all images for a lesson
//   GET  /api/admin/lesson-images?summary=1   → per-lesson counts for the sidebar
//   POST /api/admin/lesson-images?lessonId=X  → generate one image per segment
//                                               body: { segmentIndex?: number }   (omit to do all)
//
// Image bytes are NOT included in list responses (too heavy). The UI fetches
// `/api/admin/lesson-images/[id]/file` for thumbnails.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { courseModules, getLessonById } from '@/lib/courseData'
import { buildTimestampedSegments } from '@/lib/lesson-segments-with-timestamps'
import { generateLessonImage } from '@/lib/imagen'
import { getPerfFlags } from '@/lib/perf-flags'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url       = new URL(req.url)
  const summary   = url.searchParams.get('summary') === '1'
  const lessonId  = url.searchParams.get('lessonId')

  if (summary) {
    // Per-lesson counts for the sidebar — show pending/approved/rejected per lesson
    const rows = await prisma.lessonImage.groupBy({
      by: ['lessonId', 'status'],
      _count: { _all: true },
    })
    const map: Record<string, { pending: number; approved: number; rejected: number; total: number }> = {}
    for (const r of rows) {
      const k = r.lessonId
      if (!map[k]) map[k] = { pending: 0, approved: 0, rejected: 0, total: 0 }
      const status = r.status as 'pending' | 'approved' | 'rejected'
      map[k][status] = r._count._all
      map[k].total  += r._count._all
    }
    // Flatten all lessons in course order so the sidebar can list everything
    const lessons: Array<{ moduleId: string; moduleTitle: string; lessonId: string; lessonTitle: string }> = []
    for (const m of courseModules) {
      for (const l of m.lessons) {
        lessons.push({ moduleId: m.id, moduleTitle: m.title, lessonId: l.id, lessonTitle: l.title })
      }
    }
    return NextResponse.json({ lessons, counts: map })
  }

  if (!lessonId) return NextResponse.json({ error: 'lessonId or summary=1 required' }, { status: 400 })

  const images = await prisma.lessonImage.findMany({
    where:   { lessonId },
    orderBy: { segmentIndex: 'asc' },
    select: {
      id: true, lessonId: true, moduleId: true, segmentIndex: true,
      timestampMs: true, prompt: true, mimeType: true, style: true,
      status: true, rejectReason: true, createdAt: true, updatedAt: true,
    },
  })
  return NextResponse.json({ images })
}

export async function POST(req: NextRequest) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Admin kill-switch — when off, block new Imagen calls but leave existing
  // approved images intact so Video Hub keeps serving the current timeline.
  const flags = await getPerfFlags()
  if (!flags.lessonImageGen) {
    return NextResponse.json({
      error: 'Lesson image generation is currently disabled by admin to manage CPU / Imagen API cost.',
    }, { status: 503 })
  }

  const url = new URL(req.url)
  const lessonId = url.searchParams.get('lessonId')
  if (!lessonId) return NextResponse.json({ error: 'lessonId required' }, { status: 400 })

  const body = await req.json().catch(() => ({})) as {
    segmentIndex?: number
    replace?:      boolean
    style?:        'whiteboard' | 'photoreal'   // default 'whiteboard' (Claude+Rough.js, no Google API)
  }
  const onlyIndex = typeof body.segmentIndex === 'number' ? body.segmentIndex : null
  const style: 'whiteboard' | 'photoreal' = body.style === 'photoreal' ? 'photoreal' : 'whiteboard'

  // Find the lesson + module (we need both for moduleId + module title)
  let resolved: { moduleId: string; moduleTitle: string; lesson: ReturnType<typeof getLessonById> } | null = null
  for (const m of courseModules) {
    const lesson = m.lessons.find(l => l.id === lessonId)
    if (lesson) {
      resolved = { moduleId: m.id, moduleTitle: m.title, lesson: { lesson, module: m } }
      break
    }
  }
  if (!resolved?.lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })

  const segments = buildTimestampedSegments(resolved.lesson.lesson, resolved.moduleTitle)
  const targets  = onlyIndex !== null ? segments.filter(s => s.segmentIndex === onlyIndex) : segments
  if (targets.length === 0) return NextResponse.json({ error: 'No segments to generate' }, { status: 400 })

  const generated: Array<{ segmentIndex: number; id: string }> = []
  const failed:    Array<{ segmentIndex: number; error:  string }> = []

  for (const seg of targets) {
    try {
      const img = await generateLessonImage(seg.spokenText, style, resolved.lesson.lesson.title)
      // Upsert by (lessonId, segmentIndex) — if a row already exists, replace its bytes & reset to pending
      const existing = await prisma.lessonImage.findFirst({
        where:  { lessonId, segmentIndex: seg.segmentIndex },
        select: { id: true },
      })
      const data = {
        lessonId,
        moduleId:     resolved.moduleId,
        segmentIndex: seg.segmentIndex,
        timestampMs:  seg.startMs,
        prompt:       img.prompt,
        // Prisma's Bytes column expects Uint8Array<ArrayBuffer>, not Node Buffer.
        imageData:    new Uint8Array(img.data),
        mimeType:     img.mimeType,
        style,
        status:       'pending',
        rejectReason: null,
      }
      const saved = existing
        ? await prisma.lessonImage.update({ where: { id: existing.id }, data })
        : await prisma.lessonImage.create({ data })
      generated.push({ segmentIndex: seg.segmentIndex, id: saved.id })
    } catch (e) {
      failed.push({ segmentIndex: seg.segmentIndex, error: String(e) })
    }
  }

  return NextResponse.json({ generated: generated.length, failed, lessonId })
}
