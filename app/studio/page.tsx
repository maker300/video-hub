'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { PlayerRef } from '@remotion/player'
import {
  LogOut, Save, Download, Play, Pause, ZoomIn, ZoomOut,
  Upload, Plus, X, Trash2, Film, Layers, Music, Image as ImageIcon,
  Loader2, Check, AlertCircle, FolderOpen,
} from 'lucide-react'
import type {
  PromoVideoProps, TimelineClip, MediaFile, SceneType, ObjectShape,
  VideoObject, EntranceAnim, MotionAnim, ExitAnim,
} from '@/remotion/compositions/PromoVideo'
import { dbSaveMedia, dbLoadAllMedia, dbDeleteMedia } from '@/lib/mediaDB'

// ── Dynamic imports ───────────────────────────────────────────────────────────

const RemotionPlayer = dynamic(
  () => import('@remotion/player').then(m => m.Player),
  { ssr: false }
)

const PromoVideoComp = dynamic(
  () => import('@/remotion/compositions/PromoVideo').then(m => m.PromoVideo),
  { ssr: false }
)

// ── Constants ─────────────────────────────────────────────────────────────────

const FPS = 30

const PLACEHOLDER_CLIPS: TimelineClip[] = [{
  id: '__placeholder__',
  track: 'main',
  startFrame: 0,
  durationFrames: 300,
  clipType: 'scene',
  scene: {
    id: '__placeholder__',
    type: 'hook',
    headline: 'Video Hub',
    subtext: 'Add scenes, media, or objects to the timeline',
    duration: 10,
  },
}]
const LABEL_WIDTH = 56
const TRACK_HEIGHTS: Record<string, number> = { main: 48, overlay: 42, overlay2: 42, audio: 38 }
const SCENE_TYPES: SceneType[] = [
  'hook','problem','solution','stat','feature','cta',
  'typewriter','reveal','quote','announcement',
  'bullet','question','glitch','split','countdown','testimonial',
]
const SHAPE_LABELS: Record<string, string> = {
  circle:'● Circle', rect:'■ Rect', line:'— Line', triangle:'▲ Triangle',
  pentagon:'⬠ Pentagon', star:'★ Star', arrow:'➤ Arrow',
  hexagon:'⬡ Hexagon', diamond:'◆ Diamond', ring:'○ Ring',
  text:'T Text',
}
const SHAPES = Object.keys(SHAPE_LABELS) as ObjectShape[]
const CLIP_COLORS: Record<string, string> = {
  scene:'bg-emerald-700/90', image:'bg-blue-700/90', video:'bg-violet-700/90',
  shape:'bg-pink-700/90', audio:'bg-amber-700/90',
}
const SCENE_EMOJIS: Partial<Record<SceneType, string>> = {
  hook:'🎣', problem:'⚠️', solution:'✅', stat:'📊', feature:'⚡',
  cta:'🚀', typewriter:'⌨️', reveal:'🎬', quote:'💬', announcement:'📢',
  bullet:'📋', question:'❓', glitch:'⚡', split:'◧', countdown:'⏱️', testimonial:'⭐',
}

const ENTRANCE_LABELS: Record<EntranceAnim, string> = {
  none:'None', fade:'Fade In', slideLeft:'Slide from Left', slideRight:'Slide from Right',
  slideUp:'Slide from Top', slideDown:'Slide from Bottom', scaleIn:'Scale In', spinIn:'Spin In', bounceIn:'Bounce In',
}
const ENTRANCES: EntranceAnim[] = ['none','fade','slideLeft','slideRight','slideUp','slideDown','scaleIn','spinIn','bounceIn']

const MOTION_LABELS: Record<MotionAnim, string> = {
  none:'None', float:'Float', pulse:'Pulse', spin:'Spin', shake:'Shake', breathe:'Breathe',
  wave:'Wave', bounce:'Bounce', swing:'Swing', orbit:'Orbit', flicker:'Flicker', zoom:'Zoom',
}
const MOTIONS: MotionAnim[] = ['none','float','pulse','spin','shake','breathe','wave','bounce','swing','orbit','flicker','zoom']

const EXIT_LABELS: Record<ExitAnim, string> = {
  none:'None', fade:'Fade Out', slideLeft:'Slide Left', slideRight:'Slide Right', scaleOut:'Scale Out',
}
const EXITS: ExitAnim[] = ['none','fade','slideLeft','slideRight','scaleOut']

// ── Types ─────────────────────────────────────────────────────────────────────

type SideTab = 'media' | 'scenes' | 'objects' | 'audio'

type TrackId = 'main' | 'overlay' | 'overlay2' | 'audio'

type DragPayload =
  | { kind: 'scene'; sceneType: SceneType }
  | { kind: 'shape'; shape: ObjectShape }
  | { kind: 'media'; mediaId: string }
  | { kind: 'audio'; mediaId: string }

interface VideoProject {
  id:          string
  title:       string
  aspectRatio: '16:9' | '9:16'
  clips:       TimelineClip[]
  createdAt:   string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function aspectDims(ar: '16:9' | '9:16') {
  return ar === '9:16' ? { width: 1080, height: 1920 } : { width: 1280, height: 720 }
}

function totalDurationFrames(clips: TimelineClip[]): number {
  if (clips.length === 0) return 300
  return Math.max(...clips.map(c => c.startFrame + c.durationFrames))
}

function makeObject(): VideoObject {
  return {
    id: String(Date.now() + Math.random()),
    shape: 'circle',
    x: 50, y: 50, w: 15, h: 15,
    rotation: 0,
    fill: '#059669', stroke: '#34d399', strokeWidth: 2,
    opacity: 1,
    entrance: 'scaleIn', entranceDelay: 0, entranceDuration: 20,
    motion: 'none', motionSpeed: 1,
    exit: 'none', exitDelay: 10,
  }
}

function newSceneClip(sceneType: SceneType, startFrame: number): TimelineClip {
  return {
    id: String(Date.now() + Math.random()),
    track: 'main',
    startFrame,
    durationFrames: 4 * FPS,
    clipType: 'scene',
    scene: {
      id: String(Date.now() + Math.random()),
      type: sceneType,
      headline: sceneType.charAt(0).toUpperCase() + sceneType.slice(1) + ' Scene',
      duration: 4,
    },
  }
}

function newShapeClip(shape: ObjectShape, startFrame: number): TimelineClip {
  const base = { ...makeObject(), shape }
  if (shape === 'text') {
    base.text = 'Your Text'
    base.fontSize = 80
    base.fontWeight = 700
    base.fill = '#ffffff'
    base.stroke = '#000000'
    base.strokeWidth = 0
    base.w = 50
    base.h = 12
  }
  return {
    id: String(Date.now() + Math.random()),
    track: 'overlay',
    startFrame,
    durationFrames: 3 * FPS,
    clipType: 'shape',
    shape: base,
  }
}

function newMediaClip(media: MediaFile, startFrame: number): TimelineClip {
  return {
    id: String(Date.now() + Math.random()),
    track: 'main',
    startFrame,
    durationFrames: media.type === 'image' ? 5 * FPS : 5 * FPS,
    clipType: media.type === 'image' ? 'image' : 'video',
    media,
  }
}

function newAudioClip(media: MediaFile, startFrame: number): TimelineClip {
  return {
    id: String(Date.now() + Math.random()),
    track: 'audio',
    startFrame,
    durationFrames: 10 * FPS,
    clipType: 'audio',
    media,
  }
}

// ── ObjectEditor component ────────────────────────────────────────────────────

function ObjectEditor({ obj, onChange, onDelete }: {
  obj:      VideoObject
  onChange: (o: VideoObject) => void
  onDelete: () => void
}) {
  const set = (patch: Partial<VideoObject>) => onChange({ ...obj, ...patch })
  const labelCls = 'text-[10px] text-gray-500 font-medium mb-0.5 block'
  const inputCls = 'w-full bg-[#070d1a] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50'
  const numCls   = 'bg-[#070d1a] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50 w-full'

  return (
    <div className="border border-white/8 rounded-xl p-3 space-y-3 bg-black/20">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-emerald-400">{SHAPE_LABELS[obj.shape]}</span>
        <div className="flex-1" />
        <button onClick={onDelete} className="text-gray-600 hover:text-red-400 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div>
        <label className={labelCls}>Shape</label>
        <div className="grid grid-cols-5 gap-1">
          {SHAPES.map(s => (
            <button
              key={s}
              onClick={() => set({ shape: s })}
              title={SHAPE_LABELS[s]}
              className={`py-1.5 rounded-lg text-sm transition-all border ${
                obj.shape === s
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'border-white/8 text-gray-400 hover:border-white/20 hover:text-white'
              }`}
            >
              {SHAPE_LABELS[s].split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {obj.shape === 'text' && (
        <div className="space-y-2">
          <div>
            <label className={labelCls}>Text Content</label>
            <textarea
              rows={2}
              value={obj.text ?? ''}
              onChange={e => set({ text: e.target.value })}
              placeholder="Enter text…"
              className={inputCls + ' resize-none'}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className={labelCls}>Font Size (px)</label>
              <input type="number" min={10} max={400} value={obj.fontSize ?? 80} onChange={e => set({ fontSize: +e.target.value })} className={numCls} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Font Weight</label>
              <select value={obj.fontWeight ?? 700} onChange={e => set({ fontWeight: +e.target.value })} className={inputCls}>
                <option value={300}>Light (300)</option>
                <option value={400}>Regular (400)</option>
                <option value={600}>Semi-Bold (600)</option>
                <option value={700}>Bold (700)</option>
                <option value={800}>Extra-Bold (800)</option>
                <option value={900}>Black (900)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label className={labelCls}>Position X%</label>
          <input type="number" min={0} max={100} value={obj.x} onChange={e => set({ x: +e.target.value })} className={numCls} />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Position Y%</label>
          <input type="number" min={0} max={100} value={obj.y} onChange={e => set({ y: +e.target.value })} className={numCls} />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Width%</label>
          <input type="number" min={1} max={100} value={obj.w} onChange={e => set({ w: +e.target.value })} className={numCls} />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Height%</label>
          <input type="number" min={1} max={100} value={obj.h} onChange={e => set({ h: +e.target.value })} className={numCls} />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Rotation°</label>
          <input type="number" min={-360} max={360} value={obj.rotation} onChange={e => set({ rotation: +e.target.value })} className={numCls} />
        </div>
        <div className="space-y-1.5">
          <label className={labelCls}>Opacity</label>
          <input type="range" min={0} max={1} step={0.05} value={obj.opacity} onChange={e => set({ opacity: +e.target.value })} className="w-full accent-emerald-500 mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={labelCls}>Fill</label>
          <input type="color" value={obj.fill} onChange={e => set({ fill: e.target.value })}
            className="w-full h-8 rounded-lg cursor-pointer border border-white/10 bg-transparent" />
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Stroke Color</label>
          <input type="color" value={obj.stroke} onChange={e => set({ stroke: e.target.value })}
            className="w-full h-8 rounded-lg cursor-pointer border border-white/10 bg-transparent" />
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Stroke Width</label>
          <input type="number" min={0} max={20} value={obj.strokeWidth} onChange={e => set({ strokeWidth: +e.target.value })} className={numCls} />
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Stroke Dash <span className="text-white">{obj.strokeDash ?? 0}</span></label>
          <input type="range" min={0} max={30} step={1} value={obj.strokeDash ?? 0}
            onChange={e => set({ strokeDash: +e.target.value })}
            className="w-full accent-emerald-500 mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 space-y-1">
          <label className={labelCls}>Entrance Animation</label>
          <select value={obj.entrance} onChange={e => set({ entrance: e.target.value as EntranceAnim })} className={inputCls}>
            {ENTRANCES.map(a => <option key={a} value={a}>{ENTRANCE_LABELS[a]}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Delay (frames)</label>
          <input type="number" min={0} max={120} value={obj.entranceDelay} onChange={e => set({ entranceDelay: +e.target.value })} className={numCls} />
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Duration (frames)</label>
          <input type="number" min={1} max={90} value={obj.entranceDuration} onChange={e => set({ entranceDuration: +e.target.value })} className={numCls} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={labelCls}>Motion Effect</label>
          <select value={obj.motion} onChange={e => set({ motion: e.target.value as MotionAnim })} className={inputCls}>
            {MOTIONS.map(a => <option key={a} value={a}>{MOTION_LABELS[a]}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Speed</label>
          <input type="range" min={0.2} max={4} step={0.1} value={obj.motionSpeed} onChange={e => set({ motionSpeed: +e.target.value })}
            className="w-full accent-emerald-500 mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={labelCls}>Exit Animation</label>
          <select value={obj.exit} onChange={e => set({ exit: e.target.value as ExitAnim })} className={inputCls}>
            {EXITS.map(a => <option key={a} value={a}>{EXIT_LABELS[a]}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Exit Delay (fr from end)</label>
          <input type="number" min={0} max={120} value={obj.exitDelay} onChange={e => set({ exitDelay: +e.target.value })} className={numCls} />
        </div>
      </div>
    </div>
  )
}

// ── Properties panel ──────────────────────────────────────────────────────────

function PropertiesPanel({
  clip,
  onUpdate,
  onClose,
}: {
  clip: TimelineClip
  onUpdate: (c: TimelineClip) => void
  onClose: () => void
}) {
  const inputCls = 'w-full bg-[#070d1a] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50'
  const labelCls = 'text-[10px] text-gray-500 font-medium mb-0.5 block'

  function setClip(patch: Partial<TimelineClip>) {
    onUpdate({ ...clip, ...patch })
  }
  function setScene(patch: Partial<NonNullable<TimelineClip['scene']>>) {
    if (!clip.scene) return
    setClip({ scene: { ...clip.scene, ...patch } })
  }

  const durationSec = Math.round(clip.durationFrames / FPS * 10) / 10

  return (
    <div className="w-[280px] shrink-0 bg-[#0a1020] border-l border-white/8 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
        <span className="text-xs font-bold text-white">Properties</span>
        <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">

        {/* Scene clip */}
        {clip.clipType === 'scene' && clip.scene && (
          <>
            <div>
              <label className={labelCls}>Scene Type</label>
              <select
                value={clip.scene.type}
                onChange={e => setScene({ type: e.target.value as SceneType })}
                className={inputCls}
              >
                {SCENE_TYPES.map(t => (
                  <option key={t} value={t}>{SCENE_EMOJIS[t] ?? ''} {t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Section Title</label>
              <input
                type="text"
                value={clip.scene.sectionTitle ?? ''}
                onChange={e => setScene({ sectionTitle: e.target.value || undefined })}
                placeholder="Optional header label"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Headline</label>
              <textarea
                value={clip.scene.headline}
                onChange={e => setScene({ headline: e.target.value })}
                rows={2}
                className={inputCls + ' resize-none'}
              />
            </div>
            <div>
              <label className={labelCls}>Subtext</label>
              <input
                type="text"
                value={clip.scene.subtext ?? ''}
                onChange={e => setScene({ subtext: e.target.value || undefined })}
                placeholder="Supporting line"
                className={inputCls}
              />
            </div>
            {(clip.scene.type === 'stat' || clip.scene.type === 'split') && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Value</label>
                  <input type="text" value={clip.scene.value ?? ''} onChange={e => setScene({ value: e.target.value || undefined })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Label</label>
                  <input type="text" value={clip.scene.label ?? ''} onChange={e => setScene({ label: e.target.value || undefined })} className={inputCls} />
                </div>
              </div>
            )}
            <div>
              <label className={labelCls}>
                Opacity: <span className="text-white">{Math.round((clip.scene.opacity ?? 1) * 100)}%</span>
              </label>
              <input
                type="range" min={0} max={1} step={0.05}
                value={clip.scene.opacity ?? 1}
                onChange={e => setScene({ opacity: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>
            <div>
              <label className={labelCls}>Duration: <span className="text-white">{durationSec}s</span></label>
              <input
                type="range" min={2} max={12} step={0.5}
                value={durationSec}
                onChange={e => {
                  const s = parseFloat(e.target.value)
                  setClip({ durationFrames: Math.round(s * FPS), scene: { ...clip.scene!, duration: s } })
                }}
                className="w-full accent-emerald-500"
              />
            </div>
            {/* Objects */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelCls}>Shape Objects ({(clip.scene.objects ?? []).length})</label>
                <button
                  onClick={() => setScene({ objects: [...(clip.scene!.objects ?? []), makeObject()] })}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 px-2 py-1 rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />Add
                </button>
              </div>
              <div className="space-y-2">
                {(clip.scene.objects ?? []).map((obj, oi) => (
                  <ObjectEditor
                    key={obj.id}
                    obj={obj}
                    onChange={updated => {
                      const objs = [...(clip.scene!.objects ?? [])]
                      objs[oi] = updated
                      setScene({ objects: objs })
                    }}
                    onDelete={() => {
                      const objs = (clip.scene!.objects ?? []).filter((_, j) => j !== oi)
                      setScene({ objects: objs })
                    }}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Shape clip */}
        {clip.clipType === 'shape' && clip.shape && (
          <>
            <div>
              <label className={labelCls}>Duration: <span className="text-white">{durationSec}s</span></label>
              <input
                type="range" min={1} max={12} step={0.5}
                value={durationSec}
                onChange={e => setClip({ durationFrames: Math.round(parseFloat(e.target.value) * FPS) })}
                className="w-full accent-emerald-500"
              />
            </div>
            <ObjectEditor
              obj={clip.shape}
              onChange={updated => setClip({ shape: updated })}
              onDelete={() => {}}
            />
          </>
        )}

        {/* Image / Video clip */}
        {(clip.clipType === 'image' || clip.clipType === 'video') && clip.media && (
          <>
            <div>
              <label className={labelCls}>File</label>
              <p className="text-xs text-gray-400 truncate">{clip.media.name}</p>
            </div>
            <div>
              <label className={labelCls}>Duration: <span className="text-white">{durationSec}s</span></label>
              <input
                type="range" min={1} max={30} step={0.5}
                value={durationSec}
                onChange={e => setClip({ durationFrames: Math.round(parseFloat(e.target.value) * FPS) })}
                className="w-full accent-emerald-500"
              />
            </div>
          </>
        )}

        {/* Audio clip */}
        {clip.clipType === 'audio' && clip.media && (
          <>
            <div>
              <label className={labelCls}>File</label>
              <p className="text-xs text-gray-400 truncate">{clip.media.name}</p>
            </div>
            <div>
              <label className={labelCls}>Duration: <span className="text-white">{durationSec}s</span></label>
              <input
                type="range" min={1} max={60} step={1}
                value={durationSec}
                onChange={e => setClip({ durationFrames: Math.round(parseFloat(e.target.value) * FPS) })}
                className="w-full accent-emerald-500"
              />
            </div>
          </>
        )}

      </div>
    </div>
  )
}

// ── SelectionBox ─────────────────────────────────────────────────────────────

type HandleDir = 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w'|'move'
const HS = 8  // handle size px

function SelectionBox({ box, onBoxChange, containerRef, color = '#10b981', active = true, onActivate }: {
  box:          { x: number; y: number; w: number; h: number }
  onBoxChange:  (b: { x: number; y: number; w: number; h: number }) => void
  containerRef: React.RefObject<HTMLDivElement | null>
  color?:       string
  active?:      boolean
  onActivate?:  () => void
}) {
  const dragRef = useRef<{ dir: HandleDir; mx0: number; my0: number; x0: number; y0: number; w0: number; h0: number } | null>(null)
  const { x, y, w, h } = box
  const L = x - w / 2, R = x + w / 2, T = y - h / 2, B = y + h / 2

  function startDrag(e: React.MouseEvent, dir: HandleDir) {
    e.preventDefault(); e.stopPropagation()
    dragRef.current = { dir, mx0: e.clientX, my0: e.clientY, x0: x, y0: y, w0: w, h0: h }

    function onMove(ev: MouseEvent) {
      if (!dragRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const dx = (ev.clientX - dragRef.current.mx0) / rect.width  * 100
      const dy = (ev.clientY - dragRef.current.my0) / rect.height * 100
      const { x0: ox, y0: oy, w0: ow, h0: oh, dir: d } = dragRef.current
      const l0 = ox-ow/2, r0 = ox+ow/2, t0 = oy-oh/2, b0 = oy+oh/2
      let nL=l0, nR=r0, nT=t0, nB=b0
      if (d === 'move') { nL=l0+dx; nR=r0+dx; nT=t0+dy; nB=b0+dy }
      else {
        if (d==='w'||d==='nw'||d==='sw') nL = l0+dx
        if (d==='e'||d==='ne'||d==='se') nR = r0+dx
        if (d==='n'||d==='nw'||d==='ne') nT = t0+dy
        if (d==='s'||d==='sw'||d==='se') nB = b0+dy
      }
      const nW = Math.max(2, nR-nL), nH = Math.max(2, nB-nT)
      onBoxChange({ x: (nL+nR)/2, y: (nT+nB)/2, w: nW, h: nH })
    }
    function onUp() { dragRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const handles: { id: HandleDir; lp: number; tp: number; cur: string }[] = active ? [
    { id:'nw', lp:L,       tp:T,       cur:'nwse-resize' },
    { id:'n',  lp:(L+R)/2, tp:T,       cur:'ns-resize'   },
    { id:'ne', lp:R,       tp:T,       cur:'nesw-resize' },
    { id:'e',  lp:R,       tp:(T+B)/2, cur:'ew-resize'   },
    { id:'se', lp:R,       tp:B,       cur:'nwse-resize' },
    { id:'s',  lp:(L+R)/2, tp:B,       cur:'ns-resize'   },
    { id:'sw', lp:L,       tp:B,       cur:'nesw-resize' },
    { id:'w',  lp:L,       tp:(T+B)/2, cur:'ew-resize'   },
  ] : []

  return (
    <>
      <div
        onMouseDown={e => active ? startDrag(e, 'move') : (e.preventDefault(), e.stopPropagation(), onActivate?.())}
        style={{
          position:'absolute', left:`${L}%`, top:`${T}%`, width:`${w}%`, height:`${h}%`,
          border:`2px ${active?'solid':'dashed'} ${color}`,
          cursor: active ? 'move' : 'pointer',
          pointerEvents:'all', boxSizing:'border-box',
          background: active ? 'transparent' : 'rgba(255,255,255,0.03)',
        }}
      />
      {handles.map(hd => (
        <div key={hd.id} onMouseDown={e => startDrag(e, hd.id)} style={{
          position:'absolute',
          left:`calc(${hd.lp}% - ${HS/2}px)`, top:`calc(${hd.tp}% - ${HS/2}px)`,
          width:HS, height:HS,
          background:'#fff', border:`2px solid ${color}`, borderRadius:2,
          cursor:hd.cur, pointerEvents:'all',
        }} />
      ))}
    </>
  )
}

// ── PreviewOverlay ────────────────────────────────────────────────────────────

function PreviewOverlay({ clip, onUpdate, containerRef, activeObjId, setActiveObjId }: {
  clip:           TimelineClip
  onUpdate:       (c: TimelineClip) => void
  containerRef:   React.RefObject<HTMLDivElement | null>
  activeObjId:    string | null
  setActiveObjId: (id: string | null) => void
}) {
  const wrap: React.CSSProperties = { position:'absolute', inset:0, pointerEvents:'none', zIndex:20 }

  if (clip.clipType === 'shape' && clip.shape) {
    const s = clip.shape
    return (
      <div style={wrap}>
        <SelectionBox
          box={{ x:s.x, y:s.y, w:s.w, h:s.h }}
          onBoxChange={b => onUpdate({ ...clip, shape: { ...s, ...b } })}
          containerRef={containerRef}
        />
      </div>
    )
  }

  if ((clip.clipType === 'image' || clip.clipType === 'video') && clip.media) {
    return (
      <div style={wrap}>
        <SelectionBox
          box={{ x: clip.mediaX??50, y: clip.mediaY??50, w: clip.mediaW??100, h: clip.mediaH??100 }}
          onBoxChange={b => onUpdate({ ...clip, mediaX:b.x, mediaY:b.y, mediaW:b.w, mediaH:b.h })}
          containerRef={containerRef}
          color="#3b82f6"
        />
      </div>
    )
  }

  if (clip.clipType === 'scene' && clip.scene) {
    const objs = clip.scene.objects ?? []
    if (objs.length === 0) return null
    return (
      <div style={wrap}>
        {objs.map((obj, i) => (
          <SelectionBox
            key={obj.id}
            box={{ x:obj.x, y:obj.y, w:obj.w, h:obj.h }}
            onBoxChange={b => {
              const newObjs = objs.map((o, j) => j===i ? { ...o, ...b } : o)
              onUpdate({ ...clip, scene: { ...clip.scene!, objects: newObjs } })
            }}
            containerRef={containerRef}
            active={obj.id === activeObjId}
            onActivate={() => setActiveObjId(obj.id)}
            color={obj.id === activeObjId ? '#10b981' : '#6b7280'}
          />
        ))}
      </div>
    )
  }

  return null
}

// ── Main studio page ──────────────────────────────────────────────────────────

export default function VideoStudioPage() {
  const router = useRouter()

  // Core state
  const [clips, setClips]             = useState<TimelineClip[]>([])
  const [videoTitle, setVideoTitle]   = useState('Untitled Project')
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9')
  const [mediaFiles, setMediaFiles]   = useState<MediaFile[]>([])

  // UI state
  const [sideTab, setSideTab]           = useState<SideTab>('scenes')
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying]       = useState(false)
  const [zoom, setZoom]                 = useState(4) // px per frame

  // Save / load
  const [saving, setSaving]             = useState(false)
  const [saveMsg, setSaveMsg]           = useState('')
  const [projects, setProjects]         = useState<VideoProject[]>([])
  const [showLibrary, setShowLibrary]   = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(false)

  // Overlay / selection
  const [activeObjId, setActiveObjId] = useState<string | null>(null)

  // Refs
  const playerRef          = useRef<PlayerRef | null>(null)
  const timelineRef        = useRef<HTMLDivElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const playIntervalRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  const dims     = aspectDims(aspectRatio)
  const duration = totalDurationFrames(clips)

  const selectedClip = clips.find(c => c.id === selectedClipId) ?? null

  // ── Player sync ─────────────────────────────────────────────────────────────

  // ── IndexedDB: load persisted media on mount ──────────────────────────────────

  useEffect(() => {
    dbLoadAllMedia().then(entries => {
      const loaded: MediaFile[] = entries.map(e => ({
        id:   e.id,
        name: e.name,
        type: e.type,
        url:  URL.createObjectURL(e.blob),
      }))
      if (loaded.length > 0) setMediaFiles(loaded)
    }).catch(() => {})
  }, [])

  useEffect(() => { setActiveObjId(null) }, [selectedClipId])

  async function deleteMediaFile(id: string) {
    setMediaFiles(prev => {
      const target = prev.find(m => m.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter(m => m.id !== id)
    })
    await dbDeleteMedia(id).catch(() => {})
  }

  useEffect(() => {
    playerRef.current?.seekTo(currentFrame)
  }, [currentFrame])

  // ── Playback ─────────────────────────────────────────────────────────────────

  function togglePlay() {
    if (isPlaying) {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current)
      setIsPlaying(false)
    } else {
      setIsPlaying(true)
      playIntervalRef.current = setInterval(() => {
        setCurrentFrame(f => {
          const next = f + 1
          if (next >= duration) {
            clearInterval(playIntervalRef.current!)
            setIsPlaying(false)
            return 0
          }
          return next
        })
      }, 1000 / FPS)
    }
  }

  useEffect(() => {
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current) }
  }, [])

  // ── Clip mutations ────────────────────────────────────────────────────────────

  function updateClip(updated: TimelineClip) {
    setClips(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  function deleteClip(id: string) {
    setClips(prev => prev.filter(c => c.id !== id))
    if (selectedClipId === id) setSelectedClipId(null)
  }

  // ── Media upload ──────────────────────────────────────────────────────────────

  function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(file => {
      const id  = String(Date.now() + Math.random())
      const url = URL.createObjectURL(file)
      const media: MediaFile = { id, url, type, name: file.name }
      setMediaFiles(prev => [...prev, media])
      dbSaveMedia({ id, name: file.name, type, blob: file }).catch(() => {})
    })
    e.target.value = ''
  }

  // ── Drop handler ──────────────────────────────────────────────────────────────

  const handleDrop = useCallback((
    e: React.DragEvent<HTMLDivElement>,
    track: TrackId
  ) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/json')
    if (!raw) return
    let payload: DragPayload
    try { payload = JSON.parse(raw) as DragPayload } catch { return }

    const rect = e.currentTarget.getBoundingClientRect()
    const scrollLeft = (timelineRef.current?.scrollLeft ?? 0)
    const dropX = e.clientX - rect.left
    const startFrame = Math.max(0, Math.round((dropX + scrollLeft - LABEL_WIDTH) / zoom))

    let newClip: TimelineClip | null = null

    if (payload.kind === 'scene') {
      // Respect drop target — allows scenes on overlay tracks for simultaneous play
      const dest = track === 'audio' ? 'main' : track
      newClip = { ...newSceneClip(payload.sceneType, startFrame), track: dest }
    } else if (payload.kind === 'shape') {
      // Shapes/text always land on the objects overlay track
      newClip = { ...newShapeClip(payload.shape, startFrame), track: 'overlay' }
    } else if (payload.kind === 'media') {
      const media = mediaFiles.find(m => m.id === payload.mediaId)
      if (!media) return
      const dest = track === 'audio' ? 'main' : track
      newClip = { ...newMediaClip(media, startFrame), track: dest }
    } else if (payload.kind === 'audio') {
      const media = mediaFiles.find(m => m.id === payload.mediaId)
      if (!media) return
      newClip = { ...newAudioClip(media, startFrame), track: 'audio' }
    }

    if (newClip) setClips(prev => [...prev, newClip!])
  }, [zoom, mediaFiles])

  // ── Clip dragging (horizontal reposition) ────────────────────────────────────

  function startClipDrag(e: React.MouseEvent, clipId: string) {
    e.stopPropagation()
    const clip = clips.find(c => c.id === clipId)
    if (!clip) return
    const startX = e.clientX
    const origStart = clip.startFrame

    function onMove(mv: MouseEvent) {
      const dx = mv.clientX - startX
      const newStart = Math.max(0, origStart + Math.round(dx / zoom))
      setClips(prev => prev.map(c => c.id === clipId ? { ...c, startFrame: newStart } : c))
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // ── Ruler click / playhead drag ──────────────────────────────────────────────

  function handleRulerClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const scrollLeft = timelineRef.current?.scrollLeft ?? 0
    const x = e.clientX - rect.left + scrollLeft - LABEL_WIDTH
    const frame = Math.max(0, Math.round(x / zoom))
    setCurrentFrame(Math.min(frame, duration))
  }

  // ── Save / load ───────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true); setSaveMsg('')
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: videoTitle, aspectRatio, clips }),
      })
      setSaveMsg(res.ok ? 'Saved!' : 'Save failed.')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch { setSaveMsg('Network error.') }
    finally { setSaving(false) }
  }

  async function loadProjects() {
    setLoadingProjects(true)
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(Array.isArray(data) ? (data as VideoProject[]) : [])
    } catch { /* ignore */ }
    finally { setLoadingProjects(false) }
  }

  function handleLoad(project: VideoProject) {
    setClips(project.clips ?? [])
    setVideoTitle(project.title)
    setAspectRatio(project.aspectRatio)
    setShowLibrary(false)
  }

  async function handleDelete(id: string) {
    await fetch('/api/projects', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  useEffect(() => {
    if (showLibrary) loadProjects()
  }, [showLibrary])

  // ── Time formatting ───────────────────────────────────────────────────────────

  function formatTime(frame: number) {
    const s = Math.floor(frame / FPS)
    const f = frame % FPS
    return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}:${String(f).padStart(2,'0')}`
  }

  // ── Timeline width ────────────────────────────────────────────────────────────

  const timelineContentWidth = Math.max(duration * zoom + 200, 800)

  // ── Ruler marks ──────────────────────────────────────────────────────────────

  const rulerMarks: number[] = []
  const totalSecs = Math.ceil(duration / FPS) + 5
  for (let s = 0; s <= totalSecs; s++) rulerMarks.push(s)

  // ── Add to end shortcuts ──────────────────────────────────────────────────────

  function addSceneToEnd(sceneType: SceneType) {
    const mainClips = clips.filter(c => c.track === 'main')
    const endFrame = mainClips.length === 0 ? 0 : totalDurationFrames(mainClips)
    setClips(prev => [...prev, newSceneClip(sceneType, endFrame)])
  }

  function addShapeAtCurrent(shape: ObjectShape) {
    setClips(prev => [...prev, newShapeClip(shape, currentFrame)])
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const mediaImages  = mediaFiles.filter(m => m.type === 'image' || m.type === 'video')
  const mediaAudio   = mediaFiles.filter(m => m.type === 'audio')

  return (
    <div className="flex flex-col bg-[#070d1a] text-white" style={{ height: '100vh', overflow: 'hidden' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-12 border-b border-white/8 bg-[#0a1020]">
        <div className="flex items-center gap-2 mr-2">
          <Film className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-white">Video Hub</span>
        </div>

        <input
          type="text"
          value={videoTitle}
          onChange={e => setVideoTitle(e.target.value)}
          className="flex-1 max-w-xs bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
        />

        <div className="flex gap-1 bg-white/5 p-0.5 rounded-lg ml-2">
          {(['16:9', '9:16'] as const).map(ar => (
            <button
              key={ar}
              onClick={() => setAspectRatio(ar)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                aspectRatio === ar ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-500 hover:text-white'
              }`}
            >
              {ar}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setShowLibrary(v => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg transition-all"
        >
          <FolderOpen className="w-3.5 h-3.5" />Library
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 text-xs bg-white/8 hover:bg-white/12 border border-white/10 text-white px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? 'Saving…' : 'Save'}
        </button>

        {saveMsg && (
          <span className={`text-xs flex items-center gap-1 ${saveMsg === 'Saved!' ? 'text-emerald-400' : 'text-red-400'}`}>
            {saveMsg === 'Saved!' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {saveMsg}
          </span>
        )}

        <button
          onClick={async () => {
            await fetch('/api/auth', { method: 'DELETE' })
            router.push('/')
          }}
          title="Log out"
          className="p-1.5 text-gray-600 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* ── MIDDLE ROW ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Sidebar (48px icons) */}
        <div className="shrink-0 w-12 bg-[#070d1a] border-r border-white/8 flex flex-col items-center py-2 gap-1">
          {([ ['media', ImageIcon, 'Media'],
              ['scenes', Film, 'Scenes'],
              ['objects', Layers, 'Objects'],
              ['audio', Music, 'Audio'],
          ] as [SideTab, React.ComponentType<{className?: string}>, string][]).map(([tab, Icon, label]) => (
            <button
              key={tab}
              onClick={() => setSideTab(tab)}
              title={label}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                sideTab === tab
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-600 hover:text-gray-300'
              }`}
            >
              <Icon className="w-5 h-5" />
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="shrink-0 w-[260px] bg-[#0d1526] border-r border-white/8 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-white/8 shrink-0">
            <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">
              {sideTab === 'media' ? 'Media' : sideTab === 'scenes' ? 'Scenes' : sideTab === 'objects' ? 'Objects' : 'Audio'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2">

            {/* SCENES panel */}
            {sideTab === 'scenes' && (
              <div className="grid grid-cols-2 gap-1.5">
                {SCENE_TYPES.map(st => {
                  const payload: DragPayload = { kind: 'scene', sceneType: st }
                  return (
                    <div
                      key={st}
                      draggable
                      onDragStart={e => e.dataTransfer.setData('application/json', JSON.stringify(payload))}
                      onClick={() => addSceneToEnd(st)}
                      className="bg-[#070d1a] border border-white/8 hover:border-emerald-500/30 rounded-lg p-2 cursor-grab active:cursor-grabbing flex flex-col items-center gap-1 transition-all hover:bg-emerald-500/5"
                    >
                      <span className="text-xl">{SCENE_EMOJIS[st] ?? '🎬'}</span>
                      <span className="text-[10px] text-gray-400 text-center capitalize">{st}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* OBJECTS panel */}
            {sideTab === 'objects' && (
              <div className="grid grid-cols-2 gap-1.5">
                {SHAPES.map(shape => {
                  const payload: DragPayload = { kind: 'shape', shape }
                  return (
                    <div
                      key={shape}
                      draggable
                      onDragStart={e => e.dataTransfer.setData('application/json', JSON.stringify(payload))}
                      onClick={() => addShapeAtCurrent(shape)}
                      className="bg-[#070d1a] border border-white/8 hover:border-pink-500/30 rounded-lg p-2 cursor-grab active:cursor-grabbing flex flex-col items-center gap-1 transition-all hover:bg-pink-500/5"
                    >
                      <span className="text-xl">{SHAPE_LABELS[shape].split(' ')[0]}</span>
                      <span className="text-[10px] text-gray-400 text-center">{SHAPE_LABELS[shape].split(' ')[1]}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* MEDIA panel */}
            {sideTab === 'media' && (
              <div className="space-y-3">
                <label className="flex items-center gap-2 w-full bg-[#070d1a] hover:bg-white/5 border border-white/8 rounded-lg px-3 py-2 cursor-pointer transition-all">
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400">Upload Image / Video</span>
                  <input
                    type="file" accept="image/*,video/*" multiple className="hidden"
                    onChange={e => {
                      const files = e.target.files
                      if (!files) return
                      Array.from(files).forEach(file => {
                        const t = file.type.startsWith('video') ? 'video' : 'image'
                        const id = String(Date.now() + Math.random())
                        const url = URL.createObjectURL(file)
                        setMediaFiles(prev => [...prev, { id, url, type: t, name: file.name }])
                        dbSaveMedia({ id, name: file.name, type: t, blob: file }).catch(() => {})
                      })
                      e.target.value = ''
                    }}
                  />
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {mediaImages.map(m => {
                    const payload: DragPayload = { kind: 'media', mediaId: m.id }
                    return (
                      <div
                        key={m.id}
                        draggable
                        onDragStart={e => e.dataTransfer.setData('application/json', JSON.stringify(payload))}
                        className="bg-[#070d1a] border border-white/8 hover:border-blue-500/30 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing group relative"
                      >
                        {m.type === 'image' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.url} alt={m.name} className="w-full h-16 object-cover" />
                        ) : (
                          <video src={m.url} className="w-full h-16 object-cover" muted />
                        )}
                        <div className="p-1">
                          <p className="text-[9px] text-gray-500 truncate">{m.name}</p>
                        </div>
                        <span className="absolute top-1 left-1 bg-black/70 text-[9px] text-white px-1 rounded">
                          {m.type === 'video' ? 'VID' : 'IMG'}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); deleteMediaFile(m.id) }}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-red-600/80 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
                {mediaImages.length === 0 && (
                  <p className="text-[11px] text-gray-600 text-center py-4">No media uploaded yet.</p>
                )}
              </div>
            )}

            {/* AUDIO panel */}
            {sideTab === 'audio' && (
              <div className="space-y-3">
                <label className="flex items-center gap-2 w-full bg-[#070d1a] hover:bg-white/5 border border-white/8 rounded-lg px-3 py-2 cursor-pointer transition-all">
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400">Upload Audio</span>
                  <input
                    type="file" accept="audio/*" multiple className="hidden"
                    onChange={e => handleMediaUpload(e, 'audio')}
                  />
                </label>
                <div className="space-y-1.5">
                  {mediaAudio.map(m => {
                    const payload: DragPayload = { kind: 'audio', mediaId: m.id }
                    return (
                      <div
                        key={m.id}
                        draggable
                        onDragStart={e => e.dataTransfer.setData('application/json', JSON.stringify(payload))}
                        className="bg-[#070d1a] border border-white/8 hover:border-amber-500/30 rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing flex items-center gap-2 transition-all group"
                      >
                        <Music className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <p className="text-[11px] text-gray-400 truncate flex-1">{m.name}</p>
                        <button
                          onClick={e => { e.stopPropagation(); deleteMediaFile(m.id) }}
                          className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          title="Delete"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
                {mediaAudio.length === 0 && (
                  <p className="text-[11px] text-gray-600 text-center py-4">No audio uploaded yet.</p>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Preview area (flex-1) */}
        <div className="flex-1 min-w-0 bg-[#0a1020] flex flex-col items-center justify-center p-3 overflow-hidden relative">
          {clips.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
              <div className="bg-black/60 rounded-xl px-4 py-3 text-center backdrop-blur-sm border border-white/10">
                <Film className="w-6 h-6 text-gray-500 mx-auto mb-1.5" />
                <p className="text-gray-400 text-xs">Add clips to the timeline to get started</p>
              </div>
            </div>
          )}
          <div
            ref={previewContainerRef}
            className="relative w-full"
            style={{ maxHeight: 'calc(100vh - 330px)', aspectRatio: aspectRatio === '16:9' ? '16/9' : '9/16', maxWidth: '100%' }}
          >
            <div className="rounded-xl overflow-hidden bg-black border border-white/8 absolute inset-0">
              <RemotionPlayer
                ref={playerRef}
                component={PromoVideoComp as unknown as React.ComponentType<Record<string, unknown>>}
                inputProps={{ clips: clips.length > 0 ? clips : PLACEHOLDER_CLIPS, title: videoTitle, aspectRatio } as unknown as Record<string, unknown>}
                durationInFrames={Math.max(duration, 120)}
                compositionWidth={dims.width}
                compositionHeight={dims.height}
                fps={FPS}
                style={{ width: '100%', height: '100%' }}
                controls
                initialFrame={12}
              />
            </div>
            {selectedClip && (
              <PreviewOverlay
                clip={selectedClip}
                onUpdate={updateClip}
                containerRef={previewContainerRef}
                activeObjId={activeObjId}
                setActiveObjId={setActiveObjId}
              />
            )}
          </div>
        </div>

        {/* Properties panel (only when clip selected) */}
        {selectedClip && (
          <PropertiesPanel
            clip={selectedClip}
            onUpdate={updateClip}
            onClose={() => setSelectedClipId(null)}
          />
        )}
      </div>

      {/* ── TIMELINE ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-[#070d1a] border-t border-white/8" style={{ height: 220 }}>

        {/* Transport bar */}
        <div className="flex items-center gap-3 px-3 py-1.5 border-b border-white/8">
          <button
            onClick={togglePlay}
            className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center transition-all"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <span className="text-xs text-gray-400 font-mono w-20">{formatTime(currentFrame)}</span>
          <span className="text-xs text-gray-600 font-mono">/ {formatTime(duration)}</span>

          <div className="flex-1" />

          <button
            onClick={() => setZoom(z => Math.max(1, z - 1))}
            className="p-1.5 text-gray-500 hover:text-white border border-white/8 rounded-lg transition-all"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-gray-600 w-8 text-center">{zoom}px</span>
          <button
            onClick={() => setZoom(z => Math.min(20, z + 1))}
            className="p-1.5 text-gray-500 hover:text-white border border-white/8 rounded-lg transition-all"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              const a = document.createElement('a')
              a.href = '#'
              a.textContent = 'Export not available in preview mode'
            }}
            className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-all"
          >
            <Download className="w-3.5 h-3.5" />Export
          </button>
        </div>

        {/* Scrollable ruler + tracks */}
        <div
          ref={timelineRef}
          className="overflow-x-auto overflow-y-hidden"
          style={{ height: 'calc(100% - 38px)' }}
        >
          <div style={{ width: timelineContentWidth, minWidth: '100%', position: 'relative' }}>

            {/* Time ruler */}
            <div
              className="relative flex items-end bg-[#0a1020] border-b border-white/8 cursor-pointer select-none"
              style={{ height: 28, paddingLeft: LABEL_WIDTH }}
              onClick={handleRulerClick}
            >
              {rulerMarks.map(s => (
                <div
                  key={s}
                  style={{
                    position: 'absolute',
                    left: LABEL_WIDTH + s * FPS * zoom,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                  }}
                >
                  <div className="w-px h-3 bg-white/20" />
                  <span className="text-[9px] text-gray-600 ml-0.5">{s}s</span>
                </div>
              ))}

              {/* Playhead on ruler */}
              <div
                style={{
                  position: 'absolute',
                  left: LABEL_WIDTH + currentFrame * zoom,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: '#ef4444',
                  zIndex: 20,
                  pointerEvents: 'none',
                }}
              />
            </div>

            {/* Track rows */}
            {([
              ['main',     'MAIN',  '#059669'],
              ['overlay',  'OVL 1', '#7c3aed'],
              ['overlay2', 'OVL 2', '#2563eb'],
              ['audio',    'AUDIO', '#b45309'],
            ] as [TrackId, string, string][]).map(([trackId, trackLabel, accent]) => (
              <div
                key={trackId}
                className="relative flex items-stretch border-b border-white/5"
                style={{ height: TRACK_HEIGHTS[trackId] }}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = `${accent}18` }}
                onDragLeave={e => { e.currentTarget.style.background = '' }}
                onDrop={e => { e.currentTarget.style.background = ''; handleDrop(e, trackId) }}
              >
                {/* Label */}
                <div
                  className="shrink-0 flex flex-col items-center justify-center bg-[#0a1020] border-r border-white/8"
                  style={{ width: LABEL_WIDTH, borderLeft: `2px solid ${accent}` }}
                >
                  <span className="text-[8px] font-bold tracking-widest" style={{ color: accent }}>{trackLabel}</span>
                </div>

                {/* Drop zone */}
                <div className="flex-1 relative">
                  {/* Clips */}
                  {clips.filter(c => c.track === trackId).map(clip => {
                    const left = clip.startFrame * zoom
                    const width = Math.max(40, clip.durationFrames * zoom)
                    const colorClass = CLIP_COLORS[clip.clipType] ?? 'bg-gray-700/90'
                    const label =
                      clip.clipType === 'scene' ? (clip.scene?.headline ?? clip.clipType) :
                      clip.clipType === 'shape' ? (clip.shape ? SHAPE_LABELS[clip.shape.shape] ?? clip.clipType : clip.clipType) :
                      clip.media?.name ?? clip.clipType

                    return (
                      <div
                        key={clip.id}
                        className={`absolute top-1 rounded-md px-2 flex items-center cursor-pointer select-none group border ${
                          selectedClipId === clip.id ? 'border-white/60' : 'border-white/20'
                        } ${colorClass}`}
                        style={{
                          left,
                          width,
                          height: TRACK_HEIGHTS[trackId] - 8,
                          overflow: 'hidden',
                        }}
                        onClick={e => { e.stopPropagation(); setSelectedClipId(clip.id) }}
                        onMouseDown={e => startClipDrag(e, clip.id)}
                        onContextMenu={e => { e.preventDefault(); deleteClip(clip.id) }}
                      >
                        <span className="text-[10px] text-white/90 truncate flex-1 pointer-events-none">{label}</span>
                        <button
                          className="shrink-0 hidden group-hover:flex ml-1 text-white/60 hover:text-white transition-colors"
                          onClick={e => { e.stopPropagation(); deleteClip(clip.id) }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}

                  {/* Playhead line */}
                  <div
                    style={{
                      position: 'absolute',
                      left: currentFrame * zoom,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background: '#ef4444',
                      zIndex: 10,
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>

      {/* ── LIBRARY MODAL ──────────────────────────────────────────────────────── */}
      {showLibrary && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6" onClick={() => setShowLibrary(false)}>
          <div
            className="bg-[#0d1526] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <h2 className="text-sm font-bold text-white">Saved Projects</h2>
              <button onClick={() => setShowLibrary(false)} className="text-gray-600 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingProjects && (
                <div className="flex items-center gap-2 justify-center py-12 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading…</span>
                </div>
              )}
              {!loadingProjects && projects.length === 0 && (
                <div className="text-center py-16">
                  <Film className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No saved projects yet.</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {projects.map(project => (
                  <div key={project.id} className="bg-[#070d1a] border border-white/8 rounded-xl p-4 hover:border-white/15 transition-all">
                    <h3 className="text-sm font-bold text-white truncate">{project.title}</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {new Date(project.createdAt).toLocaleDateString()} · {project.aspectRatio}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleLoad(project)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold py-1.5 rounded-lg transition-all"
                      >
                        <Play className="w-3.5 h-3.5" />Load
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="p-1.5 text-gray-600 hover:text-red-400 border border-white/8 hover:border-red-500/30 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
