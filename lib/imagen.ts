// Lesson image generation dispatcher.
//
// Two styles supported:
//   • 'whiteboard' (default) — Claude builds a scene JSON, Rough.js + resvg
//     render it as a hand-drawn whiteboard PNG. No Google API. ~$0.005/image.
//   • 'photoreal'           — Imagen 4 produces a cinematic editorial photo.
//     Best for hook / intro / outro segments. ~$0.04/image.

export type ImageStyle = 'whiteboard' | 'photoreal'

export interface GeneratedImage {
  data:     Buffer
  mimeType: string
  prompt:   string
}

// ── Style suffixes for the photoreal (Imagen) path ───────────────────────────

const BRAND_PALETTE    = 'deep navy #0d1b2a background, emerald accents (#10b981 and #34d399), subtle teal-to-emerald gradient highlights, soft gold money tones (#fbbf24) only on accent details'
const HOOK_FRAMING     = 'cinematic close-up framing with dramatic rim-lighting, one clear focal subject, shallow depth of field, high contrast, strong negative space on the right side for overlay text, intriguing and suspenseful mood that hooks the viewer in the first second'
const STYLE_FOUNDATION = 'premium financial-education YouTube thumbnail aesthetic, photorealistic editorial style, 16:9 aspect ratio, no text, no watermarks, no logos, no on-image typography'

const PHOTOREAL_SUFFIX = `. STYLE: ${STYLE_FOUNDATION}. COLOURS: ${BRAND_PALETTE}. COMPOSITION: ${HOOK_FRAMING}.`

const IMAGEN_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict'

interface ImagenResponse {
  predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>
  error?: { message?: string }
}

async function generatePhotorealImage(rawPrompt: string): Promise<GeneratedImage> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GOOGLE_API_KEY not set (required for photoreal style)')

  const trimmed = rawPrompt.length > 500 ? rawPrompt.slice(0, 497) + '…' : rawPrompt
  const prompt  = trimmed + PHOTOREAL_SUFFIX

  const res = await fetch(IMAGEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      instances:  [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: '16:9', personGeneration: 'allow_adult' },
    }),
  })

  const rawText = await res.text()
  let json: ImagenResponse = {}
  try { json = JSON.parse(rawText) } catch { /* fall through */ }
  if (!res.ok) {
    throw new Error(`Imagen ${res.status}: ${json.error?.message ?? rawText.slice(0, 200)}`)
  }
  const pred = json.predictions?.[0]
  if (!pred?.bytesBase64Encoded) {
    throw new Error(`Imagen returned no bytes (likely safety-blocked). Raw: ${rawText.slice(0, 200)}`)
  }
  return {
    data:     Buffer.from(pred.bytesBase64Encoded, 'base64'),
    mimeType: pred.mimeType ?? 'image/png',
    prompt,
  }
}

/**
 * Dispatch: pick the renderer based on style. Caller passes the segment's
 * spokenText (and lesson title — used by the whiteboard scene generator to
 * give Claude context).
 */
export async function generateLessonImage(
  rawPrompt:   string,
  style:       ImageStyle = 'whiteboard',
  lessonTitle: string     = '',
): Promise<GeneratedImage> {
  if (style === 'whiteboard') {
    const { generateWhiteboardImage } = await import('@/lib/whiteboard-renderer')
    return generateWhiteboardImage(rawPrompt, lessonTitle)
  }
  return generatePhotorealImage(rawPrompt)
}
