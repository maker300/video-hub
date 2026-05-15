'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  LogOut, Download, Save, Loader2, Play, Trash2,
  Plus, ChevronDown, ChevronUp, Film, RotateCcw,
  Video, FolderOpen, X, Check, AlertCircle, Monitor, Clapperboard,
} from 'lucide-react'
import type {
  PromoScene, PromoVideoProps, SceneType,
  VideoObject, ObjectShape, EntranceAnim, MotionAnim, ExitAnim,
} from '@/remotion/compositions/PromoVideo'

// ── Dynamic imports ───────────────────────────────────────────────────────────

const RemotionPlayer = dynamic(
  () => import('@remotion/player').then(m => m.Player),
  { ssr: false }
)

// Lazy-load the Remotion composition to avoid SSR issues
const PromoVideoComp = dynamic(
  () => import('@/remotion/compositions/PromoVideo').then(m => m.PromoVideo),
  { ssr: false }
)

// ── Types ─────────────────────────────────────────────────────────────────────

interface VideoProject {
  id:          string
  title:       string
  aspectRatio: '16:9' | '9:16'
  scenes:      PromoScene[]
  createdAt:   string
}

const SCENE_TYPE_LABELS: Record<SceneType, string> = {
  hook:         '🎣 Hook',
  problem:      '⚠️ Problem',
  solution:     '✅ Solution',
  stat:         '📊 Stat',
  feature:      '⚡ Feature',
  cta:          '🚀 CTA',
  typewriter:   '⌨️ Typewriter',
  reveal:       '🎬 Reveal',
  quote:        '💬 Quote',
  announcement: '📢 Announcement',
  bullet:       '📋 Bullet List',
  question:     '❓ Question',
  glitch:       '⚡ Glitch',
  split:        '◧ Split Panel',
  countdown:    '⏱️ Countdown',
  testimonial:  '⭐ Testimonial',
}

const SCENE_TYPES: SceneType[] = [
  'hook', 'problem', 'solution', 'stat', 'feature', 'cta',
  'typewriter', 'reveal', 'quote', 'announcement',
  'bullet', 'question', 'glitch', 'split', 'countdown', 'testimonial',
]

const DEFAULT_SCENES: PromoScene[] = [
  {
    id: '1', type: 'hook',
    headline: 'Stop Guessing. Start Trading.',
    subtext: 'AI-powered signals for every market.',
    duration: 4,
  },
  {
    id: '2', type: 'problem',
    headline: 'Most traders lose because of emotion.',
    subtext: 'Fear and FOMO destroy good setups.',
    duration: 4,
  },
  {
    id: '3', type: 'solution',
    headline: 'FM Trader reads the chart — you just trade.',
    subtext: 'Real-time signals. Calculated entries. Clear targets.',
    duration: 5,
  },
  {
    id: '4', type: 'stat',
    value: '78%', label: 'Average Confidence',
    headline: 'Only high-conviction setups make the cut.',
    duration: 4,
  },
  {
    id: '5', type: 'cta',
    headline: 'Join Forex Mastery Today.',
    subtext: 'forexmastery.org',
    duration: 5,
  },
]

const FPS = 30

function totalFrames(scenes: PromoScene[]) {
  return scenes.reduce((s, sc) => s + Math.round(sc.duration * FPS), 0) || 300
}

function aspectDims(ar: '16:9' | '9:16') {
  return ar === '9:16' ? { width: 1080, height: 1920 } : { width: 1280, height: 720 }
}

// ── Script → scenes parser (pure client-side, no API) ────────────────────────

function detectType(text: string, index: number, total: number): SceneType {
  if (index === 0) return 'hook'
  if (index === total - 1) return 'cta'
  const l = text.toLowerCase()
  // Stat: contains a standalone number with unit (%, $, k, m, b, x)
  if (/\b\d+(?:\.\d+)?[%kKmMbBtTxX]|\$[\d,.]+|\d{4,}/.test(text) && text.length < 160) return 'stat'
  if (/problem|struggle|fail|los(ing|t)|wrong|mistake|hard |confus|fear|fomo|emotion|gut|guess/.test(l)) return 'problem'
  if (/solution|answer|fix|solve|introduc|fm trader|forex mastery|that.s where|here.s how|meet |using |with /.test(l)) return 'solution'
  if (/feature|signal|alert|scan|detect|identify|analys|notify|report|track/.test(l)) return 'feature'
  return 'feature'
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean)
}

function parseScriptToScenes(script: string): { scenes: PromoScene[]; title: string } {
  // 1. Split into blocks by blank lines; fallback to single newlines; fallback to sentences
  let blocks = script.split(/\n\s*\n/).map(b => b.replace(/\n/g, ' ').trim()).filter(Boolean)
  if (blocks.length < 2) {
    blocks = script.split(/\n/).map(b => b.trim()).filter(Boolean)
  }
  if (blocks.length < 2) {
    // Single unbroken paragraph — split every 2 sentences
    const sentences = splitSentences(script)
    blocks = []
    for (let i = 0; i < sentences.length; i += 2) {
      blocks.push(sentences.slice(i, i + 2).join(' '))
    }
  }
  if (blocks.length === 0) return { scenes: DEFAULT_SCENES, title: 'FM Trader Promo' }

  const scenes: PromoScene[] = blocks.map((block, i) => {
    const type = detectType(block, i, blocks.length)

    // Extract headline: first sentence, max 80 chars
    const sentences = splitSentences(block)
    let headline = (sentences[0] ?? block).slice(0, 80).trim()
    // Strip trailing punctuation for cleaner display
    headline = headline.replace(/[.,:;]+$/, '').trim()

    // Subtext: remainder joined, max 100 chars
    const rest = sentences.slice(1).join(' ').trim()
    const subtext = rest.length > 0 ? rest.slice(0, 100).replace(/[.,:;]+$/, '').trim() : undefined

    // Stat: pull out the numeric value and use the rest as label
    let value: string | undefined
    let label: string | undefined
    if (type === 'stat') {
      const m = block.match(/(\$[\d,.]+[kKmMbBtT]*|\b\d+(?:\.\d+)?[%kKmMbBtTxX+]*\b)/)
      if (m) {
        value = m[1]
        label = headline.replace(m[1], '').replace(/^\W+|\W+$/g, '').trim().slice(0, 50) || undefined
      }
    }

    // Duration: short text = 3s, medium = 4s, long = 5s
    const duration = block.length < 60 ? 3 : block.length < 130 ? 4 : 5

    return { id: String(i + 1), type, headline, subtext, value, label, duration }
  })

  // Derive title from first block's headline
  const title = scenes[0]?.headline?.slice(0, 50) ?? 'FM Trader Promo'

  return { scenes, title }
}

// ── Object system constants ───────────────────────────────────────────────────

const SHAPE_LABELS: Record<ObjectShape, string> = {
  circle:   '● Circle',
  rect:     '■ Rectangle',
  line:     '— Line',
  triangle: '▲ Triangle',
  pentagon: '⬠ Pentagon',
  star:     '★ Star',
  arrow:    '➤ Arrow',
  hexagon:  '⬡ Hexagon',
  diamond:  '◆ Diamond',
  ring:     '○ Ring',
}
const SHAPES: ObjectShape[] = ['circle','rect','line','triangle','pentagon','star','arrow','hexagon','diamond','ring']

const ENTRANCE_LABELS: Record<EntranceAnim, string> = {
  none: 'None', fade: 'Fade In', slideLeft: 'Slide from Left', slideRight: 'Slide from Right',
  slideUp: 'Slide from Top', slideDown: 'Slide from Bottom', scaleIn: 'Scale In', spinIn: 'Spin In', bounceIn: 'Bounce In',
}
const ENTRANCES: EntranceAnim[] = ['none','fade','slideLeft','slideRight','slideUp','slideDown','scaleIn','spinIn','bounceIn']

const MOTION_LABELS: Record<MotionAnim, string> = {
  none: 'None', float: 'Float', pulse: 'Pulse', spin: 'Continuous Spin', shake: 'Shake', breathe: 'Breathe',
}
const MOTIONS: MotionAnim[] = ['none','float','pulse','spin','shake','breathe']

const EXIT_LABELS: Record<ExitAnim, string> = {
  none: 'None', fade: 'Fade Out', slideLeft: 'Slide Left', slideRight: 'Slide Right', scaleOut: 'Scale Out',
}
const EXITS: ExitAnim[] = ['none','fade','slideLeft','slideRight','scaleOut']

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
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-emerald-400">{SHAPE_LABELS[obj.shape]}</span>
        <div className="flex-1" />
        <button onClick={onDelete} className="text-gray-600 hover:text-red-400 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Shape picker */}
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

      {/* Position & Size */}
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

      {/* Colors */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <label className={labelCls}>Fill</label>
          <input type="color" value={obj.fill} onChange={e => set({ fill: e.target.value })}
            className="w-full h-8 rounded-lg cursor-pointer border border-white/10 bg-transparent" />
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Stroke</label>
          <input type="color" value={obj.stroke} onChange={e => set({ stroke: e.target.value })}
            className="w-full h-8 rounded-lg cursor-pointer border border-white/10 bg-transparent" />
        </div>
        <div className="space-y-1">
          <label className={labelCls}>Stroke W</label>
          <input type="number" min={0} max={12} value={obj.strokeWidth} onChange={e => set({ strokeWidth: +e.target.value })} className={numCls} />
        </div>
      </div>

      {/* Entrance */}
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

      {/* Continuous motion */}
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

      {/* Exit */}
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

// ── Scene editor row ──────────────────────────────────────────────────────────

function SceneRow({
  scene, index, total,
  onChange, onDelete, onMove,
}: {
  scene:    PromoScene
  index:    number
  total:    number
  onChange: (s: PromoScene) => void
  onDelete: () => void
  onMove:   (dir: -1 | 1) => void
}) {
  const [expanded, setExpanded] = useState(index === 0)
  const set = (patch: Partial<PromoScene>) => onChange({ ...scene, ...patch })

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-white/3">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-xs font-mono text-gray-500 w-4 shrink-0">{index + 1}</span>
        <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
          {SCENE_TYPE_LABELS[scene.type]}
        </span>
        <span className="flex-1 text-sm text-gray-300 truncate">{scene.headline || '(empty)'}</span>
        <span className="text-xs text-gray-600">{scene.duration}s</span>
        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onMove(-1)} disabled={index === 0}
            className="p-1 text-gray-600 hover:text-gray-300 disabled:opacity-30 transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMove(1)} disabled={index === total - 1}
            className="p-1 text-gray-600 hover:text-gray-300 disabled:opacity-30 transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-600 hover:text-red-400 transition-colors ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {/* Type */}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Scene Type</label>
            <select
              value={scene.type}
              onChange={e => set({ type: e.target.value as SceneType })}
              className="w-full bg-[#0d1526] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              {SCENE_TYPES.map(t => (
                <option key={t} value={t}>{SCENE_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {/* Section title (label override) */}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">
              Section Title <span className="text-gray-600 font-normal">(header label shown above headline)</span>
            </label>
            <input
              type="text"
              value={scene.sectionTitle ?? ''}
              onChange={e => set({ sectionTitle: e.target.value || undefined })}
              placeholder={
                scene.type === 'feature' ? 'e.g. Key Feature, Header 1, Why Us…' :
                scene.type === 'problem' ? 'e.g. The Problem, Challenge…' :
                scene.type === 'solution' ? 'e.g. The Solution, Our Answer…' :
                scene.type === 'typewriter' ? 'e.g. Live Feed, Incoming…' :
                scene.type === 'reveal' ? 'e.g. Revealed, Spotlight…' :
                scene.type === 'bullet' ? 'e.g. Key Points, Benefits…' :
                scene.type === 'glitch' ? 'e.g. Breaking, Alert…' :
                'Custom label (optional)'
              }
              className="w-full bg-[#0d1526] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Headline */}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">
              Headline
              {scene.type === 'bullet' && (
                <span className="text-gray-600 font-normal ml-1">— separate bullets with <code className="bg-white/5 px-1 rounded">|</code></span>
              )}
            </label>
            <textarea
              value={scene.headline}
              onChange={e => set({ headline: e.target.value })}
              rows={2}
              placeholder={scene.type === 'bullet' ? 'Fast signals | Clear targets | No emotion' : undefined}
              className="w-full bg-[#0d1526] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>

          {/* Subtext */}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Subtext (optional)</label>
            <input
              type="text"
              value={scene.subtext ?? ''}
              onChange={e => set({ subtext: e.target.value || undefined })}
              placeholder="Supporting line"
              className="w-full bg-[#0d1526] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Stat / Split value + label */}
          {(scene.type === 'stat' || scene.type === 'split') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">
                  {scene.type === 'split' ? 'Left Panel Text' : 'Value (e.g. 78%)'}
                </label>
                <input
                  type="text"
                  value={scene.value ?? ''}
                  onChange={e => set({ value: e.target.value || undefined })}
                  placeholder={scene.type === 'split' ? '◆ or #1 or $4T' : '78%'}
                  className="w-full bg-[#0d1526] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">
                  {scene.type === 'split' ? 'Attribution' : 'Label'}
                </label>
                <input
                  type="text"
                  value={scene.label ?? ''}
                  onChange={e => set({ label: e.target.value || undefined })}
                  placeholder={scene.type === 'split' ? 'Optional name' : 'Avg. Confidence'}
                  className="w-full bg-[#0d1526] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>
            </div>
          )}
          {/* Testimonial attribution */}
          {scene.type === 'testimonial' && (
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Attribution (name shown below quote)</label>
              <input
                type="text"
                value={scene.label ?? ''}
                onChange={e => set({ label: e.target.value || undefined })}
                placeholder="— John D., Pro Trader"
                className="w-full bg-[#0d1526] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          )}

          {/* Duration */}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">
              Duration: <span className="text-white">{scene.duration}s</span>
            </label>
            <input
              type="range" min={2} max={10} step={0.5}
              value={scene.duration}
              onChange={e => set({ duration: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500"
            />
          </div>

          {/* Objects */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500 font-medium">
                Shape Objects <span className="text-gray-700 font-normal">({(scene.objects ?? []).length})</span>
              </label>
              <button
                onClick={() => set({ objects: [...(scene.objects ?? []), makeObject()] })}
                className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 px-2 py-1 rounded-lg transition-all"
              >
                <Plus className="w-3 h-3" />Add Object
              </button>
            </div>
            <div className="space-y-2">
              {(scene.objects ?? []).map((obj, oi) => (
                <ObjectEditor
                  key={obj.id}
                  obj={obj}
                  onChange={updated => {
                    const objs = [...(scene.objects ?? [])]
                    objs[oi] = updated
                    set({ objects: objs })
                  }}
                  onDelete={() => {
                    const objs = (scene.objects ?? []).filter((_, j) => j !== oi)
                    set({ objects: objs })
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main studio page ──────────────────────────────────────────────────────────

export default function VideoStudioPage() {
  const router = useRouter()
  const [tab, setTab]                 = useState<'create' | 'library'>('create')
  const [script, setScript]           = useState('')
  const [scenes, setScenes]           = useState<PromoScene[]>(DEFAULT_SCENES)
  const [videoTitle, setVideoTitle]   = useState('FM Trader Promo')
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9')
  const [saving, setSaving]           = useState(false)
  const [saveMsg, setSaveMsg]         = useState('')
  const [recording, setRecording]       = useState(false)
  const [recordProgress, setRecordProgress] = useState(0) // 0–100
  const [recordError, setRecordError]   = useState('')
  const [autoPlayKey, setAutoPlayKey]   = useState<number | null>(null) // non-null = auto-play mode
  const [projects, setProjects]         = useState<VideoProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [playerKey, setPlayerKey]       = useState(0)

  const mediaRef    = useRef<MediaRecorder | null>(null)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load projects when on library tab
  useEffect(() => {
    if (tab !== 'library') return
    setLoadingProjects(true)
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingProjects(false))
  }, [tab])

  const dims = aspectDims(aspectRatio)
  const duration = totalFrames(scenes)

  // ── Parse script into scenes (pure client-side) ─────────────────────────────

  function handleMakeVideo() {
    if (!script.trim()) return
    const { scenes: parsed, title } = parseScriptToScenes(script)
    setScenes(parsed)
    setVideoTitle(title)
    setPlayerKey(k => k + 1)
  }

  // ── Scene mutations ──────────────────────────────────────────────────────────

  function updateScene(index: number, scene: PromoScene) {
    setScenes(prev => prev.map((s, i) => i === index ? scene : s))
    setPlayerKey(k => k + 1)
  }

  function deleteScene(index: number) {
    setScenes(prev => prev.filter((_, i) => i !== index))
    setPlayerKey(k => k + 1)
  }

  function moveScene(index: number, dir: -1 | 1) {
    setScenes(prev => {
      const next = [...prev]
      const swap = index + dir
      if (swap < 0 || swap >= next.length) return prev
      ;[next[index], next[swap]] = [next[swap], next[index]]
      return next
    })
    setPlayerKey(k => k + 1)
  }

  function addScene() {
    setScenes(prev => [
      ...prev,
      {
        id:       String(Date.now()),
        type:     'feature',
        headline: 'New Scene',
        duration: 4,
      },
    ])
  }

  // ── Save project ─────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch('/api/projects', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: videoTitle, aspectRatio, scenes }),
      })
      if (res.ok) {
        setSaveMsg('Saved!')
        setTimeout(() => setSaveMsg(''), 3000)
      } else {
        setSaveMsg('Save failed.')
      }
    } catch {
      setSaveMsg('Network error.')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete project ────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    await fetch('/api/projects', {
      method:  'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id }),
    })
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  // ── Load project into editor ──────────────────────────────────────────────────

  function handleLoad(project: VideoProject) {
    setScenes(project.scenes)
    setVideoTitle(project.title)
    setAspectRatio(project.aspectRatio)
    setPlayerKey(k => k + 1)
    setTab('create')
  }

  // ── Download video (screen-capture with auto-play) ────────────────────────────

  async function handleDownload() {
    if (recording) {
      // Cancel
      if (timerRef.current) clearInterval(timerRef.current)
      mediaRef.current?.stop()
      setRecording(false)
      setAutoPlayKey(null)
      setRecordProgress(0)
      return
    }

    setRecordError('')
    const durationMs  = (duration / FPS) * 1000
    const bufferMs    = 800

    let stream: MediaStream
    try {
      // preferCurrentTab skips the screen picker on Chrome 107+ (auto-selects this tab)
      stream = await (navigator.mediaDevices as MediaDevices & {
        getDisplayMedia: (c?: object) => Promise<MediaStream>
      }).getDisplayMedia({
        video: { frameRate: 30, width: dims.width, height: dims.height },
        audio: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        preferCurrentTab: true as any,
        selfBrowserSurface: 'include',
      })
    } catch {
      setRecordError('Screen capture was cancelled or blocked by the browser.')
      return
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'

    const chunks: Blob[] = []
    const rec = new MediaRecorder(stream, { mimeType })
    mediaRef.current = rec

    rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
    rec.onstop = () => {
      stream.getTracks().forEach(t => t.stop())
      if (timerRef.current) clearInterval(timerRef.current)
      const blob = new Blob(chunks, { type: 'video/webm' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${videoTitle.replace(/[^a-z0-9]/gi, '_')}.webm`
      a.click()
      URL.revokeObjectURL(url)
      setRecording(false)
      setAutoPlayKey(null)
      setRecordProgress(0)
    }

    rec.start()

    // Remount the player with autoPlay so it starts from frame 0 immediately
    setAutoPlayKey(Date.now())
    setRecording(true)
    setRecordProgress(0)

    // Progress ticker
    const startTs = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTs
      setRecordProgress(Math.min(100, (elapsed / durationMs) * 100))
    }, 200)

    // Auto-stop
    setTimeout(() => rec.state === 'recording' && rec.stop(), durationMs + bufferMs)
  }

  return (
    <div className="min-h-screen bg-[#070d1a] text-white">

      {/* Header */}
      <div className="border-b border-white/8 bg-[#0a1020]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-white">Video Hub</span>
          </div>
          <div className="flex-1" />
          {/* Tab switcher */}
          <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
            <button
              onClick={() => setTab('create')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${tab === 'create' ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-500 hover:text-white'}`}
            >
              <Film className="w-3.5 h-3.5 inline mr-1.5" />Create
            </button>
            <button
              onClick={() => setTab('library')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${tab === 'library' ? 'bg-emerald-500/20 text-emerald-300' : 'text-gray-500 hover:text-white'}`}
            >
              <FolderOpen className="w-3.5 h-3.5 inline mr-1.5" />Library
            </button>
          </div>
          <button
            onClick={async () => {
              await fetch('/api/auth', { method: 'DELETE' })
              router.push('/')
            }}
            title="Log out"
            className="p-2 text-gray-600 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── CREATE TAB ─────────────────────────────────────────────────────────── */}
      {tab === 'create' && (
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col xl:flex-row gap-6">

            {/* LEFT: Script + Scene editor */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* Script input */}
              <div className="bg-[#0d1526] rounded-2xl border border-white/8 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clapperboard className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-white">Video Script</h2>
                </div>
                <textarea
                  value={script}
                  onChange={e => setScript(e.target.value)}
                  rows={6}
                  placeholder="Type or paste your full video script here. Separate each scene idea with a blank line, or just write it all out and we'll split it automatically."
                  className="w-full bg-[#070d1a] border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
                <p className="mt-2 text-xs text-gray-600">
                  Separate scenes with blank lines, or write one block — we'll split by sentence automatically.
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={handleMakeVideo}
                    disabled={!script.trim()}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  >
                    <Clapperboard className="w-4 h-4" />
                    Make Video
                  </button>
                  <button
                    onClick={() => { setScenes(DEFAULT_SCENES); setVideoTitle('FM Trader Promo'); setPlayerKey(k => k + 1) }}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-white text-xs transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />Reset
                  </button>
                </div>
              </div>

              {/* Title + aspect ratio */}
              <div className="bg-[#0d1526] rounded-2xl border border-white/8 p-5 space-y-4">
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1.5 block">Video Title</label>
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={e => setVideoTitle(e.target.value)}
                    className="w-full bg-[#070d1a] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1.5 block">Format</label>
                  <div className="flex gap-2">
                    {(['16:9', '9:16'] as const).map(ar => (
                      <button
                        key={ar}
                        onClick={() => { setAspectRatio(ar); setPlayerKey(k => k + 1) }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                          aspectRatio === ar
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {ar === '16:9' ? '16:9 — YouTube' : '9:16 — Shorts / Reels'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scene list */}
              <div className="bg-[#0d1526] rounded-2xl border border-white/8 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-gray-400" />
                    <h2 className="text-sm font-bold text-white">Scenes</h2>
                    <span className="text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">
                      {scenes.length} scenes · {(duration / FPS).toFixed(0)}s
                    </span>
                  </div>
                  <button
                    onClick={addScene}
                    className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 px-3 py-1.5 rounded-lg transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />Add Scene
                  </button>
                </div>
                <div className="space-y-2">
                  {scenes.map((scene, i) => (
                    <SceneRow
                      key={scene.id}
                      scene={scene}
                      index={i}
                      total={scenes.length}
                      onChange={s => updateScene(i, s)}
                      onDelete={() => deleteScene(i)}
                      onMove={dir => moveScene(i, dir)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Preview + controls */}
            <div className="xl:w-[580px] shrink-0 space-y-5">

              {/* Player */}
              <div className="bg-[#0d1526] rounded-2xl border border-white/8 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-bold text-white">Preview</span>
                  </div>
                  <span className="text-xs text-gray-600">{dims.width}×{dims.height} · {(duration / FPS).toFixed(1)}s</span>
                </div>

                <div className="p-4 relative">
                  <div className="rounded-xl overflow-hidden bg-black border border-white/5">
                    {autoPlayKey !== null ? (
                      <RemotionPlayer
                        key={autoPlayKey}
                        component={PromoVideoComp as unknown as React.ComponentType<Record<string, unknown>>}
                        inputProps={{ scenes, title: videoTitle, aspectRatio } as PromoVideoProps}
                        durationInFrames={duration}
                        compositionWidth={dims.width}
                        compositionHeight={dims.height}
                        fps={FPS}
                        style={{ width: '100%' }}
                        controls={false}
                        loop={false}
                        autoPlay
                      />
                    ) : (
                      <RemotionPlayer
                        key={playerKey}
                        component={PromoVideoComp as unknown as React.ComponentType<Record<string, unknown>>}
                        inputProps={{ scenes, title: videoTitle, aspectRatio } as PromoVideoProps}
                        durationInFrames={duration}
                        compositionWidth={dims.width}
                        compositionHeight={dims.height}
                        fps={FPS}
                        style={{ width: '100%' }}
                        controls
                        loop={false}
                        clickToPlay
                      />
                    )}
                  </div>

                  {/* Recording progress overlay */}
                  {recording && (
                    <div className="absolute inset-4 rounded-xl pointer-events-none border-2 border-red-500/60 flex flex-col items-end justify-end p-3">
                      <div className="bg-black/70 backdrop-blur rounded-lg px-3 py-1.5 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs text-red-400 font-semibold">Recording</span>
                        <span className="text-xs text-gray-400">{Math.round(recordProgress)}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {recording && (
                  <div className="mx-4 mb-3 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-200"
                      style={{ width: `${recordProgress}%` }}
                    />
                  </div>
                )}

                {/* Download button */}
                <div className="px-5 pb-5">
                  {recordError && (
                    <p className="mb-3 text-xs text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />{recordError}
                    </p>
                  )}
                  <button
                    onClick={handleDownload}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                      recording
                        ? 'bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/25'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {recording
                      ? <><div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />Cancel</>
                      : <><Download className="w-4 h-4" />Download Video</>
                    }
                  </button>
                  {!recording && (
                    <p className="mt-2 text-xs text-gray-600 text-center">
                      Confirm &ldquo;Share tab&rdquo; when prompted — video plays and downloads automatically.
                    </p>
                  )}
                </div>
              </div>

              {/* Save project */}
              <div className="bg-[#0d1526] rounded-2xl border border-white/8 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Save className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-bold text-white">Save Project</h2>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-white/8 border border-white/10 hover:bg-white/12 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving…' : 'Save to Library'}
                  </button>
                  {saveMsg && (
                    <span className={`text-sm flex items-center gap-1.5 ${saveMsg === 'Saved!' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {saveMsg === 'Saved!' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {saveMsg}
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── LIBRARY TAB ────────────────────────────────────────────────────────── */}
      {tab === 'library' && (
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
          <div className="mb-6">
            <h2 className="text-xl font-black text-white">Saved Projects</h2>
            <p className="text-sm text-gray-500 mt-1">Load a project to edit, or delete to remove.</p>
          </div>

          {loadingProjects && (
            <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          )}

          {!loadingProjects && projects.length === 0 && (
            <div className="text-center py-24">
              <Video className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No saved projects yet.</p>
              <button
                onClick={() => setTab('create')}
                className="mt-4 text-emerald-400 text-sm hover:text-emerald-300 transition-colors"
              >
                Create your first video →
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <div key={project.id} className="bg-[#0d1526] border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-all group">
                {/* Thumbnail placeholder */}
                <div className="aspect-video bg-gradient-to-br from-[#070d1a] to-[#0d1526] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-5">
                    <svg width="100%" height="100%">
                      <defs>
                        <pattern id={`g-${project.id}`} width="40" height="40" patternUnits="userSpaceOnUse">
                          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#059669" strokeWidth="0.5" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill={`url(#g-${project.id})`} />
                    </svg>
                  </div>
                  <div className="text-center z-10">
                    <div className="text-3xl font-black text-emerald-500/30">FM</div>
                    <div className="text-xs text-gray-700 mt-1">{project.scenes.length} scenes · {project.aspectRatio}</div>
                  </div>
                  <span className="absolute top-2 right-2 text-[10px] font-bold bg-white/5 text-gray-500 px-2 py-1 rounded-full border border-white/5">
                    {project.aspectRatio}
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="text-sm font-bold text-white truncate">{project.title}</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {new Date(project.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    &nbsp;·&nbsp;{project.scenes.length} scenes
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleLoad(project)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold py-2 rounded-lg transition-all"
                    >
                      <Play className="w-3.5 h-3.5" />Load & Edit
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="p-2 text-gray-600 hover:text-red-400 border border-white/8 hover:border-red-500/30 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
