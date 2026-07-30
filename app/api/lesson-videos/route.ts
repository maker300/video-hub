// Public Video-Hub manifest listing.
//
//   GET /api/lesson-videos                 → all APPROVED manifests, summary form
//   GET /api/lesson-videos?lessonId=X      → one full manifest (also approved-only)
//
// Auth: same x-api-key header as /api/trade-scripts and /api/lesson-images.
// Image URLs in manifest segments resolve via /api/lesson-images/[id]/file.
// Motion graphic refs are component names — Video Hub looks them up in its
// own copy of /remotion/stills.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { LessonManifest } from '@/lib/lesson-manifest'
import { checkScriptKey } from '@/lib/scriptAuth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url      = new URL(req.url)
  if (!checkScriptKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lessonId = url.searchParams.get('lessonId')

  // Compute baseUrl so Video Hub doesn't have to know our host — every
  // relative imageUrl in the manifest can be resolved against this.
  const proto    = req.headers.get('x-forwarded-proto') ?? 'https'
  const host     = req.headers.get('host') ?? url.host
  const baseUrl  = `${proto}://${host}`

  if (lessonId) {
    const row = await prisma.lessonVideoManifest.findUnique({ where: { lessonId } })
    if (!row || row.status !== 'approved') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({
      baseUrl,
      manifest:  row.plan as unknown as LessonManifest,
      updatedAt: row.updatedAt,
    })
  }

  const rows = await prisma.lessonVideoManifest.findMany({
    where:   { status: 'approved' },
    orderBy: { updatedAt: 'desc' },
    select:  { lessonId: true, moduleId: true, plan: true, updatedAt: true },
  })
  // Light summary — Video Hub will pull the full manifest per-lesson when needed.
  return NextResponse.json({
    baseUrl,
    lessons: rows.map(r => {
      const p = r.plan as unknown as LessonManifest
      return {
        lessonId:        r.lessonId,
        moduleId:        r.moduleId,
        title:           p.title,
        moduleTitle:     p.moduleTitle,
        totalDurationMs: p.totalDurationMs,
        segmentCount:    p.segments.length,
        updatedAt:       r.updatedAt,
      }
    }),
  })
}
