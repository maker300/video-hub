// lib/tts.ts
// TTS provider: ElevenLabs (primary) with Gemini as fallback.
// Both APIs return raw 16-bit PCM mono at 24 kHz; we wrap in a WAV container.

// ── Gemini config ────────────────────────────────────────────────────────────
const GEMINI_API_BASE  = 'https://generativelanguage.googleapis.com/v1beta'
const GEMINI_TTS_MODEL = 'gemini-2.5-flash-preview-tts'
const GEMINI_VOICE     = process.env.GOOGLE_TTS_VOICE ?? 'Charon'
const GEMINI_MIN_INTERVAL_MS = 6_500   // safely under 10 RPM

// ── ElevenLabs config ────────────────────────────────────────────────────────
const EL_API_BASE  = 'https://api.elevenlabs.io/v1'
const EL_VOICE_ID  = process.env.ELEVENLABS_VOICE_ID ?? 'oQV06a7Gn8pbCJh5DXcO'
const EL_MODEL     = 'eleven_turbo_v2_5'   // fastest + cheapest; swap for eleven_multilingual_v2 for quality

// ── Shared ───────────────────────────────────────────────────────────────────
const SAMPLE_RATE = 24000
const MAX_RETRIES = 4

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export interface SegmentAudio {
  buffer: Buffer          // complete WAV file
  durationSeconds: number // exact duration from PCM length
}

/** Wrap raw 16-bit PCM bytes in a standard WAV container (mono, 24 kHz). */
function pcmToWav(pcm: Buffer): Buffer {
  const numChannels  = 1
  const bitsPerSample = 16
  const byteRate     = SAMPLE_RATE * numChannels * (bitsPerSample / 8)
  const blockAlign   = numChannels * (bitsPerSample / 8)
  const dataSize     = pcm.byteLength
  const header       = Buffer.alloc(44)

  header.write('RIFF',  0, 'ascii')
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE',  8, 'ascii')
  header.write('fmt ', 12, 'ascii')
  header.writeUInt32LE(16,           16)
  header.writeUInt16LE(1,            20)
  header.writeUInt16LE(numChannels,  22)
  header.writeUInt32LE(SAMPLE_RATE,  24)
  header.writeUInt32LE(byteRate,     28)
  header.writeUInt16LE(blockAlign,   32)
  header.writeUInt16LE(bitsPerSample,34)
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(dataSize,     40)

  return Buffer.concat([header, pcm])
}

// ── ElevenLabs TTS ───────────────────────────────────────────────────────────

async function generateSegmentAudioElevenLabs(text: string): Promise<SegmentAudio> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY not configured')

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeout    = setTimeout(() => controller.abort(), 60_000)
    let res: Response
    try {
      res = await fetch(
        `${EL_API_BASE}/text-to-speech/${EL_VOICE_ID}?output_format=pcm_24000`,
        {
          method:  'POST',
          headers: {
            'xi-api-key':   apiKey,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            text,
            model_id: EL_MODEL,
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        },
      )
    } catch (netErr) {
      clearTimeout(timeout)
      if (attempt >= MAX_RETRIES) throw netErr
      await sleep((10 + attempt * 5) * 1_000)
      continue
    }
    clearTimeout(timeout)

    if (res.status === 429) {
      if (attempt >= MAX_RETRIES) throw new Error('ElevenLabs TTS: rate limited')
      await sleep(30_000)
      continue
    }
    if (res.status >= 500) {
      if (attempt >= MAX_RETRIES) throw new Error(`ElevenLabs TTS ${res.status}`)
      await sleep((10 + attempt * 10) * 1_000)
      continue
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`ElevenLabs TTS ${res.status}: ${body}`)
    }

    const pcm    = Buffer.from(await res.arrayBuffer())
    const buffer = pcmToWav(pcm)
    const durationSeconds = pcm.byteLength / (SAMPLE_RATE * 2)
    return { buffer, durationSeconds }
  }

  throw new Error('ElevenLabs TTS: exceeded retry limit')
}

// ── Gemini TTS ───────────────────────────────────────────────────────────────

async function generateSegmentAudioGemini(text: string): Promise<SegmentAudio> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY
  if (!apiKey) throw new Error('GOOGLE_TTS_API_KEY not configured')

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeout    = setTimeout(() => controller.abort(), 45_000)
    let res: Response
    try {
      res = await fetch(
        `${GEMINI_API_BASE}/models/${GEMINI_TTS_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          signal:  controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_VOICE } } },
            },
          }),
        },
      )
    } catch (netErr) {
      clearTimeout(timeout)
      if (attempt >= MAX_RETRIES) throw netErr
      await sleep((20 + attempt * 10) * 1_000)
      continue
    }
    clearTimeout(timeout)

    if (res.status === 429) {
      let retryAfter = 65
      try {
        const body = await res.json() as { error?: { message?: string } }
        const m = (body.error?.message ?? '').match(/retry in (\d+)/)
        if (m) retryAfter = parseInt(m[1]) + 3
      } catch { /* ignore */ }
      if (attempt >= MAX_RETRIES) throw new Error('Gemini TTS: rate limit — quota exhausted')
      await sleep(Math.min(retryAfter, 90) * 1_000)
      continue
    }
    if (res.status >= 500) {
      const body = await res.text().catch(() => '')
      if (attempt >= MAX_RETRIES) throw new Error(`Gemini TTS ${res.status}: ${body}`)
      await sleep((15 + attempt * 10) * 1_000)
      continue
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Gemini TTS ${res.status}: ${body}`)
    }

    const data = await res.json() as {
      candidates: Array<{
        content: { parts: Array<{ inlineData: { mimeType: string; data: string } }> }
      }>
    }
    const part = data.candidates?.[0]?.content?.parts?.[0]?.inlineData
    if (!part?.data) throw new Error('Gemini TTS: no audio in response')

    const pcm    = Buffer.from(part.data, 'base64')
    const buffer = pcmToWav(pcm)
    const durationSeconds = pcm.byteLength / (SAMPLE_RATE * 2)
    return { buffer, durationSeconds }
  }

  throw new Error('Gemini TTS: exceeded retry limit')
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate WAV audio for a single segment.
 * Uses ElevenLabs if ELEVENLABS_API_KEY is set, otherwise Gemini.
 */
export async function generateSegmentAudio(text: string): Promise<SegmentAudio> {
  if (process.env.ELEVENLABS_API_KEY) {
    return generateSegmentAudioElevenLabs(text)
  }
  return generateSegmentAudioGemini(text)
}

/**
 * Generate audio for every segment sequentially.
 * ElevenLabs has no strict RPM limit so no delay needed between requests.
 * Gemini needs 6.5s between starts to stay under 10 RPM.
 * Returns null if no TTS key is configured.
 */
export async function generateAllSegmentAudio(
  texts: string[],
): Promise<SegmentAudio[] | null> {
  const useElevenLabs = !!process.env.ELEVENLABS_API_KEY
  const useGemini     = !!process.env.GOOGLE_TTS_API_KEY
  if (!useElevenLabs && !useGemini) return null

  const results: SegmentAudio[] = []
  for (let i = 0; i < texts.length; i++) {
    const t0 = Date.now()
    results.push(await generateSegmentAudio(texts[i]))
    if (i < texts.length - 1 && !useElevenLabs) {
      // Gemini only: enforce min interval between request starts
      const gap = GEMINI_MIN_INTERVAL_MS - (Date.now() - t0)
      if (gap > 0) await sleep(gap)
    }
  }
  return results
}

/**
 * Concatenate multiple WAV segment buffers into a single valid WAV file.
 * Strips each 44-byte header, joins raw PCM, wraps in one header.
 */
export function concatSegmentsToWav(segments: SegmentAudio[]): Buffer {
  const pcm = Buffer.concat(segments.map(s => s.buffer.slice(44)))
  return pcmToWav(pcm)
}

/** Legacy single-file generation (kept for backward compat). */
export async function generateSpeech(text: string): Promise<Buffer | null> {
  const result = await generateSegmentAudio(text)
  return result?.buffer ?? null
}
