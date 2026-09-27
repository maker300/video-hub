// Render a lesson to MP4 with the Remotion CLI.
//
//   node scripts/render-lesson.mjs lesson-1-1
//   node scripts/render-lesson.mjs --all
//
// Reads the narration timing and audio straight from the database (the same
// rows the site plays from), stages the MP3 where Remotion can load it, then
// renders. Output goes to rendered-videos/, which is deliberately OUTSIDE
// public/ so the files are only reachable through the admin-only API route.

import { createRequire } from 'module'
const require = createRequire(import.meta.url)
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

// Remotion's video encoder ships as a prebuilt binary with a minimum OS
// version. Rendering stills works anywhere, but encoding an MP4 does not —
// fail with something readable instead of a dyld symbol error.
if (process.platform === 'darwin') {
  const [major] = (process.release?.name, require('os').release()).split('.')
  if (Number(major) < 24) {
    console.error(
      'This machine cannot encode video: Remotion\'s macOS compositor requires macOS 15+.\n' +
      'Render on Linux instead — push and run the "Render lesson videos" GitHub Action,\n' +
      'or run this script on a macOS 15+ machine.',
    )
    process.exit(2)
  }
}

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, 'rendered-videos')
// NOT dot-prefixed: Remotion skips dot-directories when it copies public/
// into the render bundle, so the audio would 404 mid-render.
const TMP_DIR = path.join(ROOT, 'public', 'render-tmp')

let CONCURRENCY = 4
let PREVIEW = 0

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function loadCourse() {
  // courseData is TypeScript; read it through tsx the same way the app does.
  const { courseModules } = await import('../lib/courseData.ts')
  return courseModules
}

function findLesson(modules, lessonId) {
  for (const m of modules) {
    const l = m.lessons.find(x => x.id === lessonId)
    if (l) return { module: m, lesson: l }
  }
  return null
}

async function renderOne(modules, lessonId) {
  const found = findLesson(modules, lessonId)
  if (!found) {
    console.error(`✗ ${lessonId}: not a known lesson id`)
    return false
  }

  const audio = await prisma.lessonAudio.findUnique({ where: { lessonId } })
  if (!audio) {
    console.error(`✗ ${lessonId}: no narration audio generated yet — open the lesson on the site once to generate it`)
    return false
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.mkdirSync(TMP_DIR, { recursive: true })

  // Remotion loads assets from public/, so stage the MP3 there for the render.
  const audioFile = path.join(TMP_DIR, `${lessonId}.mp3`)
  fs.writeFileSync(audioFile, Buffer.from(audio.audioData))

  const props = {
    lessonTitle:  found.lesson.title,
    moduleTitle:  found.module.title,
    moduleNumber: found.module.moduleNumber ?? 1,
    lessonNumber: found.lesson.lessonNumber ?? 1,
    cuePoints:    audio.cuePoints,
    // No leading slash: LessonVideo's resolveAudio passes '/'-prefixed paths
    // through untouched, which resolves against the dev server in a browser
    // but NOT against Remotion's render bundle. Without the slash it goes
    // through staticFile(), which is correct in both.
    audioUrl:     `render-tmp/${lessonId}.mp3`,
  }
  const propsFile = path.join(TMP_DIR, `${lessonId}.props.json`)
  fs.writeFileSync(propsFile, JSON.stringify(props))

  const out = path.join(OUT_DIR, `${lessonId}${PREVIEW ? '-preview' : ''}.mp4`)
  const frames = Math.max(audio.totalFrames ?? 900, 60)
  // --preview renders the opening seconds only, to check a lesson quickly
  // without waiting for a full two-minute render.
  const lastFrame = (PREVIEW ? Math.min(frames, PREVIEW * 30) : frames) - 1

  console.log(`→ ${lessonId}  (${found.lesson.title})  rendering ${lastFrame + 1} of ${frames} frames`)
  try {
    execFileSync('npx', [
      'remotion', 'render', 'LessonExport', out,
      `--props=${propsFile}`,
      `--frames=0-${lastFrame}`,
      `--concurrency=${CONCURRENCY}`,
      '--log=error',
    ], { stdio: 'inherit', cwd: ROOT })
    const mb = (fs.statSync(out).size / 1024 / 1024).toFixed(1)
    console.log(`✓ ${lessonId} → rendered-videos/${lessonId}.mp4  (${mb} MB)`)
    return true
  } catch {
    console.error(`✗ ${lessonId}: render failed`)
    return false
  } finally {
    fs.rmSync(audioFile, { force: true })
    fs.rmSync(propsFile, { force: true })
  }
}

const args = process.argv.slice(2).filter(a => {
  if (a.startsWith('--concurrency=')) { CONCURRENCY = Number(a.split('=')[1]) || CONCURRENCY; return false }
  if (a.startsWith('--preview')) { PREVIEW = Number(a.split('=')[1]) || 10; return false }
  return true
})
if (args.length === 0) {
  console.log('usage: node scripts/render-lesson.mjs <lessonId> | --all [--preview=10] [--concurrency=4]')
  process.exit(1)
}

const modules = await loadCourse()
let ids = args
if (args[0] === '--all') {
  const withAudio = await prisma.lessonAudio.findMany({ select: { lessonId: true } })
  ids = withAudio.map(a => a.lessonId)
  console.log(`rendering ${ids.length} lesson(s) that have narration audio\n`)
}

let ok = 0
for (const id of ids) if (await renderOne(modules, id)) ok++
console.log(`\ndone — ${ok}/${ids.length} rendered`)

fs.rmSync(TMP_DIR, { recursive: true, force: true })
await prisma.$disconnect()
