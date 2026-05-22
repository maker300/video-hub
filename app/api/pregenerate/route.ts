import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { courseModules } from '@/lib/courseData'
import { parseHtmlContent, buildNarrationSegments } from '@/lib/lessonParser'
import { generateAllSegmentAudio, concatSegmentsToWav } from '@/lib/tts'
import type { SlideCue } from '@/lib/lessonParser'

export const maxDuration = 300

const FPS = 30

export async function GET(req: NextRequest) {
  const { isAdmin } = await getAdminSession()
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const onlyLesson = req.nextUrl.searchParams.get('lesson')
  const onlyModule = req.nextUrl.searchParams.get('module')

  const allLessons = courseModules.flatMap(mod =>
    mod.lessons.map(l => ({ ...l, moduleTitle: mod.title, moduleNumber: mod.moduleNumber }))
  )
  const targets = allLessons.filter(l => {
    if (onlyLesson && l.id !== onlyLesson) return false
    if (onlyModule && String(l.moduleId) !== `module-${onlyModule}`) return false
    return true
  })

  // Fetch all already-cached lesson IDs from DB
  const existingRecords = await prisma.lessonAudio.findMany({
    where:  { lessonId: { in: targets.map(l => l.id) } },
    select: { lessonId: true, hash: true },
  })
  const cachedMap = new Map(existingRecords.map((r: { lessonId: string; hash: string }) => [r.lessonId, r.hash]))

  const encoder = new TextEncoder()
  const stream  = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
      }

      send({ type: 'start', total: targets.length, cached: cachedMap.size })

      let generated = 0, skipped = 0, failed = 0, quotaExhausted = false

      for (const lesson of targets) {
        if (quotaExhausted) {
          failed++
          send({ type: 'skip', lessonId: lesson.id, title: lesson.title, skipped, reason: 'quota_exhausted' })
          continue
        }

        const contentSections = parseHtmlContent(lesson.content)
        const segments        = buildNarrationSegments(
          lesson.title, lesson.moduleTitle, contentSections, [], [], undefined,
        )
        const fullScript = segments.map(s => s.spokenText).join(' ')
        const hash       = crypto.createHash('sha256').update(fullScript).digest('hex').slice(0, 12)

        // Skip if DB cache is still valid (same content hash)
        if (cachedMap.get(lesson.id) === hash) {
          skipped++
          send({ type: 'skip', lessonId: lesson.id, title: lesson.title, skipped })
          continue
        }

        send({ type: 'progress', lessonId: lesson.id, title: lesson.title, status: 'generating' })

        try {
          const audioResults = await generateAllSegmentAudio(segments.map(s => s.spokenText))

          if (!audioResults) {
            send({ type: 'error', lessonId: lesson.id, title: lesson.title,
              error: 'GOOGLE_TTS_API_KEY not configured or rate-limited' })
            failed++
            continue
          }

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

          const audioData = new Uint8Array(concatSegmentsToWav(audioResults))
          const cueJson   = cuePoints as unknown as Prisma.InputJsonValue
          await prisma.lessonAudio.upsert({
            where:  { lessonId: lesson.id },
            create: { lessonId: lesson.id, hash, audioData, cuePoints: cueJson, totalFrames },
            update: { hash, audioData, cuePoints: cueJson, totalFrames },
          })

          generated++
          send({
            type:        'done',
            lessonId:    lesson.id,
            title:       lesson.title,
            audioUrl:    `/api/audio/${lesson.id}`,
            slides:      cuePoints.length,
            totalFrames,
            durationSecs: Math.round(totalFrames / FPS),
            generated,
          })
        } catch (err) {
          const msg = String(err)
          if (msg.includes('429')) {
            quotaExhausted = true
            send({ type: 'error', lessonId: lesson.id, title: lesson.title,
              error: 'Google TTS rate-limited — wait a moment and try again' })
          } else {
            failed++
            send({ type: 'error', lessonId: lesson.id, title: lesson.title, error: msg })
          }
        }
      }

      send({ type: 'complete', generated, skipped, failed, total: targets.length })
      controller.close()
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type':      'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'X-Accel-Buffering': 'no',
      'Cache-Control':     'no-cache',
    },
  })
}
