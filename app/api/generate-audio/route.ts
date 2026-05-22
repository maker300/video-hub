import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import {
  parseHtmlContent,
  buildNarrationSegments,
  type SlideCue,
  type KeyPointScript,
  type TermScript,
} from '@/lib/lessonParser'
import { generateAllSegmentAudio, concatSegmentsToWav } from '@/lib/tts'

export const maxDuration = 60

const FPS = 30

function sanitizeLessonId(id: string): string | null {
  if (typeof id !== 'string') return null
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) return null
  return id
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json() as {
      lessonId:      string
      lessonTitle:   string
      moduleTitle?:  string
      lessonContent?: string
      keyPoints?:    KeyPointScript[]
      terms?:        TermScript[]
      caution?:      string
    }

    const {
      lessonTitle,
      moduleTitle   = '',
      lessonContent = '',
      keyPoints     = [],
      terms         = [],
      caution,
    } = body

    const lessonId = sanitizeLessonId(body.lessonId)
    if (!lessonId) return NextResponse.json({ error: 'Invalid lessonId' }, { status: 400 })

    const contentSections = parseHtmlContent(lessonContent)
    const segments        = buildNarrationSegments(
      lessonTitle, moduleTitle, contentSections, keyPoints, terms, caution,
    )

    const fullScript = segments.map(s => s.spokenText).join(' ')
    const hash       = crypto.createHash('sha256').update(fullScript).digest('hex').slice(0, 12)

    // ── Check DB cache ──────────────────────────────────────────────────────
    const cached = await prisma.lessonAudio.findUnique({
      where:  { lessonId },
      select: { hash: true, cuePoints: true, totalFrames: true },
    })

    if (cached && cached.hash === hash) {
      return NextResponse.json({
        url:        `/api/audio/${lessonId}`,
        cuePoints:  cached.cuePoints,
        totalFrames: cached.totalFrames,
        cached:     true,
      })
    }

    // ── Generate via Google Cloud TTS ──────────────────────────────────────
    let audioResults: Awaited<ReturnType<typeof generateAllSegmentAudio>>
    try {
      audioResults = await generateAllSegmentAudio(segments.map(s => s.spokenText))
    } catch (ttsErr) {
      console.error('[generate-audio] TTS error:', ttsErr)
      const msg = String(ttsErr)
      const fallbackCues = buildFallbackCues(segments)
      return NextResponse.json({
        url:        null,
        cuePoints:  fallbackCues,
        totalFrames: fallbackCues[fallbackCues.length - 1]?.endFrame ?? 0,
        error:      msg,
      })
    }

    if (!audioResults) {
      const fallbackCues = buildFallbackCues(segments)
      return NextResponse.json({
        url:        null,
        cuePoints:  fallbackCues,
        totalFrames: fallbackCues[fallbackCues.length - 1]?.endFrame ?? 0,
        error:      process.env.GOOGLE_TTS_API_KEY
          ? 'Google TTS rate-limited — slides will play without audio.'
          : 'GOOGLE_TTS_API_KEY not configured',
      })
    }

    // ── Build cue points from real audio durations ─────────────────────────
    const cuePoints: SlideCue[] = []
    let cursor = 0
    for (let i = 0; i < segments.length; i++) {
      const frames = Math.ceil(audioResults[i].durationSeconds * FPS)
      cuePoints.push({
        type:       segments[i].type,
        heading:    segments[i].heading,
        body:       segments[i].body,
        meta:       segments[i].meta,
        startFrame: cursor,
        endFrame:   cursor + frames,
      })
      cursor += frames
    }
    const totalFrames = cursor

    // ── Persist to DB (upsert so hash changes refresh the record) ──────────
    const audioData = new Uint8Array(concatSegmentsToWav(audioResults))
    const cueJson = cuePoints as unknown as Prisma.InputJsonValue
    await prisma.lessonAudio.upsert({
      where:  { lessonId },
      create: { lessonId, hash, audioData, cuePoints: cueJson, totalFrames },
      update: { hash, audioData, cuePoints: cueJson, totalFrames },
    })

    return NextResponse.json({
      url:        `/api/audio/${lessonId}`,
      cuePoints,
      totalFrames,
      cached:     false,
    })
  } catch (err) {
    console.error('[generate-audio]', err)
    return NextResponse.json({ url: null, cuePoints: [], totalFrames: 0, error: String(err) })
  }
}

function estimateSegmentSeconds(spokenText: string): number {
  const words = spokenText.split(/\s+/).filter(Boolean).length
  return Math.max(2, (words / 130) * 60 * 1.05)
}

function buildFallbackCues(segments: ReturnType<typeof buildNarrationSegments>): SlideCue[] {
  const cues: SlideCue[] = []
  let cursor = 0
  for (const seg of segments) {
    const frames = Math.ceil(estimateSegmentSeconds(seg.spokenText) * FPS)
    cues.push({
      type:       seg.type,
      heading:    seg.heading,
      body:       seg.body,
      meta:       seg.meta,
      startFrame: cursor,
      endFrame:   cursor + frames,
    })
    cursor += frames
  }
  return cues
}
