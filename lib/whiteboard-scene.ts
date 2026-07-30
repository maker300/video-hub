// Scene schema for whiteboard-style lesson images.
//
// Claude takes a segment's spoken text and returns one of these. The renderer
// (Rough.js + resvg) turns it into a hand-drawn PNG. Coordinates are normalised
// 0–1000 on the 16:9 canvas (the renderer scales to 1920×1080).
//
// Keeping the schema small on purpose — Claude is much better at picking
// 3-6 shapes with clear meaning than at composing dense diagrams.

import Anthropic from '@anthropic-ai/sdk'

export type ShapeKind = 'rect' | 'ellipse' | 'arrow' | 'line'

export interface SceneShape {
  type:      ShapeKind
  /** Centre x in 0–1000 units. For arrows/lines, this is the START. */
  x:         number
  /** Centre y in 0–1000 units. For arrows/lines, this is the START. */
  y:         number
  /** Width for rect/ellipse. Ignored for arrows/lines. */
  w?:        number
  /** Height for rect/ellipse. Ignored for arrows/lines. */
  h?:        number
  /** End x for arrows/lines. */
  toX?:      number
  /** End y for arrows/lines. */
  toY?:      number
  /** Text drawn on/near the shape (for rect/ellipse) or above the line (arrow). */
  label?:    string
  /** When true, this shape is the focal point — gets emerald accent stroke. */
  emphasis?: boolean
}

export interface Scene {
  /** Short banner text drawn at the top of the canvas (optional). */
  title?:    string
  /** 3–6 shapes that compose the diagram. */
  shapes:    SceneShape[]
  /** Optional caption drawn at the bottom (e.g., a one-line takeaway). */
  caption?:  string
}

// ── Claude scene generator ──────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You translate forex-trading lesson narration into hand-drawn whiteboard explainer diagrams.

You output ONLY a JSON object matching this schema:
{
  "title":   "short banner text (max 5 words, optional, omit if not needed)",
  "shapes":  [
    {
      "type":     "rect" | "ellipse" | "arrow" | "line",
      "x":        number,   // 0-1000, centre of shape (or start of arrow/line)
      "y":        number,   // 0-1000, centre (or start)
      "w":        number,   // width for rect/ellipse (50-400 typical)
      "h":        number,   // height for rect/ellipse (40-250 typical)
      "toX":      number,   // arrow/line END x
      "toY":      number,   // arrow/line END y
      "label":    "max 3 words drawn on/near the shape",
      "emphasis": true       // optional — make this the focal element
    }
  ],
  "caption": "one-line takeaway at the bottom (optional)"
}

Rules:
- Output 3 to 6 shapes total. Less is better.
- Canvas is 0-1000 horizontal, 0-562 vertical (16:9). Keep shapes inside.
- Title at y=0-60, caption at y=510-562. Diagram in the middle ~80-490.
- Arrows must connect to something meaningful (e.g., a labelled box on each end).
- Pick the SINGLE most important concept from the narration. Don't try to draw everything.
- Labels max 3 words each. Use ALL CAPS for emphasis if short.
- Mark the focal/key shape with emphasis: true (exactly one shape).
- Forex-specific iconography you can imply with rect/ellipse/arrows: charts (rect with arrow inside), currencies (ellipse with code label), brokers (rect labelled "BROKER"), traders (rect labelled "YOU" or "TRADER"), price levels (horizontal line with label).

Return ONLY the JSON. No prose, no markdown fence.`

export async function buildSceneForSegment(
  segmentSpokenText: string,
  lessonTitle:       string,
): Promise<Scene | null> {
  const userPrompt = `Lesson: ${lessonTitle}

Narration for this segment:
"${segmentSpokenText.slice(0, 400)}"

Build the whiteboard scene JSON.`

  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',  // fast + cheap; scene gen is structured
      max_tokens: 800,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userPrompt }],
    })
    const text = msg.content.find(b => b.type === 'text')?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0]) as Scene
    if (!Array.isArray(parsed.shapes) || parsed.shapes.length === 0) return null
    return parsed
  } catch (err) {
    console.error('[whiteboard-scene]', err)
    return null
  }
}
