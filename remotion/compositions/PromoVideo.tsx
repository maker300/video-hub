// Forex Mastery promotional video composition — used by the Video Studio.
// Scene-driven: each scene type has its own animated layout.
// Design: deep dark bg + green brand palette + trading chart aesthetic.
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
  Sequence,
} from 'remotion'

// ── Brand tokens ────────────────────────────────────────────────────────────
const DARK     = '#070d1a'
const DARK2    = '#0d1526'
const GREEN    = '#059669'
const GREEN_L  = '#10b981'
const GREEN_XL = '#34d399'
const GOLD     = '#f59e0b'
const WHITE    = '#ffffff'
const MUTED    = '#64748b'
const FONT     = "Inter, 'Helvetica Neue', Arial, sans-serif"
const FPS      = 30

// ── Types ───────────────────────────────────────────────────────────────────

export type SceneType =
  | 'hook' | 'problem' | 'solution' | 'stat' | 'feature' | 'cta'
  | 'typewriter' | 'reveal' | 'quote' | 'announcement'
  | 'bullet' | 'question' | 'glitch' | 'split' | 'countdown' | 'testimonial'

export type ObjectShape =
  | 'circle' | 'rect' | 'line' | 'triangle' | 'pentagon'
  | 'star' | 'arrow' | 'hexagon' | 'diamond' | 'ring' | 'text'

export type EntranceAnim =
  | 'none' | 'fade' | 'slideLeft' | 'slideRight' | 'slideUp'
  | 'slideDown' | 'scaleIn' | 'spinIn' | 'bounceIn'

export type MotionAnim = 'none' | 'float' | 'pulse' | 'spin' | 'shake' | 'breathe'

export type ExitAnim = 'none' | 'fade' | 'slideLeft' | 'slideRight' | 'scaleOut'

export interface VideoObject {
  id:              string
  shape:           ObjectShape
  x:               number   // % from left, center-anchored
  y:               number   // % from top, center-anchored
  w:               number   // % of video width
  h:               number   // % of video height
  rotation:        number   // degrees
  fill:            string
  stroke:          string
  strokeWidth:     number
  opacity:         number   // 0–1
  entrance:        EntranceAnim
  entranceDelay:   number   // frames
  entranceDuration:number   // frames
  motion:          MotionAnim
  motionSpeed:     number
  exit:            ExitAnim
  exitDelay:       number   // frames from scene end
  // text-only fields
  text?:           string
  fontSize?:       number
  fontWeight?:     number
}

export interface PromoScene {
  id:           string
  type:         SceneType
  headline:     string
  subtext?:     string
  value?:       string   // stat / split: "78%", "$4.2T"
  label?:       string   // stat label / testimonial attribution
  sectionTitle?: string  // overrides the small header label shown above headline
  duration:     number   // seconds
  opacity?:     number   // 0–1, default 1
  objects?:     VideoObject[]
}

export interface MediaFile {
  id:   string
  url:  string
  type: 'image' | 'video' | 'audio'
  name: string
}

export type ClipType = 'scene' | 'image' | 'video' | 'shape' | 'audio'

export interface TimelineClip {
  id:             string
  track:          'main' | 'overlay' | 'audio'
  startFrame:     number
  durationFrames: number
  clipType:       ClipType
  scene?:         PromoScene
  media?:         MediaFile
  shape?:         VideoObject
}

export interface PromoVideoProps {
  clips:        TimelineClip[]
  title:        string
  aspectRatio?: '16:9' | '9:16'
}

// ── Background ───────────────────────────────────────────────────────────────

function Background() {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const gridSize = 70

  const gridOpacity = interpolate(
    Math.sin(frame / 120),
    [-1, 1],
    [0.04, 0.09],
  )

  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${DARK} 0%, ${DARK2} 100%)` }}>
      <svg
        width={width}
        height={height}
        style={{ position: 'absolute', inset: 0, opacity: gridOpacity }}
      >
        <defs>
          <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
              fill="none"
              stroke={GREEN}
              strokeWidth="0.8"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <div style={{
        position: 'absolute', top: -200, left: -200,
        width: 600, height: 600, borderRadius: '50%',
        background: `radial-gradient(circle, ${GREEN}22 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -200, right: -200,
        width: 500, height: 500, borderRadius: '50%',
        background: `radial-gradient(circle, ${GOLD}11 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
    </AbsoluteFill>
  )
}

// ── Shared accent elements ───────────────────────────────────────────────────

function AccentBar({ delay = 0 }: { delay?: number }) {
  const frame = useCurrentFrame()
  const { height } = useVideoConfig()
  const barH = spring({ frame: frame - delay, fps: FPS, from: 0, to: height * 0.6, config: { damping: 16, stiffness: 70 } })
  return (
    <div style={{
      position: 'absolute', left: 52, top: '50%', transform: 'translateY(-50%)',
      width: 4, height: barH,
      background: `linear-gradient(to bottom, ${GREEN_XL}, ${GREEN}, ${GREEN}44)`,
      borderRadius: 4,
    }} />
  )
}

function AccentRule({ delay = 0 }: { delay?: number }) {
  const frame = useCurrentFrame()
  const { width } = useVideoConfig()
  void spring({ frame: frame - delay, fps: FPS, from: 0, to: Math.min(width * 0.55, 700), config: { damping: 18, stiffness: 60 } })
  return (
    <div style={{
      width, height: 3,
      background: `linear-gradient(to right, ${GREEN_XL}, ${GREEN}55, transparent)`,
      marginBottom: 24,
    }} />
  )
}

function SectionLabel({ text, opacity = 1 }: { text: string; opacity?: number }) {
  return (
    <div style={{
      fontSize: 15, fontWeight: 700, color: GREEN_L,
      letterSpacing: 2.5, fontFamily: FONT,
      textTransform: 'uppercase' as const,
      marginBottom: 20, opacity,
    }}>
      {text}
    </div>
  )
}

// ── Object system ────────────────────────────────────────────────────────────

function renderShape(shape: ObjectShape, fill: string, stroke: string, sw: number): React.ReactNode {
  const props = { fill, stroke, strokeWidth: sw }
  switch (shape) {
    case 'circle':   return <circle cx="50" cy="50" r="47" {...props} />
    case 'rect':     return <rect x="3" y="3" width="94" height="94" {...props} />
    case 'line':     return <line x1="5" y1="50" x2="95" y2="50" stroke={stroke} strokeWidth={sw * 2 + 4} strokeLinecap="round" fill="none" />
    case 'triangle': return <polygon points="50,4 96,93 4,93" {...props} />
    case 'pentagon': return <polygon points="50,3 94.69,35.47 77.63,88.04 22.37,88.04 5.31,35.47" {...props} />
    case 'star':     return <polygon points="50,3 61.76,33.82 94.69,35.47 69.02,56.18 77.63,88.04 50,70 22.37,88.04 30.98,56.18 5.31,35.47 38.24,33.82" {...props} />
    case 'hexagon':  return <polygon points="97,50 73.5,90.7 26.5,90.7 3,50 26.5,9.3 73.5,9.3" {...props} />
    case 'diamond':  return <polygon points="50,3 97,50 50,97 3,50" {...props} />
    case 'ring':     return <circle cx="50" cy="50" r="42" fill="none" stroke={stroke} strokeWidth={sw * 3 + 6} />
    case 'arrow':    return <path d="M 5,33 L 55,33 L 55,13 L 95,50 L 55,87 L 55,67 L 5,67 Z" {...props} />
    default:         return <circle cx="50" cy="50" r="47" {...props} />
  }
}

function ObjectRenderer({ obj, sceneDuration }: { obj: VideoObject; sceneDuration: number }) {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()

  const entStart = obj.entranceDelay
  const entEnd   = obj.entranceDelay + Math.max(obj.entranceDuration, 1)
  const entRaw   = interpolate(frame, [entStart, entEnd], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const entSp    = spring({ frame: Math.max(frame - entStart, 0), fps: FPS, from: 0, to: 1, config: { damping: 16, stiffness: 80 } })
  const entBnc   = spring({ frame: Math.max(frame - entStart, 0), fps: FPS, from: 0, to: 1, config: { damping: 8,  stiffness: 130 } })

  const exitStart = Math.max(0, sceneDuration - obj.exitDelay - 18)
  const exitRaw   = obj.exit !== 'none'
    ? interpolate(frame, [exitStart, exitStart + 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0

  const t = frame * Math.max(obj.motionSpeed, 0.1)

  let opacity = obj.opacity
  let tx = 0, ty = 0, rot = obj.rotation, sc = 1

  // Entrance
  if (frame < entStart) { opacity = 0 }
  else {
    switch (obj.entrance) {
      case 'fade':       opacity  *= entRaw; break
      case 'slideLeft':  tx = interpolate(entRaw, [0, 1], [-120, 0]); opacity *= Math.min(entRaw * 3, 1); break
      case 'slideRight': tx = interpolate(entRaw, [0, 1], [120, 0]);  opacity *= Math.min(entRaw * 3, 1); break
      case 'slideUp':    ty = interpolate(entRaw, [0, 1], [-120, 0]); opacity *= Math.min(entRaw * 3, 1); break
      case 'slideDown':  ty = interpolate(entRaw, [0, 1], [120, 0]);  opacity *= Math.min(entRaw * 3, 1); break
      case 'scaleIn':    sc = entSp; break
      case 'spinIn':     rot += interpolate(entRaw, [0, 1], [360, 0]); sc = entSp; break
      case 'bounceIn':   sc = entBnc; break
    }
  }

  // Continuous motion (once entrance is done)
  if (frame >= entEnd) {
    switch (obj.motion) {
      case 'float':   ty  += Math.sin(t / 40) * 10; break
      case 'pulse':   sc  *= 0.94 + Math.sin(t / 28) * 0.06; break
      case 'spin':    rot += frame * obj.motionSpeed * 2; break
      case 'shake':   tx  += Math.sin(t * 1.8) * 5; break
      case 'breathe': sc  *= 0.88 + Math.sin(t / 50) * 0.12; break
    }
  }

  // Exit
  if (obj.exit !== 'none' && frame >= exitStart) {
    switch (obj.exit) {
      case 'fade':       opacity *= 1 - exitRaw; break
      case 'slideLeft':  tx -= exitRaw * 140; opacity *= 1 - exitRaw * 0.6; break
      case 'slideRight': tx += exitRaw * 140; opacity *= 1 - exitRaw * 0.6; break
      case 'scaleOut':   sc *= Math.max(0, 1 - exitRaw); break
    }
  }

  const pxW = width  * obj.w / 100
  const pxH = height * obj.h / 100

  const commonStyle: React.CSSProperties = {
    position: 'absolute',
    left:     `${obj.x}%`,
    top:      `${obj.y}%`,
    width:    pxW,
    height:   pxH,
    transform: `translate(-50%,-50%) translate(${tx}px,${ty}px) rotate(${rot}deg) scale(${sc})`,
    opacity,
    pointerEvents: 'none',
    zIndex: 10,
  }

  if (obj.shape === 'text') {
    return (
      <div style={{
        ...commonStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: obj.fill,
        fontSize: obj.fontSize ?? 80,
        fontWeight: obj.fontWeight ?? 700,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        lineHeight: 1.2,
        WebkitTextStroke: obj.strokeWidth > 0 ? `${obj.strokeWidth}px ${obj.stroke}` : undefined,
        wordBreak: 'break-word',
        overflow: 'hidden',
      }}>
        {obj.text ?? 'Text'}
      </div>
    )
  }

  return (
    <div style={commonStyle}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" overflow="visible">
        {renderShape(obj.shape, obj.fill, obj.stroke, obj.strokeWidth)}
      </svg>
    </div>
  )
}

// ── Scene transition: fade in/out ────────────────────────────────────────────

function SceneShell({ children, totalFrames }: { children: React.ReactNode; totalFrames: number }) {
  const frame = useCurrentFrame()
  const fadeIn  = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' })
  const fadeOut = interpolate(frame, [totalFrames - 12, totalFrames], [1, 0], { extrapolateLeft: 'clamp' })
  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>
      {children}
    </AbsoluteFill>
  )
}

// ── ORIGINAL SCENES ──────────────────────────────────────────────────────────

function HookScene({ scene, totalFrames }: { scene: PromoScene; totalFrames: number }) {
  const frame = useCurrentFrame()
  const { width } = useVideoConfig()
  const isPortrait = width < 900
  const headY = spring({ frame, fps: FPS, from: 80, to: 0, config: { damping: 18, stiffness: 90 } })
  const headO = interpolate(frame, [0, 14], [0, 1])
  const subO  = interpolate(frame, [18, 34], [0, 1], { extrapolateRight: 'clamp' })
  const subY  = spring({ frame: Math.max(frame - 18, 0), fps: FPS, from: 30, to: 0, config: { damping: 20, stiffness: 80 } })
  return (
    <SceneShell totalFrames={totalFrames}>
      <Background />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: isPortrait ? 40 : 92, paddingRight: isPortrait ? 40 : 92 }}>
        <AccentBar delay={4} />
        <AccentRule delay={2} />
        <h1 style={{ color: WHITE, fontSize: isPortrait ? 52 : 76, fontWeight: 900, letterSpacing: -2, lineHeight: 1.08, margin: 0, transform: `translateY(${headY}px)`, opacity: headO, maxWidth: 900, fontFamily: FONT, textShadow: `0 0 60px ${GREEN}44` }}>
          {scene.headline}
        </h1>
        {scene.subtext && (
          <p style={{ color: GREEN_L, fontSize: isPortrait ? 22 : 30, fontWeight: 500, marginTop: 28, opacity: subO, transform: `translateY(${subY}px)`, fontFamily: FONT, maxWidth: 700 }}>
            {scene.subtext}
          </p>
        )}
        <div style={{ position: 'absolute', bottom: 40, right: 60, fontSize: 13, color: GREEN + '88', fontFamily: FONT, fontWeight: 600, letterSpacing: 1 }}>
          FM TRADER
        </div>
      </AbsoluteFill>
    </SceneShell>
  )
}

function ProblemScene({ scene, totalFrames }: { scene: PromoScene; totalFrames: number }) {
  const frame = useCurrentFrame()
  const { width } = useVideoConfig()
  const isPortrait = width < 900
  const headO = interpolate(frame, [0, 14], [0, 1])
  const headX = spring({ frame, fps: FPS, from: -60, to: 0, config: { damping: 20, stiffness: 80 } })
  const subO  = interpolate(frame, [20, 36], [0, 1], { extrapolateRight: 'clamp' })
  return (
    <SceneShell totalFrames={totalFrames}>
      <Background />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: isPortrait ? 40 : 92, paddingRight: isPortrait ? 40 : 92 }}>
        <div style={{ position: 'absolute', left: 52, top: '50%', transform: 'translateY(-50%)', width: 4, height: 160, background: `linear-gradient(to bottom, #ef444488, #dc2626, #ef444488)`, borderRadius: 4, opacity: interpolate(frame, [0, 10], [0, 1]) }} />
        <div style={{ fontSize: isPortrait ? 38 : 20, marginBottom: 12, color: '#ef4444', opacity: headO }}>
          {scene.sectionTitle ?? '●  The Problem'}
        </div>
        <h2 style={{ color: WHITE, fontSize: isPortrait ? 46 : 68, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.1, margin: 0, opacity: headO, transform: `translateX(${headX}px)`, fontFamily: FONT, maxWidth: 860 }}>
          {scene.headline}
        </h2>
        {scene.subtext && (
          <p style={{ color: MUTED, fontSize: isPortrait ? 20 : 26, marginTop: 24, opacity: subO, fontFamily: FONT, maxWidth: 700, lineHeight: 1.5 }}>
            {scene.subtext}
          </p>
        )}
      </AbsoluteFill>
    </SceneShell>
  )
}

function SolutionScene({ scene, totalFrames }: { scene: PromoScene; totalFrames: number }) {
  const frame = useCurrentFrame()
  const { width } = useVideoConfig()
  const isPortrait = width < 900
  const glow   = interpolate(Math.sin(frame / 40), [-1, 1], [0.4, 1])
  const headO  = interpolate(frame, [0, 14], [0, 1])
  const headY  = spring({ frame, fps: FPS, from: 50, to: 0, config: { damping: 20, stiffness: 80 } })
  const subO   = interpolate(frame, [20, 36], [0, 1], { extrapolateRight: 'clamp' })
  const checkS = spring({ frame: Math.max(frame - 6, 0), fps: FPS, from: 0, to: 1, config: { damping: 14, stiffness: 120 } })
  return (
    <SceneShell totalFrames={totalFrames}>
      <Background />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: isPortrait ? 40 : 92, paddingRight: isPortrait ? 40 : 92 }}>
        <AccentBar delay={2} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, opacity: headO, transform: `translateY(${headY}px)` }}>
          <div style={{ width: 48, height: 48, background: `linear-gradient(135deg, ${GREEN}, ${GREEN_L})`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, transform: `scale(${checkS})`, boxShadow: `0 0 30px ${GREEN}${Math.round(glow * 99).toString(16).padStart(2, '0')}` }}>✓</div>
          <span style={{ fontSize: isPortrait ? 16 : 18, fontWeight: 700, color: GREEN_L, letterSpacing: 2, fontFamily: FONT, textTransform: 'uppercase' as const }}>
            {scene.sectionTitle ?? 'The Solution'}
          </span>
        </div>
        <h2 style={{ color: WHITE, fontSize: isPortrait ? 48 : 70, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.1, margin: 0, opacity: headO, transform: `translateY(${headY}px)`, fontFamily: FONT, maxWidth: 860, textShadow: `0 0 60px ${GREEN}44` }}>
          {scene.headline}
        </h2>
        {scene.subtext && (
          <p style={{ color: '#cbd5e1', fontSize: isPortrait ? 20 : 26, marginTop: 24, opacity: subO, fontFamily: FONT, maxWidth: 700, lineHeight: 1.6 }}>
            {scene.subtext}
          </p>
        )}
      </AbsoluteFill>
    </SceneShell>
  )
}

function StatScene({ scene, totalFrames }: { scene: PromoScene; totalFrames: number }) {
  const frame = useCurrentFrame()
  const { width } = useVideoConfig()
  const isPortrait = width < 900
  const raw     = scene.value ?? '0'
  const numOnly = parseFloat(raw.replace(/[^0-9.]/g, ''))
  const suffix  = raw.replace(/[0-9.]/g, '')
  const counted = interpolate(frame, [8, Math.min(45, totalFrames - 12)], [0, numOnly], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
  const displayed = numOnly > 0 ? `${counted.toFixed(raw.includes('.') ? 1 : 0)}${suffix}` : raw
  const valueS = spring({ frame: Math.max(frame - 6, 0), fps: FPS, from: 0.6, to: 1, config: { damping: 14, stiffness: 80 } })
  const valueO = interpolate(frame, [0, 14], [0, 1])
  const labelO = interpolate(frame, [20, 36], [0, 1], { extrapolateRight: 'clamp' })
  const headO  = interpolate(frame, [30, 46], [0, 1], { extrapolateRight: 'clamp' })
  const glow   = interpolate(Math.sin(frame / 50), [-1, 1], [0.3, 0.7])
  return (
    <SceneShell totalFrames={totalFrames}>
      <Background />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 60px' }}>
        <div style={{ fontSize: isPortrait ? 110 : 160, fontWeight: 900, letterSpacing: -6, lineHeight: 1, background: `linear-gradient(135deg, ${GREEN_XL}, ${GREEN}, ${GREEN_L})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', transform: `scale(${valueS})`, opacity: valueO, fontFamily: FONT, filter: `drop-shadow(0 0 40px ${GREEN}${Math.round(glow * 99).toString(16).padStart(2, '0')})` }}>
          {displayed}
        </div>
        {scene.label && <div style={{ fontSize: isPortrait ? 22 : 32, fontWeight: 600, color: WHITE, marginTop: 16, opacity: labelO, fontFamily: FONT, letterSpacing: -0.5 }}>{scene.label}</div>}
        {scene.headline && <p style={{ fontSize: isPortrait ? 17 : 22, color: MUTED, marginTop: 12, opacity: headO, fontFamily: FONT, maxWidth: 600 }}>{scene.headline}</p>}
        <div style={{ position: 'absolute', bottom: 60, width: 200, height: 3, background: `linear-gradient(to right, transparent, ${GREEN}, transparent)`, opacity: labelO }} />
      </AbsoluteFill>
    </SceneShell>
  )
}

function FeatureScene({ scene, totalFrames }: { scene: PromoScene; totalFrames: number }) {
  const frame = useCurrentFrame()
  const { width } = useVideoConfig()
  const isPortrait = width < 900
  const headO = interpolate(frame, [0, 14], [0, 1])
  const headY = spring({ frame, fps: FPS, from: 40, to: 0, config: { damping: 18, stiffness: 80 } })
  const subO  = interpolate(frame, [18, 34], [0, 1], { extrapolateRight: 'clamp' })
  const dotS  = spring({ frame: Math.max(frame - 4, 0), fps: FPS, from: 0, to: 1, config: { damping: 12, stiffness: 140 } })
  return (
    <SceneShell totalFrames={totalFrames}>
      <Background />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: isPortrait ? 40 : 92, paddingRight: isPortrait ? 40 : 92 }}>
        <AccentBar delay={2} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, opacity: headO, transform: `translateY(${headY}px)` }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: GREEN_L, transform: `scale(${dotS})`, boxShadow: `0 0 16px ${GREEN_L}` }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: GREEN_L, letterSpacing: 2.5, fontFamily: FONT, textTransform: 'uppercase' as const }}>
            {scene.sectionTitle ?? 'Key Feature'}
          </span>
        </div>
        <h2 style={{ color: WHITE, fontSize: isPortrait ? 44 : 64, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.1, margin: 0, opacity: headO, transform: `translateY(${headY}px)`, fontFamily: FONT, maxWidth: 860 }}>
          {scene.headline}
        </h2>
        {scene.subtext && (
          <p style={{ fontSize: isPortrait ? 20 : 26, color: '#94a3b8', marginTop: 24, opacity: subO, fontFamily: FONT, maxWidth: 700, lineHeight: 1.65 }}>
            {scene.subtext}
          </p>
        )}
      </AbsoluteFill>
    </SceneShell>
  )
}

function CTAScene({ scene, totalFrames }: { scene: PromoScene; totalFrames: number }) {
  const frame = useCurrentFrame()
  const { width } = useVideoConfig()
  const isPortrait = width < 900
  const glow   = interpolate(Math.sin(frame / 35), [-1, 1], [0.35, 0.85])
  const scaleP = spring({ frame, fps: FPS, from: 0.85, to: 1, config: { damping: 16, stiffness: 80 } })
  const headO  = interpolate(frame, [0, 14], [0, 1])
  const subO   = interpolate(frame, [16, 32], [0, 1], { extrapolateRight: 'clamp' })
  const btnO   = interpolate(frame, [28, 44], [0, 1], { extrapolateRight: 'clamp' })
  const btnS   = spring({ frame: Math.max(frame - 28, 0), fps: FPS, from: 0.7, to: 1, config: { damping: 14, stiffness: 100 } })
  return (
    <SceneShell totalFrames={totalFrames}>
      <Background />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 60px' }}>
        <h2 style={{ color: WHITE, fontSize: isPortrait ? 48 : 72, fontWeight: 900, letterSpacing: -2, lineHeight: 1.08, margin: 0, opacity: headO, transform: `scale(${scaleP})`, fontFamily: FONT, maxWidth: 900, textShadow: `0 0 80px ${GREEN}${Math.round(glow * 99).toString(16).padStart(2, '0')}` }}>
          {scene.headline}
        </h2>
        {scene.subtext && (
          <p style={{ color: '#cbd5e1', fontSize: isPortrait ? 20 : 26, marginTop: 24, opacity: subO, fontFamily: FONT, maxWidth: 680, lineHeight: 1.6 }}>
            {scene.subtext}
          </p>
        )}
        <div style={{ marginTop: 40, opacity: btnO, transform: `scale(${btnS})`, background: `linear-gradient(135deg, ${GREEN}, ${GREEN_L})`, borderRadius: 14, padding: isPortrait ? '14px 36px' : '18px 56px', fontSize: isPortrait ? 20 : 26, fontWeight: 800, color: WHITE, fontFamily: FONT, letterSpacing: -0.5, boxShadow: `0 0 60px ${GREEN}${Math.round(glow * 120).toString(16).padStart(2, '0')}` }}>
          {scene.sectionTitle ?? 'forexmastery.org'}
        </div>
        <div style={{ position: 'absolute', bottom: 40, fontSize: 14, color: GREEN + '99', fontFamily: FONT, fontWeight: 700, letterSpacing: 2, opacity: btnO }}>
          POWERED BY FM TRADER
        </div>
      </AbsoluteFill>
    </SceneShell>
  )
}

// ── NEW SCENE EFFECTS ────────────────────────────────────────────────────────

// 1. TYPEWRITER — letter-by-letter reveal with blinking cursor
function TypewriterScene({ scene, totalFrames }: { scene: PromoScene; totalFrames: number }) {
  const frame = useCurrentFrame()
  const { width } = useVideoConfig()
  const isPortrait = width < 900
  const SPEED = 1.8
  const START = 8
  const chars   = Math.min(scene.headline.length, Math.floor(Math.max(0, frame - START) * SPEED))
  const doneAt  = START + scene.headline.length / SPEED
  const cursor  = Math.floor(frame / 14) % 2 === 0
  const labelO  = interpolate(frame, [0, 10], [0, 1])
  const subO    = interpolate(frame, [doneAt, doneAt + 18], [0, 1], { extrapolateRight: 'clamp' })
  return (
    <SceneShell totalFrames={totalFrames}>
      <Background />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: isPortrait ? 40 : 92, paddingRight: isPortrait ? 40 : 92 }}>
        <AccentBar delay={2} />
        <SectionLabel text={scene.sectionTitle ?? '▶ Live Feed'} opacity={labelO} />
        <h2 style={{ color: WHITE, fontSize: isPortrait ? 44 : 64, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.1, margin: 0, fontFamily: FONT, maxWidth: 860 }}>
          {scene.headline.slice(0, chars)}
          <span style={{ opacity: cursor ? 1 : 0, color: GREEN_XL, fontWeight: 100 }}>|</span>
        </h2>
        {scene.subtext && (
          <p style={{ color: '#94a3b8', fontSize: isPortrait ? 20 : 26, marginTop: 24, opacity: subO, fontFamily: FONT, maxWidth: 700, lineHeight: 1.65 }}>
            {scene.subtext}
          </p>
        )}
      </AbsoluteFill>
    </SceneShell>
  )
}

// 2. REVEAL — green curtain slides away to uncover headline
function RevealScene({ scene, totalFrames }: { scene: PromoScene; totalFrames: number }) {
  const frame = useCurrentFrame()
  const { width } = useVideoConfig()
  const isPortrait = width < 900
  const curtainPct = spring({ frame: Math.max(frame - 4, 0), fps: FPS, from: 0, to: 105, config: { damping: 22, stiffness: 38 } })
  const labelO = interpolate(frame, [0, 10], [0, 1])
  const subO   = interpolate(frame, [36, 52], [0, 1], { extrapolateRight: 'clamp' })
  return (
    <SceneShell totalFrames={totalFrames}>
      <Background />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: isPortrait ? 40 : 92, paddingRight: isPortrait ? 40 : 92 }}>
        <AccentBar delay={2} />
        <SectionLabel text={scene.sectionTitle ?? 'Revealed'} opacity={labelO} />
        <div style={{ position: 'relative', overflow: 'hidden', paddingBottom: 8 }}>
          <h2 style={{ color: WHITE, fontSize: isPortrait ? 46 : 70, fontWeight: 900, letterSpacing: -2, lineHeight: 1.08, margin: 0, fontFamily: FONT, maxWidth: 860 }}>
            {scene.headline}
          </h2>
          <div style={{ position: 'absolute', top: -4, bottom: -4, left: `${curtainPct}%`, right: -200, background: `linear-gradient(to right, ${GREEN}, ${GREEN_L})`, pointerEvents: 'none' }} />
        </div>
        {scene.subtext && (
          <p style={{ color: '#94a3b8', fontSize: isPortrait ? 20 : 26, marginTop: 24, opacity: subO, fontFamily: FONT, maxWidth: 700, lineHeight: 1.65 }}>
            {scene.subtext}
          </p>
        )}
      </AbsoluteFill>
    </SceneShell>
  )
}

// 3. QUOTE — large quote marks, centered italic text
function QuoteScene({ scene, totalFrames }: { scene: PromoScene; totalFrames: number }) {
  const frame = useCurrentFrame()
  const { width } = useVideoConfig()
  const isPortrait = width < 900
  const quoteS = spring({ frame, fps: FPS, from: 0, to: 1, config: { damping: 20, stiffness: 60 } })
  const headO  = interpolate(frame, [12, 28], [0, 1], { extrapolateRight: 'clamp' })
  const headY  = spring({ frame: Math.max(frame - 12, 0), fps: FPS, from: 30, to: 0, config: { damping: 20, stiffness: 80 } })
  const subO   = interpolate(frame, [28, 44], [0, 1], { extrapolateRight: 'clamp' })
  return (
    <SceneShell totalFrames={totalFrames}>
      <Background />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 80px' }}>
        <div style={{ fontSize: isPortrait ? 100 : 140, fontWeight: 900, color: GREEN, opacity: quoteS * 0.4, lineHeight: 0.8, marginBottom: -20, fontFamily: 'Georgia, serif', transform: `scale(${quoteS})` }}>
          "
        </div>
        <p style={{ color: WHITE, fontSize: isPortrait ? 34 : 50, fontWeight: 700, fontStyle: 'italic', lineHeight: 1.35, margin: 0, fontFamily: 'Georgia, serif', maxWidth: 820, opacity: headO, transform: `translateY(${headY}px)`, letterSpacing: -0.5 }}>
          {scene.headline}
        </p>
        <div style={{ fontSize: isPortrait ? 100 : 140, fontWeight: 900, color: GREEN, opacity: headO * 0.4, lineHeight: 0.8, marginTop: -20, fontFamily: 'Georgia, serif' }}>
          "
        </div>
        {scene.subtext && (
          <div style={{ marginTop: 16, opacity: subO }}>
            <div style={{ width: 40, height: 2, background: GREEN, margin: '0 auto 12px' }} />
            <p style={{ color: GREEN_L, fontSize: isPortrait ? 16 : 20, fontWeight: 600, fontFamily: FONT, letterSpacing: 1 }}>
              {scene.subtext}
            </p>
          </div>
        )}
      </AbsoluteFill>
    </SceneShell>
  )
}

// 4. ANNOUNCEMENT — pulsing rings + bold centered scale-in text
function AnnouncementScene({ scene, totalFrames }: { scene: PromoScene; totalFrames: number }) {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()
  const isPortrait = width < 900
  const ring1S = interpolate(frame % 40, [0, 40], [0.8, 2.0], { easing: Easing.out(Easing.quad) })
  const ring1O = interpolate(frame % 40, [0, 40], [0.5, 0])
  const ring2S = interpolate((frame + 20) % 40, [0, 40], [0.8, 2.0], { easing: Easing.out(Easing.quad) })
  const ring2O = interpolate((frame + 20) % 40, [0, 40], [0.5, 0])
  const headS  = spring({ frame: Math.max(frame - 8, 0), fps: FPS, from: 0.7, to: 1, config: { damping: 14, stiffness: 90 } })
  const headO  = interpolate(frame, [0, 14], [0, 1])
  const subO   = interpolate(frame, [22, 38], [0, 1], { extrapolateRight: 'clamp' })
  const ringSize = Math.min(width, height) * 0.65
  return (
    <SceneShell totalFrames={totalFrames}>
      <Background />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 60px' }}>
        <div style={{ position: 'absolute', width: ringSize, height: ringSize, borderRadius: '50%', border: `2px solid ${GREEN}`, transform: `scale(${ring1S})`, opacity: ring1O }} />
        <div style={{ position: 'absolute', width: ringSize, height: ringSize, borderRadius: '50%', border: `2px solid ${GREEN_L}`, transform: `scale(${ring2S})`, opacity: ring2O }} />
        {scene.sectionTitle && (
          <div style={{ fontSize: 13, fontWeight: 700, color: GREEN + '99', letterSpacing: 3, textTransform: 'uppercase' as const, fontFamily: FONT, marginBottom: 20, opacity: headO, position: 'relative', zIndex: 1 }}>
            {scene.sectionTitle}
          </div>
        )}
        <h2 style={{ color: WHITE, fontSize: isPortrait ? 50 : 76, fontWeight: 900, letterSpacing: -2, lineHeight: 1.06, margin: 0, fontFamily: FONT, maxWidth: 900, opacity: headO, transform: `scale(${headS})`, textShadow: `0 0 80px ${GREEN}66`, position: 'relative', zIndex: 1 }}>
          {scene.headline}
        </h2>
        {scene.subtext && (
          <p style={{ color: GREEN_L, fontSize: isPortrait ? 20 : 28, marginTop: 24, opacity: subO, fontFamily: FONT, maxWidth: 680, lineHeight: 1.6, position: 'relative', zIndex: 1 }}>
            {scene.subtext}
          </p>
        )}
      </AbsoluteFill>
    </SceneShell>
  )
}

// 5. BULLET — staggered bullet list (split headline by " | ")
function BulletScene({ scene, totalFrames }: { scene: PromoScene; totalFrames: number }) {
  const frame = useCurrentFrame()
  const { width } = useVideoConfig()
  const isPortrait = width < 900
  const bullets = scene.headline.split('|').map(b => b.trim()).filter(Boolean).slice(0, 4)
  const labelO  = interpolate(frame, [0, 10], [0, 1])
  const subO    = interpolate(frame, [bullets.length * 16 + 20, bullets.length * 16 + 36], [0, 1], { extrapolateRight: 'clamp' })
  return (
    <SceneShell totalFrames={totalFrames}>
      <Background />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: isPortrait ? 40 : 92, paddingRight: isPortrait ? 40 : 92 }}>
        <AccentBar delay={2} />
        <SectionLabel text={scene.sectionTitle ?? 'Key Points'} opacity={labelO} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: isPortrait ? 18 : 26 }}>
          {bullets.map((bullet, i) => {
            const delay = 10 + i * 16
            const bO  = interpolate(frame, [delay, delay + 14], [0, 1], { extrapolateRight: 'clamp' })
            const bX  = spring({ frame: Math.max(frame - delay, 0), fps: FPS, from: -40, to: 0, config: { damping: 20, stiffness: 80 } })
            const dS  = spring({ frame: Math.max(frame - delay, 0), fps: FPS, from: 0, to: 1, config: { damping: 14, stiffness: 140 } })
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 20, opacity: bO, transform: `translateX(${bX}px)` }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: GREEN_XL, flexShrink: 0, transform: `scale(${dS})`, boxShadow: `0 0 12px ${GREEN_XL}` }} />
                <span style={{ color: WHITE, fontSize: isPortrait ? 28 : 42, fontWeight: 700, fontFamily: FONT, letterSpacing: -1, lineHeight: 1.2 }}>
                  {bullet}
                </span>
              </div>
            )
          })}
        </div>
        {scene.subtext && (
          <p style={{ color: MUTED, fontSize: isPortrait ? 16 : 20, marginTop: 28, opacity: subO, fontFamily: FONT }}>
            {scene.subtext}
          </p>
        )}
      </AbsoluteFill>
    </SceneShell>
  )
}

// 6. QUESTION — large "?" leads in, headline appears beside it
function QuestionScene({ scene, totalFrames }: { scene: PromoScene; totalFrames: number }) {
  const frame = useCurrentFrame()
  const { width } = useVideoConfig()
  const isPortrait = width < 900
  const qS    = spring({ frame, fps: FPS, from: 0, to: 1, config: { damping: 14, stiffness: 80 } })
  const headO = interpolate(frame, [14, 30], [0, 1], { extrapolateRight: 'clamp' })
  const headX = spring({ frame: Math.max(frame - 14, 0), fps: FPS, from: 40, to: 0, config: { damping: 20, stiffness: 80 } })
  const subO  = interpolate(frame, [32, 48], [0, 1], { extrapolateRight: 'clamp' })
  const labelO = interpolate(frame, [14, 28], [0, 1], { extrapolateRight: 'clamp' })
  return (
    <SceneShell totalFrames={totalFrames}>
      <Background />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: isPortrait ? 40 : 92, paddingRight: isPortrait ? 40 : 92 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: isPortrait ? 20 : 36 }}>
          <div style={{ fontSize: isPortrait ? 120 : 180, fontWeight: 900, color: GOLD, lineHeight: 0.9, transform: `scale(${qS})`, opacity: qS, textShadow: `0 0 60px ${GOLD}55`, flexShrink: 0, fontFamily: FONT }}>
            ?
          </div>
          <div style={{ flex: 1, paddingTop: isPortrait ? 8 : 16 }}>
            {scene.sectionTitle && <SectionLabel text={scene.sectionTitle} opacity={labelO} />}
            <h2 style={{ color: WHITE, fontSize: isPortrait ? 36 : 56, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.1, margin: 0, fontFamily: FONT, maxWidth: 720, opacity: headO, transform: `translateX(${headX}px)` }}>
              {scene.headline}
            </h2>
            {scene.subtext && (
              <p style={{ color: GREEN_L, fontSize: isPortrait ? 18 : 24, marginTop: 18, opacity: subO, fontFamily: FONT, maxWidth: 640, lineHeight: 1.6 }}>
                {scene.subtext}
              </p>
            )}
          </div>
        </div>
      </AbsoluteFill>
    </SceneShell>
  )
}

// 7. GLITCH — RGB-split glitch at entry, then clean text
function GlitchScene({ scene, totalFrames }: { scene: PromoScene; totalFrames: number }) {
  const frame = useCurrentFrame()
  const { width } = useVideoConfig()
  const isPortrait = width < 900
  const glitching = frame < 10
  const glitchOff = glitching ? Math.sin(frame * 7.3) * 7 : 0
  const textShadow = glitching
    ? `${glitchOff}px 0 2px #ef4444, ${-glitchOff}px 0 2px #3b82f6`
    : `0 0 60px ${GREEN}44`
  const headO = interpolate(frame, [0, 10], [0.6, 1])
  const headY = spring({ frame: Math.max(frame - 10, 0), fps: FPS, from: 30, to: 0, config: { damping: 18, stiffness: 80 } })
  const subO  = interpolate(frame, [20, 36], [0, 1], { extrapolateRight: 'clamp' })
  const labelO = interpolate(frame, [10, 22], [0, 1], { extrapolateRight: 'clamp' })
  return (
    <SceneShell totalFrames={totalFrames}>
      <Background />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: isPortrait ? 40 : 92, paddingRight: isPortrait ? 40 : 92 }}>
        <AccentBar delay={10} />
        <SectionLabel text={scene.sectionTitle ?? 'Breaking'} opacity={labelO} />
        <h2 style={{ color: WHITE, fontSize: isPortrait ? 44 : 68, fontWeight: 900, letterSpacing: glitching ? glitchOff * 0.3 : -1.5, lineHeight: 1.1, margin: 0, fontFamily: FONT, maxWidth: 860, opacity: headO, transform: `translateY(${headY}px)`, textShadow }}>
          {scene.headline}
        </h2>
        {scene.subtext && (
          <p style={{ color: '#94a3b8', fontSize: isPortrait ? 20 : 26, marginTop: 24, opacity: subO, fontFamily: FONT, maxWidth: 700, lineHeight: 1.65 }}>
            {scene.subtext}
          </p>
        )}
      </AbsoluteFill>
    </SceneShell>
  )
}

// 8. SPLIT — two-panel: colored accent left, headline right
function SplitScene({ scene, totalFrames }: { scene: PromoScene; totalFrames: number }) {
  const frame = useCurrentFrame()
  const { width } = useVideoConfig()
  const isPortrait = width < 900
  const panelW = spring({ frame, fps: FPS, from: 0, to: isPortrait ? 30 : 35, config: { damping: 18, stiffness: 55 } })
  const headO  = interpolate(frame, [16, 32], [0, 1], { extrapolateRight: 'clamp' })
  const headY  = spring({ frame: Math.max(frame - 16, 0), fps: FPS, from: 30, to: 0, config: { damping: 20, stiffness: 80 } })
  const subO   = interpolate(frame, [30, 46], [0, 1], { extrapolateRight: 'clamp' })
  const valO   = interpolate(frame, [4, 20], [0, 1], { extrapolateRight: 'clamp' })
  const labelO = interpolate(frame, [16, 30], [0, 1], { extrapolateRight: 'clamp' })
  return (
    <SceneShell totalFrames={totalFrames}>
      <Background />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'row' }}>
        {/* Left accent panel */}
        <div style={{ width: `${panelW}%`, background: `linear-gradient(160deg, ${GREEN}, ${GREEN_L})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ fontSize: isPortrait ? 52 : 80, fontWeight: 900, color: WHITE, fontFamily: FONT, textAlign: 'center', opacity: valO, padding: '0 16px', wordBreak: 'break-word' as const, lineHeight: 1.1 }}>
            {scene.value ?? '◆'}
          </div>
        </div>
        {/* Right content panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: isPortrait ? 28 : 60, paddingRight: isPortrait ? 28 : 60 }}>
          {scene.sectionTitle && <SectionLabel text={scene.sectionTitle} opacity={labelO} />}
          <h2 style={{ color: WHITE, fontSize: isPortrait ? 36 : 56, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.1, margin: 0, fontFamily: FONT, maxWidth: 680, opacity: headO, transform: `translateY(${headY}px)` }}>
            {scene.headline}
          </h2>
          {scene.subtext && (
            <p style={{ color: '#94a3b8', fontSize: isPortrait ? 18 : 24, marginTop: 20, opacity: subO, fontFamily: FONT, maxWidth: 600, lineHeight: 1.65 }}>
              {scene.subtext}
            </p>
          )}
        </div>
      </AbsoluteFill>
    </SceneShell>
  )
}

// 9. COUNTDOWN — 3 → 2 → 1 then headline slams in
function CountdownScene({ scene, totalFrames }: { scene: PromoScene; totalFrames: number }) {
  const frame = useCurrentFrame()
  const { width } = useVideoConfig()
  const isPortrait = width < 900
  const countFrames = Math.min(Math.floor(totalFrames * 0.55), 90)
  const numDur = Math.floor(countFrames / 3)
  const which  = frame < numDur ? 3 : frame < numDur * 2 ? 2 : frame < countFrames ? 1 : 0
  const local  = which > 0 ? frame % numDur : frame - countFrames
  const numS   = spring({ frame: local, fps: FPS, from: 1.5, to: 1, config: { damping: 12, stiffness: 100 } })
  const numO   = which > 0 ? interpolate(local, [0, 6, numDur - 6, numDur], [0, 1, 1, 0], { extrapolateRight: 'clamp' }) : 0
  const headO  = which === 0 ? interpolate(local, [0, 16], [0, 1], { extrapolateRight: 'clamp' }) : 0
  const headS  = which === 0 ? spring({ frame: local, fps: FPS, from: 0.75, to: 1, config: { damping: 16, stiffness: 100 } }) : 1
  const colors = ['', GREEN_XL, GREEN_L, GREEN]
  return (
    <SceneShell totalFrames={totalFrames}>
      <Background />
      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 60px' }}>
        {which > 0 && (
          <div style={{ fontSize: isPortrait ? 200 : 300, fontWeight: 900, color: colors[which], fontFamily: FONT, lineHeight: 1, transform: `scale(${numS})`, opacity: numO, textShadow: `0 0 80px ${GREEN}99` }}>
            {which}
          </div>
        )}
        {which === 0 && (
          <h2 style={{ color: WHITE, fontSize: isPortrait ? 50 : 76, fontWeight: 900, letterSpacing: -2, lineHeight: 1.08, margin: 0, fontFamily: FONT, maxWidth: 900, opacity: headO, transform: `scale(${headS})`, textShadow: `0 0 80px ${GREEN}66` }}>
            {scene.headline}
          </h2>
        )}
      </AbsoluteFill>
    </SceneShell>
  )
}

// 10. TESTIMONIAL — stars + italic quote + attribution
function TestimonialScene({ scene, totalFrames }: { scene: PromoScene; totalFrames: number }) {
  const frame = useCurrentFrame()
  const { width } = useVideoConfig()
  const isPortrait = width < 900
  const quoteO = interpolate(frame, [14, 30], [0, 1], { extrapolateRight: 'clamp' })
  const quoteY = spring({ frame: Math.max(frame - 14, 0), fps: FPS, from: 30, to: 0, config: { damping: 20, stiffness: 80 } })
  const attO   = interpolate(frame, [32, 48], [0, 1], { extrapolateRight: 'clamp' })
  return (
    <SceneShell totalFrames={totalFrames}>
      <Background />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 80px' }}>
        {/* Stars */}
        <div style={{ display: 'flex', gap: isPortrait ? 8 : 12, marginBottom: 28 }}>
          {[0, 1, 2, 3, 4].map(i => {
            const sO = interpolate(frame, [i * 4, i * 4 + 10], [0, 1], { extrapolateRight: 'clamp' })
            const sS = spring({ frame: Math.max(frame - i * 4, 0), fps: FPS, from: 0, to: 1, config: { damping: 12, stiffness: 140 } })
            return (
              <div key={i} style={{ fontSize: isPortrait ? 28 : 36, color: GOLD, opacity: sO, transform: `scale(${sS})` }}>★</div>
            )
          })}
        </div>
        {/* Quote */}
        <p style={{ color: WHITE, fontSize: isPortrait ? 28 : 44, fontWeight: 600, fontStyle: 'italic', lineHeight: 1.4, margin: 0, fontFamily: 'Georgia, serif', maxWidth: 800, opacity: quoteO, transform: `translateY(${quoteY}px)` }}>
          &ldquo;{scene.headline}&rdquo;
        </p>
        {/* Attribution */}
        {(scene.label ?? scene.subtext) && (
          <div style={{ marginTop: 28, opacity: attO }}>
            <div style={{ width: 40, height: 2, background: GREEN, margin: '0 auto 14px' }} />
            <p style={{ color: GREEN_L, fontSize: isPortrait ? 16 : 20, fontWeight: 600, fontFamily: FONT, letterSpacing: 0.5 }}>
              {scene.label ?? scene.subtext}
            </p>
          </div>
        )}
      </AbsoluteFill>
    </SceneShell>
  )
}

// ── Scene dispatcher ─────────────────────────────────────────────────────────

function SceneContent({ scene, totalFrames }: { scene: PromoScene; totalFrames: number }) {
  switch (scene.type) {
    case 'hook':         return <HookScene         scene={scene} totalFrames={totalFrames} />
    case 'problem':      return <ProblemScene       scene={scene} totalFrames={totalFrames} />
    case 'solution':     return <SolutionScene      scene={scene} totalFrames={totalFrames} />
    case 'stat':         return <StatScene          scene={scene} totalFrames={totalFrames} />
    case 'feature':      return <FeatureScene       scene={scene} totalFrames={totalFrames} />
    case 'cta':          return <CTAScene           scene={scene} totalFrames={totalFrames} />
    case 'typewriter':   return <TypewriterScene    scene={scene} totalFrames={totalFrames} />
    case 'reveal':       return <RevealScene        scene={scene} totalFrames={totalFrames} />
    case 'quote':        return <QuoteScene         scene={scene} totalFrames={totalFrames} />
    case 'announcement': return <AnnouncementScene  scene={scene} totalFrames={totalFrames} />
    case 'bullet':       return <BulletScene        scene={scene} totalFrames={totalFrames} />
    case 'question':     return <QuestionScene      scene={scene} totalFrames={totalFrames} />
    case 'glitch':       return <GlitchScene        scene={scene} totalFrames={totalFrames} />
    case 'split':        return <SplitScene         scene={scene} totalFrames={totalFrames} />
    case 'countdown':    return <CountdownScene     scene={scene} totalFrames={totalFrames} />
    case 'testimonial':  return <TestimonialScene   scene={scene} totalFrames={totalFrames} />
    default:             return <HookScene          scene={scene} totalFrames={totalFrames} />
  }
}

// ── Media clip renderers ─────────────────────────────────────────────────────

function ImageClipRenderer({ media, totalFrames: tf }: { media: MediaFile; totalFrames: number }) {
  const frame = useCurrentFrame()
  const fadeIn  = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' })
  const fadeOut = interpolate(frame, [Math.max(tf - 12, tf - 1), tf], [1, 0], { extrapolateLeft: 'clamp' })
  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut), background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={media.url} alt={media.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
    </AbsoluteFill>
  )
}

function VideoClipRenderer({ media, totalFrames: tf }: { media: MediaFile; totalFrames: number }) {
  const frame = useCurrentFrame()
  const fadeIn  = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' })
  const fadeOut = interpolate(frame, [Math.max(tf - 12, tf - 1), tf], [1, 0], { extrapolateLeft: 'clamp' })
  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut), background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <video src={media.url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} autoPlay muted loop />
    </AbsoluteFill>
  )
}

// ── Main composition ─────────────────────────────────────────────────────────

export const PromoVideo: React.FC<PromoVideoProps> = ({ clips }) => {
  const mainClips    = [...clips.filter(c => c.track === 'main')].sort((a, b) => a.startFrame - b.startFrame)
  const overlayClips = clips.filter(c => c.track === 'overlay')

  return (
    <AbsoluteFill>
      {mainClips.map(clip => (
        <Sequence key={clip.id} from={clip.startFrame} durationInFrames={clip.durationFrames}>
          <>
            {clip.clipType === 'scene' && clip.scene ? (
              <AbsoluteFill style={{ opacity: clip.scene.opacity ?? 1 }}>
                <SceneContent scene={clip.scene} totalFrames={clip.durationFrames} />
                {(clip.scene.objects ?? []).map(obj => (
                  <ObjectRenderer key={obj.id} obj={obj} sceneDuration={clip.durationFrames} />
                ))}
              </AbsoluteFill>
            ) : clip.clipType === 'image' && clip.media ? (
              <ImageClipRenderer media={clip.media} totalFrames={clip.durationFrames} />
            ) : clip.clipType === 'video' && clip.media ? (
              <VideoClipRenderer media={clip.media} totalFrames={clip.durationFrames} />
            ) : null}
          </>
        </Sequence>
      ))}
      {overlayClips.map(clip => clip.shape ? (
        <Sequence key={clip.id} from={clip.startFrame} durationInFrames={clip.durationFrames}>
          <ObjectRenderer obj={clip.shape} sceneDuration={clip.durationFrames} />
        </Sequence>
      ) : null)}
    </AbsoluteFill>
  )
}
