import React from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion'

export interface Candle { o: number; h: number; l: number; c: number }

export interface ForexAnnotation {
  type: 'support' | 'resistance' | 'entry' | 'target' | 'stop'
  price: number
  label: string
}

export interface ForexChartConfig {
  pair:        string
  setup:       string
  timeframe:   string
  trend:       'bullish' | 'bearish' | 'ranging'
  candles:     Candle[]
  ema20?:      number[]
  ema50?:      number[]
  annotations: ForexAnnotation[]
  description?: string
}

const C = {
  bg:         '#070d1a',
  bg2:        '#0d1526',
  grid:       '#1a2a40',
  bullish:    '#059669',
  bearish:    '#dc2626',
  ema20:      '#3b82f6',
  ema50:      '#f59e0b',
  support:    '#10b981',
  resistance: '#ef4444',
  entry:      '#818cf8',
  target:     '#22c55e',
  stop:       '#f97316',
  text:       '#64748b',
  textBright: '#94a3b8',
  white:      '#f1f5f9',
}

const ANNOT_COLOR: Record<ForexAnnotation['type'], string> = {
  support: C.support, resistance: C.resistance,
  entry: C.entry, target: C.target, stop: C.stop,
}

function pointsToPath(pts: [number, number][]): string {
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
}

export function ForexChartScene({
  config,
  totalFrames,
}: {
  config: ForexChartConfig
  totalFrames: number
}) {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()

  const candles = config.candles.slice(0, 20)
  const n = candles.length

  // ── Price range ─────────────────────────────────────────────────────────────
  const allPrices = [
    ...candles.flatMap(c => [c.h, c.l]),
    ...(config.ema20 ?? []),
    ...(config.ema50 ?? []),
    ...config.annotations.map(a => a.price),
  ]
  const rawMin = Math.min(...allPrices)
  const rawMax = Math.max(...allPrices)
  const pad    = (rawMax - rawMin) * 0.18
  const priceMin = rawMin - pad
  const priceMax = rawMax + pad

  // ── Chart geometry (% of viewport) ──────────────────────────────────────────
  const CL = width  * 0.11   // chart left
  const CR = width  * 0.82   // chart right
  const CT = height * 0.18   // chart top
  const CB = height * 0.80   // chart bottom
  const CW = CR - CL
  const CH = CB - CT

  const toY  = (p: number) => CB - ((p - priceMin) / (priceMax - priceMin)) * CH
  const toX  = (i: number) => CL + (i + 0.5) * (CW / (n + 1))
  const bw   = Math.max(4, (CW / (n + 1)) * 0.6)

  // ── Timings ──────────────────────────────────────────────────────────────────
  const GRID_IN  = 8
  const CAND_IN  = 22
  const CAND_SPD = 3
  const EMA_IN   = CAND_IN + n * CAND_SPD + 8
  const ANN_IN   = EMA_IN + 35

  const fadeIn  = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' })
  const gridOp  = interpolate(frame, [GRID_IN, GRID_IN + 15], [0, 1], { extrapolateRight: 'clamp' })
  const emaOp   = interpolate(frame, [EMA_IN, EMA_IN + 10], [0, 1], { extrapolateRight: 'clamp' })
  const emaProgress = interpolate(frame, [EMA_IN, EMA_IN + 40], [0, 1], { extrapolateRight: 'clamp' })

  // ── Price formatter ──────────────────────────────────────────────────────────
  const isJpy  = config.pair.includes('JPY')
  const isXau  = config.pair.includes('XAU') || config.pair.includes('GOLD')
  const dec    = isJpy ? 3 : isXau ? 2 : 5
  const fmt    = (p: number) => p.toFixed(dec)

  // ── EMA paths ────────────────────────────────────────────────────────────────
  const ema20pts: [number, number][] = (config.ema20 ?? []).slice(0, n)
    .map((p, i) => [toX(i), toY(p)] as [number, number])
  const ema50pts: [number, number][] = (config.ema50 ?? []).slice(0, n)
    .map((p, i) => [toX(i), toY(p)] as [number, number])

  const visibleEma = Math.floor(emaProgress * n)
  const ema20Path = pointsToPath(ema20pts.slice(0, Math.max(2, visibleEma)))
  const ema50Path = pointsToPath(ema50pts.slice(0, Math.max(2, visibleEma)))

  // ── Price grid steps ─────────────────────────────────────────────────────────
  const gridSteps = [0, 0.2, 0.4, 0.6, 0.8, 1]

  // ── Current price (last candle close) ────────────────────────────────────────
  const lastClose = candles[candles.length - 1]?.c ?? 0
  const prevClose = candles[candles.length - 2]?.c ?? lastClose
  const priceUp   = lastClose >= prevClose

  const titleFontSize  = Math.min(width * 0.028, 32)
  const labelFontSize  = Math.min(width * 0.013, 14)
  const priceFontSize  = Math.min(width * 0.014, 15)
  const annotFontSize  = Math.min(width * 0.012, 13)

  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${C.bg} 0%, ${C.bg2} 100%)`, opacity: fadeIn }}>

      {/* ── Header bar ──────────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: CT * 0.85,
        display: 'flex', alignItems: 'center', gap: 16,
        padding: `0 ${CL}px`,
        borderBottom: `1px solid ${C.grid}`,
      }}>
        {/* Pair */}
        <span style={{ color: C.white, fontFamily: 'Inter,monospace', fontWeight: 800, fontSize: titleFontSize, letterSpacing: -0.5 }}>
          {config.pair}
        </span>
        {/* Timeframe badge */}
        <span style={{ color: C.ema20, fontFamily: 'monospace', fontWeight: 700, fontSize: labelFontSize * 0.9,
          background: '#3b82f620', border: `1px solid ${C.ema20}40`, borderRadius: 4, padding: '2px 8px' }}>
          {config.timeframe}
        </span>
        {/* Current price */}
        <span style={{ color: priceUp ? C.bullish : C.bearish, fontFamily: 'monospace', fontWeight: 700, fontSize: priceFontSize }}>
          {fmt(lastClose)}
        </span>
        <div style={{ flex: 1 }} />
        {/* Setup label */}
        <span style={{
          color: config.trend === 'bullish' ? C.bullish : config.trend === 'bearish' ? C.bearish : C.textBright,
          fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: labelFontSize,
          background: config.trend === 'bullish' ? `${C.bullish}18` : config.trend === 'bearish' ? `${C.bearish}18` : `${C.text}18`,
          border: `1px solid ${config.trend === 'bullish' ? C.bullish : config.trend === 'bearish' ? C.bearish : C.grid}40`,
          borderRadius: 6, padding: '4px 12px',
          opacity: interpolate(frame, [20, 35], [0, 1], { extrapolateRight: 'clamp' }),
        }}>
          {config.trend === 'bullish' ? '▲' : config.trend === 'bearish' ? '▼' : '◆'} {config.setup}
        </span>
      </div>

      {/* ── SVG chart ───────────────────────────────────────────────────────── */}
      <svg
        width={width} height={height}
        style={{ position: 'absolute', inset: 0 }}
        overflow="visible"
      >
        {/* Grid */}
        <g opacity={gridOp}>
          {gridSteps.map(frac => {
            const y = CT + frac * CH
            const p = priceMax - frac * (priceMax - priceMin)
            return (
              <g key={frac}>
                <line x1={CL} y1={y} x2={CR} y2={y}
                  stroke={C.grid} strokeWidth={1} strokeDasharray="3 7" />
                <text x={CL - 8} y={y + 4} textAnchor="end"
                  fill={C.text} fontSize={priceFontSize * 0.88} fontFamily="monospace">
                  {fmt(p)}
                </text>
              </g>
            )
          })}
          {/* Vertical dividers */}
          {candles.map((_, i) => (
            i % 4 === 0 && (
              <line key={i} x1={toX(i)} y1={CT} x2={toX(i)} y2={CB}
                stroke={C.grid} strokeWidth={0.6} opacity={0.5} />
            )
          ))}
          {/* Border */}
          <rect x={CL} y={CT} width={CW} height={CH}
            fill="none" stroke={C.grid} strokeWidth={1.5} rx={2} />
        </g>

        {/* EMA50 */}
        {ema50pts.length >= 2 && (
          <path d={ema50Path} fill="none"
            stroke={C.ema50} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            opacity={emaOp} />
        )}
        {/* EMA20 */}
        {ema20pts.length >= 2 && (
          <path d={ema20Path} fill="none"
            stroke={C.ema20} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
            opacity={emaOp} />
        )}

        {/* Candlesticks */}
        {candles.map((c, i) => {
          const sf = CAND_IN + i * CAND_SPD
          const prog = interpolate(frame, [sf, sf + 8], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          })
          if (prog === 0) return null

          const x      = toX(i)
          const bull   = c.c >= c.o
          const color  = bull ? C.bullish : C.bearish
          const bTop   = toY(Math.max(c.o, c.c))
          const bBot   = toY(Math.min(c.o, c.c))
          const bodyH  = Math.max(2, (bBot - bTop) * prog)
          const wickT  = toY(c.h)
          const wickB  = toY(c.l)

          return (
            <g key={i} opacity={prog}>
              {/* Wick */}
              <line x1={x} y1={wickT} x2={x} y2={wickB}
                stroke={color} strokeWidth={1.5} />
              {/* Body */}
              {bull ? (
                <rect x={x - bw / 2} y={bBot - bodyH} width={bw} height={bodyH}
                  fill={color} rx={1} />
              ) : (
                <rect x={x - bw / 2} y={bTop} width={bw} height={bodyH}
                  fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.5} rx={1} />
              )}
            </g>
          )
        })}

        {/* Annotations */}
        {config.annotations.map((ann, i) => {
          const sf  = ANN_IN + i * 14
          const op  = interpolate(frame, [sf, sf + 12], [0, 1], { extrapolateRight: 'clamp' })
          if (op === 0) return null
          const y    = toY(ann.price)
          const col  = ANNOT_COLOR[ann.type]
          const lblW = 90

          return (
            <g key={i} opacity={op}>
              {/* Horizontal dashed line */}
              <line x1={CL} y1={y} x2={CR} y2={y}
                stroke={col} strokeWidth={1.2} strokeDasharray="5 5" />
              {/* Price label on left */}
              <rect x={CL - 68} y={y - 9} width={64} height={18} rx={3}
                fill={col + '22'} stroke={col} strokeWidth={0.8} />
              <text x={CL - 36} y={y + 4} textAnchor="middle"
                fill={col} fontSize={annotFontSize * 0.85} fontFamily="monospace" fontWeight={700}>
                {fmt(ann.price)}
              </text>
              {/* Label badge on right */}
              <rect x={CR + 4} y={y - 10} width={lblW} height={20} rx={4}
                fill={col + '28'} stroke={col} strokeWidth={1} />
              <text x={CR + 8} y={y + 4}
                fill={col} fontSize={annotFontSize} fontFamily="Inter,sans-serif" fontWeight={700}>
                {ann.label}
              </text>
            </g>
          )
        })}

        {/* Current price line */}
        {(() => {
          const y   = toY(lastClose)
          const op  = interpolate(frame, [CAND_IN + n * CAND_SPD, CAND_IN + n * CAND_SPD + 12], [0, 1], { extrapolateRight: 'clamp' })
          const col = priceUp ? C.bullish : C.bearish
          return (
            <g opacity={op}>
              <line x1={CL} y1={y} x2={CR} y2={y}
                stroke={col} strokeWidth={1} strokeDasharray="2 4" opacity={0.6} />
              <rect x={CR + 2} y={y - 9} width={70} height={18} rx={3} fill={col} />
              <text x={CR + 37} y={y + 4} textAnchor="middle"
                fill="#fff" fontSize={annotFontSize * 0.9} fontFamily="monospace" fontWeight={800}>
                {fmt(lastClose)}
              </text>
            </g>
          )
        })()}
      </svg>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      {(config.ema20 || config.ema50) && (
        <div style={{
          position: 'absolute',
          bottom: height - CB + 6,
          left: CL,
          display: 'flex', gap: 14, alignItems: 'center',
          opacity: emaOp,
        }}>
          {config.ema20 && (
            <span style={{ color: C.ema20, fontFamily: 'monospace', fontSize: labelFontSize * 0.85, fontWeight: 700 }}>
              ── EMA 20
            </span>
          )}
          {config.ema50 && (
            <span style={{ color: C.ema50, fontFamily: 'monospace', fontSize: labelFontSize * 0.85, fontWeight: 700 }}>
              ── EMA 50
            </span>
          )}
        </div>
      )}

      {/* ── Description watermark ────────────────────────────────────────────── */}
      {config.description && (
        <div style={{
          position: 'absolute', bottom: height * 0.04, right: CL,
          color: C.text, fontFamily: 'Inter,sans-serif',
          fontSize: labelFontSize * 0.8, opacity: 0.7,
          maxWidth: width * 0.5, textAlign: 'right',
        }}>
          {config.description}
        </div>
      )}

    </AbsoluteFill>
  )
}
