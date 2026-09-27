// Shared drawing primitives for lesson visuals.
//
// Everything here is deterministic and frame-driven: given the same
// `localFrame` you get the same picture, which is what Remotion needs to
// scrub and render reliably. No randomness at render time — candle series
// are generated from a fixed seed up front.
//
// Visuals are authored against a 560×400 viewBox and scale to whatever panel
// they're dropped into.

import React from 'react'

export const VB_W = 560
export const VB_H = 400

export const C = {
  bull:   '#10b981',
  bear:   '#ef4444',
  amber:  '#f59e0b',
  blue:   '#60a5fa',
  violet: '#a78bfa',
  ink:    '#e2e8f0',
  muted:  'rgba(226,232,240,0.45)',
  grid:   'rgba(148,163,184,0.10)',
  panel:  'rgba(255,255,255,0.025)',
  edge:   'rgba(255,255,255,0.08)',
}

export const FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif"

// ── Timing helpers ──────────────────────────────────────────────────────────

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t)
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3)
export const easeInOut = (t: number) =>
  clamp01(t) < 0.5 ? 2 * clamp01(t) * clamp01(t) : 1 - Math.pow(-2 * clamp01(t) + 2, 2) / 2

/** Progress 0→1 for something that starts at `delay` and runs `dur` frames. */
export function rev(localFrame: number, delay = 0, dur = 20): number {
  return easeOut((localFrame - delay) / dur)
}

/** Gentle infinite bob — for idle motion so a slide never looks frozen. */
export function bob(localFrame: number, speed = 0.05, amp = 1): number {
  return Math.sin(localFrame * speed) * amp
}

// ── Deterministic candle data ───────────────────────────────────────────────

export interface Candle { o: number; h: number; l: number; c: number }

/**
 * Seeded candle generator. Same seed + shape always yields the same series,
 * so a lesson's visuals look identical on every replay and every machine.
 */
export function makeCandles(
  count: number,
  shape: 'up' | 'down' | 'range' | 'breakout' | 'hs' | 'vshape' = 'up',
  seed = 7,
): Candle[] {
  let s = seed >>> 0
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }

  const out: Candle[] = []
  let price = 100

  // Trends move in legs, not straight lines: an impulse, then a partial
  // give-back, then another impulse. Drawing a trend as constant drift makes
  // the "higher highs / higher lows" label meaningless because there are no
  // swings to point at — so up/down are built as impulse + pullback waves,
  // with each pullback retracing only part of the leg before it.
  const wave = (dir: 1 | -1) => {
    const legs: number[] = []
    let i = 0
    while (i < count) {
      const impulse = 3 + Math.floor(rand() * 3)          // 3–5 bars with trend
      const pull = 2 + Math.floor(rand() * 2)             // 2–3 bars against
      for (let k = 0; k < impulse && i < count; k++, i++) legs.push(dir)
      for (let k = 0; k < pull && i < count; k++, i++) legs.push(-dir as 1 | -1)
    }
    return legs
  }
  const legs = shape === 'up' ? wave(1) : shape === 'down' ? wave(-1) : []

  for (let i = 0; i < count; i++) {
    const pct = i / Math.max(count - 1, 1)
    let drift: number

    switch (shape) {
      case 'up':
      case 'down': {
        const dir = legs[i] ?? 1
        const withTrend = dir === (shape === 'up' ? 1 : -1)
        // Pullbacks are shallower than the impulse that preceded them, which
        // is what keeps the swing lows rising in an uptrend.
        const strength = withTrend ? 1.15 + rand() * 0.75 : -(0.5 + rand() * 0.45)
        drift = (shape === 'up' ? 1 : -1) * strength
        break
      }
      case 'range':    drift = (100 - price) * 0.22 + (rand() - 0.5) * 1.6; break
      case 'breakout': drift = pct < 0.62
                          ? (100 - price) * 0.3 + (rand() - 0.5) * 1.2
                          : 1.5 + (rand() - 0.4) * 0.9; break
      case 'hs':       drift = pct < 0.16 ?  0.9
                            : pct < 0.28 ? -0.8
                            : pct < 0.46 ?  1.3
                            : pct < 0.58 ? -1.2
                            : pct < 0.74 ?  0.85
                            :              -1.1; break
      case 'vshape':   drift = pct < 0.45 ? -1.1 : 1.2; break
      default:         drift = 0
    }

    const o = price
    const c = price + drift
    const wick = 0.4 + rand() * 1.1
    out.push({ o, c, h: Math.max(o, c) + wick, l: Math.min(o, c) - wick })
    price = c
  }
  return out
}

/**
 * Swing pivots — a bar whose high (or low) exceeds its neighbours either side.
 * Used so trend labels attach to real turning points in the data rather than
 * fixed indices that may land mid-leg.
 */
export function findSwings(
  candles: Candle[],
  kind: 'high' | 'low',
  span = 2,
): number[] {
  const out: number[] = []
  for (let i = span; i < candles.length - span; i++) {
    let isPivot = true
    for (let k = 1; k <= span; k++) {
      if (kind === 'high') {
        if (candles[i].h <= candles[i - k].h || candles[i].h <= candles[i + k].h) { isPivot = false; break }
      } else {
        if (candles[i].l >= candles[i - k].l || candles[i].l >= candles[i + k].l) { isPivot = false; break }
      }
    }
    if (isPivot) out.push(i)
  }
  return out
}

export interface Scale { x: (i: number) => number; y: (p: number) => number; w: number }

export function makeScale(
  candles: Candle[],
  box: { left: number; right: number; top: number; bottom: number },
  padPct = 0.12,
): Scale {
  const hi = Math.max(...candles.map(c => c.h))
  const lo = Math.min(...candles.map(c => c.l))
  const pad = (hi - lo) * padPct || 1
  const min = lo - pad
  const max = hi + pad
  const colW = (box.right - box.left) / candles.length

  return {
    w: colW,
    x: (i: number) => box.left + (i + 0.5) * colW,
    y: (p: number) =>
      box.bottom - ((p - min) / (max - min)) * (box.bottom - box.top),
  }
}

/**
 * One element of a scene build-up: arrives on a stagger and then stays put
 * for the rest of the scene.
 */
export const El: React.FC<{
  at: number; f: number
  from?: 'left' | 'right' | 'below' | 'fade'
  children: React.ReactNode
}> = ({ at, f, from = 'below', children }) => {
  const t = rev(f, at, 20)
  if (t <= 0) return null
  const dx = from === 'left' ? (1 - t) * -70 : from === 'right' ? (1 - t) * 70 : 0
  const dy = from === 'below' ? (1 - t) * 34 : 0
  return (
    <g opacity={Math.min(t * 1.15, 1)} transform={`translate(${dx},${dy})`}>
      {children}
    </g>
  )
}

// ── Reusable pieces ─────────────────────────────────────────────────────────

export const GridBg: React.FC<{ step?: number; opacity?: number }> = ({
  step = 40, opacity = 1,
}) => (
  <g opacity={opacity}>
    {Array.from({ length: Math.ceil(VB_H / step) }).map((_, i) => (
      <line key={`h${i}`} x1={0} x2={VB_W} y1={i * step} y2={i * step}
        stroke={C.grid} strokeWidth={1} />
    ))}
    {Array.from({ length: Math.ceil(VB_W / step) }).map((_, i) => (
      <line key={`v${i}`} y1={0} y2={VB_H} x1={i * step} x2={i * step}
        stroke={C.grid} strokeWidth={1} />
    ))}
  </g>
)

/**
 * Candles that draw in left-to-right. Each candle grows from its open price,
 * which reads as the market "printing" bar by bar rather than a static image
 * fading in.
 */
export const Candles: React.FC<{
  candles: Candle[]
  scale: Scale
  localFrame: number
  delay?: number
  perCandle?: number
  bodyW?: number
  dim?: number[]          // indices drawn faded, to spotlight others
  highlight?: number[]    // indices drawn with a glow ring
}> = ({ candles, scale, localFrame, delay = 0, perCandle = 2.2, bodyW = 0.58, dim = [], highlight = [] }) => (
  <g>
    {candles.map((cd, i) => {
      const t = rev(localFrame, delay + i * perCandle, 10)
      if (t <= 0) return null

      const up = cd.c >= cd.o
      const color = up ? C.bull : C.bear
      const yO = scale.y(cd.o)
      const yC = scale.y(cd.c)
      const yH = scale.y(cd.h)
      const yL = scale.y(cd.l)
      const x = scale.x(i)
      const w = scale.w * bodyW

      // Grow from the open price outward.
      const top = Math.min(yO, yC)
      const h = Math.max(Math.abs(yC - yO), 1.5)
      const animTop = yO + (top - yO) * t
      const animH = h * t
      const faded = dim.includes(i)
      const lit = highlight.includes(i)

      return (
        <g key={i} opacity={faded ? 0.22 : 1}>
          {lit && (
            <rect x={x - w / 2 - 4} y={yH - 4} width={w + 8} height={yL - yH + 8}
              rx={4} fill="none" stroke={color} strokeWidth={1.5} opacity={0.35 * t} />
          )}
          <line x1={x} x2={x} y1={yO + (yH - yO) * t} y2={yO + (yL - yO) * t}
            stroke={color} strokeWidth={1.5} opacity={0.9} />
          <rect x={x - w / 2} y={animTop} width={w} height={animH}
            fill={color} rx={1} />
        </g>
      )
    })}
  </g>
)

/** A labelled horizontal level that wipes in from the left. */
export const Level: React.FC<{
  y: number; label?: string; color?: string; localFrame: number
  delay?: number; dashed?: boolean; left?: number; right?: number
}> = ({ y, label, color = C.amber, localFrame, delay = 0, dashed = true, left = 18, right = VB_W - 18 }) => {
  const t = rev(localFrame, delay, 22)
  if (t <= 0) return null
  const x2 = left + (right - left) * t

  return (
    <g>
      <line x1={left} x2={x2} y1={y} y2={y} stroke={color} strokeWidth={1.6}
        strokeDasharray={dashed ? '6 5' : undefined} opacity={0.85} />
      {label && t > 0.7 && (
        <Tag x={right - 4} y={y} text={label} color={color} anchor="end"
          opacity={rev(localFrame, delay + 16, 12)} />
      )}
    </g>
  )
}

/** Small pill label. Anchored left by default. */
export const Tag: React.FC<{
  x: number; y: number; text: string; color?: string
  anchor?: 'start' | 'end'; opacity?: number; size?: number
}> = ({ x, y, text, color = C.ink, anchor = 'start', opacity = 1, size = 12 }) => {
  const w = text.length * size * 0.62 + 16
  const rx = anchor === 'end' ? x - w : x
  return (
    <g opacity={opacity}>
      <rect x={rx} y={y - size} width={w} height={size * 2} rx={size * 0.7}
        fill="rgba(8,14,26,0.88)" stroke={color} strokeWidth={1} opacity={0.95} />
      <text x={rx + w / 2} y={y + size * 0.38} textAnchor="middle"
        fontFamily={FONT} fontSize={size} fontWeight={700} fill={color}>
        {text}
      </text>
    </g>
  )
}

/** Caption strip along the bottom of a visual. */
export const Caption: React.FC<{ text: string; localFrame: number; delay?: number; color?: string }> = ({
  text, localFrame, delay = 24, color = C.muted,
}) => {
  const t = rev(localFrame, delay, 18)
  if (t <= 0) return null
  return (
    <text x={VB_W / 2} y={VB_H - 14} textAnchor="middle" fontFamily={FONT}
      fontSize={14} fontWeight={600} fill={color} opacity={t}
      letterSpacing="0.04em">
      {text}
    </text>
  )
}

/** Arrow with an animated draw-on, used for direction/《move》callouts. */
export const Arrow: React.FC<{
  x1: number; y1: number; x2: number; y2: number
  color?: string; localFrame: number; delay?: number; width?: number
}> = ({ x1, y1, x2, y2, color = C.ink, localFrame, delay = 0, width = 2.4 }) => {
  const t = rev(localFrame, delay, 20)
  if (t <= 0) return null
  const cx = x1 + (x2 - x1) * t
  const cy = y1 + (y2 - y1) * t
  const ang = Math.atan2(y2 - y1, x2 - x1)
  const head = 9

  return (
    <g opacity={Math.min(t * 1.6, 1)}>
      <line x1={x1} y1={y1} x2={cx} y2={cy} stroke={color} strokeWidth={width}
        strokeLinecap="round" />
      {t > 0.85 && (
        <polygon
          points={[
            `${x2},${y2}`,
            `${x2 - head * Math.cos(ang - 0.42)},${y2 - head * Math.sin(ang - 0.42)}`,
            `${x2 - head * Math.cos(ang + 0.42)},${y2 - head * Math.sin(ang + 0.42)}`,
          ].join(' ')}
          fill={color}
        />
      )}
    </g>
  )
}

/** Shaded zone (entry band, range, profit box). */
export const Zone: React.FC<{
  x: number; y: number; w: number; h: number; color: string
  localFrame: number; delay?: number; label?: string
}> = ({ x, y, w, h, color, localFrame, delay = 0, label }) => {
  const t = rev(localFrame, delay, 20)
  if (t <= 0) return null
  return (
    <g opacity={t}>
      <rect x={x} y={y} width={w} height={h * t} rx={3}
        fill={color} fillOpacity={0.16} stroke={color} strokeWidth={1.2} strokeOpacity={0.5} />
      {label && t > 0.6 && (
        <text x={x + 8} y={y + 16} fontFamily={FONT} fontSize={11} fontWeight={700}
          fill={color} opacity={t} letterSpacing="0.06em">{label}</text>
      )}
    </g>
  )
}
