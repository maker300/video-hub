// Renders one scene's card from its SceneSpec.
//
// Nothing here is a fixed illustration — every value on screen was pulled out
// of the sentence the narrator is speaking, and the chart data is seeded from
// that sentence's hash. Two scenes produce the same card only if they say the
// same thing.

import React from 'react'
import type { SceneSpec } from '@/lib/lesson-scene-spec'
import {
  VB_W, VB_H, C, FONT, rev, bob,
  makeCandles, makeScale, Candles, GridBg,
} from './primitives'
import { VISUALS } from './visuals'

const ACCENT_MAP: Record<SceneSpec['accent'], string> = {
  bull: C.bull, bear: C.bear, amber: C.amber, blue: C.blue, violet: C.violet,
}

/**
 * Wraps a string to lines of at most `max` characters.
 *
 * When the text doesn't fit in `limit` lines the last line gets an ellipsis.
 * Without it a sentence simply stops mid-thought on screen and reads as a
 * rendering fault rather than an edit.
 */
function wrap(text: string, max: number, limit = 5): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  let consumed = 0

  for (const w of words) {
    const next = (cur + ' ' + w).trim()
    if (next.length > max) {
      if (lines.length + 1 >= limit) break      // no room for another full line
      lines.push(cur.trim())
      consumed += cur.trim().length + 1
      cur = w
    } else {
      cur = next
    }
  }

  if (cur && lines.length < limit) {
    lines.push(cur.trim())
    consumed += cur.trim().length
  }

  const clean = lines.filter(Boolean)
  if (clean.length > 0 && consumed < text.replace(/\s+/g, ' ').trim().length) {
    const last = clean[clean.length - 1].replace(/[,;:\s]+$/, '')
    clean[clean.length - 1] = (last.length > max - 1 ? last.slice(0, max - 1) : last) + '…'
  }
  return clean
}

/** Text that types on word by word, so the card keeps moving while spoken. */
const RevealText: React.FC<{
  text: string; x: number; y: number; size: number; max: number
  color?: string; weight?: number; localFrame: number; delay?: number
  lineHeight?: number; anchor?: 'start' | 'middle'; limit?: number
}> = ({
  text, x, y, size, max, color = C.ink, weight = 600,
  localFrame, delay = 0, lineHeight = 1.42, anchor = 'start', limit = 5,
}) => {
  const lines = wrap(text, max, limit)
  return (
    <>
      {lines.map((ln, i) => {
        const t = rev(localFrame, delay + i * 6, 16)
        if (t <= 0) return null
        return (
          <text key={i} x={x} y={y + i * size * lineHeight} textAnchor={anchor}
            fontFamily={FONT} fontSize={size} fontWeight={weight} fill={color}
            opacity={t} transform={`translate(0,${(1 - t) * 8})`}>
            {ln}
          </text>
        )
      })}
    </>
  )
}

/** Kicker line above the card body. */
const Kicker: React.FC<{ text: string; color: string; localFrame: number }> = ({
  text, color, localFrame,
}) => {
  const t = rev(localFrame, 2, 16)
  if (t <= 0) return null
  const clipped = text.length > 46 ? text.slice(0, 45) + '…' : text
  return (
    <g opacity={t}>
      <rect x={34} y={30} width={4} height={16} rx={2} fill={color} />
      <text x={48} y={44} fontFamily={FONT} fontSize={13} fontWeight={800}
        fill={color} letterSpacing="0.1em">
        {clipped.toUpperCase()}
      </text>
    </g>
  )
}

/** Seeded background texture — different market data for every scene. */
const SceneChart: React.FC<{
  kind: SceneSpec['chart']; seed: number; color: string; localFrame: number
  top?: number
}> = ({ kind, seed, color, localFrame, top = 252 }) => {
  if (kind === 'none') return null

  const shape = (['up', 'down', 'range', 'breakout', 'vshape'] as const)[seed % 5]

  if (kind === 'candles') {
    const candles = makeCandles(22, shape, seed % 9973)
    const scale = makeScale(candles, { left: 34, right: VB_W - 34, top, bottom: VB_H - 26 })
    return (
      <g opacity={0.55}>
        <Candles candles={candles} scale={scale} localFrame={localFrame}
          delay={18} perCandle={1.6} bodyW={0.5} />
      </g>
    )
  }

  // Sparkline
  const candles = makeCandles(30, shape, seed % 7919)
  const scale = makeScale(candles, { left: 34, right: VB_W - 34, top, bottom: VB_H - 26 })
  const t = rev(localFrame, 20, 34)
  const n = Math.max(Math.floor(candles.length * t), 2)
  const d = candles.slice(0, n)
    .map((c, i) => `${i === 0 ? 'M' : 'L'}${scale.x(i)},${scale.y(c.c)}`).join(' ')
  const area = `${d} L${scale.x(n - 1)},${VB_H - 26} L${scale.x(0)},${VB_H - 26} Z`

  return (
    <g>
      <path d={area} fill={color} fillOpacity={0.09} />
      <path d={d} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round"
        opacity={0.8} />
      {n > 2 && (
        <circle cx={scale.x(n - 1)} cy={scale.y(candles[n - 1].c)}
          r={4 + bob(localFrame, 0.14, 1)} fill={color} />
      )}
    </g>
  )
}

// ── The card ────────────────────────────────────────────────────────────────

export const SceneCard: React.FC<{
  spec: SceneSpec
  localFrame: number
  /**
   * Set when the card sits beside the narration text in the lesson video.
   * The spoken sentence is already on screen to the left, so repeating it
   * inside the card just prints the same paragraph twice — compact cards
   * keep the headline element and give the space to the chart instead.
   */
  compact?: boolean
}> = ({ spec, localFrame, compact = false }) => {
  const A = ACCENT_MAP[spec.accent]
  const f = localFrame

  switch (spec.layout) {

    // The scene is genuinely about a chart concept, so draw the real diagram
    // rather than a text card. Rationed upstream so it can't repeat.
    case 'diagram': {
      const entry = VISUALS[spec.diagramId ?? ''] ?? VISUALS['price-action']
      const Diagram = entry.Component
      return <Diagram localFrame={f} variant={spec.diagramVariant ?? 0} />
    }

    // A figure the narrator actually said, at full size.
    case 'stat': {
      const t = rev(f, 6, 22)
      const value = spec.stat?.value ?? ''
      const size = value.length > 12 ? 44 : value.length > 8 ? 58 : 72
      return (
        <>
          <GridBg opacity={0.45} />
          {spec.title && <Kicker text={spec.title} color={A} localFrame={f} />}
          <text x={VB_W / 2} y={150} textAnchor="middle" fontFamily={FONT}
            fontSize={size} fontWeight={800} fill={A} opacity={t}
            transform={`translate(0,${(1 - t) * 14})`}>
            {value}
          </text>
          {spec.label && (
            <RevealText text={spec.label} x={VB_W / 2} y={192} size={16} max={46}
              color={C.ink} weight={700} localFrame={f} delay={22} anchor="middle" limit={2} />
          )}
          {!compact && spec.stat?.caption && (
            <RevealText text={spec.stat.caption} x={VB_W / 2} y={spec.label ? 234 : 200}
              size={14} max={54} color={C.muted} weight={500}
              localFrame={f} delay={30} anchor="middle" limit={3} />
          )}
          <SceneChart kind={spec.chart} seed={spec.seed} color={A} localFrame={f}
            top={compact ? 218 : 296} />
        </>
      )
    }

    // Named things the scene listed — pairs, cities, institutions.
    case 'chips': {
      const chips = spec.chips ?? []
      return (
        <>
          <GridBg opacity={0.45} />
          {spec.title && <Kicker text={spec.title} color={A} localFrame={f} />}
          {spec.label && (
            <RevealText text={spec.label} x={34} y={94} size={22} max={38}
              color={C.ink} weight={800} localFrame={f} delay={8} limit={2} />
          )}
          {chips.map((chip, i) => {
            const t = rev(f, 24 + i * 9, 18)
            if (t <= 0) return null
            const perRow = chips.length > 4 ? 3 : 2
            const col = i % perRow
            const row = Math.floor(i / perRow)
            const w = (VB_W - 68 - (perRow - 1) * 12) / perRow
            const x = 34 + col * (w + 12)
            const y = 154 + row * 56
            return (
              <g key={chip} opacity={t} transform={`translate(0,${(1 - t) * 10})`}>
                <rect x={x} y={y} width={w} height={44} rx={10}
                  fill={A} fillOpacity={0.12} stroke={A} strokeWidth={1.2} strokeOpacity={0.5} />
                <text x={x + w / 2} y={y + 28} textAnchor="middle" fontFamily={FONT}
                  fontSize={chip.length > 12 ? 13 : 16} fontWeight={700} fill={A}>
                  {chip}
                </text>
              </g>
            )
          })}
          {spec.detail && (
            <RevealText
              text={spec.detail} x={34}
              y={154 + Math.ceil(chips.length / (chips.length > 4 ? 3 : 2)) * 56 + 26}
              size={14} max={58} color={C.muted} weight={500}
              localFrame={f} delay={46} limit={3} />
          )}
        </>
      )
    }

    // Time ranges the scene named.
    case 'timeline': {
      const times = spec.times ?? []
      const toMin = (v: string) => {
        const [h, m] = v.split(':').map(Number)
        return h * 60 + (m || 0)
      }
      const x0 = 34, x1 = VB_W - 34
      const atX = (min: number) => x0 + (min / 1440) * (x1 - x0)
      const rowTop = spec.label ? 168 : 132

      return (
        <>
          <GridBg opacity={0.45} />
          {spec.title && <Kicker text={spec.title} color={A} localFrame={f} />}
          {spec.label && (
            <RevealText text={spec.label} x={34} y={100} size={24} max={34}
              color={C.ink} weight={800} localFrame={f} delay={6} limit={2} />
          )}

          {/* 24-hour axis, so a bar's position reads as a time of day */}
          <g opacity={rev(f, 18, 16)}>
            <line x1={x0} x2={x1} y1={rowTop + 54} y2={rowTop + 54}
              stroke={C.edge} strokeWidth={1} />
            {[0, 6, 12, 18, 24].map(h => (
              <g key={h}>
                <line x1={atX(h * 60)} x2={atX(h * 60)} y1={rowTop + 50} y2={rowTop + 58}
                  stroke={C.edge} strokeWidth={1} />
                <text x={atX(h * 60)} y={rowTop + 74} textAnchor="middle" fontFamily={FONT}
                  fontSize={11} fill={C.muted}>{String(h % 24).padStart(2, '0')}:00</text>
              </g>
            ))}
          </g>

          {times.slice(0, 3).map((tm, i) => {
            const t = rev(f, 26 + i * 12, 22)
            if (t <= 0) return null
            const from = toMin(tm.from)
            const to = toMin(tm.to)
            // A window crossing midnight is two bars, not one negative one —
            // drawn as a single clipped sliver at the right edge before.
            const segs = to > from
              ? [[from, to]]
              : [[from, 1440], [0, to]]
            const y = rowTop + i * 30

            return (
              <g key={i} opacity={t}>
                {segs.map(([a, b], k) => (
                  <rect key={k} x={atX(a)} y={y} width={Math.max((atX(b) - atX(a)) * t, 4)}
                    height={34} rx={7}
                    fill={A} fillOpacity={0.26} stroke={A} strokeWidth={1.3} />
                ))}
                <text x={x0} y={y - 8} fontFamily={FONT} fontSize={13} fontWeight={800} fill={A}>
                  {tm.from} – {tm.to}
                  {to <= from ? '  (over midnight)' : ''}
                </text>
              </g>
            )
          })}

          {spec.detail && (
            <RevealText text={spec.detail} x={34} y={rowTop + 108} size={14} max={58}
              color={C.muted} weight={500} localFrame={f} delay={46} limit={3} />
          )}
        </>
      )
    }

    // Two opposed ideas the scene set against each other.
    case 'dual': {
      const left = spec.dual?.left ?? ''
      const right = spec.dual?.right ?? ''
      const tl = rev(f, 8, 20)
      const tr = rev(f, 20, 20)
      return (
        <>
          <GridBg opacity={0.45} />
          {spec.title && <Kicker text={spec.title} color={A} localFrame={f} />}
          <g opacity={tl} transform={`translate(${(1 - tl) * -20},0)`}>
            <rect x={34} y={116} width={228} height={104} rx={14}
              fill={C.bull} fillOpacity={0.12} stroke={C.bull} strokeWidth={1.4} />
            <text x={148} y={180} textAnchor="middle" fontFamily={FONT} fontSize={32}
              fontWeight={800} fill={C.bull}>{left}</text>
          </g>
          <g opacity={tr} transform={`translate(${(1 - tr) * 20},0)`}>
            <rect x={VB_W - 262} y={116} width={228} height={104} rx={14}
              fill={C.bear} fillOpacity={0.12} stroke={C.bear} strokeWidth={1.4} />
            <text x={VB_W - 148} y={180} textAnchor="middle" fontFamily={FONT} fontSize={32}
              fontWeight={800} fill={C.bear}>{right}</text>
          </g>
          <text x={VB_W / 2} y={178} textAnchor="middle" fontFamily={FONT} fontSize={15}
            fontWeight={700} fill={C.muted} opacity={rev(f, 32, 14)}>or</text>
          {(spec.label || spec.detail) && (
            <RevealText text={spec.label ?? spec.detail ?? ''} x={VB_W / 2} y={268}
              size={15} max={54} color={C.ink} weight={600}
              localFrame={f} delay={40} anchor="middle" limit={3} />
          )}
        </>
      )
    }

    // A term and its gloss, both taken from the scene.
    case 'define': {
      const t = rev(f, 6, 22)
      return (
        <>
          <GridBg opacity={0.45} />
          {spec.title && <Kicker text={spec.title} color={A} localFrame={f} />}
          {(() => {
            const labelLines = wrap(spec.label ?? '', 30, 2).length
            const detailLines = wrap(spec.detail ?? '', 50, 4).length
            // Detail starts at y=210 and the panel starts at y=96, so the
            // box must clear 114px before the first detail line is even drawn
            // — the old formula ran the border straight through the text.
            const h = compact
              ? 46 + labelLines * 34
              : 136 + detailLines * 22 + (labelLines - 1) * 34
            return (
              <g opacity={t} transform={`translate(0,${(1 - t) * 12})`}>
                <rect x={34} y={96} width={VB_W - 68} height={h} rx={16}
                  fill={C.panel} stroke={A} strokeWidth={1.3} strokeOpacity={0.42} />
                <rect x={34} y={96} width={5} height={h} rx={2.5} fill={A} />
              </g>
            )
          })()}
          <RevealText text={spec.label ?? ''} x={60} y={148} size={26} max={30}
            color={A} weight={800} localFrame={f} delay={14} limit={2} />
          {!compact && (
            <RevealText text={spec.detail ?? ''} x={60} y={210} size={15} max={50}
              color={C.ink} weight={500} localFrame={f} delay={28} limit={4} />
          )}
          {compact && (
            <SceneChart kind="spark" seed={spec.seed} color={A} localFrame={f} top={232} />
          )}
        </>
      )
    }

    // A key term lifted out of the prose, with the sentence beneath it.
    case 'concept': {
      const t = rev(f, 6, 22)
      const phrase = spec.keyphrase ?? ''
      const size = phrase.length > 18 ? 28 : phrase.length > 11 ? 36 : 44
      return (
        <>
          <GridBg opacity={0.45} />
          {spec.title && <Kicker text={spec.title} color={A} localFrame={f} />}
          <g opacity={t}>
            <text x={34} y={132} fontFamily={FONT} fontSize={size} fontWeight={800}
              fill={A} transform={`translate(0,${(1 - t) * 10})`}>
              {phrase}
            </text>
            <rect x={34} y={146} width={(VB_W - 150) * rev(f, 18, 26)} height={3} rx={1.5}
              fill={A} opacity={0.65} />
          </g>
          {!compact && (
            <RevealText text={spec.detail ?? ''} x={34} y={190} size={16} max={48}
              color={C.ink} weight={500} localFrame={f} delay={26} limit={4} />
          )}
          <SceneChart kind={spec.chart === 'none' ? 'spark' : spec.chart}
            seed={spec.seed} color={A} localFrame={f} top={compact ? 186 : 290} />
        </>
      )
    }

    // Label plus explanation.
    case 'callout': {
      return (
        <>
          <GridBg opacity={0.45} />
          {spec.title && <Kicker text={spec.title} color={A} localFrame={f} />}
          <RevealText text={spec.label ?? ''} x={34} y={110} size={24} max={34}
            color={A} weight={800} localFrame={f} delay={6} limit={2} />
          {!compact && (
            <RevealText text={spec.detail ?? ''} x={34} y={188} size={15} max={50}
              color={C.ink} weight={500} localFrame={f} delay={24} limit={4} />
          )}
          <SceneChart kind={spec.chart === 'none' ? 'spark' : spec.chart}
            seed={spec.seed} color={A} localFrame={f} top={compact ? 178 : 288} />
        </>
      )
    }

    // Nothing structured to pull out — let the sentence carry the card.
    case 'quote':
    default: {
      const t = rev(f, 4, 20)
      if (compact) {
        // Nothing structured to show and the sentence is already beside the
        // card — so the chart becomes the content rather than a footnote.
        const lead = (spec.detail ?? '').split(' ').slice(0, 5).join(' ')
        return (
          <>
            <GridBg opacity={0.45} />
            {spec.title
              ? <Kicker text={spec.title} color={A} localFrame={f} />
              : lead && <Kicker text={lead} color={A} localFrame={f} />}
            <SceneChart kind={spec.chart === 'none' ? 'spark' : spec.chart}
              seed={spec.seed} color={A} localFrame={f} top={84} />
          </>
        )
      }
      return (
        <>
          <GridBg opacity={0.45} />
          {spec.title && <Kicker text={spec.title} color={A} localFrame={f} />}
          <text x={34} y={126} fontFamily={FONT} fontSize={64} fontWeight={800}
            fill={A} opacity={0.28 * t}>“</text>
          <RevealText text={spec.detail ?? ''} x={34} y={150} size={20} max={40}
            color={C.ink} weight={600} localFrame={f} delay={14} limit={4} />
          <SceneChart kind={spec.chart} seed={spec.seed} color={A} localFrame={f} top={286} />
        </>
      )
    }
  }
}
