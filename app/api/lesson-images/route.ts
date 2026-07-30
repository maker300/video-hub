// Public endpoint — returns APPROVED lesson images for Video Hub to consume.
// Secured by FM_SCRIPT_API_KEY header (same key used by /api/trade-scripts).
//
//   GET /api/lesson-images                 → all approved images, grouped by lesson
//   GET /api/lesson-images?lessonId=X      → approved images for one lesson only
//
// Image bytes are served separately via /api/lesson-images/[id]/file so this
// listing stays light. Video Hub iterates the response, fetches each file URL,
// and places it on the timeline at `timestampMs`.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkScriptKey } from '@/lib/scriptAuth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url    = new URL(req.url)
  if (!checkScriptKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const lessonId = url.searchParams.get('lessonId')

  const where = lessonId ? { status: 'approved', lessonId } : { status: 'approved' }
  const rows = await prisma.lessonImage.findMany({
    where,
    orderBy: [{ lessonId: 'asc' }, { segmentIndex: 'asc' }],
    select: {
      id: true, lessonId: true, moduleId: true, segmentIndex: true,
      timestampMs: true, prompt: true, mimeType: true,
      createdAt: true, updatedAt: true,
    },
  })

  // Annotate each row with the public file URL so Video Hub can fetch directly.
  const images = rows.map(r => ({
    ...r,
    fileUrl: `/api/lesson-images/${r.id}/file`,
  }))
  return NextResponse.json({ images })
}
