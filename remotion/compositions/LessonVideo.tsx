// remotion/compositions/LessonVideo.tsx
import {
  AbsoluteFill,
  Audio,
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

// ─── SLIDE: Paragraph ─────────────────────────────────────────────────────────

function ParagraphSlide({ cue, frame }: { cue: SlideCue; frame: number }) {
  const f      = frame - cue.startFrame
  const op     = slideOpacity(frame, cue)
  const dur    = cue.endFrame - cue.startFrame

  const header = fadeSlide(f, 0, 16)
  const text   = fadeSlide(f, 12, 22)

  const isSubHeading = cue.heading === 'Caution'
  const accent = isSubHeading ? ACCENT_WARM : ACCENT

  const words    = cue.body.split(' ')
  const revealed = wordReveal(f, words.length, dur)

  // Animated circle (decorative right-hand element)
  const circleLen = interpolate(f, [0, 100], [0, 754], { extrapolateLeft:'clamp', extrapolateRight:'clamp' })

  return (
    <AbsoluteFill style={{ opacity:op }}>
      {/* Decorative ring */}
      <div style={{ position:'absolute', right:48, top:'50%', transform:'translateY(-50%)', opacity:0.05 }}>
        <svg width="280" height="280" viewBox="0 0 280 280">
          <circle cx="140" cy="140" r="130" stroke={accent} strokeWidth="1" fill="none"
            strokeDasharray={`${circleLen} 817`} />
          <circle cx="140" cy="140" r="86" stroke={accent} strokeWidth="0.6" fill="none" opacity="0.6" />
        </svg>
      </div>

      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
        justifyContent:'center', padding:'0 88px', paddingTop:52 }}>
        {/* Section chip */}
        <div style={{ opacity:header.op, transform:`translateY(${header.y}px)`,
          display:'inline-flex', alignItems:'center', gap:10, marginBottom:26 }}>
          <div style={{ width:3, height:20, background:accent, borderRadius:2 }} />
          <span style={{ color: isSubHeading ? ACCENT_WARM : '#6ee7b7',
            fontSize:12, fontWeight:700, letterSpacing:'0.1em',
            textTransform:'uppercase', fontFamily:FONT }}>
            {cue.heading}
          </span>
        </div>

        {/* Body text with word-by-word reveal */}
        <div style={{ opacity:text.op, transform:`translateY(${text.y}px)`,
          color:'rgba(255,255,255,0.90)', fontSize:28, lineHeight:1.72,
          maxWidth:'78%', fontWeight:400, fontFamily:FONT }}>
          {words.map((word, i) => (
            <span key={i} style={{
              opacity: i < revealed ? 1 : 0.07,
              color:   i < revealed ? (i === revealed - 1 ? '#e2e8f0' : 'rgba(255,255,255,0.86)') : 'transparent',
            }}>
              {word}{' '}
            </span>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  )
}

// ─── SLIDE: Key point ─────────────────────────────────────────────────────────

function KeyPointSlide({ cue, frame, fps, totalPoints }: {
  cue: SlideCue; frame: number; fps: number; totalPoints: number
}) {
  const f   = frame - cue.startFrame
  const op  = slideOpacity(frame, cue)
  const sc  = spring({ frame: f, fps, config: { damping: 12, stiffness: 60 } })
  const dur = cue.endFrame - cue.startFrame

  const num  = fadeSlide(f, 0, 14)
  const txt  = fadeSlide(f, 14, 22)
  const meta = fadeSlide(f, 26, 20)

  const pointNum = parseInt(cue.heading, 10)

  const words    = cue.body.split(' ')
  const revealed = wordReveal(f, words.length, dur)

  return (
    <AbsoluteFill style={{ opacity:op }}>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center',
        padding:'0 88px', paddingTop:52, gap:52 }}>
        {/* Large number */}
        <div style={{ opacity:num.op, transform:`scale(${0.65+sc*0.35})`,
          color:ACCENT, fontSize:128, fontWeight:900, lineHeight:1,
          flexShrink:0, textShadow:`0 0 60px rgba(29,158,117,0.5)`, fontFamily:FONT }}>
          {cue.heading}
        </div>

        <div style={{ flex:1 }}>
          <div style={{ color:'#6ee7b7', fontSize:11, fontWeight:700,
            letterSpacing:'0.22em', textTransform:'uppercase',
            fontFamily:FONT, marginBottom:16, opacity:txt.op }}>
            Key Point
          </div>

          <div style={{ color:'#fff', fontSize:30, fontWeight:600,
            lineHeight:1.55, fontFamily:FONT, transform:`translateY(${txt.y}px)` }}>
            {words.map((word, i) => (
              <span key={i} style={{ opacity: i < revealed ? 1 : 0.08 }}>
                {word}{' '}
              </span>
            ))}
          </div>

          {cue.meta && (
            <div style={{ opacity:meta.op, transform:`translateY(${meta.y}px)`,
              color:'rgba(255,255,255,0.55)', fontSize:18, lineHeight:1.6,
              fontFamily:FONT, marginTop:18,
              borderLeft:`3px solid ${ACCENT}`, paddingLeft:16 }}>
              {cue.meta}
            </div>
          )}

          {/* Progress dots */}
          <div style={{ display:'flex', gap:8, marginTop:24 }}>
            {Array.from({ length: totalPoints }).map((_, i) => (
              <div key={i} style={{ width: i === pointNum - 1 ? 20 : 7,
                height:7, borderRadius:3,
                background: i < pointNum ? ACCENT : 'rgba(255,255,255,0.15)',
                boxShadow: i < pointNum ? `0 0 8px rgba(29,158,117,0.6)` : 'none' }} />
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}

// ─── SLIDE: Term ─────────────────────────────────────────────────────────────

function TermSlide({ cue, frame, fps, termIndex, totalTerms }: {
  cue: SlideCue; frame: number; fps: number; termIndex: number; totalTerms: number
}) {
  const f   = frame - cue.startFrame
  const op  = slideOpacity(frame, cue)
  const sc  = spring({ frame: f, fps, config: { damping: 13, stiffness: 75 } })
  const dur = cue.endFrame - cue.startFrame

  const word = fadeSlide(f, 0, 18)
  const def  = fadeSlide(f, 18, 24)
  const barW = interpolate(f, [14, 55], [0, 100], { extrapolateLeft:'clamp', extrapolateRight:'clamp' })

  const defWords = cue.body.split(' ')
  const revealed = wordReveal(f, defWords.length, dur)

  return (
    <AbsoluteFill style={{ opacity:op, display:'flex', flexDirection:'column',
      justifyContent:'center', alignItems:'center' }}>
      <div style={{ width:'64%', opacity:Math.min(sc,1), transform:`scale(${0.92+sc*0.08})`,
        background:'rgba(255,255,255,0.038)', border:`1px solid rgba(147,197,253,0.22)`,
        borderRadius:20, padding:'44px 52px' }}>
        {/* Counter */}
        <div style={{ color:ACCENT_COOL, fontSize:10, fontWeight:800,
          letterSpacing:'0.24em', textTransform:'uppercase',
          marginBottom:14, opacity:word.op, fontFamily:FONT }}>
          TERM {termIndex + 1} OF {totalTerms}
        </div>

        {/* Word */}
        <div style={{ color:'#fff', fontSize:46, fontWeight:800,
          marginBottom: cue.body ? 22 : 0,
          opacity:word.op, transform:`translateY(${word.y}px)`,
          textShadow:`0 0 40px rgba(147,197,253,0.35)`, fontFamily:FONT }}>
          {cue.heading}
        </div>

        {/* Definition word-reveal */}
        {cue.body && (
          <div style={{ color:'rgba(255,255,255,0.72)', fontSize:22,
            lineHeight:1.65, opacity:def.op,
            transform:`translateY(${def.y}px)`, fontFamily:FONT }}>
            {defWords.map((word, i) => (
              <span key={i} style={{ opacity: i < revealed ? 1 : 0.08 }}>
                {word}{' '}
              </span>
            ))}
          </div>
        )}

        {/* Accent line */}
        <div style={{ marginTop:28, height:2,
          width:`${barW}%`,
          background:`linear-gradient(90deg, ${ACCENT_COOL}, rgba(147,197,253,0.15))`,
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
}) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  // Build fallback timeline if no cue points provided
  const cuePoints = useMemo(
    () => cuePointsProp && cuePointsProp.length > 0
      ? cuePointsProp
      : buildFallbackCues(lessonTitle, moduleTitle, keyPoints, terms),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(cuePointsProp), lessonTitle, moduleTitle],
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
  const activeCue = cuePoints.findLast(c => frame >= c.startFrame) ?? cuePoints[0]

  // Section counters (for section headers and slide context)
  const sectionHeaders = cuePoints.filter(c => c.type === 'section-header')
  const sectionIdx     = sectionHeaders.findLastIndex(c => frame >= c.startFrame)

  const keyPointCues = cuePoints.filter(c => c.type === 'keypoint')
  const termCues     = cuePoints.filter(c => c.type === 'term')

  const currentSectionName = activeCue.type === 'intro' || activeCue.type === 'outro'
    ? ''
    : activeCue.type === 'section-header'
      ? activeCue.heading
      : activeCue.heading  // heading = parent section for paragraph/keypoint/term

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      {/* Audio narration */}
      {audioUrl && (
        <Audio src={resolveAudio(audioUrl)} startFrom={0} volume={1} pauseWhenBuffering />
      )}

      <Background frame={frame} />
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

      {activeCue.type === 'paragraph' && (
        <ParagraphSlide cue={activeCue} frame={frame} />
      )}

      {activeCue.type === 'keypoint' && (
        <KeyPointSlide
          cue={activeCue} frame={frame} fps={fps}
          totalPoints={keyPointCues.length}
        />
      )}

      {activeCue.type === 'term' && (() => {
        const termIdx = termCues.findIndex(c => c.startFrame === activeCue.startFrame)
        return (
          <TermSlide
            cue={activeCue} frame={frame} fps={fps}
            termIndex={Math.max(termIdx, 0)}
            totalTerms={termCues.length}
          />
        )
      })()}

      {activeCue.type === 'outro' && (
        <OutroSlide cue={activeCue} frame={frame} fps={fps} />
      )}
    </AbsoluteFill>
  )
}
