'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { usePageTrack } from '@/lib/usePageTrack'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeft, RefreshCw, ExternalLink, Clock, AlertCircle,
  TrendingUp, TrendingDown, Minus, Zap, Brain,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import type { DetailData, Signal, TimeframeAnalysis, Candle } from '../../api/market-data/[symbol]/route'
import type { LivePrice } from '../../api/market-data/live/route'
import type { NewsItem } from '../../api/news/[slug]/route'

const FMTrader = dynamic(() => import('./FMTrader'), { ssr: false })

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (price >= 100)   return price.toFixed(2)
  if (price >= 1)     return price.toFixed(4)
  return price.toFixed(5)
}

function getPriceDecimals(price: number): number {
  if (price >= 10000) return 2
  if (price >= 100)   return 2
  if (price >= 1)     return 4
  return 5
}

function timeAgo(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

// ── Signal badge ──────────────────────────────────────────────────────────────

const SIG_CONFIG: Record<Signal, { bg: string; text: string; border: string; dot: string }> = {
  'STRONG BUY':  { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40', dot: 'bg-emerald-400' },
  'BUY':         { bg: 'bg-teal-500/20',    text: 'text-teal-300',    border: 'border-teal-500/40',    dot: 'bg-teal-400'    },
  'NEUTRAL':     { bg: 'bg-amber-500/20',   text: 'text-amber-300',   border: 'border-amber-500/40',   dot: 'bg-amber-400'   },
  'SELL':        { bg: 'bg-orange-500/20',  text: 'text-orange-300',  border: 'border-orange-500/40',  dot: 'bg-orange-400'  },
  'STRONG SELL': { bg: 'bg-red-500/20',     text: 'text-red-300',     border: 'border-red-500/40',     dot: 'bg-red-400'     },
}

function SignalBadge({ signal, size = 'md' }: { signal: Signal; size?: 'sm' | 'md' | 'lg' }) {
  const cfg = SIG_CONFIG[signal]
  const sz  = size === 'lg' ? 'text-sm px-4 py-2 gap-2' : size === 'sm' ? 'text-[11px] px-2 py-1 gap-1' : 'text-xs px-3 py-1.5 gap-1.5'
  return (
    <span className={`inline-flex items-center font-bold rounded-lg border ${cfg.bg} ${cfg.text} ${cfg.border} ${sz}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse shrink-0`} />
      {signal}
    </span>
  )
}

// ── SVG Candlestick mini-chart (timeframe cards) ───────────────────────────────

function CandlestickChart({ candles }: { candles: Candle[] }) {
  if (candles.length < 3) return <div className="w-full h-20 rounded bg-white/5" />

  const W = 240, H = 72, PAD = 3
  const slice = candles.slice(-30)
  const n     = slice.length

  const allPts = slice.flatMap(c => [c.h, c.l]).filter(p => p > 0)
  if (allPts.length === 0) return <div className="w-full h-20 rounded bg-white/5" />

  const minP  = Math.min(...allPts)
  const maxP  = Math.max(...allPts)
  const range = maxP - minP || minP * 0.001 || 1
  const toY   = (p: number) => PAD + (H - 2 * PAD) * (1 - (p - minP) / range)
  const colW  = W / n
  const bodyW = Math.max(1.5, colW * 0.62)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
      {slice.map((c, i) => {
        if (!c.c) return null
        const xc    = i * colW + colW / 2
        const up    = c.c >= c.o
        const color = up ? '#1D9E75' : '#ef5350'
        const bTop  = toY(Math.max(c.o, c.c))
        const bBot  = toY(Math.min(c.o, c.c))
        const bH    = Math.max(1, bBot - bTop)
        return (
          <g key={i}>
            {/* Upper wick */}
            <line x1={xc} y1={toY(c.h)} x2={xc} y2={bTop} stroke={color} strokeWidth="1" opacity="0.7" />
            {/* Lower wick */}
            <line x1={xc} y1={bBot}     x2={xc} y2={toY(c.l)} stroke={color} strokeWidth="1" opacity="0.7" />
            {/* Body */}
            <rect x={xc - bodyW / 2} y={bTop} width={bodyW} height={bH} fill={color} rx="0.5" />
          </g>
        )
      })}
    </svg>
  )
}

// ── RSI bar ────────────────────────────────────────────────────────────────────

function RSIBar({ rsi }: { rsi: number }) {
  const pct   = Math.min(Math.max(rsi, 0), 100)
  const color = rsi >= 70 ? '#ef5350' : rsi <= 30 ? '#1D9E75' : rsi >= 55 ? '#26a69a' : rsi <= 45 ? '#f5c518' : '#8b92a5'
  const label = rsi >= 70 ? 'Overbought' : rsi <= 30 ? 'Oversold' : rsi >= 55 ? 'Bullish' : rsi <= 45 ? 'Bearish' : 'Neutral'

  return (
    <div>
      <div className="flex justify-between items-center text-xs text-gray-500 mb-1.5">
        <span className="font-medium">RSI (14)</span>
        <div className="flex items-center gap-1.5">
          <span style={{ color }} className="font-bold tabular-nums">{rsi.toFixed(1)}</span>
          <span style={{ color }} className="text-[10px] font-semibold opacity-80">{label}</span>
        </div>
      </div>
      <div className="relative h-2 bg-white/5 rounded-full overflow-visible">
        {/* Zones */}
        <div className="absolute left-0 top-0 h-full w-[30%] bg-emerald-500/15 rounded-l-full" />
        <div className="absolute right-0 top-0 h-full w-[30%] bg-red-500/15 rounded-r-full" />
        {/* Marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-md border-2 border-[#131722]"
          style={{ left: `calc(${pct}% - 6px)`, background: color, transition: 'left 0.6s ease' }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-gray-600 mt-1 font-medium">
        <span>Oversold 30</span><span>50</span><span>Overbought 70</span>
      </div>
    </div>
  )
}

// ── Timeframe card ────────────────────────────────────────────────────────────

function TimeframeCard({ tf, dec }: { tf: TimeframeAnalysis; dec: number }) {
  const fmt = (n: number) => n.toFixed(dec)
  const cfg = SIG_CONFIG[tf.signal]

  return (
    <div className="bg-[#0d1222] border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all">

      {/* Header with mini chart */}
      <div className={`px-4 pt-4 pb-3 border-b border-white/5 ${cfg.bg}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-sm font-bold text-white tracking-wide">{tf.label}</span>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
              <span>H <span className="text-emerald-400/80 font-medium tabular-nums">{fmt(tf.high)}</span></span>
              <span>L <span className="text-red-400/80 font-medium tabular-nums">{fmt(tf.low)}</span></span>
              <span>C <span className={`font-medium tabular-nums ${tf.close >= tf.ema9 ? 'text-emerald-300' : 'text-red-300'}`}>{fmt(tf.close)}</span></span>
            </div>
          </div>
          <SignalBadge signal={tf.signal} size="sm" />
        </div>
        <CandlestickChart candles={tf.candles} />
      </div>

      {/* RSI */}
      <div className="px-4 pt-3 pb-2">
        <RSIBar rsi={tf.rsi} />
      </div>

      {/* EMA grid */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-1.5">
        {[
          { label: 'EMA 9',   val: tf.ema9   },
          { label: 'EMA 21',  val: tf.ema21  },
          { label: 'EMA 50',  val: tf.ema50  },
          { label: 'EMA 200', val: tf.ema200 },
        ].map(e => {
          const above = tf.close >= e.val
          const pctDiff = tf.close > 0 ? ((tf.close - e.val) / e.val) * 100 : 0
          return (
            <div key={e.label} className="bg-white/5 rounded-lg px-2 py-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-medium">{e.label}</span>
                <span className={`text-[9px] font-bold ${above ? 'text-emerald-400' : 'text-red-400'}`}>
                  {above ? '▲' : '▼'} {Math.abs(pctDiff).toFixed(2)}%
                </span>
              </div>
              <span className="text-[11px] text-white font-semibold tabular-nums">{fmt(e.val)}</span>
            </div>
          )
        })}
      </div>

      {/* Analysis text */}
      <div className="px-4 pb-4">
        <p className="text-[11px] text-gray-400 leading-relaxed">{tf.analysis}</p>
      </div>
    </div>
  )
}

// ── Multi-timeframe consensus ─────────────────────────────────────────────────

function deriveConsensus(timeframes: TimeframeAnalysis[]): Signal {
  const bull  = timeframes.filter(t => t.signal === 'STRONG BUY' || t.signal === 'BUY').length
  const bear  = timeframes.filter(t => t.signal === 'STRONG SELL' || t.signal === 'SELL').length
  const sBull = timeframes.filter(t => t.signal === 'STRONG BUY').length
  const sBear = timeframes.filter(t => t.signal === 'STRONG SELL').length
  if (bull > bear) return sBull >= bull / 2 ? 'STRONG BUY' : 'BUY'
  if (bear > bull) return sBear >= bear / 2 ? 'STRONG SELL' : 'SELL'
  return 'NEUTRAL'
}

function TimeframeSummary({ timeframes }: { timeframes: TimeframeAnalysis[] }) {
  const bull      = timeframes.filter(t => t.signal === 'STRONG BUY' || t.signal === 'BUY').length
  const bear      = timeframes.filter(t => t.signal === 'STRONG SELL' || t.signal === 'SELL').length
  const neutral   = timeframes.filter(t => t.signal === 'NEUTRAL').length
  const total     = timeframes.length
  const consensus = deriveConsensus(timeframes)
  const cfg       = SIG_CONFIG[consensus]

  // Prediction rationale
  const bullPct = Math.round((bull / total) * 100)
  const bearPct = Math.round((bear / total) * 100)
  const prediction =
    bull === total   ? 'All timeframes align bullish — high-conviction uptrend in force.' :
    bear === total   ? 'All timeframes align bearish — high-conviction downtrend in force.' :
    bull > bear * 2  ? `${bullPct}% bullish alignment suggests sustained upside momentum.` :
    bear > bull * 2  ? `${bearPct}% bearish alignment suggests sustained downside pressure.` :
    bull > bear      ? `Mild bullish majority (${bullPct}%). Watch for higher-TF confirmation before committing.` :
    bear > bull      ? `Mild bearish majority (${bearPct}%). Lower-TF rallies may be sell opportunities.` :
                       'Mixed signals — market is in consolidation. Wait for a clear breakout direction.'

  return (
    <div className="bg-[#131722] border border-white/10 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h3 className="text-sm font-bold text-white mb-0.5">Multi-Timeframe Consensus</h3>
          <p className="text-[11px] text-gray-500 leading-relaxed max-w-lg">{prediction}</p>
        </div>
        <div className="shrink-0">
          <SignalBadge signal={consensus} size="md" />
        </div>
      </div>

      {/* TF signals row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {timeframes.map(tf => {
          const c = SIG_CONFIG[tf.signal]
          return (
            <div key={tf.key} className={`rounded-xl p-2.5 text-center border ${c.bg} ${c.border}`}>
              <p className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wider font-semibold">{tf.label}</p>
              <SignalBadge signal={tf.signal} size="sm" />
              <p className="text-[10px] text-gray-500 mt-1.5 font-medium">RSI {tf.rsi.toFixed(0)}</p>
            </div>
          )
        })}
      </div>

      {/* Sentiment bar */}
      <div className="h-2.5 rounded-full overflow-hidden flex">
        {bull    > 0 && <div style={{ width: `${(bull    / total) * 100}%` }} className="bg-emerald-500 transition-all" />}
        {neutral > 0 && <div style={{ width: `${(neutral / total) * 100}%` }} className="bg-amber-500 transition-all"   />}
        {bear    > 0 && <div style={{ width: `${(bear    / total) * 100}%` }} className="bg-red-500 transition-all"     />}
      </div>
      <div className="flex justify-between text-xs mt-2 font-semibold">
        <span className="text-emerald-400">{bull} Bullish</span>
        <span className="text-amber-400">{neutral} Neutral</span>
        <span className="text-red-400">{bear} Bearish</span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DetailClient({ slug }: { slug: string }) {
  usePageTrack()
  const searchParams    = useSearchParams()
  const fromTab         = searchParams.get('from') ?? 'all'
  const fromSentiment   = searchParams.get('sentiment') ?? ''
  const backParams      = new URLSearchParams()
  if (fromTab !== 'all') backParams.set('tab', fromTab)
  if (fromSentiment)     backParams.set('sentiment', fromSentiment)
  const backHref        = `/analysis${backParams.size ? `?${backParams}` : ''}`
  const [data,       setData]       = useState<DetailData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error,      setError]      = useState('')

  // FM Trader modal — auto-open when ?fmtrader=1 is in the URL
  const [fmOpen,     setFmOpen]     = useState(searchParams.get('fmtrader') === '1')

  // Live price state
  const [livePrice,  setLivePrice]  = useState<LivePrice | null>(null)
  const [lastLiveAt, setLastLiveAt] = useState(0)
  const [flash,      setFlash]      = useState<'up' | 'down' | null>(null)
  const prevPrice = useRef(0)

  // News state
  const [news, setNews] = useState<NewsItem[]>([])

  // ── Data fetch (every manual refresh or 5-min auto) ───────────────────────
  const fetchData = useCallback(async (force = false) => {
    setRefreshing(true); setError('')
    try {
      const res = await fetch(`/api/market-data/${slug}${force ? '?refresh=1' : ''}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch {
      setError('Could not load data. Please try refreshing.')
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [slug])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-refresh analysis every 5 min
  useEffect(() => {
    const id = setInterval(() => fetchData(), 5 * 60_000)
    return () => clearInterval(id)
  }, [fetchData])

  // ── News fetch (on mount + every 15 min) ──────────────────────────────────
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch(`/api/news/${slug}`)
        if (res.ok) setNews(await res.json())
      } catch { /* news is non-critical */ }
    }
    fetchNews()
    const id = setInterval(fetchNews, 15 * 60_000)
    return () => clearInterval(id)
  }, [slug])

  // ── Live price polling every 5 s ──────────────────────────────────────────
  const fetchLive = useCallback(async () => {
    if (!data) return
    try {
      const res  = await fetch('/api/market-data/live')
      if (!res.ok) return
      const json = await res.json() as { prices: Record<string, LivePrice>; updatedAt: number }
      const lp   = json.prices[data.symbol]
      if (!lp?.price) return
      setLivePrice(lp)
      setLastLiveAt(json.updatedAt ?? Date.now())
      if (prevPrice.current && lp.price !== prevPrice.current) {
        setFlash(lp.price > prevPrice.current ? 'up' : 'down')
        setTimeout(() => setFlash(null), 800)
      }
      prevPrice.current = lp.price
    } catch { /* best-effort */ }
  }, [data])

  useEffect(() => {
    if (!data) return
    fetchLive()
    const id = setInterval(fetchLive, 60_000)
    return () => clearInterval(id)
  }, [fetchLive, data])

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div className="h-14 bg-[#131722] border border-white/10 rounded-xl animate-pulse" />
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-72 bg-[#131722] border border-white/10 rounded-2xl animate-pulse" />)}
      </div>
      <div className="h-48 bg-[#131722] border border-white/10 rounded-2xl animate-pulse" />
    </div>
  )

  // ── Error state ───────────────────────────────────────────────────────────
  if (error || !data) return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4">
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
        <p className="text-sm text-red-300">{error || 'Failed to load.'}</p>
        <button onClick={() => fetchData(true)} className="ml-auto text-xs text-red-300 hover:text-white underline">Retry</button>
      </div>
    </div>
  )

  // ── Derived values ────────────────────────────────────────────────────────
  const liveP      = livePrice?.price     ?? data.price
  const liveChg    = livePrice?.change    ?? data.change
  const liveChgPct = livePrice?.changePct ?? data.changePct
  const isLive     = Date.now() - lastLiveAt < 60_000
  const isUp       = liveChgPct >= 0
  const dec        = getPriceDecimals(liveP)
  const fmt        = (n: number) => n.toFixed(dec)

  const fmtVol = (v: number) =>
    v > 1e9 ? `${(v / 1e9).toFixed(1)}B` : v > 1e6 ? `${(v / 1e6).toFixed(1)}M` : v > 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v)

  // ── News blackout detection ────────────────────────────────────────────────
  // Block FM Trader if a HIGH-impact calendar event is within ±30 min
  const NOW = Date.now()
  const BLACKOUT_BEFORE = 30 * 60 * 1000  // 30 min before
  const BLACKOUT_AFTER  =  5 * 60 * 1000  //  5 min after (let initial spike clear)
  const upcomingHighImpact = news.find(n =>
    n.isCalendarEvent && n.impact === 'high' &&
    n.publishedAt >= NOW - BLACKOUT_AFTER &&
    n.publishedAt <= NOW + BLACKOUT_BEFORE
  )
  const newsBlackout   = !!upcomingHighImpact
  const blackoutReason = upcomingHighImpact
    ? `HIGH-IMPACT EVENT: "${upcomingHighImpact.title}" scheduled ${
        upcomingHighImpact.publishedAt > NOW
          ? `in ${Math.round((upcomingHighImpact.publishedAt - NOW) / 60000)} min`
          : `${Math.round((NOW - upcomingHighImpact.publishedAt) / 60000)} min ago`
      }.`
    : undefined

  // ── Data quality check ────────────────────────────────────────────────────
  const dataStale   = NOW - data.updatedAt > 12 * 60 * 1000   // > 12 min old
  const badData     = data.timeframes.some(tf => tf.rsi === 0 || tf.ema9 === 0 || tf.close === 0)
  const dataQuality = data.dataQuality
  const qualityPoor = dataQuality && dataQuality.score < 70

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-5">

      {/* ── News blackout banner ──────────────────────────────────────────── */}
      {newsBlackout && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-300">News Blackout — FM Trader disabled</p>
            <p className="text-[11px] text-red-400/80 mt-0.5">{blackoutReason} Professionals do not enter within 30 min of a high-impact release.</p>
          </div>
        </div>
      )}

      {/* ── Data quality warning ──────────────────────────────────────────── */}
      {(dataStale || badData || qualityPoor) && (
        <div className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-amber-400/80">
              {dataStale ? 'Market data is more than 12 minutes old — signals may not reflect the latest price action. ' : ''}
              {badData ? 'Some timeframe indicators returned zero values — data feed may be delayed. ' : ''}
              {qualityPoor && dataQuality?.issues.map((issue, i) => <span key={i}>{issue}. </span>)}
              <button onClick={() => fetchData(true)} className="underline text-amber-300 hover:text-white transition">Force refresh</button>
            </p>
            {dataQuality && (
              <p className="text-[10px] text-gray-600 mt-1">
                Data quality score: <span className={dataQuality.score >= 90 ? 'text-emerald-500' : dataQuality.score >= 70 ? 'text-amber-500' : 'text-red-400'}>{dataQuality.score}/100 ({dataQuality.freshness})</span>
                {process.env.NEXT_PUBLIC_TWELVE_DATA_KEY ? '' : ' · Upgrade: add TWELVE_DATA_API_KEY for better 1H data'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="bg-[#131722] border border-white/10 rounded-2xl px-4 sm:px-5 py-4">
        {/* Row 1: back + identity + signal */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link href={backHref}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition shrink-0">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Markets</span>
            </Link>
            <div className="border-l border-white/10 pl-3 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">{data.display}</h1>
                <span className="text-xs text-gray-500 hidden sm:block">{data.name}</span>
              </div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">{data.category}</p>
            </div>
          </div>
          <SignalBadge signal={data.overallSignal} size="sm" />
        </div>

        {/* Row 2: price + change */}
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              {isLive && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                  <Zap className="w-2.5 h-2.5" />
                  LIVE
                </span>
              )}
              <span className={`text-2xl sm:text-3xl font-black tabular-nums transition-colors duration-300 ${
                flash === 'up' ? 'text-emerald-400' : flash === 'down' ? 'text-red-400' : 'text-white'
              }`}>
                {formatPrice(liveP)}
              </span>
            </div>
            <div className={`flex items-center gap-1 text-sm font-bold mt-0.5 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{isUp ? '+' : ''}{formatPrice(Math.abs(liveChg))}</span>
              <span>({isUp ? '+' : ''}{liveChgPct.toFixed(2)}%)</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => setFmOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-[#1D9E75] to-[#0f7a58] text-white shadow-lg shadow-[#1D9E75]/20 hover:from-[#22b886] hover:to-[#1D9E75] transition-all"
            >
              <Brain className="w-3.5 h-3.5" />
              FM Trader
            </button>
          </div>
        </div>

        {/* Row 3: OHLV strip */}
        <div className="grid grid-cols-4 gap-2 border-t border-white/5 pt-3">
          {[
            { l: 'Open',   v: fmt(data.open),      c: 'text-white'       },
            { l: 'High',   v: fmt(data.high),      c: 'text-emerald-400' },
            { l: 'Low',    v: fmt(data.low),       c: 'text-red-400'     },
            { l: 'Volume', v: fmtVol(data.volume), c: 'text-gray-300'    },
          ].map(i => (
            <div key={i.l} className="text-center">
              <p className="text-[9px] text-gray-600 uppercase tracking-wider font-semibold">{i.l}</p>
              <p className={`text-[10px] sm:text-xs font-semibold tabular-nums ${i.c}`}>{i.v}</p>
            </div>
          ))}
        </div>

        {/* Timestamp */}
        <p className="text-[10px] text-gray-600 flex items-center gap-1 mt-2">
          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
          Analysis {timeAgo(data.updatedAt)}
        </p>
      </div>

      {/* ── Disclaimer ──────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
        <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-[11px] text-amber-300/70 leading-relaxed">
          <strong className="text-amber-300">Educational only.</strong> Signals are derived from automated technical indicators (RSI, EMA cross). Not financial advice — always apply your own analysis and risk management.
        </p>
      </div>

      {/* ── Multi-timeframe consensus ─────────────────────────────────────── */}
      <TimeframeSummary timeframes={data.timeframes} />

      {/* ── Timeframe analysis cards ──────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          Timeframe Analysis
          <span className="text-[10px] font-normal text-gray-600">— based on RSI (14), EMA 9/21/50/200</span>
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.timeframes.map(tf => (
            <TimeframeCard key={tf.key} tf={tf} dec={dec} />
          ))}
        </div>
      </div>

      {/* ── Key price levels ─────────────────────────────────────────────── */}
      <div className="bg-[#131722] border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">Key Price Levels</h2>
          <span className="text-[10px] text-gray-600">
            Reference: <span className="text-gray-400 font-medium tabular-nums">{formatPrice(liveP)}</span>
            {isLive && <span className="text-emerald-500 ml-1">(live)</span>}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-3">
          {[
            { label: 'Resistance 2', value: data.keyLevels.resistance2, color: 'text-red-300',     bg: 'bg-red-500/5',     border: 'border-red-500/20'     },
            { label: 'Resistance 1', value: data.keyLevels.resistance1, color: 'text-orange-300',  bg: 'bg-orange-500/5',  border: 'border-orange-500/20'  },
            { label: 'Pivot',        value: data.keyLevels.pivot,       color: 'text-amber-300',   bg: 'bg-amber-500/8',   border: 'border-amber-500/25'   },
            { label: 'Support 1',    value: data.keyLevels.support1,    color: 'text-teal-300',    bg: 'bg-teal-500/5',    border: 'border-teal-500/20'    },
            { label: 'Support 2',    value: data.keyLevels.support2,    color: 'text-emerald-300', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20' },
          ].map(level => {
            // Use live price for accurate % distance
            const dist    = liveP > 0 ? ((level.value - liveP) / liveP) * 100 : 0
            const above   = level.value > liveP
            return (
              <div key={level.label} className={`rounded-xl px-3 py-3 text-center border ${level.bg} ${level.border}`}>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">{level.label}</p>
                <p className={`text-sm font-bold tabular-nums ${level.color}`}>{fmt(level.value)}</p>
                <p className={`text-[11px] font-semibold mt-1 tabular-nums ${above ? 'text-emerald-400' : 'text-red-400'}`}>
                  {above ? '+' : ''}{dist.toFixed(2)}%
                </p>
                <p className="text-[9px] text-gray-600 mt-0.5">{above ? '↑ above' : '↓ below'} price</p>
              </div>
            )
          })}
        </div>

        {/* Visual level bar */}
        <div className="mt-2">
          {(() => {
            const levels = [
              data.keyLevels.support2, data.keyLevels.support1,
              liveP,
              data.keyLevels.resistance1, data.keyLevels.resistance2,
            ].sort((a, b) => a - b)
            const min = levels[0], max = levels[levels.length - 1]
            const span = max - min || 1
            const pct = (v: number) => ((v - min) / span) * 100

            return (
              <div className="relative h-6 bg-white/5 rounded-full overflow-hidden">
                {/* Support zones */}
                <div className="absolute top-0 bottom-0 bg-emerald-500/10 rounded-l-full"
                  style={{ left: `${pct(data.keyLevels.support2)}%`, width: `${pct(data.keyLevels.support1) - pct(data.keyLevels.support2)}%` }} />
                {/* Resistance zones */}
                <div className="absolute top-0 bottom-0 bg-red-500/10 rounded-r-full"
                  style={{ left: `${pct(data.keyLevels.resistance1)}%`, width: `${pct(data.keyLevels.resistance2) - pct(data.keyLevels.resistance1)}%` }} />
                {/* Pivot line */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400/50"
                  style={{ left: `${pct(data.keyLevels.pivot)}%` }} />
                {/* Live price marker */}
                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-[#131722] shadow-lg z-10"
                  style={{ left: `calc(${pct(liveP)}% - 6px)`, transition: 'left 0.6s ease' }} />
              </div>
            )
          })()}
          <p className="text-[9px] text-gray-600 mt-1.5">
            Pivot = (prev High + Low + Close) ÷ 3 &nbsp;·&nbsp; % distance calculated from live price
          </p>
        </div>
      </div>

      {/* ── News ──────────────────────────────────────────────────────────── */}
      {news.length > 0 && (
        <div className="bg-[#131722] border border-white/10 rounded-2xl p-5">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            Market News &amp; Events
            <span className="text-[10px] font-normal text-gray-600 ml-1">affecting {data.display} · last 48h</span>
          </h2>
          <div className="space-y-2">
            {news.map((n, i) => (
              <a
                key={i}
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 group p-3 rounded-xl hover:bg-white/5 transition border border-transparent hover:border-white/5"
              >
                <ExternalLink className="w-3.5 h-3.5 text-gray-600 group-hover:text-[#1D9E75] mt-0.5 shrink-0 transition-colors" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    {n.isCalendarEvent && n.impact === 'high'   && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 uppercase tracking-wide shrink-0">HIGH IMPACT</span>}
                    {n.isCalendarEvent && n.impact === 'medium' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 uppercase tracking-wide shrink-0">MED IMPACT</span>}
                    {n.source === 'ForexFactory' && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#1D9E75]/20 text-[#1D9E75] shrink-0">ForexFactory</span>}
                  </div>
                  <p className="text-sm text-gray-300 group-hover:text-white transition leading-snug line-clamp-2">{n.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-600 font-medium">{n.source}</span>
                    <span className="text-gray-700">·</span>
                    <span className="text-[10px] text-gray-600">{timeAgo(n.publishedAt)}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-[10px] text-gray-700 pb-2">
        Analysis based on Yahoo Finance data · Live price updates every 5s · Full analysis refreshes every 5 min
      </p>

      {/* FM Trader modal */}
      {fmOpen && (
        <FMTrader
          data={{
            slug:           slug,
            display:        data.display,
            name:           data.name,
            category:       data.category,
            price:          liveP,
            change:         liveChg,
            changePct:      liveChgPct,
            high:           data.high,
            low:            data.low,
            open:           data.open,
            volume:         data.volume,
            overallSignal:  data.overallSignal,
            keyLevels:      data.keyLevels,
            timeframes:     data.timeframes,
            marketContext:  data.marketContext,
            newsBlackout,
            blackoutReason,
            livePrice:      liveP,
            intermarket: data.intermarket ? {
              ...data.intermarket,
              correlation: 0,       // filled by route from DXY_CORRELATION table
              signal:      'neutral' as const,
            } : undefined,
          }}
          currentPrice={liveP}
          onClose={() => setFmOpen(false)}
          initialShowHistory={searchParams.get('history') === '1'}
        />
      )}
    </div>
  )
}
