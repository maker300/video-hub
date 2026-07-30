'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePageTrack } from '@/lib/usePageTrack'
import { RefreshCw, TrendingUp, TrendingDown, Minus, ExternalLink, Clock, AlertCircle, Zap, Search, X } from 'lucide-react'
import { getAlerts, deactivateAlert, addNotification, fireBrowserNotification } from '@/lib/price-alerts'
import type { MarketData, InstrumentData, SignalType, Candle } from '../api/market-data/route'
import type { LivePrice } from '../api/market-data/live/route'

const SignalsRemotionPlayer = dynamic(
  () => import('./SignalsRemotionPlayer'),
  { ssr: false, loading: () => <div style={{ height: 230 }} /> }
)

// Map display → URL slug (must match SLUG_TO_SYMBOL keys in detail route)
const DISPLAY_TO_SLUG: Record<string, string> = {
  // Forex — 10 most-traded pairs
  'EUR/USD': 'eur-usd',
  'GBP/USD': 'gbp-usd',
  'USD/JPY': 'usd-jpy',
  'AUD/USD': 'aud-usd',
  'USD/CAD': 'usd-cad',
  'USD/CHF': 'usd-chf',
  'NZD/USD': 'nzd-usd',
  'EUR/GBP': 'eur-gbp',
  'GBP/JPY': 'gbp-jpy',
  'EUR/JPY': 'eur-jpy',
  // Commodities
  'XAU/USD': 'xau-usd',
  'XAG/USD': 'xag-usd',
  'WTI/USD': 'wti-usd',
  'COPPER':  'copper',
  // Indices
  'S&P 500':   'sp-500',
  'DJ 30':     'dj-30',
  'NAS 100':   'nas-100',
  'US DXY':    'us-dxy',
  // Stocks
  'APPLE':     'apple',
  'MICROSOFT': 'microsoft',
  'GOOGLE':    'google',
  'TESLA':     'tesla',
  // Crypto — 6 highest-liquidity tokens
  'BTC/USD':  'btc-usd',
  'ETH/USD':  'eth-usd',
  'SOL/USD':  'sol-usd',
  'XRP/USD':  'xrp-usd',
  'BNB/USD':  'bnb-usd',
  'DOGE/USD': 'doge-usd',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function signalConfig(signal: SignalType) {
  switch (signal) {
    case 'STRONG BUY':  return { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40', dot: 'bg-emerald-400' }
    case 'BUY':         return { bg: 'bg-teal-500/20',    text: 'text-teal-300',    border: 'border-teal-500/40',    dot: 'bg-teal-400'    }
    case 'NEUTRAL':     return { bg: 'bg-amber-500/20',   text: 'text-amber-300',   border: 'border-amber-500/40',   dot: 'bg-amber-400'   }
    case 'SELL':        return { bg: 'bg-orange-500/20',  text: 'text-orange-300',  border: 'border-orange-500/40',  dot: 'bg-orange-400'  }
    case 'STRONG SELL': return { bg: 'bg-red-500/20',     text: 'text-red-300',     border: 'border-red-500/40',     dot: 'bg-red-400'     }
  }
}

function categoryBadge(cat: string) {
  switch (cat) {
    case 'forex':     return 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    case 'commodity': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
    case 'crypto':    return 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
    case 'indices':   return 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
    case 'stocks':    return 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
    default:          return 'bg-white/10 text-gray-400'
  }
}

function categoryLabel(cat: string) {
  switch (cat) {
    case 'commodity': return 'Commod.'
    case 'indices':   return 'Index'
    case 'stocks':    return 'Stock'
    default:          return cat.charAt(0).toUpperCase() + cat.slice(1)
  }
}

function formatPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (price >= 100)   return price.toFixed(2)
  if (price >= 1)     return price.toFixed(4)
  return price.toFixed(5)
}

function timeAgo(ms: number): string {
  const secs = Math.floor((Date.now() - ms) / 1000)
  if (secs < 60)   return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  return `${Math.floor(secs / 3600)}h ago`
}

function displayToSlug(display: string): string {
  return DISPLAY_TO_SLUG[display] ?? display.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

// ── Candlestick chart ──────────────────────────────────────────────────────────

function CandlestickMini({ candles, isUp }: { candles: Candle[]; isUp: boolean }) {
  if (candles.length < 3) return <div className="w-full h-12 bg-white/5 rounded" />

  const W = 160, H = 48, PAD = 2
  const slice = candles.slice(-24)
  const n     = slice.length

  const allH = slice.flatMap(c => [c.h, c.l]).filter(p => p > 0)
  if (allH.length === 0) return <div className="w-full h-12 bg-white/5 rounded" />
  const minP  = Math.min(...allH)
  const maxP  = Math.max(...allH)
  const range = maxP - minP || minP * 0.001 || 1

  const toY   = (p: number) => PAD + (H - 2 * PAD) * (1 - (p - minP) / range)
  const colW  = W / n
  const bodyW = Math.max(1, colW * 0.6)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none">
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
            <line x1={xc} y1={toY(c.h)} x2={xc} y2={toY(c.l)} stroke={color} strokeWidth="0.8" opacity="0.6" />
            <rect x={xc - bodyW / 2} y={bTop} width={bodyW} height={bH} fill={color} />
          </g>
        )
      })}
    </svg>
  )
}

// ── RSI Gauge ─────────────────────────────────────────────────────────────────

function RSIBar({ rsi }: { rsi: number }) {
  const pct = Math.min(Math.max(rsi, 0), 100)
  const color = rsi >= 70 ? '#ef5350' : rsi <= 30 ? '#1D9E75' : rsi >= 55 ? '#26a69a' : rsi <= 45 ? '#f5c518' : '#8b92a5'
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>RSI</span>
        <span style={{ color }} className="font-semibold">{rsi.toFixed(1)}</span>
      </div>
      <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-[30%] bg-emerald-500/15 rounded-l-full" />
        <div className="absolute right-0 top-0 h-full w-[30%] bg-red-500/15 rounded-r-full" />
        <div
          className="absolute top-0 w-2.5 h-2.5 rounded-full -mt-0.5 -ml-1.5 shadow-sm"
          style={{ left: `${pct}%`, background: color, transition: 'left 0.6s ease' }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
        <span>Oversold 30</span>
        <span>Overbought 70</span>
      </div>
    </div>
  )
}

// ── Instrument Card ───────────────────────────────────────────────────────────

function InstrumentCard({
  inst,
  livePrice,
  isLive,
  weekend,
  marketOpen,
  currentSentiment,
}: {
  inst: InstrumentData
  livePrice?: LivePrice
  isLive: boolean
  weekend: boolean
  marketOpen: boolean
  currentSentiment: SentimentFilter
}) {
  const price     = livePrice?.price     ?? inst.price
  const change    = livePrice?.change    ?? inst.change
  const changePct = livePrice?.changePct ?? inst.changePct
  const isUp      = changePct >= 0
  const sig       = signalConfig(inst.signal)
  const [expanded, setExpanded] = useState(false)
  const slug = displayToSlug(inst.display)

  // Flash animation when price updates
  const prevPrice = useRef(price)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)
  useEffect(() => {
    if (price !== prevPrice.current) {
      setFlash(price > prevPrice.current ? 'up' : 'down')
      prevPrice.current = price
      const t = setTimeout(() => setFlash(null), 800)
      return () => clearTimeout(t)
    }
  }, [price])

  return (
    <div className="bg-[#131722] border border-white/10 rounded-2xl overflow-hidden hover:border-[#1D9E75]/50 transition-all group">
      {/* Clickable header area → detail page */}
      <Link href={`/analysis/${slug}?from=${inst.category}${currentSentiment ? `&sentiment=${currentSentiment}` : ''}`} className="block">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-black text-white tracking-tight group-hover:text-emerald-300 transition-colors">{inst.display}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${categoryBadge(inst.category)}`}>
                  {categoryLabel(inst.category)}
                </span>
                {isLive && (
                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                    <Zap className="w-2.5 h-2.5" />
                    LIVE
                  </span>
                )}
                {inst.category !== 'crypto' && !marketOpen && (
                  <span className="flex items-center gap-0.5 text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full">
                    <Clock className="w-2.5 h-2.5" />
                    CLOSED
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{inst.name}</p>
            </div>
            {/* Signal badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${sig.bg} ${sig.text} ${sig.border}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sig.dot} animate-pulse`} />
              {inst.signal}
            </div>
          </div>

          {/* Price + candlestick row */}
          <div className="flex items-end justify-between gap-3">
            <div>
              <div
                className={`text-2xl font-black tabular-nums transition-colors duration-300 ${
                  flash === 'up' ? 'text-emerald-400' : flash === 'down' ? 'text-red-400' : 'text-white'
                }`}
              >
                {formatPrice(price)}
              </div>
              <div className={`flex items-center gap-1 text-sm font-semibold mt-0.5 ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>{isUp ? '+' : ''}{change.toFixed(inst.price > 100 ? 2 : 4)}</span>
                <span>({isUp ? '+' : ''}{changePct.toFixed(2)}%)</span>
              </div>
            </div>
            <div className="w-32 shrink-0">
              <CandlestickMini candles={inst.candles} isUp={isUp} />
            </div>
          </div>
        </div>

        {/* OHLV strip */}
        <div className="grid grid-cols-4 border-t border-b border-white/5 bg-white/[0.02]">
          {[
            { label: 'Open', value: formatPrice(inst.open) },
            { label: 'High', value: formatPrice(inst.high) },
            { label: 'Low',  value: formatPrice(inst.low)  },
            { label: 'Vol',  value: inst.volume > 1e9 ? `${(inst.volume/1e9).toFixed(1)}B` : inst.volume > 1e6 ? `${(inst.volume/1e6).toFixed(1)}M` : inst.volume > 1e3 ? `${(inst.volume/1e3).toFixed(0)}K` : String(inst.volume) },
          ].map(item => (
            <div key={item.label} className="px-2 sm:px-3 py-2 text-center">
              <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wider">{item.label}</p>
              <p className="text-[10px] sm:text-xs text-white font-medium tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>

        {/* RSI */}
        <div className="px-5 py-3">
          <RSIBar rsi={inst.rsi} />
        </div>

        {/* EMA levels */}
        <div className="px-5 pb-3">
          <div className="flex gap-2">
            {[
              { label: 'EMA9',  val: inst.ema9  },
              { label: 'EMA21', val: inst.ema21 },
              { label: 'EMA50', val: inst.ema50 },
            ].map(e => (
              <div key={e.label} className="flex-1 bg-white/5 rounded-lg px-2 py-1.5 text-center">
                <p className="text-[10px] text-gray-500">{e.label}</p>
                <p className="text-[11px] text-white font-semibold tabular-nums">{formatPrice(e.val)}</p>
              </div>
            ))}
          </div>
        </div>
      </Link>

      {/* Analysis & Prediction — outside Link to allow expand/collapse */}
      <div className="px-5 pb-4 space-y-3">
        <div>
          <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Analysis</p>
          <p className={`text-xs text-gray-300 leading-relaxed ${!expanded ? 'line-clamp-3' : ''}`}>
            {inst.analysis}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Prediction</p>
          <p className="text-xs text-gray-300 leading-relaxed">{inst.prediction}</p>
        </div>

        {/* News */}
        {inst.news.length > 0 && (
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Latest News
            </p>
            <div className="space-y-2">
              {inst.news.slice(0, expanded ? 3 : 2).map((n, i) => (
                <a
                  key={i}
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 group/news"
                >
                  <ExternalLink className="w-3 h-3 text-gray-600 group-hover/news:text-[#1D9E75] mt-0.5 shrink-0 transition-colors" />
                  <div>
                    <p className="text-xs text-gray-400 group-hover/news:text-white transition-colors leading-snug line-clamp-2">{n.title}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{n.publisher} · {timeAgo(n.publishedAt)}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-[11px] text-[#1D9E75] hover:text-emerald-300 transition-colors font-medium"
          >
            {expanded ? '↑ Show less' : '↓ Show more'}
          </button>
          <Link
            href={`/analysis/${slug}`}
            className="text-[11px] text-gray-500 hover:text-white transition-colors font-medium flex items-center gap-1"
          >
            Full analysis →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Module-level market data cache — survives page navigation ─────────────────
// Stored outside the component so navigating away and back is instant.

const MARKET_CACHE_TTL = 10 * 60 * 1000  // 10 minutes

let mktCache: { data: MarketData; ts: number } | null = null

// ── Main client component ─────────────────────────────────────────────────────

type Tab = 'all' | 'forex' | 'commodity' | 'indices' | 'stocks' | 'crypto'
type SentimentFilter = 'bull' | 'neutral' | 'bear' | null

const LIVE_INTERVAL = 60_000  // 60 s

export default function AnalysisClient({ initial }: { initial: MarketData | null }) {
  usePageTrack()
  const router       = useRouter()
  const searchParams = useSearchParams()

  // Seed module cache from SSR initial data on first ever load
  if (initial && !mktCache) {
    mktCache = { data: initial, ts: Date.now() }
  }

  const cached = mktCache && (Date.now() - mktCache.ts) < MARKET_CACHE_TTL ? mktCache.data : null

  const [data,            setData]           = useState<MarketData | null>(cached ?? initial)
  const [loading,         setLoading]        = useState(!cached && !initial)
  const [refreshing,      setRefreshing]     = useState(false)
  const [error,           setError]          = useState('')
  const validTabs: Tab[] = ['all', 'forex', 'commodity', 'indices', 'stocks', 'crypto']
  const initTab = (searchParams.get('tab') ?? 'all') as Tab
  const validSentiments = ['bull', 'bear', 'neutral']
  const initSentiment = searchParams.get('sentiment') as SentimentFilter
  const [tab,             setTab]            = useState<Tab>(validTabs.includes(initTab) ? initTab : 'all')
  const [sentimentFilter, setSentimentFilter]= useState<SentimentFilter>(validSentiments.includes(initSentiment ?? '') ? initSentiment : null)
  const [search,          setSearch]         = useState('')
  const [weekend,         setWeekend]        = useState(cached?.weekend ?? initial?.weekend ?? false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Signals to Watch
  const [topSignals, setTopSignals] = useState<{ slug: string; display: string; category: string; decision: string; confidence: number; confluence: number; sentAt: string }[]>([])
  useEffect(() => {
    const fetchTop = () => {
      fetch('/api/signals/top').then(r => r.json()).then(d => setTopSignals(d.signals ?? [])).catch(() => {})
    }
    // Pause when tab is hidden; catch up on visibility return.
    const tick = () => { if (!document.hidden) fetchTop() }
    const onVisible = () => { if (!document.hidden) tick() }
    tick()
    const id = setInterval(tick, 2 * 60 * 1000)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // Live price state
  const [livePrices,      setLivePrices]     = useState<Record<string, LivePrice>>({})
  const [lastLiveAt,      setLastLiveAt]     = useState(0)
  const dataRef = useRef<MarketData | null>(cached ?? initial ?? null)

  // Per-category open/closed flags from live endpoint
  const [forexOpen,   setForexOpen]   = useState(true)
  const [futuresOpen, setFuturesOpen] = useState(true)
  const [stocksOpen,  setStocksOpen]  = useState(false)

  // ── Full data refresh (10 min) ─────────────────────────────────────────────
  const fetchData = useCallback(async (force = false) => {
    // Skip if cache is still fresh and this is not a manual force refresh
    if (!force && mktCache && (Date.now() - mktCache.ts) < MARKET_CACHE_TTL) return
    setRefreshing(true)
    setError('')
    try {
      const res  = await fetch(`/api/market-data${force ? '?refresh=1' : ''}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json() as MarketData & { weekend?: boolean }
      mktCache = { data: json, ts: Date.now() }
      setData(json)
      setWeekend(json.weekend ?? false)
      dataRef.current = json
    } catch {
      setError('Could not load market data. Retrying…')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    // Only fetch on mount if cache is stale or missing
    if (!mktCache || (Date.now() - mktCache.ts) >= MARKET_CACHE_TTL) {
      fetchData()
    }
    // Auto-refresh every 10 minutes — paused while tab is hidden.
    const tick = () => { if (!document.hidden) fetchData() }
    const onVisible = () => { if (!document.hidden) tick() }
    const id = setInterval(tick, MARKET_CACHE_TTL)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchData])

  // ── Live price polling (5 s) + alert checker ──────────────────────────────
  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch('/api/market-data/live')
      if (!res.ok) return
      const json = await res.json() as { prices: Record<string, LivePrice>; updatedAt: number; weekend: boolean; forexOpen: boolean; futuresOpen: boolean; stocksOpen: boolean }
      setLivePrices(json.prices ?? {})
      setLastLiveAt(json.updatedAt ?? Date.now())
      setWeekend(json.weekend ?? false)
      setForexOpen(json.forexOpen   ?? true)
      setFuturesOpen(json.futuresOpen ?? true)
      setStocksOpen(json.stocksOpen  ?? false)

      // ── Price alert checker ────────────────────────────────────────────────
      const alerts = getAlerts().filter(a => a.active)
      if (alerts.length === 0 || !dataRef.current) return

      for (const alert of alerts) {
        // Find the instrument matching this alert's slug
        const inst = dataRef.current.instruments.find(i =>
          (DISPLAY_TO_SLUG[i.display] ?? i.display.toLowerCase().replace(/[^a-z0-9]+/g, '-')) === alert.slug
        )
        if (!inst) continue

        // Use live price if available, else fall back to instrument price
        const liveP  = json.prices?.[inst.symbol]?.price
        const price  = liveP ?? inst.price
        if (!price) continue

        // Trigger only at the end figure of the entry zone (entryHigh — upper boundary)
        // with a 0.05% tolerance band so the alert can realistically fire
        const triggerPrice = alert.entryHigh
        const tolerance    = triggerPrice * 0.0005
        if (price >= triggerPrice - tolerance && price <= triggerPrice + tolerance) {
          const priceStr = price >= 100 ? price.toFixed(2) : price.toFixed(5)
          // Fire browser notification
          fireBrowserNotification(alert.display, alert.decision, priceStr)
          // Store in-app notification
          addNotification({
            id:          `${alert.id}_${Date.now()}`,
            slug:        alert.slug,
            display:     alert.display,
            decision:    alert.decision,
            price,
            entryLow:    alert.entryLow,
            entryHigh:   alert.entryHigh,
            triggeredAt: Date.now(),
            read:        false,
          })
          // Deactivate alert so it only fires once (user re-enables from FMTrader if needed)
          deactivateAlert(alert.id)
        }
      }
    } catch { /* silent — live price update is best-effort */ }
  }, [])

  useEffect(() => {
    // Pause live polling while tab is hidden; catch up on visibility return.
    const tick = () => { if (!document.hidden) void fetchLive() }
    const onVisible = () => { if (!document.hidden) tick() }
    tick()
    const id = setInterval(tick, LIVE_INTERVAL)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchLive])

  // Apply tab + sentiment + search filters
  const q = search.trim().toLowerCase()
  const filtered = data?.instruments.filter(i => {
    if (tab !== 'all' && i.category !== tab) return false
    if (sentimentFilter === 'bull')    { if (i.signal !== 'STRONG BUY'  && i.signal !== 'BUY')          return false }
    if (sentimentFilter === 'neutral') { if (i.signal !== 'NEUTRAL')                                     return false }
    if (sentimentFilter === 'bear')    { if (i.signal !== 'STRONG SELL' && i.signal !== 'SELL')          return false }
    if (q) {
      const hay = `${i.display} ${i.name} ${i.category}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }) ?? []

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all',       label: 'All Markets',  count: data?.instruments.length ?? 0 },
    { id: 'forex',     label: 'Forex',        count: data?.instruments.filter(i => i.category === 'forex').length ?? 0 },
    { id: 'commodity', label: 'Commodities',  count: data?.instruments.filter(i => i.category === 'commodity').length ?? 0 },
    { id: 'indices',   label: 'Indices',      count: data?.instruments.filter(i => i.category === 'indices').length ?? 0 },
    { id: 'stocks',    label: 'Stocks',       count: data?.instruments.filter(i => i.category === 'stocks').length ?? 0 },
    { id: 'crypto',    label: 'Crypto',       count: data?.instruments.filter(i => i.category === 'crypto').length ?? 0 },
  ]

  function toggleSentiment(f: SentimentFilter) {
    setSentimentFilter(prev => {
      const next = prev === f ? null : f
      const params = new URLSearchParams(searchParams.toString())
      if (next) params.set('sentiment', next)
      else params.delete('sentiment')
      router.replace(`/analysis${params.size ? `?${params}` : ''}`, { scroll: false })
      return next
    })
  }

  const isLive = Date.now() - lastLiveAt < 60_000

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white">
      {/* Page header */}
      <div className="bg-[#131722] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-white">Market Analysis & Predictions</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Live technical analysis · RSI · EMA signals · Latest news
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Live indicator */}
              {isLive && (
                <span className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                  <Zap className="w-3 h-3" />
                  Live · {timeAgo(lastLiveAt)}
                </span>
              )}
              {data && (
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Analysis {timeAgo(data.updatedAt)}
                </span>
              )}
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-300 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search pairs, e.g. EUR/USD, Gold, Bitcoin, S&P 500…"
              className="w-full sm:max-w-md bg-[#0a0f1a] border border-white/10 focus:border-emerald-500/50 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); searchRef.current?.focus() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ── Signals to Watch ──────────────────────────────────────────────── */}
        <SignalsRemotionPlayer signals={topSignals} />

        {/* Sentiment overview — clickable to filter */}
        {data && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <button
              onClick={() => toggleSentiment('bull')}
              className={`flex items-center gap-2 sm:gap-3 px-3 py-3 sm:px-5 sm:py-4 rounded-xl border transition-all text-left ${
                sentimentFilter === 'bull'
                  ? 'bg-emerald-500/20 border-emerald-500/50 ring-1 ring-emerald-500/40'
                  : 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/15'
              }`}
            >
              <TrendingUp className="w-5 h-5 sm:w-8 sm:h-8 text-emerald-400 shrink-0" />
              <div>
                <p className="text-xl sm:text-2xl font-black text-emerald-400">{data.bullCount}</p>
                <p className="text-[10px] sm:text-xs text-gray-400">Bullish</p>
              </div>
              {sentimentFilter === 'bull' && (
                <span className="ml-auto text-[10px] text-emerald-400 font-bold uppercase tracking-wider hidden sm:block">Active</span>
              )}
            </button>

            <button
              onClick={() => toggleSentiment('neutral')}
              className={`flex items-center gap-2 sm:gap-3 px-3 py-3 sm:px-5 sm:py-4 rounded-xl border transition-all text-left ${
                sentimentFilter === 'neutral'
                  ? 'bg-amber-500/20 border-amber-500/50 ring-1 ring-amber-500/40'
                  : 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/15'
              }`}
            >
              <Minus className="w-5 h-5 sm:w-8 sm:h-8 text-amber-400 shrink-0" />
              <div>
                <p className="text-xl sm:text-2xl font-black text-amber-400">{data.neutralCount}</p>
                <p className="text-[10px] sm:text-xs text-gray-400">Neutral</p>
              </div>
              {sentimentFilter === 'neutral' && (
                <span className="ml-auto text-[10px] text-amber-400 font-bold uppercase tracking-wider hidden sm:block">Active</span>
              )}
            </button>

            <button
              onClick={() => toggleSentiment('bear')}
              className={`flex items-center gap-2 sm:gap-3 px-3 py-3 sm:px-5 sm:py-4 rounded-xl border transition-all text-left ${
                sentimentFilter === 'bear'
                  ? 'bg-red-500/20 border-red-500/50 ring-1 ring-red-500/40'
                  : 'bg-red-500/10 border-red-500/20 hover:border-red-500/40 hover:bg-red-500/15'
              }`}
            >
              <TrendingDown className="w-5 h-5 sm:w-8 sm:h-8 text-red-400 shrink-0" />
              <div>
                <p className="text-xl sm:text-2xl font-black text-red-400">{data.bearCount}</p>
                <p className="text-[10px] sm:text-xs text-gray-400">Bearish</p>
              </div>
              {sentimentFilter === 'bear' && (
                <span className="ml-auto text-[10px] text-red-400 font-bold uppercase tracking-wider hidden sm:block">Active</span>
              )}
            </button>
          </div>
        )}

        {/* Active filter banner */}
        {(sentimentFilter || q) && (
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 gap-3 flex-wrap">
            <p className="text-sm text-gray-300">
              {q && (
                <>Searching <span className="text-white font-semibold">"{search}"</span>{sentimentFilter ? ' · ' : ''}</>
              )}
              {sentimentFilter && (
                <>
                  Showing{' '}
                  <span className={sentimentFilter === 'bull' ? 'text-emerald-400 font-semibold' : sentimentFilter === 'neutral' ? 'text-amber-400 font-semibold' : 'text-red-400 font-semibold'}>
                    {sentimentFilter === 'bull' ? 'bullish' : sentimentFilter === 'neutral' ? 'neutral' : 'bearish'}
                  </span>
                  {' '}signals
                </>
              )}
              {' '}— {filtered.length} pair{filtered.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={() => { setSentimentFilter(null); setSearch('') }}
              className="text-xs text-gray-500 hover:text-white transition shrink-0"
            >
              Clear all ×
            </button>
          </div>
        )}

        {/* Weekend banner */}
        {weekend && (
          <div className="flex items-start gap-2.5 bg-blue-500/8 border border-blue-500/25 rounded-xl px-4 py-3">
            <Clock className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-300/80 leading-relaxed">
              <strong className="text-blue-300">Weekend — Markets Closed.</strong> Forex, commodities, and indices prices shown are Friday&apos;s closing values. Crypto prices continue to update in real time.
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-300/70 leading-relaxed">
            <strong className="text-amber-300">Educational purposes only.</strong> Signals are generated from automated technical indicators (RSI, EMA). This is not financial advice. Always conduct your own analysis and apply proper risk management before trading.
          </p>
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-max min-w-full sm:w-fit sm:min-w-0">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id)
                  const params = new URLSearchParams(searchParams.toString())
                  if (t.id === 'all') params.delete('tab')
                  else params.set('tab', t.id)
                  router.replace(`/analysis${params.size ? `?${params}` : ''}`, { scroll: false })
                }}
                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id
                    ? 'bg-[#1D9E75] text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={`ml-1.5 text-xs ${tab === t.id ? 'opacity-80' : 'opacity-50'}`}>
                    ({t.count})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[#131722] border border-white/10 rounded-2xl h-80 animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Cards grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(inst => {
              const catOpen =
                inst.category === 'crypto'    ? true :
                inst.category === 'forex'     ? forexOpen :
                inst.category === 'stocks'    ? stocksOpen :
                /* commodity + indices */       futuresOpen
              return (
                <InstrumentCard
                  key={inst.symbol}
                  inst={inst}
                  livePrice={livePrices[inst.symbol]}
                  isLive={isLive && catOpen}
                  weekend={weekend}
                  marketOpen={!weekend && catOpen}
                  currentSentiment={sentimentFilter}
                />
              )
            })}
          </div>
        )}

        {!loading && data && filtered.length === 0 && (
          <div className="text-center py-20">
            <Search className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium mb-1">No results found</p>
            <p className="text-gray-600 text-sm">
              {q
                ? `No pairs match "${search}". Try EUR, Gold, BTC or S&P.`
                : sentimentFilter
                ? `No ${sentimentFilter === 'bull' ? 'bullish' : sentimentFilter === 'neutral' ? 'neutral' : 'bearish'} signals in this category.`
                : 'No instruments in this category.'}
            </p>
            {(q || sentimentFilter) && (
              <button
                onClick={() => { setSearch(''); setSentimentFilter(null) }}
                className="mt-4 text-sm text-emerald-400 hover:text-emerald-300 transition"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Footer note */}
        {data && (
          <div className="pb-6 space-y-2">
            <div className="mx-4 rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3">
              <p className="text-center text-[11px] text-amber-600/80 font-semibold leading-relaxed">
                ⚠ Educational purposes only — not regulated financial advice
              </p>
              <p className="text-center text-[10px] text-gray-600 mt-1 leading-relaxed">
                All signals, analysis, and AI-generated content on this platform are for educational use only.
                They do not constitute investment advice or a recommendation to buy or sell any financial instrument.
                Trading involves substantial risk of loss. Never risk money you cannot afford to lose.
              </p>
            </div>
            <p className="text-center text-[10px] text-gray-700">
              Data sourced from Yahoo Finance · Live prices update every 5s · Analysis refreshes every 5 minutes ·
              Last analysis: {new Date(data.updatedAt).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
