// Bespoke, scene-specific illustrations.
//
// The generic scene cards cover every lesson automatically, but some moments
// deserve a picture made for that exact sentence — the airport currency swap,
// the "no central building" point, the participant hierarchy. Those live here
// and are matched per scene in lib/lesson-scene-art.ts.
//
// Authored natively at the full stage size (1280×540) rather than the 560×400
// diagram box, so they own the screen instead of being scaled into it.

import React from 'react'
import { C, FONT, rev, bob, El, makeCandles, makeScale, Candles } from './primitives'

export const AW = 1280
export const AH = 540

export interface ArtProps { f: number; variant: number; accent: string }

/** Tabular figures, so digits line up when a price ticks. */
const MONO = "ui-monospace, SFMono-Regular, Menlo, 'Roboto Mono', monospace" 

// ── Helpers ─────────────────────────────────────────────────────────────────

const Note: React.FC<{
  x: number; y: number; w?: number; h?: number
  symbol: string; label: string; color: string
}> = ({ x, y, w = 190, h = 110, symbol, label, color }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={12}
      fill={color} fillOpacity={0.14} stroke={color} strokeWidth={2} />
    <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" fontFamily={FONT}
      fontSize={46} fontWeight={800} fill={color}>{symbol}</text>
    <text x={x + w / 2} y={y + h - 14} textAnchor="middle" fontFamily={FONT}
      fontSize={14} fontWeight={700} fill={color} opacity={0.75}>{label}</text>
  </g>
)

/** Dots travelling along a path, for "value moving between two places". */
const Flow: React.FC<{
  x1: number; y1: number; x2: number; y2: number
  color: string; f: number; at: number; count?: number
}> = ({ x1, y1, x2, y2, color, f, at, count = 4 }) => {
  const t = rev(f, at, 18)
  if (t <= 0) return null
  const span = 90
  return (
    <g opacity={t}>
      {Array.from({ length: count }).map((_, i) => {
        const p = (((f - at) * 1.8 + i * (span / count)) % span) / span
        return (
          <circle key={i} cx={x1 + (x2 - x1) * p} cy={y1 + (y2 - y1) * p} r={5}
            fill={color} opacity={Math.sin(p * Math.PI) * 0.95} />
        )
      })}
    </g>
  )
}

// ── 1. The airport currency swap ────────────────────────────────────────────

const CurrencySwap: React.FC<ArtProps> = ({ f }) => (
  <>
    <El at={6} f={f} from="left">
      <Note x={150} y={190} symbol="£" label="BRITISH POUNDS" color={C.blue} />
    </El>
    <El at={40} f={f} from="right">
      <Note x={AW - 340} y={190} symbol="$" label="US DOLLARS" color={C.bull} />
    </El>
    <El at={22} f={f} from="fade">
      <rect x={AW / 2 - 130} y={214} width={260} height={62} rx={14}
        fill="rgba(255,255,255,0.03)" stroke={C.edge} strokeWidth={1.5} />
      <text x={AW / 2} y={252} textAnchor="middle" fontFamily={FONT} fontSize={19}
        fontWeight={700} fill={C.muted} letterSpacing="0.1em">EXCHANGE</text>
    </El>
    <Flow x1={350} y1={232} x2={AW / 2 - 140} y2={232} color={C.blue} f={f} at={30} />
    <Flow x1={AW / 2 + 140} y1={258} x2={AW - 350} y2={258} color={C.bull} f={f} at={48} />
    <El at={66} f={f} from="below">
      <text x={AW / 2} y={370} textAnchor="middle" fontFamily={FONT} fontSize={24}
        fontWeight={700} fill={C.ink}>That swap is forex</text>
      <text x={AW / 2} y={404} textAnchor="middle" fontFamily={FONT} fontSize={17}
        fontWeight={500} fill={C.muted}>One currency in, another out</text>
    </El>
  </>
)

// ── 2. No central building — a mesh, not a hub ──────────────────────────────

const Decentralised: React.FC<ArtProps> = ({ f }) => {
  const nodes = [
    { x: 250, y: 150 }, { x: 470, y: 108 }, { x: 700, y: 140 },
    { x: 940, y: 122 }, { x: 330, y: 330 }, { x: 590, y: 372 },
    { x: 840, y: 340 }, { x: 1040, y: 300 },
  ]
  const links: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [0, 4], [1, 5], [2, 6], [3, 7],
    [4, 5], [5, 6], [6, 7], [1, 4], [2, 5], [3, 6],
  ]
  return (
    <>
      {/* The exchange building, struck through */}
      <El at={6} f={f} from="left">
        <g opacity={0.5}>
          <rect x={86} y={196} width={120} height={104} rx={6}
            fill="none" stroke={C.muted} strokeWidth={2} />
          <path d="M86,196 L146,150 L206,196" fill="none" stroke={C.muted} strokeWidth={2} />
          {[0, 1, 2].map(i => (
            <rect key={i} x={104 + i * 34} y={228} width={18} height={44}
              fill="none" stroke={C.muted} strokeWidth={1.5} />
          ))}
        </g>
      </El>
      <El at={22} f={f} from="fade">
        <line x1={70} y1={320} x2={222} y2={140} stroke={C.bear} strokeWidth={4}
          strokeLinecap="round" />
        <text x={146} y={348} textAnchor="middle" fontFamily={FONT} fontSize={14}
          fontWeight={700} fill={C.bear} letterSpacing="0.08em">NO HQ</text>
      </El>

      {/* The real thing: a mesh of banks trading directly */}
      {links.map(([a, b], i) => {
        const t = rev(f, 36 + i * 3, 20)
        if (t <= 0) return null
        const n1 = nodes[a], n2 = nodes[b]
        return (
          <line key={i} x1={n1.x} y1={n1.y}
            x2={n1.x + (n2.x - n1.x) * t} y2={n1.y + (n2.y - n1.y) * t}
            stroke={C.bull} strokeWidth={1.4} opacity={0.4} />
        )
      })}
      {nodes.map((n, i) => (
        <El key={i} at={30 + i * 5} f={f} from="fade">
          <circle cx={n.x} cy={n.y} r={16 + bob(f + i * 22, 0.07, 1.5)}
            fill={C.bull} fillOpacity={0.16} stroke={C.bull} strokeWidth={2} />
        </El>
      ))}
      <El at={86} f={f} from="below">
        <text x={AW / 2 + 120} y={470} textAnchor="middle" fontFamily={FONT}
          fontSize={20} fontWeight={700} fill={C.bull}>
          Banks dealing directly, worldwide
        </text>
      </El>
    </>
  )
}

// ── 3. Who trades forex — the hierarchy, one tier lit per scene ─────────────

const TIERS = [
  { label: 'Central banks',   sub: 'set policy, defend the currency', color: C.amber },
  { label: 'Big banks',       sub: 'trade billions daily',           color: C.bull },
  { label: 'Funds & firms',   sub: 'speculate for profit',           color: C.blue },
  { label: 'Businesses',      sub: 'pay for goods across borders',   color: C.violet },
  { label: 'You',             sub: 'retail, via an online broker',   color: C.ink },
]

const ParticipantTiers: React.FC<ArtProps> = ({ f, variant }) => {
  const active = Math.min(Math.max(variant, 0), TIERS.length - 1)
  const rowH = 70
  const top = 120

  return (
    <>
      {TIERS.map((t, i) => {
        const isActive = i === active
        // Tiers above the active one have already been covered, so they stay
        // on screen dimmed — the picture accumulates across the section.
        const seen = i < active
        const at = isActive ? 10 : 4
        const w = 520 + i * 118
        const x = (AW - w) / 2
        const y = top + i * rowH
        return (
          <El key={t.label} at={at} f={f} from={isActive ? 'below' : 'fade'}>
            <rect x={x} y={y} width={w} height={rowH - 12} rx={12}
              fill={t.color}
              fillOpacity={isActive ? 0.22 : seen ? 0.07 : 0.03}
              stroke={t.color}
              strokeWidth={isActive ? 2.4 : 1}
              strokeOpacity={isActive ? 1 : 0.35} />
            <text x={x + 26} y={y + 38} fontFamily={FONT}
              fontSize={isActive ? 26 : 20} fontWeight={isActive ? 800 : 600}
              fill={t.color} opacity={isActive ? 1 : 0.55}>
              {t.label}
            </text>
            {isActive && (
              <text x={x + w - 26} y={y + 37} textAnchor="end" fontFamily={FONT}
                fontSize={16} fontWeight={500} fill={C.muted}>
                {t.sub}
              </text>
            )}
          </El>
        )
      })}
      <El at={40} f={f} from="fade">
        <text x={AW / 2} y={top + TIERS.length * rowH + 34} textAnchor="middle"
          fontFamily={FONT} fontSize={15} fontWeight={600} fill={C.muted}
          letterSpacing="0.1em">
          SAME MARKET · DIFFERENT SIZE
        </text>
      </El>
    </>
  )
}

// ── 4. OTC versus a central exchange ────────────────────────────────────────

const OtcVsExchange: React.FC<ArtProps> = ({ f }) => {
  const pairs = [[300, 150], [300, 300], [300, 420]]
  return (
    <>
      <El at={4} f={f} from="left">
        <text x={150} y={92} fontFamily={FONT} fontSize={17} fontWeight={800}
          fill={C.muted} letterSpacing="0.12em">CENTRAL EXCHANGE</text>
      </El>
      {/* Left: everything routed through one hub */}
      <El at={12} f={f} from="fade">
        <circle cx={300} cy={286} r={46} fill={C.muted} fillOpacity={0.12}
          stroke={C.muted} strokeWidth={2} />
        {pairs.map(([, y], i) => (
          <g key={i}>
            <circle cx={150} cy={y} r={18} fill="none" stroke={C.muted} strokeWidth={1.6} />
            <line x1={168} y1={y} x2={258} y2={286} stroke={C.muted} strokeWidth={1.4} opacity={0.6} />
            <circle cx={450} cy={y} r={18} fill="none" stroke={C.muted} strokeWidth={1.6} />
            <line x1={432} y1={y} x2={342} y2={286} stroke={C.muted} strokeWidth={1.4} opacity={0.6} />
          </g>
        ))}
      </El>

      <El at={26} f={f} from="fade">
        <line x1={AW / 2} y1={80} x2={AW / 2} y2={AH - 50} stroke={C.edge} strokeWidth={1.5}
          strokeDasharray="7 7" />
      </El>

      <El at={34} f={f} from="right">
        <text x={AW - 150} y={92} textAnchor="end" fontFamily={FONT} fontSize={17}
          fontWeight={800} fill={C.bull} letterSpacing="0.12em">OTC — FOREX</text>
      </El>
      {/* Right: parties dealing straight with each other */}
      {pairs.map(([, y], i) => (
        <El key={i} at={42 + i * 12} f={f} from="right">
          <circle cx={830} cy={y} r={20} fill={C.bull} fillOpacity={0.14}
            stroke={C.bull} strokeWidth={2} />
          <circle cx={1130} cy={y} r={20} fill={C.bull} fillOpacity={0.14}
            stroke={C.bull} strokeWidth={2} />
          <line x1={852} y1={y} x2={1108} y2={y} stroke={C.bull} strokeWidth={2} opacity={0.75} />
        </El>
      ))}
      <El at={84} f={f} from="below">
        <text x={980} y={AH - 16} textAnchor="middle" fontFamily={FONT} fontSize={18}
          fontWeight={700} fill={C.bull}>Straight between two parties</text>
      </El>
    </>
  )
}

// ── 5. Liquidity — depth of resting orders ──────────────────────────────────

const LiquidityDepth: React.FC<ArtProps> = ({ f }) => {
  const rows = 7
  return (
    <>
      <El at={4} f={f} from="fade">
        <line x1={AW / 2} y1={100} x2={AW / 2} y2={AH - 70} stroke={C.edge} strokeWidth={1.5} />
        <text x={AW / 2} y={86} textAnchor="middle" fontFamily={FONT} fontSize={15}
          fontWeight={700} fill={C.muted} letterSpacing="0.1em">PRICE</text>
      </El>
      {Array.from({ length: rows }).map((_, i) => {
        const t = rev(f, 10 + i * 6, 20)
        if (t <= 0) return null
        const y = 120 + i * 44
        const w = (150 + (rows - i) * 52) * t
        return (
          <g key={i}>
            <rect x={AW / 2 - 14 - w} y={y} width={w} height={30} rx={5}
              fill={C.bull} fillOpacity={0.24} stroke={C.bull} strokeWidth={1} strokeOpacity={0.5} />
            <rect x={AW / 2 + 14} y={y} width={w * 0.94} height={30} rx={5}
              fill={C.bear} fillOpacity={0.24} stroke={C.bear} strokeWidth={1} strokeOpacity={0.5} />
          </g>
        )
      })}
      <El at={16} f={f} from="left">
        <text x={90} y={110} fontFamily={FONT} fontSize={18} fontWeight={800} fill={C.bull}>
          BUYERS WAITING
        </text>
      </El>
      <El at={16} f={f} from="right">
        <text x={AW - 90} y={110} textAnchor="end" fontFamily={FONT} fontSize={18}
          fontWeight={800} fill={C.bear}>SELLERS WAITING</text>
      </El>
      <El at={62} f={f} from="below">
        <text x={AW / 2} y={AH - 26} textAnchor="middle" fontFamily={FONT} fontSize={20}
          fontWeight={700} fill={C.ink}>There is always someone on the other side</text>
      </El>
    </>
  )
}

// ── 6. Volatility — same window, two temperaments ───────────────────────────

const VolatilityCompare: React.FC<ArtProps> = ({ f }) => {
  const series = (n: number, amp: number, seed: number) => {
    let s = seed >>> 0
    const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff }
    return Array.from({ length: n }, () => (rand() - 0.5) * amp)
  }
  const calm = series(30, 34, 11)
  const wild = series(30, 168, 29)

  const path = (vals: number[], x0: number, x1: number, cy: number, t: number) => {
    const n = Math.max(Math.floor(vals.length * t), 2)
    return vals.slice(0, n).map((v, i) =>
      `${i === 0 ? 'M' : 'L'}${x0 + (i / (vals.length - 1)) * (x1 - x0)},${cy + v}`).join(' ')
  }
  const tc = rev(f, 12, 40)
  const tw = rev(f, 30, 40)

  return (
    <>
      <El at={4} f={f} from="left">
        <text x={110} y={128} fontFamily={FONT} fontSize={18} fontWeight={800}
          fill={C.blue} letterSpacing="0.1em">LOW VOLATILITY</text>
      </El>
      <path d={path(calm, 110, AW - 110, 196, tc)} fill="none" stroke={C.blue}
        strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      <El at={46} f={f} from="fade">
        <text x={AW - 110} y={236} textAnchor="end" fontFamily={FONT} fontSize={15}
          fill={C.muted}>small moves · easier to hold</text>
      </El>

      <El at={24} f={f} from="left">
        <text x={110} y={344} fontFamily={FONT} fontSize={18} fontWeight={800}
          fill={C.bear} letterSpacing="0.1em">HIGH VOLATILITY</text>
      </El>
      <path d={path(wild, 110, AW - 110, 416, tw)} fill="none" stroke={C.bear}
        strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      <El at={64} f={f} from="fade">
        <text x={AW - 110} y={500} textAnchor="end" fontFamily={FONT} fontSize={15}
          fill={C.muted}>more opportunity · more risk</text>
      </El>
    </>
  )
}

// ── 7. The 24-hour session ring ─────────────────────────────────────────────
// Used across the four session scenes: every session is always on the ring,
// the one being narrated is lit and named, the rest stay as faint context so
// the day visibly fills up across the section.

const SESSIONS = [
  { name: 'Sydney',   from: 22, to: 7,  color: C.violet, pairs: 'AUD/USD · NZD/USD', note: 'Quiet open · low volume' },
  { name: 'Tokyo',    from: 0,  to: 9,  color: C.blue,   pairs: 'USD/JPY · EUR/JPY', note: 'Asia wakes · moderate' },
  { name: 'London',   from: 8,  to: 17, color: C.bull,   pairs: 'EUR/USD · GBP/USD', note: 'Busiest · tightest spreads' },
  { name: 'New York', from: 13, to: 22, color: C.amber,  pairs: 'All USD pairs',     note: 'Second busiest · data driven' },
]

const CX = 400
const CY = 268
const RADII = [186, 160, 134, 108]

function hourArc(r: number, h0: number, h1: number) {
  const a0 = (h0 / 24) * 2 * Math.PI - Math.PI / 2
  const a1 = (h1 / 24) * 2 * Math.PI - Math.PI / 2
  const span = (h1 - h0 + 24) % 24
  const large = span > 12 ? 1 : 0
  const x0 = CX + r * Math.cos(a0), y0 = CY + r * Math.sin(a0)
  const x1 = CX + r * Math.cos(a1), y1 = CY + r * Math.sin(a1)
  return `M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1}`
}

const SessionRing: React.FC<ArtProps> = ({ f, variant }) => {
  const active = Math.min(Math.max(variant, 0), SESSIONS.length - 1)
  const s = SESSIONS[active]

  return (
    <>
      {/* Hour ticks */}
      <El at={4} f={f} from="fade">
        {Array.from({ length: 24 }).map((_, h) => {
          const a = (h / 24) * 2 * Math.PI - Math.PI / 2
          const r0 = 200, r1 = h % 6 === 0 ? 214 : 207
          return (
            <line key={h} x1={CX + r0 * Math.cos(a)} y1={CY + r0 * Math.sin(a)}
              x2={CX + r1 * Math.cos(a)} y2={CY + r1 * Math.sin(a)}
              stroke={C.edge} strokeWidth={h % 6 === 0 ? 2 : 1} />
          )
        })}
        {[0, 6, 12, 18].map(h => {
          const a = (h / 24) * 2 * Math.PI - Math.PI / 2
          return (
            <text key={h} x={CX + 234 * Math.cos(a)} y={CY + 234 * Math.sin(a) + 5}
              textAnchor="middle" fontFamily={FONT} fontSize={14} fill={C.muted}>
              {String(h).padStart(2, '0')}
            </text>
          )
        })}
      </El>

      {SESSIONS.map((sess, i) => {
        const isActive = i === active
        const t = rev(f, isActive ? 10 : 4, isActive ? 34 : 18)
        if (t <= 0) return null
        return (
          <g key={sess.name}>
            <path d={hourArc(RADII[i], sess.from, sess.to)} fill="none"
              stroke={sess.color} strokeWidth={isActive ? 20 : 11}
              strokeLinecap="round" pathLength={1}
              strokeDasharray={`${t} 1`}
              opacity={isActive ? 0.95 : i < active ? 0.3 : 0.14} />
          </g>
        )
      })}

      {/* Which session we're on, in the middle of the ring */}
      <El at={26} f={f} from="fade">
        <text x={CX} y={CY - 4} textAnchor="middle" fontFamily={FONT} fontSize={40}
          fontWeight={800} fill={s.color}>{s.name}</text>
        <text x={CX} y={CY + 30} textAnchor="middle" fontFamily={FONT} fontSize={20}
          fontWeight={700} fill={C.ink}>
          {String(s.from).padStart(2, '0')}:00 – {String(s.to).padStart(2, '0')}:00
        </text>
      </El>

      {/* Detail panel to the right */}
      <El at={40} f={f} from="right">
        <text x={760} y={200} fontFamily={FONT} fontSize={15} fontWeight={800}
          fill={C.muted} letterSpacing="0.12em">MOST ACTIVE</text>
        <text x={760} y={240} fontFamily={FONT} fontSize={28} fontWeight={800} fill={s.color}>
          {s.pairs}
        </text>
        <rect x={760} y={266} width={150} height={4} rx={2} fill={s.color} opacity={0.7} />
        <text x={760} y={318} fontFamily={FONT} fontSize={19} fontWeight={500} fill={C.ink}>
          {s.note}
        </text>
      </El>

      {/* The running order, so position in the day is obvious */}
      <El at={54} f={f} from="below">
        {SESSIONS.map((sess, i) => (
          <g key={sess.name}>
            <circle cx={766 + i * 30} cy={372} r={7}
              fill={sess.color} opacity={i === active ? 1 : 0.28} />
          </g>
        ))}
        <text x={766 + SESSIONS.length * 30 + 6} y={378} fontFamily={FONT} fontSize={14}
          fill={C.muted}>session {active + 1} of {SESSIONS.length}</text>
      </El>
    </>
  )
}

// ── 8. Why the market never sleeps ──────────────────────────────────────────

const SunTerminator: React.FC<ArtProps> = ({ f }) => {
  const cx = AW / 2, cy = 272, r = 168
  const spin = (f * 0.55) % 360
  const cities = [
    { name: 'Sydney', a: -60 }, { name: 'Tokyo', a: -15 },
    { name: 'London', a: 120 }, { name: 'New York', a: 175 },
  ]
  return (
    <>
      <El at={6} f={f} from="fade">
        <defs>
          <linearGradient id="dayNight" x1="0" x2="1">
            <stop offset="0%" stopColor={C.amber} stopOpacity="0.28" />
            <stop offset="48%" stopColor={C.amber} stopOpacity="0.06" />
            <stop offset="52%" stopColor="#0b1220" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0b1220" stopOpacity="0.96" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="url(#dayNight)"
          stroke={C.edge} strokeWidth={1.5} />
        <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke={C.amber}
          strokeWidth={2} opacity={0.5} strokeDasharray="6 6" />
      </El>

      {cities.map((city, i) => {
        const t = rev(f, 22 + i * 10, 18)
        if (t <= 0) return null
        const a = ((city.a + spin) % 360) * Math.PI / 180
        const x = cx + Math.cos(a) * r * 0.74
        const y = cy + Math.sin(a) * r * 0.5
        const daylight = Math.cos(a) > 0
        return (
          <g key={city.name} opacity={t}>
            <circle cx={x} cy={y} r={daylight ? 9 : 6}
              fill={daylight ? C.amber : C.blue}
              opacity={daylight ? 0.95 : 0.6} />
            <text x={x} y={y - 18} textAnchor="middle" fontFamily={FONT} fontSize={14}
              fontWeight={700} fill={daylight ? C.amber : C.muted}>{city.name}</text>
          </g>
        )
      })}

      <El at={4} f={f} from="left">
        <text x={90} y={150} fontFamily={FONT} fontSize={17} fontWeight={800}
          fill={C.amber} letterSpacing="0.12em">DAY</text>
      </El>
      <El at={4} f={f} from="right">
        <text x={AW - 90} y={150} textAnchor="end" fontFamily={FONT} fontSize={17}
          fontWeight={800} fill={C.blue} letterSpacing="0.12em">NIGHT</text>
      </El>
      <El at={70} f={f} from="below">
        <text x={cx} y={490} textAnchor="middle" fontFamily={FONT} fontSize={21}
          fontWeight={700} fill={C.ink}>One market closes, the next one opens</text>
      </El>
    </>
  )
}

// ── 9. Session overlaps — where the volume is ───────────────────────────────

const OVERLAPS = [
  { a: 'London', b: 'New York', from: 13, to: 17, colorA: C.bull, colorB: C.amber,
    head: 'The best window', note: 'Highest volume · tightest spreads' },
  { a: 'Tokyo', b: 'London', from: 8, to: 9, colorA: C.blue, colorB: C.bull,
    head: 'Early spike', note: 'EUR/JPY often moves · watch the news' },
  { a: '', b: '', from: 22, to: 7, colorA: C.bear, colorB: C.bear,
    head: 'When not to trade', note: 'Low volume · wide spreads · erratic' },
]

const SessionOverlap: React.FC<ArtProps> = ({ f, variant }) => {
  const o = OVERLAPS[Math.min(Math.max(variant, 0), OVERLAPS.length - 1)]
  const dead = !o.a
  const x0 = 110, x1 = AW - 110
  const atX = (h: number) => x0 + (h / 24) * (x1 - x0)
  const barTop = 150

  // Volume profile: a bump under the overlap, a trough in the dead zone.
  const bars = Array.from({ length: 48 }, (_, i) => {
    const h = i / 2
    const inWin = o.from < o.to ? (h >= o.from && h <= o.to) : (h >= o.from || h <= o.to)
    const base = 0.22 + Math.sin((h / 24) * Math.PI * 2 - 1.4) * 0.18
    return Math.max(0.06, dead ? (inWin ? 0.09 : base + 0.2) : (inWin ? 0.95 : base))
  })

  return (
    <>
      {!dead && (
        <>
          <El at={8} f={f} from="left">
            <rect x={atX(o.a === 'London' ? 8 : 0)} y={barTop}
              width={atX(o.a === 'London' ? 17 : 9) - atX(o.a === 'London' ? 8 : 0)} height={40} rx={9}
              fill={o.colorA} fillOpacity={0.26} stroke={o.colorA} strokeWidth={1.6} />
            <text x={atX(o.a === 'London' ? 8 : 0) + 14} y={barTop + 27} fontFamily={FONT}
              fontSize={17} fontWeight={700} fill={o.colorA}>{o.a}</text>
          </El>
          <El at={20} f={f} from="right">
            <rect x={atX(o.b === 'New York' ? 13 : 8)} y={barTop + 52}
              width={atX(o.b === 'New York' ? 22 : 17) - atX(o.b === 'New York' ? 13 : 8)} height={40} rx={9}
              fill={o.colorB} fillOpacity={0.26} stroke={o.colorB} strokeWidth={1.6} />
            <text x={atX(o.b === 'New York' ? 13 : 8) + 14} y={barTop + 79} fontFamily={FONT}
              fontSize={17} fontWeight={700} fill={o.colorB}>{o.b}</text>
          </El>
        </>
      )}

      {/* The window itself */}
      <El at={34} f={f} from="fade">
        <rect x={atX(o.from)} y={barTop - 26}
          width={Math.max(atX(o.to) - atX(o.from), 26)} height={dead ? 200 : 150} rx={10}
          fill={dead ? C.bear : C.ink} fillOpacity={dead ? 0.1 : 0.07}
          stroke={dead ? C.bear : C.ink} strokeWidth={1.6} strokeDasharray="6 5" />
        <text x={atX(o.from) + Math.max(atX(o.to) - atX(o.from), 26) / 2} y={barTop - 38}
          textAnchor="middle" fontFamily={FONT} fontSize={16} fontWeight={800}
          fill={dead ? C.bear : C.ink}>
          {String(o.from).padStart(2, '0')}:00 – {String(o.to).padStart(2, '0')}:00 GMT
        </text>
      </El>

      {/* Volume underneath */}
      <El at={46} f={f} from="below">
        {bars.map((v, i) => {
          const t = rev(f, 48 + i * 0.7, 14)
          if (t <= 0) return null
          const w = (x1 - x0) / bars.length
          const h = v * 120 * t
          const inWin = (() => { const hh = i / 2
            return o.from < o.to ? (hh >= o.from && hh <= o.to) : (hh >= o.from || hh <= o.to) })()
          return (
            <rect key={i} x={x0 + i * w} y={420 - h} width={w - 2} height={h} rx={2}
              fill={dead ? (inWin ? C.bear : C.muted) : (inWin ? C.bull : C.muted)}
              opacity={inWin ? 0.85 : 0.3} />
          )
        })}
        <line x1={x0} y1={422} x2={x1} y2={422} stroke={C.edge} strokeWidth={1.5} />
        <text x={x0} y={446} fontFamily={FONT} fontSize={13} fill={C.muted}
          letterSpacing="0.1em">VOLUME THROUGH THE DAY</text>
      </El>

      <El at={76} f={f} from="below">
        <text x={AW / 2} y={500} textAnchor="middle" fontFamily={FONT} fontSize={22}
          fontWeight={800} fill={dead ? C.bear : C.bull}>{o.head}</text>
        <text x={AW / 2} y={528} textAnchor="middle" fontFamily={FONT} fontSize={16}
          fontWeight={500} fill={C.muted}>{o.note}</text>
      </El>
    </>
  )
}

// ── 10. The trading week ────────────────────────────────────────────────────

const TradingWeek: React.FC<ArtProps> = ({ f, variant }) => {
  const holidays = variant === 1
  const days = [
    { d: 'Mon', v: 0.72 }, { d: 'Tue', v: 0.9 }, { d: 'Wed', v: 0.95 },
    { d: 'Thu', v: 0.88 }, { d: 'Fri', v: 0.8 }, { d: 'Sat', v: 0 }, { d: 'Sun', v: 0 },
  ]
  const x0 = 130, w = (AW - 260) / days.length

  return (
    <>
      {days.map((day, i) => {
        const t = rev(f, 8 + i * 8, 22)
        if (t <= 0) return null
        const closed = day.v === 0
        // Friday's second half fades — positions get closed before the weekend.
        const fri = !holidays && day.d === 'Fri'
        const h = Math.max(day.v * 230 * t, closed ? 6 : 10)
        const x = x0 + i * w
        const col = holidays ? (i > 0 && i < 5 ? C.bear : C.muted) : closed ? C.muted : fri ? C.amber : C.bull
        return (
          <g key={day.d}>
            <rect x={x} y={392 - h} width={w - 16} height={h} rx={8}
              fill={col} fillOpacity={closed ? 0.12 : 0.26}
              stroke={col} strokeWidth={1.4} strokeOpacity={closed ? 0.35 : 0.8} />
            {fri && (
              <rect x={x + (w - 16) * 0.55} y={392 - h} width={(w - 16) * 0.45} height={h} rx={8}
                fill={C.bear} fillOpacity={0.22} />
            )}
            <text x={x + (w - 16) / 2} y={420} textAnchor="middle" fontFamily={FONT}
              fontSize={16} fontWeight={700} fill={closed ? C.muted : C.ink}>{day.d}</text>
          </g>
        )
      })}
      <line x1={x0 - 14} y1={394} x2={AW - 130} y2={394} stroke={C.edge} strokeWidth={1.5} />

      <El at={4} f={f} from="left">
        <text x={130} y={118} fontFamily={FONT} fontSize={16} fontWeight={800}
          fill={C.muted} letterSpacing="0.12em">LIQUIDITY THROUGH THE WEEK</text>
      </El>

      {!holidays && (
        <El at={62} f={f} from="fade">
          <text x={x0 + 4 * w + (w - 16) / 2} y={150} textAnchor="middle" fontFamily={FONT}
            fontSize={15} fontWeight={800} fill={C.amber}>after 18:00</text>
          <text x={x0 + 4 * w + (w - 16) / 2} y={174} textAnchor="middle" fontFamily={FONT}
            fontSize={14} fill={C.muted}>spreads widen</text>
        </El>
      )}
      <El at={72} f={f} from="below">
        <text x={AW / 2} y={492} textAnchor="middle" fontFamily={FONT} fontSize={21}
          fontWeight={700} fill={holidays ? C.bear : C.ink}>
          {holidays ? 'On major holidays the market is almost dead'
                    : 'Traders square up before the weekend'}
        </text>
      </El>
    </>
  )
}

// ── 11. The three things you need to know ───────────────────────────────────

const PILLARS = [
  { name: 'PIPS',   sub: 'how price moves are measured', color: C.bull },
  { name: 'LOTS',   sub: "how much you're buying",       color: C.blue },
  { name: 'SPREAD', sub: 'the cost of every trade',      color: C.amber },
]

const ThreePillars: React.FC<ArtProps> = ({ f }) => {
  const w = 320, gap = 40
  const totalW = PILLARS.length * w + (PILLARS.length - 1) * gap
  const x0 = (AW - totalW) / 2
  return (
    <>
      {PILLARS.map((p, i) => {
        const t = rev(f, 10 + i * 16, 22)
        if (t <= 0) return null
        const x = x0 + i * (w + gap)
        return (
          <g key={p.name} opacity={t} transform={`translate(0,${(1 - t) * 36})`}>
            <rect x={x} y={150} width={w} height={230} rx={18}
              fill={p.color} fillOpacity={0.1} stroke={p.color} strokeWidth={2} />
            <text x={x + w / 2} y={236} textAnchor="middle" fontFamily={FONT}
              fontSize={44} fontWeight={800} fill={p.color}>{p.name}</text>
            <rect x={x + w / 2 - 40} y={258} width={80} height={4} rx={2}
              fill={p.color} opacity={0.6} />
            <text x={x + w / 2} y={306} textAnchor="middle" fontFamily={FONT}
              fontSize={17} fontWeight={500} fill={C.ink}>{p.sub}</text>
            <text x={x + w / 2} y={352} textAnchor="middle" fontFamily={FONT}
              fontSize={15} fontWeight={700} fill={p.color} opacity={0.65}>
              {i + 1} of 3
            </text>
          </g>
        )
      })}
      <El at={66} f={f} from="below">
        <text x={AW / 2} y={452} textAnchor="middle" fontFamily={FONT} fontSize={20}
          fontWeight={700} fill={C.ink}>Get these three right and the rest follows</text>
      </El>
    </>
  )
}

// ── 12. What a pip actually is, in the digits ───────────────────────────────

const PipDigits: React.FC<ArtProps> = ({ f, variant }) => {
  const CFG = [
    { pair: 'EUR/USD', before: '1.0847', after: '1.0848', hi: 5, label: '1 pip = 0.0001', sub: 'the 4th decimal place' },
    { pair: 'Most pairs', before: '1.0000', after: '1.0001', hi: 5, label: '1 pip = 0.0001', sub: 'the 4th decimal place' },
    { pair: 'USD/JPY', before: '151.34', after: '151.35', hi: 5, label: '1 pip = 0.01', sub: 'yen pairs use the 2nd decimal' },
  ]
  const c = CFG[Math.min(Math.max(variant, 0), CFG.length - 1)]
  const size = 86
  const cw = size * 0.62

  const Price: React.FC<{ text: string; x: number; at: number; lit: boolean }> = ({ text, x, at, lit }) => {
    const t = rev(f, at, 20)
    if (t <= 0) return null
    return (
      <g opacity={t}>
        {text.split('').map((ch, i) => {
          const isHi = i === c.hi
          return (
            <g key={i}>
              {isHi && (
                <rect x={x + i * cw - 6} y={210 - size * 0.74} width={cw + 12} height={size * 1.04}
                  rx={8} fill={lit ? C.bull : C.muted} fillOpacity={lit ? 0.22 : 0.1}
                  stroke={lit ? C.bull : C.muted} strokeWidth={1.6} />
              )}
              <text x={x + i * cw + cw / 2} y={210} textAnchor="middle" fontFamily={MONO}
                fontSize={size} fontWeight={700}
                fill={isHi ? (lit ? C.bull : C.ink) : C.ink}
                opacity={isHi ? 1 : 0.82}>
                {ch}
              </text>
            </g>
          )
        })}
      </g>
    )
  }

  const boxW = c.before.length * cw
  const leftX = AW / 2 - boxW - 90
  const rightX = AW / 2 + 90

  return (
    <>
      <El at={2} f={f} from="left">
        <text x={leftX} y={110} fontFamily={FONT} fontSize={17} fontWeight={800}
          fill={C.muted} letterSpacing="0.12em">{c.pair.toUpperCase()}</text>
      </El>

      <Price text={c.before} x={leftX} at={10} lit={false} />
      <El at={30} f={f} from="fade">
        <path d={`M${AW / 2 - 54},196 L${AW / 2 + 54},196`} stroke={C.bull}
          strokeWidth={3} strokeLinecap="round" />
        <path d={`M${AW / 2 + 34},182 L${AW / 2 + 56},196 L${AW / 2 + 34},210`}
          fill="none" stroke={C.bull} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </El>
      <Price text={c.after} x={rightX} at={44} lit />

      <El at={62} f={f} from="below">
        <line x1={rightX + c.hi * cw + cw / 2} y1={232}
          x2={rightX + c.hi * cw + cw / 2} y2={290}
          stroke={C.bull} strokeWidth={2} strokeDasharray="5 4" />
        <circle cx={rightX + c.hi * cw + cw / 2} cy={298} r={7} fill={C.bull} />
      </El>
      <El at={72} f={f} from="below">
        <text x={AW / 2} y={378} textAnchor="middle" fontFamily={FONT} fontSize={38}
          fontWeight={800} fill={C.bull}>{c.label}</text>
        <text x={AW / 2} y={418} textAnchor="middle" fontFamily={FONT} fontSize={19}
          fontWeight={500} fill={C.muted}>{c.sub}</text>
      </El>
    </>
  )
}

// ── 13. Lot sizes, and what a pip is worth at each ──────────────────────────

const LOTS = [
  { name: 'Standard lot', units: '100,000 units', pip: '$10.00', who: 'professionals', w: 620, color: C.bull },
  { name: 'Mini lot',     units: '10,000 units',  pip: '$1.00',  who: 'intermediate',  w: 420, color: C.blue },
  { name: 'Micro lot',    units: '1,000 units',   pip: '$0.10',  who: 'beginners',     w: 250, color: C.violet },
]

const LotLadder: React.FC<ArtProps> = ({ f, variant }) => {
  // variant 0 = the concept (no single row lit); 1..3 = that row lit.
  const active = variant - 1
  const rowH = 96
  const top = 140

  return (
    <>
      {LOTS.map((l, i) => {
        const isActive = i === active
        const seen = active >= 0 && i < active
        const t = rev(f, isActive ? 8 : 4, isActive ? 26 : 16)
        if (t <= 0) return null
        const y = top + i * rowH
        const dim = active >= 0 && !isActive
        return (
          <g key={l.name} opacity={dim ? (seen ? 0.42 : 0.24) : 1}>
            <rect x={130} y={y} width={l.w * (isActive ? t : 1)} height={rowH - 22} rx={12}
              fill={l.color} fillOpacity={isActive ? 0.24 : 0.12}
              stroke={l.color} strokeWidth={isActive ? 2.4 : 1.2} />
            <text x={152} y={y + 34} fontFamily={FONT} fontSize={isActive ? 25 : 21}
              fontWeight={800} fill={l.color}>{l.name}</text>
            <text x={152} y={y + 60} fontFamily={FONT} fontSize={15} fill={C.muted}>
              {l.units}
            </text>
            <text x={130 + l.w + 30} y={y + 46} fontFamily={FONT}
              fontSize={isActive ? 40 : 30} fontWeight={800} fill={l.color}>{l.pip}</text>
            <text x={130 + l.w + 32} y={y + 68} fontFamily={FONT} fontSize={13}
              fill={C.muted}>per pip</text>
            {isActive && (
              <text x={AW - 140} y={y + 46} textAnchor="end" fontFamily={FONT}
                fontSize={18} fontWeight={600} fill={C.ink}>for {l.who}</text>
            )}
          </g>
        )
      })}
      <El at={46} f={f} from="below">
        <text x={AW / 2} y={470} textAnchor="middle" fontFamily={FONT} fontSize={20}
          fontWeight={700} fill={active < 0 ? C.ink : C.muted}>
          {active < 0
            ? 'Bigger lot = bigger profit AND bigger loss, per pip'
            : 'Same market — only the size changes'}
        </text>
      </El>
    </>
  )
}

// ── 14. The worked example, assembled term by term ──────────────────────────

const PipMath: React.FC<ArtProps> = ({ f, variant }) => {
  const stage = Math.min(Math.max(variant, 0), 2)

  // Stage 0: the move itself, on a price line.
  if (stage === 0) {
    const t = rev(f, 10, 40)
    const x0 = 180, x1 = AW - 320, y0 = 380, y1 = 190
    return (
      <>
        <El at={4} f={f} from="left">
          <text x={x0} y={130} fontFamily={FONT} fontSize={17} fontWeight={800}
            fill={C.muted} letterSpacing="0.12em">EUR/USD · MICRO LOT (0.01)</text>
        </El>
        <line x1={x0} y1={y0} x2={x0 + (x1 - x0) * t} y2={y0 + (y1 - y0) * t}
          stroke={C.bull} strokeWidth={4} strokeLinecap="round" />
        <El at={6} f={f} from="fade">
          <line x1={x0} y1={y0} x2={x1 + 60} y2={y0} stroke={C.edge}
            strokeWidth={1.5} strokeDasharray="6 5" />
        </El>
        {t > 0.85 && (
          <El at={48} f={f} from="fade">
            <line x1={x1 + 30} y1={y0} x2={x1 + 30} y2={y1} stroke={C.bull}
              strokeWidth={2} strokeDasharray="5 4" />
            <text x={x1 + 52} y={(y0 + y1) / 2 + 8} fontFamily={FONT} fontSize={40}
              fontWeight={800} fill={C.bull}>+30 pips</text>
            <text x={x1 + 54} y={(y0 + y1) / 2 + 36} fontFamily={FONT} fontSize={16}
              fill={C.muted}>in your favour</text>
          </El>
        )}
      </>
    )
  }

  // Stage 1: the arithmetic, one term at a time.
  if (stage === 1) {
    const terms = [
      { txt: '30 pips', color: C.bull, at: 8 },
      { txt: '×',       color: C.muted, at: 22 },
      { txt: '$0.10',   color: C.violet, at: 30 },
      { txt: '=',       color: C.muted, at: 46 },
      { txt: '$3.00',   color: C.ink,   at: 54 },
    ]
    const widths = [250, 60, 210, 60, 250]
    const total = widths.reduce((a, b) => a + b, 0)
    let x = (AW - total) / 2
    const xs = widths.map(w => { const v = x; x += w; return v })
    return (
      <>
        {terms.map((tm, i) => {
          const t = rev(f, tm.at, 20)
          if (t <= 0) return null
          const big = i === 0 || i === 2 || i === 4
          return (
            <g key={i} opacity={t} transform={`translate(0,${(1 - t) * 28})`}>
              <text x={xs[i] + widths[i] / 2} y={272} textAnchor="middle" fontFamily={MONO}
                fontSize={big ? 66 : 44} fontWeight={800} fill={tm.color}>{tm.txt}</text>
              {i === 2 && (
                <text x={xs[i] + widths[i] / 2} y={312} textAnchor="middle" fontFamily={FONT}
                  fontSize={15} fill={C.muted}>per pip</text>
              )}
            </g>
          )
        })}
        <El at={70} f={f} from="fade">
          <rect x={xs[4] - 14} y={210} width={widths[4] + 4} height={86} rx={12}
            fill="none" stroke={C.bull} strokeWidth={2.4} />
        </El>
        <El at={78} f={f} from="below">
          <text x={AW / 2} y={400} textAnchor="middle" fontFamily={FONT} fontSize={19}
            fontWeight={600} fill={C.muted}>Pips moved × value per pip = profit</text>
        </El>
      </>
    )
  }

  // Stage 2: what that is against the account.
  const t = rev(f, 12, 30)
  const barW = 700
  const gain = 0.006   // £3 on £500
  return (
    <>
      <El at={4} f={f} from="left">
        <text x={(AW - barW) / 2} y={190} fontFamily={FONT} fontSize={17} fontWeight={800}
          fill={C.muted} letterSpacing="0.12em">£500 PRACTICE ACCOUNT</text>
      </El>
      <El at={10} f={f} from="fade">
        <rect x={(AW - barW) / 2} y={216} width={barW} height={62} rx={12}
          fill={C.ink} fillOpacity={0.07} stroke={C.edge} strokeWidth={1.5} />
      </El>
      <rect x={(AW - barW) / 2} y={216} width={Math.max(barW * gain * t * 24, 4)} height={62}
        rx={12} fill={C.bull} fillOpacity={0.5} />
      <El at={40} f={f} from="below">
        <text x={AW / 2} y={344} textAnchor="middle" fontFamily={FONT} fontSize={44}
          fontWeight={800} fill={C.bull}>+$3.00</text>
        <text x={AW / 2} y={384} textAnchor="middle" fontFamily={FONT} fontSize={19}
          fontWeight={500} fill={C.muted}>small on purpose — real risk, survivable size</text>
      </El>
    </>
  )
}

// ── 15. Where the broker actually sits ──────────────────────────────────────

const BrokerGateway: React.FC<ArtProps> = ({ f }) => {
  const cols = [
    { x: 150, w: 250, title: 'YOU', sub: 'place the order', color: C.blue },
    { x: 515, w: 250, title: 'BROKER', sub: 'platform · execution · funds', color: C.amber },
    { x: 880, w: 250, title: 'MARKET', sub: 'banks & liquidity', color: C.bull },
  ]
  return (
    <>
      {cols.map((c, i) => (
        <El key={c.title} at={6 + i * 16} f={f} from={i === 0 ? 'left' : i === 2 ? 'right' : 'fade'}>
          <rect x={c.x} y={160} width={c.w} height={170} rx={16}
            fill={c.color} fillOpacity={0.12} stroke={c.color} strokeWidth={2} />
          <text x={c.x + c.w / 2} y={232} textAnchor="middle" fontFamily={FONT}
            fontSize={34} fontWeight={800} fill={c.color}>{c.title}</text>
          <text x={c.x + c.w / 2} y={272} textAnchor="middle" fontFamily={FONT}
            fontSize={15} fontWeight={500} fill={C.ink} opacity={0.85}>{c.sub}</text>
        </El>
      ))}
      {/* Order out, price back */}
      <Flow x1={405} y1={212} x2={510} y2={212} color={C.blue} f={f} at={40} />
      <Flow x1={770} y1={212} x2={875} y2={212} color={C.blue} f={f} at={48} />
      <Flow x1={875} y1={282} x2={770} y2={282} color={C.bull} f={f} at={56} />
      <Flow x1={510} y1={282} x2={405} y2={282} color={C.bull} f={f} at={64} />
      <El at={46} f={f} from="fade">
        <text x={AW / 2} y={148} textAnchor="middle" fontFamily={FONT} fontSize={14}
          fontWeight={700} fill={C.blue} letterSpacing="0.1em">YOUR ORDER →</text>
        <text x={AW / 2} y={352} textAnchor="middle" fontFamily={FONT} fontSize={14}
          fontWeight={700} fill={C.bull} letterSpacing="0.1em">← PRICES &amp; FILLS</text>
      </El>
      <El at={78} f={f} from="below">
        <text x={AW / 2} y={448} textAnchor="middle" fontFamily={FONT} fontSize={21}
          fontWeight={700} fill={C.ink}>Everything you trade passes through them</text>
      </El>
    </>
  )
}

// ── 16. Regulators — the badge that matters ─────────────────────────────────

const REGULATORS = [
  { code: 'FCA',      where: 'United Kingdom', color: C.bull },
  { code: 'CFTC/NFA', where: 'United States',  color: C.blue },
  { code: 'ASIC',     where: 'Australia',      color: C.amber },
  { code: 'CySEC',    where: 'Cyprus · EU',    color: C.violet },
]

const RegulatorBadges: React.FC<ArtProps> = ({ f, variant }) => {
  const active = variant - 1     // variant 0 = overview, 1..4 = one lit
  const w = 250, gap = 28
  const totalW = REGULATORS.length * w + (REGULATORS.length - 1) * gap
  const x0 = (AW - totalW) / 2

  const shield = (cx: number, cy: number, s: number) =>
    `M${cx},${cy - s} L${cx + s * 0.8},${cy - s * 0.55} L${cx + s * 0.8},${cy + s * 0.25} ` +
    `Q${cx + s * 0.8},${cy + s * 0.85} ${cx},${cy + s} ` +
    `Q${cx - s * 0.8},${cy + s * 0.85} ${cx - s * 0.8},${cy + s * 0.25} ` +
    `L${cx - s * 0.8},${cy - s * 0.55} Z`

  return (
    <>
      {REGULATORS.map((r, i) => {
        const isActive = i === active
        const dim = active >= 0 && !isActive
        const t = rev(f, isActive ? 8 : 4 + i * 6, isActive ? 26 : 16)
        if (t <= 0) return null
        const x = x0 + i * (w + gap)
        const cx = x + w / 2
        return (
          <g key={r.code} opacity={dim ? (i < active ? 0.4 : 0.22) : t}
            transform={isActive ? `translate(0,${(1 - t) * 24})` : undefined}>
            <path d={shield(cx, 236, isActive ? 78 : 62)}
              fill={r.color} fillOpacity={isActive ? 0.2 : 0.1}
              stroke={r.color} strokeWidth={isActive ? 2.6 : 1.4} />
            {isActive && (
              <path d={`M${cx - 24},236 l16,17 l32,-34`} fill="none" stroke={r.color}
                strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"
                opacity={rev(f, 26, 14)} />
            )}
            <text x={cx} y={isActive ? 356 : 334} textAnchor="middle" fontFamily={FONT}
              fontSize={isActive ? 30 : 23} fontWeight={800} fill={r.color}>{r.code}</text>
            {/* The lit badge needs one bright element or the whole scene reads
                flat next to its neighbours — everything else here is accent
                colour, which sits well below white in luminance. */}
            <text x={cx} y={isActive ? 384 : 358} textAnchor="middle" fontFamily={FONT}
              fontSize={isActive ? 17 : 15} fontWeight={isActive ? 700 : 500}
              fill={isActive ? C.ink : C.muted}>{r.where}</text>
          </g>
        )
      })}
      <El at={44} f={f} from="below">
        <text x={AW / 2} y={462} textAnchor="middle" fontFamily={FONT} fontSize={19}
          fontWeight={700} fill={C.ink} opacity={active < 0 ? 1 : 0.85}>
          {active < 0
            ? 'Regulated means your money is ring-fenced and the broker is accountable'
            : 'Check the licence number on the regulator’s own register'}
        </text>
      </El>
    </>
  )
}

// ── 17. What the spread really costs ────────────────────────────────────────

const CostCompare: React.FC<ArtProps> = ({ f }) => {
  const rows = [
    { name: 'Tight spread', pips: 0.8, color: C.bull, cost: '$80' },
    { name: 'Wide spread',  pips: 2.4, color: C.bear, cost: '$240' },
  ]
  const unit = 230
  return (
    <>
      <El at={2} f={f} from="left">
        <text x={140} y={128} fontFamily={FONT} fontSize={16} fontWeight={800}
          fill={C.muted} letterSpacing="0.12em">SAME TRADE · TWO BROKERS</text>
      </El>
      {rows.map((r, i) => {
        const t = rev(f, 12 + i * 20, 26)
        if (t <= 0) return null
        const y = 180 + i * 112
        return (
          <g key={r.name}>
            <text x={140} y={y + 30} fontFamily={FONT} fontSize={21} fontWeight={700}
              fill={C.ink}>{r.name}</text>
            <rect x={400} y={y} width={r.pips * unit * t} height={52} rx={10}
              fill={r.color} fillOpacity={0.26} stroke={r.color} strokeWidth={1.6} />
            <text x={412} y={y + 35} fontFamily={FONT} fontSize={23} fontWeight={800}
              fill={r.color}>{r.pips} pips</text>
          </g>
        )
      })}
      <El at={58} f={f} from="below">
        <text x={140} y={430} fontFamily={FONT} fontSize={16} fontWeight={700}
          fill={C.muted} letterSpacing="0.1em">COST OVER 100 TRADES · 1 MINI LOT</text>
        {rows.map((r, i) => (
          <text key={r.name} x={400 + i * 260} y={478} fontFamily={FONT} fontSize={42}
            fontWeight={800} fill={r.color}>{r.cost}</text>
        ))}
      </El>
      <El at={80} f={f} from="fade">
        <text x={940} y={472} fontFamily={FONT} fontSize={18} fontWeight={600}
          fill={C.ink}>$160 difference — for nothing</text>
      </El>
    </>
  )
}

// ── 18. The platform itself ─────────────────────────────────────────────────

const PlatformWindow: React.FC<ArtProps> = ({ f }) => {
  const candles = makeCandles(26, 'up', 41)
  const scale = makeScale(candles, { left: 430, right: 1090, top: 190, bottom: 400 })
  const watch = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD']
  return (
    <>
      <El at={4} f={f} from="fade">
        <rect x={150} y={120} width={AW - 300} height={340} rx={16}
          fill="rgba(255,255,255,0.025)" stroke={C.edge} strokeWidth={1.6} />
        <rect x={150} y={120} width={AW - 300} height={40} rx={16}
          fill="rgba(255,255,255,0.04)" />
        {[0, 1, 2].map(i => (
          <circle key={i} cx={178 + i * 20} cy={140} r={5.5} fill={C.muted} opacity={0.5} />
        ))}
        <text x={AW / 2} y={146} textAnchor="middle" fontFamily={FONT} fontSize={14}
          fontWeight={700} fill={C.muted} letterSpacing="0.14em">MT4 / MT5</text>
      </El>

      {/* Watchlist */}
      {watch.map((w, i) => (
        <El key={w} at={16 + i * 7} f={f} from="left">
          <rect x={172} y={182 + i * 46} width={224} height={38} rx={8}
            fill="rgba(255,255,255,0.03)" stroke={C.edge} strokeWidth={1} />
          <text x={188} y={207 + i * 46} fontFamily={FONT} fontSize={15} fontWeight={600}
            fill={C.ink}>{w}</text>
          <text x={378} y={207 + i * 46} textAnchor="end" fontFamily={MONO} fontSize={14}
            fontWeight={700} fill={i % 2 === 0 ? C.bull : C.bear}>
            {i % 2 === 0 ? '▲' : '▼'}
          </text>
        </El>
      ))}

      {/* Chart */}
      <El at={30} f={f} from="fade">
        <rect x={418} y={176} width={686} height={238} rx={10}
          fill="rgba(255,255,255,0.02)" stroke={C.edge} strokeWidth={1} />
      </El>
      <Candles candles={candles} scale={scale} localFrame={f} delay={38} perCandle={1.4} bodyW={0.5} />

      {/* Order ticket */}
      <El at={66} f={f} from="below">
        <rect x={418} y={424} width={330} height={22} rx={6} fill={C.bull} fillOpacity={0.22}
          stroke={C.bull} strokeWidth={1.2} />
        <text x={583} y={440} textAnchor="middle" fontFamily={FONT} fontSize={13}
          fontWeight={800} fill={C.bull}>BUY</text>
        <rect x={766} y={424} width={330} height={22} rx={6} fill={C.bear} fillOpacity={0.22}
          stroke={C.bear} strokeWidth={1.2} />
        <text x={931} y={440} textAnchor="middle" fontFamily={FONT} fontSize={13}
          fontWeight={800} fill={C.bear}>SELL</text>
      </El>
      <El at={80} f={f} from="below">
        <text x={AW / 2} y={500} textAnchor="middle" fontFamily={FONT} fontSize={19}
          fontWeight={600} fill={C.muted}>Charts, watchlist and order ticket in one window</text>
      </El>
    </>
  )
}

// ── 19. Execution speed, and what slow costs you ────────────────────────────

const ExecutionSpeed: React.FC<ArtProps> = ({ f }) => {
  const lanes = [
    { name: 'ECN / STP', ms: '12 ms', color: C.bull, y: 200, speed: 3.4, slip: null },
    { name: 'Slow desk', ms: '340 ms', color: C.bear, y: 330, speed: 0.9, slip: '−1.6 pips' },
  ]
  const x0 = 230, x1 = AW - 230
  return (
    <>
      <El at={2} f={f} from="left">
        <text x={130} y={130} fontFamily={FONT} fontSize={16} fontWeight={800}
          fill={C.muted} letterSpacing="0.12em">CLICK → FILL</text>
      </El>
      {lanes.map((ln, i) => {
        const t = rev(f, 8 + i * 12, 20)
        if (t <= 0) return null
        const prog = Math.min(((f - (14 + i * 12)) * ln.speed) / (x1 - x0), 1)
        const px = x0 + Math.max(prog, 0) * (x1 - x0)
        return (
          <g key={ln.name} opacity={t}>
            <line x1={x0} y1={ln.y} x2={x1} y2={ln.y} stroke={C.edge} strokeWidth={2}
              strokeDasharray="6 6" />
            <circle cx={x0} cy={ln.y} r={12} fill={ln.color} fillOpacity={0.2}
              stroke={ln.color} strokeWidth={2} />
            <circle cx={x1} cy={ln.y} r={12} fill={ln.color} fillOpacity={0.2}
              stroke={ln.color} strokeWidth={2} />
            {prog > 0 && (
              <circle cx={px} cy={ln.y} r={9} fill={ln.color} />
            )}
            <text x={130} y={ln.y + 6} fontFamily={FONT} fontSize={19} fontWeight={700}
              fill={ln.color}>{ln.name}</text>
            <text x={x1 + 26} y={ln.y + 7} fontFamily={MONO} fontSize={24} fontWeight={800}
              fill={ln.color}>{ln.ms}</text>
            {ln.slip && prog >= 1 && (
              <text x={x1 + 26} y={ln.y + 34} fontFamily={FONT} fontSize={15}
                fontWeight={700} fill={C.bear} opacity={rev(f, 70, 14)}>{ln.slip}</text>
            )}
          </g>
        )
      })}
      <El at={78} f={f} from="below">
        <text x={AW / 2} y={462} textAnchor="middle" fontFamily={FONT} fontSize={20}
          fontWeight={700} fill={C.ink}>Slow fills show up as slippage, every trade</text>
      </El>
    </>
  )
}

// ── 20. Red flags ───────────────────────────────────────────────────────────

const FLAGS = [
  { head: 'Unregulated or offshore', sub: 'no oversight, no recourse if it goes wrong' },
  { head: 'Guaranteed profit claims', sub: 'nobody can guarantee a return — it is a lie' },
  { head: 'Withdrawal problems', sub: 'delays, hidden fees, moving goalposts' },
]

const RedFlags: React.FC<ArtProps> = ({ f, variant }) => {
  const active = Math.min(Math.max(variant, 0), FLAGS.length - 1)
  return (
    <>
      {FLAGS.map((fl, i) => {
        const isActive = i === active
        const seen = i < active
        const t = rev(f, isActive ? 8 : 4, isActive ? 24 : 14)
        if (t <= 0) return null
        const y = 150 + i * 106
        return (
          <g key={fl.head} opacity={isActive ? 1 : seen ? 0.42 : 0.2}
            transform={isActive ? `translate(${(1 - t) * -40},0)` : undefined}>
            <rect x={150} y={y} width={AW - 300} height={84} rx={14}
              fill={C.bear} fillOpacity={isActive ? 0.14 : 0.05}
              stroke={C.bear} strokeWidth={isActive ? 2.2 : 1} strokeOpacity={isActive ? 1 : 0.4} />
            {/* Warning triangle */}
            <path d={`M198,${y + 26} L218,${y + 60} L178,${y + 60} Z`} fill="none"
              stroke={C.bear} strokeWidth={isActive ? 2.6 : 1.6} strokeLinejoin="round" />
            <text x={198} y={y + 55} textAnchor="middle" fontFamily={FONT} fontSize={16}
              fontWeight={800} fill={C.bear}>!</text>
            <text x={250} y={y + 42} fontFamily={FONT} fontSize={isActive ? 25 : 20}
              fontWeight={800} fill={isActive ? C.bear : C.muted}>{fl.head}</text>
            {isActive && (
              <text x={250} y={y + 68} fontFamily={FONT} fontSize={16} fontWeight={500}
                fill={C.ink} opacity={0.85}>{fl.sub}</text>
            )}
          </g>
        )
      })}
      <El at={40} f={f} from="below">
        <text x={AW / 2} y={500} textAnchor="middle" fontFamily={FONT} fontSize={19}
          fontWeight={700} fill={C.bear}>Any one of these is a reason to walk away</text>
      </El>
    </>
  )
}

// ── 21. The fork: practise money or real money ──────────────────────────────
// Deliberately not another stack of rows — this is a decision, so it is drawn
// as one.

const DemoFork: React.FC<ArtProps> = ({ f }) => {
  const forkX = AW / 2, forkY = 400
  const tL = rev(f, 18, 28)
  const tR = rev(f, 34, 28)

  const branch = (toX: number, toY: number, t: number) =>
    `M${forkX},${forkY} C${forkX},${forkY - 70} ${toX},${forkY - 40} ${toX},${forkY - 40 - (forkY - 40 - toY) * t}`

  return (
    <>
      {/* Approach */}
      <El at={4} f={f} from="below">
        <path d={`M${forkX},${AH - 20} L${forkX},${forkY}`} stroke={C.edge}
          strokeWidth={5} strokeLinecap="round" />
        <circle cx={forkX} cy={forkY} r={11} fill={C.ink} />
        <text x={forkX} y={AH - 30} textAnchor="middle" fontFamily={FONT} fontSize={15}
          fontWeight={700} fill={C.muted} letterSpacing="0.1em">YOU ARE HERE</text>
      </El>

      {/* Demo branch */}
      <path d={branch(300, 150, tL)} fill="none" stroke={C.bull} strokeWidth={5}
        strokeLinecap="round" />
      <El at={40} f={f} from="fade">
        <rect x={150} y={96} width={300} height={112} rx={16}
          fill={C.bull} fillOpacity={0.13} stroke={C.bull} strokeWidth={2.2} />
        <text x={300} y={148} textAnchor="middle" fontFamily={FONT} fontSize={36}
          fontWeight={800} fill={C.bull}>DEMO</text>
        <text x={300} y={180} textAnchor="middle" fontFamily={FONT} fontSize={16}
          fontWeight={500} fill={C.ink}>virtual money · real conditions</text>
      </El>

      {/* Live branch */}
      <path d={branch(980, 150, tR)} fill="none" stroke={C.bear} strokeWidth={5}
        strokeLinecap="round" strokeDasharray="10 8" opacity={0.85} />
      <El at={56} f={f} from="fade">
        <rect x={830} y={96} width={300} height={112} rx={16}
          fill={C.bear} fillOpacity={0.09} stroke={C.bear} strokeWidth={2} />
        <text x={980} y={148} textAnchor="middle" fontFamily={FONT} fontSize={36}
          fontWeight={800} fill={C.bear}>LIVE</text>
        <text x={980} y={180} textAnchor="middle" fontFamily={FONT} fontSize={16}
          fontWeight={500} fill={C.ink}>real money · real consequences</text>
      </El>

      <El at={74} f={f} from="fade">
        <path d="M486,262 l38,0" stroke={C.bull} strokeWidth={3} strokeLinecap="round" />
        <path d="M512,252 l14,10 l-14,10" fill="none" stroke={C.bull} strokeWidth={3}
          strokeLinecap="round" strokeLinejoin="round" />
        <text x={470} y={268} textAnchor="end" fontFamily={FONT} fontSize={19}
          fontWeight={800} fill={C.bull}>Start here</text>
      </El>
    </>
  )
}

// ── 22. Account types, positioned rather than listed ────────────────────────
// A two-axis map: how much capital it needs, and how direct the market access
// is. Plotting them shows the trade-off a list of five rows never could.

const ACCOUNTS = [
  { name: 'Demo',     x: 0.06, y: 0.30, note: 'virtual money · zero risk',        color: C.bull,   dashed: true },
  { name: 'Micro',    x: 0.22, y: 0.24, note: 'micro lots · minimal capital',     color: C.violet, dashed: false },
  { name: 'Mini',     x: 0.42, y: 0.40, note: 'mini lots · lower deposit',        color: C.blue,   dashed: false },
  { name: 'Standard', x: 0.78, y: 0.52, note: 'standard lots · larger capital',   color: C.amber,  dashed: false },
  { name: 'ECN',      x: 0.66, y: 0.90, note: 'direct access · tight, commission', color: C.bull,  dashed: false },
]

const AccountMap: React.FC<ArtProps> = ({ f, variant }) => {
  const active = variant - 1
  const bx = 230, by = 110, bw = 700, bh = 330
  const px = (v: number) => bx + v * bw
  const py = (v: number) => by + bh - v * bh

  return (
    <>
      {/* Axes */}
      <El at={2} f={f} from="fade">
        <line x1={bx} y1={by} x2={bx} y2={by + bh} stroke={C.edge} strokeWidth={1.8} />
        <line x1={bx} y1={by + bh} x2={bx + bw} y2={by + bh} stroke={C.edge} strokeWidth={1.8} />
        {[0.25, 0.5, 0.75].map(g => (
          <g key={g}>
            <line x1={px(g)} y1={by} x2={px(g)} y2={by + bh} stroke={C.grid} strokeWidth={1} />
            <line x1={bx} y1={py(g)} x2={bx + bw} y2={py(g)} stroke={C.grid} strokeWidth={1} />
          </g>
        ))}
        <text x={bx + bw / 2} y={by + bh + 46} textAnchor="middle" fontFamily={FONT}
          fontSize={15} fontWeight={800} fill={C.muted} letterSpacing="0.12em">
          CAPITAL REQUIRED →
        </text>
        <text x={bx - 26} y={by + bh / 2} textAnchor="middle" fontFamily={FONT}
          fontSize={15} fontWeight={800} fill={C.muted} letterSpacing="0.12em"
          transform={`rotate(-90 ${bx - 26} ${by + bh / 2})`}>
          MARKET ACCESS →
        </text>
      </El>

      {ACCOUNTS.map((a, i) => {
        const isActive = i === active
        const dim = active >= 0 && !isActive
        const t = rev(f, isActive ? 12 : 8 + i * 5, isActive ? 26 : 16)
        if (t <= 0) return null
        const r = isActive ? 26 : 13
        return (
          <g key={a.name} opacity={dim ? 0.3 : 1}>
            {isActive && (
              <circle cx={px(a.x)} cy={py(a.y)} r={r + 16 + bob(f, 0.09, 3)}
                fill={a.color} opacity={0.12} />
            )}
            <circle cx={px(a.x)} cy={py(a.y)} r={r * (isActive ? t : 1)}
              fill={a.color} fillOpacity={a.dashed ? 0.1 : 0.28}
              stroke={a.color} strokeWidth={isActive ? 3 : 1.8}
              strokeDasharray={a.dashed ? '5 4' : undefined} />
            <text x={px(a.x)} y={py(a.y) - r - 14} textAnchor="middle" fontFamily={FONT}
              fontSize={isActive ? 23 : 16} fontWeight={800} fill={a.color}>{a.name}</text>
          </g>
        )
      })}

      {/* Detail for the account being narrated */}
      {active >= 0 && (
        <El at={34} f={f} from="below">
          <rect x={bx} y={AH - 62} width={bw} height={46} rx={12}
            fill={ACCOUNTS[active].color} fillOpacity={0.1}
            stroke={ACCOUNTS[active].color} strokeWidth={1.4} />
          <text x={bx + bw / 2} y={AH - 32} textAnchor="middle" fontFamily={FONT}
            fontSize={19} fontWeight={600} fill={C.ink}>{ACCOUNTS[active].note}</text>
        </El>
      )}
      {active < 0 && (
        <El at={40} f={f} from="below">
          <text x={AW / 2} y={AH - 26} textAnchor="middle" fontFamily={FONT} fontSize={19}
            fontWeight={700} fill={C.ink}>Pick the one that matches your capital, not your ambition</text>
        </El>
      )}
    </>
  )
}

// ── 23. What demo actually builds — four gauges that fill ───────────────────
// Meters rather than bullet rows: the point is that these are capacities you
// grow, and the ones already covered stay full as the next fills.

const SKILLS = [
  { name: 'Platform fluency', note: 'buttons, tickets, charts — without paying to learn them' },
  { name: 'Strategy testing', note: 'does the idea actually work, over many trades' },
  { name: 'Order handling',   note: 'stops, limits, managing an open position' },
  { name: 'Emotional control', note: 'the habits that survive a losing run' },
]

const SkillGauges: React.FC<ArtProps> = ({ f, variant }) => {
  const active = variant - 1
  const r = 74
  const cy = 236
  const gap = 268
  const x0 = AW / 2 - (gap * (SKILLS.length - 1)) / 2

  const arcPath = (cx: number, frac: number) => {
    const a0 = Math.PI * 0.75
    const a1 = a0 + Math.PI * 1.5 * frac
    const large = Math.PI * 1.5 * frac > Math.PI ? 1 : 0
    return `M${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} ` +
           `A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)}`
  }

  return (
    <>
      {SKILLS.map((sk, i) => {
        const isActive = i === active
        const done = active < 0 || i < active
        const frac = isActive ? rev(f, 14, 40) : done ? 1 : 0.12
        const cx = x0 + i * gap
        const col = isActive ? C.bull : done ? C.bull : C.muted
        return (
          <g key={sk.name} opacity={isActive ? 1 : done ? 0.5 : 0.28}>
            <path d={arcPath(cx, 1)} fill="none" stroke={C.edge} strokeWidth={14}
              strokeLinecap="round" />
            {frac > 0.01 && (
              <path d={arcPath(cx, frac)} fill="none" stroke={col}
                strokeWidth={isActive ? 16 : 12} strokeLinecap="round" />
            )}
            <text x={cx} y={cy + 10} textAnchor="middle" fontFamily={MONO}
              fontSize={isActive ? 30 : 23} fontWeight={800} fill={col}>
              {Math.round(frac * 100)}%
            </text>
            <text x={cx} y={cy + r + 44} textAnchor="middle" fontFamily={FONT}
              fontSize={isActive ? 18 : 15} fontWeight={isActive ? 800 : 600}
              fill={isActive ? C.ink : C.muted}>
              {sk.name}
            </text>
          </g>
        )
      })}
      {active >= 0 && (
        <El at={36} f={f} from="below">
          <text x={AW / 2} y={AH - 34} textAnchor="middle" fontFamily={FONT} fontSize={19}
            fontWeight={600} fill={C.ink}>{SKILLS[active].note}</text>
        </El>
      )}
      {active < 0 && (
        <El at={40} f={f} from="below">
          <text x={AW / 2} y={AH - 34} textAnchor="middle" fontFamily={FONT} fontSize={20}
            fontWeight={700} fill={C.ink}>Four things demo buys you for free</text>
        </El>
      )}
    </>
  )
}

// ── 24. The gate to a live account ──────────────────────────────────────────

const GoLiveGate: React.FC<ArtProps> = ({ f }) => {
  const gateX = 780
  const x0 = 140, y0 = 380, yTop = 170
  const t = rev(f, 10, 44)

  // Three months of steadily-compounding demo equity.
  const pts = Array.from({ length: 34 }, (_, i) => {
    const p = i / 33
    const wobble = Math.sin(i * 0.9) * 10 + Math.sin(i * 0.37) * 6
    return { x: x0 + p * (gateX - 60 - x0), y: y0 - p * (y0 - yTop) + wobble }
  })
  const n = Math.max(Math.floor(pts.length * t), 2)
  const d = pts.slice(0, n).map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  return (
    <>
      <El at={2} f={f} from="left">
        <text x={x0} y={126} fontFamily={FONT} fontSize={16} fontWeight={800}
          fill={C.muted} letterSpacing="0.12em">DEMO · 3 MONTHS CONSISTENT</text>
      </El>
      <El at={4} f={f} from="fade">
        <line x1={x0} y1={y0 + 26} x2={gateX - 60} y2={y0 + 26} stroke={C.edge} strokeWidth={1.5} />
        {['Month 1', 'Month 2', 'Month 3'].map((m, i) => (
          <text key={m} x={x0 + 100 + i * 200} y={y0 + 52} textAnchor="middle"
            fontFamily={FONT} fontSize={14} fill={C.muted}>{m}</text>
        ))}
      </El>
      <path d={d} fill="none" stroke={C.bull} strokeWidth={4} strokeLinecap="round"
        strokeLinejoin="round" />

      {/* The gate */}
      <El at={50} f={f} from="fade">
        <line x1={gateX} y1={120} x2={gateX} y2={y0 + 40} stroke={C.amber}
          strokeWidth={3} strokeDasharray="10 7" />
        <rect x={gateX - 88} y={128} width={176} height={40} rx={10}
          fill={C.amber} fillOpacity={0.16} stroke={C.amber} strokeWidth={1.6} />
        <text x={gateX} y={155} textAnchor="middle" fontFamily={FONT} fontSize={17}
          fontWeight={800} fill={C.amber}>GO LIVE</text>
      </El>

      {/* What you actually open on the other side */}
      <El at={66} f={f} from="right">
        <rect x={gateX + 80} y={250} width={150} height={70} rx={12}
          fill={C.bull} fillOpacity={0.2} stroke={C.bull} strokeWidth={2} />
        <text x={gateX + 155} y={294} textAnchor="middle" fontFamily={FONT} fontSize={26}
          fontWeight={800} fill={C.bull}>$100–500</text>
        <text x={gateX + 155} y={340} textAnchor="middle" fontFamily={FONT} fontSize={16}
          fontWeight={600} fill={C.ink}>micro account</text>
      </El>
      <El at={80} f={f} from="fade">
        <rect x={gateX + 260} y={190} width={190} height={190} rx={12}
          fill="none" stroke={C.bear} strokeWidth={1.6} strokeDasharray="7 6" opacity={0.55} />
        <text x={gateX + 355} y={278} textAnchor="middle" fontFamily={FONT} fontSize={17}
          fontWeight={700} fill={C.bear} opacity={0.75}>not this</text>
        <text x={gateX + 355} y={304} textAnchor="middle" fontFamily={FONT} fontSize={14}
          fill={C.muted}>big account, no record</text>
      </El>
    </>
  )
}

// ── 25. What actually happens when you place an order ───────────────────────

const PIPELINE = ['Decide', 'Place order', 'Wait for trigger', 'Fill', 'Position open']

const OrderPipeline: React.FC<ArtProps> = ({ f }) => {
  const w = 206, gap = 28
  const total = PIPELINE.length * w + (PIPELINE.length - 1) * gap
  const x0 = (AW - total) / 2
  const y = 210
  // A token runs the pipeline once the stages are up.
  const tokenT = rev(f, 62, 50)
  const tokenX = x0 + tokenT * (total - w) + w / 2

  return (
    <>
      {PIPELINE.map((st, i) => {
        const t = rev(f, 8 + i * 11, 20)
        if (t <= 0) return null
        const x = x0 + i * (w + gap)
        const reached = tokenT > 0 && tokenX >= x + w / 2 - 4
        return (
          <g key={st} opacity={t} transform={`translate(0,${(1 - t) * 24})`}>
            <rect x={x} y={y} width={w} height={96} rx={14}
              fill={reached ? C.bull : C.ink} fillOpacity={reached ? 0.18 : 0.06}
              stroke={reached ? C.bull : C.edge} strokeWidth={reached ? 2.2 : 1.4} />
            <text x={x + w / 2} y={y + 44} textAnchor="middle" fontFamily={FONT}
              fontSize={13} fontWeight={800} fill={C.muted} letterSpacing="0.1em">
              STEP {i + 1}
            </text>
            <text x={x + w / 2} y={y + 74} textAnchor="middle" fontFamily={FONT}
              fontSize={19} fontWeight={700} fill={reached ? C.bull : C.ink}>{st}</text>
            {i < PIPELINE.length - 1 && (
              <path d={`M${x + w + 5},${y + 48} l${gap - 12},0`} stroke={C.edge}
                strokeWidth={2} strokeLinecap="round" />
            )}
          </g>
        )
      })}
      {tokenT > 0 && tokenT < 1 && (
        <circle cx={tokenX} cy={y + 48} r={11} fill={C.bull} opacity={0.9} />
      )}
      <El at={96} f={f} from="below">
        <text x={AW / 2} y={412} textAnchor="middle" fontFamily={FONT} fontSize={20}
          fontWeight={700} fill={C.ink}>The order type decides what happens at step 3</text>
      </El>
    </>
  )
}

// ── 26. A market order — no waiting, no choosing ────────────────────────────

const MarketOrder: React.FC<ArtProps> = ({ f }) => {
  const candles = makeCandles(22, 'range', 61)
  const box = { left: 200, right: AW - 320, top: 150, bottom: 400 }
  const scale = makeScale(candles, box)
  const last = candles[candles.length - 1]
  const fillY = scale.y(last.c)
  const fillX = scale.x(candles.length - 1)
  const hit = rev(f, 48, 12)

  return (
    <>
      <Candles candles={candles} scale={scale} localFrame={f} delay={6} perCandle={1.5} />
      {/* The price that is simply there when you click */}
      <El at={34} f={f} from="fade">
        <line x1={box.left - 40} y1={fillY} x2={box.right + 40} y2={fillY}
          stroke={C.blue} strokeWidth={2} strokeDasharray="6 5" />
        <text x={box.right + 52} y={fillY + 6} fontFamily={MONO} fontSize={24}
          fontWeight={800} fill={C.blue}>{last.c.toFixed(2)}</text>
      </El>
      {hit > 0 && (
        <g opacity={hit}>
          <circle cx={fillX} cy={fillY} r={16 + (1 - hit) * 30} fill={C.bull}
            opacity={0.25 * hit} />
          <circle cx={fillX} cy={fillY} r={10} fill={C.bull} />
          <rect x={fillX - 74} y={fillY - 78} width={148} height={44} rx={10}
            fill={C.bull} fillOpacity={0.2} stroke={C.bull} strokeWidth={1.6} />
          <text x={fillX} y={fillY - 49} textAnchor="middle" fontFamily={FONT}
            fontSize={18} fontWeight={800} fill={C.bull}>FILLED</text>
        </g>
      )}
      <El at={64} f={f} from="below">
        <text x={AW / 2} y={470} textAnchor="middle" fontFamily={FONT} fontSize={21}
          fontWeight={700} fill={C.ink}>Instant — at whatever price is there right now</text>
      </El>
    </>
  )
}

// ── 27. The pending-order ladder ────────────────────────────────────────────
// One ladder, built up across six scenes: first the zones, then each order
// placed at its correct level with price actually running into it.

interface LadderCfg {
  title: string
  marker?: { label: string; above: boolean; color: string; breakout: boolean }
  zones: boolean
  foot: string
}

const LADDER: LadderCfg[] = [
  { title: 'Limit orders', zones: true, foot: 'Wait for a better price than the one on screen' },
  { title: 'Buy limit',  zones: false, foot: 'Buy lower — price has to come down to you',
    marker: { label: 'BUY LIMIT', above: false, color: C.bull, breakout: false } },
  { title: 'Sell limit', zones: false, foot: 'Sell higher — price has to come up to you',
    marker: { label: 'SELL LIMIT', above: true, color: C.bear, breakout: false } },
  { title: 'Stop orders', zones: true, foot: 'Only join once price proves the move' },
  { title: 'Buy stop',   zones: false, foot: 'Buy on a break upward — join the breakout',
    marker: { label: 'BUY STOP', above: true, color: C.bull, breakout: true } },
  { title: 'Sell stop',  zones: false, foot: 'Sell on a break downward — join the breakdown',
    marker: { label: 'SELL STOP', above: false, color: C.bear, breakout: true } },
]

const OrderLadder: React.FC<ArtProps> = ({ f, variant }) => {
  const cfg = LADDER[Math.min(Math.max(variant, 0), LADDER.length - 1)]
  const midY = 280
  const x0 = 200, x1 = AW - 240
  const mk = cfg.marker
  const lvlY = mk ? (mk.above ? midY - 110 : midY + 110) : midY

  // Price runs from the left and reaches the level.
  const t = rev(f, 40, 44)
  const startY = mk ? (mk.breakout ? (mk.above ? midY + 40 : midY - 40) : midY) : midY
  const pathX = x0 + t * (x1 - x0 - 60)
  const pathY = startY + (lvlY - startY) * Math.min(t * 1.25, 1)
  const filled = t > 0.82

  return (
    <>
      {/* Current price */}
      <El at={4} f={f} from="fade">
        <line x1={x0 - 50} y1={midY} x2={x1 + 60} y2={midY} stroke={C.ink}
          strokeWidth={2.4} />
        <text x={x0 - 62} y={midY + 6} textAnchor="end" fontFamily={FONT} fontSize={15}
          fontWeight={800} fill={C.ink}>PRICE NOW</text>
      </El>

      {cfg.zones && (
        <El at={14} f={f} from="fade">
          <rect x={x0 - 50} y={midY - 128} width={x1 - x0 + 110} height={118} rx={10}
            fill={variant === 0 ? C.bear : C.bull} fillOpacity={0.08}
            stroke={variant === 0 ? C.bear : C.bull} strokeWidth={1.4} strokeDasharray="6 5" />
          <text x={x0 - 34} y={midY - 100} fontFamily={FONT} fontSize={15} fontWeight={700}
            fill={variant === 0 ? C.bear : C.bull}>
            {variant === 0 ? 'sell limit — above price' : 'buy stop — above price'}
          </text>
          <rect x={x0 - 50} y={midY + 10} width={x1 - x0 + 110} height={118} rx={10}
            fill={variant === 0 ? C.bull : C.bear} fillOpacity={0.08}
            stroke={variant === 0 ? C.bull : C.bear} strokeWidth={1.4} strokeDasharray="6 5" />
          <text x={x0 - 34} y={midY + 112} fontFamily={FONT} fontSize={15} fontWeight={700}
            fill={variant === 0 ? C.bull : C.bear}>
            {variant === 0 ? 'buy limit — below price' : 'sell stop — below price'}
          </text>
        </El>
      )}

      {mk && (
        <>
          <El at={18} f={f} from="right">
            <line x1={x0 - 50} y1={lvlY} x2={x1 + 60} y2={lvlY} stroke={mk.color}
              strokeWidth={2.2} strokeDasharray="8 6" />
            <rect x={x1 + 66} y={lvlY - 21} width={158} height={42} rx={10}
              fill={mk.color} fillOpacity={0.18} stroke={mk.color} strokeWidth={1.8} />
            <text x={x1 + 145} y={lvlY + 7} textAnchor="middle" fontFamily={FONT}
              fontSize={16} fontWeight={800} fill={mk.color}>{mk.label}</text>
          </El>
          {/* Price arriving at the level */}
          <path d={`M${x0},${startY} L${pathX},${pathY}`} stroke={mk.color}
            strokeWidth={4} strokeLinecap="round" opacity={0.9} />
          {filled && (
            <g opacity={rev(f, 78, 12)}>
              <circle cx={pathX} cy={lvlY} r={13} fill={mk.color} />
              <circle cx={pathX} cy={lvlY} r={26 + bob(f, 0.16, 4)} fill="none"
                stroke={mk.color} strokeWidth={2} opacity={0.5} />
              <text x={pathX} y={lvlY + (mk.above ? -38 : 46)} textAnchor="middle"
                fontFamily={FONT} fontSize={17} fontWeight={800} fill={mk.color}>
                TRIGGERED
              </text>
            </g>
          )}
        </>
      )}

      <El at={84} f={f} from="below">
        <text x={AW / 2} y={AH - 24} textAnchor="middle" fontFamily={FONT} fontSize={20}
          fontWeight={700} fill={C.ink}>{cfg.foot}</text>
      </El>
    </>
  )
}

// ── 28. Managing a position you already hold ────────────────────────────────

const PositionExits: React.FC<ArtProps> = ({ f, variant }) => {
  const loss = variant === 0
  const entryY = 280, tpY = 160, slY = 400
  const x0 = 200, x1 = AW - 260
  const t = rev(f, 44, 46)
  const targetY = loss ? slY : tpY
  const px = x0 + t * (x1 - x0)
  const wobble = Math.sin(t * 9) * 26 * (1 - t)
  const py = entryY + (targetY - entryY) * t + wobble

  return (
    <>
      <El at={4} f={f} from="fade">
        <rect x={x0 - 50} y={tpY} width={x1 - x0 + 120} height={entryY - tpY} rx={8}
          fill={C.bull} fillOpacity={0.07} />
        <rect x={x0 - 50} y={entryY} width={x1 - x0 + 120} height={slY - entryY} rx={8}
          fill={C.bear} fillOpacity={0.07} />
      </El>
      <El at={8} f={f} from="left">
        <line x1={x0 - 50} y1={entryY} x2={x1 + 70} y2={entryY} stroke={C.ink} strokeWidth={2.4} />
        <text x={x0 - 62} y={entryY + 6} textAnchor="end" fontFamily={FONT} fontSize={15}
          fontWeight={800} fill={C.ink}>ENTRY</text>
      </El>
      <El at={18} f={f} from="right">
        <line x1={x0 - 50} y1={tpY} x2={x1 + 70} y2={tpY} stroke={C.bull}
          strokeWidth={2.2} strokeDasharray="8 6" />
        <text x={x1 + 82} y={tpY + 6} fontFamily={FONT} fontSize={17} fontWeight={800}
          fill={C.bull}>TAKE PROFIT</text>
      </El>
      <El at={28} f={f} from="right">
        <line x1={x0 - 50} y1={slY} x2={x1 + 70} y2={slY} stroke={C.bear}
          strokeWidth={2.2} strokeDasharray="8 6" />
        <text x={x1 + 82} y={slY + 6} fontFamily={FONT} fontSize={17} fontWeight={800}
          fill={C.bear}>STOP LOSS</text>
      </El>

      <path d={`M${x0},${entryY} L${px},${py}`} stroke={loss ? C.bear : C.bull}
        strokeWidth={4} strokeLinecap="round" />
      {t > 0.92 && (
        <g opacity={rev(f, 86, 12)}>
          <circle cx={px} cy={targetY} r={13} fill={loss ? C.bear : C.bull} />
          <text x={px - 20} y={targetY + (loss ? 44 : -30)} textAnchor="end" fontFamily={FONT}
            fontSize={18} fontWeight={800} fill={loss ? C.bear : C.bull}>
            {loss ? 'CLOSED — loss capped' : 'CLOSED — profit taken'}
          </text>
        </g>
      )}
      <El at={96} f={f} from="below">
        <text x={AW / 2} y={AH - 18} textAnchor="middle" fontFamily={FONT} fontSize={20}
          fontWeight={700} fill={C.ink}>
          {loss ? 'It closes for you, whether you are watching or not'
                : 'It banks the win without you having to decide in the moment'}
        </text>
      </El>
    </>
  )
}

// ── 29. OCO — one fires, the other dies ─────────────────────────────────────

const OcoPair: React.FC<ArtProps> = ({ f }) => {
  const midY = 280, upY = 168, dnY = 392
  const x0 = 220, x1 = AW - 300
  const t = rev(f, 46, 40)
  const px = x0 + t * (x1 - x0)
  const py = midY + (upY - midY) * Math.max((t - 0.35) / 0.65, 0)
  const fired = t > 0.9

  const order = (y: number, label: string, color: string, dead: boolean, at: number) => (
    <El at={at} f={f} from="right">
      <line x1={x0 - 60} y1={y} x2={x1 + 40} y2={y} stroke={color} strokeWidth={2.2}
        strokeDasharray="8 6" opacity={dead ? 0.35 : 1} />
      <rect x={x1 + 52} y={y - 21} width={196} height={42} rx={10}
        fill={color} fillOpacity={dead ? 0.06 : 0.18}
        stroke={color} strokeWidth={1.8} strokeOpacity={dead ? 0.4 : 1} />
      <text x={x1 + 150} y={y + 7} textAnchor="middle" fontFamily={FONT} fontSize={16}
        fontWeight={800} fill={color} opacity={dead ? 0.5 : 1}>{label}</text>
      {dead && (
        <line x1={x1 + 60} y1={y} x2={x1 + 240} y2={y} stroke={C.bear} strokeWidth={2.6}
          strokeLinecap="round" />
      )}
    </El>
  )

  return (
    <>
      <El at={4} f={f} from="fade">
        <line x1={x0 - 60} y1={midY} x2={x1 + 40} y2={midY} stroke={C.ink}
          strokeWidth={2} opacity={0.6} strokeDasharray="4 6" />
        <rect x={x0 - 60} y={upY} width={x1 - x0 + 100} height={dnY - upY} rx={10}
          fill={C.muted} fillOpacity={0.05} stroke={C.edge} strokeWidth={1.2} />
        <text x={x0 - 48} y={midY - 10} fontFamily={FONT} fontSize={14} fill={C.muted}
          letterSpacing="0.1em">RANGE</text>
      </El>

      {order(upY, 'BUY STOP', C.bull, false, 14)}
      {order(dnY, 'SELL STOP', C.bear, fired, 24)}

      <path d={`M${x0},${midY} L${px},${py}`} stroke={C.bull} strokeWidth={4}
        strokeLinecap="round" />
      {fired && (
        <g opacity={rev(f, 88, 12)}>
          <circle cx={px} cy={upY} r={13} fill={C.bull} />
          <text x={px} y={upY - 32} textAnchor="middle" fontFamily={FONT} fontSize={17}
            fontWeight={800} fill={C.bull}>FILLED</text>
          <text x={x1 + 150} y={dnY + 46} textAnchor="middle" fontFamily={FONT}
            fontSize={16} fontWeight={800} fill={C.bear}>CANCELLED</text>
        </g>
      )}
      <El at={100} f={f} from="below">
        <text x={AW / 2} y={AH - 16} textAnchor="middle" fontFamily={FONT} fontSize={20}
          fontWeight={700} fill={C.ink}>Cover both directions — only one can survive</text>
      </El>
    </>
  )
}

// ── Registry ────────────────────────────────────────────────────────────────

export const SCENE_ART: Record<string, React.FC<ArtProps>> = {
  'currency-swap':     CurrencySwap,
  'decentralised':     Decentralised,
  'participant-tiers': ParticipantTiers,
  'otc-vs-exchange':   OtcVsExchange,
  'liquidity-depth':   LiquidityDepth,
  'volatility-compare': VolatilityCompare,
  'session-ring':       SessionRing,
  'sun-terminator':     SunTerminator,
  'session-overlap':    SessionOverlap,
  'trading-week':       TradingWeek,
  'three-pillars':      ThreePillars,
  'pip-digits':         PipDigits,
  'lot-ladder':         LotLadder,
  'pip-math':           PipMath,
  'broker-gateway':     BrokerGateway,
  'regulator-badges':   RegulatorBadges,
  'cost-compare':       CostCompare,
  'platform-window':    PlatformWindow,
  'execution-speed':    ExecutionSpeed,
  'red-flags':          RedFlags,
  'demo-fork':          DemoFork,
  'account-map':        AccountMap,
  'skill-gauges':       SkillGauges,
  'go-live-gate':       GoLiveGate,
  'order-pipeline':     OrderPipeline,
  'market-order':       MarketOrder,
  'order-ladder':       OrderLadder,
  'position-exits':     PositionExits,
  'oco-pair':           OcoPair,
}
