// remotion/compositions/LessonVideo.tsx
import {
  AbsoluteFill,
  Audio,
  Img,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
  continueRender,
  delayRender,
} from 'remotion'
import { useEffect, useState, useMemo } from 'react'
import type { SlideCue, SlideType } from '@/lib/lessonParser'
import { buildSceneSpecs, type SceneSpec } from '@/lib/lesson-scene-spec'
import { bestDiagram } from '@/lib/lesson-visual-match'
import { FullScene, SW, SH } from '@/remotion/lesson-visuals/FullScene'
import { buildBackdropPlan } from '@/lib/scene-backdrop'
import { artFor } from '@/lib/lesson-scene-art'
import { normaliseProse } from '@/lib/lesson-scene-spec'
import { VARIANT_COUNTS } from '@/remotion/lesson-visuals/visuals'


// ─── Re-export types so VideoPlayer can import them ───────────────────────────

export type { SlideCue, SlideType }
export interface KeyPoint  { text: string; explanation?: string }
export interface Term      { word: string; definition: string }

// ─── Props ────────────────────────────────────────────────────────────────────

export interface LessonVideoProps {
  lessonTitle:  string
  moduleTitle:  string
  moduleNumber: number
  lessonNumber: number
  cuePoints?:   SlideCue[]   // audio-synced timing from /api/generate-audio
  audioUrl?:    string
  // kept for visual-only fallback when cuePoints absent
  keyPoints?:   KeyPoint[]
  terms?:       Term[]
  accentColor?: string
  /** Dev-only: render a specific frame regardless of the timeline position,
   *  so a review harness can tile many moments of one lesson at once. */
  frameOverride?: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FPS         = 30
const FONT        = "'Inter', 'Helvetica Neue', Arial, sans-serif"
const ACCENT      = '#1D9E75'
const ACCENT_WARM = '#f59e0b'
const ACCENT_COOL = '#93c5fd'

// ─── Audio src helper ─────────────────────────────────────────────────────────

function resolveAudio(url: string): string {
  // API routes and absolute paths must be passed through directly.
  // staticFile() is only for assets bundled in Remotion's public dir.
  if (url.startsWith('http') || url.startsWith('/')) return url
  return staticFile(url)
}

// ─── Visual-only fallback timeline ────────────────────────────────────────────
// Used when no cuePoints are provided (no ElevenLabs key).

function buildFallbackCues(
  lessonTitle:  string,
  moduleTitle:  string,
  keyPoints:    KeyPoint[],
  terms:        Term[],
): SlideCue[] {
  const cues: SlideCue[] = []
  let f = 0
  const push = (c: Omit<SlideCue, 'startFrame' | 'endFrame'>, secs: number) => {
    const frames = Math.round(secs * FPS)
    cues.push({ ...c, startFrame: f, endFrame: f + frames })
    f += frames
  }

  push({ type: 'intro', heading: lessonTitle, body: moduleTitle }, 5)

  if (keyPoints.length > 0) {
    push({ type: 'section-header', heading: 'Key Points', body: '' }, 3)
    keyPoints.forEach((kp, i) =>
      push({ type: 'keypoint', heading: `${i + 1}`, body: kp.text, meta: kp.explanation }, 6))
  }

  if (terms.length > 0) {
    push({ type: 'section-header', heading: 'Key Terms', body: '' }, 3)
    terms.forEach(t =>
      push({ type: 'term', heading: t.word, body: t.definition }, 5))
  }

  push({ type: 'outro', heading: lessonTitle, body: '' }, 5)
  return cues
}

// ─── Easing ───────────────────────────────────────────────────────────────────

function easeOut(t: number) { return 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3) }

function fadeSlide(f: number, delay = 0, dur = 18) {
  const t = easeOut(Math.min(Math.max((f - delay) / dur, 0), 1))
  return { op: t, y: (1 - t) * 26 }
}

function slideOpacity(frame: number, cue: SlideCue) {
  const f   = frame - cue.startFrame
  const len = cue.endFrame - cue.startFrame
  const inn = Math.min(f / 18, 1)
  const out = Math.max(1 - (f - (len - 18)) / 18, 0)
  return Math.min(inn, out)
}

// Word-reveal that adapts to the actual slide duration
function wordReveal(f: number, words: number, totalFrames: number) {
  const start = Math.min(14, totalFrames * 0.05)
  const end   = Math.max(start + words * 2, totalFrames * 0.8)
  return Math.floor(interpolate(f, [start, end], [0, words], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }))
}

// ─── Background (always rendered) ────────────────────────────────────────────

function Background({ frame }: { frame: number }) {
  const pulse = Math.sin(frame * 0.038) * 0.5 + 0.5
  const drift = interpolate(frame, [0, 9000], [0, -80], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ background: '#080e1a', overflow: 'hidden' }}>
      {/* Drifting grid */}
      <svg style={{ position: 'absolute', inset: 0, opacity: 0.055 }} width="100%" height="100%">
        <defs>
          <pattern id="g" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform={`translate(0,${drift})`}>
            <path d="M60 0L0 0 0 60" fill="none" stroke="#10b981" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)" />
      </svg>

      {/* Ambient glows */}
      <div style={{ position:'absolute', top:-220, right:-220, width:600, height:600, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(16,185,129,0.14) 0%, transparent 70%)',
        opacity: 0.3 + pulse * 0.28 }} />
      <div style={{ position:'absolute', bottom:-160, left:-160, width:480, height:480, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 70%)',
        opacity: 0.22 + pulse * 0.18 }} />

      {/* Candlestick strip */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:72, opacity:0.065,
        display:'flex', alignItems:'flex-end', gap:5, padding:'0 18px' }}>
        {[58,70,46,86,62,76,50,90,66,78,42,74,56,88,68,82,54,92,64,80,48,86,60,72].map((h,i) => (
          <div key={i} style={{ flex:1,
            height:`${h + Math.sin((frame + i*11)*0.024)*6}%`,
            background: i % 3 === 0 ? '#ef4444' : '#10b981',
            borderRadius:'2px 2px 0 0' }} />
        ))}
      </div>

      {/* Branding */}
      <div style={{ position:'absolute', bottom:18, right:28, display:'flex', alignItems:'center', gap:7, opacity:0.3 }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', opacity: 0.5+pulse*0.5 }} />
        <span style={{ color:'rgba(255,255,255,0.45)', fontSize:10, letterSpacing:'0.12em', fontFamily:FONT }}>
          FOREX MASTERY
        </span>
      </div>
    </AbsoluteFill>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ frame, total }: { frame: number; total: number }) {
  const pct = Math.min((frame / total) * 100, 100)
  return (
    <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'rgba(255,255,255,0.06)', zIndex:20 }}>
      <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg, ${ACCENT}, #34d399)`,
        borderRadius:'0 2px 2px 0', boxShadow:'0 0 8px rgba(16,185,129,0.5)' }} />
    </div>
  )
}

// ─── Persistent header strip ──────────────────────────────────────────────────

function LessonHeader({ lessonTitle, currentSection, frame, total }: {
  lessonTitle: string; currentSection: string; frame: number; total: number
}) {
  const op = interpolate(frame, [0, 20], [0, 1], { extrapolateLeft:'clamp', extrapolateRight:'clamp' })
  return (
    <div style={{ position:'absolute', top:0, left:0, right:0, height:44, zIndex:15,
      background:'rgba(8,14,26,0.85)', borderBottom:'1px solid rgba(255,255,255,0.05)',
      display:'flex', alignItems:'center', padding:'0 28px', gap:12, opacity:op }}>
      <span style={{ color:'rgba(255,255,255,0.35)', fontSize:11, fontFamily:FONT, letterSpacing:'0.06em' }}>
        {lessonTitle}
      </span>
      {currentSection && (
        <>
          <span style={{ color:'rgba(255,255,255,0.15)', fontSize:11 }}>›</span>
          <span style={{ color:ACCENT, fontSize:11, fontFamily:FONT, fontWeight:600 }}>
            {currentSection}
          </span>
        </>
      )}
      <div style={{ flex:1 }} />
      <span style={{ color:'rgba(255,255,255,0.2)', fontSize:10, fontFamily:FONT }}>
        {Math.round((frame / total) * 100)}%
      </span>
    </div>
  )
}

// ─── Photographic backdrop ───────────────────────────────────────────────────
// Sits behind everything, heavily darkened and slowly pushing in. It sets a
// scene; it never competes with the diagram or the caption.

function SceneBackdrop({ file, frame, cue }: { file: string; frame: number; cue: SlideCue }) {
  const local = frame - cue.startFrame
  const len   = cue.endFrame - cue.startFrame
  const inT   = easeOut(Math.min(local / 26, 1))
  const outT  = Math.max(1 - (local - (len - 18)) / 18, 0)
  const op    = Math.min(inT, outT)
  const push  = 1.06 + Math.min(local / Math.max(len, 1), 1) * 0.07

  return (
    // No z-index: the backdrop must stay below the slides, which stack at
    // auto. Giving it z-index 1 painted the dark overlay OVER the scene and
    // greyed out every title on it.
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Img
        src={staticFile(file)}
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          transform: `scale(${push})`,
          opacity: op * 0.5,
        }}
      />
      {/* Knock the photo back so text and charts stay legible on top of it. */}
      <AbsoluteFill style={{
        background:
          'linear-gradient(180deg, rgba(8,14,26,0.86) 0%, rgba(8,14,26,0.62) 38%, rgba(8,14,26,0.88) 100%)',
        opacity: op,
      }} />
    </AbsoluteFill>
  )
}

// ─── Stage + captions ────────────────────────────────────────────────────────
// The illustration is the hero: it plays large and centred while the spoken
// sentence runs underneath as a caption, the way an explainer video reads.
// Each scene enters with a different move so consecutive scenes don't feel
// like a slideshow of static boards.

type Transition = 'slide-left' | 'slide-right' | 'slide-up' | 'zoom-in' | 'zoom-out'

const TRANSITIONS: Transition[] = [
  'slide-left', 'zoom-in', 'slide-up', 'zoom-out', 'slide-right', 'zoom-in',
]

/** Entrance transform for a scene, plus a slow drift so it never sits still. */
function stageMotion(local: number, len: number, kind: Transition) {
  const inT  = easeOut(Math.min(local / 20, 1))
  const outT = Math.max(1 - (local - (len - 16)) / 16, 0)
  const op   = Math.min(inT, outT)

  // Ken Burns: a continuous, barely-perceptible push over the whole scene.
  const drift = Math.min(local / Math.max(len, 1), 1)
  const kb = 1 + drift * 0.035

  let x = 0, y = 0, scale = kb
  switch (kind) {
    case 'slide-left':  x = (1 - inT) * 90;  break
    case 'slide-right': x = (1 - inT) * -90; break
    case 'slide-up':    y = (1 - inT) * 70;  break
    case 'zoom-in':     scale = kb * (0.86 + inT * 0.14); break
    case 'zoom-out':    scale = kb * (1.16 - inT * 0.16); break
  }
  // Ease the exit out as well, so scenes hand over rather than cut.
  scale *= 0.99 + outT * 0.01
  return { op, transform: `translate(${x}px, ${y}px) scale(${scale})` }
}

/** Word-by-word caption bar, like subtitles under the picture. */
function CaptionBar({ text, frame, cue }: { text: string; frame: number; cue: SlideCue }) {
  const local = frame - cue.startFrame
  const len   = cue.endFrame - cue.startFrame
  const words = text.split(' ').filter(Boolean)
  if (words.length === 0) return null

  const revealed = wordReveal(local, words.length, len)
  const op = Math.min(easeOut(local / 16), Math.max(1 - (local - (len - 12)) / 12, 0))

  // Size to the sentence so a long caption stays within its band instead of
  // growing upward into the illustration.
  const chars = text.length
  const fontSize = chars > 190 ? 21 : chars > 130 ? 23 : chars > 80 ? 25 : 28

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, height: 206,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: '0 84px 30px',
      background: 'linear-gradient(180deg, rgba(8,14,26,0) 0%, rgba(8,14,26,0.80) 42%, rgba(8,14,26,0.96) 100%)',
      opacity: op, zIndex: 12, pointerEvents: 'none',
    }}>
      <p style={{
        margin: 0, textAlign: 'center', fontFamily: FONT,
        fontSize, lineHeight: 1.4, fontWeight: 600, maxWidth: 1112,
        textShadow: '0 2px 18px rgba(0,0,0,0.85)',
      }}>
        {words.map((w, i) => (
          <span key={i} style={{
            color: i < revealed
              ? (i === revealed - 1 ? '#ffffff' : 'rgba(255,255,255,0.92)')
              : 'rgba(255,255,255,0.28)',
          }}>
            {w}{' '}
          </span>
        ))}
      </p>
    </div>
  )
}

/** One content scene: illustration on stage, narration captioned below. */
function StageSlide({ cue, frame, visual, index, badge }: {
  cue: SlideCue; frame: number; visual: SceneSpec | null
  index: number; badge?: string
}) {
  const local = frame - cue.startFrame
  const len   = cue.endFrame - cue.startFrame
  const kind  = TRANSITIONS[index % TRANSITIONS.length]
  const { op, transform } = stageMotion(local, len, kind)

  return (
    <AbsoluteFill>
      {/* Stage — the scene owns the full width above the caption band. No
          card chrome: a bordered box floating mid-frame made every scene look
          like the same slide with different contents inside it. */}
      <div style={{
        position: 'absolute', top: 48, left: 0, right: 0, bottom: 196,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          opacity: op, transform, transformOrigin: 'center center',
          width: '100%', height: '100%',
        }}>
          {visual && (
            <svg viewBox={`0 0 ${SW} ${SH}`} width="100%" height="100%"
              preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
              <FullScene spec={visual} localFrame={local} />
            </svg>
          )}
        </div>
      </div>

      {badge && (
        <div style={{
          position: 'absolute', top: 70, left: 52, opacity: easeOut(local / 18),
          display: 'inline-flex', alignItems: 'center', gap: 9,
          background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 24, padding: '7px 16px', zIndex: 13,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT }} />
          <span style={{ color: ACCENT, fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', fontFamily: FONT }}>
            {badge}
          </span>
        </div>
      )}

      <CaptionBar text={normaliseProse(cue.body || cue.meta || '')} frame={frame} cue={cue} />
    </AbsoluteFill>
  )
}

// ─── SLIDE: Intro ─────────────────────────────────────────────────────────────

function IntroSlide({ cue, frame, fps, moduleNumber, lessonNumber }: {
  cue: SlideCue; frame: number; fps: number
  moduleNumber: number; lessonNumber: number
}) {
  const f  = frame - cue.startFrame
  const op = slideOpacity(frame, cue)
  const sc = spring({ frame: f, fps, config: { damping: 14, stiffness: 70 } })

  const title  = fadeSlide(f, 0)
  const sub    = fadeSlide(f, 16, 20)
  const badge  = fadeSlide(f, 30, 18)
  const barW   = interpolate(f, [22, 65], [0, 260], { extrapolateLeft:'clamp', extrapolateRight:'clamp' })
  const scanX  = interpolate(f, [18, 65], [-2, 108], {
    extrapolateLeft:'clamp', extrapolateRight:'clamp',
  })

  return (
    <AbsoluteFill style={{ opacity: op }}>
      {/* Scan line */}
      <div style={{ position:'absolute', top:'50%', left:`${scanX}%`, width:2, height:140,
        background:'linear-gradient(180deg,transparent,#10b981,transparent)',
        transform:'translateY(-50%)', opacity:0.45 }} />

      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
        justifyContent:'center', padding:'0 88px', paddingTop:52 }}>
        {/* Module name */}
        <div style={{ opacity:sub.op, transform:`translateY(${sub.y}px)`,
          color:ACCENT, fontSize:14, fontWeight:700, letterSpacing:'0.18em',
          textTransform:'uppercase', fontFamily:FONT, marginBottom:18 }}>
          {cue.body}
        </div>

        {/* Lesson title */}
        <div style={{ opacity:Math.min(sc,1),
          transform:`scale(${0.93+sc*0.07}) translateY(${(1-sc)*28}px)`,
          color:'#fff', fontSize:58, fontWeight:800, lineHeight:1.1,
          maxWidth:'72%', textShadow:'0 4px 40px rgba(0,0,0,0.7)', fontFamily:FONT }}>
          {cue.heading}
        </div>

        {/* Accent bar */}
        <div style={{ marginTop:26, height:4, width:barW,
          background:'linear-gradient(90deg,#10b981,#34d399)', borderRadius:2 }} />

        {/* Module / lesson badge */}
        <div style={{ marginTop:22, opacity:badge.op, transform:`translateY(${badge.y}px)`,
          display:'inline-flex', alignItems:'center', gap:10,
          background:'rgba(16,185,129,0.10)', border:'1px solid rgba(16,185,129,0.28)',
          borderRadius:28, padding:'8px 20px', width:'fit-content' }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#10b981' }} />
          <span style={{ color:'#10b981', fontSize:12, fontWeight:700,
            letterSpacing:'0.1em', fontFamily:FONT }}>
            MODULE {moduleNumber} · LESSON {lessonNumber}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  )
}

// ─── SLIDE: Section header ────────────────────────────────────────────────────

function SectionHeaderSlide({ cue, frame, fps, sectionIndex }: {
  cue: SlideCue; frame: number; fps: number; sectionIndex: number
}) {
  const f   = frame - cue.startFrame
  const op  = slideOpacity(frame, cue)
  const sc  = spring({ frame: f, fps, config: { damping: 14, stiffness: 80 } })
  const bar = interpolate(f, [12, 48], [0, 1], { extrapolateLeft:'clamp', extrapolateRight:'clamp' })

  const isKeyTakeaways = cue.heading === 'Key Takeaways'
  const isKeyTerms     = cue.heading === 'Key Terms'
  const accent = isKeyTakeaways ? ACCENT_WARM : isKeyTerms ? ACCENT_COOL : ACCENT
  const label  = isKeyTakeaways ? 'SUMMARY' : isKeyTerms ? 'VOCABULARY' : 'SECTION'

  return (
    <AbsoluteFill style={{ opacity:op, display:'flex', flexDirection:'column',
      justifyContent:'center', alignItems:'center' }}>
      {/* Ghost number */}
      <div style={{ position:'absolute', opacity:0.05, fontSize:220, fontWeight:900,
        color:accent, lineHeight:1, userSelect:'none', pointerEvents:'none',
        top:'50%', left:'50%', transform:'translate(-50%,-50%)' }}>
        {isKeyTakeaways ? '★' : isKeyTerms ? '≡' : sectionIndex + 1}
      </div>

      <div style={{ textAlign:'center', padding:'0 80px' }}>
        <div style={{ opacity:Math.min(sc,1), color:accent, fontSize:11, fontWeight:800,
          letterSpacing:'0.26em', textTransform:'uppercase', fontFamily:FONT, marginBottom:14 }}>
          {label}
        </div>
        <div style={{ opacity:Math.min(sc,1), transform:`scale(${0.9+sc*0.1})`,
          color:'#fff', fontSize:50, fontWeight:800, lineHeight:1.15,
          textShadow:'0 4px 32px rgba(0,0,0,0.5)', fontFamily:FONT }}>
          {cue.heading}
        </div>
        <div style={{ margin:'20px auto 0', height:3,
          width:`${bar * 200}px`,
          background:`linear-gradient(90deg,transparent,${accent},transparent)`,
          borderRadius:2 }} />
      </div>
    </AbsoluteFill>
  )
}

// ─── SLIDE: Outro ─────────────────────────────────────────────────────────────

function OutroSlide({ cue, frame, fps }: { cue: SlideCue; frame: number; fps: number }) {
  const f  = frame - cue.startFrame
  const op = Math.min(f / 18, 1)
  const sc = spring({ frame: f, fps, config: { damping: 10, stiffness: 50 } })

  const msg1 = fadeSlide(f, 20, 18)
  const msg2 = fadeSlide(f, 36, 18)
  const msg3 = fadeSlide(f, 52, 18)

  return (
    <AbsoluteFill style={{ opacity:op, display:'flex', flexDirection:'column',
      justifyContent:'center', alignItems:'center' }}>
      {/* Check icon */}
      <div style={{ width:90, height:90, borderRadius:'50%',
        background:'rgba(16,185,129,0.13)', border:'2px solid rgba(16,185,129,0.4)',
        display:'flex', alignItems:'center', justifyContent:'center',
        opacity:Math.min(sc,1), transform:`scale(${0.55+sc*0.45})` }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div style={{ marginTop:28, textAlign:'center', padding:'0 80px' }}>
        <div style={{ color:ACCENT, fontSize:12, fontWeight:700, letterSpacing:'0.22em',
          textTransform:'uppercase', marginBottom:14, fontFamily:FONT,
          opacity:msg1.op, transform:`translateY(${msg1.y}px)` }}>
          Lesson Complete
        </div>
        <div style={{ color:'#fff', fontSize:38, fontWeight:800, lineHeight:1.18,
          marginBottom:14, fontFamily:FONT,
          opacity:msg2.op, transform:`translateY(${msg2.y}px)` }}>
          {cue.heading}
        </div>
        <div style={{ color:ACCENT, fontSize:16, fontFamily:FONT,
          opacity:msg3.op, transform:`translateY(${msg3.y}px)` }}>
          Take the quiz to test your knowledge →
        </div>
      </div>
    </AbsoluteFill>
  )
}

// ─── Main composition ─────────────────────────────────────────────────────────

export const LessonVideo: React.FC<LessonVideoProps> = ({
  lessonTitle,
  moduleTitle,
  moduleNumber,
  lessonNumber,
  cuePoints: cuePointsProp,
  audioUrl,
  keyPoints = [],
  terms     = [],
  accentColor,
  frameOverride,
}) => {
  const liveFrame = useCurrentFrame()
  const frame = frameOverride ?? liveFrame
  const { fps, durationInFrames } = useVideoConfig()

  // Build fallback timeline if no cue points provided
  const cuePoints = useMemo(
    () => cuePointsProp && cuePointsProp.length > 0
      ? cuePointsProp
      : buildFallbackCues(lessonTitle, moduleTitle, keyPoints, terms),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(cuePointsProp), lessonTitle, moduleTitle],
  )

  // One illustration per cue, matched by keyword. Computed once for the whole
  // timeline rather than per slide, because the matcher needs to see the
  // sequence to avoid showing the same chart on consecutive slides.
  // One bespoke card per scene, composed from that scene's own wording.
  const visualPicks = useMemo(
    () => buildSceneSpecs(
      cuePoints, bestDiagram, VARIANT_COUNTS,
      cue => artFor(lessonTitle, `${cue.heading ?? ''} ${cue.body ?? ''}`),
    ),
    [cuePoints, lessonTitle],
  )

  // ── Audio preload gate ────────────────────────────────────────────────────
  const [audioHandle] = useState(() =>
    audioUrl ? delayRender('Waiting for lesson audio') : null,
  )

  useEffect(() => {
    if (!audioHandle) return
    const a = new window.Audio()
    const done = () => continueRender(audioHandle)
    a.addEventListener('canplaythrough', done, { once: true })
    a.addEventListener('error', done, { once: true })
    a.src = resolveAudio(audioUrl!)
    a.load()
    return () => { a.removeEventListener('canplaythrough', done); a.removeEventListener('error', done) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Active slide ─────────────────────────────────────────────────────────
  const activeIdx = Math.max(cuePoints.findLastIndex(c => frame >= c.startFrame), 0)
  const activeCue = cuePoints[activeIdx] ?? cuePoints[0]
  const activeVisual = visualPicks[activeIdx] ?? null

  // Backdrops are reserved for the scenes a drawn chart serves least: the
  // intro and outro, and prose with no structure to illustrate. Planned for
  // the whole lesson at once so the same photo can't run back to back.
  const backdropPlan = useMemo(
    () => buildBackdropPlan(cuePoints.map((c, i) => {
      const bookend = c.type === 'intro' || c.type === 'outro'
      return {
        text: `${c.heading ?? ''} ${c.body ?? ''} ${lessonTitle} ${moduleTitle}`,
        allow: bookend || visualPicks[i]?.layout === 'quote',
        bookend,
        fallbackKey: `${moduleTitle}|${lessonTitle}`,
      }
    })),
    [cuePoints, visualPicks, lessonTitle, moduleTitle],
  )
  const activeBackdrop = backdropPlan[activeIdx] ?? null

  // Section counters (for section headers and slide context)
  const sectionHeaders = cuePoints.filter(c => c.type === 'section-header')
  const sectionIdx     = sectionHeaders.findLastIndex(c => frame >= c.startFrame)

  const keyPointCues = cuePoints.filter(c => c.type === 'keypoint')
  const termCues     = cuePoints.filter(c => c.type === 'term')

  // The section heading is often the lesson title verbatim; printing both
  // sides of the breadcrumb then reads as a duplication bug.
  const rawSection = activeCue.type === 'intro' || activeCue.type === 'outro'
    ? ''
    : activeCue.heading
  const currentSectionName =
    rawSection.trim().toLowerCase() === lessonTitle.trim().toLowerCase() ? '' : rawSection

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      {/* Audio narration */}
      {audioUrl && (
        <Audio src={resolveAudio(audioUrl)} startFrom={0} volume={1} pauseWhenBuffering />
      )}

      <Background frame={frame} />
      {activeBackdrop && (
        <SceneBackdrop file={activeBackdrop.file} frame={frame} cue={activeCue} />
      )}
      <ProgressBar frame={frame} total={durationInFrames} />
      <LessonHeader
        lessonTitle={lessonTitle}
        currentSection={currentSectionName}
        frame={frame}
        total={durationInFrames}
      />

      {/* ── Render active slide ── */}
      {activeCue.type === 'intro' && (
        <IntroSlide
          cue={activeCue} frame={frame} fps={fps}
          moduleNumber={moduleNumber} lessonNumber={lessonNumber}
        />
      )}

      {activeCue.type === 'section-header' && (
        <SectionHeaderSlide
          cue={activeCue} frame={frame} fps={fps}
          sectionIndex={Math.max(sectionIdx, 0)}
        />
      )}

      {(activeCue.type === 'paragraph' || activeCue.type === 'keypoint' || activeCue.type === 'term') && (
        <StageSlide
          cue={activeCue}
          frame={frame}
          visual={activeVisual}
          index={activeIdx}
          badge={
            activeCue.type === 'keypoint'
              ? `KEY POINT ${activeCue.heading}`
              : activeCue.type === 'term'
                ? `TERM · ${activeCue.heading}`
                : undefined
          }
        />
      )}

      {activeCue.type === 'outro' && (
        <OutroSlide cue={activeCue} frame={frame} fps={fps} />
      )}
    </AbsoluteFill>
  )
}
