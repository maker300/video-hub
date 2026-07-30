// Lesson script segmentation + synthetic timestamps.
//
// We reuse `buildNarrationSegments` from the existing audio pipeline so the
// image timeline matches the (currently optional) audio timeline. Timestamps
// are computed from word counts at a fixed reading rate — no audio generation
// is required to know when each segment plays.
//
// Reading rate of 150 words/min is the editorial-narration baseline. Plus
// 0.4s of pause between segments (mirrors what TTS adds between paragraphs).

import { buildNarrationSegments, parseHtmlContent, type ScriptSegment } from '@/lib/lessonParser'
import type { Lesson } from '@/types'

const WORDS_PER_MIN  = 150
const PAUSE_SECONDS  = 0.4

export interface TimestampedSegment {
  segmentIndex: number
  startMs:      number
  endMs:        number
  durationMs:   number
  type:         ScriptSegment['type']
  heading:      string
  body:         string
  meta?:        string
  spokenText:   string
}

/** Estimate spoken duration of a string (ms). */
function durationMsForText(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length
  if (words === 0) return 800   // bare minimum for empty-ish segments (section headers)
  const seconds = (words / WORDS_PER_MIN) * 60
  return Math.max(900, Math.round(seconds * 1000))
}

/**
 * Build a list of timestamped segments for a lesson. Each segment includes the
 * start/end ms within the lesson timeline, plus the spokenText that should
 * drive its image-generation prompt.
 *
 * Use the same Lesson row that backs `/course/[moduleId]/[lessonId]`. We pull
 * title/content from the row — keyPoints/terms/caution are intentionally not
 * exposed on the Lesson type yet (the existing buildNarrationSegments handles
 * them but they're not on the canonical schema). We pass empty arrays so the
 * segment list matches what's displayed on the lesson page.
 */
export function buildTimestampedSegments(lesson: Lesson, moduleTitle: string): TimestampedSegment[] {
  const contentSections = parseHtmlContent(lesson.content ?? '')
  const segs            = buildNarrationSegments(lesson.title, moduleTitle, contentSections, [], [])

  const out: TimestampedSegment[] = []
  let cursorMs = 0
  for (let i = 0; i < segs.length; i++) {
    const s          = segs[i]
    const durationMs = durationMsForText(s.spokenText)
    const startMs    = cursorMs
    const endMs      = startMs + durationMs
    out.push({
      segmentIndex: i,
      startMs,
      endMs,
      durationMs,
      type:         s.type,
      heading:      s.heading,
      body:         s.body,
      meta:         s.meta,
      spokenText:   s.spokenText,
    })
    cursorMs = endMs + Math.round(PAUSE_SECONDS * 1000)
  }
  return out
}

/** Format ms as [mm:ss] for display next to a segment. */
export function fmtTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
