'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { PlayerRef } from '@remotion/player'
import {
  LogOut, Save, Download, Play, Pause, ZoomIn, ZoomOut,
  Upload, Plus, X, Trash2, Film, Layers, Music, Image as ImageIcon,
  Loader2, Check, AlertCircle, FolderOpen, ChevronLeft, ChevronRight,
  Sparkles, BarChart2, Send,
} from 'lucide-react'
import type {
  PromoVideoProps, TimelineClip, MediaFile, SceneType, ObjectShape,
  VideoObject, EntranceAnim, MotionAnim, ExitAnim, ForexChartConfig,
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
  shape:'bg-pink-700/90', audio:'bg-amber-700/90', forex:'bg-cyan-700/90',
}

const PRESET_FOREX_SAMPLES: ForexChartConfig[] = [
  {
    pair:'EURUSD', setup:'Bullish Breakout', timeframe:'H4', trend:'bullish',
    candles:[
      {o:1.08520,h:1.08680,l:1.08380,c:1.08620},{o:1.08620,h:1.08750,l:1.08500,c:1.08580},
      {o:1.08580,h:1.08820,l:1.08440,c:1.08750},{o:1.08750,h:1.08900,l:1.08620,c:1.08700},
      {o:1.08700,h:1.08780,l:1.08520,c:1.08620},{o:1.08620,h:1.08860,l:1.08580,c:1.08820},
      {o:1.08820,h:1.08960,l:1.08720,c:1.08880},{o:1.08880,h:1.09020,l:1.08800,c:1.08940},
      {o:1.08940,h:1.09080,l:1.08820,c:1.09010},{o:1.09010,h:1.09180,l:1.08920,c:1.09150},
      {o:1.09150,h:1.09350,l:1.09050,c:1.09310},{o:1.09310,h:1.09520,l:1.09200,c:1.09480},
      {o:1.09480,h:1.09680,l:1.09380,c:1.09620},{o:1.09620,h:1.09820,l:1.09520,c:1.09780},
      {o:1.09780,h:1.09980,l:1.09680,c:1.09920},{o:1.09920,h:1.10120,l:1.09820,c:1.10080},
      {o:1.10080,h:1.10280,l:1.09980,c:1.10150},{o:1.10150,h:1.10350,l:1.10050,c:1.10280},
      {o:1.10280,h:1.10480,l:1.10180,c:1.10350},{o:1.10350,h:1.10550,l:1.10250,c:1.10480},
    ],
    ema20:[1.08600,1.08620,1.08660,1.08710,1.08740,1.08790,1.08860,1.08940,1.09030,1.09150,1.09290,1.09430,1.09560,1.09680,1.09800,1.09910,1.10010,1.10110,1.10200,1.10280],
    ema50:[1.08700,1.08710,1.08720,1.08740,1.08750,1.08760,1.08780,1.08810,1.08850,1.08900,1.08960,1.09030,1.09110,1.09200,1.09300,1.09400,1.09500,1.09590,1.09680,1.09750],
    annotations:[
      {type:'support',   price:1.08800, label:'Support Zone'},
      {type:'resistance',price:1.09100, label:'Key Resistance'},
      {type:'entry',     price:1.09165, label:'Entry Buy'},
      {type:'target',    price:1.10500, label:'Target'},
      {type:'stop',      price:1.08720, label:'Stop Loss'},
    ],
    description:'Price broke above key resistance after tight consolidation.',
  },
  {
    pair:'GBPUSD', setup:'Bearish Rejection', timeframe:'H1', trend:'bearish',
    candles:[
      {o:1.26500,h:1.26680,l:1.26380,c:1.26620},{o:1.26620,h:1.26820,l:1.26500,c:1.26760},
      {o:1.26760,h:1.26980,l:1.26680,c:1.26920},{o:1.26920,h:1.27180,l:1.26840,c:1.27080},
      {o:1.27080,h:1.27380,l:1.27000,c:1.27320},{o:1.27320,h:1.27620,l:1.27240,c:1.27560},
      {o:1.27560,h:1.27820,l:1.27480,c:1.27780},{o:1.27780,h:1.27900,l:1.27560,c:1.27620},
      {o:1.27620,h:1.27720,l:1.27360,c:1.27380},{o:1.27380,h:1.27500,l:1.27080,c:1.27120},
      {o:1.27120,h:1.27220,l:1.26820,c:1.26860},{o:1.26860,h:1.26980,l:1.26560,c:1.26620},
      {o:1.26620,h:1.26740,l:1.26320,c:1.26380},{o:1.26380,h:1.26500,l:1.26080,c:1.26140},
      {o:1.26140,h:1.26260,l:1.25840,c:1.25900},{o:1.25900,h:1.26020,l:1.25600,c:1.25660},
      {o:1.25660,h:1.25780,l:1.25360,c:1.25420},{o:1.25420,h:1.25540,l:1.25120,c:1.25180},
      {o:1.25180,h:1.25300,l:1.24880,c:1.24940},{o:1.24940,h:1.25060,l:1.24640,c:1.24700},
    ],
    ema20:[1.26700,1.26800,1.26920,1.27060,1.27220,1.27400,1.27560,1.27560,1.27440,1.27260,1.27040,1.26800,1.26540,1.26280,1.26000,1.25720,1.25440,1.25180,1.24920,1.24680],
    ema50:[1.26900,1.26940,1.26980,1.27040,1.27120,1.27220,1.27340,1.27380,1.27340,1.27260,1.27140,1.27000,1.26840,1.26660,1.26460,1.26260,1.26040,1.25820,1.25600,1.25380],
    annotations:[
      {type:'resistance',price:1.27820, label:'Resistance Zone'},
      {type:'entry',     price:1.27580, label:'Entry Sell'},
      {type:'support',   price:1.25400, label:'Target Support'},
      {type:'target',    price:1.25000, label:'Target'},
      {type:'stop',      price:1.27950, label:'Stop Loss'},
    ],
    description:'Strong rejection candle at major resistance — price reversed hard.',
  },
  {
    pair:'XAUUSD', setup:'Support Bounce', timeframe:'H4', trend:'bullish',
    candles:[
      {o:2018.50,h:2025.20,l:2015.80,c:2016.40},{o:2016.40,h:2020.00,l:2008.60,c:2010.80},
      {o:2010.80,h:2015.40,l:2002.20,c:2005.60},{o:2005.60,h:2009.80,l:1996.40,c:1998.20},
      {o:1998.20,h:2002.60,l:1988.80,c:1990.40},{o:1990.40,h:1995.20,l:1982.60,c:1984.80},
      {o:1984.80,h:1988.40,l:1978.20,c:1980.60},{o:1980.60,h:1992.40,l:1978.80,c:1990.20},
      {o:1990.20,h:2002.80,l:1988.40,c:2000.60},{o:2000.60,h:2012.40,l:1998.20,c:2010.80},
      {o:2010.80,h:2022.60,l:2008.40,c:2020.20},{o:2020.20,h:2032.40,l:2018.00,c:2030.60},
      {o:2030.60,h:2042.80,l:2028.40,c:2040.20},{o:2040.20,h:2052.60,l:2038.00,c:2050.80},
      {o:2050.80,h:2062.40,l:2048.20,c:2058.60},{o:2058.60,h:2068.20,l:2055.80,c:2064.40},
      {o:2064.40,h:2074.60,l:2062.00,c:2072.20},{o:2072.20,h:2082.40,l:2069.60,c:2080.00},
      {o:2080.00,h:2090.20,l:2077.40,c:2086.60},{o:2086.60,h:2096.80,l:2083.80,c:2092.40},
    ],
    ema20:[2015.00,2010.00,2004.00,1998.00,1993.00,1988.00,1984.00,1985.00,1990.00,1998.00,2006.00,2015.00,2024.00,2033.00,2042.00,2050.00,2058.00,2065.00,2072.00,2079.00],
    ema50:[2020.00,2017.00,2013.00,2009.00,2005.00,2001.00,1998.00,1997.00,1998.00,2001.00,2005.00,2010.00,2016.00,2023.00,2030.00,2037.00,2044.00,2051.00,2057.00,2063.00],
    annotations:[
      {type:'support',   price:1980.00, label:'Support Zone'},
      {type:'entry',     price:1985.00, label:'Entry Buy'},
      {type:'resistance',price:2050.00, label:'Resistance'},
      {type:'target',    price:2092.00, label:'Target'},
      {type:'stop',      price:1970.00, label:'Stop Loss'},
    ],
    description:'Gold bounced cleanly off key demand zone — buyers stepped in.',
  },
  {
    pair:'USDJPY', setup:'Downtrend Continuation', timeframe:'D1', trend:'bearish',
    candles:[
      {o:151.500,h:152.100,l:151.200,c:151.350},{o:151.350,h:151.800,l:150.800,c:150.920},
      {o:150.920,h:151.450,l:150.400,c:150.520},{o:150.520,h:151.050,l:149.900,c:150.080},
      {o:150.080,h:150.620,l:149.400,c:149.560},{o:149.560,h:150.100,l:149.000,c:149.120},
      {o:149.120,h:149.680,l:148.500,c:148.620},{o:148.620,h:149.200,l:148.050,c:148.180},
      {o:148.180,h:148.740,l:147.550,c:147.680},{o:147.680,h:148.250,l:147.100,c:147.220},
      {o:147.220,h:147.780,l:146.620,c:146.780},{o:146.780,h:147.340,l:146.180,c:146.320},
      {o:146.320,h:146.880,l:145.720,c:145.880},{o:145.880,h:146.440,l:145.280,c:145.420},
      {o:145.420,h:145.980,l:144.820,c:144.980},{o:144.980,h:145.540,l:144.380,c:144.520},
      {o:144.520,h:145.100,l:143.940,c:144.080},{o:144.080,h:144.640,l:143.480,c:143.620},
      {o:143.620,h:144.200,l:143.020,c:143.180},{o:143.180,h:143.740,l:142.580,c:142.720},
    ],
    ema20:[151.400,151.000,150.600,150.200,149.800,149.400,149.000,148.600,148.200,147.800,147.400,147.000,146.600,146.200,145.800,145.400,145.000,144.600,144.200,143.800],
    ema50:[151.800,151.600,151.300,151.000,150.700,150.400,150.100,149.800,149.500,149.200,148.900,148.600,148.300,148.000,147.700,147.400,147.100,146.800,146.500,146.200],
    annotations:[
      {type:'resistance',price:151.000, label:'Resistance'},
      {type:'entry',     price:149.000, label:'Entry Sell'},
      {type:'support',   price:143.500, label:'Support'},
      {type:'target',    price:142.800, label:'Target'},
      {type:'stop',      price:151.500, label:'Stop Loss'},
    ],
    description:'USDJPY in confirmed downtrend — EMA20 well below EMA50.',
  },
  {
    pair:'EURUSD', setup:'Double Bottom', timeframe:'H4', trend:'bullish',
    candles:[
      {o:1.07500,h:1.07680,l:1.07280,c:1.07340},{o:1.07340,h:1.07520,l:1.07000,c:1.07080},
      {o:1.07080,h:1.07260,l:1.06820,c:1.06880},{o:1.06880,h:1.07060,l:1.06620,c:1.06700},
      {o:1.06700,h:1.07100,l:1.06620,c:1.07020},{o:1.07020,h:1.07380,l:1.06920,c:1.07280},
      {o:1.07280,h:1.07580,l:1.07180,c:1.07440},{o:1.07440,h:1.07580,l:1.07100,c:1.07160},
      {o:1.07160,h:1.07300,l:1.06820,c:1.06900},{o:1.06900,h:1.07040,l:1.06680,c:1.06760},
      {o:1.06760,h:1.07260,l:1.06680,c:1.07180},{o:1.07180,h:1.07680,l:1.07080,c:1.07600},
      {o:1.07600,h:1.08100,l:1.07500,c:1.08020},{o:1.08020,h:1.08520,l:1.07920,c:1.08440},
      {o:1.08440,h:1.08940,l:1.08340,c:1.08860},{o:1.08860,h:1.09360,l:1.08760,c:1.09280},
      {o:1.09280,h:1.09780,l:1.09180,c:1.09700},{o:1.09700,h:1.10200,l:1.09600,c:1.10120},
      {o:1.10120,h:1.10620,l:1.10020,c:1.10540},{o:1.10540,h:1.11040,l:1.10440,c:1.10960},
    ],
    ema20:[1.07500,1.07340,1.07180,1.06980,1.06920,1.07000,1.07100,1.07120,1.07060,1.06960,1.07040,1.07200,1.07440,1.07760,1.08100,1.08460,1.08820,1.09180,1.09540,1.09880],
    ema50:[1.07700,1.07620,1.07520,1.07380,1.07280,1.07240,1.07240,1.07220,1.07180,1.07100,1.07060,1.07100,1.07220,1.07400,1.07620,1.07860,1.08120,1.08380,1.08640,1.08900],
    annotations:[
      {type:'support',   price:1.06720, label:'Double Bottom'},
      {type:'resistance',price:1.07480, label:'Neckline'},
      {type:'entry',     price:1.07520, label:'Entry Buy'},
      {type:'target',    price:1.10800, label:'Target'},
      {type:'stop',      price:1.06600, label:'Stop Loss'},
    ],
    description:'Classic double bottom with neckline breakout — high probability reversal.',
  },
  {
    pair:'GBPJPY', setup:'Bullish Flag', timeframe:'H1', trend:'bullish',
    candles:[
      {o:188.500,h:189.100,l:188.200,c:188.920},{o:188.920,h:189.680,l:188.780,c:189.560},
      {o:189.560,h:190.320,l:189.400,c:190.180},{o:190.180,h:190.980,l:190.020,c:190.840},
      {o:190.840,h:191.620,l:190.680,c:191.500},{o:191.500,h:192.280,l:191.340,c:192.160},
      {o:192.160,h:192.400,l:191.680,c:191.780},{o:191.780,h:192.020,l:191.380,c:191.480},
      {o:191.480,h:191.760,l:191.080,c:191.240},{o:191.240,h:191.520,l:190.880,c:191.100},
      {o:191.100,h:191.420,l:190.740,c:191.320},{o:191.320,h:191.680,l:191.000,c:191.560},
      {o:191.560,h:192.380,l:191.440,c:192.220},{o:192.220,h:193.040,l:192.080,c:192.880},
      {o:192.880,h:193.700,l:192.740,c:193.560},{o:193.560,h:194.380,l:193.420,c:194.240},
      {o:194.240,h:195.060,l:194.100,c:194.920},{o:194.920,h:195.740,l:194.780,c:195.600},
      {o:195.600,h:196.420,l:195.460,c:196.280},{o:196.280,h:197.100,l:196.140,c:196.960},
    ],
    ema20:[188.800,189.320,189.880,190.460,191.060,191.680,191.840,191.820,191.680,191.520,191.420,191.560,191.880,192.340,192.880,193.480,194.120,194.780,195.460,196.140],
    ema50:[188.000,188.380,188.780,189.220,189.700,190.220,190.620,190.860,190.980,191.020,191.060,191.140,191.360,191.720,192.200,192.760,193.360,193.980,194.620,195.260],
    annotations:[
      {type:'support',   price:190.800, label:'Flag Support'},
      {type:'resistance',price:192.200, label:'Flag Resistance'},
      {type:'entry',     price:191.600, label:'Entry Buy'},
      {type:'target',    price:197.000, label:'Target'},
      {type:'stop',      price:190.400, label:'Stop Loss'},
    ],
    description:'Bull flag breakout after strong impulse move — trend continuation setup.',
  },
]
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

type SideTab = 'media' | 'scenes' | 'objects' | 'audio' | 'ai'

type TrackId = 'main' | 'overlay' | 'overlay2' | 'audio'

type DragPayload =
  | { kind: 'scene'; sceneType: SceneType }
  | { kind: 'shape'; shape: ObjectShape }
  | { kind: 'media'; mediaId: string }
  | { kind: 'audio'; mediaId: string }
  | { kind: 'forex'; config: ForexChartConfig }

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

function newForexClip(config: ForexChartConfig, startFrame: number): TimelineClip {
  return {
    id: String(Date.now() + Math.random()),
    track: 'main',
    startFrame,
    durationFrames: 8 * FPS,
    clipType: 'forex',
    forexConfig: config,
  }
}

// ── ObjectEditor component ────────────────────────────────────────────────────

function ObjectEditor({ obj, onChange, onDelete, mediaFiles }: {
  obj:        VideoObject
  onChange:   (o: VideoObject) => void
  onDelete:   () => void
  mediaFiles?: MediaFile[]
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

      {/* ── Media Fill ────────────────────────────────────────────────────────── */}
      {obj.shape !== 'text' && (
        <div className="space-y-2 border-t border-white/8 pt-3">
          <div className="flex items-center justify-between">
            <label className={labelCls + ' mb-0'}>Media Fill</label>
            {obj.mediaFill && (
              <button
                onClick={() => set({ mediaFill: undefined, mediaFillType: undefined })}
                className="text-[10px] text-red-400 hover:text-red-300 transition-colors flex items-center gap-0.5"
              >
                <X className="w-2.5 h-2.5" />Remove
              </button>
            )}
          </div>

          {obj.mediaFill && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-lg p-2">
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-black border border-white/10">
                {obj.mediaFillType === 'video'
                  ? <video src={obj.mediaFill} className="w-full h-full object-cover" muted />
                  : <img src={obj.mediaFill} alt="" className="w-full h-full object-cover" />}
              </div>
              <p className="text-[10px] text-emerald-400 font-medium">
                {obj.mediaFillType === 'video' ? '▶ Video fill active' : '🖼 Image fill active'}
              </p>
            </div>
          )}

          {(mediaFiles ?? []).filter(m => m.type !== 'audio').length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
              {(mediaFiles ?? []).filter(m => m.type !== 'audio').map(m => (
                <button
                  key={m.id}
                  onClick={() => set({ mediaFill: m.url, mediaFillType: m.type as 'image' | 'video' })}
                  title={m.name}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    obj.mediaFill === m.url
                      ? 'border-emerald-500 ring-1 ring-emerald-500/40'
                      : 'border-white/10 hover:border-emerald-500/40'
                  }`}
                >
                  {m.type === 'video'
                    ? <video src={m.url} className="w-full h-full object-cover" muted />
                    : <img src={m.url} alt={m.name} className="w-full h-full object-cover" />}
                  {m.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-4 h-4 bg-black/60 rounded-full flex items-center justify-center">
                        <Play className="w-2 h-2 text-white" />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-gray-600 italic">Upload images or videos in the Media panel to use as fill.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Properties panel ──────────────────────────────────────────────────────────

function PropertiesPanel({
  clip,
  onUpdate,
  onClose,
  mediaFiles,
}: {
  clip:       TimelineClip
  onUpdate:   (c: TimelineClip) => void
  onClose:    () => void
  mediaFiles?: MediaFile[]
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
    <div className="w-[220px] md:w-[250px] xl:w-[280px] shrink-0 bg-[#0a1020] border-l border-white/8 flex flex-col overflow-y-auto">
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
                    mediaFiles={mediaFiles}
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
              mediaFiles={mediaFiles}
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
  const [panelOpen, setPanelOpen]       = useState(true)
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

  // Export
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportState, setExportState]         = useState<'idle' | 'recording'>('idle')
  const [exportQuality, setExportQuality]     = useState<'1080p' | '4k'>('1080p')
  const [exportProgress, setExportProgress]   = useState(0)

  // AI Media
  const [aiPrompt, setAiPrompt]         = useState('')
  const [aiLoading, setAiLoading]       = useState(false)
  const [aiGenerated, setAiGenerated]   = useState<ForexChartConfig | null>(null)
  const [aiError, setAiError]           = useState('')
  const [forexSamples, setForexSamples] = useState<ForexChartConfig[]>(PRESET_FOREX_SAMPLES)
  const [samplesOpen, setSamplesOpen]   = useState(true)

  // Refs
  const playerRef          = useRef<PlayerRef | null>(null)
  const timelineRef        = useRef<HTMLDivElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const playIntervalRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const exportRecorderRef  = useRef<MediaRecorder | null>(null)
  const exportCancelledRef = useRef(false)

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

  // Load persisted forex samples on mount (overrides hardcoded defaults)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('video-hub-forex-samples')
      if (stored) setForexSamples(JSON.parse(stored) as ForexChartConfig[])
    } catch {}
  }, [])

  // Persist forex samples whenever they change
  useEffect(() => {
    try { localStorage.setItem('video-hub-forex-samples', JSON.stringify(forexSamples)) } catch {}
  }, [forexSamples])

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

  // ── Export ───────────────────────────────────────────────────────────────────

  async function startExport() {
    if (!previewContainerRef.current || !playerRef.current) return
    setShowExportModal(false)
    setExportState('recording')
    setExportProgress(0)
    exportCancelledRef.current = false

    try {
      // Capture the browser tab
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, displaySurface: 'browser' },
        audio: true,
        selfBrowserSurface: 'include',
        preferCurrentTab: true,
      } as MediaStreamConstraints)

      // Off-screen canvas at export resolution — crops the mini player from the tab capture
      const exportW = exportQuality === '4k' ? 3840 : 1920
      const exportH = exportQuality === '4k'
        ? (aspectRatio === '16:9' ? 2160 : 3840)
        : (aspectRatio === '16:9' ? 1080 : 1920)

      const canvas = document.createElement('canvas')
      canvas.width  = exportW
      canvas.height = exportH
      const ctx = canvas.getContext('2d')!

      // Feed the display stream into a video element so we can drawImage from it
      const captureVid = document.createElement('video')
      captureVid.autoplay = true
      captureVid.muted    = true
      captureVid.playsInline = true
      captureVid.srcObject = displayStream
      await new Promise<void>(r => {
        captureVid.onloadedmetadata = () => { captureVid.play().then(() => r()) }
      })

      // Derive the scale from the actual capture resolution vs viewport
      let rafId: number
      const drawFrame = () => {
        if (!previewContainerRef.current) return
        const rect  = previewContainerRef.current.getBoundingClientRect()
        const scaleX = captureVid.videoWidth  / window.innerWidth
        const scaleY = captureVid.videoHeight / window.innerHeight
        ctx.drawImage(
          captureVid,
          rect.left   * scaleX, rect.top    * scaleY,
          rect.width  * scaleX, rect.height * scaleY,
          0, 0, exportW, exportH
        )
        rafId = requestAnimationFrame(drawFrame)
      }
      rafId = requestAnimationFrame(drawFrame)

      // Record the canvas + audio from the tab capture
      const canvasStream = canvas.captureStream(30)
      displayStream.getAudioTracks().forEach(t => canvasStream.addTrack(t))

      const mimeType = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']
        .find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm'

      const recorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: exportQuality === '4k' ? 25_000_000 : 8_000_000,
      })
      exportRecorderRef.current = recorder

      const chunks: Blob[] = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

      recorder.onstop = () => {
        cancelAnimationFrame(rafId)
        displayStream.getTracks().forEach(t => t.stop())
        captureVid.srcObject = null

        setExportState('idle')
        setExportProgress(0)

        if (exportCancelledRef.current) return   // user cancelled — skip download

        const blob = new Blob(chunks, { type: mimeType })
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href     = url
        a.download = `${videoTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`
        document.body.appendChild(a)
        a.click()
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 1000)
      }

      // If user stops screen-sharing manually, cancel cleanly
      displayStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        exportCancelledRef.current = true
        if (recorder.state !== 'inactive') recorder.stop()
      })

      recorder.start(100)

      // Play the mini player from frame 0
      playerRef.current.seekTo(0)
      setCurrentFrame(0)
      playerRef.current.play()

      // Progress tracking + auto-stop when video duration elapses
      const totalMs   = (Math.max(duration, 120) / FPS) * 1000
      const startTime = Date.now()
      const tick = setInterval(() => {
        setExportProgress(Math.min(99, ((Date.now() - startTime) / totalMs) * 100))
      }, 200)

      setTimeout(() => {
        clearInterval(tick)
        setExportProgress(100)
        if (recorder.state !== 'inactive') recorder.stop()
      }, totalMs + 800)

    } catch (err: unknown) {
      const e = err as Error
      if (e?.name !== 'NotAllowedError') console.error('Export error:', err)
      setExportState('idle')
      setExportProgress(0)
    }
  }

  function cancelExport() {
    exportCancelledRef.current = true
    if (exportRecorderRef.current?.state !== 'inactive') exportRecorderRef.current?.stop()
    setExportState('idle')
    setExportProgress(0)
  }

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

  // ── AI forex generation ───────────────────────────────────────────────────────

  async function handleForexGenerate() {
    if (!aiPrompt.trim() || aiLoading) return
    setAiLoading(true)
    setAiError('')
    setAiGenerated(null)
    try {
      const res = await fetch('/api/generate-forex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      })
      const data = await res.json() as { config?: ForexChartConfig; error?: string }
      if (!res.ok || data.error) throw new Error(data.error ?? 'Generation failed')
      setAiGenerated(data.config!)
    } catch (err: unknown) {
      setAiError((err as Error).message ?? 'Something went wrong')
    } finally {
      setAiLoading(false)
    }
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
    } else if (payload.kind === 'forex') {
      const dest = track === 'audio' ? 'main' : track
      newClip = { ...newForexClip(payload.config, startFrame), track: dest }
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

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col bg-[#070d1a] text-white" style={{ minHeight: '100vh' }}>

      {/* ── STICKY NAVBAR ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 shrink-0 flex items-center gap-2 px-3 border-b border-white/8 bg-[#0a1020]/95 backdrop-blur-md" style={{ minHeight: 48 }}>

        {/* Brand */}
        <div className="flex items-center gap-2 mr-1">
          <Film className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-white hidden sm:inline">Video Hub</span>
        </div>

        {/* Section nav */}
        <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5">
          <button
            onClick={() => scrollTo('editor')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-gray-400 hover:text-white hover:bg-white/8 transition-all"
          >
            <Film className="w-3 h-3" />
            <span className="hidden md:inline">Preview</span>
          </button>
          <button
            onClick={() => scrollTo('timeline')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-gray-400 hover:text-white hover:bg-white/8 transition-all"
          >
            <Layers className="w-3 h-3" />
            <span className="hidden md:inline">Timeline</span>
          </button>
        </div>

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* Project title */}
        <input
          type="text"
          value={videoTitle}
          onChange={e => setVideoTitle(e.target.value)}
          className="flex-1 min-w-0 max-w-[120px] md:max-w-[200px] bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
        />

        {/* Aspect ratio */}
        <div className="flex gap-1 bg-white/5 p-0.5 rounded-lg">
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

        {/* Actions */}
        <button
          onClick={() => setShowLibrary(v => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg transition-all"
        >
          <FolderOpen className="w-3.5 h-3.5" /><span className="hidden sm:inline">Library</span>
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 text-xs bg-white/8 hover:bg-white/12 border border-white/10 text-white px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{saving ? 'Saving…' : 'Save'}</span>
        </button>

        {saveMsg && (
          <span className={`text-xs hidden sm:flex items-center gap-1 ${saveMsg === 'Saved!' ? 'text-emerald-400' : 'text-red-400'}`}>
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
      </nav>

      {/* ── EDITOR SECTION ─────────────────────────────────────────────────────── */}
      {/* Fixed viewport height minus navbar so editor fills the first screen */}
      <section id="editor" className="shrink-0 flex overflow-hidden" style={{ height: 'calc(100vh - 48px)' }}>
        <div className="flex flex-col w-full overflow-hidden">

      {/* ── MIDDLE ROW ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Collapsible left panel with nav tab bar */}
        <div className={`shrink-0 flex flex-col bg-[#0d1526] border-r border-white/8 overflow-hidden transition-all duration-200 ${panelOpen ? 'w-[220px] lg:w-[250px] xl:w-[260px]' : 'w-0'}`}>
          {/* Nav tab bar */}
          <div className="flex shrink-0 bg-[#070d1a] border-b border-white/8">
            {([
              ['media',   ImageIcon, 'Media'],
              ['scenes',  Film,      'Scenes'],
              ['objects', Layers,    'Objects'],
              ['audio',   Music,     'Audio'],
              ['ai',      Sparkles,  'AI'],
            ] as [SideTab, React.ComponentType<{className?: string}>, string][]).map(([tab, Icon, label]) => (
              <button
                key={tab}
                onClick={() => setSideTab(tab)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 border-b-2 transition-all ${
                  sideTab === tab
                    ? tab === 'ai'
                      ? 'text-purple-400 border-purple-400 bg-purple-500/5'
                      : 'text-emerald-400 border-emerald-400 bg-emerald-500/5'
                    : 'text-gray-600 border-transparent hover:text-gray-300 hover:bg-white/3'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[9px] font-semibold tracking-wide whitespace-nowrap">{label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-2" style={{ minWidth: 180 }}>

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

            {/* AI MEDIA panel */}
            {sideTab === 'ai' && (
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center gap-1.5 pb-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-bold text-white">AI Media</span>
                </div>

                {/* Prompt input */}
                <div className="space-y-1.5">
                  <textarea
                    rows={3}
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleForexGenerate() }}
                    placeholder="Describe a forex setup…&#10;e.g. GBPUSD bearish flag on H4"
                    className="w-full bg-[#070d1a] border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 resize-none"
                  />
                  <button
                    onClick={handleForexGenerate}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all"
                  >
                    {aiLoading
                      ? <><Loader2 className="w-3 h-3 animate-spin" />Generating…</>
                      : <><Send className="w-3 h-3" />Generate Chart</>}
                  </button>
                </div>

                {/* Error */}
                {aiError && (
                  <p className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-2">{aiError}</p>
                )}

                {/* Generated result */}
                {aiGenerated && (() => {
                  const cfg = aiGenerated
                  const payload: DragPayload = { kind: 'forex', config: cfg }
                  const alreadySaved = forexSamples.some(s => s.pair === cfg.pair && s.setup === cfg.setup)
                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-purple-400 font-semibold">Generated — drag to timeline</p>
                        <button
                          onClick={() => { if (!alreadySaved) setForexSamples(prev => [...prev, cfg]) }}
                          disabled={alreadySaved}
                          className="flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-lg border transition-all disabled:opacity-40 disabled:cursor-default text-cyan-400 border-cyan-500/30 hover:border-cyan-400/60 hover:text-cyan-300"
                        >
                          <Plus className="w-2.5 h-2.5" />{alreadySaved ? 'Saved' : 'Save to Samples'}
                        </button>
                      </div>
                      <div
                        draggable
                        onDragStart={e => e.dataTransfer.setData('application/json', JSON.stringify(payload))}
                        onClick={() => {
                          const end = totalDurationFrames(clips.filter(c => c.track === 'main'))
                          setClips(prev => [...prev, newForexClip(cfg, end)])
                        }}
                        className="bg-[#070d1a] border border-purple-500/40 hover:border-purple-400/70 rounded-lg p-2.5 cursor-grab active:cursor-grabbing transition-all group"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <BarChart2 className="w-3 h-3 text-purple-400" />
                          <span className="text-[10px] font-bold text-white">{cfg.pair}</span>
                          <span className={`text-[9px] px-1 rounded font-semibold ${cfg.trend === 'bullish' ? 'text-emerald-400 bg-emerald-500/15' : cfg.trend === 'bearish' ? 'text-red-400 bg-red-500/15' : 'text-gray-400 bg-white/8'}`}>
                            {cfg.trend.toUpperCase()}
                          </span>
                          <span className="ml-auto text-[9px] text-gray-600">{cfg.timeframe}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 truncate">{cfg.setup}</p>
                        <p className="text-[9px] text-gray-600 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Click to add · drag to position</p>
                      </div>
                    </div>
                  )
                })()}

                {/* Samples dropdown */}
                <div className="border border-white/8 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setSamplesOpen(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-white/3 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <BarChart2 className="w-3 h-3 text-cyan-400" />
                      <span className="text-[10px] font-semibold text-gray-300">Samples ({forexSamples.length})</span>
                    </div>
                    <ChevronRight className={`w-3 h-3 text-gray-500 transition-transform duration-150 ${samplesOpen ? 'rotate-90' : ''}`} />
                  </button>

                  {samplesOpen && (
                    <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                      {forexSamples.length === 0 && (
                        <p className="text-[10px] text-gray-600 text-center py-4">No samples yet. Generate one and save it!</p>
                      )}
                      {forexSamples.map((cfg, i) => {
                        const payload: DragPayload = { kind: 'forex', config: cfg }
                        return (
                          <div
                            key={i}
                            draggable
                            onDragStart={e => e.dataTransfer.setData('application/json', JSON.stringify(payload))}
                            onClick={() => {
                              const end = totalDurationFrames(clips.filter(c => c.track === 'main'))
                              setClips(prev => [...prev, newForexClip(cfg, end)])
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-2 cursor-grab active:cursor-grabbing hover:bg-white/3 transition-colors group"
                          >
                            <BarChart2 className="w-3 h-3 text-cyan-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-white">{cfg.pair}</span>
                                <span className={`text-[9px] px-1 rounded font-semibold ${cfg.trend === 'bullish' ? 'text-emerald-400 bg-emerald-500/15' : cfg.trend === 'bearish' ? 'text-red-400 bg-red-500/15' : 'text-gray-400 bg-white/8'}`}>
                                  {cfg.trend === 'bullish' ? '▲' : cfg.trend === 'bearish' ? '▼' : '◆'}
                                </span>
                                <span className="text-[9px] text-gray-600">{cfg.timeframe}</span>
                              </div>
                              <p className="text-[9px] text-gray-500 truncate">{cfg.setup}</p>
                            </div>
                            <button
                              onClick={e => { e.stopPropagation(); setForexSamples(prev => prev.filter((_, j) => j !== i)) }}
                              className="shrink-0 p-0.5 text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                              title="Delete sample"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Panel collapse toggle */}
        <button
          onClick={() => setPanelOpen(v => !v)}
          className="shrink-0 w-5 bg-[#070d1a] border-r border-white/8 flex items-center justify-center hover:bg-white/5 text-gray-600 hover:text-white transition-colors z-10"
          title={panelOpen ? 'Hide panel' : 'Show panel'}
        >
          {panelOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>

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
            style={{ maxHeight: 'calc(100vh - 300px)', aspectRatio: aspectRatio === '16:9' ? '16/9' : '9/16', maxWidth: '100%' }}
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
                numberOfSharedAudioTags={5}
              />
            </div>
            {selectedClip && exportState === 'idle' && (
              <PreviewOverlay
                clip={selectedClip}
                onUpdate={updateClip}
                containerRef={previewContainerRef}
                activeObjId={activeObjId}
                setActiveObjId={setActiveObjId}
              />
            )}

            {/* Recording indicator — shown over the mini player during export */}
            {exportState === 'recording' && (
              <div className="absolute inset-0 z-20 pointer-events-none rounded-xl overflow-hidden">
                <div className="absolute inset-0 border-2 border-red-500/60 rounded-xl" />
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600/90 backdrop-blur-sm rounded-full px-2.5 py-1">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  <span className="text-white text-[10px] font-bold tracking-wide">
                    REC {Math.round(exportProgress)}%
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/30">
                  <div
                    className="h-full bg-red-500 transition-all duration-200"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Properties panel (only when clip selected) */}
        {selectedClip && (
          <PropertiesPanel
            clip={selectedClip}
            onUpdate={updateClip}
            onClose={() => setSelectedClipId(null)}
            mediaFiles={mediaFiles}
          />
        )}
      </div>
        </div>{/* closes flex flex-col w-full */}
      </section>{/* closes #editor */}

      {/* ── TIMELINE SECTION ────────────────────────────────────────────────────── */}
      <section id="timeline" className="bg-[#070d1a] border-t-2 border-emerald-500/30">

        {/* Section header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#0a1020] border-b border-white/8">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Timeline</span>
          </div>
          <button
            onClick={() => scrollTo('editor')}
            className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-white transition-colors"
          >
            <span>↑ Back to Preview</span>
          </button>
        </div>

        <div style={{ height: 'clamp(240px, 30vh, 300px)' }}>

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

          {exportState === 'recording' ? (
            <button
              onClick={cancelExport}
              className="flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg transition-all animate-pulse"
            >
              <X className="w-3.5 h-3.5" />Stop
            </button>
          ) : (
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-all"
            >
              <Download className="w-3.5 h-3.5" />Export
            </button>
          )}
        </div>

        {/* Scrollable ruler + tracks */}
        <div
          ref={timelineRef}
          className="overflow-x-auto overflow-y-auto"
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
                      clip.clipType === 'scene'  ? (clip.scene?.headline ?? clip.clipType) :
                      clip.clipType === 'shape'  ? (clip.shape ? SHAPE_LABELS[clip.shape.shape] ?? clip.clipType : clip.clipType) :
                      clip.clipType === 'forex'  ? `${clip.forexConfig?.pair ?? 'FOREX'} ${clip.forexConfig?.setup ?? ''}` :
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
      </div>{/* closes clamp height div */}
      </section>{/* closes #timeline */}

      {/* ── EXPORT MODAL ───────────────────────────────────────────────────────── */}
      {showExportModal && exportState === 'idle' && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-6" onClick={() => setShowExportModal(false)}>
          <div
            className="bg-[#0d1526] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                Export Video
              </h2>
              <button onClick={() => setShowExportModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Quality */}
              <div>
                <p className="text-xs text-gray-400 mb-2">Export Quality</p>
                <div className="flex gap-2">
                  {(['1080p', '4k'] as const).map(q => (
                    <button
                      key={q}
                      onClick={() => setExportQuality(q)}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                        exportQuality === q
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      {q === '4k' ? '4K Ultra HD' : '1080p HD'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="bg-white/5 rounded-xl p-4 space-y-2 text-xs">
                <p className="text-gray-300">
                  Duration: <span className="text-white font-medium">{(Math.max(duration, 120) / FPS).toFixed(1)}s</span>
                  &nbsp;·&nbsp;
                  Format: <span className="text-white font-medium">MP4</span>
                </p>
                <div className="space-y-1 text-gray-400 leading-relaxed">
                  <p>1. Click <strong className="text-white">Start Export</strong> — a share dialog appears.</p>
                  <p>2. Select <strong className="text-amber-300">&quot;This Tab&quot;</strong> and check <strong className="text-amber-300">&quot;Share audio&quot;</strong>.</p>
                  <p>3. The mini player renders through from start to finish.</p>
                  <p>4. Your <strong className="text-white">MP4 file downloads automatically</strong> when done.</p>
                </div>
              </div>

              <button
                onClick={startExport}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Start Export
              </button>
            </div>
          </div>
        </div>
      )}

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
