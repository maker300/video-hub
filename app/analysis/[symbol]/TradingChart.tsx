'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  createChart, CandlestickSeries, LineSeries, HistogramSeries,
  ColorType, CrosshairMode,
  type IChartApi, type ISeriesApi, type CandlestickSeriesOptions, type Time,
} from 'lightweight-charts'
import { Loader2, Zap, Maximize2, Minimize2, RotateCcw, Trash2 } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Bar { time: number; open: number; high: number; low: number; close: number; volume: number }

interface Props {
  slug: string; symbol: string; display: string; currentPrice: number; changePct: number
}

type DrawTool = 'cursor' | 'trendline' | 'ray' | 'hline' | 'vline' | 'rect' | 'circle' | 'arrow' | 'fib' | 'brush' | 'text'

/** Points stored as ratios [0–1] relative to the SVG container */
interface Pt { x: number; y: number }
interface Drawing { id: string; tool: DrawTool; pts: Pt[]; color: string; width: number; text?: string }

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TIMEFRAMES = [
  { id: '1m', label: '1m' }, { id: '5m', label: '5m' }, { id: '15m', label: '15m' },
  { id: '30m', label: '30m' }, { id: '1h', label: '1H' }, { id: '4h', label: '4H' },
  { id: '1d', label: '1D' }, { id: '1w', label: '1W' }, { id: '1M', label: '1M' },
]

const INDICATOR_DEFS = [
  { id: 'ema9',   label: 'EMA 9',           color: '#60a5fa' },
  { id: 'ema21',  label: 'EMA 21',          color: '#f59e0b' },
  { id: 'ema50',  label: 'EMA 50',          color: '#a78bfa' },
  { id: 'ema200', label: 'EMA 200',         color: '#f87171' },
  { id: 'bb',     label: 'Bollinger Bands', color: '#94a3b8' },
  { id: 'vol',    label: 'Volume',          color: '#334155' },
  { id: 'rsi',    label: 'RSI',             color: '#34d399' },
  { id: 'macd',   label: 'MACD',            color: '#818cf8' },
]

const DRAW_COLORS = [
  '#ffffff', '#fbbf24', '#f87171', '#34d399',
  '#60a5fa', '#a78bfa', '#fb923c', '#22d3ee', '#f472b6',
]

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
const FIB_COLORS = ['#ef5350', '#fb923c', '#fbbf24', '#94a3b8', '#60a5fa', '#a78bfa', '#34d399']

const TOOL_LABELS: Record<DrawTool, string> = {
  cursor: 'Select / Pan', trendline: 'Trend Line', ray: 'Ray / Forecast',
  hline: 'Horizontal Line', vline: 'Vertical Line', rect: 'Rectangle',
  circle: 'Ellipse', arrow: 'Arrow', fib: 'Fibonacci', brush: 'Brush', text: 'Text',
}

const TOOL_GROUPS: { label: string; tools: DrawTool[] }[] = [
  { label: 'Select',   tools: ['cursor'] },
  { label: 'Lines',    tools: ['trendline', 'ray', 'hline', 'vline'] },
  { label: 'Shapes',   tools: ['rect', 'circle', 'arrow'] },
  { label: 'Forecast', tools: ['fib'] },
  { label: 'Draw',     tools: ['brush', 'text'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// Math helpers
// ─────────────────────────────────────────────────────────────────────────────

function calcEMA(vals: number[], p: number): number[] {
  const k = 2 / (p + 1), out = new Array(vals.length).fill(NaN)
  let ema = vals.slice(0, p).reduce((a, b) => a + b, 0) / p
  out[p - 1] = ema
  for (let i = p; i < vals.length; i++) { ema = vals[i] * k + ema * (1 - k); out[i] = ema }
  return out
}

function calcBB(closes: number[], p = 20, m = 2) {
  const mid = closes.map((_, i) => {
    if (i < p - 1) return NaN
    const s = closes.slice(i - p + 1, i + 1); return s.reduce((a, b) => a + b, 0) / p
  })
  const band = (sign: number) => mid.map((mv, i) => {
    if (isNaN(mv)) return NaN
    const s = closes.slice(i - p + 1, i + 1)
    return mv + sign * m * Math.sqrt(s.reduce((a, b) => a + (b - mv) ** 2, 0) / p)
  })
  return { mid, upper: band(1), lower: band(-1) }
}

function calcRSI(closes: number[], p = 14): number[] {
  const out = new Array(closes.length).fill(NaN)
  if (closes.length < p + 1) return out
  const ch = closes.slice(1).map((c, i) => c - closes[i])
  let aG = ch.slice(0, p).filter(c => c > 0).reduce((a, b) => a + b, 0) / p
  let aL = ch.slice(0, p).filter(c => c < 0).reduce((a, b) => a - b, 0) / p
  const rsi = (g: number, l: number) => l === 0 ? 100 : 100 - 100 / (1 + g / l)
  out[p] = rsi(aG, aL)
  for (let i = p; i < ch.length; i++) {
    aG = (aG * (p - 1) + Math.max(ch[i], 0)) / p
    aL = (aL * (p - 1) + Math.max(-ch[i], 0)) / p
    out[i + 1] = rsi(aG, aL)
  }
  return out
}

function calcMACD(closes: number[]) {
  const e12 = calcEMA(closes, 12), e26 = calcEMA(closes, 26)
  const macd = closes.map((_, i) => isNaN(e12[i]) || isNaN(e26[i]) ? NaN : e12[i] - e26[i])
  const signal = calcEMA(macd.map(v => isNaN(v) ? 0 : v), 9).map((v, i) => isNaN(macd[i]) ? NaN : v)
  const hist = macd.map((v, i) => isNaN(v) || isNaN(signal[i]) ? NaN : v - signal[i])
  return { macd, signal, hist }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool icons (inline SVG)
// ─────────────────────────────────────────────────────────────────────────────

function ToolIcon({ tool }: { tool: DrawTool }) {
  const s = { stroke: 'currentColor', strokeWidth: 1.6, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (tool) {
    case 'cursor':    return <svg viewBox="0 0 16 16" className="w-3.5 h-3.5"><path d="M3 2l10 6-5 1.5L6.5 14z" {...s} fill="currentColor" fillOpacity={0.15}/></svg>
    case 'trendline': return <svg viewBox="0 0 16 16" className="w-3.5 h-3.5"><line x1="2" y1="13" x2="14" y2="3" {...s}/><circle cx="2" cy="13" r="1.5" fill="currentColor" stroke="none"/><circle cx="14" cy="3" r="1.5" fill="currentColor" stroke="none"/></svg>
    case 'ray':       return <svg viewBox="0 0 16 16" className="w-3.5 h-3.5"><line x1="2" y1="13" x2="13" y2="4" {...s}/><path d="M10.5 3l3.5 1-1 3.5" {...s}/></svg>
    case 'hline':     return <svg viewBox="0 0 16 16" className="w-3.5 h-3.5"><line x1="1" y1="8" x2="15" y2="8" {...s} strokeDasharray="2.5 2"/></svg>
    case 'vline':     return <svg viewBox="0 0 16 16" className="w-3.5 h-3.5"><line x1="8" y1="1" x2="8" y2="15" {...s} strokeDasharray="2.5 2"/></svg>
    case 'rect':      return <svg viewBox="0 0 16 16" className="w-3.5 h-3.5"><rect x="2" y="4" width="12" height="8" {...s}/></svg>
    case 'circle':    return <svg viewBox="0 0 16 16" className="w-3.5 h-3.5"><ellipse cx="8" cy="8" rx="6" ry="4.5" {...s}/></svg>
    case 'arrow':     return <svg viewBox="0 0 16 16" className="w-3.5 h-3.5"><line x1="3" y1="13" x2="13" y2="3" {...s}/><path d="M13 3l-4.5 1.5 3 3z" fill="currentColor" stroke="none"/></svg>
    case 'fib':       return <svg viewBox="0 0 16 16" className="w-3.5 h-3.5"><line x1="1" y1="3" x2="15" y2="3" {...s}/><line x1="1" y1="6.5" x2="15" y2="6.5" {...s} opacity={0.7}/><line x1="1" y1="8" x2="15" y2="8" {...s} opacity={0.5}/><line x1="1" y1="11" x2="15" y2="11" {...s} opacity={0.7}/><line x1="1" y1="13" x2="15" y2="13" {...s}/></svg>
    case 'brush':     return <svg viewBox="0 0 16 16" className="w-3.5 h-3.5"><path d="M2 14c2-4 5-6 7-8 2-2 5-3 5-5" {...s}/></svg>
    case 'text':      return <svg viewBox="0 0 16 16" className="w-3.5 h-3.5"><text x="3" y="13" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="serif" stroke="none">T</text></svg>
    default:          return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG Drawing renderer
// ─────────────────────────────────────────────────────────────────────────────

function renderDrawing(d: Drawing, W: number, H: number, isPreview = false): React.ReactNode {
  const px = (pt: Pt) => ({ x: pt.x * W, y: pt.y * H })
  const { color: stroke, width: sw } = d
  const op = isPreview ? 0.65 : 1
  const ve = 'non-scaling-stroke' as const
  const base = { stroke, strokeWidth: sw, fill: 'none', opacity: op, vectorEffect: ve }

  switch (d.tool) {

    case 'trendline': {
      if (d.pts.length < 2) return null
      const [a, b] = [px(d.pts[0]), px(d.pts[1])]
      return <line key={d.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...base} />
    }

    case 'ray': {
      if (d.pts.length < 2) return null
      const [a, b] = [px(d.pts[0]), px(d.pts[1])]
      const dx = b.x - a.x, dy = b.y - a.y
      if (Math.abs(dx) < 0.001) return <line key={d.id} x1={a.x} y1={a.y} x2={a.x} y2={dy > 0 ? H : 0} {...base} />
      const t = (W - a.x) / dx
      return <line key={d.id} x1={a.x} y1={a.y} x2={W} y2={a.y + t * dy} {...base} strokeDasharray="6 3" />
    }

    case 'hline': {
      if (d.pts.length < 1) return null
      const y = px(d.pts[0]).y
      return <line key={d.id} x1={0} y1={y} x2={W} y2={y} {...base} strokeDasharray={isPreview ? '6 4' : '5 3'} />
    }

    case 'vline': {
      if (d.pts.length < 1) return null
      const x = px(d.pts[0]).x
      return <line key={d.id} x1={x} y1={0} x2={x} y2={H} {...base} strokeDasharray={isPreview ? '6 4' : '5 3'} />
    }

    case 'rect': {
      if (d.pts.length < 2) return null
      const [a, b] = [px(d.pts[0]), px(d.pts[1])]
      const rx = Math.min(a.x, b.x), ry = Math.min(a.y, b.y)
      const rw = Math.abs(b.x - a.x), rh = Math.abs(b.y - a.y)
      return (
        <g key={d.id} opacity={op}>
          <rect x={rx} y={ry} width={rw} height={rh} stroke={stroke} strokeWidth={sw} fill={stroke} fillOpacity={0.07} vectorEffect={ve} />
        </g>
      )
    }

    case 'circle': {
      if (d.pts.length < 2) return null
      const [a, b] = [px(d.pts[0]), px(d.pts[1])]
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2
      const erx = Math.abs(b.x - a.x) / 2, ery = Math.abs(b.y - a.y) / 2
      return (
        <g key={d.id} opacity={op}>
          <ellipse cx={cx} cy={cy} rx={erx} ry={ery} stroke={stroke} strokeWidth={sw} fill={stroke} fillOpacity={0.06} vectorEffect={ve} />
        </g>
      )
    }

    case 'arrow': {
      if (d.pts.length < 2) return null
      const [a, b] = [px(d.pts[0]), px(d.pts[1])]
      const angle = Math.atan2(b.y - a.y, b.x - a.x)
      const len = 12, wing = Math.PI / 7
      const ax1 = b.x - len * Math.cos(angle - wing), ay1 = b.y - len * Math.sin(angle - wing)
      const ax2 = b.x - len * Math.cos(angle + wing), ay2 = b.y - len * Math.sin(angle + wing)
      return (
        <g key={d.id} opacity={op}>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth={sw} vectorEffect={ve} />
          <polygon points={`${b.x},${b.y} ${ax1},${ay1} ${ax2},${ay2}`} fill={stroke} />
        </g>
      )
    }

    case 'fib': {
      if (d.pts.length < 2) return null
      const [a, b] = [px(d.pts[0]), px(d.pts[1])]
      return (
        <g key={d.id} opacity={op}>
          <rect x={0} y={Math.min(a.y, b.y)} width={W} height={Math.abs(b.y - a.y)} fill={stroke} fillOpacity={0.03} />
          {FIB_LEVELS.map((lvl, i) => {
            const y = a.y + (b.y - a.y) * lvl
            return (
              <g key={lvl}>
                <line x1={0} y1={y} x2={W} y2={y} stroke={FIB_COLORS[i]} strokeWidth={sw} vectorEffect={ve} strokeDasharray="4 3" />
                <rect x={W - 38} y={y - 9} width={36} height={11} fill="#0d1222" fillOpacity={0.7} rx={2} />
                <text x={W - 2} y={y - 1} textAnchor="end" fill={FIB_COLORS[i]} fontSize={8} fontFamily="system-ui" fontWeight="600">
                  {(lvl * 100).toFixed(1)}%
                </text>
              </g>
            )
          })}
        </g>
      )
    }

    case 'brush': {
      if (d.pts.length < 2) return null
      const path = `M ${d.pts.map(pt => `${pt.x * W},${pt.y * H}`).join(' L ')}`
      return <path key={d.id} d={path} stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={op} vectorEffect={ve} />
    }

    case 'text': {
      if (d.pts.length < 1) return null
      const pt = px(d.pts[0])
      return (
        <text key={d.id} x={pt.x} y={pt.y} fill={stroke} fontSize={11 + sw * 2} fontFamily="system-ui, sans-serif" fontWeight={600} opacity={op}>
          {d.text ?? ''}
        </text>
      )
    }

    default: return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function TradingChart({ slug, symbol, display, currentPrice, changePct }: Props) {

  // Chart refs
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const candleRef    = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const indRefs      = useRef<ISeriesApi<'Line' | 'Histogram'>[]>([])
  const subChartRef  = useRef<IChartApi | null>(null)
  const subContRef   = useRef<HTMLDivElement>(null)
  const barsRef      = useRef<Bar[]>([])
  const liveBarRef   = useRef<Bar | null>(null)
  const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const roCleanupRef = useRef<(() => void) | null>(null)

  // Drawing refs
  const svgRef       = useRef<SVGSVGElement>(null)
  const isDrawingRef = useRef(false)

  // Chart state
  const [interval,     setInterval_]   = useState('1d')
  const [indicators,   setIndicators]  = useState<Set<string>>(new Set(['ema21', 'vol']))
  const [indPanelOpen, setIndPanelOpen] = useState(false)
  const [loading,      setLoading]     = useState(true)
  const [error,        setError]       = useState('')
  const [hoveredBar,   setHoveredBar]  = useState<Bar | null>(null)
  const [livePrice,    setLivePrice]   = useState<number | null>(null)
  const [liveFlash,    setLiveFlash]   = useState<'up' | 'down' | null>(null)
  const [svgSize,      setSvgSize]     = useState({ w: 800, h: 480 })
  const prevLive = useRef<number>(0)

  // Drawing state
  const [activeTool,   setActiveTool]  = useState<DrawTool>('cursor')
  const [drawings,     setDrawings]    = useState<Drawing[]>([])
  const [preview,      setPreview]     = useState<Drawing | null>(null)
  const [drawColor,    setDrawColor]   = useState('#fbbf24')
  const [drawWidth,    setDrawWidth]   = useState(1)
  const [colorOpen,    setColorOpen]   = useState(false)
  const [textInput,    setTextInput]   = useState<{ pt: Pt; val: string } | null>(null)

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false)

  // ── helpers ────────────────────────────────────────────────────────────────

  const newId = () => `d-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  const getSVGPt = useCallback((e: React.MouseEvent): Pt => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }, [])

  // ── fetch bars ────────────────────────────────────────────────────────────

  const fetchBars = useCallback(async (iv: string, signal?: AbortSignal) => {
    setLoading(true); setError('')
    liveBarRef.current = null
    try {
      const res  = await fetch(`/api/market-data/chart?symbol=${slug}&interval=${iv}`, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json() as { bars: Bar[] }
      barsRef.current = json.bars ?? []
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError('Failed to load chart data.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [slug])

  const needsSubPane = indicators.has('rsi') || indicators.has('macd')

  // ── build chart ───────────────────────────────────────────────────────────

  const buildChart = useCallback(() => {
    const el = containerRef.current
    if (!el || barsRef.current.length === 0) return

    if (chartRef.current)    { chartRef.current.remove();    chartRef.current    = null }
    if (subChartRef.current) { subChartRef.current.remove(); subChartRef.current = null }
    indRefs.current = []

    const bars   = barsRef.current
    const closes = bars.map(b => b.close)
    const mainH  = needsSubPane ? Math.round(el.clientHeight * 0.65) : el.clientHeight

    const chart = createChart(el, {
      width:  el.clientWidth,
      height: mainH,
      layout: {
        background: { type: ColorType.Solid, color: '#0d1222' },
        textColor: '#9ca3af', fontSize: 11, fontFamily: 'system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(29,158,117,0.5)', width: 1, style: 1, labelBackgroundColor: '#1D9E75' },
        horzLine: { color: 'rgba(29,158,117,0.5)', width: 1, style: 1, labelBackgroundColor: '#1D9E75' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.06)', textColor: '#6b7280',
        scaleMargins: { top: 0.08, bottom: needsSubPane ? 0.02 : 0.06 },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.06)', timeVisible: true,
        secondsVisible: interval === '1m' || interval === '5m',
        rightOffset: 8,
        barSpacing: interval === '1M' ? 28 : interval === '1w' ? 20 : 8,
      },
    })
    chartRef.current = chart

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#1D9E75', downColor: '#ef5350',
      borderUpColor: '#1D9E75', borderDownColor: '#ef5350',
      wickUpColor: '#1D9E75', wickDownColor: '#ef5350',
    } as Partial<CandlestickSeriesOptions>)
    candleSeries.setData(bars.map(b => ({ time: b.time as Time, open: b.open, high: b.high, low: b.low, close: b.close })))
    candleRef.current = candleSeries

    const lastBar = bars[bars.length - 1]
    if (lastBar) liveBarRef.current = { ...lastBar }

    // Volume
    if (indicators.has('vol')) {
      const vS = chart.addSeries(HistogramSeries, { color: 'rgba(100,116,139,0.3)', priceFormat: { type: 'volume' }, priceScaleId: 'vol' })
      chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
      vS.setData(bars.map(b => ({ time: b.time as Time, value: b.volume, color: b.close >= b.open ? 'rgba(29,158,117,0.35)' : 'rgba(239,83,80,0.35)' })))
      indRefs.current.push(vS as ISeriesApi<'Histogram'>)
    }

    // EMA overlays
    for (const ec of [{ id: 'ema9', p: 9, c: '#60a5fa' }, { id: 'ema21', p: 21, c: '#f59e0b' }, { id: 'ema50', p: 50, c: '#a78bfa' }, { id: 'ema200', p: 200, c: '#f87171' }]) {
      if (!indicators.has(ec.id)) continue
      const vals = calcEMA(closes, ec.p)
      const s = chart.addSeries(LineSeries, { color: ec.c, lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
      s.setData(bars.map((b, i) => isNaN(vals[i]) ? null : { time: b.time as Time, value: vals[i] }).filter(Boolean) as { time: Time; value: number }[])
      indRefs.current.push(s)
    }

    // Bollinger Bands
    if (indicators.has('bb')) {
      const bb   = calcBB(closes)
      const lo   = { color: '#94a3b8', lineWidth: 1 as const, priceLineVisible: false, lastValueVisible: false, lineStyle: 2 }
      const toL  = (v: number[]) => bars.map((b, i) => isNaN(v[i]) ? null : { time: b.time as Time, value: v[i] }).filter(Boolean) as { time: Time; value: number }[]
      const bU   = chart.addSeries(LineSeries, lo)
      const bM   = chart.addSeries(LineSeries, { ...lo, color: '#64748b', lineStyle: 0 })
      const bL   = chart.addSeries(LineSeries, lo)
      bU.setData(toL(bb.upper)); bM.setData(toL(bb.mid)); bL.setData(toL(bb.lower))
      indRefs.current.push(bU, bM, bL)
    }

    // Sub-pane (RSI / MACD)
    if (needsSubPane && subContRef.current) {
      const subEl = subContRef.current
      const subH  = el.clientHeight - mainH
      const subChart = createChart(subEl, {
        width: subEl.clientWidth, height: subH,
        layout: { background: { type: ColorType.Solid, color: '#0b101e' }, textColor: '#6b7280', fontSize: 10, fontFamily: 'system-ui, sans-serif' },
        grid:   { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: 'rgba(29,158,117,0.4)', width: 1, style: 1, labelBackgroundColor: '#1D9E75' },
          horzLine: { color: 'rgba(29,158,117,0.4)', width: 1, style: 1, labelBackgroundColor: '#1D9E75' },
        },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.05)', textColor: '#6b7280' },
        timeScale: { borderColor: 'rgba(255,255,255,0.05)', timeVisible: true, secondsVisible: false, rightOffset: 8 },
      })
      subChartRef.current = subChart

      if (indicators.has('rsi')) {
        const rv = calcRSI(closes)
        const rs = subChart.addSeries(LineSeries, { color: '#34d399', lineWidth: 1, priceLineVisible: false, lastValueVisible: true })
        rs.setData(bars.map((b, i) => isNaN(rv[i]) ? null : { time: b.time as Time, value: rv[i] }).filter(Boolean) as { time: Time; value: number }[])
        ;[{ p: 70, c: '#ef5350', t: 'OB' }, { p: 30, c: '#1D9E75', t: 'OS' }, { p: 50, c: '#4b5563', t: '' }].forEach(
          ({ p, c, t }) => rs.createPriceLine({ price: p, color: c, lineWidth: 1, lineStyle: 2, axisLabelVisible: !!t, title: t })
        )
        indRefs.current.push(rs)
      }

      if (indicators.has('macd')) {
        const { macd, signal, hist } = calcMACD(closes)
        const toL = (v: number[]) => bars.map((b, i) => isNaN(v[i]) ? null : { time: b.time as Time, value: v[i] }).filter(Boolean) as { time: Time; value: number }[]
        const mS  = subChart.addSeries(LineSeries, { color: '#818cf8', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
        const sS  = subChart.addSeries(LineSeries, { color: '#fb923c', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
        const hS  = subChart.addSeries(HistogramSeries, { color: 'rgba(129,140,248,0.4)', priceLineVisible: false })
        mS.setData(toL(macd)); sS.setData(toL(signal))
        hS.setData(bars.map((b, i) => isNaN(hist[i]) ? null : {
          time: b.time as Time, value: hist[i],
          color: hist[i] >= 0 ? 'rgba(29,158,117,0.5)' : 'rgba(239,83,80,0.5)',
        }).filter(Boolean) as { time: Time; value: number; color: string }[])
        indRefs.current.push(mS, sS, hS as ISeriesApi<'Histogram'>)
      }

      chart.timeScale().subscribeVisibleLogicalRangeChange(r => { if (r) subChart.timeScale().setVisibleLogicalRange(r) })
      subChart.timeScale().subscribeVisibleLogicalRangeChange(r => { if (r) chart.timeScale().setVisibleLogicalRange(r) })
    }

    chart.subscribeCrosshairMove(param => {
      if (!param.time) { setHoveredBar(null); return }
      const t = param.time as number
      const bar = liveBarRef.current?.time === t ? liveBarRef.current : barsRef.current.find(b => b.time === t)
      if (bar) setHoveredBar(bar)
    })

    chart.timeScale().fitContent()

    // ResizeObserver — disconnect previous first
    roCleanupRef.current?.()
    const ro = new ResizeObserver(() => {
      if (!el || !chartRef.current) return
      const newMainH = needsSubPane ? Math.round(el.clientHeight * 0.65) : el.clientHeight
      setSvgSize({ w: el.clientWidth, h: newMainH })
      chartRef.current.resize(el.clientWidth, newMainH)
      if (subChartRef.current && subContRef.current)
        subChartRef.current.resize(subContRef.current.clientWidth, el.clientHeight - newMainH)
    })
    ro.observe(el)
    roCleanupRef.current = () => ro.disconnect()
    setSvgSize({ w: el.clientWidth, h: mainH })
  }, [indicators, needsSubPane, interval])

  // ── live tick (every 5 s) ─────────────────────────────────────────────────

  const startLiveTick = useCallback(() => {
    if (liveTimerRef.current) clearInterval(liveTimerRef.current)

    const tick = async () => {
      if (!candleRef.current || !liveBarRef.current) return
      try {
        const res  = await fetch('/api/market-data/live')
        if (!res.ok) return
        const json = await res.json() as { prices: Record<string, { price: number; change: number; changePct: number }> }
        const lp   = json.prices[symbol]
        if (!lp?.price) return

        const price = lp.price, lb = liveBarRef.current
        const updated: Bar = { time: lb.time, open: lb.open, high: Math.max(lb.high, price), low: Math.min(lb.low, price), close: price, volume: lb.volume }
        liveBarRef.current = updated
        candleRef.current.update({ time: updated.time as Time, open: updated.open, high: updated.high, low: updated.low, close: updated.close })

        setLivePrice(price)
        if (prevLive.current && price !== prevLive.current) {
          setLiveFlash(price > prevLive.current ? 'up' : 'down')
          setTimeout(() => setLiveFlash(null), 600)
        }
        prevLive.current = price
      } catch (err) { console.error('[chart-tick]', err) }
    }

    tick()
    liveTimerRef.current = setInterval(tick, 5_000)
  }, [symbol])

  const stopLiveTick = useCallback(() => {
    if (liveTimerRef.current) { clearInterval(liveTimerRef.current); liveTimerRef.current = null }
  }, [])

  // ── effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    stopLiveTick()
    const ac = new AbortController()
    fetchBars(interval, ac.signal).then(() => {
      if (ac.signal.aborted || barsRef.current.length === 0) return
      buildChart(); startLiveTick()
    })
    return () => { ac.abort(); stopLiveTick() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval])

  useEffect(() => {
    if (barsRef.current.length > 0) { stopLiveTick(); buildChart(); startLiveTick() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicators, needsSubPane])

  useEffect(() => {
    return () => { stopLiveTick(); roCleanupRef.current?.(); chartRef.current?.remove(); subChartRef.current?.remove() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── ESC exits fullscreen ──────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── drawing event handlers ────────────────────────────────────────────────

  const handleSVGMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === 'cursor') return
    e.preventDefault()
    const pt = getSVGPt(e)
    isDrawingRef.current = true

    if (activeTool === 'text') {
      setTextInput({ pt, val: '' })
      return
    }

    setPreview({ id: newId(), tool: activeTool, pts: [pt], color: drawColor, width: drawWidth })
  }, [activeTool, drawColor, drawWidth, getSVGPt])

  const handleSVGMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawingRef.current || activeTool === 'cursor' || activeTool === 'text') return
    const pt = getSVGPt(e)
    setPreview(prev => {
      if (!prev) return null
      if (activeTool === 'brush') return { ...prev, pts: [...prev.pts, pt] }
      return { ...prev, pts: [prev.pts[0], pt] }
    })
  }, [activeTool, getSVGPt])

  const handleSVGMouseUp = useCallback(() => {
    if (!isDrawingRef.current || activeTool === 'cursor' || activeTool === 'text') return
    isDrawingRef.current = false
    setPreview(prev => {
      if (prev && prev.pts.length >= 1) setDrawings(d => [...d, { ...prev, id: newId() }])
      return null
    })
  }, [activeTool])

  const handleSVGMouseLeave = useCallback(() => {
    if (isDrawingRef.current && activeTool === 'brush') {
      setPreview(prev => {
        if (prev) setDrawings(d => [...d, { ...prev, id: newId() }])
        return null
      })
    }
    isDrawingRef.current = false
  }, [activeTool])

  const confirmText = useCallback(() => {
    if (!textInput) return
    if (textInput.val.trim()) {
      setDrawings(d => [...d, { id: newId(), tool: 'text', pts: [textInput.pt], color: drawColor, width: drawWidth, text: textInput.val.trim() }])
    }
    setTextInput(null)
  }, [textInput, drawColor, drawWidth])

  // ── ui helpers ────────────────────────────────────────────────────────────

  function toggleIndicator(id: string) {
    setIndicators(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function selectTool(t: DrawTool) {
    setActiveTool(t)
    setPreview(null)
    isDrawingRef.current = false
    setColorOpen(false)
    setIndPanelOpen(false)
  }

  const displayPrice = livePrice ?? currentPrice
  const dec  = displayPrice >= 10000 ? 2 : displayPrice >= 100 ? 2 : displayPrice >= 1 ? 4 : 5
  const fmt  = (n: number) => n.toFixed(dec)
  const isUp = changePct >= 0
  const bar  = hoveredBar
  const W    = svgSize.w
  const H    = svgSize.h

  // Layout
  const wrapperCls = isFullscreen
    ? 'fixed inset-0 z-[9999] bg-[#0d1222] flex flex-col'
    : 'flex flex-col bg-[#0d1222] border border-white/10 rounded-2xl overflow-hidden'

  const chartAreaStyle = isFullscreen
    ? { flex: 1, minHeight: 0 }
    : { height: needsSubPane ? 600 : 480 }

  return (
    <div className={wrapperCls}>

      {/* ── TOP TOOLBAR ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/[0.08] bg-[#0d1222] flex-wrap gap-y-1.5 shrink-0">

        {/* Left: pair + OHLCV */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-black text-white tracking-tight shrink-0">{display}</span>

          {bar ? (
            <div className="flex items-center gap-2.5 text-[11px]">
              <span className="text-gray-500">O <span className="text-white font-medium tabular-nums">{fmt(bar.open)}</span></span>
              <span className="text-gray-500">H <span className="text-emerald-400 font-medium tabular-nums">{fmt(bar.high)}</span></span>
              <span className="text-gray-500">L <span className="text-red-400 font-medium tabular-nums">{fmt(bar.low)}</span></span>
              <span className="text-gray-500">C <span className={`font-medium tabular-nums ${bar.close >= bar.open ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(bar.close)}</span></span>
              {bar.volume > 0 && (
                <span className="text-gray-500">V <span className="text-gray-300 font-medium">
                  {bar.volume > 1e9 ? `${(bar.volume / 1e9).toFixed(1)}B` : bar.volume > 1e6 ? `${(bar.volume / 1e6).toFixed(1)}M` : bar.volume > 1e3 ? `${(bar.volume / 1e3).toFixed(0)}K` : bar.volume}
                </span></span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[11px]">
              <span className={`font-black tabular-nums transition-colors duration-200 ${liveFlash === 'up' ? 'text-emerald-400' : liveFlash === 'down' ? 'text-red-400' : 'text-white'}`}>
                {fmt(displayPrice)}
              </span>
              <span className={`font-semibold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {isUp ? '+' : ''}{changePct.toFixed(2)}%
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                <Zap className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">LIVE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </span>
            </div>
          )}
        </div>

        {/* Right: timeframes + indicators + fullscreen */}
        <div className="flex items-center gap-1.5 shrink-0">

          {/* Timeframe strip */}
          <div className="flex items-center bg-white/5 rounded-lg p-0.5">
            {TIMEFRAMES.map(tf => (
              <button key={tf.id} onClick={() => setInterval_(tf.id)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${interval === tf.id ? 'bg-[#1D9E75] text-white' : 'text-gray-400 hover:text-white'}`}>
                {tf.label}
              </button>
            ))}
          </div>

          {/* Indicators dropdown */}
          <div className="relative">
            <button onClick={() => { setIndPanelOpen(v => !v); setColorOpen(false) }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${indPanelOpen || indicators.size > 0 ? 'bg-[#1D9E75]/20 border-[#1D9E75]/40 text-emerald-300' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none"><path d="M2 8h12M4 4l2 4-2 4M10 4l2 4-2 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Ind.
              {indicators.size > 0 && <span className="bg-[#1D9E75] text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[9px] font-bold">{indicators.size}</span>}
            </button>

            {indPanelOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-[#131722] border border-white/15 rounded-xl shadow-2xl z-50 p-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest px-2 py-1 font-bold">Indicators</p>
                {INDICATOR_DEFS.map(ind => (
                  <button key={ind.id} onClick={() => toggleIndicator(ind.id)}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-white/5 transition group">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ind.color }} />
                      <span className="text-xs text-gray-300 group-hover:text-white">{ind.label}</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${indicators.has(ind.id) ? 'bg-[#1D9E75]' : 'bg-white/10'}`}>
                      <div className={`w-3 h-3 rounded-full bg-white transition-transform ${indicators.has(ind.id) ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </button>
                ))}
                <button onClick={() => setIndicators(new Set())} className="w-full text-center text-[10px] text-gray-600 hover:text-gray-400 py-1 mt-1 transition">Clear all</button>
              </div>
            )}
          </div>

          {/* Fullscreen toggle */}
          <button onClick={() => setIsFullscreen(v => !v)} title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Full view'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition">
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Expand'}</span>
          </button>
        </div>
      </div>

      {/* ── MAIN AREA: left sidebar + chart ──────────────────────────────── */}
      <div className="flex min-h-0" style={isFullscreen ? { flex: 1 } : {}}>

        {/* ── LEFT DRAWING SIDEBAR ──────────────────────────────────────── */}
        <div className="flex flex-col gap-0.5 px-1 py-2 border-r border-white/[0.07] bg-[#0b101e] shrink-0 overflow-y-auto">
          {TOOL_GROUPS.map(group => (
            <div key={group.label} className="mb-0.5">
              <p className="text-[8px] text-gray-600 uppercase tracking-widest text-center mb-0.5 px-1 leading-none">{group.label}</p>
              {group.tools.map(t => (
                <button key={t} onClick={() => selectTool(t)} title={TOOL_LABELS[t]}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg mb-0.5 transition-all ${activeTool === t ? 'bg-[#1D9E75] text-white shadow-md shadow-[#1D9E75]/20' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}>
                  <ToolIcon tool={t} />
                </button>
              ))}
              <div className="h-px bg-white/[0.06] mx-1 my-1" />
            </div>
          ))}

          {/* ── Drawing options: color + width + undo + clear ── */}
          <div className="mt-auto space-y-1 pt-1">

            {/* Color swatch */}
            <div className="relative">
              <button onClick={() => { setColorOpen(v => !v); setIndPanelOpen(false) }} title="Stroke color"
                className="w-8 h-8 rounded-lg border-2 border-white/25 hover:border-white/50 transition block mx-auto shadow-inner"
                style={{ background: drawColor }} />

              {colorOpen && (
                <div className="absolute left-10 bottom-0 w-44 p-2.5 bg-[#131722] border border-white/15 rounded-xl shadow-2xl z-50">
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1.5 font-bold">Stroke Color</p>
                  <div className="grid grid-cols-5 gap-1.5 mb-3">
                    {DRAW_COLORS.map(c => (
                      <button key={c} onClick={() => { setDrawColor(c); setColorOpen(false) }}
                        className={`w-6 h-6 rounded-md border-2 transition-transform hover:scale-110 ${drawColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1 font-bold">Line Width</p>
                  <div className="flex gap-1">
                    {[1, 2, 3].map(w => (
                      <button key={w} onClick={() => setDrawWidth(w)}
                        className={`flex-1 py-1 rounded-md text-[10px] font-bold transition ${drawWidth === w ? 'bg-[#1D9E75] text-white' : 'bg-white/10 text-gray-400 hover:text-white'}`}>
                        {w}px
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Undo */}
            <button onClick={() => setDrawings(d => d.slice(0, -1))} title="Undo last drawing"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition mx-auto">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Clear all */}
            <button onClick={() => setDrawings([])} title="Clear all drawings"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition mx-auto">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── CHART AREA ────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="relative flex-1"
            style={chartAreaStyle}
            onClick={() => { if (indPanelOpen) setIndPanelOpen(false); if (colorOpen) setColorOpen(false) }}>

            {/* Lightweight chart pane */}
            <div ref={containerRef} className="absolute inset-0" style={{ height: needsSubPane ? '65%' : '100%' }} />

            {/* Sub-pane */}
            {needsSubPane && (
              <div ref={subContRef} className="absolute bottom-0 left-0 right-0 border-t border-white/5" style={{ height: '35%' }} />
            )}

            {/* SVG Drawing overlay (covers main pane only) */}
            <svg
              ref={svgRef}
              className="absolute left-0 top-0 overflow-visible"
              style={{
                width: '100%',
                height: needsSubPane ? '65%' : '100%',
                zIndex: 5,
                cursor: activeTool === 'cursor' ? 'default' : activeTool === 'text' ? 'text' : 'crosshair',
                pointerEvents: activeTool === 'cursor' ? 'none' : 'all',
              }}
              onMouseDown={handleSVGMouseDown}
              onMouseMove={handleSVGMouseMove}
              onMouseUp={handleSVGMouseUp}
              onMouseLeave={handleSVGMouseLeave}
            >
              {drawings.map(d => renderDrawing(d, W, H))}
              {preview && renderDrawing(preview, W, H, true)}
            </svg>

            {/* Text input overlay */}
            {textInput && (
              <div className="absolute z-20" style={{ left: `${textInput.pt.x * 100}%`, top: `${textInput.pt.y * 100}%`, transform: 'translate(4px, -50%)' }}>
                <input
                  autoFocus
                  value={textInput.val}
                  onChange={e => setTextInput(v => v ? { ...v, val: e.target.value } : null)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmText(); if (e.key === 'Escape') setTextInput(null) }}
                  onBlur={confirmText}
                  style={{ color: drawColor }}
                  className="bg-[#131722] border border-white/20 focus:border-[#1D9E75] rounded px-2 py-1 text-sm font-semibold outline-none w-40 shadow-xl"
                  placeholder="Label…"
                />
              </div>
            )}

            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0d1222]/80 z-10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-[#1D9E75] animate-spin" />
                  <span className="text-sm text-gray-400">Loading chart…</span>
                </div>
              </div>
            )}

            {/* Error overlay */}
            {error && !loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0d1222]/80 z-10">
                <div className="text-center">
                  <p className="text-sm text-red-400 mb-3">{error}</p>
                  <button
                    onClick={() => {
                      stopLiveTick()
                      fetchBars(interval).then(() => {
                        if (barsRef.current.length > 0) { buildChart(); startLiveTick() }
                      })
                    }}
                    className="text-xs text-[#1D9E75] hover:text-emerald-300 underline">
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM STRIP: tool status + indicators legend ─────────────────── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/[0.06] bg-[#0a0f1e] shrink-0 flex-wrap gap-y-1">

        {/* Active tool + color + drawing count */}
        <div className="flex items-center gap-2">
          {activeTool !== 'cursor' && (
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#1D9E75] bg-[#1D9E75]/10 border border-[#1D9E75]/30 px-2 py-0.5 rounded-full">
              <ToolIcon tool={activeTool} />
              {TOOL_LABELS[activeTool]}
            </span>
          )}
          {activeTool !== 'cursor' && (
            <span className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0" style={{ background: drawColor }} />
          )}
          {drawings.length > 0 && (
            <span className="text-[10px] text-gray-600">{drawings.length} drawing{drawings.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Indicators legend + live badge */}
        <div className="flex items-center gap-3 flex-wrap">
          {INDICATOR_DEFS.filter(d => indicators.has(d.id)).map(d => (
            <div key={d.id} className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 rounded-full" style={{ background: d.color }} />
              <span className="text-[10px] text-gray-500">{d.label}</span>
              <button onClick={() => toggleIndicator(d.id)} className="text-gray-600 hover:text-gray-300 text-[10px] transition leading-none">×</button>
            </div>
          ))}
          <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live · 5s
          </div>
        </div>
      </div>
    </div>
  )
}
