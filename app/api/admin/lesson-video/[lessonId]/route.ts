// Admin-only download of a rendered lesson MP4.
//
// Files live in rendered-videos/ at the repo root, NOT in public/ — anything
// under public/ is served statically by Next with no auth at all, which would
// defeat the point of gating this.
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getSessionInfo } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const { role } = await getSessionInfo()
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { lessonId } = await params
  // Path is built from user input, so refuse anything that isn't a plain id.
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(lessonId)) {
    return NextResponse.json({ error: 'Bad lesson id' }, { status: 400 })
  }

  const file = path.join(process.cwd(), 'rendered-videos', `${lessonId}.mp4`)
  if (!fs.existsSync(file)) {
    return NextResponse.json({
      error: 'not-rendered',
      message: `No MP4 has been rendered for ${lessonId} yet.`,
      command: `node scripts/render-lesson.mjs ${lessonId}`,
    }, { status: 404 })
  }

  const stat = fs.statSync(file)
  const stream = fs.createReadStream(file) as unknown as ReadableStream

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(stat.size),
      'Content-Disposition': `attachment; filename="${lessonId}.mp4"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
