// The animated illustration library used by lesson videos.
//
// Each visual is a pure function of `localFrame` (frames since its slide
// started) and `variant`. They are deliberately simple shapes rather than
// decorative art: the job is to show the thing the narrator is describing at
// the moment they describe it.
//
// WHY VARIANTS: a lesson about currency pairs mentions currency pairs in
// nearly every segment, so keyword matching alone lands on the same graphic
// a dozen times in a row — which looks just as frozen as plain text did.
// Every visual therefore renders `variants` distinct versions (a different
// angle on the same idea, or at minimum different market data), and the
// matcher cycles through them. Same subject, never the same picture twice.

import React from 'react'
import {
  VB_W, VB_H, C, FONT, rev, bob, easeInOut, clamp01,
  makeCandles, makeScale, Candles, Level, Tag, Caption, Arrow, Zone, GridBg,
  findSwings,
} from './primitives'

export interface VisualProps { localFrame: number; variant: number }

const BOX = { left: 28, right: VB_W - 28, top: 46, bottom: VB_H - 52 }

/** Cheap helper: pick item `variant` from a list, wrapping. */
const pick = <T,>(list: T[], variant: number): T => list[variant % list.length]

// ── Price action (the default) ──────────────────────────────────────────────

const PriceAction: React.FC<VisualProps> = ({ localFrame, variant }) => {
  const cfg = pick([
    { shape: 'up' as const,       seed: 11, cap: 'Price moves — candle by candle' },
    { shape: 'down' as const,     seed: 29, cap: 'Sellers in control' },
    { shape: 'range' as const,    seed: 41, cap: 'No trend — price is balanced' },
    { shape: 'breakout' as const, seed: 53, cap: 'Quiet, then a decisive move' },
  ], variant)

  const candles = makeCandles(26, cfg.shape, cfg.seed)
  const scale = makeScale(candles, BOX)
  const shown = Math.min(Math.floor(localFrame / 2.2), candles.length - 1)
  const last = candles[Math.max(shown, 0)]

  return (
    <>
      <GridBg opacity={0.7} />
      <Candles candles={candles} scale={scale} localFrame={localFrame} />
      {shown > 1 && (
        <Level y={scale.y(last.c)} label={last.c.toFixed(2)} color={C.blue}
          localFrame={localFrame} delay={0} />
      )}
      <Caption text={cfg.cap} localFrame={localFrame} delay={40} />
    </>
  )
}

// ── Candle anatomy ──────────────────────────────────────────────────────────

const CandleAnatomy: React.FC<VisualProps> = ({ localFrame, variant }) => {
  const bull = variant % 2 === 0
  const color = bull ? C.bull : C.bear
  const cx = 200
  const bodyTop = 150
  const bodyH = 120
  const grow = rev(localFrame, 4, 22)
  const wickT = rev(localFrame, 16, 18)

  return (
    <>
      <GridBg opacity={0.5} />
      <line x1={cx} x2={cx} y1={bodyTop - 58 * wickT} y2={bodyTop} stroke={color} strokeWidth={3} />
      <line x1={cx} x2={cx} y1={bodyTop + bodyH} y2={bodyTop + bodyH + 52 * wickT}
        stroke={color} strokeWidth={3} />
      <rect x={cx - 34} y={bodyTop + bodyH * (1 - grow)} width={68} height={bodyH * grow}
        fill={color} rx={3} />

      {[
        { y: bodyTop - 58, t: 'High', d: 34 },
        { y: bodyTop, t: bull ? 'Close' : 'Open', d: 42 },
        { y: bodyTop + bodyH, t: bull ? 'Open' : 'Close', d: 50 },
        { y: bodyTop + bodyH + 52, t: 'Low', d: 58 },
      ].map(l => {
        const t = rev(localFrame, l.d, 14)
        if (t <= 0) return null
        return (
          <g key={l.t} opacity={t}>
            <line x1={cx + 40} x2={330} y1={l.y} y2={l.y}
              stroke={C.muted} strokeWidth={1} strokeDasharray="3 3" />
            <Tag x={338} y={l.y} text={l.t} color={C.ink} opacity={t} />
          </g>
        )
      })}

      <text x={cx} y={VB_H - 30} textAnchor="middle" fontFamily={FONT} fontSize={13}
        fontWeight={700} fill={color} opacity={rev(localFrame, 64, 14)}>
        {bull ? 'Bullish — closed above open' : 'Bearish — closed below open'}
      </text>
    </>
  )
}

// ── Bullish / bearish / doji ────────────────────────────────────────────────

const CandleTypes: React.FC<VisualProps> = ({ localFrame, variant }) => {
  const midY = 200
  const sets = [
    [
      { x: 110, label: 'Bullish', color: C.bull, bodyH: 110, sub: 'buyers won' },
      { x: 280, label: 'Bearish', color: C.bear, bodyH: 110, sub: 'sellers won' },
      { x: 450, label: 'Doji',    color: C.amber, bodyH: 6,  sub: 'indecision' },
    ],
    [
      { x: 110, label: 'Strong', color: C.bull, bodyH: 140, sub: 'big body' },
      { x: 280, label: 'Weak',   color: C.bull, bodyH: 42,  sub: 'small body' },
      { x: 450, label: 'Stalled', color: C.amber, bodyH: 14, sub: 'no progress' },
    ],
  ]
  const specs = pick(sets, variant)
  const caption = variant % 2 === 0
    ? 'Who won the fight in this candle?'
    : 'Body size tells you conviction'

  return (
    <>
      <GridBg opacity={0.5} />
      {specs.map((s, i) => {
        const t = rev(localFrame, 6 + i * 16, 20)
        if (t <= 0) return null
        const h = s.bodyH * t
        const top = midY - h / 2
        return (
          <g key={s.label} opacity={Math.min(t * 1.4, 1)}>
            <line x1={s.x} x2={s.x} y1={top - 44} y2={top + h + 44}
              stroke={s.color} strokeWidth={3} />
            <rect x={s.x - 26} y={top} width={52} height={Math.max(h, 4)}
              fill={s.color} rx={2} />
            <text x={s.x} y={VB_H - 70} textAnchor="middle" fontFamily={FONT}
              fontSize={15} fontWeight={800} fill={s.color}>{s.label}</text>
            <text x={s.x} y={VB_H - 48} textAnchor="middle" fontFamily={FONT}
              fontSize={11} fontWeight={500} fill={C.muted}>{s.sub}</text>
          </g>
        )
      })}
      <Caption text={caption} localFrame={localFrame} delay={60} />
    </>
  )
}

// ── Multi-candle patterns ───────────────────────────────────────────────────

const CandlePatterns: React.FC<VisualProps> = ({ localFrame, variant }) => {
  const bullish = variant % 2 === 0
  const main = bullish ? C.bull : C.bear
  const other = bullish ? C.bear : C.bull
  const t1 = rev(localFrame, 6, 18)
  const t2 = rev(localFrame, 26, 18)
  const t3 = rev(localFrame, 52, 18)

  return (
    <>
      <GridBg opacity={0.5} />
      <g opacity={t1}>
        <rect x={110} y={170} width={34} height={54 * t1} fill={other} rx={2} />
        <line x1={127} x2={127} y1={156} y2={238} stroke={other} strokeWidth={2} />
      </g>
      <g opacity={t2}>
        <rect x={160} y={240 - 104 * t2} width={44} height={104 * t2} fill={main} rx={2} />
        <line x1={182} x2={182} y1={124} y2={252} stroke={main} strokeWidth={2} />
      </g>
      {t2 > 0.8 && (
        <text x={156} y={292} textAnchor="middle" fontFamily={FONT} fontSize={13}
          fontWeight={800} fill={main} opacity={rev(localFrame, 44, 12)}>
          {bullish ? 'Bullish engulfing' : 'Bearish engulfing'}
        </text>
      )}

      <g opacity={t3}>
        <line x1={400} x2={400} y1={150} y2={260} stroke={main} strokeWidth={3} />
        <rect x={382} y={bullish ? 150 : 234} width={36} height={26} fill={main} rx={2} />
        <text x={400} y={292} textAnchor="middle" fontFamily={FONT} fontSize={13}
          fontWeight={800} fill={main}>{bullish ? 'Pin bar' : 'Shooting star'}</text>
      </g>
      {t3 > 0.7 && (
        <Arrow x1={400} y1={bullish ? 252 : 160} x2={400} y2={bullish ? 196 : 250}
          color={C.amber} localFrame={localFrame} delay={70} />
      )}
      <Caption text="Rejection tells you where price refused to go"
        localFrame={localFrame} delay={86} />
    </>
  )
}

// ── Trends ──────────────────────────────────────────────────────────────────

const makeTrend = (dir: 'up' | 'down'): React.FC<VisualProps> =>
  function Trend({ localFrame, variant }) {
    const seeds = dir === 'up' ? [5, 31, 47] : [9, 37, 59]
    const candles = makeCandles(26, dir, pick(seeds, variant))
    const scale = makeScale(candles, BOX)
    const up = dir === 'up'
    const color = up ? C.bull : C.bear

    // Label the actual swing pivots in the data. The series now moves in
    // impulse/pullback legs, so these land on real turning points — an "HL"
    // marker sits on a genuine pullback low rather than an arbitrary bar.
    const highs = findSwings(candles, 'high')
    const lows  = findSwings(candles, 'low')

    // Interleave highs and lows in time order so the labels read as the
    // market alternating between peaks and troughs.
    const pivots = [
      ...highs.map(i => ({ i, kind: 'high' as const })),
      ...lows.map(i => ({ i, kind: 'low' as const })),
    ].sort((a, b) => a.i - b.i).slice(0, 5)

    // Trendline along the pullbacks: swing lows in an uptrend, highs in a
    // downtrend — which is how a trader would actually draw it.
    const anchors = up ? lows : highs
    const a0 = anchors[0]
    const a1 = anchors[anchors.length - 1]

    return (
      <>
        <GridBg opacity={0.6} />
        <Candles candles={candles} scale={scale} localFrame={localFrame} perCandle={1.8} />
        {pivots.map((p, k) => {
          const t = rev(localFrame, 40 + k * 9, 14)
          if (t <= 0) return null
          const cd = candles[p.i]
          const isHigh = p.kind === 'high'
          const y = isHigh ? scale.y(cd.h) - 13 : scale.y(cd.l) + 13
          const label = up
            ? (isHigh ? 'HH' : 'HL')
            : (isHigh ? 'LH' : 'LL')
          return (
            <Tag key={`${p.kind}${p.i}`} x={scale.x(p.i) - 16} y={y}
              text={label} color={color} opacity={t} size={11} />
          )
        })}
        {a0 !== undefined && a1 !== undefined && a1 !== a0 && (
          <Arrow
            x1={scale.x(a0)} y1={up ? scale.y(candles[a0].l) + 12 : scale.y(candles[a0].h) - 12}
            x2={scale.x(a1)} y2={up ? scale.y(candles[a1].l) + 12 : scale.y(candles[a1].h) - 12}
            color={color} localFrame={localFrame} delay={86} width={2.6}
          />
        )}
        <Caption
          text={pick(up
            ? ['Uptrend — higher highs, higher lows',
               'Each pullback bottoms above the last',
               'Buyers step in earlier every leg']
            : ['Downtrend — lower highs, lower lows',
               'Each bounce tops below the last',
               'Sellers step in earlier every leg'], variant)}
          localFrame={localFrame} delay={102} color={color} />
      </>
    )
  }

// ── Support & resistance ────────────────────────────────────────────────────

const SupportResistance: React.FC<VisualProps> = ({ localFrame, variant }) => {
  const mode = variant % 3

  // Variant 2: role reversal — broken resistance becomes support.
  if (mode === 2) {
    const candles = makeCandles(26, 'breakout', 33)
    const scale = makeScale(candles, BOX)
    const lvl = Math.max(...candles.slice(0, 14).map(c => c.h))
    return (
      <>
        <GridBg opacity={0.6} />
        <Candles candles={candles} scale={scale} localFrame={localFrame} />
        <Level y={scale.y(lvl)} label="Broken level" color={C.amber}
          localFrame={localFrame} delay={30} dashed={false} />
        <Tag x={60} y={scale.y(lvl) - 26} text="was resistance" color={C.bear}
          opacity={rev(localFrame, 56, 14)} size={11} />
        <Tag x={340} y={scale.y(lvl) + 30} text="now support" color={C.bull}
          opacity={rev(localFrame, 72, 14)} size={11} />
        <Caption text="Broken resistance flips into support"
          localFrame={localFrame} delay={90} color={C.amber} />
      </>
    )
  }

  // Variant 1: zones rather than exact lines.
  const candles = makeCandles(26, 'range', mode === 0 ? 3 : 27)
  const scale = makeScale(candles, BOX)
  const hi = Math.max(...candles.map(c => c.h))
  const lo = Math.min(...candles.map(c => c.l))

  if (mode === 1) {
    const band = (scale.y(lo) - scale.y(hi)) * 0.09
    return (
      <>
        <GridBg opacity={0.6} />
        <Zone x={BOX.left} y={scale.y(hi) - band / 2} w={BOX.right - BOX.left} h={band}
          color={C.bear} localFrame={localFrame} delay={28} label="SUPPLY ZONE" />
        <Zone x={BOX.left} y={scale.y(lo) - band / 2} w={BOX.right - BOX.left} h={band}
          color={C.bull} localFrame={localFrame} delay={42} label="DEMAND ZONE" />
        <Candles candles={candles} scale={scale} localFrame={localFrame} />
        <Caption text="Levels are areas, not exact prices"
          localFrame={localFrame} delay={80} />
      </>
    )
  }

  return (
    <>
      <GridBg opacity={0.6} />
      <Candles candles={candles} scale={scale} localFrame={localFrame} />
      <Level y={scale.y(hi) + 4} label="Resistance" color={C.bear}
        localFrame={localFrame} delay={40} />
      <Level y={scale.y(lo) - 4} label="Support" color={C.bull}
        localFrame={localFrame} delay={54} />
      {[0, 1, 2].map(i => {
        const t = rev(localFrame, 70 + i * 12, 14)
        if (t <= 0) return null
        const top = i % 2 === 0
        const y = top ? scale.y(hi) + 4 : scale.y(lo) - 4
        const x = 110 + i * 150
        return (
          <circle key={i} cx={x} cy={y} r={7 + bob(localFrame + i * 20, 0.12, 2)}
            fill="none" stroke={top ? C.bear : C.bull} strokeWidth={2} opacity={t * 0.9} />
        )
      })}
      <Caption text="Price reacts where it has reacted before"
        localFrame={localFrame} delay={110} />
    </>
  )
}

// ── Breakout ────────────────────────────────────────────────────────────────

const Breakout: React.FC<VisualProps> = ({ localFrame, variant }) => {
  const candles = makeCandles(26, 'breakout', pick([21, 45, 61], variant))
  const scale = makeScale(candles, BOX)
  const rangeTop = Math.max(...candles.slice(0, 15).map(c => c.h))
  const rangeLow = Math.min(...candles.slice(0, 15).map(c => c.l))

  return (
    <>
      <GridBg opacity={0.6} />
      <Zone x={BOX.left} y={scale.y(rangeTop)} w={scale.x(15) - BOX.left}
        h={scale.y(rangeLow) - scale.y(rangeTop)} color={C.muted}
        localFrame={localFrame} delay={6} label="RANGE" />
      <Candles candles={candles} scale={scale} localFrame={localFrame} />
      <Level y={scale.y(rangeTop)} label="Break level" color={C.amber}
        localFrame={localFrame} delay={34} />
      <Arrow x1={scale.x(19)} y1={scale.y(rangeTop) + 30} x2={scale.x(23)}
        y2={scale.y(candles[23].c) - 18} color={C.bull}
        localFrame={localFrame} delay={62} width={3} />
      <Caption text={pick([
        'Compression, then expansion',
        'Volume confirms a real break',
        'No follow-through = false break',
      ], variant)} localFrame={localFrame} delay={86} color={C.bull} />
    </>
  )
}

// ── Risk / reward ───────────────────────────────────────────────────────────

const RiskReward: React.FC<VisualProps> = ({ localFrame, variant }) => {
  const ratios = [
    { r: 3, slGap: 52, label: 'Risking 1 to make 3' },
    { r: 2, slGap: 68, label: 'Risking 1 to make 2' },
    { r: 1, slGap: 96, label: '1:1 — needs a high win rate' },
  ]
  const cfg = pick(ratios, variant)
  const entryY = 240
  const slY = entryY + cfg.slGap
  const tpY = entryY - cfg.slGap * cfg.r

  return (
    <>
      <GridBg opacity={0.5} />
      <Zone x={70} y={entryY} w={330} h={slY - entryY} color={C.bear}
        localFrame={localFrame} delay={10} label="RISK  1R" />
      <Zone x={70} y={Math.max(tpY, 60)} w={330} h={entryY - Math.max(tpY, 60)} color={C.bull}
        localFrame={localFrame} delay={26} label={`REWARD  ${cfg.r}R`} />

      <Level y={entryY} label="Entry" color={C.ink} localFrame={localFrame} delay={6}
        dashed={false} left={60} right={470} />
      <Level y={slY} label="Stop" color={C.bear} localFrame={localFrame} delay={18}
        left={60} right={470} />
      <Level y={Math.max(tpY, 60)} label="Target" color={C.bull} localFrame={localFrame}
        delay={34} left={60} right={470} />

      <Arrow x1={430} y1={entryY} x2={430} y2={Math.max(tpY, 60) + 6} color={C.bull}
        localFrame={localFrame} delay={48} />
      <Arrow x1={430} y1={entryY} x2={430} y2={slY - 6} color={C.bear}
        localFrame={localFrame} delay={56} />

      <text x={VB_W / 2} y={VB_H - 16} textAnchor="middle" fontFamily={FONT}
        fontSize={15} fontWeight={800} fill={C.ink} opacity={rev(localFrame, 70, 16)}>
        {cfg.label}
      </text>
    </>
  )
}

// ── Stop loss ───────────────────────────────────────────────────────────────

const StopLoss: React.FC<VisualProps> = ({ localFrame, variant }) => {
  const candles = makeCandles(22, 'down', pick([15, 39, 51], variant))
  const scale = makeScale(candles, BOX)
  const slPrice = candles[0].o - (candles[0].o - Math.min(...candles.map(c => c.l))) * 0.55
  const hitIdx = candles.findIndex(c => c.l <= slPrice)
  const hit = hitIdx >= 0 && localFrame > 6 + hitIdx * 2.2

  return (
    <>
      <GridBg opacity={0.6} />
      <Candles candles={candles} scale={scale} localFrame={localFrame}
        dim={hitIdx >= 0 ? candles.map((_, i) => i).filter(i => i > hitIdx) : []} />
      <Level y={scale.y(slPrice)} label="Stop loss" color={C.bear}
        localFrame={localFrame} delay={10} />
      {hit && (
        <g opacity={rev(localFrame, 6 + hitIdx * 2.2, 12)}>
          <circle cx={scale.x(hitIdx)} cy={scale.y(slPrice)} r={14 + bob(localFrame, 0.18, 3)}
            fill="none" stroke={C.bear} strokeWidth={2} />
          <Tag x={scale.x(hitIdx) + 22} y={scale.y(slPrice) - 26} text="Closed —1R"
            color={C.bear} opacity={1} size={11} />
        </g>
      )}
      <Caption text={pick([
        'The loss you accepted before you entered',
        'Set it first — never widen it later',
        'One bad trade should never end the account',
      ], variant)} localFrame={localFrame} delay={70} />
    </>
  )
}

// ── Moving averages ─────────────────────────────────────────────────────────

const MovingAverages: React.FC<VisualProps> = ({ localFrame, variant }) => {
  const shape = pick(['up', 'range', 'down'] as const, variant)
  const candles = makeCandles(30, shape, pick([13, 43, 57], variant))
  const scale = makeScale(candles, BOX)

  const ma = (period: number) => candles.map((_, i) => {
    const slice = candles.slice(Math.max(0, i - period + 1), i + 1)
    return slice.reduce((a, c) => a + c.c, 0) / slice.length
  })
  const fast = ma(5)
  const slow = ma(12)

  const line = (vals: number[], t: number) => {
    const n = Math.max(Math.floor(vals.length * t), 2)
    return vals.slice(0, n).map((v, i) => `${i === 0 ? 'M' : 'L'}${scale.x(i)},${scale.y(v)}`).join(' ')
  }

  return (
    <>
      <GridBg opacity={0.6} />
      <Candles candles={candles} scale={scale} localFrame={localFrame} perCandle={1.6} bodyW={0.45} />
      <path d={line(slow, rev(localFrame, 42, 34))} fill="none" stroke={C.blue}
        strokeWidth={2.6} strokeLinecap="round" opacity={0.95} />
      <path d={line(fast, rev(localFrame, 52, 34))} fill="none" stroke={C.amber}
        strokeWidth={2.6} strokeLinecap="round" opacity={0.95} />
      <g opacity={rev(localFrame, 82, 16)}>
        <Tag x={40} y={VB_H - 82} text="Fast MA" color={C.amber} size={11} />
        <Tag x={140} y={VB_H - 82} text="Slow MA" color={C.blue} size={11} />
      </g>
      <Caption text={pick([
        'Averages smooth the noise into a direction',
        'Flat and tangled = no trend to follow',
        'Crossovers lag — they confirm, not predict',
      ], variant)} localFrame={localFrame} delay={92} />
    </>
  )
}

// ── Oscillator (RSI) ────────────────────────────────────────────────────────

const Oscillator: React.FC<VisualProps> = ({ localFrame, variant }) => {
  const top = 90
  const bottom = 300
  const freq = pick([0.42, 0.3, 0.55], variant)
  const val = (i: number) => 50 + Math.sin(i * freq) * 32 + Math.sin(i * 0.17) * 12
  const pts = Array.from({ length: 46 }, (_, i) => i)
  const yOf = (v: number) => bottom - (v / 100) * (bottom - top)
  const t = rev(localFrame, 14, 44)
  const n = Math.max(Math.floor(pts.length * t), 2)
  const d = pts.slice(0, n).map((i) =>
    `${i === 0 ? 'M' : 'L'}${BOX.left + (i / (pts.length - 1)) * (BOX.right - BOX.left)},${yOf(val(i))}`
  ).join(' ')

  return (
    <>
      <GridBg opacity={0.5} />
      <Zone x={BOX.left} y={top} w={BOX.right - BOX.left} h={yOf(70) - top}
        color={C.bear} localFrame={localFrame} delay={4} label="OVERBOUGHT 70" />
      <Zone x={BOX.left} y={yOf(30)} w={BOX.right - BOX.left} h={bottom - yOf(30)}
        color={C.bull} localFrame={localFrame} delay={10} label="OVERSOLD 30" />
      <line x1={BOX.left} x2={BOX.right} y1={yOf(50)} y2={yOf(50)}
        stroke={C.muted} strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
      <path d={d} fill="none" stroke={C.violet} strokeWidth={2.8} strokeLinecap="round" />
      <Caption text={pick([
        'Momentum — how stretched the move is',
        'Overbought can stay overbought in a trend',
        'Divergence: price up, momentum down',
      ], variant)} localFrame={localFrame} delay={62} />
    </>
  )
}

// ── Fibonacci ───────────────────────────────────────────────────────────────

const Fibonacci: React.FC<VisualProps> = ({ localFrame, variant }) => {
  const candles = makeCandles(24, 'vshape', pick([17, 35, 63], variant))
  const scale = makeScale(candles, BOX)
  const hi = Math.max(...candles.map(c => c.h))
  const lo = Math.min(...candles.map(c => c.l))
  const levels = [
    { r: 0, l: '0%' }, { r: 0.382, l: '38.2%' }, { r: 0.5, l: '50%' },
    { r: 0.618, l: '61.8%' }, { r: 1, l: '100%' },
  ]

  return (
    <>
      <GridBg opacity={0.5} />
      <Candles candles={candles} scale={scale} localFrame={localFrame} bodyW={0.45} />
      {levels.map((lv, i) => {
        const price = lo + (hi - lo) * (1 - lv.r)
        const golden = lv.r === 0.618
        return (
          <Level key={lv.l} y={scale.y(price)} label={lv.l}
            color={golden ? C.amber : C.muted}
            localFrame={localFrame} delay={34 + i * 8} />
        )
      })}
      <Caption text={pick([
        'Where a pullback tends to pause',
        'The 61.8% level gets watched most',
        'A level is a decision point, not a promise',
      ], variant)} localFrame={localFrame} delay={86} color={C.amber} />
    </>
  )
}

// ── Head & shoulders / reversal patterns ────────────────────────────────────

const HeadShoulders: React.FC<VisualProps> = ({ localFrame, variant }) => {
  const candles = makeCandles(28, 'hs', pick([23, 49, 67], variant))
  const scale = makeScale(candles, BOX)
  const marks = [
    { i: 4, t: 'Shoulder' }, { i: 13, t: 'Head' }, { i: 21, t: 'Shoulder' },
  ]
  const neckY = scale.y((candles[8].l + candles[17].l) / 2)

  return (
    <>
      <GridBg opacity={0.6} />
      <Candles candles={candles} scale={scale} localFrame={localFrame} perCandle={1.8} bodyW={0.48} />
      {marks.map((m, i) => {
        const t = rev(localFrame, 54 + i * 10, 14)
        if (t <= 0) return null
        return <Tag key={i} x={scale.x(m.i) - 26} y={scale.y(candles[m.i].h) - 16}
          text={m.t} color={m.t === 'Head' ? C.amber : C.muted} opacity={t} size={10} />
      })}
      <Level y={neckY} label="Neckline" color={C.bear} localFrame={localFrame} delay={84} />
      <Caption text={pick([
        'Reversal — the third push fails',
        'The break of the neckline confirms it',
        'Measured move: head to neckline, projected down',
      ], variant)} localFrame={localFrame} delay={102} color={C.bear} />
    </>
  )
}

// ── Pips & lots ─────────────────────────────────────────────────────────────

const PipsLots: React.FC<VisualProps> = ({ localFrame, variant }) => {
  const mode = variant % 3

  // Variant 1: a pip measured on actual price.
  if (mode === 1) {
    const t = rev(localFrame, 8, 24)
    return (
      <>
        <GridBg opacity={0.4} />
        <text x={VB_W / 2} y={110} textAnchor="middle" fontFamily={FONT} fontSize={42}
          fontWeight={800} fill={C.ink} opacity={t}>
          1.08<tspan fill={C.amber}>4</tspan><tspan fill={C.muted} fontSize={26}>2</tspan>
        </text>
        <text x={VB_W / 2} y={146} textAnchor="middle" fontFamily={FONT} fontSize={12}
          fontWeight={700} fill={C.muted} opacity={t} letterSpacing="0.12em">
          4th DECIMAL = 1 PIP
        </text>
        <g opacity={rev(localFrame, 30, 20)}>
          <Arrow x1={180} y1={214} x2={380} y2={214} color={C.bull}
            localFrame={localFrame} delay={30} width={3} />
          <Tag x={228} y={252} text="1.0842 → 1.0862 = 20 pips" color={C.bull}
            opacity={rev(localFrame, 52, 16)} size={12} />
        </g>
        <Caption text="Pips are how you measure the move"
          localFrame={localFrame} delay={72} />
      </>
    )
  }

  // Variant 2: what a pip is worth at a given size.
  if (mode === 2) {
    const rows = [
      { s: '0.01 lot', v: '$0.10', c: C.violet },
      { s: '0.10 lot', v: '$1.00', c: C.blue },
      { s: '1.00 lot', v: '$10.00', c: C.bull },
    ]
    return (
      <>
        <GridBg opacity={0.4} />
        <text x={VB_W / 2} y={72} textAnchor="middle" fontFamily={FONT} fontSize={13}
          fontWeight={700} fill={C.muted} letterSpacing="0.12em"
          opacity={rev(localFrame, 4, 16)}>A 20-PIP MOVE IS WORTH</text>
        {rows.map((r, i) => {
          const t = rev(localFrame, 20 + i * 16, 18)
          if (t <= 0) return null
          const y = 120 + i * 76
          return (
            <g key={r.s} opacity={t}>
              <text x={80} y={y + 30} fontFamily={FONT} fontSize={16} fontWeight={700} fill={C.ink}>
                {r.s}
              </text>
              <rect x={200} y={y + 8} width={(i + 1) * 92 * t} height={30} rx={6}
                fill={r.c} fillOpacity={0.22} stroke={r.c} strokeWidth={1.2} />
              <text x={214} y={y + 30} fontFamily={FONT} fontSize={17} fontWeight={800} fill={r.c}>
                {r.v}
              </text>
            </g>
          )
        })}
        <Caption text="Size decides what a pip costs you"
          localFrame={localFrame} delay={80} />
      </>
    )
  }

  const rows = [
    { name: 'Standard lot', units: '100,000', pip: '$10.00', color: C.bull },
    { name: 'Mini lot',     units: '10,000',  pip: '$1.00',  color: C.blue },
    { name: 'Micro lot',    units: '1,000',   pip: '$0.10',  color: C.violet },
  ]
  return (
    <>
      <GridBg opacity={0.4} />
      <g opacity={rev(localFrame, 4, 16)}>
        <text x={VB_W / 2} y={62} textAnchor="middle" fontFamily={FONT} fontSize={14}
          fontWeight={700} fill={C.muted} letterSpacing="0.14em">LOT SIZES</text>
      </g>
      {rows.map((r, i) => {
        const t = rev(localFrame, 22 + i * 16, 18)
        if (t <= 0) return null
        const y = 110 + i * 74
        return (
          <g key={r.name} opacity={t} transform={`translate(${(1 - t) * -24},0)`}>
            <rect x={44} y={y} width={VB_W - 88} height={56} rx={10}
              fill={C.panel} stroke={r.color} strokeOpacity={0.35} strokeWidth={1} />
            <text x={62} y={y + 24} fontFamily={FONT} fontSize={14} fontWeight={700} fill={C.ink}>
              {r.name}
            </text>
            <text x={62} y={y + 43} fontFamily={FONT} fontSize={12} fill={C.muted}>
              {r.units} units
            </text>
            <text x={VB_W - 62} y={y + 35} textAnchor="end" fontFamily={FONT}
              fontSize={19} fontWeight={800} fill={r.color}>{r.pip}</text>
            <text x={VB_W - 62} y={y + 50} textAnchor="end" fontFamily={FONT}
              fontSize={10} fill={C.muted}>per pip</text>
          </g>
        )
      })}
    </>
  )
}

// ── Bid / ask spread ────────────────────────────────────────────────────────

const Spread: React.FC<VisualProps> = ({ localFrame, variant }) => {
  const mode = variant % 3

  // Variant 1: spread as an accumulating cost.
  if (mode === 1) {
    const trades = 8
    return (
      <>
        <GridBg opacity={0.4} />
        <text x={VB_W / 2} y={78} textAnchor="middle" fontFamily={FONT} fontSize={13}
          fontWeight={700} fill={C.muted} letterSpacing="0.12em"
          opacity={rev(localFrame, 4, 16)}>COST OF 8 ROUND TRIPS</text>
        {Array.from({ length: trades }).map((_, i) => {
          const t = rev(localFrame, 16 + i * 9, 14)
          if (t <= 0) return null
          return (
            <rect key={i} x={70 + i * 54} y={240 - 0} width={36} height={60 * t} rx={4}
              fill={C.bear} fillOpacity={0.3} stroke={C.bear} strokeWidth={1} />
          )
        })}
        <Tag x={196} y={330} text="= 16 pips paid" color={C.bear}
          opacity={rev(localFrame, 96, 16)} size={13} />
        <Caption text="Small per trade, large over a month"
          localFrame={localFrame} delay={112} color={C.bear} />
      </>
    )
  }

  // Variant 2: tight vs wide spread comparison.
  if (mode === 2) {
    const rows = [
      { n: 'EUR/USD', s: 1, w: 40, c: C.bull, label: 'tight — major' },
      { n: 'GBP/JPY', s: 4, w: 140, c: C.amber, label: 'wider — cross' },
      { n: 'USD/TRY', s: 9, w: 300, c: C.bear, label: 'wide — exotic' },
    ]
    return (
      <>
        <GridBg opacity={0.4} />
        {rows.map((r, i) => {
          const t = rev(localFrame, 10 + i * 18, 22)
          if (t <= 0) return null
          const y = 110 + i * 82
          return (
            <g key={r.n} opacity={t}>
              <text x={44} y={y + 18} fontFamily={FONT} fontSize={15} fontWeight={700} fill={C.ink}>
                {r.n}
              </text>
              <rect x={44} y={y + 28} width={r.w * t} height={24} rx={5}
                fill={r.c} fillOpacity={0.25} stroke={r.c} strokeWidth={1.2} />
              <text x={54 + r.w * t} y={y + 45} fontFamily={FONT} fontSize={13}
                fontWeight={800} fill={r.c}>{r.s} pip{r.s > 1 ? 's' : ''}</text>
              <text x={VB_W - 50} y={y + 18} textAnchor="end" fontFamily={FONT}
                fontSize={11} fill={C.muted}>{r.label}</text>
            </g>
          )
        })}
        <Caption text="Liquidity decides how much you pay"
          localFrame={localFrame} delay={80} />
      </>
    )
  }

  const t = rev(localFrame, 8, 22)
  const gap = 96
  const midX = VB_W / 2
  const bidX = midX - gap * t
  const askX = midX + gap * t

  return (
    <>
      <GridBg opacity={0.4} />
      <g opacity={t}>
        <rect x={bidX - 96} y={150} width={96} height={72} rx={10}
          fill={C.bull} fillOpacity={0.14} stroke={C.bull} strokeWidth={1.4} />
        <text x={bidX - 48} y={178} textAnchor="middle" fontFamily={FONT} fontSize={12}
          fontWeight={800} fill={C.bull} letterSpacing="0.12em">BID</text>
        <text x={bidX - 48} y={206} textAnchor="middle" fontFamily={FONT} fontSize={20}
          fontWeight={800} fill={C.ink}>1.0842</text>

        <rect x={askX} y={150} width={96} height={72} rx={10}
          fill={C.bear} fillOpacity={0.14} stroke={C.bear} strokeWidth={1.4} />
        <text x={askX + 48} y={178} textAnchor="middle" fontFamily={FONT} fontSize={12}
          fontWeight={800} fill={C.bear} letterSpacing="0.12em">ASK</text>
        <text x={askX + 48} y={206} textAnchor="middle" fontFamily={FONT} fontSize={20}
          fontWeight={800} fill={C.ink}>1.0844</text>
      </g>

      {t > 0.85 && (
        <g opacity={rev(localFrame, 34, 16)}>
          <line x1={bidX} x2={askX} y1={186} y2={186} stroke={C.amber} strokeWidth={2} />
          <Tag x={midX - 44} y={252} text="Spread 2 pips" color={C.amber} opacity={1} />
        </g>
      )}
      <Caption text="The cost of entering, paid on every trade"
        localFrame={localFrame} delay={56} />
    </>
  )
}

// ── Leverage ────────────────────────────────────────────────────────────────

const Leverage: React.FC<VisualProps> = ({ localFrame, variant }) => {
  const mode = variant % 2

  // Variant 1: the downside — a small move wipes a leveraged account.
  if (mode === 1) {
    const steps = [
      { l: 'Account', v: '£1,000', w: 180, c: C.blue },
      { l: 'Position at 30:1', v: '£30,000', w: 430, c: C.amber },
      { l: '2% move against you', v: '−£600', w: 300, c: C.bear },
    ]
    return (
      <>
        <GridBg opacity={0.4} />
        {steps.map((s, i) => {
          const t = rev(localFrame, 10 + i * 22, 24)
          if (t <= 0) return null
          const y = 100 + i * 88
          return (
            <g key={s.l} opacity={t}>
              <text x={44} y={y - 8} fontFamily={FONT} fontSize={11} fontWeight={700}
                fill={C.muted} letterSpacing="0.1em">{s.l.toUpperCase()}</text>
              <rect x={44} y={y} width={s.w * t} height={46} rx={8}
                fill={s.c} fillOpacity={0.2} stroke={s.c} strokeWidth={1.4} />
              <text x={56} y={y + 31} fontFamily={FONT} fontSize={20} fontWeight={800} fill={s.c}>
                {s.v}
              </text>
            </g>
          )
        })}
        <Caption text="60% of the account, on a 2% move"
          localFrame={localFrame} delay={86} color={C.bear} />
      </>
    )
  }

  const bars = [
    { label: 'Your margin', w: 60, color: C.blue, val: '£100' },
    { label: 'Controls', w: 430, color: C.amber, val: '£3,000' },
  ]
  return (
    <>
      <GridBg opacity={0.4} />
      {bars.map((b, i) => {
        const t = rev(localFrame, 10 + i * 22, 26)
        if (t <= 0) return null
        const y = 130 + i * 92
        return (
          <g key={b.label}>
            <text x={44} y={y - 12} fontFamily={FONT} fontSize={12} fontWeight={700}
              fill={C.muted} letterSpacing="0.1em" opacity={t}>
              {b.label.toUpperCase()}
            </text>
            <rect x={44} y={y} width={b.w * t} height={52} rx={8}
              fill={b.color} fillOpacity={0.2} stroke={b.color} strokeWidth={1.4} />
            <text x={54} y={y + 34} fontFamily={FONT} fontSize={22} fontWeight={800}
              fill={b.color} opacity={t}>{b.val}</text>
          </g>
        )
      })}
      <g opacity={rev(localFrame, 58, 16)}>
        <Tag x={VB_W / 2 - 40} y={VB_H - 62} text="30 : 1" color={C.amber} size={14} />
      </g>
      <Caption text="Leverage magnifies both sides — gains and losses"
        localFrame={localFrame} delay={72} color={C.bear} />
    </>
  )
}

// ── Trading sessions ────────────────────────────────────────────────────────

const Sessions: React.FC<VisualProps> = ({ localFrame, variant }) => {
  const mode = variant % 3

  // Variant 1: relative volume by session.
  if (mode === 1) {
    const bars = [
      { n: 'Sydney', v: 0.28, c: C.violet },
      { n: 'Tokyo', v: 0.46, c: C.blue },
      { n: 'London', v: 1.0, c: C.bull },
      { n: 'New York', v: 0.82, c: C.amber },
    ]
    return (
      <>
        <GridBg opacity={0.4} />
        <text x={VB_W / 2} y={70} textAnchor="middle" fontFamily={FONT} fontSize={13}
          fontWeight={700} fill={C.muted} letterSpacing="0.12em"
          opacity={rev(localFrame, 4, 16)}>RELATIVE VOLUME</text>
        {bars.map((b, i) => {
          const t = rev(localFrame, 14 + i * 14, 24)
          if (t <= 0) return null
          const h = b.v * 190 * t
          const x = 78 + i * 108
          return (
            <g key={b.n} opacity={t}>
              <rect x={x} y={300 - h} width={62} height={h} rx={6}
                fill={b.c} fillOpacity={0.28} stroke={b.c} strokeWidth={1.3} />
              <text x={x + 31} y={324} textAnchor="middle" fontFamily={FONT} fontSize={12}
                fontWeight={700} fill={C.ink}>{b.n}</text>
            </g>
          )
        })}
        <Caption text="London moves the most money"
          localFrame={localFrame} delay={80} color={C.bull} />
      </>
    )
  }

  // Variant 2: the overlap window on a clock.
  if (mode === 2) {
    const cx = VB_W / 2, cy = 205, r = 108
    const t = rev(localFrame, 8, 26)
    const arc = (from: number, to: number, color: string, w: number) => {
      const a0 = (from / 24) * 2 * Math.PI - Math.PI / 2
      const a1 = (to / 24) * 2 * Math.PI - Math.PI / 2
      const large = to - from > 12 ? 1 : 0
      return (
        <path d={`M${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)}`}
          fill="none" stroke={color} strokeWidth={w} opacity={0.8 * t} strokeLinecap="round" />
      )
    }
    return (
      <>
        <GridBg opacity={0.35} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.edge} strokeWidth={1} />
        {arc(8, 17, C.bull, 14)}
        {arc(13, 22, C.amber, 14)}
        {arc(13, 17, C.ink, 5)}
        <text x={cx} y={cy + 6} textAnchor="middle" fontFamily={FONT} fontSize={16}
          fontWeight={800} fill={C.ink} opacity={t}>13:00–17:00</text>
        <text x={cx} y={cy + 28} textAnchor="middle" fontFamily={FONT} fontSize={11}
          fill={C.muted} opacity={t}>UTC overlap</text>
        <Caption text="London + New York open together"
          localFrame={localFrame} delay={60} color={C.amber} />
      </>
    )
  }

  const rows = [
    { n: 'Sydney', s: 0.00, e: 0.28, c: C.violet },
    { n: 'Tokyo', s: 0.08, e: 0.38, c: C.blue },
    { n: 'London', s: 0.33, e: 0.68, c: C.bull },
    { n: 'New York', s: 0.54, e: 0.92, c: C.amber },
  ]
  const x0 = 110, x1 = VB_W - 34

  return (
    <>
      <GridBg opacity={0.4} />
      {/* Overlap band sits BEHIND the bars — drawn on top it read as a stray
          box clipping through New York rather than a highlight. */}
      <rect x={x0 + 0.54 * (x1 - x0)} y={88} width={(0.68 - 0.54) * (x1 - x0)}
        height={3 * 56 + 30} rx={6} fill={C.amber}
        fillOpacity={0.16 * rev(localFrame, 62, 18)}
        stroke={C.amber} strokeWidth={1} strokeDasharray="4 4"
        strokeOpacity={0.5 * rev(localFrame, 62, 18)} />
      {rows.map((r, i) => {
        const t = rev(localFrame, 8 + i * 12, 22)
        if (t <= 0) return null
        const y = 96 + i * 56
        const bx = x0 + r.s * (x1 - x0)
        const bw = (r.e - r.s) * (x1 - x0) * t
        return (
          <g key={r.n}>
            <text x={98} y={y + 20} textAnchor="end" fontFamily={FONT} fontSize={12}
              fontWeight={700} fill={C.ink} opacity={t}>{r.n}</text>
            <rect x={bx} y={y} width={bw} height={30} rx={6}
              fill={r.c} fillOpacity={0.25} stroke={r.c} strokeWidth={1.2} />
          </g>
        )
      })}
      {rev(localFrame, 62, 18) > 0 && (
        <Tag x={x0 + 0.42 * (x1 - x0)} y={VB_H - 54} text="Overlap = most volume"
          color={C.amber} opacity={rev(localFrame, 62, 18)} size={11} />
      )}
    </>
  )
}

// ── Psychology ──────────────────────────────────────────────────────────────

const Psychology: React.FC<VisualProps> = ({ localFrame, variant }) => {
  const mode = variant % 3

  // Variant 2: the rules card — discipline made concrete.
  if (mode === 2) {
    const rules = [
      'Risk a fixed % per trade',
      'Stop set before entry',
      'No trade without a setup',
      'Log every trade, win or lose',
    ]
    return (
      <>
        <GridBg opacity={0.4} />
        <text x={VB_W / 2} y={78} textAnchor="middle" fontFamily={FONT} fontSize={13}
          fontWeight={700} fill={C.muted} letterSpacing="0.14em"
          opacity={rev(localFrame, 4, 16)}>THE PLAN, WRITTEN DOWN</text>
        {rules.map((r, i) => {
          const t = rev(localFrame, 18 + i * 15, 18)
          if (t <= 0) return null
          const y = 116 + i * 62
          return (
            <g key={r} opacity={t} transform={`translate(${(1 - t) * -18},0)`}>
              <rect x={54} y={y} width={VB_W - 108} height={46} rx={10}
                fill={C.panel} stroke={C.bull} strokeOpacity={0.3} strokeWidth={1} />
              <circle cx={82} cy={y + 23} r={11} fill={C.bull} fillOpacity={0.2}
                stroke={C.bull} strokeWidth={1.4} />
              <path d={`M76,${y + 23} l4,4 l8,-8`} fill="none" stroke={C.bull}
                strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              <text x={106} y={y + 29} fontFamily={FONT} fontSize={14} fontWeight={600} fill={C.ink}>
                {r}
              </text>
            </g>
          )
        })}
        <Caption text="Rules beat willpower" localFrame={localFrame} delay={92} color={C.bull} />
      </>
    )
  }

  // Variant 1: equity curve with emotional decision points.
  if (mode === 1) {
    const pts = [0, 12, 8, 26, 18, 40, 30, 58, 48, 74]
    const t = rev(localFrame, 10, 40)
    const n = Math.max(Math.floor(pts.length * t), 2)
    const x = (i: number) => 60 + i * ((VB_W - 120) / (pts.length - 1))
    const y = (v: number) => 310 - v * 2.7
    const d = pts.slice(0, n).map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ')
    return (
      <>
        <GridBg opacity={0.4} />
        <path d={d} fill="none" stroke={C.bull} strokeWidth={3} strokeLinecap="round" />
        {[2, 4, 6].map((i, k) => {
          const tt = rev(localFrame, 52 + k * 14, 14)
          if (tt <= 0) return null
          return (
            <g key={i} opacity={tt}>
              <circle cx={x(i)} cy={y(pts[i])} r={6} fill={C.bear} />
              <Tag x={x(i) - 30} y={y(pts[i]) + 34} text="doubt" color={C.bear}
                opacity={tt} size={10} />
            </g>
          )
        })}
        <Caption text="Every drawdown is where most people quit"
          localFrame={localFrame} delay={96} />
      </>
    )
  }

  const cx = VB_W / 2, cy = 250, r = 120
  const t = rev(localFrame, 10, 30)
  const swing = Math.sin(localFrame * 0.06) * (1 - easeInOut(clamp01((localFrame - 60) / 50)))
  const angle = (-90 + swing * 62) * (Math.PI / 180)

  const arc = (from: number, to: number, color: string) => {
    const a0 = (180 + from * 180) * (Math.PI / 180)
    const a1 = (180 + to * 180) * (Math.PI / 180)
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0)
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
    return <path d={`M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`} fill="none"
      stroke={color} strokeWidth={16} strokeLinecap="butt" opacity={0.75 * t} />
  }

  return (
    <>
      <GridBg opacity={0.35} />
      {arc(0, 0.33, C.bear)}
      {arc(0.34, 0.66, C.muted)}
      {arc(0.67, 1, C.bull)}
      <g opacity={t}>
        <line x1={cx} y1={cy} x2={cx + (r - 26) * Math.cos(angle)} y2={cy + (r - 26) * Math.sin(angle)}
          stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={9} fill={C.ink} />
      </g>
      <text x={cx - r} y={cy + 30} textAnchor="middle" fontFamily={FONT} fontSize={12}
        fontWeight={800} fill={C.bear} opacity={t}>FEAR</text>
      <text x={cx + r} y={cy + 30} textAnchor="middle" fontFamily={FONT} fontSize={12}
        fontWeight={800} fill={C.bull} opacity={t}>GREED</text>
      <text x={cx} y={cy - r - 18} textAnchor="middle" fontFamily={FONT} fontSize={13}
        fontWeight={800} fill={C.ink} opacity={rev(localFrame, 70, 18)}>DISCIPLINE</text>
      <Caption text="The edge is behaviour, not prediction"
        localFrame={localFrame} delay={88} />
    </>
  )
}

// ── Currency pairs ──────────────────────────────────────────────────────────

const CurrencyPairs: React.FC<VisualProps> = ({ localFrame, variant }) => {
  const mode = variant % 4

  // Variant 1: anatomy of a single quote.
  if (mode === 1) {
    const t = rev(localFrame, 6, 22)
    return (
      <>
        <GridBg opacity={0.4} />
        <g opacity={t}>
          <text x={VB_W / 2} y={168} textAnchor="middle" fontFamily={FONT} fontSize={54}
            fontWeight={800}>
            <tspan fill={C.bull}>EUR</tspan>
            <tspan fill={C.muted}> / </tspan>
            <tspan fill={C.blue}>USD</tspan>
          </text>
        </g>
        {[
          { x: 168, label: 'BASE', sub: 'what you buy', color: C.bull, d: 28 },
          { x: 396, label: 'QUOTE', sub: 'what you pay with', color: C.blue, d: 42 },
        ].map(l => {
          const tt = rev(localFrame, l.d, 18)
          if (tt <= 0) return null
          return (
            <g key={l.label} opacity={tt}>
              <line x1={l.x} x2={l.x} y1={186} y2={228} stroke={l.color}
                strokeWidth={1.5} strokeDasharray="4 3" />
              <text x={l.x} y={252} textAnchor="middle" fontFamily={FONT} fontSize={13}
                fontWeight={800} fill={l.color} letterSpacing="0.1em">{l.label}</text>
              <text x={l.x} y={274} textAnchor="middle" fontFamily={FONT} fontSize={12}
                fill={C.muted}>{l.sub}</text>
            </g>
          )
        })}
        <Caption text="1.0842 = one euro costs 1.0842 dollars"
          localFrame={localFrame} delay={68} />
      </>
    )
  }

  // Variant 2: major / minor / exotic tiers.
  if (mode === 2) {
    const tiers = [
      { n: 'Majors', ex: 'EUR/USD · GBP/USD · USD/JPY', c: C.bull, s: 'tight spreads, most volume' },
      { n: 'Minors', ex: 'EUR/GBP · GBP/JPY · AUD/NZD', c: C.blue, s: 'no USD, wider spreads' },
      { n: 'Exotics', ex: 'USD/TRY · USD/ZAR · EUR/SEK', c: C.bear, s: 'thin, volatile, costly' },
    ]
    return (
      <>
        <GridBg opacity={0.4} />
        {tiers.map((tr, i) => {
          const t = rev(localFrame, 8 + i * 18, 20)
          if (t <= 0) return null
          const y = 92 + i * 92
          return (
            <g key={tr.n} opacity={t} transform={`translate(${(1 - t) * -20},0)`}>
              <rect x={44} y={y} width={VB_W - 88} height={72} rx={12}
                fill={C.panel} stroke={tr.c} strokeOpacity={0.4} strokeWidth={1.2} />
              <rect x={44} y={y} width={4} height={72} rx={2} fill={tr.c} />
              <text x={64} y={y + 26} fontFamily={FONT} fontSize={16} fontWeight={800} fill={tr.c}>
                {tr.n}
              </text>
              <text x={64} y={y + 46} fontFamily={FONT} fontSize={12} fill={C.ink}>{tr.ex}</text>
              <text x={64} y={y + 63} fontFamily={FONT} fontSize={11} fill={C.muted}>{tr.s}</text>
            </g>
          )
        })}
      </>
    )
  }

  // Variant 3: a live-looking quote board.
  if (mode === 3) {
    const rows = [
      { p: 'EUR/USD', v: '1.0842', d: +0.12 },
      { p: 'GBP/USD', v: '1.2715', d: -0.08 },
      { p: 'USD/JPY', v: '151.34', d: +0.31 },
      { p: 'AUD/USD', v: '0.6588', d: -0.04 },
    ]
    return (
      <>
        <GridBg opacity={0.4} />
        {rows.map((r, i) => {
          const t = rev(localFrame, 8 + i * 12, 18)
          if (t <= 0) return null
          const y = 96 + i * 62
          const up = r.d >= 0
          return (
            <g key={r.p} opacity={t}>
              <rect x={44} y={y} width={VB_W - 88} height={48} rx={9}
                fill={C.panel} stroke={C.edge} strokeWidth={1} />
              <text x={64} y={y + 31} fontFamily={FONT} fontSize={16} fontWeight={700} fill={C.ink}>
                {r.p}
              </text>
              <text x={300} y={y + 31} fontFamily={FONT} fontSize={17} fontWeight={800}
                fill={C.ink}>{r.v}</text>
              <text x={VB_W - 64} y={y + 31} textAnchor="end" fontFamily={FONT} fontSize={14}
                fontWeight={800} fill={up ? C.bull : C.bear}>
                {up ? '▲' : '▼'} {Math.abs(r.d).toFixed(2)}%
              </text>
            </g>
          )
        })}
        <Caption text="Always quoted as one against another"
          localFrame={localFrame} delay={72} />
      </>
    )
  }

  const pairs = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CHF', 'USD/CAD']
  return (
    <>
      <GridBg opacity={0.4} />
      {pairs.map((p, i) => {
        const t = rev(localFrame, 6 + i * 9, 18)
        if (t <= 0) return null
        const col = i % 2
        const row = Math.floor(i / 2)
        const x = 60 + col * 232
        const y = 92 + row * 84
        const [base, quote] = p.split('/')
        return (
          <g key={p} opacity={t} transform={`translate(0,${(1 - t) * 14})`}>
            <rect x={x} y={y} width={196} height={62} rx={12}
              fill={C.panel} stroke={C.edge} strokeWidth={1} />
            <text x={x + 18} y={y + 39} fontFamily={FONT} fontSize={22} fontWeight={800} fill={C.bull}>
              {base}
            </text>
            <text x={x + 82} y={y + 39} fontFamily={FONT} fontSize={20} fontWeight={600} fill={C.muted}>
              /
            </text>
            <text x={x + 100} y={y + 39} fontFamily={FONT} fontSize={22} fontWeight={800} fill={C.blue}>
              {quote}
            </text>
          </g>
        )
      })}
      <g opacity={rev(localFrame, 66, 16)}>
        <text x={60} y={VB_H - 26} fontFamily={FONT} fontSize={12} fill={C.bull} fontWeight={700}>
          BASE
        </text>
        <text x={118} y={VB_H - 26} fontFamily={FONT} fontSize={12} fill={C.muted}>
          what you&apos;re buying ·
        </text>
        <text x={272} y={VB_H - 26} fontFamily={FONT} fontSize={12} fill={C.blue} fontWeight={700}>
          QUOTE
        </text>
        <text x={330} y={VB_H - 26} fontFamily={FONT} fontSize={12} fill={C.muted}>
          what you pay with
        </text>
      </g>
    </>
  )
}

// ── What is forex ───────────────────────────────────────────────────────────

const WhatIsForex: React.FC<VisualProps> = ({ localFrame, variant }) => {
  const mode = variant % 4

  // Variant 1: scale of the market.
  if (mode === 1) {
    const bars = [
      { n: 'Forex', v: 1.0, l: '$7.5tn / day', c: C.bull },
      { n: 'Stocks', v: 0.09, l: '$650bn', c: C.blue },
      { n: 'Crypto', v: 0.012, l: '$90bn', c: C.violet },
    ]
    return (
      <>
        <GridBg opacity={0.4} />
        <text x={VB_W / 2} y={78} textAnchor="middle" fontFamily={FONT} fontSize={13}
          fontWeight={700} fill={C.muted} letterSpacing="0.12em"
          opacity={rev(localFrame, 4, 16)}>DAILY TRADED VOLUME</text>
        {bars.map((b, i) => {
          const t = rev(localFrame, 16 + i * 18, 26)
          if (t <= 0) return null
          const y = 124 + i * 76
          return (
            <g key={b.n} opacity={t}>
              <text x={44} y={y - 6} fontFamily={FONT} fontSize={13} fontWeight={700} fill={C.ink}>
                {b.n}
              </text>
              <rect x={44} y={y} width={Math.max(b.v * (VB_W - 130) * t, 6)} height={34} rx={6}
                fill={b.c} fillOpacity={0.28} stroke={b.c} strokeWidth={1.3} />
              <text x={Math.max(b.v * (VB_W - 130) * t, 6) + 56} y={y + 24} fontFamily={FONT}
                fontSize={14} fontWeight={800} fill={b.c}>{b.l}</text>
            </g>
          )
        })}
        <Caption text="The largest market on earth"
          localFrame={localFrame} delay={86} color={C.bull} />
      </>
    )
  }

  // Variant 2: who trades it.
  if (mode === 2) {
    const players = [
      { n: 'Central banks', c: C.amber },
      { n: 'Commercial banks', c: C.bull },
      { n: 'Funds & corporates', c: C.blue },
      { n: 'Retail traders', c: C.violet },
    ]
    return (
      <>
        <GridBg opacity={0.4} />
        {players.map((p, i) => {
          const t = rev(localFrame, 8 + i * 15, 20)
          if (t <= 0) return null
          const y = 96 + i * 66
          const w = (VB_W - 140) * (1 - i * 0.16)
          return (
            <g key={p.n} opacity={t}>
              <rect x={(VB_W - w) / 2} y={y} width={w * t} height={46} rx={10}
                fill={p.c} fillOpacity={0.16} stroke={p.c} strokeWidth={1.2} />
              <text x={VB_W / 2} y={y + 30} textAnchor="middle" fontFamily={FONT}
                fontSize={15} fontWeight={700} fill={p.c}>{p.n}</text>
            </g>
          )
        })}
        <Caption text="You're trading against all of them"
          localFrame={localFrame} delay={80} />
      </>
    )
  }

  // Variant 3: open 24 hours, 5 days.
  if (mode === 3) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return (
      <>
        <GridBg opacity={0.4} />
        <text x={VB_W / 2} y={128} textAnchor="middle" fontFamily={FONT} fontSize={44}
          fontWeight={800} fill={C.ink} opacity={rev(localFrame, 6, 20)}>24 / 5</text>
        <text x={VB_W / 2} y={158} textAnchor="middle" fontFamily={FONT} fontSize={12}
          fontWeight={700} fill={C.muted} letterSpacing="0.14em"
          opacity={rev(localFrame, 16, 18)}>HOURS A DAY, DAYS A WEEK</text>
        {days.map((d, i) => {
          const t = rev(localFrame, 34 + i * 8, 14)
          if (t <= 0) return null
          const open = i < 5
          return (
            <g key={d} opacity={t}>
              <rect x={48 + i * 68} y={210} width={56} height={56} rx={10}
                fill={open ? C.bull : C.muted} fillOpacity={open ? 0.2 : 0.07}
                stroke={open ? C.bull : C.edge} strokeWidth={1.2} />
              <text x={76 + i * 68} y={244} textAnchor="middle" fontFamily={FONT}
                fontSize={13} fontWeight={700} fill={open ? C.bull : C.muted}>{d}</text>
            </g>
          )
        })}
        <Caption text="Somewhere in the world is always trading"
          localFrame={localFrame} delay={94} />
      </>
    )
  }

  const t1 = rev(localFrame, 6, 20)
  const t2 = rev(localFrame, 24, 20)
  const flow = (localFrame * 2.2) % 120

  return (
    <>
      <GridBg opacity={0.4} />
      <g opacity={t1}>
        <circle cx={130} cy={190} r={54} fill={C.bull} fillOpacity={0.14}
          stroke={C.bull} strokeWidth={2} />
        <text x={130} y={199} textAnchor="middle" fontFamily={FONT} fontSize={26}
          fontWeight={800} fill={C.bull}>EUR</text>
      </g>
      <g opacity={t2}>
        <circle cx={430} cy={190} r={54} fill={C.blue} fillOpacity={0.14}
          stroke={C.blue} strokeWidth={2} />
        <text x={430} y={199} textAnchor="middle" fontFamily={FONT} fontSize={26}
          fontWeight={800} fill={C.blue}>USD</text>
      </g>

      {t2 > 0.5 && [0, 40, 80].map(off => {
        const p = ((flow + off) % 120) / 120
        return (
          <circle key={off} cx={190 + p * 180} cy={166} r={4}
            fill={C.bull} opacity={Math.sin(p * Math.PI) * 0.9} />
        )
      })}
      {t2 > 0.5 && [20, 60, 100].map(off => {
        const p = ((flow + off) % 120) / 120
        return (
          <circle key={`b${off}`} cx={370 - p * 180} cy={214} r={4}
            fill={C.blue} opacity={Math.sin(p * Math.PI) * 0.9} />
        )
      })}

      <Caption text="Every trade: buy one currency, sell another"
        localFrame={localFrame} delay={48} />
    </>
  )
}

// ── Order types ─────────────────────────────────────────────────────────────

const OrderTypes: React.FC<VisualProps> = ({ localFrame, variant }) => {
  // Variant 2: where each order sits relative to current price.
  if (variant % 3 === 2) {
    const priceY = 206
    const marks = [
      { y: 116, n: 'Sell limit', c: C.bear, d: 20 },
      { y: 160, n: 'Buy stop',   c: C.amber, d: 32 },
      { y: 252, n: 'Sell stop',  c: C.amber, d: 44 },
      { y: 296, n: 'Buy limit',  c: C.bull, d: 56 },
    ]
    return (
      <>
        <GridBg opacity={0.4} />
        <Level y={priceY} label="Price now" color={C.ink} localFrame={localFrame}
          delay={6} dashed={false} />
        {marks.map(m => {
          const t = rev(localFrame, m.d, 18)
          if (t <= 0) return null
          return (
            <g key={m.n} opacity={t}>
              <line x1={60} x2={60 + (VB_W - 160) * t} y1={m.y} y2={m.y}
                stroke={m.c} strokeWidth={1.5} strokeDasharray="5 4" opacity={0.8} />
              <Tag x={VB_W - 52} y={m.y} text={m.n} color={m.c} anchor="end" opacity={t} size={11} />
            </g>
          )
        })}
        <Caption text="Limits wait for a better price, stops chase a move"
          localFrame={localFrame} delay={76} />
      </>
    )
  }

  const sets = [
    [
      { n: 'Market', d: 'Fill now, at whatever price is there', c: C.bull },
      { n: 'Limit', d: 'Fill only at my price or better', c: C.blue },
      { n: 'Stop', d: 'Trigger once price reaches my level', c: C.amber },
    ],
    [
      { n: 'Buy limit', d: 'Below price — buy the dip', c: C.bull },
      { n: 'Sell limit', d: 'Above price — sell the rally', c: C.bear },
      { n: 'Stop entry', d: 'Join only once it breaks out', c: C.amber },
    ],
  ]
  const rows = pick(sets, variant)
  return (
    <>
      <GridBg opacity={0.4} />
      {rows.map((r, i) => {
        const t = rev(localFrame, 8 + i * 18, 20)
        if (t <= 0) return null
        const y = 104 + i * 86
        return (
          <g key={r.n} opacity={t} transform={`translate(${(1 - t) * -20},0)`}>
            <rect x={44} y={y} width={VB_W - 88} height={66} rx={12}
              fill={C.panel} stroke={r.c} strokeOpacity={0.4} strokeWidth={1.2} />
            <rect x={44} y={y} width={4} height={66} rx={2} fill={r.c} />
            <text x={66} y={y + 28} fontFamily={FONT} fontSize={17} fontWeight={800} fill={r.c}>
              {r.n}
            </text>
            <text x={66} y={y + 50} fontFamily={FONT} fontSize={12.5} fill={C.muted}>
              {r.d}
            </text>
          </g>
        )
      })}
    </>
  )
}

// ── Registry ────────────────────────────────────────────────────────────────

export interface VisualEntry { Component: React.FC<VisualProps>; variants: number }

export const VISUALS: Record<string, VisualEntry> = {
  'price-action':       { Component: PriceAction,       variants: 4 },
  'candle-anatomy':     { Component: CandleAnatomy,     variants: 2 },
  'candle-types':       { Component: CandleTypes,       variants: 2 },
  'candle-patterns':    { Component: CandlePatterns,    variants: 2 },
  'trend-up':           { Component: makeTrend('up'),   variants: 3 },
  'trend-down':         { Component: makeTrend('down'), variants: 3 },
  'support-resistance': { Component: SupportResistance, variants: 3 },
  'breakout':           { Component: Breakout,          variants: 3 },
  'risk-reward':        { Component: RiskReward,        variants: 3 },
  'stop-loss':          { Component: StopLoss,          variants: 3 },
  'moving-average':     { Component: MovingAverages,    variants: 3 },
  'oscillator':         { Component: Oscillator,        variants: 3 },
  'fibonacci':          { Component: Fibonacci,         variants: 3 },
  'head-shoulders':     { Component: HeadShoulders,     variants: 3 },
  'pips-lots':          { Component: PipsLots,          variants: 3 },
  'spread':             { Component: Spread,            variants: 3 },
  'leverage':           { Component: Leverage,          variants: 2 },
  'sessions':           { Component: Sessions,          variants: 3 },
  'psychology':         { Component: Psychology,        variants: 3 },
  'currency-pairs':     { Component: CurrencyPairs,     variants: 4 },
  'what-is-forex':      { Component: WhatIsForex,       variants: 4 },
  'order-types':        { Component: OrderTypes,        variants: 3 },
}

/** How many distinct looks a visual has. Used by the matcher to cycle them. */
export const VARIANT_COUNTS: Record<string, number> = Object.fromEntries(
  Object.entries(VISUALS).map(([k, v]) => [k, v.variants]),
)
