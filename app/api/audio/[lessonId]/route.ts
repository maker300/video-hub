import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ lessonId: string }> }

// Serve lesson audio from DB with Range-request support so browsers can seek.
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse('Unauthorized', { status: 401 })

  const { lessonId: rawId } = await params
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(rawId)) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  const record = await prisma.lessonAudio.findUnique({
    where:  { lessonId: rawId },
    select: { audioData: true, hash: true },
  })

  if (!record) return new NextResponse('Not Found', { status: 404 })

  const etag = `"${record.hash}"`
  if (req.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } })
  }

  // Prisma returns Bytes as Buffer; convert to Uint8Array for the Response body
  const audio = new Uint8Array(record.audioData as Buffer)
  const total = audio.byteLength

  // Auto-detect format: WAV files start with 'RIFF' (0x52 0x49 0x46 0x46)
  const isWav = audio[0] === 0x52 && audio[1] === 0x49 && audio[2] === 0x46 && audio[3] === 0x46
  const contentType = isWav ? 'audio/wav' : 'audio/mpeg'

  const rangeHeader = req.headers.get('range')
  if (rangeHeader) {
    const [startStr, endStr] = rangeHeader.replace('bytes=', '').split('-')
    let start = parseInt(startStr, 10)
    let end   = endStr ? parseInt(endStr, 10) : total - 1
    if (!Number.isFinite(start) || start < 0)   start = 0
    if (!Number.isFinite(end)   || end >= total) end   = total - 1
    if (start > end)                             start = 0
    const chunk = audio.slice(start, end + 1)

    return new NextResponse(chunk, {
      status: 206,
      headers: {
        'Content-Type':   contentType,
        'Content-Range':  `bytes ${start}-${end}/${total}`,
        'Accept-Ranges':  'bytes',
        'Content-Length': String(chunk.byteLength),
        'Cache-Control':  'private, max-age=300, must-revalidate',
        ETag:             etag,
      },
    })
  }

  return new NextResponse(audio, {
    status: 200,
    headers: {
      'Content-Type':   contentType,
      'Accept-Ranges':  'bytes',
      'Content-Length': String(total),
      'Cache-Control':  'private, max-age=300, must-revalidate',
      ETag:             etag,
    },
  })
}
