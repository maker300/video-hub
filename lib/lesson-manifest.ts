// Lesson Video Manifest — Claude assembles a per-segment plan.
//
// Each segment in a lesson script (from `buildTimestampedSegments`) gets ONE
// asset assigned: a whiteboard image, a Remotion motion graphic, or a plain
// title slide. The output is the contract Video Hub uses to render the video.
//
//   ┌──────────────────┐
//   │ Script segments  │  buildTimestampedSegments(lesson)
//   └────────┬─────────┘
//            │
//            ▼
//   ┌──────────────────┐
//   │ Claude planner   │  per-segment: pick asset + duration
//   └────────┬─────────┘
//            │
//            ▼
//   ┌──────────────────┐
//   │ Manifest (JSON)  │  saved to LessonVideoManifest
//   └────────┬─────────┘
//            │
//            ▼     /api/lesson-videos/[lessonId]/manifest
//   ┌──────────────────┐
//   │ Video Hub render │  iterates plan, mounts components
//   └──────────────────┘

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/prisma'
import { courseModules } from '@/lib/courseData'
import { buildTimestampedSegments } from '@/lib/lesson-segments-with-timestamps'
import { catalogForPrompt, REMOTION_CATALOG } from '@/lib/remotion-catalog'
import { Prisma } from '@prisma/client'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Manifest schema (also the public response shape for Video Hub) ──────────

export type AssetPlan =
  | { type: 'whiteboard'; imageId: string;     imageUrl: string }
  | { type: 'photoreal';  imageId: string;     imageUrl: string }
  | { type: 'motion';     componentName: string }
  | { type: 'title';      heading: string }

export interface SegmentPlan {
  segmentIndex: number
  startMs:      number
  durationMs:   number
  spokenText:   string
  heading:      string
  asset:        AssetPlan
  /** Reason Claude picked this asset — useful debugging when output is unexpected. */
  rationale:    string
}

export interface LessonManifest {
  lessonId:        string
  moduleId:        string
  title:           string
  moduleTitle:     string
  totalDurationMs: number
  brandPalette:    { primary: string; accent: string; background: string; ink: string }
  segments:        SegmentPlan[]
}

const BRAND_PALETTE = {
  primary:    '#0d1b2a',  // deep navy
  accent:     '#10b981',  // emerald
  background: '#fafaf6',  // off-white (whiteboard paper)
  ink:        '#1a2233',  // sketchy black
}

// ── Claude planner ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You're a video producer assigning one visual asset to each spoken segment of a forex-trading lesson script.

Asset types available:
1. "motion" — a pre-built Remotion motion graphic (best for technical concepts: candles, indicators, patterns, charts).
2. "whiteboard" — a hand-drawn explainer image generated specifically for the segment (best for general explanations, definitions, narrative beats).
3. "title" — a plain title card (only for "section header" segment types or short transitional beats).

Motion graphics catalog (pick the EXACT name):
{{CATALOG}}

For each segment you return:
{
  "segmentIndex": <number>,
  "asset": {
    "type": "motion",
    "componentName": "<exact component name from catalog>"
  } OR {
    "type": "whiteboard"
  } OR {
    "type": "title"
  },
  "rationale": "<one sentence: why this asset for this segment>"
}

Rules:
- Section-header segments (just an "X." heading) → "title"
- Intro / outro segments → "whiteboard" (hand-drawn welcome / wrap-up)
- Segments mentioning specific named concepts that match a motion graphic → "motion"
- Everything else → "whiteboard"
- Never assign the same motion graphic twice in a row.
- The output MUST be a JSON array, one entry per segment IN ORDER. No prose, no markdown fence.`

interface PlanEntry {
  segmentIndex: number
  asset: { type: 'motion'; componentName: string } | { type: 'whiteboard' } | { type: 'title' }
  rationale: string
}

async function callClaudeForPlan(
  lessonTitle: string,
  segments:    { segmentIndex: number; type: string; heading: string; spokenText: string }[],
): Promise<PlanEntry[]> {
  const segmentsForPrompt = segments.map(s =>
    `[${s.segmentIndex}] type=${s.type} heading="${s.heading.slice(0, 60)}" text="${s.spokenText.slice(0, 180).replace(/"/g, '\'')}"`,
  ).join('\n')

  const systemFilled = SYSTEM_PROMPT.replace('{{CATALOG}}', catalogForPrompt())

  const msg = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    system:     systemFilled,
    messages: [{
      role: 'user',
      content: `Lesson: ${lessonTitle}\n\nSegments:\n${segmentsForPrompt}\n\nReturn the JSON array.`,
    }],
  })

  const text = msg.content.find(b => b.type === 'text')?.text ?? ''
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    return JSON.parse(match[0]) as PlanEntry[]
  } catch {
    return []
  }
}

// ── Public: build (or rebuild) a manifest for a lesson and persist it ───────

export async function buildManifestForLesson(lessonId: string): Promise<LessonManifest | null> {
  // Resolve lesson + module
  let moduleId  = ''
  let moduleTitle = ''
  let lessonRow: typeof courseModules[number]['lessons'][number] | null = null
  for (const m of courseModules) {
    const l = m.lessons.find(x => x.id === lessonId)
    if (l) { moduleId = m.id; moduleTitle = m.title; lessonRow = l; break }
  }
  if (!lessonRow) return null

  // Build the timestamped segment list (synthetic — no audio dependency)
  const segments = buildTimestampedSegments(lessonRow, moduleTitle)
  if (segments.length === 0) return null

  // Ask Claude to plan each segment
  const planEntries = await callClaudeForPlan(
    lessonRow.title,
    segments.map(s => ({ segmentIndex: s.segmentIndex, type: s.type, heading: s.heading, spokenText: s.spokenText })),
  )
  const planByIndex = new Map(planEntries.map(p => [p.segmentIndex, p]))

  // Look up any existing whiteboard / photoreal images so we can attach their URLs
  const images = await prisma.lessonImage.findMany({
    where:   { lessonId, status: 'approved' },
    orderBy: { segmentIndex: 'asc' },
    select:  { id: true, segmentIndex: true, style: true },
  })
  const imageBySegment = new Map(images.map(i => [i.segmentIndex, i]))

  const validMotionNames = new Set(REMOTION_CATALOG.map(c => c.name))

  // Compose final SegmentPlan list
  const planSegments: SegmentPlan[] = segments.map(s => {
    const planned = planByIndex.get(s.segmentIndex)
    let asset: AssetPlan
    let rationale = planned?.rationale ?? ''

    if (planned?.asset.type === 'motion' && validMotionNames.has(planned.asset.componentName)) {
      asset = { type: 'motion', componentName: planned.asset.componentName }
    } else if (planned?.asset.type === 'title') {
      asset = { type: 'title', heading: s.heading || s.spokenText.slice(0, 40) }
    } else {
      // Default to whiteboard. If we have an approved image for this segment,
      // attach it; otherwise Video Hub knows to request generation (or fall
      // back to title-only) on its side.
      const img = imageBySegment.get(s.segmentIndex)
      if (img) {
        asset = {
          type:     img.style === 'photoreal' ? 'photoreal' : 'whiteboard',
          imageId:  img.id,
          imageUrl: `/api/lesson-images/${img.id}/file`,
        }
        if (!rationale) rationale = 'Pre-approved image attached.'
      } else {
        asset = { type: 'whiteboard', imageId: '', imageUrl: '' }
        if (!rationale) rationale = 'Whiteboard image needed — not yet generated/approved.'
      }
    }

    return {
      segmentIndex: s.segmentIndex,
      startMs:      s.startMs,
      durationMs:   s.durationMs,
      spokenText:   s.spokenText,
      heading:      s.heading,
      asset,
      rationale,
    }
  })

  const totalDurationMs = planSegments.length > 0
    ? planSegments[planSegments.length - 1].startMs + planSegments[planSegments.length - 1].durationMs
    : 0

  const manifest: LessonManifest = {
    lessonId,
    moduleId,
    title:           lessonRow.title,
    moduleTitle,
    totalDurationMs,
    brandPalette:    BRAND_PALETTE,
    segments:        planSegments,
  }

  // Persist
  await prisma.lessonVideoManifest.upsert({
    where:  { lessonId },
    update: { plan: manifest as unknown as Prisma.InputJsonValue, moduleId, status: 'draft' },
    create: { lessonId, moduleId, plan: manifest as unknown as Prisma.InputJsonValue, status: 'draft' },
  })

  return manifest
}

export async function getStoredManifest(lessonId: string): Promise<LessonManifest | null> {
  const row = await prisma.lessonVideoManifest.findUnique({ where: { lessonId } })
  if (!row) return null
  return row.plan as unknown as LessonManifest
}
