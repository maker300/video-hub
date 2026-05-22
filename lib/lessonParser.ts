// lib/lessonParser.ts
// Parses lesson HTML into structured slides, each mapped to a spoken segment.

// ── Shared types ──────────────────────────────────────────────────────────────

export interface ContentSection {
  heading: string
  paragraphs: string[]
}

export type SlideType =
  | 'intro'
  | 'section-header'
  | 'paragraph'
  | 'keypoint'
  | 'term'
  | 'outro'

/** One slide = one audio segment. heading/body drive the visual; spokenText drives TTS. */
export interface ScriptSegment {
  type: SlideType
  heading: string   // large text / title on slide
  body: string      // main body / paragraph / definition
  meta?: string     // extra line (key point explanation, etc.)
  spokenText: string
}

/** Timing cue returned from the API and fed to Remotion. */
export interface SlideCue {
  type: SlideType
  heading: string
  body: string
  meta?: string
  startFrame: number
  endFrame: number
}

export interface KeyPointScript {
  text: string
  explanation?: string
}

export interface TermScript {
  word: string
  definition: string
}

// ── HTML parser ───────────────────────────────────────────────────────────────

/** Parse lesson HTML into sections. Captures h2 headings and all body text in DOM order. */
export function parseHtmlContent(html: string): ContentSection[] {
  if (!html) return []

  const parts = html.split(/<h2[^>]*>/i)
  const sections: ContentSection[] = []

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]
    const headingMatch = part.match(/^([\s\S]*?)<\/h2>/i)
    if (!headingMatch) continue
    const heading = headingMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    const body = part.slice(headingMatch[0].length).replace(/<pre[\s\S]*?<\/pre>/gi, '')

    const paragraphs: string[] = []
    const pattern = /<(h[34]|p|li)([^>]*)>([\s\S]*?)<\/\1>/gi
    let m: RegExpExecArray | null
    let currentH3 = ''

    while ((m = pattern.exec(body)) !== null) {
      const tag  = m[1].toLowerCase()
      const text = m[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      if (!text || text.length < 8) continue

      if (tag === 'h3' || tag === 'h4') {
        currentH3 = text
      } else {
        const prefix = currentH3 ? `${currentH3}: ` : ''
        const line   = `${prefix}${text}`
        paragraphs.push(line.endsWith('.') ? line : `${line}.`)
        currentH3 = '' // consume h3 so it only prefixes the first item after it
      }
    }

    if (heading && paragraphs.length > 0) {
      sections.push({ heading, paragraphs })
    }
  }

  return sections
}

// ── Segment builder ───────────────────────────────────────────────────────────

/**
 * Build an ordered array of script segments — one per slide.
 * Each segment's spokenText is exactly what ElevenLabs will narrate
 * while that slide is displayed.
 */
export function buildNarrationSegments(
  title: string,
  moduleTitle: string,
  contentSections: ContentSection[],
  keyPoints: KeyPointScript[],
  terms: TermScript[],
  caution?: string,
): ScriptSegment[] {
  const segs: ScriptSegment[] = []

  // ── Intro ──────────────────────────────────────────────────────────────────
  segs.push({
    type: 'intro',
    heading: title,
    body: moduleTitle,
    spokenText: `Welcome to this lesson: ${title}. This is part of the ${moduleTitle} module. Let's get started.`,
  })

  // ── Content sections ───────────────────────────────────────────────────────
  for (const section of contentSections) {
    // Section header slide — just announces the topic
    segs.push({
      type: 'section-header',
      heading: section.heading,
      body: '',
      spokenText: `${section.heading}.`,
    })

    // One slide per paragraph / bullet group
    for (const para of section.paragraphs) {
      segs.push({
        type: 'paragraph',
        heading: section.heading,
        body: para,
        spokenText: para,
      })
    }
  }

  // ── Key points ─────────────────────────────────────────────────────────────
  if (keyPoints.length > 0) {
    segs.push({
      type: 'section-header',
      heading: 'Key Takeaways',
      body: '',
      spokenText: `Now let's review the ${keyPoints.length} key takeaways from this lesson.`,
    })

    keyPoints.forEach((kp, i) => {
      const spoken = kp.explanation
        ? `Key point ${i + 1}: ${kp.text}. ${kp.explanation}.`
        : `Key point ${i + 1}: ${kp.text}.`
      segs.push({
        type: 'keypoint',
        heading: `${i + 1}`,
        body: kp.text,
        meta: kp.explanation,
        spokenText: spoken,
      })
    })
  }

  // ── Terms ──────────────────────────────────────────────────────────────────
  if (terms.length > 0) {
    segs.push({
      type: 'section-header',
      heading: 'Key Terms',
      body: '',
      spokenText: "Here are the key terms you need to remember.",
    })

    terms.forEach(t => {
      segs.push({
        type: 'term',
        heading: t.word,
        body: t.definition,
        spokenText: `${t.word}: ${t.definition}.`,
      })
    })
  }

  // ── Caution ────────────────────────────────────────────────────────────────
  if (caution) {
    segs.push({
      type: 'paragraph',
      heading: 'Caution',
      body: caution,
      spokenText: `Important caution: ${caution}`,
    })
  }

  // ── Outro ──────────────────────────────────────────────────────────────────
  segs.push({
    type: 'outro',
    heading: title,
    body: '',
    spokenText: `That completes this lesson on ${title}. Excellent work — take the quiz below to test your understanding. See you in the next lesson.`,
  })

  return segs
}

// ── Legacy helpers (kept for Root.tsx compat) ─────────────────────────────────

export function buildNarrationScript(
  title: string,
  moduleTitle: string,
  contentSections: ContentSection[],
  keyPoints: KeyPointScript[],
  terms: TermScript[],
  caution?: string,
): string {
  return buildNarrationSegments(title, moduleTitle, contentSections, keyPoints, terms, caution)
    .map(s => s.spokenText)
    .join(' ')
}

export function estimateFrames(script: string, fps = 30): number {
  const words   = script.split(/\s+/).filter(Boolean).length
  const seconds = (words / 130) * 60 * 1.1
  return Math.ceil(seconds * fps) + fps * 5
}
