// Whiteboard renderer.
//
// Input:  a Scene (from Claude).
// Output: a 16:9 PNG buffer with the scene drawn in hand-drawn / whiteboard style.
//
// Pipeline:
//   Scene → rough.js Drawables → SVG path strings → wrapped SVG document →
//   @resvg/resvg-js raster pass (with Patrick Hand TTF loaded) → PNG bytes.

import { Resvg } from '@resvg/resvg-js'
import fs from 'node:fs'
import path from 'node:path'
import { RoughGenerator } from 'roughjs/bin/generator'
import type { Drawable, OpSet, Options as RoughOptions } from 'roughjs/bin/core'
import type { Scene, SceneShape } from '@/lib/whiteboard-scene'

// ── Canvas + brand palette ───────────────────────────────────────────────────
const W = 1920
const H = 1080            // 16:9
const PAD = 60
const COORD_X = 1000      // scene coords → 0-1000 mapped to W
const COORD_Y = 562       // scene coords → 0-562  mapped to H (562 keeps 16:9)

const INK_PRIMARY   = '#1a2233'   // near-black, sketchy
const INK_EMERALD   = '#10b981'   // brand accent for focal shapes
const PAPER         = '#fafaf6'   // warm off-white, like a real whiteboard
const SHADOW        = '#e6e6dc'

// Convert scene coord → canvas pixel
const sx = (n: number) => Math.round((n / COORD_X) * (W - PAD * 2) + PAD)
const sy = (n: number) => Math.round((n / COORD_Y) * (H - PAD * 2) + PAD)
const sw = (n: number) => Math.round((n / COORD_X) * (W - PAD * 2))
const sh = (n: number) => Math.round((n / COORD_Y) * (H - PAD * 2))

// ── Rough.js OpSet → SVG path ───────────────────────────────────────────────

function opSetToD(set: OpSet): string {
  let out = ''
  for (const op of set.ops) {
    const d = op.data
    if (op.op === 'move')     out += `M${d[0]} ${d[1]} `
    else if (op.op === 'lineTo')   out += `L${d[0]} ${d[1]} `
    else if (op.op === 'bcurveTo') out += `C${d[0]} ${d[1]}, ${d[2]} ${d[3]}, ${d[4]} ${d[5]} `
  }
  return out.trim()
}

function drawableToSvg(d: Drawable, strokeColor: string, strokeWidth: number): string {
  let svg = ''
  for (const set of d.sets) {
    if (set.type === 'path') {
      svg += `<path d="${opSetToD(set)}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" />`
    } else if (set.type === 'fillPath') {
      svg += `<path d="${opSetToD(set)}" fill="${strokeColor}" fill-opacity="0.06" stroke="none" />`
    }
  }
  return svg
}

// ── Per-shape SVG builders ──────────────────────────────────────────────────

function arrowHead(x1: number, y1: number, x2: number, y2: number): string {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const len = 26
  const spread = 0.5  // ~30°
  const hx1 = x2 - len * Math.cos(angle - spread)
  const hy1 = y2 - len * Math.sin(angle - spread)
  const hx2 = x2 - len * Math.cos(angle + spread)
  const hy2 = y2 - len * Math.sin(angle + spread)
  return `<polyline points="${hx1},${hy1} ${x2},${y2} ${hx2},${hy2}" stroke="${INK_PRIMARY}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" />`
}

interface LabelOpts { x: number; y: number; text: string; size?: number; color?: string; anchor?: 'middle' | 'start' | 'end' }
function label(opts: LabelOpts): string {
  const { x, y, text, size = 28, color = INK_PRIMARY, anchor = 'middle' } = opts
  // Split label into lines on \n (used by Claude for stacked labels like "GLOBAL\nFX")
  const lines = String(text).split(/\\n|\n/).filter(Boolean)
  const lh = size * 1.05
  const startY = y - ((lines.length - 1) * lh) / 2
  return lines.map((line, i) =>
    `<text x="${x}" y="${startY + i * lh}" font-family="Patrick Hand, Caveat, cursive" font-size="${size}" fill="${color}" text-anchor="${anchor}" dominant-baseline="middle">${escapeXml(line)}</text>`,
  ).join('')
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  }[c]!))
}

function renderShape(shape: SceneShape, gen: RoughGenerator): string {
  const stroke    = shape.emphasis ? INK_EMERALD : INK_PRIMARY
  const sWidth    = shape.emphasis ? 5 : 3.5
  const cx        = sx(shape.x)
  const cy        = sy(shape.y)
  const w         = sw(shape.w ?? 200)
  const h         = sh(shape.h ?? 110)
  const roughOpts: RoughOptions = {
    stroke,
    strokeWidth: sWidth,
    roughness: 1.6,        // strong hand-drawn wobble
    bowing: 1.4,
    fill: shape.emphasis ? stroke : INK_PRIMARY,
    fillStyle: 'hachure',  // sparse cross-hatch fill
    fillWeight: 0.5,
    hachureGap: 18,
    hachureAngle: -41,
  }

  let body = ''

  if (shape.type === 'rect') {
    const left = cx - w / 2, top = cy - h / 2
    const d = gen.rectangle(left, top, w, h, roughOpts)
    body += drawableToSvg(d, stroke, sWidth)
    if (shape.label) body += label({ x: cx, y: cy, text: shape.label, size: Math.min(36, Math.max(20, h * 0.32)) })
  } else if (shape.type === 'ellipse') {
    const d = gen.ellipse(cx, cy, w, h, roughOpts)
    body += drawableToSvg(d, stroke, sWidth)
    if (shape.label) body += label({ x: cx, y: cy, text: shape.label, size: Math.min(36, Math.max(20, h * 0.32)) })
  } else if (shape.type === 'arrow' || shape.type === 'line') {
    const x2 = sx(shape.toX ?? shape.x)
    const y2 = sy(shape.toY ?? shape.y)
    const d = gen.line(cx, cy, x2, y2, { stroke, strokeWidth: sWidth, roughness: 1.6, bowing: 2.0 })
    body += drawableToSvg(d, stroke, sWidth)
    if (shape.type === 'arrow') body += arrowHead(cx, cy, x2, y2)
    if (shape.label) {
      const mx = (cx + x2) / 2
      const my = (cy + y2) / 2 - 20
      body += label({ x: mx, y: my, text: shape.label, size: 24 })
    }
  }

  return body
}

// ── Public: render a Scene to a PNG buffer ──────────────────────────────────

const FONT_PATH = path.join(process.cwd(), 'public', 'fonts', 'PatrickHand-Regular.ttf')

export function renderSceneToPng(scene: Scene): Buffer {
  const gen = new RoughGenerator()
  let svg = ''

  // Paper background
  svg += `<rect width="${W}" height="${H}" fill="${PAPER}" />`

  // Subtle paper "shadow grid" so it feels like a real whiteboard
  for (let gx = 0; gx <= W; gx += 80) {
    svg += `<line x1="${gx}" y1="0" x2="${gx}" y2="${H}" stroke="${SHADOW}" stroke-width="1" />`
  }
  for (let gy = 0; gy <= H; gy += 80) {
    svg += `<line x1="0" y1="${gy}" x2="${W}" y2="${gy}" stroke="${SHADOW}" stroke-width="1" />`
  }

  // Title banner
  if (scene.title) {
    svg += label({ x: W / 2, y: 80, text: scene.title.toUpperCase(), size: 64, color: INK_PRIMARY })
    // Underline scribble
    const underline = gen.line(W / 2 - 280, 130, W / 2 + 280, 130, { stroke: INK_EMERALD, strokeWidth: 5, roughness: 2.0 })
    svg += drawableToSvg(underline, INK_EMERALD, 5)
  }

  // Shapes
  for (const shape of scene.shapes) svg += renderShape(shape, gen)

  // Caption
  if (scene.caption) {
    svg += label({ x: W / 2, y: H - 60, text: scene.caption, size: 40, color: INK_PRIMARY })
  }

  const svgDoc = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${svg}</svg>`

  // Rasterise with resvg (Patrick Hand bundled in /public/fonts)
  const resvg = new Resvg(svgDoc, {
    background: PAPER,
    font: {
      fontFiles:    fs.existsSync(FONT_PATH) ? [FONT_PATH] : [],
      loadSystemFonts: true,
      defaultFontFamily: 'Patrick Hand',
    },
  })
  return resvg.render().asPng()
}

/** Whole pipeline: build scene with Claude, render to PNG. */
export async function generateWhiteboardImage(
  segmentSpokenText: string,
  lessonTitle:       string,
): Promise<{ data: Buffer; mimeType: string; prompt: string }> {
  const { buildSceneForSegment } = await import('@/lib/whiteboard-scene')
  const scene = await buildSceneForSegment(segmentSpokenText, lessonTitle)
  if (!scene) {
    // Fallback: minimal scene from the raw text
    const fallback: Scene = {
      title: lessonTitle.slice(0, 40),
      shapes: [{ type: 'rect', x: 500, y: 280, w: 600, h: 200, label: segmentSpokenText.slice(0, 60), emphasis: true }],
    }
    return {
      data:     renderSceneToPng(fallback),
      mimeType: 'image/png',
      prompt:   `[whiteboard:fallback] ${segmentSpokenText.slice(0, 240)}`,
    }
  }
  return {
    data:     renderSceneToPng(scene),
    mimeType: 'image/png',
    prompt:   `[whiteboard] ${JSON.stringify(scene).slice(0, 500)}`,
  }
}
