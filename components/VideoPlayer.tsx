'use client'

import { useState, useEffect, useRef } from 'react'
import { Player, type PlayerRef } from '@remotion/player'
import { LessonVideo, type SlideCue } from '@/remotion/compositions/LessonVideo'

interface VideoPlayerProps {
  lessonId:     string
  lessonTitle:  string
  moduleTitle:  string
  moduleNumber: number
  lessonNumber: number
  lessonContent?: string
  accentColor?:   string
  onVideoEnd?:    () => void
}

type LoadState = 'loading' | 'cached' | 'generating' | 'ready' | 'no-audio' | 'error'

export default function VideoPlayer({
  lessonId,
  lessonTitle,
  moduleTitle,
  moduleNumber,
  lessonNumber,
  lessonContent = '',
  accentColor,
  onVideoEnd,
}: VideoPlayerProps) {
  const [audioUrl,    setAudioUrl]    = useState<string | undefined>()
  const [cuePoints,   setCuePoints]   = useState<SlideCue[]>([])
  const [totalFrames, setTotalFrames] = useState(900)
  const [loadState,   setLoadState]   = useState<LoadState>('loading')
  const [errorMsg,    setErrorMsg]    = useState('')

  const playerRef    = useRef<PlayerRef>(null)
  // Keep a stable ref to onVideoEnd so the subscription handler never goes stale
  const onVideoEndRef = useRef(onVideoEnd)
  useEffect(() => { onVideoEndRef.current = onVideoEnd }, [onVideoEnd])

  useEffect(() => {
    let cancelled = false
    setLoadState('loading')
    setAudioUrl(undefined)
    setCuePoints([])

    async function load() {
      // ── Step 1: fast cache lookup ─────────────────────────────────────────
      try {
        const cached = await fetch(`/api/lesson-media/${lessonId}`).then(r => r.json())
        if (!cancelled && cached.cached) {
          setAudioUrl(cached.audioUrl)
          setCuePoints(cached.cuePoints)
          setTotalFrames(cached.totalFrames)
          setLoadState('cached')
          return
        }
      } catch { /* not cached, continue */ }

      if (cancelled) return

      // ── Step 2: generate on demand ────────────────────────────────────────
      setLoadState('generating')
      try {
        const data = await fetch('/api/generate-audio', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId, lessonTitle, moduleTitle, lessonContent }),
        }).then(r => r.json())

        if (cancelled) return
        if (data.url) setAudioUrl(data.url)
        if (data.cuePoints?.length) setCuePoints(data.cuePoints)
        if (data.totalFrames) setTotalFrames(data.totalFrames)

        if (data.error && !data.url) { setErrorMsg(data.error); setLoadState('no-audio') }
        else setLoadState('ready')
      } catch (err) {
        if (!cancelled) { setErrorMsg(String(err)); setLoadState('error') }
      }
    }

    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId])

  // Re-subscribe to 'ended' every time the Player remounts (key changes when audioUrl/cuePoints change)
  // Using a post-render effect so playerRef.current is always the freshly-mounted instance
  useEffect(() => {
    // Small timeout lets Remotion finish mounting and attach the emitter
    const t = setTimeout(() => {
      const player = playerRef.current
      if (!player) return
      const handler = () => { onVideoEndRef.current?.() }
      player.addEventListener('ended', handler)
      // Cleanup stored so we can remove it on next remount
      return () => player.removeEventListener('ended', handler)
    }, 100)
    return () => clearTimeout(t)
  // audioUrl and cuePoints.length mirror the Player's key — when they change the Player remounts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl, cuePoints.length])

  const inputProps = {
    lessonTitle, moduleTitle, moduleNumber, lessonNumber,
    cuePoints, audioUrl, accentColor,
  }

  return (
    <div className="w-full max-w-full rounded-xl overflow-hidden shadow-2xl bg-[#080e1a]">
      <Player
        ref={playerRef}
        key={`${audioUrl ?? 'x'}-${cuePoints.length}`}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={LessonVideo as any}
        inputProps={inputProps}
        durationInFrames={Math.max(totalFrames, 90)}
        fps={30}
        compositionWidth={1280}
        compositionHeight={720}
        style={{ width: '100%', aspectRatio: '16/9' }}
        controls
        loop={false}
        autoPlay
        acknowledgeRemotionLicense
      />

      {/* Status strip */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-black/50 border-t border-white/5 text-xs select-none">
        {loadState === 'loading' && (
          <>
            <span className="w-2 h-2 rounded-full bg-gray-500 animate-pulse shrink-0" />
            <span className="text-gray-500">Checking cache…</span>
          </>
        )}
        {loadState === 'cached' && (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-emerald-300/70">
              Archer · {cuePoints.length} slides · {Math.round(totalFrames / 30)}s
            </span>
          </>
        )}
        {loadState === 'generating' && (
          <>
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
            <span className="text-yellow-300/70">Generating Archer narration…</span>
          </>
        )}
        {loadState === 'ready' && (
          <>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-emerald-300/70">
              Archer · {cuePoints.length} slides · {Math.round(totalFrames / 30)}s · saved for all students
            </span>
          </>
        )}
        {loadState === 'no-audio' && (
          <>
            <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
            <span className="text-sky-300/60">
              {cuePoints.length} slides · visual only · {errorMsg.includes('API_KEY') ? 'add ELEVENLABS_API_KEY' : errorMsg}
            </span>
          </>
        )}
        {loadState === 'error' && (
          <>
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <span className="text-red-300/60 truncate">{errorMsg}</span>
          </>
        )}
      </div>
    </div>
  )
}
