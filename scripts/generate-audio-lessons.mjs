#!/usr/bin/env node
/**
 * scripts/generate-audio-lessons.mjs
 *
 * Directly generates Gemini TTS (Charon) audio for the specified lessons
 * and upserts into the Neon DB via Prisma — no HTTP server required.
 *
 * Usage:
 *   node scripts/generate-audio-lessons.mjs                  # lessons 1-1 through 1-5 (default)
 *   node scripts/generate-audio-lessons.mjs --module=1       # all lessons in module 1
 *   node scripts/generate-audio-lessons.mjs --lesson=1-3     # single lesson
 */

import { readFileSync } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require   = createRequire(import.meta.url)

// ── Load .env.local ────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '../.env.local')
readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) {
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
})

const API_KEY     = process.env.GOOGLE_TTS_API_KEY
const DATABASE_URL = process.env.DATABASE_URL
if (!API_KEY) { console.error('GOOGLE_TTS_API_KEY not set'); process.exit(1) }
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1) }

// ── CLI args ───────────────────────────────────────────────────────────────────
const args      = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')))
const ONLY_MOD  = args.module  // e.g. --module=1
const ONLY_LES  = args.lesson  // e.g. --lesson=1-3
const DEFAULT_LESSONS = ['lesson-1-1', 'lesson-1-2', 'lesson-1-3', 'lesson-1-4', 'lesson-1-5']

// ── Prisma client ──────────────────────────────────────────────────────────────
const { PrismaClient }  = require('@prisma/client')
const { PrismaNeon }    = require('@prisma/adapter-neon')
const adapter = new PrismaNeon({ connectionString: DATABASE_URL })
const prisma  = new PrismaClient({ adapter })

// ── Parse courseData.ts via regex (same approach as pregenerate.mjs) ────────────
const raw = readFileSync(path.join(__dirname, '../lib/courseData.ts'), 'utf8')

const modulePattern = /id:\s*'(module-\d+)'[\s\S]*?moduleNumber:\s*(\d+)[\s\S]*?title:\s*'([\s\S]*?)'/g
const modules = {}
let mm
while ((mm = modulePattern.exec(raw)) !== null) {
  modules[mm[1]] = { id: mm[1], moduleNumber: parseInt(mm[2]), title: mm[3] }
}

const lessons = []
const lessonBlocks = raw.split(/\{\s*\n?\s*id:\s*'lesson-/)
for (let i = 1; i < lessonBlocks.length; i++) {
  const block   = 'id: \'lesson-' + lessonBlocks[i]
  const idM     = block.match(/id:\s*'(lesson-\d+-\d+)'/)
  const modM    = block.match(/moduleId:\s*'(module-\d+)'/)
  const lnM     = block.match(/lessonNumber:\s*(\d+)/)
  const titleM  = block.match(/title:\s*'([^']+)'/)

  const contentStart = block.indexOf('content: `')
  let content = ''
  if (contentStart !== -1) {
    const afterContent = block.slice(contentStart + 10)
    let depth = 0, end = -1
    for (let j = 0; j < afterContent.length; j++) {
      if (afterContent[j] === '$' && afterContent[j+1] === '{') { depth++; j++ }
      else if (depth > 0 && afterContent[j] === '}') depth--
      else if (depth === 0 && afterContent[j] === '`') { end = j; break }
    }
    if (end !== -1) content = afterContent.slice(0, end)
  }

  if (!idM || !modM || !lnM || !titleM) continue
  const mod = modules[modM[1]]
  if (!mod) continue

  lessons.push({
    id:           idM[1],
    moduleId:     modM[1],
    moduleNumber: mod.moduleNumber,
    moduleTitle:  mod.title,
    lessonNumber: parseInt(lnM[1]),
    title:        titleM[1],
    content,
  })
}

// ── Filter targets ─────────────────────────────────────────────────────────────
let targets = lessons
if (ONLY_MOD)  targets = targets.filter(l => l.moduleNumber === parseInt(ONLY_MOD))
else if (ONLY_LES) targets = targets.filter(l => l.id === `lesson-${ONLY_LES}`)
else targets = targets.filter(l => DEFAULT_LESSONS.includes(l.id))

if (targets.length === 0) {
  console.error('No matching lessons found. Available:', lessons.map(l => l.id).join(', '))
  process.exit(1)
}

console.log(`\n📚  ${targets.length} lesson(s) to process`)
targets.forEach(l => console.log(`    ${l.id}: ${l.title}`))

// ── Lesson parser (ported from lib/lessonParser.ts) ────────────────────────────
function parseHtmlContent(html) {
  if (!html) return []
  const parts    = html.split(/<h2[^>]*>/i)
  const sections = []
  for (let i = 1; i < parts.length; i++) {
    const part        = parts[i]
    const headingMatch = part.match(/^([\s\S]*?)<\/h2>/i)
    if (!headingMatch) continue
    const heading = headingMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    const body    = part.slice(headingMatch[0].length).replace(/<pre[\s\S]*?<\/pre>/gi, '')

    const paragraphs = []
    const pattern    = /<(h[34]|p|li)([^>]*)>([\s\S]*?)<\/\1>/gi
    let m, currentH3 = ''
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
        currentH3 = ''
      }
    }
    if (heading && paragraphs.length > 0) sections.push({ heading, paragraphs })
  }
  return sections
}

function buildNarrationSegments(title, moduleTitle, contentSections, keyPoints = [], terms = [], caution) {
  const segs = []
  segs.push({
    type: 'intro', heading: title, body: moduleTitle,
    spokenText: `Welcome to this lesson: ${title}. This is part of the ${moduleTitle} module. Let's get started.`,
  })
  for (const section of contentSections) {
    segs.push({ type: 'section-header', heading: section.heading, body: '', spokenText: `${section.heading}.` })
    for (const para of section.paragraphs) {
      segs.push({ type: 'paragraph', heading: section.heading, body: para, spokenText: para })
    }
  }
  if (keyPoints.length > 0) {
    segs.push({ type: 'section-header', heading: 'Key Takeaways', body: '',
      spokenText: `Now let's review the ${keyPoints.length} key takeaways from this lesson.` })
    keyPoints.forEach((kp, i) => {
      const spoken = kp.explanation ? `Key point ${i+1}: ${kp.text}. ${kp.explanation}.` : `Key point ${i+1}: ${kp.text}.`
      segs.push({ type: 'keypoint', heading: `${i+1}`, body: kp.text, meta: kp.explanation, spokenText: spoken })
    })
  }
  if (terms.length > 0) {
    segs.push({ type: 'section-header', heading: 'Key Terms', body: '', spokenText: "Here are the key terms you need to remember." })
    terms.forEach(t => segs.push({ type: 'term', heading: t.word, body: t.definition, spokenText: `${t.word}: ${t.definition}.` }))
  }
  if (caution) segs.push({ type: 'paragraph', heading: 'Caution', body: caution, spokenText: `Important caution: ${caution}` })
  segs.push({ type: 'outro', heading: title, body: '',
    spokenText: `That completes this lesson on ${title}. Excellent work — take the quiz below to test your understanding. See you in the next lesson.` })
  return segs
}

// ── TTS helpers (ported from lib/tts.ts) ─────────────────────────────────────
const API_BASE       = 'https://generativelanguage.googleapis.com/v1beta'
const TTS_MODEL      = 'gemini-2.5-flash-preview-tts'
const VOICE_NAME     = process.env.GOOGLE_TTS_VOICE ?? 'Charon'
const SAMPLE_RATE    = 24000
const FPS            = 30
const REQUEST_DELAY  = 7000  // 7s between requests → ~8 RPM (safe under free tier 10 RPM)

function pcmToWav(pcm) {
  const numChannels = 1, bitsPerSample = 16
  const byteRate    = SAMPLE_RATE * numChannels * (bitsPerSample / 8)
  const blockAlign  = numChannels * (bitsPerSample / 8)
  const dataSize    = pcm.byteLength
  const header      = Buffer.alloc(44)
  header.write('RIFF',  0, 'ascii')
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE',  8, 'ascii')
  header.write('fmt ', 12, 'ascii')
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1,  20)
  header.writeUInt16LE(numChannels, 22)
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE(byteRate,    28)
  header.writeUInt16LE(blockAlign,  32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36, 'ascii')
  header.writeUInt32LE(dataSize, 40)
  return Buffer.concat([header, pcm])
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function generateSegmentAudio(text, retries = 6) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeout    = setTimeout(() => controller.abort(), 45_000)
    let res
    try {
      res = await fetch(
        `${API_BASE}/models/${TTS_MODEL}:generateContent?key=${encodeURIComponent(API_KEY)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
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
      if (attempt >= retries) throw netErr
      const wait = 20 + attempt * 10
      process.stdout.write(`    ⚠️  network error (${netErr.message?.slice(0,40) ?? netErr}), retry in ${wait}s (${attempt}/${retries})...\r`)
      await sleep(wait * 1000)
      continue
    }
    clearTimeout(timeout)

    if (res.status === 429) {
      let retryAfter = 65
      try {
        const errBody = await res.json()
        const msg = errBody?.error?.message ?? ''
        const m = msg.match(/retry in (\d+)/)
        if (m) retryAfter = parseInt(m[1]) + 3
      } catch {}
      if (attempt >= retries) throw new Error('Gemini TTS: daily quota exhausted (429 on every retry)')
      process.stdout.write(`    ⏳ 429 — waiting ${retryAfter}s (attempt ${attempt}/${retries})...          \r`)
      await sleep(retryAfter * 1000)
      continue
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Gemini TTS ${res.status}: ${body}`)
    }
    const data = await res.json()
    const part = data.candidates?.[0]?.content?.parts?.[0]?.inlineData
    if (!part?.data) throw new Error('Gemini TTS: no audio in response')
    const pcm    = Buffer.from(part.data, 'base64')
    const buffer = pcmToWav(pcm)
    const durationSeconds = pcm.byteLength / (SAMPLE_RATE * 2)
    return { buffer, durationSeconds }
  }
  throw new Error('Gemini TTS: exceeded retry limit')
}

async function generateAllSegmentAudio(texts) {
  const results = []
  for (let i = 0; i < texts.length; i++) {
    if (i > 0) await sleep(REQUEST_DELAY)
    process.stdout.write(`    segment ${i+1}/${texts.length}...          \r`)
    const result = await generateSegmentAudio(texts[i])
    results.push(result)
  }
  process.stdout.write('\n')
  return results
}

// ── Main generation loop ──────────────────────────────────────────────────────
async function processLesson(lesson) {
  const tag = `[${lesson.id}]`
  console.log(`\n${tag} ${lesson.title}`)

  const contentSections = parseHtmlContent(lesson.content)
  const segments        = buildNarrationSegments(lesson.title, lesson.moduleTitle, contentSections)
  const fullScript      = segments.map(s => s.spokenText).join(' ')
  const hash            = crypto.createHash('sha256').update(fullScript).digest('hex').slice(0, 12)

  // Check if already cached with same hash
  const cached = await prisma.lessonAudio.findUnique({
    where:  { lessonId: lesson.id },
    select: { hash: true },
  })
  if (cached?.hash === hash) {
    console.log(`  ✓  Already up-to-date (hash ${hash}) — skipping`)
    return { status: 'skipped' }
  }

  console.log(`  ⏳  Generating ${segments.length} segments with Charon voice...`)
  const start        = Date.now()
  const audioResults = await generateAllSegmentAudio(segments.map(s => s.spokenText))

  if (!audioResults) {
    console.error(`  ✗  Generation returned no results`)
    return { status: 'failed', reason: 'no_results' }
  }

  // Build cue points
  const cuePoints = []
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
  const WAV_HEADER  = 44
  const allPcm      = Buffer.concat(audioResults.map(r => r.buffer.slice(WAV_HEADER)))
  const audioData   = pcmToWav(allPcm)

  await prisma.lessonAudio.upsert({
    where:  { lessonId: lesson.id },
    create: { lessonId: lesson.id, hash, audioData, cuePoints, totalFrames },
    update: { hash, audioData, cuePoints, totalFrames },
  })

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  const secs    = Math.round(totalFrames / FPS)
  console.log(`  ✅  Done — ${cuePoints.length} slides, ${secs}s audio, ${(audioData.byteLength / 1024).toFixed(0)}KB  (${elapsed}s)`)
  return { status: 'generated' }
}

async function run() {
  let generated = 0, skipped = 0, failed = 0
  console.log(`\n🎙  Voice: ${VOICE_NAME}`)

  for (const lesson of targets) {
    try {
      const result = await processLesson(lesson)
      if (result.status === 'generated') generated++
      else if (result.status === 'skipped') skipped++
      else { failed++; if (result.reason === '429') break }
    } catch (err) {
      failed++
      const msg = err?.message || String(err)
      console.error(`  ✗  [${lesson.id}] Error: ${msg}`)
      if (msg.includes('quota exhausted') || msg.includes('daily quota')) {
        console.error('\n⛔  Daily quota hit — stopping. Re-run tomorrow or enable billing.')
        break
      }
    }
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`✅ Generated : ${generated}`)
  console.log(`✓  Skipped   : ${skipped}`)
  if (failed) console.log(`✗  Failed    : ${failed}`)
  console.log('')

  await prisma.$disconnect()
}

run().catch(err => { console.error(err); prisma.$disconnect(); process.exit(1) })
