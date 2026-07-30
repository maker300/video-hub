#!/usr/bin/env node
// Fetch a lesson's approved manifest from the Forex Mastery API and render
// the matching video using Remotion's CLI. Use this from inside Video Hub
// (or anywhere with a checkout of this repo + Remotion installed).
//
//   USAGE:
//     FM_API_BASE=https://forexmastery.org \
//     FM_API_KEY=your-key \
//     node scripts/render-lesson-video.mjs lesson-1-1 out/lesson-1-1.mp4
//
// The first arg is the lessonId, the second is the output path.

import { spawnSync } from 'node:child_process'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'

const [, , lessonId, outArg] = process.argv
const out = outArg ?? `out/${lessonId ?? 'video'}.mp4`

if (!lessonId) {
  console.error('Usage: node scripts/render-lesson-video.mjs <lessonId> [outPath]')
  process.exit(1)
}

const base = process.env.FM_API_BASE
const key  = process.env.FM_API_KEY
if (!base || !key) {
  console.error('FM_API_BASE and FM_API_KEY must be set in the environment')
  process.exit(1)
}

// 1. Fetch the approved manifest
console.log(`→ Fetching manifest for ${lessonId} from ${base}…`)
const res = await fetch(`${base}/api/lesson-videos?lessonId=${encodeURIComponent(lessonId)}`, {
  headers: { 'x-api-key': key },
})
if (!res.ok) {
  console.error(`Manifest fetch failed: ${res.status} ${res.statusText}`)
  console.error(await res.text())
  process.exit(1)
}
const { manifest, baseUrl } = await res.json()
console.log(`✔ Manifest has ${manifest.segments.length} segments (${(manifest.totalDurationMs / 1000).toFixed(1)}s total)`)

// 2. Write input props as a temp JSON file for the Remotion CLI
const propsFile = '.remotion-input-props.json'
writeFileSync(propsFile, JSON.stringify({
  manifest,
  baseUrl,
  apiKey: key,
  fps:    30,
}))

// 3. Make sure the output directory exists
mkdirSync(dirname(out) || '.', { recursive: true })

// 4. Invoke `npx remotion render <id> <out> --props=<file>`
console.log(`→ Rendering to ${out}…`)
const r = spawnSync('npx', [
  'remotion', 'render',
  'LessonVideoFromManifest',
  out,
  `--props=${propsFile}`,
  '--codec=h264',
], { stdio: 'inherit' })

if (existsSync(propsFile)) {
  // (Best effort cleanup — keep file on error so the caller can inspect it)
  if (r.status === 0) {
    try { (await import('node:fs')).unlinkSync(propsFile) } catch { /* ignore */ }
  } else {
    console.error(`Props file kept at ${propsFile} for debugging`)
  }
}

process.exit(r.status ?? 1)
