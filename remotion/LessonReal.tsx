// Dev harness: the real LessonVideo composition driven by real lesson text,
// with cue timing approximated from word counts (the live site gets exact
// timing from the TTS cue points). Lets a whole lesson be scrubbed and
// rendered frame by frame before shipping.
//
//   npx remotion still LessonReal out.png --frame=900 --props='{"lessonIdx":0}'
import React from 'react'
import { LessonVideo } from './compositions/LessonVideo'
import { courseModules } from '../lib/courseData'
import { parseHtmlContent, buildNarrationSegments } from '../lib/lessonParser'
import type { SlideCue } from '../lib/lessonParser'

const FPS = 30

export function lessonCues(lessonIdx: number) {
  const flat: { m: any; l: any }[] = []
  for (const m of courseModules) for (const l of m.lessons) flat.push({ m, l })
  const { m, l } = flat[lessonIdx % flat.length]
  const x = l as any
  const segs = buildNarrationSegments(
    x.title, m.title, parseHtmlContent(x.content ?? ''),
    x.keyPoints ?? [], x.terms ?? [], x.caution,
  )
  const cues: SlideCue[] = []
  let f = 0
  for (const s of segs) {
    const words = (s.spokenText ?? s.body ?? '').split(/\s+/).filter(Boolean).length
    const frames = Math.max(Math.round((words / 2.6) * FPS), 60)   // ~2.6 words/sec
    cues.push({ type: s.type, heading: s.heading, body: s.body, meta: s.meta, startFrame: f, endFrame: f + frames })
    f += frames
  }
  return { cues, total: f, title: x.title, moduleTitle: m.title, lesson: x, module: m }
}

export const LessonReal: React.FC<{ lessonIdx: number }> = ({ lessonIdx }) => {
  const { cues, title, moduleTitle, lesson, module } = lessonCues(lessonIdx)
  return (
    <LessonVideo
      lessonTitle={title}
      moduleTitle={moduleTitle}
      moduleNumber={(module as any).moduleNumber ?? 1}
      lessonNumber={(lesson as any).lessonNumber ?? 1}
      cuePoints={cues}
    />
  )
}
