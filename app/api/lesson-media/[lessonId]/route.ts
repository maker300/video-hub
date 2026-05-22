import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lessonId: rawId } = await params
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(rawId)) {
    return NextResponse.json({ cached: false })
  }

  const record = await prisma.lessonAudio.findUnique({
    where:  { lessonId: rawId },
    select: { cuePoints: true, totalFrames: true },
  })

  if (!record) return NextResponse.json({ cached: false })

  return NextResponse.json({
    cached:      true,
    audioUrl:    `/api/audio/${rawId}`,
    cuePoints:   record.cuePoints,
    totalFrames: record.totalFrames,
  })
}
