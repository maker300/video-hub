// Full-frame scene composition.
//
// Earlier revisions dropped everything into one small bordered card floating
// in the middle of the frame. This version uses the whole stage: elements are
// placed across the width, enter one after another on a stagger, and STAY on
// screen as the next one arrives — so a scene builds up rather than popping
// in all at once. The whole assembly then leaves together, which is handled a
// level up in StageSlide.

import React from 'react'
import type { SceneSpec } from '@/lib/lesson-scene-spec'
import {
  C, FONT, rev, bob, El,
  makeCandles, makeScale, Candles, findSwings,
} from './primitives'
import { VISUALS } from './visuals'
import { SCENE_ART } from './scene-art'

export const SW = 1280   // stage viewBox width
export const SH = 540    // stage viewBox height

const ACCENT_MAP: Record<SceneSpec['accent'], string> = {
  bull: C.bull, bear: C.bear, amber: C.amber, blue: C.blue, violet: C.violet,
}

// ── Staged element ──────────────────────────────────────────────────────────

function wrapText(text: string, max: number, limit: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const next = (cur + ' ' + w).trim()
    if (next.length > max) {
      if (lines.length + 1 >= limit) break
      lines.push(cur.trim()); cur = w
    } else cur = next
  }
  if (cur && lines.length < limit) lines.push(cur.trim())
  return lines.filter(Boolean)
}

// ── Shared furniture ────────────────────────────────────────────────────────

const Kicker: React.FC<{ text: string; color: string; f: number; x?: number; y?: number }> = ({
  text, color, f, x = 72, y = 74,
}) => (
  <El at={2} f={f} from="left">
    <rect x={x} y={y - 15} width={5} height={20} rx={2.5} fill={color} />
    <text x={x + 18} y={y} fontFamily={FONT} fontSize={16} fontWeight={800}
      fill={color} letterSpacing="0.14em">
      {(text.length > 54 ? text.slice(0, 53) + '…' : text).toUpperCase()}
    </text>
  </El>
)

/** Wide chart that spans the stage. Draws across as the scene plays. */
const WideChart: React.FC<{
  kind: 'spark' | 'candles'; seed: number; color: string; f: number
  box: { left: number; right: number; top: number; bottom: number }
  at?: number
}> = ({ kind, seed, color, f, box, at = 20 }) => {
  const shape = (['up', 'down', 'range', 'breakout', 'vshape'] as const)[seed % 5]
  const candles = makeCandles(kind === 'candles' ? 34 : 44, shape, seed % 9973)
  const scale = makeScale(candles, box)

  if (kind === 'candles') {
    return (
      <Candles candles={candles} scale={scale} localFrame={f}
        delay={at} perCandle={1.5} bodyW={0.56} />
    )
  }

  const t = rev(f, at, 46)
  const n = Math.max(Math.floor(candles.length * t), 2)
  const pts = candles.slice(0, n)
  const d = pts.map((c, i) => `${i === 0 ? 'M' : 'L'}${scale.x(i)},${scale.y(c.c)}`).join(' ')
  const area = `${d} L${scale.x(n - 1)},${box.bottom} L${scale.x(0)},${box.bottom} Z`

  return (
    <g>
      <path d={area} fill={color} fillOpacity={0.10} />
      <path d={d} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round"
        strokeLinejoin="round" opacity={0.92} />
      {n > 2 && (
        <g>
          <circle cx={scale.x(n - 1)} cy={scale.y(pts[n - 1].c)} r={16 + bob(f, 0.1, 3)}
            fill={color} opacity={0.14} />
          <circle cx={scale.x(n - 1)} cy={scale.y(pts[n - 1].c)} r={6} fill={color} />
        </g>
      )}
    </g>
  )
}

/** Chip row that deals out left to right and stays. */
const ChipRow: React.FC<{
  items: string[]; color: string; f: number; at: number
  y: number; x?: number; maxW?: number
}> = ({ items, color, f, at, y, x = 72, maxW = SW - 144 }) => {
  const gap = 18
  const w = Math.min(268, (maxW - gap * (items.length - 1)) / Math.max(items.length, 1))
  return (
    <>
      {items.map((it, i) => (
        <El key={it} at={at + i * 7} f={f} from="below">
          <rect x={x + i * (w + gap)} y={y} width={w} height={64} rx={14}
            fill={color} fillOpacity={0.13} stroke={color} strokeWidth={1.4} strokeOpacity={0.55} />
          <text x={x + i * (w + gap) + w / 2} y={y + 41} textAnchor="middle"
            fontFamily={FONT} fontSize={it.length > 14 ? 17 : 21} fontWeight={700} fill={color}>
            {it}
          </text>
        </El>
      ))}
    </>
  )
}

// ── The scene ───────────────────────────────────────────────────────────────

export const FullScene: React.FC<{ spec: SceneSpec; localFrame: number }> = ({
  spec, localFrame: f,
}) => {
  const A = ACCENT_MAP[spec.accent]

  switch (spec.layout) {

    // Authored for this exact scene, at full stage size.
    case 'art': {
      const Art = SCENE_ART[spec.artId ?? '']
      if (Art) {
        return (
          <>
            {spec.title && <Kicker text={spec.title} color={A} f={f} />}
            <Art f={f} variant={spec.artVariant ?? 0} accent={A} />
          </>
        )
      }
      break
    }

    // A real chart diagram, scaled up to own the stage.
    case 'diagram': {
      const entry = VISUALS[spec.diagramId ?? ''] ?? VISUALS['price-action']
      const Diagram = entry.Component
      // Diagrams are authored at 560×400 (ratio 1.4) but the stage is much
      // wider, so scale to the available HEIGHT and centre. Rails either side
      // stop the leftover width reading as empty screen.
      const head = spec.title ? 96 : 40
      const k = Math.min((SH - head - 20) / 400, (SW - 160) / 560)
      const dw = 560 * k
      const dx = (SW - dw) / 2
      const dy = head
      const railT = rev(f, 16, 26)
      return (
        <>
          {spec.title && <Kicker text={spec.title} color={A} f={f} />}
          <g opacity={0.5 * railT}>
            <rect x={dx - 34} y={dy + 10} width={4} height={(400 * k - 20) * railT} rx={2} fill={A} />
            <rect x={dx + dw + 30} y={dy + 10} width={4} height={(400 * k - 20) * railT} rx={2}
              fill={A} opacity={0.5} />
          </g>
          <g transform={`translate(${dx},${dy}) scale(${k})`}>
            <Diagram localFrame={f} variant={spec.diagramVariant ?? 0} />
          </g>
        </>
      )
    }

    // Figure first, then what it means, then the chart underneath it.
    case 'stat': {
      const v = spec.stat?.value ?? ''
      const size = v.length > 14 ? 92 : v.length > 9 ? 116 : 148
      return (
        <>
          {spec.title && <Kicker text={spec.title} color={A} f={f} />}
          <El at={12} f={f} from="below">
            <text x={72} y={228} fontFamily={FONT} fontSize={size} fontWeight={800} fill={A}>
              {v}
            </text>
          </El>
          {spec.label && (
            <El at={30} f={f} from="left">
              <text x={76} y={278} fontFamily={FONT} fontSize={26} fontWeight={600}
                fill={C.ink} opacity={0.9}>
                {spec.label.length > 58 ? spec.label.slice(0, 57) + '…' : spec.label}
              </text>
            </El>
          )}
          <El at={44} f={f} from="fade">
            <WideChart kind="spark" seed={spec.seed} color={A} f={f} at={48}
              box={{ left: 72, right: SW - 72, top: 330, bottom: SH - 34 }} />
          </El>
        </>
      )
    }

    // The named things spread across the full width.
    case 'chips': {
      const chips = (spec.chips ?? []).slice(0, 5)
      return (
        <>
          {spec.title && <Kicker text={spec.title} color={A} f={f} />}
          {spec.label && (
            <El at={12} f={f} from="left">
              {wrapText(spec.label, 46, 2).map((ln, i) => (
                <text key={i} x={72} y={168 + i * 52} fontFamily={FONT} fontSize={44}
                  fontWeight={800} fill={C.ink}>{ln}</text>
              ))}
            </El>
          )}
          <ChipRow items={chips} color={A} f={f} at={30} y={252} />
          <El at={30 + chips.length * 7 + 10} f={f} from="fade">
            <WideChart kind="spark" seed={spec.seed} color={A} f={f}
              at={30 + chips.length * 7 + 14}
              box={{ left: 72, right: SW - 72, top: 384, bottom: SH - 30 }} />
          </El>
        </>
      )
    }

    // Full-width 24-hour axis with the named windows stacked on it.
    case 'timeline': {
      const times = (spec.times ?? []).slice(0, 3)
      const x0 = 96, x1 = SW - 96
      const toMin = (v: string) => {
        const [h, m] = v.split(':').map(Number)
        return h * 60 + (m || 0)
      }
      const atX = (min: number) => x0 + (min / 1440) * (x1 - x0)
      const top = spec.label ? 236 : 196

      return (
        <>
          {spec.title && <Kicker text={spec.title} color={A} f={f} />}
          {spec.label && (
            <El at={10} f={f} from="left">
              <text x={72} y={168} fontFamily={FONT} fontSize={46} fontWeight={800} fill={C.ink}>
                {spec.label.length > 42 ? spec.label.slice(0, 41) + '…' : spec.label}
              </text>
            </El>
          )}
          <El at={22} f={f} from="fade">
            <line x1={x0} x2={x1} y1={top + times.length * 68 + 6} y2={top + times.length * 68 + 6}
              stroke={C.edge} strokeWidth={1.5} />
            {[0, 4, 8, 12, 16, 20, 24].map(h => (
              <g key={h}>
                <line x1={atX(h * 60)} x2={atX(h * 60)}
                  y1={top + times.length * 68} y2={top + times.length * 68 + 14}
                  stroke={C.edge} strokeWidth={1.5} />
                <text x={atX(h * 60)} y={top + times.length * 68 + 40} textAnchor="middle"
                  fontFamily={FONT} fontSize={16} fill={C.muted}>
                  {String(h % 24).padStart(2, '0')}:00
                </text>
              </g>
            ))}
          </El>
          {times.map((tm, i) => {
            const from = toMin(tm.from), to = toMin(tm.to)
            const segs = to > from ? [[from, to]] : [[from, 1440], [0, to]]
            const y = top + i * 68
            return (
              <El key={i} at={34 + i * 12} f={f} from="left">
                {segs.map(([a, b], k) => {
                  const t = rev(f, 34 + i * 12, 26)
                  return (
                    <rect key={k} x={atX(a)} y={y} width={Math.max((atX(b) - atX(a)) * t, 6)}
                      height={48} rx={10}
                      fill={A} fillOpacity={0.28} stroke={A} strokeWidth={1.6} />
                  )
                })}
                <text x={x0} y={y - 12} fontFamily={FONT} fontSize={19} fontWeight={800} fill={A}>
                  {tm.from} – {tm.to}{to <= from ? '  · over midnight' : ''}
                </text>
              </El>
            )
          })}
        </>
      )
    }

    // Two halves of the screen, then the verdict between them.
    case 'dual': {
      const left = spec.dual?.left ?? ''
      const right = spec.dual?.right ?? ''
      return (
        <>
          {spec.title && <Kicker text={spec.title} color={A} f={f} />}
          <El at={12} f={f} from="left">
            <rect x={72} y={150} width={520} height={220} rx={22}
              fill={C.bull} fillOpacity={0.12} stroke={C.bull} strokeWidth={2} />
            <text x={332} y={288} textAnchor="middle" fontFamily={FONT} fontSize={74}
              fontWeight={800} fill={C.bull}>{left}</text>
          </El>
          <El at={30} f={f} from="right">
            <rect x={SW - 592} y={150} width={520} height={220} rx={22}
              fill={C.bear} fillOpacity={0.12} stroke={C.bear} strokeWidth={2} />
            <text x={SW - 332} y={288} textAnchor="middle" fontFamily={FONT} fontSize={74}
              fontWeight={800} fill={C.bear}>{right}</text>
          </El>
          <El at={48} f={f} from="fade">
            <circle cx={SW / 2} cy={260} r={38} fill="#0b1220" stroke={C.edge} strokeWidth={1.5} />
            <text x={SW / 2} y={270} textAnchor="middle" fontFamily={FONT} fontSize={22}
              fontWeight={700} fill={C.muted}>or</text>
          </El>
          <El at={60} f={f} from="below">
            <text x={SW / 2} y={430} textAnchor="middle" fontFamily={FONT} fontSize={24}
              fontWeight={600} fill={C.ink} opacity={0.85}>
              Both directions are tradable
            </text>
          </El>
        </>
      )
    }

    // The term owns the left, a live chart builds on the right.
    case 'define':
    case 'concept':
    case 'callout': {
      const hero = spec.keyphrase ?? spec.label ?? ''
      const lines = wrapText(hero, 18, 3)
      const size = lines.length > 2 ? 58 : lines.length > 1 ? 70 : 84
      return (
        <>
          {spec.title && <Kicker text={spec.title} color={A} f={f} />}
          <El at={10} f={f} from="left">
            {lines.map((ln, i) => (
              <text key={i} x={72} y={200 + i * (size + 8)} fontFamily={FONT}
                fontSize={size} fontWeight={800} fill={A}>{ln}</text>
            ))}
          </El>
          <El at={26} f={f} from="left">
            <rect x={72} y={200 + (lines.length - 1) * (size + 8) + 34} width={280} height={5}
              rx={2.5} fill={A} opacity={0.7} />
          </El>
          <El at={36} f={f} from="right">
            <WideChart kind={spec.seed % 2 === 0 ? 'candles' : 'spark'}
              seed={spec.seed} color={A} f={f} at={40}
              box={{ left: 470, right: SW - 72, top: 120, bottom: SH - 56 }} />
          </El>
        </>
      )
    }

    // No structure to lift out — the market itself is the visual.
    case 'quote':
    default:
      break
  }

  // Fallthrough for 'art' with an unknown id, plus the quote default.
  {
      const seriesUp = spec.seed % 2 === 0
      const candles = makeCandles(38, seriesUp ? 'up' : 'down', spec.seed % 7919)
      const box = { left: 96, right: SW - 96, top: 148, bottom: SH - 66 }
      const scale = makeScale(candles, box)
      const swings = findSwings(candles, seriesUp ? 'low' : 'high').slice(0, 3)

      return (
        <>
          {spec.title && <Kicker text={spec.title} color={A} f={f} />}
          <El at={8} f={f} from="fade">
            <Candles candles={candles} scale={scale} localFrame={f}
              delay={12} perCandle={1.3} bodyW={0.56} />
          </El>
          {/* Pullback markers appear once the series has drawn past them */}
          {swings.map((i, k) => (
            <El key={i} at={12 + i * 1.3 + 14} f={f} from="fade">
              <circle cx={scale.x(i)} cy={seriesUp ? scale.y(candles[i].l) + 22 : scale.y(candles[i].h) - 22}
                r={11 + bob(f + k * 18, 0.1, 2)} fill="none" stroke={A} strokeWidth={2} opacity={0.75} />
            </El>
          ))}
          <El at={60} f={f} from="below">
            <text x={SW / 2} y={SH - 16} textAnchor="middle" fontFamily={FONT}
              fontSize={19} fontWeight={600} fill={C.muted}>
              {seriesUp ? 'Higher lows — buyers stepping in earlier' : 'Lower highs — sellers stepping in earlier'}
            </text>
          </El>
        </>
      )
  }
}
