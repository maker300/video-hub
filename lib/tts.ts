// lib/tts.ts
// Google Gemini TTS — generates Charon-voiced WAV audio for lesson segments.
// The Gemini TTS API returns raw 16-bit PCM (mono, 24 kHz); we wrap it in a
// proper WAV container before storing so browsers can play it directly.

const API_BASE    = 'https://generativelanguage.googleapis.com/v1beta'
const TTS_MODEL   = 'gemini-2.5-flash-preview-tts'
const VOICE_NAME  = process.env.GOOGLE_TTS_VOICE ?? 'Charon'
const SAMPLE_RATE = 24000   // Gemini TTS output sample rate (Hz)
const REQUEST_DELAY_MS = 7_000  // 7s between segments → ~8 RPM (safe under 10 RPM limit)
const MAX_RETRIES = 6

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export interface SegmentAudio {
  buffer: Buffer          // complete WAV file
  durationSeconds: number // exact duration from PCM length
}

/** Wrap raw PCM bytes in a standard WAV container (mono, 16-bit, 24 kHz). */
function pcmToWav(pcm: Buffer): Buffer {
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = SAMPLE_RATE * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = pcm.byteLength
  const header = Buffer.alloc(44)

  header.write('RIFF',  0, 'ascii')
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE',  8, 'ascii')
  header.write('fmt ', 12, 'ascii')
  header.writeUInt32LE(16,          16)   // PCM fmt chunk size
  header.writeUInt16LE(1,           20)   // PCM format
  header.writeUInt16LE(numChannels, 22)
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE(byteRate,    28)
  header.writeUInt16LE(blockAlign,  32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(dataSize,    40)

  return Buffer.concat([header, pcm])
}

/** Generate WAV audio for a single text segment using Gemini TTS, with retry on 429. */
export async function generateSegmentAudio(text: string): Promise<SegmentAudio> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY
  if (!apiKey) throw new Error('GOOGLE_TTS_API_KEY not configured')

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timeout    = setTimeout(() => controller.abort(), 45_000)
    let res: Response
    try {
      res = await fetch(
        `${API_BASE}/models/${TTS_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          signal:  controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } } },
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
      await sleep(retryAfter * 1_000)
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

/**
 * Generate audio for every segment sequentially with a short delay between requests.
 * Sequential (not batched) to stay safely under the 10 RPM rate limit.
 * Returns null if API key is missing.
 */
export async function generateAllSegmentAudio(
  texts: string[],
): Promise<SegmentAudio[] | null> {
  if (!process.env.GOOGLE_TTS_API_KEY) return null

  const results: SegmentAudio[] = []
  for (let i = 0; i < texts.length; i++) {
    if (i > 0) await sleep(REQUEST_DELAY_MS)
    results.push(await generateSegmentAudio(texts[i]))
  }
  return results
}

/**
 * Concatenate multiple segment buffers into a single valid WAV file.
 * Each segment buffer is a complete WAV — we strip its 44-byte header,
 * join all the raw PCM, then wrap in one new header.
 * Use this instead of Buffer.concat(results.map(r => r.buffer)).
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
