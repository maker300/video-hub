// Admin-only image bytes (used for thumbnails in the Lesson Images tab).
// Public consumer should hit /api/lesson-images/[id]/file instead.
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const row = await prisma.lessonImage.findUnique({
    where:  { id },
    select: { imageData: true, mimeType: true },
  })
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return new NextResponse(new Uint8Array(row.imageData), {
    headers: {
      'Content-Type':  row.mimeType,
      'Cache-Control': 'private, max-age=300',
    },
  })
}
