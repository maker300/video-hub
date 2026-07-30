// Public image bytes — only returns APPROVED rows. Same API-key gate as the
// listing endpoint. Video Hub fetches each image via this URL.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkScriptKey } from '@/lib/scriptAuth'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  const url    = new URL(req.url)
  if (!checkScriptKey(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const row = await prisma.lessonImage.findUnique({
    where:  { id },
    select: { imageData: true, mimeType: true, status: true },
  })
  if (!row || row.status !== 'approved') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return new NextResponse(new Uint8Array(row.imageData), {
    headers: {
      'Content-Type':  row.mimeType,
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
