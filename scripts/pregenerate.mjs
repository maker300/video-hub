#!/usr/bin/env node
/**
 * scripts/pregenerate.mjs
 *
 * Pre-generates Devandi audio + cue-point JSON for every one of the 48 lessons.
 * Run ONCE before deploying — output is cached in public/audio/ and served
 * statically to all students (no per-student generation).
 *
 *   node scripts/pregenerate.mjs [--concurrency=2] [--module=3] [--lesson=1-1]
 *
 * Requires the Next.js dev server to be running on localhost:3000
 * (or pass --base=https://your-domain.com for production).
 */

import { readFileSync, existsSync, readdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── CLI args ──────────────────────────────────────────────────────────────────
const args      = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')))
const BASE_URL  = args.base        ?? 'http://localhost:3000'
// ElevenLabs free/starter plan allows 3 concurrent requests.
// Each lesson itself generates segments in batches of 3 internally,
// so we MUST process lessons one at a time (concurrency=1) to avoid 429s.
const MAX_CONC  = parseInt(args.concurrency ?? '1', 10)
const ONLY_MOD  = args.module  // e.g. --module=3
const ONLY_LES  = args.lesson  // e.g. --lesson=1-1
const DRY_RUN   = 'dry' in args

// ── Load course data ──────────────────────────────────────────────────────────
// We read the compiled course data via a tiny eval trick — avoids needing tsx.
// In production you'd just import the JSON manifest.

const courseDataPath = path.join(__dirname, '../lib/courseData.ts')
const raw = readFileSync(courseDataPath, 'utf8')

// Extract all lesson entries using a regex — robust enough for our known format
const lessonPattern = /id:\s*'(lesson-\d+-\d+)'[\s\S]*?moduleId:\s*'(module-\d+)'[\s\S]*?lessonNumber:\s*(\d+)[\s\S]*?title:\s*`?'?"?([\s\S]*?)`?'?"?,\s*\n[\s\S]*?content:\s*`([\s\S]*?)`/g

const modulePattern = /id:\s*'(module-\d+)'[\s\S]*?moduleNumber:\s*(\d+)[\s\S]*?title:\s*'([\s\S]*?)'/g

// Build module lookup
const modules = {}
let mm
while ((mm = modulePattern.exec(raw)) !== null) {
  modules[mm[1]] = { id: mm[1], moduleNumber: parseInt(mm[2]), title: mm[3] }
}

// Build lesson list
const lessons = []
// Parse via splitting on lesson objects — more reliable
const lessonBlocks = raw.split(/\{\s*\n?\s*id:\s*'lesson-/)
for (let i = 1; i < lessonBlocks.length; i++) {
  const block = 'id: \'lesson-' + lessonBlocks[i]

  const idM    = block.match(/id:\s*'(lesson-\d+-\d+)'/)
  const modM   = block.match(/moduleId:\s*'(module-\d+)'/)
  const lnM    = block.match(/lessonNumber:\s*(\d+)/)
  const titleM = block.match(/title:\s*'([^']+)'/)

  // Extract content between backticks
  const contentStart = block.indexOf('content: `')
  let content = ''
  if (contentStart !== -1) {
    const afterContent = block.slice(contentStart + 10)
    // Find matching closing backtick (not preceded by ${ ... })
    let depth = 0
    let end   = -1
    for (let j = 0; j < afterContent.length; j++) {
      if (afterContent[j] === '$' && afterContent[j+1] === '{') { depth++; j++ }
      else if (depth > 0 && afterContent[j] === '}') depth--
      else if (depth === 0 && afterContent[j] === '`') { end = j; break }
    }
    if (end !== -1) content = afterContent.slice(0, end)
  }

  if (!idM || !modM || !lnM || !titleM) continue

  const moduleId = modM[1]
  const mod      = modules[moduleId]
  if (!mod) continue

  lessons.push({
    id:           idM[1],
    moduleId,
    moduleNumber: mod.moduleNumber,
    moduleTitle:  mod.title,
    lessonNumber: parseInt(lnM[1]),
    title:        titleM[1],
    content,
  })
}

console.log(`\n📚  Found ${lessons.length} lessons across ${Object.keys(modules).length} modules`)
console.log(`🎙  Base URL: ${BASE_URL}`)
console.log(`⚡  Concurrency: ${MAX_CONC}`)
if (DRY_RUN) console.log(`🔍  DRY RUN — no requests will be made\n`)

// ── Filter ────────────────────────────────────────────────────────────────────
let targets = lessons
if (ONLY_MOD)  targets = targets.filter(l => l.moduleNumber === parseInt(ONLY_MOD))
if (ONLY_LES)  targets = targets.filter(l => l.id === `lesson-${ONLY_LES}`)

console.log(`🎯  Targeting ${targets.length} lesson(s)\n`)

// ── Check cache ───────────────────────────────────────────────────────────────
const audioDir = path.join(__dirname, '../public/audio')

function isAlreadyCached(lessonId) {
  if (!existsSync(audioDir)) return false
  return readdirSync(audioDir).some(f => f.startsWith(`${lessonId}-`) && f.endsWith('.json'))
}

// ── Generate ──────────────────────────────────────────────────────────────────
let done = 0, cached = 0, failed = 0
let quotaExhausted = false

async function generateLesson(lesson) {
  const tag = `[${lesson.id}]`

  if (quotaExhausted) {
    failed++
    console.log(`  ⏭ ${tag} Skipped — quota exhausted`)
    return
  }

  if (isAlreadyCached(lesson.id)) {
    cached++
    console.log(`  ✓ ${tag} already cached — skipping`)
    return
  }

  if (DRY_RUN) {
    console.log(`  ○ ${tag} ${lesson.title} (would generate)`)
    return
  }

  const MAX_RETRIES = 3
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const start = Date.now()
    try {
      const res = await fetch(`${BASE_URL}/api/generate-audio`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId:      lesson.id,
          lessonTitle:   lesson.title,
          moduleTitle:   lesson.moduleTitle,
          lessonContent: lesson.content,
        }),
      })

      const data = await res.json()
      const elapsed = ((Date.now() - start) / 1000).toFixed(1)

      // Hard stop on quota exhaustion — no point retrying
      if (data.error && data.error.includes('quota_exceeded')) {
        quotaExhausted = true
        failed++
        console.error(`\n  ⚠️  ElevenLabs quota exhausted. Top up credits at elevenlabs.io/subscription`)
        console.error(`     Re-run this script after topping up to generate the remaining lessons.\n`)
        return
      }

      // Retry on rate limit
      if (data.error && data.error.includes('429')) {
        const wait = attempt * 8000
        console.warn(`  ⏳ ${tag} Rate limited — waiting ${wait/1000}s (attempt ${attempt}/${MAX_RETRIES})`)
        await new Promise(r => setTimeout(r, wait))
        continue
      }

      if (data.error && !data.url) {
        failed++
        console.error(`  ✗ ${tag} ERROR: ${data.error}`)
        return
      }

      done++
      const slides = data.cuePoints?.length ?? 0
      const secs   = data.totalFrames ? (data.totalFrames / 30).toFixed(0) : '?'
      const flag   = data.cached ? '(cached)' : `(${elapsed}s)`
      console.log(`  ✅ ${tag} ${lesson.title}  —  ${slides} slides, ${secs}s  ${flag}`)
      return
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        failed++
        console.error(`  ✗ ${tag} FETCH ERROR: ${err.message}`)
      } else {
        await new Promise(r => setTimeout(r, attempt * 5000))
      }
    }
  }
}

// Run in batches respecting concurrency
async function run() {
  const start = Date.now()

  for (let i = 0; i < targets.length; i += MAX_CONC) {
    const batch = targets.slice(i, i + MAX_CONC)
    const batchNums = batch.map(l => l.id).join(', ')
    console.log(`\n── Batch ${Math.floor(i/MAX_CONC)+1} / ${Math.ceil(targets.length/MAX_CONC)}  [${batchNums}]`)
    await Promise.all(batch.map(generateLesson))
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Done in ${elapsed}s`)
  console.log(`  ✅ Generated : ${done}`)
  console.log(`  ✓  Cached    : ${cached}`)
  if (failed) console.log(`  ✗  Failed    : ${failed}`)
  console.log('')
}

run().catch(err => { console.error(err); process.exit(1) })
