'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

const RemotionPlayer = dynamic(
  () => import('@remotion/player').then(m => m.Player),
  { ssr: false }
)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SignalItem {
  slug:       string
  display:    string
  category:   string
  decision:   string
  confidence: number
  confluence: number
  sentAt:     string
}

interface CompositionProps {
  signals:    SignalItem[]
  onNavigate: (slug: string) => void
}

interface CardLayout {
  left:   number
  top:    number
  width:  number
  height: number
}

// ─── Desktop constants ────────────────────────────────────────────────────────

const D_COMP_W   = 1200
const D_COMP_H   = 230
const D_CARD_W   = 210
const D_CARD_H   = 168
const D_CARD_GAP = 14
const D_CARD_TOP = 45

// ─── Mobile constants (2-column grid, portrait-friendly) ──────────────────────

const M_COMP_W   = 400
const M_COMP_H   = 550
const M_CARD_W   = 183
const M_CARD_H   = 155
const M_CARD_GAP = 12
const M_CARD_TOP = 46

const FPS      = 30
const DURATION = 1050  // 35s × 30fps

const CAT_STYLE: Record<string, { border: string; glow: string; bg: string; text: string }> = {
  forex:     { border: '#3b82f6', glow: '#3b82f644', bg: '#3b82f618', text: '#93c5fd' },
  commodity: { border: '#f59e0b', glow: '#f59e0b44', bg: '#f59e0b18', text: '#fcd34d' },
  crypto:    { border: '#a855f7', glow: '#a855f744', bg: '#a855f718', text: '#d8b4fe' },
  indices:   { border: '#06b6d4', glow: '#06b6d444', bg: '#06b6d418', text: '#67e8f9' },
  stocks:    { border: '#ec4899', glow: '#ec489944', bg: '#ec489918', text: '#f9a8d4' },
}

// ─── Shared signal card (position + size injected by composition) ─────────────

function SignalCard({
  signal, index, layout, fontSize, onNavigate,
}: {
  signal:     SignalItem
  index:      number
  layout:     CardLayout
  fontSize:   'sm' | 'md'
  onNavigate: (slug: string) => void
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const isBuy    = signal.decision === 'BUY'
  const dirColor = isBuy ? '#10b981' : '#ef4444'
  const dirGlow  = isBuy ? '#10b98155' : '#ef444455'
  const cat      = CAT_STYLE[signal.category] ?? CAT_STYLE['forex']

  const enterAt  = 18 + index * 12
  const ef       = Math.max(0, frame - enterAt)
  const entrance = spring({ frame: ef, fps, config: { damping: 14, stiffness: 140, mass: 0.7 } })
  const opacity  = interpolate(entrance, [0, 0.2], [0, 1], { extrapolateRight: 'clamp' })
  const ty       = interpolate(entrance, [0, 1], [28, 0])
  const scale    = interpolate(entrance, [0, 1], [0.82, 1])

  const bf        = Math.max(0, frame - (enterAt + 6))
  const barSpring = spring({ frame: bf, fps, config: { damping: 22, stiffness: 55, mass: 1 } })
  const confW     = interpolate(barSpring, [0, 1], [0, signal.confidence], { extrapolateRight: 'clamp' })
  const confluW   = interpolate(barSpring, [0, 1], [0, signal.confluence], { extrapolateRight: 'clamp' })

  const settled  = frame > enterAt + 25
  const pulse    = settled ? (Math.sin(frame * 0.055 + index * 1.3) * 0.45 + 0.55) : 0
  const floatY   = settled ? Math.sin(frame * 0.038 + index * 0.9) * (fontSize === 'sm' ? 1.8 : 2.5) : 0

  const glowBlur   = 18 * pulse
  const borderGlow = `0 0 ${glowBlur}px ${dirGlow}, 0 0 ${glowBlur * 2}px ${dirGlow}`

  const fs = fontSize === 'sm'
    ? { cat: 8, dir: 9.5, name: 20, barLabel: 7.5, barVal: 8.5, hint: 7.5 }
    : { cat: 8.5, dir: 10, name: 22, barLabel: 8, barVal: 9, hint: 8 }

  return (
    <div
      onClick={() => onNavigate(signal.slug)}
      style={{
        position:      'absolute',
        left:          layout.left,
        top:           layout.top + floatY,
        width:         layout.width,
        height:        layout.height,
        opacity,
        transform:     `translateY(${ty}px) scale(${scale})`,
        background:    'linear-gradient(145deg, #131722 60%, #0d1220)',
        border:        `1.5px solid ${dirColor}`,
        borderRadius:  16,
        padding:       13,
        boxShadow:     borderGlow,
        cursor:        'pointer',
        display:       'flex',
        flexDirection: 'column',
        gap:           8,
        transition:    'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: fs.cat, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase',
          padding: '2px 7px', borderRadius: 99,
          background: cat.bg, color: cat.text, border: `1px solid ${cat.border}55`,
        }}>
          {signal.category === 'commodity' ? 'COMMOD.' : signal.category.toUpperCase()}
        </span>
        <span style={{
          fontSize: fs.dir, fontWeight: 900, padding: '2px 9px', borderRadius: 6,
          background: isBuy ? '#10b98120' : '#ef444420',
          color: dirColor, boxShadow: `0 0 8px ${dirGlow}`, letterSpacing: 0.3,
        }}>
          {isBuy ? '▲' : '▼'} {signal.decision}
        </span>
      </div>

      <div style={{
        fontSize: fs.name, fontWeight: 900, color: '#ffffff',
        letterSpacing: -0.8, lineHeight: 1,
        textShadow: `0 0 20px ${dirGlow}`,
      }}>
        {signal.display}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: fs.barLabel, color: '#6b7280', fontWeight: 600, letterSpacing: 0.5 }}>CONFIDENCE</span>
          <span style={{ fontSize: fs.barVal, color: '#e5e7eb', fontWeight: 800 }}>{Math.round(confW)}%</span>
        </div>
        <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${confW}%`,
            background: `linear-gradient(90deg, ${dirColor}88, ${dirColor})`,
            borderRadius: 3, boxShadow: `0 0 8px ${dirColor}`,
          }} />
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: fs.barLabel, color: '#6b7280', fontWeight: 600, letterSpacing: 0.5 }}>CONFLUENCE</span>
          <span style={{ fontSize: fs.barVal, color: '#e5e7eb', fontWeight: 800 }}>{Math.round(confluW)}%</span>
        </div>
        <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${confluW}%`,
            background: 'linear-gradient(90deg, #3b82f688, #60a5fa)',
            borderRadius: 3, boxShadow: '0 0 8px #3b82f6',
          }} />
        </div>
      </div>

      <div style={{ fontSize: fs.hint, color: '#374151', fontWeight: 600, letterSpacing: 0.4, textAlign: 'right', marginTop: 'auto' }}>
        TAP TO ANALYSE →
      </div>
    </div>
  )
}

// ─── Shared background / header layer ────────────────────────────────────────

function CompositionBase({
  compW, compH, headerSubtitle,
}: {
  compW: number; compH: number; headerSubtitle: string
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const gridSpring  = spring({ frame, fps, config: { damping: 22, stiffness: 60 } })
  const gridOpacity = interpolate(gridSpring, [0, 1], [0, 0.055], { extrapolateRight: 'clamp' })

  const headerSp = spring({ frame, fps, config: { damping: 18, stiffness: 130 } })
  const headerOp = interpolate(headerSp, [0, 0.25], [0, 1], { extrapolateRight: 'clamp' })
  const headerX  = interpolate(headerSp, [0, 1], [-16, 0])

  const scanX  = interpolate(frame, [0, 22], [-4, compW + 4], { extrapolateRight: 'clamp' })
  const scanOp = interpolate(frame, [0, 4, 18, 22], [0, 1, 1, 0], { extrapolateRight: 'clamp' })

  const accentPulse = Math.sin(frame * 0.04) * 0.35 + 0.65

  const vLines = Math.ceil(compW / 100)
  const hLines = Math.ceil(compH / 57)

  return (
    <>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: gridOpacity }} aria-hidden>
        {Array.from({ length: vLines }).map((_, i) => (
          <line key={`v${i}`} x1={i * 100} y1={0} x2={i * 100} y2={compH} stroke="#4ade80" strokeWidth={0.4} />
        ))}
        {Array.from({ length: hLines }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 57} x2={compW} y2={i * 57} stroke="#4ade80" strokeWidth={0.4} />
        ))}
      </svg>

      {/* Corner accents */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: 60, height: 3, background: 'linear-gradient(90deg, #10b981, transparent)', opacity: accentPulse }} />
      <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: 40, background: 'linear-gradient(180deg, #10b981, transparent)', opacity: accentPulse }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: 60, height: 3, background: 'linear-gradient(270deg, #10b981, transparent)', opacity: accentPulse }} />
      <div style={{ position: 'absolute', top: 0, right: 0, width: 3, height: 40, background: 'linear-gradient(180deg, #10b981, transparent)', opacity: accentPulse }} />

      {/* Scan line */}
      <div style={{
        position: 'absolute', top: 0, left: scanX, width: 3, height: '100%',
        background: 'linear-gradient(180deg, transparent 0%, #10b981 40%, #10b981 60%, transparent 100%)',
        opacity: scanOp, boxShadow: '0 0 16px #10b981, 0 0 40px #10b98133',
      }} />

      {/* Header */}
      <div style={{
        position: 'absolute', top: 13, left: 28,
        opacity: headerOp, transform: `translateX(${headerX}px)`,
        display: 'flex', alignItems: 'center', gap: 9,
      }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 2px #10b98133, 0 0 12px #10b981' }} />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.5, color: '#10b981', textTransform: 'uppercase' }}>
          Signals to Watch
        </span>
        <span style={{ fontSize: 9, color: '#374151', fontWeight: 600, letterSpacing: 0.4, marginLeft: 2 }}>
          {headerSubtitle}
        </span>
      </div>

      <div style={{
        position: 'absolute', top: 13, right: 28,
        opacity: headerOp,
        fontSize: 9, color: '#1f2937', fontWeight: 600, letterSpacing: 0.8,
      }}>
        LIVE SCAN · AUTO REFRESH
      </div>
    </>
  )
}

// ─── Desktop composition — horizontal strip ───────────────────────────────────

function DesktopComposition({ signals, onNavigate }: CompositionProps) {
  return (
    <AbsoluteFill style={{ background: '#080e1a', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden' }}>
      <CompositionBase compW={D_COMP_W} compH={D_COMP_H} headerSubtitle="CONFIDENCE 50%+ · CONFLUENCE 45%+" />
      {signals.map((sig, i) => {
        const totalW = signals.length * D_CARD_W + (signals.length - 1) * D_CARD_GAP
        const offsetX = (D_COMP_W - totalW) / 2
        const layout: CardLayout = {
          left:   offsetX + i * (D_CARD_W + D_CARD_GAP),
          top:    D_CARD_TOP,
          width:  D_CARD_W,
          height: D_CARD_H,
        }
        return <SignalCard key={sig.slug} signal={sig} index={i} layout={layout} fontSize="md" onNavigate={onNavigate} />
      })}
    </AbsoluteFill>
  )
}

// ─── Mobile composition — 2-column grid ──────────────────────────────────────

function MobileComposition({ signals, onNavigate }: CompositionProps) {
  return (
    <AbsoluteFill style={{ background: '#080e1a', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden' }}>
      <CompositionBase compW={M_COMP_W} compH={M_COMP_H} headerSubtitle="50%+ conf · 45%+ confl" />
      {signals.map((sig, i) => {
        const col = i % 2
        const row = Math.floor(i / 2)

        // Last card of an odd-count set → center it
        const isLastSingle = signals.length % 2 === 1 && i === signals.length - 1
        const cardsInRow   = isLastSingle ? 1 : 2
        const rowWidth     = cardsInRow * M_CARD_W + (cardsInRow - 1) * M_CARD_GAP
        const rowOffsetX   = (M_COMP_W - rowWidth) / 2

        const layout: CardLayout = {
          left:   isLastSingle ? rowOffsetX : rowOffsetX + col * (M_CARD_W + M_CARD_GAP),
          top:    M_CARD_TOP + row * (M_CARD_H + M_CARD_GAP),
          width:  M_CARD_W,
          height: M_CARD_H,
        }
        return <SignalCard key={sig.slug} signal={sig} index={i} layout={layout} fontSize="sm" onNavigate={onNavigate} />
      })}
    </AbsoluteFill>
  )
}

// ─── Public wrapper ───────────────────────────────────────────────────────────

export default function SignalsRemotionPlayer({ signals }: { signals: SignalItem[] }) {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (signals.length === 0) return null

  const onNavigate = (slug: string) => router.push(`/analysis/${slug}?fmtrader=1`)

  const compW = isMobile ? M_COMP_W : D_COMP_W
  const compH = isMobile ? M_COMP_H : D_COMP_H
  const Composition = isMobile ? MobileComposition : DesktopComposition

  return (
    <div style={{ width: '100%', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
      <RemotionPlayer
        component={Composition as unknown as React.ComponentType<Record<string, unknown>>}
        inputProps={{ signals, onNavigate }}
        durationInFrames={DURATION}
        compositionWidth={compW}
        compositionHeight={compH}
        fps={FPS}
        style={{ width: '100%' }}
        autoPlay
        loop
        controls={false}
        clickToPlay={false}
      />
    </div>
  )
}
