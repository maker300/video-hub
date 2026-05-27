'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  X, TrendingUp, TrendingDown, Minus, Loader2, AlertTriangle,
  Target, Shield, Zap, Brain, BarChart3, RefreshCw, Clock,
  ChevronDown, ChevronUp, CalendarClock, Bell, BellOff, History,
  CheckCircle2, XCircle, Timer, DollarSign, Send, Wifi, Trash2,
} from 'lucide-react'
import {
  isPairSubscribed, togglePairSubscription,
  requestNotificationPermission, firePairBrowserNotification,
  addNotification,
} from '@/lib/price-alerts'
import {
  SESSION_SLOTS, CRYPTO_SESSION_SLOTS,
  type SessionSlotId, type FMTraderRequest, type FMTraderResponse,
} from '@/lib/fm-trader-types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function dp(price: number) {
  if (price >= 10000) return 2
  if (price >= 100)   return 2
  if (price >= 1)     return 4
  return 5
}
function fmt(price: number, dec?: number) {
  if (!price || !isFinite(price)) return '—'
  return price.toFixed(dec ?? dp(price))
}
function timeAgo(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

/** Detect the active hourly slot.
 *  Crypto uses UTC (global 24/7 market). Others use local hours, clamped to 08–21. */
function detectCurrentSlot(category = 'forex'): SessionSlotId {
  // Always use local time — the slot picker is for the user's perspective.
  // Crypto runs 24/7 so any local hour is valid; forex is clamped to 08-21.
  const h = new Date().getHours()
  if (category === 'crypto') {
    return String(h).padStart(2, '0') as SessionSlotId
  }
  if (h >= 8 && h <= 21) return String(h).padStart(2, '0') as SessionSlotId
  return '08'  // outside trading hours → default to London open
}

/** Is a given slot the currently active real-time hour? Always uses local time. */
function isSlotActive(id: SessionSlotId, category = 'forex'): boolean {
  const h = new Date().getHours()
  if (category !== 'crypto') {
    return h === parseInt(id, 10)
  }
  return h === parseInt(id, 10)
}

// ── Decision badge ────────────────────────────────────────────────────────────

function DecisionBadge({ decision }: { decision: string }) {
  const cfg =
    decision === 'BUY'  ? { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40', glow: 'shadow-emerald-500/20', Icon: TrendingUp  } :
    decision === 'SELL' ? { bg: 'bg-red-500/20',     text: 'text-red-300',     border: 'border-red-500/40',     glow: 'shadow-red-500/20',     Icon: TrendingDown } :
                          { bg: 'bg-amber-500/20',   text: 'text-amber-300',   border: 'border-amber-500/40',   glow: 'shadow-amber-500/20',   Icon: Minus        }
  return (
    <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border font-black text-lg shadow-lg ${cfg.bg} ${cfg.text} ${cfg.border} ${cfg.glow}`}>
      <cfg.Icon className="w-5 h-5" />
      {decision}
    </span>
  )
}

// ── Paragraphs ────────────────────────────────────────────────────────────────

function Paragraphs({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean).map((p, i) => (
        <p key={i} className="text-sm text-gray-300 leading-relaxed">{p}</p>
      ))}
    </div>
  )
}

// ── Session slot picker — compact dropdown ────────────────────────────────────

function SessionPicker({
  selected, onChange, category,
}: {
  selected:  SessionSlotId
  onChange:  (id: SessionSlotId) => void
  category:  string
}) {
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)
  const isCrypto        = category === 'crypto'
  const slots           = isCrypto ? CRYPTO_SESSION_SLOTS : SESSION_SLOTS
  const picked          = slots.find(s => s.id === selected)
  const active          = picked ? isSlotActive(picked.id, category) : false

  // Close on outside click / touch
  useEffect(() => {
    function handle(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('touchstart', handle as EventListener, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('touchstart', handle as EventListener)
    }
  }, [])

  return (
    <div className="px-4 sm:px-5 pb-3 border-b border-white/[0.07]" ref={ref}>
      <div className="flex items-center gap-2">
        <CalendarClock className="w-3.5 h-3.5 text-[#1D9E75] shrink-0" />
        <span className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
          {isCrypto ? 'UTC Hour' : 'Session'}
        </span>

        {/* Trigger button */}
        <div className="relative flex-1">
          <button
            onClick={() => setOpen(v => !v)}
            className="w-full flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-[#1D9E75]/40 rounded-xl px-3 py-2 transition text-left"
          >
            {picked ? (
              <>
                <span className="text-sm font-black text-[#1D9E75] tabular-nums shrink-0">{picked.id}:00</span>
                <span className="text-xs text-gray-300 truncate flex-1">{picked.name}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
              </>
            ) : (
              <span className="text-xs text-gray-500 flex-1">Select slot…</span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown list */}
          {open && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#131722] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-50 max-h-60 overflow-y-auto">
              {slots.map(slot => {
                const isActive = isSlotActive(slot.id, category)
                const isSel    = selected === slot.id
                return (
                  <button
                    key={slot.id}
                    onClick={() => { onChange(slot.id); setOpen(false) }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                      isSel ? 'bg-[#1D9E75]/12' : 'hover:bg-white/5'
                    }`}
                  >
                    <span className={`text-sm font-black tabular-nums w-9 shrink-0 ${isSel ? 'text-[#1D9E75]' : 'text-gray-400'}`}>
                      {slot.id}:00
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${isSel ? 'text-white' : 'text-gray-300'}`}>{slot.name}</p>
                      <p className="text-[10px] text-gray-600 truncate">{slot.desc}</p>
                    </div>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
                    {isSel && <CheckCircle2 className="w-3.5 h-3.5 text-[#1D9E75] shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Position sizing calculator ────────────────────────────────────────────────
//
// Formula (works for all asset classes):
//   Risk Amount  = account × (riskPct / 100)
//   Stop Dist $  = |entry - stopLoss| in USD terms
//   Units        = Risk Amount / Stop Dist $
//   Lots (forex) = Units / 100,000
//
// For USD-base pairs (USD/JPY, USD/CAD etc.) the stop distance is in the
// quote currency, so we convert: stopDist$ = stopDist / price.
// For everything else (USD-quote, Gold, Crypto, Indices) the stop is already in USD.

interface SizerProps {
  decision: string
  entryHigh: number
  entryLow: number
  stopLoss: number
  category: string
  slug: string
  price: number
}

const RISK_OPTIONS = [0.5, 1, 1.5, 2] as const
const LS_ACCOUNT  = 'fmtrader_account'

function PositionSizer({ decision, entryHigh, entryLow, stopLoss, category, slug, price }: SizerProps) {
  const [account,  setAccount]  = useState<number>(() => {
    if (typeof window === 'undefined') return 10000
    return Number(localStorage.getItem(LS_ACCOUNT) ?? 10000)
  })
  const [riskPct,  setRiskPct]  = useState<number>(1)
  const [rawInput, setRawInput] = useState<string>(() => {
    if (typeof window === 'undefined') return '10000'
    return String(localStorage.getItem(LS_ACCOUNT) ?? '10000')
  })

  function handleAccountChange(val: string) {
    setRawInput(val)
    const n = parseFloat(val.replace(/,/g, ''))
    if (!isNaN(n) && n > 0) {
      setAccount(n)
      localStorage.setItem(LS_ACCOUNT, String(n))
    }
  }

  // Entry price for sizing: use the relevant edge depending on direction
  const entryRef  = decision === 'BUY' ? entryHigh : entryLow
  const stopDist  = Math.abs(entryRef - stopLoss)

  // Convert stop distance to USD value per unit
  const isUsdBase = slug.startsWith('usd-') && category === 'forex'
  const stopDistUSD = isUsdBase ? (price > 0 ? stopDist / price : 0) : stopDist

  // Pip size: JPY pairs price > 50 → pip = 0.01, else 0.0001
  const pipSize = category === 'forex' ? (price > 20 ? 0.01 : 0.0001) : null

  const riskAmt  = account * (riskPct / 100)
  const units    = stopDistUSD > 0 ? riskAmt / stopDistUSD : 0
  const lots     = category === 'forex' ? units / 100_000 : null
  const stopPips = pipSize && pipSize > 0 ? stopDist / pipSize : null

  // Pip value per lot (approx, for display only)
  const pipValuePerLot = pipSize
    ? (isUsdBase ? (10 / (price > 0 ? price : 1)) * (pipSize / 0.0001) : 10 * (pipSize / 0.0001))
    : null

  function fmtUnits(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
    return n.toFixed(0)
  }

  const isBuy  = decision === 'BUY'
  const accent = isBuy ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                       : 'text-red-400 border-red-500/30 bg-red-500/10'

  return (
    <div className="bg-[#131722] border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-4 h-4 text-blue-400" />
        <span className="text-xs font-bold text-white uppercase tracking-wider">Position Sizing</span>
        <span className="text-[9px] text-gray-600 ml-auto">Never risk more than 1–2% per trade</span>
      </div>

      {/* Inputs */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="text-[9px] text-gray-600 uppercase tracking-wider block mb-1">Account size (USD)</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={rawInput}
              onChange={e => handleAccountChange(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-6 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#1D9E75]/60 focus:bg-[#1D9E75]/5 transition"
              placeholder="10000"
            />
          </div>
        </div>
        <div>
          <label className="text-[9px] text-gray-600 uppercase tracking-wider block mb-1">Risk %</label>
          <div className="flex gap-1">
            {RISK_OPTIONS.map(r => (
              <button
                key={r}
                onClick={() => setRiskPct(r)}
                className={`px-2 py-2 rounded-lg text-xs font-bold border transition ${
                  riskPct === r
                    ? 'bg-[#1D9E75]/20 border-[#1D9E75]/50 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'
                }`}
              >
                {r}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Output */}
      {units > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Risk amount',    value: `$${riskAmt.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, sub: `${riskPct}% of account` },
            { label: 'Stop distance',  value: stopPips ? `${stopPips.toFixed(1)} pips` : stopDist.toFixed(price >= 100 ? 2 : 5), sub: `${stopDist.toFixed(price >= 100 ? 2 : 5)} pts` },
            lots !== null
              ? { label: 'Position size', value: `${lots.toFixed(2)} lots`, sub: `${fmtUnits(units)} units` }
              : { label: 'Position size', value: fmtUnits(units), sub: `units of ${slug.split('-')[0].toUpperCase()}` },
            pipValuePerLot !== null && lots !== null
              ? { label: 'Pip value', value: `$${(pipValuePerLot * lots).toFixed(2)}/pip`, sub: `$${pipValuePerLot.toFixed(2)}/pip per lot` }
              : { label: 'Value at risk', value: `$${riskAmt.toLocaleString('en', { maximumFractionDigits: 0 })}`, sub: 'if SL is hit' },
          ].map(c => (
            <div key={c.label} className={`rounded-lg border px-3 py-2.5 ${accent}`}>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider">{c.label}</p>
              <p className="text-sm font-black tabular-nums mt-0.5">{c.value}</p>
              <p className="text-[9px] text-gray-600 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-600 text-center py-2">Enter an account size above to calculate position sizing.</p>
      )}

      <p className="text-[10px] text-gray-700 mt-3 leading-relaxed">
        Calculated to risk exactly <strong className="text-gray-500">{riskPct}%</strong> of your ${account.toLocaleString()} account if the stop loss is hit.
        {lots !== null && ` Broker lot minimum is typically 0.01 lots — round down to nearest 0.01.`}
      </p>
    </div>
  )
}

// ── Trade history types ───────────────────────────────────────────────────────

interface PredictionRecord {
  id: string; slug: string; display: string; decision: string; confidence: number
  entryLow: number; entryHigh: number; stopLoss: number; tp1: number; tp2: number; tp3: number
  rrRatio: string; priceAtCall: number; outcome: string; outcomeAt: string | null
  priceAtOutcome: number | null; generatedAt: string; expiresAt: string
}

interface TradeUpdateRecord {
  id: string; predictionId: string; type: string; message: string
  currentPrice: number; suggestedSL: number | null; read: boolean; createdAt: string
}

// ── Win-rate history panel ────────────────────────────────────────────────────

function TradeHistoryPanel({ isAdmin }: { isAdmin: boolean }) {
  const [records, setRecords] = useState<PredictionRecord[]>([])
  const [updates, setUpdates] = useState<TradeUpdateRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/fm-trader/predictions?limit=50')
        .then(r => r.json())
        .then((d: PredictionRecord[] | { error: string }) => { if (Array.isArray(d)) setRecords(d) })
        .catch(() => {}),
      fetch('/api/fm-trader/trade-updates')
        .then(r => r.json())
        .then((d: { updates: TradeUpdateRecord[] }) => { if (d?.updates) setUpdates(d.updates) })
        .catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  async function deletePrediction(id: string) {
    await fetch(`/api/fm-trader/predictions/${id}`, { method: 'DELETE' })
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  const resolved = records.filter(r => r.outcome && r.outcome !== 'pending' && r.outcome !== 'expired')
  const wins     = resolved.filter(r => r.outcome === 'tp1_hit' || r.outcome === 'tp2_hit' || r.outcome === 'tp3_hit')
  const losses   = resolved.filter(r => r.outcome === 'sl_hit')
  const winRate  = resolved.length > 0 ? Math.round((wins.length / resolved.length) * 100) : null

  function outcomeLabel(outcome: string) {
    if (outcome === 'tp1_hit') return { label: 'TP1 ✓', color: 'text-emerald-400' }
    if (outcome === 'tp2_hit') return { label: 'TP2 ✓', color: 'text-emerald-300' }
    if (outcome === 'tp3_hit') return { label: 'TP3 ✓', color: 'text-green-300' }
    if (outcome === 'sl_hit')  return { label: 'SL ✗',  color: 'text-red-400' }
    if (outcome === 'expired') return { label: 'Exp.',  color: 'text-gray-500' }
    return { label: '—', color: 'text-gray-600' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#1D9E75] animate-spin" />
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
        <History className="w-10 h-10 text-gray-700" />
        <p className="text-sm text-gray-500 font-medium">No predictions yet</p>
        <p className="text-xs text-gray-600">Run your first FM Trader analysis to start tracking outcomes.</p>
      </div>
    )
  }

  return (
    <div className="p-5 space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Signals', value: String(records.length), color: 'text-white' },
          { label: 'Win rate', value: winRate !== null ? `${winRate}%` : '—', color: winRate !== null ? (winRate >= 55 ? 'text-emerald-400' : winRate >= 45 ? 'text-amber-400' : 'text-red-400') : 'text-gray-500' },
          { label: 'Wins',    value: String(wins.length),    color: 'text-emerald-400' },
          { label: 'Losses',  value: String(losses.length),  color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-3 text-center">
            <p className={`text-lg font-black tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-[9px] text-gray-600 uppercase tracking-wider font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="space-y-2">
        {records.map(r => {
          const oc = outcomeLabel(r.outcome ?? 'pending')
          const isPending = !r.outcome || r.outcome === 'pending'
          const dec = r.priceAtCall >= 100 ? 2 : r.priceAtCall >= 1 ? 4 : 5
          const rowUpdates = updates.filter(u => u.predictionId === r.id)
          return (
            <div key={r.id} className="space-y-1">
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 flex items-center gap-3">
                <div className={`w-1.5 h-10 rounded-full shrink-0 ${r.decision === 'BUY' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.decision === 'BUY' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>{r.decision}</span>
                    <a
                      href={`/analysis/${r.slug}?fmtrader=1`}
                      className="text-xs font-semibold text-white hover:text-emerald-400 truncate transition-colors"
                    >
                      {r.display}
                    </a>
                    <span className="text-[10px] text-gray-600">{r.confidence}%</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-600">
                    <span>Entry {r.priceAtCall.toFixed(dec)}</span>
                    <span>SL {r.stopLoss.toFixed(dec)}</span>
                    <span>R:R {r.rrRatio}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {isPending ? (
                    <div>
                      <div className="flex items-center gap-1 text-amber-500 justify-end">
                        <Timer className="w-3 h-3" />
                        <span className="text-[10px] font-semibold">Pending</span>
                      </div>
                      <p className="text-[9px] text-gray-500 mt-0.5">
                        until {new Date(r.expiresAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC
                      </p>
                    </div>
                  ) : (
                    <span className={`text-xs font-bold ${oc.color}`}>{oc.label}</span>
                  )}
                  {r.priceAtOutcome && (
                    <p className="text-[9px] text-gray-600 mt-0.5">@ {r.priceAtOutcome.toFixed(dec)}</p>
                  )}
                </div>
                {(isAdmin || isPending) && (
                  <button
                    onClick={() => deletePrediction(r.id)}
                    title="Delete prediction"
                    className="ml-1 w-6 h-6 flex items-center justify-center rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {isPending && rowUpdates.map(u => (
                <div
                  key={u.id}
                  className={`rounded-lg px-3 py-2 text-[11px] flex items-start gap-2 ${
                    u.type === 'cancel'
                      ? 'bg-red-500/10 border border-red-500/25 text-red-300'
                      : 'bg-amber-500/10 border border-amber-500/25 text-amber-300'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-snug">
                      {u.type === 'cancel' ? 'Cancel Advisory'
                        : u.type === 'move_sl_breakeven' ? 'Move SL to Break Even'
                        : 'Trail SL into Profit'}
                    </p>
                    <p className="text-[10px] opacity-80 mt-0.5 leading-relaxed">{u.message}</p>
                    {u.suggestedSL && (
                      <p className="text-[10px] mt-0.5 font-medium">Suggested SL: {u.suggestedSL}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-gray-700 text-center leading-relaxed">
        Outcomes tracked by Vercel Cron every 15 min. Resolved records kept for 30 days.
        Past performance does not predict future results.
      </p>
    </div>
  )
}

// ── Main FMTrader modal ───────────────────────────────────────────────────────

interface Props {
  data: Omit<FMTraderRequest, 'sessionSlot'>
  currentPrice?: number   // live price passed from DetailClient for zone-hit & staleness
  onClose: () => void
  initialShowHistory?: boolean
}

const CACHE_TTL = 30 * 60 * 1000  // must match server TTL
const STALE_WARN_AFTER = 18 * 60 * 1000  // show stale warning after 18 min
const REFRESH_UNLOCK_MS = 30 * 60 * 1000  // refresh button unlocks 30 min after last generation

export default function FMTrader({ data, currentPrice, onClose, initialShowHistory = false }: Props) {
  const { data: session } = useSession()
  const isAdmin = (session?.user as { role?: string })?.role === 'admin'

  const [slot,          setSlot]          = useState<SessionSlotId>(() => detectCurrentSlot(data.category))
  const [horizon,       setHorizon]       = useState<'intraday' | 'swing'>('intraday')
  const [refining,      setRefining]      = useState(false)
  const [view,          setView]          = useState<'trade' | 'why' | 'risk' | 'detail'>('trade')
  const [analysis,      setAnalysis]      = useState<FMTraderResponse | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [showBreakdown,  setShowBreakdown]  = useState(false)
  const [pairSubscribed, setPairSubscribed] = useState(false)
  const [alertToast,     setAlertToast]     = useState('')
  const [countdown,      setCountdown]      = useState('')   // "Refresh in X min" while locked
  const [refreshReady,   setRefreshReady]   = useState(false) // true when 30 min has elapsed
  const [showHistory,   setShowHistory]   = useState(initialShowHistory)
  // Zone-hit: 'touching' = price is in zone, 'confirmed' = price stayed 10+ min (closed candle)
  const [zoneState,     setZoneState]     = useState<'none' | 'touching' | 'confirmed'>('none')
  const [zoneHitDir,    setZoneHitDir]    = useState<'BUY' | 'SELL' | null>(null)
  const zoneEntryTime   = useRef<number | null>(null)
  const countdownTimer  = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Broker / trade approval state (admin only) ────────────────────────────
  const [brokerModal,    setBrokerModal]    = useState(false)
  const [brokerSending,  setBrokerSending]  = useState(false)
  const [brokerTrade,    setBrokerTrade]    = useState<{
    id: string; lotSize: number; expiresAt: string
  } | null>(null)
  const [brokerError,    setBrokerError]    = useState('')
  const [riskPct,        setRiskPct]        = useState('1')
  const [brokerCountdown, setBrokerCountdown] = useState('')
  const brokerTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  async function sendToBroker() {
    if (!analysis || analysis.decision === 'NO TRADE') return
    setBrokerSending(true); setBrokerError('')
    try {
      const r = await fetch('/api/broker/signal', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug:          data.slug,
          display:       data.display,
          decision:      analysis.decision,
          confidence:    analysis.confidence,
          entryLow:      analysis.entryZone[0],
          entryHigh:     analysis.entryZone[1],
          stopLoss:      analysis.stopLoss,
          tp1:           analysis.tp1,
          tp2:           analysis.tp2,
          tp3:           analysis.tp3,
          rrRatio:       analysis.rrRatio,
          priceAtSignal: data.price,
          riskPct:       parseFloat(riskPct) || 1,
        }),
      })
      const d = await r.json()
      if (!r.ok) { setBrokerError(d.error ?? 'Failed to send signal'); return }
      setBrokerTrade(d)
    } catch {
      setBrokerError('Request failed')
    } finally {
      setBrokerSending(false)
    }
  }

  async function executeBroker(action: 'approve' | 'reject') {
    if (!brokerTrade) return
    setBrokerSending(true); setBrokerError('')
    try {
      const r = await fetch('/api/broker/execute', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId: brokerTrade.id, action }),
      })
      const d = await r.json()
      if (!r.ok) { setBrokerError(d.error ?? 'Action failed'); return }
      setBrokerModal(false); setBrokerTrade(null)
      if (action === 'approve') setBrokerError('')
    } catch {
      setBrokerError('Request failed')
    } finally {
      setBrokerSending(false)
    }
  }
  // Countdown timer for broker approval window
  useEffect(() => {
    if (brokerTimer.current) clearInterval(brokerTimer.current)
    if (!brokerTrade) { setBrokerCountdown(''); return }
    const tick = () => {
      const remaining = new Date(brokerTrade.expiresAt).getTime() - Date.now()
      if (remaining <= 0) {
        setBrokerCountdown('Expired')
        if (brokerTimer.current) clearInterval(brokerTimer.current)
        return
      }
      const s = Math.ceil(remaining / 1000)
      setBrokerCountdown(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`)
    }
    tick()
    brokerTimer.current = setInterval(tick, 1000)
    return () => { if (brokerTimer.current) clearInterval(brokerTimer.current) }
  }, [brokerTrade])

  const dec = dp(data.price)

  // Sync pair subscription state from localStorage on mount
  useEffect(() => { setPairSubscribed(isPairSubscribed(data.slug)) }, [data.slug])

  async function handlePairSubscribe() {
    // Request browser permission on first subscribe (silently skipped on iOS)
    if (!pairSubscribed) await requestNotificationPermission()

    const on = togglePairSubscription(data.slug)
    setPairSubscribed(on)

    // Persist to server so email notifications can fire for this user
    if (on) {
      fetch('/api/subscriptions/pairs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: data.slug, display: data.display }),
      }).catch(() => {})

      // Add a subscription confirmation to the notification bell
      addNotification({
        id:          `sub_${data.slug}_${Date.now()}`,
        slug:        data.slug,
        display:     data.display,
        decision:    'BUY',          // required field — not shown for subscription type
        price:       0,
        entryLow:    0,
        entryHigh:   0,
        triggeredAt: Date.now(),
        read:        false,
        type:        'subscription',
      })
      setAlertToast(`Subscribed to ${data.display} — you'll receive notifications for every BUY/SELL signal.`)
    } else {
      fetch('/api/subscriptions/pairs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: data.slug }),
      }).catch(() => {})

      setAlertToast(`Unsubscribed from ${data.display} notifications.`)
    }
    setTimeout(() => setAlertToast(''), 4000)
  }

  // Start countdown ticker from when the analysis was generated.
  // Counts down to 30-min mark; once elapsed, refreshReady=true unlocks the button.
  const startCountdown = useCallback((generatedAt: number) => {
    if (countdownTimer.current) clearInterval(countdownTimer.current)
    const tick = () => {
      const elapsed   = Date.now() - generatedAt
      const remaining = REFRESH_UNLOCK_MS - elapsed
      if (remaining <= 0) {
        setCountdown('')
        setRefreshReady(true)
        if (countdownTimer.current) clearInterval(countdownTimer.current)
        return
      }
      setRefreshReady(false)
      const mins = Math.ceil(remaining / 60_000)
      setCountdown(`Refresh in ${mins}m`)
    }
    tick()
    countdownTimer.current = setInterval(tick, 30_000)
  }, [])

  useEffect(() => () => { if (countdownTimer.current) clearInterval(countdownTimer.current) }, [])

  const fetchAnalysis = useCallback(async (sessionSlot: SessionSlotId, forceRefresh = false, tradeHorizon: 'intraday' | 'swing' = horizon) => {
    setLoading(true); setError(''); setRefining(false)
    if (!forceRefresh) { setAnalysis(null) }
    setShowBreakdown(false)
    try {
      const body: FMTraderRequest = { ...data, sessionSlot, tradeHorizon, ...(forceRefresh ? { forceRefresh: true } : {}) }
      const res  = await fetch('/api/fm-trader', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          // Opt in to streaming so the rule-engine card renders in ~100ms while
          // Claude's narrative streams in 5–15s later
          'Accept':       'application/x-ndjson',
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        // Errors come back as JSON regardless of streaming intent
        const errJson = await res.json().catch(() => ({} as { error?: string }))
        throw new Error(errJson.error || `HTTP ${res.status}`)
      }

      const ct = res.headers.get('content-type') ?? ''

      // ── Non-streaming path: server returned JSON (cache hit, NO TRADE, gates)
      if (!ct.includes('application/x-ndjson')) {
        const json = await res.json()
        const result = json as FMTraderResponse
        setAnalysis(result)
        setRefreshReady(false)
        startCountdown(result.generatedAt)
        return
      }

      // ── Streaming path: server sends 2 NDJSON chunks
      //     chunk 1 (~100ms): full preliminary result with _streaming='partial'
      //     chunk 2 (~5–15s): Claude overrides with _streaming='final'
      const reader = res.body?.getReader()
      if (!reader) throw new Error('Stream not readable')
      const decoder = new TextDecoder()
      let buf = ''
      let firstChunk = true
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          let parsed: Record<string, unknown>
          try { parsed = JSON.parse(line) } catch { continue }

          if (firstChunk) {
            // Chunk 1: full preliminary result — render card immediately,
            // drop loading=false, flag 'refining' so the UI knows Claude is still working
            const { _streaming, ...rest } = parsed as unknown as { _streaming?: string } & FMTraderResponse
            void _streaming
            const result = rest as FMTraderResponse
            setAnalysis(result)
            setRefreshReady(false)
            startCountdown(result.generatedAt)
            setLoading(false)
            setRefining(true)
            firstChunk = false
          } else {
            // Chunk 2: Claude overrides — merge into existing state
            const { _streaming: _s, ...overrides } = parsed as unknown as { _streaming?: string } & Partial<FMTraderResponse>
            void _s
            setAnalysis(prev => prev ? { ...prev, ...overrides } : prev)
            setRefining(false)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
      setRefining(false)
    }
  }, [data, startCountdown, horizon])

  function handleHorizonChange(next: 'intraday' | 'swing') {
    if (next === horizon || loading) return
    setHorizon(next)
    fetchAnalysis(slot, false, next)
  }

  // Auto-run on mount with detected slot
  useEffect(() => { fetchAnalysis(slot) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // ── Zone-hit detection: time-gated candle-close confirmation ─────────────
  // Phase 1 (touching): price enters zone → show "price in zone, waiting"
  // Phase 2 (confirmed): price stays in zone for 10+ min → "candle confirmed, entry valid"
  // This prevents triggering on wicks that immediately reverse.
  const CANDLE_CONFIRM_MS = 10 * 60 * 1000  // 10 minutes ≈ one 1H candle close
  useEffect(() => {
    if (!analysis || !currentPrice || analysis.decision === 'NO TRADE') {
      zoneEntryTime.current = null
      return
    }
    const [lo, hi] = analysis.entryZone
    const tolerance = (hi - lo) * 0.15
    const inZone = currentPrice >= lo - tolerance && currentPrice <= hi + tolerance

    if (inZone) {
      if (zoneEntryTime.current === null) {
        // Just entered the zone
        zoneEntryTime.current = Date.now()
        setZoneState('touching')
        setZoneHitDir(analysis.decision as 'BUY' | 'SELL')
      } else if (
        zoneState !== 'confirmed' &&
        Date.now() - zoneEntryTime.current >= CANDLE_CONFIRM_MS
      ) {
        // Has been in zone for 10+ min — treat as closed-candle confirmation
        setZoneState('confirmed')
      }
    } else {
      // Price left the zone — reset
      zoneEntryTime.current = null
      if (zoneState !== 'none') setZoneState('none')
    }
  }, [currentPrice, analysis, zoneState, CANDLE_CONFIRM_MS])

  const slotMeta = SESSION_SLOTS.find(s => s.id === slot) ?? SESSION_SLOTS[1]

  const handleSlotChange = (id: SessionSlotId) => {
    setSlot(id)
    setRefreshReady(false)
    fetchAnalysis(id)
  }

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative w-full sm:max-w-3xl h-[92svh] sm:h-auto sm:max-h-[94vh] flex flex-col bg-[#0b1120] border border-white/15 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Drag handle (mobile bottom-sheet) ──────────────────────────── */}
        <div
          className="flex justify-center pb-1 sm:hidden shrink-0"
          style={{ paddingTop: 'max(10px, env(safe-area-inset-top, 10px))' }}
        >
          <div className="w-9 h-1 rounded-full bg-white/20" />
        </div>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-white/10 bg-gradient-to-r from-[#0d1a2e] to-[#0b1120] shrink-0">
          {/* Left: logo + title */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#1D9E75] to-[#0f7a58] flex items-center justify-center shadow-lg shadow-[#1D9E75]/20 shrink-0">
              <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] sm:text-sm font-bold text-gray-400 tracking-tight">FM Trader</span>
                <span className="text-[9px] font-bold text-[#1D9E75] bg-[#1D9E75]/10 border border-[#1D9E75]/30 px-1.5 py-0.5 rounded-full uppercase tracking-wider">AI Pro</span>
              </div>
              <p className="text-sm sm:text-[11px] font-black sm:font-normal text-white sm:text-gray-500 truncate">
                {data.display}
                <span className="hidden sm:inline"> · {data.name} · {slotMeta.label} {slotMeta.name}</span>
              </p>
            </div>
          </div>

          {/* Right: action buttons — all uniform 32×32 on mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
            {/* Pair notification subscription — always visible, fires on every new BUY/SELL signal */}
            <button
              onClick={handlePairSubscribe}
              title={pairSubscribed
                ? `Unsubscribe from ${data.display} signals`
                : `Subscribe — get notified for every BUY/SELL signal on ${data.display}`}
              className={`w-8 h-8 sm:w-auto sm:h-auto flex items-center justify-center sm:gap-1.5 sm:px-3 sm:py-1.5 rounded-lg border transition ${
                pairSubscribed
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              {pairSubscribed
                ? <Bell className="w-4 h-4 sm:w-3 sm:h-3" />
                : <BellOff className="w-4 h-4 sm:w-3 sm:h-3" />}
              <span className="hidden sm:inline text-[11px]">
                {pairSubscribed ? 'Subscribed' : 'Subscribe'}
              </span>
            </button>
            {analysis && !loading && (
              <button
                onClick={() => refreshReady ? fetchAnalysis(slot, true) : undefined}
                disabled={!refreshReady}
                title={
                  refreshReady
                    ? 'Run fresh analysis with latest market data'
                    : countdown
                      ? `${countdown} into this hour`
                      : 'Re-analyse'
                }
                className={`w-8 h-8 sm:w-auto sm:h-auto flex items-center justify-center sm:gap-1.5 sm:px-3 sm:py-1.5 rounded-lg border transition ${
                  refreshReady
                    ? 'bg-[#1D9E75]/15 border-[#1D9E75]/40 text-emerald-300 hover:bg-[#1D9E75]/25 cursor-pointer'
                    : 'bg-white/3 border-white/5 text-gray-600 cursor-not-allowed'
                }`}
              >
                <RefreshCw className={`w-4 h-4 sm:w-3 sm:h-3 ${refreshReady ? '' : ''}`} />
                <span className="hidden sm:inline text-[11px]">
                  {refreshReady ? 'Re-analyse' : countdown}
                </span>
              </button>
            )}
            <button
              onClick={() => setShowHistory(h => !h)}
              title="Trade history & win rate"
              className={`w-8 h-8 flex items-center justify-center rounded-lg border transition ${
                showHistory
                  ? 'bg-[#1D9E75]/20 border-[#1D9E75]/40 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Trade horizon toggle (Intraday ↔ Swing) ────────────────────── */}
        {!showHistory && (
          <div className="shrink-0 pt-4 px-1">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
              <button
                onClick={() => handleHorizonChange('intraday')}
                disabled={loading}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  horizon === 'intraday'
                    ? 'bg-[#1D9E75] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                } disabled:opacity-50`}
              >
                Intraday
              </button>
              <button
                onClick={() => handleHorizonChange('swing')}
                disabled={loading}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  horizon === 'swing'
                    ? 'bg-[#1D9E75] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                } disabled:opacity-50`}
              >
                Swing
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
              {horizon === 'intraday'
                ? 'Intraday — 1H entry, 4H structure, valid for the current session hour.'
                : 'Swing — 4H entry, Daily structure, valid for up to 7 days. Session timing ignored.'}
            </p>
          </div>
        )}

        {/* ── Session picker (intraday only — swing ignores session) ────────── */}
        {!showHistory && horizon === 'intraday' && (
          <div className="shrink-0 pt-4">
            <SessionPicker selected={slot} onChange={handleSlotChange} category={data.category} />
          </div>
        )}

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── History view ──────────────────────────────────────────────── */}
          {showHistory && <TradeHistoryPanel isAdmin={isAdmin} />}

          {!showHistory && loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-[#1D9E75]/10 border border-[#1D9E75]/20 flex items-center justify-center">
                  <Brain className="w-7 h-7 text-[#1D9E75]" />
                </div>
                <Loader2 className="w-5 h-5 text-[#1D9E75] animate-spin absolute -top-1 -right-1" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white mb-1">
                  Predicting {data.display} for {slotMeta.label}…
                </p>
                <p className="text-[11px] text-gray-500">
                  Scanning 4 timeframes · EMA/RSI confluence · Hourly session · Key levels
                </p>
              </div>
              <div className="flex gap-1.5 flex-wrap justify-center">
                {['Weekly', 'Daily', '4H', '1H', slotMeta.name].map((label, i) => (
                  <span
                    key={label}
                    className="text-[10px] text-[#1D9E75] bg-[#1D9E75]/10 border border-[#1D9E75]/20 px-2 py-1 rounded-full font-medium animate-pulse"
                    style={{ animationDelay: `${i * 180}ms` }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!showHistory && error && !loading && (
            <div className="p-6">
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-300 mb-1">Analysis Failed</p>
                  <p className="text-xs text-red-400/80">{error}</p>
                  {error.toLowerCase().includes('api key') && (
                    <p className="text-[11px] text-gray-500 mt-2">
                      Add <code className="text-[#1D9E75]">ANTHROPIC_API_KEY</code> to <code className="text-gray-400">.env.local</code>.
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => fetchAnalysis(slot)}
                className="mt-4 w-full py-2.5 rounded-xl bg-[#1D9E75]/20 border border-[#1D9E75]/40 text-emerald-300 text-sm font-semibold hover:bg-[#1D9E75]/30 transition"
              >
                Try Again
              </button>
            </div>
          )}

          {/* ── Analysis result ─────────────────────────────────────────── */}
          {!showHistory && analysis && !loading && (
            <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">

              {/* ── Zone hit notification ──────────────────────────────────── */}
              {zoneState === 'confirmed' && zoneHitDir && (
                <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${
                  zoneHitDir === 'BUY'
                    ? 'bg-emerald-500/20 border-emerald-500/50'
                    : 'bg-red-500/20 border-red-500/50'
                }`}>
                  <Zap className={`w-4 h-4 shrink-0 mt-0.5 ${zoneHitDir === 'BUY' ? 'text-emerald-300' : 'text-red-300'}`} />
                  <div>
                    <p className={`text-sm font-bold ${zoneHitDir === 'BUY' ? 'text-emerald-200' : 'text-red-200'}`}>
                      Candle closed in zone — {zoneHitDir} entry confirmed
                    </p>
                    <p className="text-[11px] text-gray-300 mt-0.5">
                      {currentPrice !== undefined ? `Price (${fmt(currentPrice)}) ` : 'Price '}has held inside the entry zone for 10+ minutes (candle close confirmation). Entry is valid — manage per the thesis and risk rules.
                    </p>
                  </div>
                </div>
              )}
              {zoneState === 'touching' && zoneHitDir && (
                <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
                  zoneHitDir === 'BUY'
                    ? 'bg-emerald-500/8 border-emerald-500/25'
                    : 'bg-red-500/8 border-red-500/25'
                }`}>
                  <div className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${zoneHitDir === 'BUY' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <div>
                    <p className={`text-[11px] font-bold ${zoneHitDir === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                      Price touching entry zone — waiting for candle close ({fmt(analysis!.entryZone[0])}–{fmt(analysis!.entryZone[1])})
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Professionals wait for a full candle to close inside the zone before entering. Wicks that touch and reverse are common.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Stale signal warning ───────────────────────────────────── */}
              {Date.now() - analysis.generatedAt > STALE_WARN_AFTER && (
                <div className="flex items-center gap-3 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-amber-400/90 font-semibold">
                      Signal is {Math.round((Date.now() - analysis.generatedAt) / 60000)} min old — market may have moved
                    </p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      Cached for this hour. {countdown ? countdown + '.' : 'Click Re-analyse to get a fresh prediction.'}
                    </p>
                  </div>
                  {!countdown && (
                    <button
                      onClick={() => fetchAnalysis(slot)}
                      className="text-[11px] text-amber-400 hover:text-white font-semibold border border-amber-500/30 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/10 transition shrink-0"
                    >
                      Refresh
                    </button>
                  )}
                </div>
              )}

              {/* Session window badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                  <CalendarClock className="w-3.5 h-3.5 text-[#1D9E75]" />
                  <span className="text-xs font-bold text-white">{slotMeta.label}</span>
                  <span className="text-[11px] text-gray-400">{slotMeta.name}</span>
                  {isSlotActive(slot) && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Now
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-gray-600">{analysis.timeValidity}</span>
              </div>

              {/* ── HERO CARD: decision + grade + confidence + entry/SL/TPs/R:R ── */}
              <div className={`rounded-2xl p-5 border ${
                analysis.decision === 'BUY'  ? 'bg-emerald-500/[0.06] border-emerald-500/30' :
                analysis.decision === 'SELL' ? 'bg-red-500/[0.06] border-red-500/30'         :
                                               'bg-amber-500/[0.06] border-amber-500/30'
              }`}>
                {/* Top row: badge + grade + horizon + confidence */}
                <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <DecisionBadge decision={analysis.decision} />
                    {analysis.setupGrade && analysis.decision !== 'NO TRADE' && (
                      <span className={`text-[10px] font-black px-2 py-1 rounded-md border ${
                        analysis.setupGrade === 'A' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' :
                        analysis.setupGrade === 'B' ? 'bg-blue-500/15 text-blue-300 border-blue-500/40' :
                                                      'bg-amber-500/15 text-amber-300 border-amber-500/40'
                      }`}>
                        GRADE {analysis.setupGrade}
                      </span>
                    )}
                    {analysis.tradeHorizon === 'swing' && (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/40">SWING · 7d</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Confidence</div>
                    <div className={`text-2xl font-black tabular-nums ${
                      analysis.decision === 'BUY'  ? 'text-emerald-300' :
                      analysis.decision === 'SELL' ? 'text-red-300'     :
                                                     'text-amber-300'
                    }`}>{analysis.confidence}%</div>
                  </div>
                </div>

                {/* Levels (only when there's a trade) */}
                {analysis.decision !== 'NO TRADE' && (
                  <>
                    <div className="flex items-baseline justify-between gap-3 mb-3 pb-3 border-b border-white/10">
                      <div className="min-w-0">
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Entry Zone</div>
                        <div className="text-base font-black tabular-nums text-white truncate">
                          {fmt(analysis.entryZone[0], dec)} – {fmt(analysis.entryZone[1], dec)}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">R / R</div>
                        <div className="text-base font-black text-[#1D9E75]">{analysis.rrRatio}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'SL',  value: analysis.stopLoss, tone: 'red'   },
                        { label: 'TP1', value: analysis.tp1,      tone: 'green' },
                        { label: 'TP2', value: analysis.tp2,      tone: 'green' },
                        { label: 'TP3', value: analysis.tp3,      tone: 'green' },
                      ].map(lvl => (
                        <div key={lvl.label} className={`rounded-lg px-2 py-2 text-center border ${
                          lvl.tone === 'red'
                            ? 'bg-red-500/10 border-red-500/25'
                            : 'bg-emerald-500/10 border-emerald-500/25'
                        }`}>
                          <div className={`text-[9px] uppercase font-black tracking-wider mb-0.5 ${
                            lvl.tone === 'red' ? 'text-red-400' : 'text-emerald-400'
                          }`}>{lvl.label}</div>
                          <div className={`text-xs font-bold tabular-nums ${
                            lvl.tone === 'red' ? 'text-red-200' : 'text-emerald-200'
                          }`}>{fmt(lvl.value, dec)}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* ── Thesis (one-glance "why") ───────────────────────────── */}
              <div className="bg-[#131722]/60 border border-white/10 rounded-xl px-4 py-3">
                <p className="text-sm text-gray-200 leading-relaxed">{analysis.thesis}</p>
                {refining && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-emerald-300/80 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Refining analysis…
                  </p>
                )}
              </div>

              {/* Alert toast (subscription confirmation) */}
              {alertToast && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2.5">
                  <Bell className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <p className="text-xs text-emerald-300">{alertToast}</p>
                </div>
              )}

              {/* ⚡ In-zone alert banner — always visible (action-critical) */}
              {analysis.decision !== 'NO TRADE' &&
               data.price >= analysis.entryZone[0] &&
               data.price <= analysis.entryZone[1] && (
                <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/35 rounded-xl px-4 py-3">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <p className="text-sm font-bold text-amber-300 mb-0.5">Price is currently within the entry zone</p>
                    <p className="text-xs text-amber-400/80 leading-relaxed">
                      Current price is inside the {analysis.decision} zone ({fmt(analysis.entryZone[0], dec)} – {fmt(analysis.entryZone[1], dec)}).
                      Proceed with proper risk management — never risk more than 1–2% per trade.
                    </p>
                  </div>
                </div>
              )}

              {/* ── TABS ─────────────────────────────────────────────────── */}
              <div className="flex gap-1 p-1 bg-white/[0.04] border border-white/10 rounded-xl">
                {([
                  { id: 'trade',  label: 'Trade'  },
                  { id: 'why',    label: 'Why'    },
                  { id: 'risk',   label: `Risk${analysis.riskFactors?.length ? ` · ${analysis.riskFactors.length}` : ''}` },
                  { id: 'detail', label: 'Detail' },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setView(tab.id)}
                    className={`flex-1 py-2 px-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition ${
                      view === tab.id
                        ? 'bg-[#1D9E75] text-white shadow'
                        : 'text-gray-500 hover:text-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── TAB: Trade ──────────────────────────────────────────── */}
              {view === 'trade' && (
                <div className="space-y-4">
                  {analysis.decision !== 'NO TRADE' && (
                    <PositionSizer
                      decision={analysis.decision}
                      entryHigh={analysis.entryZone[1]}
                      entryLow={analysis.entryZone[0]}
                      stopLoss={analysis.stopLoss}
                      category={data.category}
                      slug={data.slug}
                      price={data.price}
                    />
                  )}
                  {isAdmin && analysis.decision !== 'NO TRADE' && (
                    <div className="flex items-center gap-3 bg-[#0f1e35] border border-blue-500/25 rounded-xl px-4 py-3">
                      <Wifi className="w-4 h-4 text-blue-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-blue-300">Broker Execution</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Risk % of account balance</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5">
                          <input
                            type="number" min="0.1" max="5" step="0.1"
                            value={riskPct}
                            onChange={e => setRiskPct(e.target.value)}
                            className="w-10 bg-transparent text-xs text-white text-right outline-none tabular-nums"
                          />
                          <span className="text-[10px] text-gray-500">%</span>
                        </div>
                        <button
                          onClick={() => { setBrokerModal(true); setBrokerTrade(null); setBrokerError('') }}
                          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/35 transition"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Send to Broker
                        </button>
                      </div>
                    </div>
                  )}
                  {analysis.decision === 'NO TRADE' && (
                    <div className="bg-[#131722] border border-white/10 rounded-xl p-6 text-center">
                      <Shield className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-300 font-medium">No trade to execute right now.</p>
                      <p className="text-xs text-gray-500 mt-1">Check the Why tab to understand why we&apos;re standing aside.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB: Why ────────────────────────────────────────────── */}
              {view === 'why' && (
                <div className="space-y-4">
                  {/* FM Trader note */}
                  <div className="bg-gradient-to-r from-[#1D9E75]/10 to-transparent border border-[#1D9E75]/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#1D9E75]/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Brain className="w-4 h-4 text-[#1D9E75]" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#1D9E75] uppercase tracking-wider mb-1">FM Trader says</p>
                        <p className="text-sm text-gray-300 leading-relaxed italic">&quot;{analysis.traderNote}&quot;</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#131722] border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[11px] font-bold text-white uppercase tracking-wider">Session Context</span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{analysis.sessionContext}</p>
                    </div>
                    <div className="bg-[#131722] border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-[11px] font-bold text-white uppercase tracking-wider">Market Bias</span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{analysis.marketBias}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: Risk ───────────────────────────────────────────── */}
              {view === 'risk' && (
                <div className="bg-[#131722] border border-amber-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">Risk Factors</span>
                  </div>
                  {analysis.riskFactors?.length ? (
                    <ul className="space-y-2">
                      {analysis.riskFactors.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                          <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-500">No elevated risk factors detected for this setup.</p>
                  )}
                </div>
              )}

              {/* ── TAB: Detail ─────────────────────────────────────────── */}
              {view === 'detail' && (
                <div className="space-y-4">
                  <div className="bg-[#131722] border border-white/10 rounded-xl p-4">
                    <p className="text-[11px] font-bold text-white uppercase tracking-wider mb-3">Timeframe Signals Used</p>
                    <div className="grid grid-cols-4 gap-2">
                      {data.timeframes.map(tf => {
                        const col =
                          tf.signal === 'STRONG BUY'  ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' :
                          tf.signal === 'BUY'         ? 'text-teal-300 bg-teal-500/10 border-teal-500/30'         :
                          tf.signal === 'STRONG SELL' ? 'text-red-300 bg-red-500/10 border-red-500/30'            :
                          tf.signal === 'SELL'        ? 'text-orange-300 bg-orange-500/10 border-orange-500/30'   :
                                                        'text-amber-300 bg-amber-500/10 border-amber-500/30'
                        return (
                          <div key={tf.key} className="text-center">
                            <p className="text-[9px] text-gray-600 uppercase tracking-wider mb-1 font-semibold">{tf.label}</p>
                            <div className={`text-[10px] font-bold px-1.5 py-1 rounded-lg border ${col}`}>{tf.signal}</div>
                            <p className="text-[9px] text-gray-600 mt-1">RSI {tf.rsi.toFixed(0)}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="bg-[#131722] border border-white/10 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setShowBreakdown(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition"
                    >
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[11px] font-bold text-white uppercase tracking-wider">Full Technical Breakdown</span>
                      </div>
                      {showBreakdown ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </button>
                    {showBreakdown && (
                      <div className="px-4 pb-4 border-t border-white/5 pt-3">
                        <Paragraphs text={analysis.technicalBreakdown} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Disclaimer + generated-at */}
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 px-4 py-3">
                <p className="text-[10px] text-amber-600/80 font-semibold text-center">
                  ⚠ Educational purposes only — not regulated financial advice
                </p>
                <p className="text-[10px] text-gray-600 text-center mt-1 leading-relaxed">
                  Always apply your own judgement and consult a regulated adviser before trading real capital.
                </p>
              </div>
              <div className="flex items-center justify-between text-[10px] text-gray-700 pb-1">
                <span>Generated {timeAgo(analysis.generatedAt)} · Cached 3 min per session</span>
                <span className="text-gray-700">Risk max 1–2% of capital per trade</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-t border-white/[0.07] bg-[#080e1a] shrink-0">
          <p className="text-[10px] text-gray-700 text-center leading-relaxed">
            FM Trader is an <strong className="text-gray-600">educational AI tool</strong>, not a regulated financial adviser. Signals do not constitute investment advice.
            Past performance does not guarantee future results. Trading involves substantial risk — never risk money you cannot afford to lose.
          </p>
        </div>

        {/* ── Broker Approval Modal ───────────────────────────────────────── */}
        {brokerModal && analysis && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-2xl"
            onClick={e => { if (e.target === e.currentTarget) setBrokerModal(false) }}
          >
            <div className="w-full max-w-sm mx-4 bg-[#0b1322] border border-blue-500/30 rounded-2xl shadow-2xl shadow-blue-900/20 overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#0d1929]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                    <Send className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">Broker Approval</p>
                    <p className="text-[10px] text-gray-500">Review before sending to Vantage MT4</p>
                  </div>
                </div>
                <button onClick={() => setBrokerModal(false)} className="text-gray-500 hover:text-white transition">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">

                {/* Trade summary */}
                <div className={`rounded-xl p-4 border ${
                  analysis.decision === 'BUY' ? 'bg-emerald-500/8 border-emerald-500/25' : 'bg-red-500/8 border-red-500/25'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {analysis.decision === 'BUY'
                        ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                        : <TrendingDown className="w-4 h-4 text-red-400" />
                      }
                      <span className={`text-base font-black ${analysis.decision === 'BUY' ? 'text-emerald-300' : 'text-red-300'}`}>
                        {analysis.decision} {data.display}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 font-semibold">{analysis.confidence}% conf</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {[
                      { label: 'Entry Zone', value: `${fmt(analysis.entryZone[0], dec)} – ${fmt(analysis.entryZone[1], dec)}` },
                      { label: 'Stop Loss',  value: fmt(analysis.stopLoss, dec), cls: 'text-red-400' },
                      { label: 'TP 1',       value: fmt(analysis.tp1, dec),      cls: 'text-emerald-300' },
                      { label: 'TP 2',       value: fmt(analysis.tp2, dec),      cls: 'text-emerald-300' },
                      { label: 'TP 3',       value: fmt(analysis.tp3, dec),      cls: 'text-emerald-300' },
                      { label: 'R/R',        value: analysis.rrRatio },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="text-gray-500">{row.label}</span>
                        <span className={`font-bold tabular-nums ${row.cls ?? 'text-white'}`}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lot size + risk info */}
                {brokerTrade ? (
                  <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Lot size</span>
                      <span className="font-black text-white tabular-nums">{brokerTrade.lotSize.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Risk</span>
                      <span className="font-bold text-white">{riskPct}% of account</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Approval window</span>
                      <span className={`font-black tabular-nums ${brokerCountdown === 'Expired' ? 'text-red-400' : 'text-amber-300'}`}>
                        {brokerCountdown}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Risk per trade</span>
                      <span className="font-bold text-white">{riskPct}% of account balance</span>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1.5 leading-relaxed">
                      Lot size is calculated from your live account balance on confirm.
                    </p>
                  </div>
                )}

                {/* Error */}
                {brokerError && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5">
                    <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <p className="text-xs text-red-300">{brokerError}</p>
                  </div>
                )}

                {/* Action buttons */}
                {!brokerTrade ? (
                  <button
                    onClick={sendToBroker}
                    disabled={brokerSending}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition"
                  >
                    {brokerSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {brokerSending ? 'Calculating…' : 'Confirm & Get Lot Size'}
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => executeBroker('reject')}
                      disabled={brokerSending || brokerCountdown === 'Expired'}
                      className="flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-sm bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/35 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {brokerSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Reject
                    </button>
                    <button
                      onClick={() => executeBroker('approve')}
                      disabled={brokerSending || brokerCountdown === 'Expired'}
                      className="flex items-center justify-center gap-1.5 py-3 rounded-xl font-bold text-sm bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/35 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {brokerSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                  </div>
                )}

                <p className="text-[10px] text-gray-700 text-center leading-relaxed">
                  Trade executes at market price via MetaApi → Vantage MT4/MT5.
                  Approval window expires 5 minutes after confirmation.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
