'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { ArrowLeft, Bitcoin, TrendingUp, TrendingDown, Plus, Edit3, X, CheckCircle2, Clock, RefreshCw, AlertTriangle, Wallet, ArrowDownToLine, ArrowUpFromLine, Copy } from 'lucide-react'

const BTC_RECEIVE_ADDRESS = 'bc1q3yzzgs6nflrfkz3uvmx30y8upvjlqwfud9ptya'

// Slug → Yahoo symbol map (mirrors SLUG_TO_SYMBOL in the server route — kept
// inline so the client can resolve live prices without importing server code).
const SLUG_TO_YF: Record<string, string> = {
  'eur-usd': 'EURUSD=X', 'gbp-usd': 'GBPUSD=X', 'usd-jpy': 'USDJPY=X', 'aud-usd': 'AUDUSD=X', 'usd-cad': 'USDCAD=X',
  'usd-chf': 'USDCHF=X', 'nzd-usd': 'NZDUSD=X', 'eur-gbp': 'EURGBP=X', 'gbp-jpy': 'GBPJPY=X', 'eur-jpy': 'EURJPY=X',
  'xau-usd': 'GC=F', 'xag-usd': 'SI=F', 'wti-usd': 'CL=F', 'copper': 'HG=F',
  'sp-500': 'ES=F', 'dj-30': 'YM=F', 'nas-100': 'NQ=F', 'us-dxy': 'DX-Y.NYB',
  'apple': 'AAPL', 'microsoft': 'MSFT', 'google': 'GOOGL', 'tesla': 'TSLA',
  'btc-usd': 'BTC-USD', 'eth-usd': 'ETH-USD', 'sol-usd': 'SOL-USD', 'xrp-usd': 'XRP-USD', 'bnb-usd': 'BNB-USD', 'doge-usd': 'DOGE-USD',
}

// ── Types ────────────────────────────────────────────────────────────────────

interface MyPosition {
  id: string
  amountBtc: number
  grossPnlBtc: number | null
  slippageBtc: number | null
  feeBtc: number | null
  pnlBtc: number | null
  status: 'open' | 'closed'
  openedAt: string
  closedAt: string | null
}

interface AdminPosition {
  id:          string
  amountBtc:   number
  grossPnlBtc: number | null
  slippageBtc: number | null
  feeBtc:      number | null
  pnlBtc:      number | null
  status:      'open' | 'closed'
  openedAt:    string
  closedAt:    string | null
  user:        { id: string; name: string | null; email: string }
}

interface LiveTrade {
  id:           string
  slug:         string
  display:      string
  decision:     'BUY' | 'SELL'
  entryLow:     number
  entryHigh:    number
  stopLoss:     number
  tp1:          number
  tp2:          number
  tp3:          number
  rrRatio:      string
  confidence:   number
  setupGrade:   string | null
  leverage:     number
  slippagePct:  number
  feePct:       number
  status:       'pending' | 'open' | 'closed' | 'cancelled'
  entryPrice:   number | null
  closePrice:   number | null
  pnlPct:       number | null
  note:         string | null
  suggestedAmountBtc: number | null
  createdAt:    string
  openedAt:     string | null
  closedAt:     string | null
  positions:    MyPosition[]            // current user's position only
  allPositions?: AdminPosition[]        // admin-only: every participant
  _count:       { positions: number }
}

interface Me {
  id: string
  name: string | null
  email: string
  role: 'admin' | 'team' | 'user'
  teamBalanceBtc: number
  btcWithdrawalAddress: string | null
}

interface Withdrawal {
  id: string
  userId: string
  amountBtc: number
  btcAddress: string
  status: 'pending' | 'completed' | 'rejected'
  note: string | null
  txHash: string | null
  createdAt: string
  processedAt: string | null
  user?: { id: string; name: string | null; email: string; teamBalanceBtc: number }
}

// ── Format helpers ───────────────────────────────────────────────────────────
const fmtBtc = (n: number | null | undefined) => {
  if (n == null || !isFinite(n)) return '—'
  if (Math.abs(n) >= 1)    return n.toFixed(4)
  if (Math.abs(n) >= 0.01) return n.toFixed(5)
  return n.toFixed(6)
}
const fmtPrice = (n: number | null | undefined) => {
  if (n == null || !isFinite(n)) return '—'
  if (Math.abs(n) >= 100) return n.toFixed(2)
  if (Math.abs(n) >= 1)   return n.toFixed(4)
  return n.toFixed(5)
}
const fmtPct = (n: number | null | undefined) => {
  if (n == null || !isFinite(n)) return '—'
  const v = n * 100
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}
const timeAgo = (iso: string) => {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60_000)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LiveTradesClient({ isAdmin }: { isAdmin: boolean }) {
  const [me,         setMe]         = useState<Me | null>(null)
  const [trades,     setTrades]     = useState<LiveTrade[]>([])
  const [loading,    setLoading]    = useState(true)
  // Live prices per slug — refreshed every 60s while there are open trades
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})
  const [err,        setErr]        = useState<string | null>(null)
  const [view,       setView]       = useState<'open' | 'mine' | 'history' | 'admin' | 'withdrawals'>(() => {
    // Allow deep-linking via ?tab=withdrawals (used by admin alerts on withdrawal events)
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search)
      const tab = sp.get('tab')
      if (tab === 'mine' || tab === 'history' || tab === 'admin' || tab === 'withdrawals') return tab
    }
    return 'open'
  })

  // Open-position modal (team action)
  const [posModal,   setPosModal]   = useState<{ trade: LiveTrade } | null>(null)
  const [posAmount,  setPosAmount]  = useState('')
  const [posBusy,    setPosBusy]    = useState(false)
  const [posErr,     setPosErr]     = useState<string | null>(null)

  // Admin: edit trade modal (set entry / close / cancel)
  const [editModal,  setEditModal]  = useState<{ trade: LiveTrade; action: 'entry' | 'close' | 'stopLoss' } | null>(null)
  const [editPrice,  setEditPrice]  = useState('')
  const [editBusy,   setEditBusy]   = useState(false)
  const [editErr,    setEditErr]    = useState<string | null>(null)

  // Admin: new trade modal
  // Deposit / Withdraw modals
  const [depositOpen, setDepositOpen] = useState(false)
  const [copyToast,   setCopyToast]   = useState(false)
  const [depNotifyAmount, setDepNotifyAmount] = useState('')
  const [depNotifyTx,     setDepNotifyTx]     = useState('')
  const [depNotifyBusy,   setDepNotifyBusy]   = useState(false)
  const [depNotifyOk,     setDepNotifyOk]     = useState(false)
  const [wdOpen,      setWdOpen]      = useState(false)
  const [wdAmount,    setWdAmount]    = useState('')
  const [wdAddress,   setWdAddress]   = useState('')
  const [wdBusy,      setWdBusy]      = useState(false)
  const [wdErr,       setWdErr]       = useState<string | null>(null)

  // My withdrawal history (team) + admin's view of all withdrawals
  const [myWithdrawals,    setMyWithdrawals]    = useState<Withdrawal[]>([])
  const [adminWithdrawals, setAdminWithdrawals] = useState<Withdrawal[]>([])

  const [newModal,   setNewModal]   = useState(false)
  const [newBusy,    setNewBusy]    = useState(false)
  const [newErr,     setNewErr]     = useState<string | null>(null)
  const [newForm,    setNewForm]    = useState({
    slug: '', display: '', decision: 'BUY' as 'BUY' | 'SELL',
    entryLow: '', entryHigh: '', stopLoss: '',
    tp1: '', tp2: '', tp3: '',
    confidence: '70', setupGrade: 'B', note: '',
    suggestedAmountBtc: '',
    leverage: 300 as 20 | 50 | 100 | 300 | 500,
  })

  // ── Load data ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setErr(null)
    try {
      const [tradesRes, wdRes, adminWdRes] = await Promise.all([
        fetch('/api/live-trades'),
        fetch('/api/withdrawals').catch(() => null),
        isAdmin ? fetch('/api/admin/withdrawals').catch(() => null) : Promise.resolve(null),
      ])
      if (!tradesRes.ok) throw new Error((await tradesRes.json().catch(() => ({}))).error ?? `HTTP ${tradesRes.status}`)
      const data = await tradesRes.json() as { me: Me; trades: LiveTrade[] }
      setMe(data.me)
      setTrades(data.trades ?? [])
      if (wdRes?.ok)      setMyWithdrawals(await wdRes.json())
      if (adminWdRes?.ok) setAdminWithdrawals(await adminWdRes.json())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => { load() }, [load])

  // Polling — refresh every 60s so status changes (close, entry) appear without manual reload
  useEffect(() => {
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [load])

  // Live-price polling — every 60s while there are 'open' trades (status === 'open'
  // = entry set, settling pending). Pulls /api/market-data/live which returns
  // every tracked instrument in one call. We extract only the slugs we need.
  useEffect(() => {
    const inSession = trades.filter(t => t.status === 'open')
    if (inSession.length === 0) {
      setLivePrices({})
      return
    }

    let cancelled = false
    async function fetchLive() {
      try {
        const r = await fetch('/api/market-data/live')
        if (!r.ok || cancelled) return
        const data = await r.json() as { prices: Record<string, { price: number }> }
        const next: Record<string, number> = {}
        for (const t of inSession) {
          const sym = SLUG_TO_YF[t.slug]
          const p = sym ? data.prices?.[sym]?.price : undefined
          if (typeof p === 'number' && p > 0) next[t.slug] = p
        }
        if (!cancelled) setLivePrices(next)
      } catch { /* silent — stale prices are better than crashes */ }
    }
    fetchLive()
    const t = setInterval(fetchLive, 60_000)
    return () => { cancelled = true; clearInterval(t) }
  }, [trades])

  // ── Categorised trades ────────────────────────────────────────────────────
  const openTrades   = useMemo(() => trades.filter(t => t.status === 'pending' || t.status === 'open'), [trades])
  const myPositions  = useMemo(() => trades.filter(t => t.positions.some(p => p.status === 'open')), [trades])
  const historyList  = useMemo(() => trades.filter(t => t.status === 'closed' || t.status === 'cancelled'), [trades])

  // ── Aggregate stats (for hero) ─────────────────────────────────────────────
  const myOpenStake = useMemo(
    () => myPositions.reduce((s, t) => s + t.positions.filter(p => p.status === 'open').reduce((a, p) => a + p.amountBtc, 0), 0),
    [myPositions],
  )
  const lifetimePnl = useMemo(
    () => trades.reduce((s, t) => s + t.positions.reduce((a, p) => a + (p.pnlBtc ?? 0), 0), 0),
    [trades],
  )

  // ── Open-position action ──────────────────────────────────────────────────
  async function openPosition() {
    if (!posModal) return
    const amt = Number(posAmount)
    if (!isFinite(amt) || amt <= 0) { setPosErr('Enter a positive BTC amount'); return }
    if (me && amt > me.teamBalanceBtc) { setPosErr('Insufficient balance'); return }
    setPosBusy(true); setPosErr(null)
    try {
      const res = await fetch(`/api/live-trades/${posModal.trade.id}/positions`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ amountBtc: amt }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`)
      setPosModal(null); setPosAmount(''); setPosErr(null)
      await load()
    } catch (e) {
      setPosErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setPosBusy(false)
    }
  }

  // ── Withdraw (team) ───────────────────────────────────────────────────────
  async function submitWithdraw() {
    const amt = Number(wdAmount)
    if (!isFinite(amt) || amt <= 0) { setWdErr('Enter a positive amount'); return }
    if (!wdAddress.trim())            { setWdErr('Destination address required'); return }
    if (me && amt > me.teamBalanceBtc){ setWdErr('Insufficient balance'); return }
    setWdBusy(true); setWdErr(null)
    try {
      const r = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountBtc: amt, btcAddress: wdAddress.trim() }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`)
      setWdOpen(false); setWdAmount(''); setWdAddress('')
      await load()
    } catch (e) {
      setWdErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setWdBusy(false)
    }
  }

  // ── Admin: process withdrawal (complete or reject) ────────────────────────
  async function processWithdrawal(id: string, action: 'complete' | 'reject') {
    const promptText = action === 'reject' ? 'Reason for rejection (optional)' : 'BTC transaction hash (optional)'
    const note = prompt(promptText) ?? undefined
    const body = action === 'complete' ? { action, txHash: note } : { action, note }
    const r = await fetch(`/api/admin/withdrawals/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    if (r.ok) await load()
    else alert((await r.json().catch(() => ({}))).error ?? 'Failed')
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(BTC_RECEIVE_ADDRESS)
      setCopyToast(true)
      setTimeout(() => setCopyToast(false), 1800)
    } catch { /* clipboard unavailable */ }
  }

  async function notifyDepositSent() {
    setDepNotifyBusy(true)
    try {
      const amt = Number(depNotifyAmount)
      await fetch('/api/deposits/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountBtc: Number.isFinite(amt) && amt > 0 ? amt : undefined,
          txHash:    depNotifyTx.trim() || undefined,
        }),
      })
      setDepNotifyOk(true)
      setDepNotifyAmount('')
      setDepNotifyTx('')
      setTimeout(() => setDepNotifyOk(false), 4000)
    } catch { /* swallow — admin will see it via on-chain anyway */ }
    finally { setDepNotifyBusy(false) }
  }

  // ── Admin: set entry / close / cancel ─────────────────────────────────────
  async function submitEdit() {
    if (!editModal) return
    const p = Number(editPrice)
    if (!isFinite(p) || p <= 0) { setEditErr('Price must be a positive number'); return }
    setEditBusy(true); setEditErr(null)
    try {
      const body = editModal.action === 'entry'    ? { entryPrice: p }
                 : editModal.action === 'stopLoss' ? { stopLoss:   p }
                                                    : { closePrice: p }
      const res = await fetch(`/api/admin/live-trades/${editModal.trade.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`)
      setEditModal(null); setEditPrice(''); setEditErr(null)
      await load()
    } catch (e) {
      setEditErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setEditBusy(false)
    }
  }
  async function cancelTrade(id: string) {
    if (!confirm('Cancel this trade and refund all open positions at face value?')) return
    const res = await fetch(`/api/admin/live-trades/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ cancel: true }),
    })
    if (res.ok) await load()
    else alert((await res.json().catch(() => ({}))).error ?? 'Cancel failed')
  }

  // ── Admin: create trade ───────────────────────────────────────────────────
  async function createTrade() {
    setNewBusy(true); setNewErr(null)
    try {
      const num = (s: string) => { const v = Number(s); return isFinite(v) ? v : NaN }
      const f = newForm
      const required = [num(f.entryLow), num(f.entryHigh), num(f.stopLoss), num(f.tp1), num(f.tp2), num(f.tp3), num(f.confidence)]
      if (required.some(n => !isFinite(n))) { setNewErr('All numeric fields are required'); return }
      const risk = f.decision === 'BUY' ? num(f.entryHigh) - num(f.stopLoss) : num(f.stopLoss) - num(f.entryLow)
      const reward = f.decision === 'BUY' ? num(f.tp2) - num(f.entryHigh) : num(f.entryLow) - num(f.tp2)
      const rrRatio = risk > 0 ? `1:${(Math.abs(reward) / risk).toFixed(1)}` : '—'

      const suggested = num(f.suggestedAmountBtc)
      const res = await fetch('/api/admin/live-trades', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug:       f.slug.trim().toLowerCase(),
          display:    f.display.trim(),
          decision:   f.decision,
          entryLow:   num(f.entryLow),
          entryHigh:  num(f.entryHigh),
          stopLoss:   num(f.stopLoss),
          tp1:        num(f.tp1),
          tp2:        num(f.tp2),
          tp3:        num(f.tp3),
          rrRatio,
          confidence: num(f.confidence),
          setupGrade: f.setupGrade || undefined,
          note:       f.note.trim() || undefined,
          suggestedAmountBtc: Number.isFinite(suggested) && suggested > 0 ? suggested : undefined,
          leverage:           f.leverage,
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`)
      setNewModal(false)
      setNewForm({ slug: '', display: '', decision: 'BUY', entryLow: '', entryHigh: '', stopLoss: '', tp1: '', tp2: '', tp3: '', confidence: '70', setupGrade: 'B', note: '', suggestedAmountBtc: '', leverage: 300 })
      await load()
    } catch (e) {
      setNewErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setNewBusy(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080e1a]">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/analysis" className="text-gray-400 hover:text-white transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white">Live Trade</h1>
              <p className="text-xs text-gray-500">Admin-approved trades · BTC-denominated fund</p>
            </div>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* Hero balance */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.08] to-transparent p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Team Fund Balance</span>
              </div>
              <div className="flex items-baseline gap-2">
                <Bitcoin className="w-7 h-7 text-amber-400" />
                <span className="text-3xl sm:text-4xl font-black text-white tabular-nums">{fmtBtc(me?.teamBalanceBtc ?? 0)}</span>
                <span className="text-base font-bold text-gray-500">BTC</span>
              </div>
              <p className="mt-1.5 text-[11px] text-gray-500">{me?.email}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 min-w-[200px]">
              <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-0.5">Open Stake</div>
                <div className="text-sm font-bold tabular-nums text-white">{fmtBtc(myOpenStake)}<span className="ml-1 text-[10px] text-gray-500">BTC</span></div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-0.5">Lifetime P/L</div>
                <div className={`text-sm font-bold tabular-nums ${lifetimePnl > 0 ? 'text-emerald-300' : lifetimePnl < 0 ? 'text-red-300' : 'text-white'}`}>
                  {lifetimePnl >= 0 ? '+' : ''}{fmtBtc(lifetimePnl)}<span className="ml-1 text-[10px] text-gray-500">BTC</span>
                </div>
              </div>
            </div>
          </div>
          {/* Deposit / Withdraw actions */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
            <button
              onClick={() => setDepositOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-600/30 transition"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Deposit BTC
            </button>
            <button
              onClick={() => { setWdErr(null); setWdAmount(''); setWdAddress(me?.btcWithdrawalAddress ?? ''); setWdOpen(true) }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-bold hover:bg-blue-600/30 transition"
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              Withdraw
            </button>
          </div>
          {myWithdrawals.some(w => w.status === 'pending') && (
            <p className="mt-2 text-[10px] text-amber-300/80 text-center">
              {myWithdrawals.filter(w => w.status === 'pending').length} withdrawal{myWithdrawals.filter(w => w.status === 'pending').length === 1 ? '' : 's'} awaiting admin approval
            </p>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 bg-white/[0.04] border border-white/10 rounded-xl overflow-x-auto">
          {([
            { id: 'open',    label: `Open Trades${openTrades.length ? ` · ${openTrades.length}` : ''}` },
            { id: 'mine',    label: `My Positions${myPositions.length ? ` · ${myPositions.length}` : ''}` },
            { id: 'history', label: 'History' },
            ...(isAdmin
              ? [
                  { id: 'admin'       as const, label: 'Manage' },
                  { id: 'withdrawals' as const, label: `Withdrawals${adminWithdrawals.filter(w => w.status === 'pending').length ? ` · ${adminWithdrawals.filter(w => w.status === 'pending').length}` : ''}` },
                ]
              : []),
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`shrink-0 py-2 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition ${
                view === t.id
                  ? 'bg-[#1D9E75] text-white shadow'
                  : 'text-gray-500 hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Error / loading */}
        {err && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" /> {err}
          </div>
        )}
        {loading && !trades.length && (
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-12 text-center text-sm text-gray-500">Loading…</div>
        )}

        {/* TAB: Open Trades */}
        {view === 'open' && !loading && (
          <div className="space-y-3">
            {openTrades.length === 0 && (
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-10 text-center text-sm text-gray-500">
                No open trades right now. Check back later or look at history.
              </div>
            )}
            {openTrades.map(t => (
              <TradeCard
                key={t.id}
                trade={t}
                isAdmin={isAdmin}
                myBalance={me?.teamBalanceBtc ?? 0} livePrice={livePrices[t.slug] ?? null}
                onJoin={() => { setPosErr(null); setPosAmount(t.suggestedAmountBtc ? String(t.suggestedAmountBtc) : ''); setPosModal({ trade: t }) }}
                onSetEntry={() => { setEditErr(null); setEditPrice(''); setEditModal({ trade: t, action: 'entry' }) }}
                onSetClose={() => { setEditErr(null); setEditPrice(''); setEditModal({ trade: t, action: 'close' }) }}
                onSetSL={() => { setEditErr(null); setEditPrice(String(t.stopLoss)); setEditModal({ trade: t, action: 'stopLoss' }) }}
                onCancel={() => cancelTrade(t.id)}
              />
            ))}
          </div>
        )}

        {/* TAB: My Positions */}
        {view === 'mine' && !loading && (
          <div className="space-y-3">
            {myPositions.length === 0 && (
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-10 text-center text-sm text-gray-500">
                You have no open positions. Join an Open Trade to start.
              </div>
            )}
            {myPositions.map(t => (
              <TradeCard key={t.id} trade={t} isAdmin={isAdmin} myBalance={me?.teamBalanceBtc ?? 0} livePrice={livePrices[t.slug] ?? null}
                onJoin={() => null} showJoin={false}
                onSetEntry={() => { setEditErr(null); setEditPrice(''); setEditModal({ trade: t, action: 'entry' }) }}
                onSetClose={() => { setEditErr(null); setEditPrice(''); setEditModal({ trade: t, action: 'close' }) }}
                onSetSL={() => { setEditErr(null); setEditPrice(String(t.stopLoss)); setEditModal({ trade: t, action: 'stopLoss' }) }}
                onCancel={() => cancelTrade(t.id)}
              />
            ))}
          </div>
        )}

        {/* TAB: History */}
        {view === 'history' && !loading && (
          <div className="space-y-3">
            {historyList.length === 0 && (
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-10 text-center text-sm text-gray-500">
                No closed trades yet.
              </div>
            )}
            {historyList.map(t => (
              <TradeCard key={t.id} trade={t} isAdmin={isAdmin} myBalance={me?.teamBalanceBtc ?? 0} livePrice={livePrices[t.slug] ?? null}
                onJoin={() => null} showJoin={false}
                onSetEntry={() => null} onSetClose={() => null} onSetSL={() => null} onCancel={() => null} hideAdminActions
              />
            ))}
          </div>
        )}

        {/* TAB: Admin Manage */}
        {view === 'admin' && isAdmin && !loading && (
          <div className="space-y-3">
            <button
              onClick={() => { setNewErr(null); setNewModal(true) }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1D9E75] hover:bg-[#22b585] text-white text-sm font-bold transition"
            >
              <Plus className="w-4 h-4" />
              New Live Trade
            </button>
            <p className="text-[11px] text-gray-500">
              Pending and open trades let you set the entry / close price. Closed trades auto-settle and credit team users' BTC balances.
            </p>
            <div className="space-y-3">
              {trades.map(t => (
                <TradeCard key={t.id} trade={t} isAdmin
                  myBalance={me?.teamBalanceBtc ?? 0} livePrice={livePrices[t.slug] ?? null}
                  onJoin={() => { setPosErr(null); setPosAmount(''); setPosModal({ trade: t }) }}
                  showJoin={false}
                  onSetEntry={() => { setEditErr(null); setEditPrice(''); setEditModal({ trade: t, action: 'entry' }) }}
                  onSetClose={() => { setEditErr(null); setEditPrice(''); setEditModal({ trade: t, action: 'close' }) }}
                  onSetSL={() => { setEditErr(null); setEditPrice(String(t.stopLoss)); setEditModal({ trade: t, action: 'stopLoss' }) }}
                  onCancel={() => cancelTrade(t.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB: Admin Withdrawals */}
        {view === 'withdrawals' && isAdmin && !loading && (
          <div className="space-y-3">
            <p className="text-[11px] text-gray-500">
              Approve withdrawals after sending BTC manually. Reject to refund the user&apos;s balance.
            </p>
            {adminWithdrawals.length === 0 && (
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-10 text-center text-sm text-gray-500">
                No withdrawal requests yet.
              </div>
            )}
            {adminWithdrawals.map(w => {
              const statusCfg = w.status === 'pending'   ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                              : w.status === 'completed' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                                                          : 'bg-red-500/15 text-red-300 border-red-500/40'
              return (
                <div key={w.id} className="rounded-2xl border border-white/10 bg-[#131722] p-4">
                  <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{w.user?.name ?? w.user?.email ?? 'Unknown'}</div>
                      {w.user?.name && <div className="text-[11px] text-gray-500 truncate">{w.user.email}</div>}
                      <div className="text-[11px] text-gray-500 mt-1">Current balance: <span className="text-white tabular-nums">{fmtBtc(w.user?.teamBalanceBtc ?? 0)} BTC</span></div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${statusCfg}`}>{w.status}</span>
                      <div className="text-[10px] text-gray-500 mt-1">{timeAgo(w.createdAt)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-white/5 rounded-lg px-3 py-2">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-0.5">Amount</div>
                      <div className="text-sm font-bold tabular-nums text-amber-300">{fmtBtc(w.amountBtc)} BTC</div>
                    </div>
                    <div className="bg-white/5 rounded-lg px-3 py-2 min-w-0">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-0.5">Destination</div>
                      <div className="text-[11px] font-mono text-white truncate" title={w.btcAddress}>{w.btcAddress}</div>
                    </div>
                  </div>
                  {w.note && <p className="text-[11px] text-gray-400 italic mb-3">&quot;{w.note}&quot;</p>}
                  {w.txHash && (
                    <p className="text-[10px] text-emerald-400 mb-3 font-mono break-all">tx: {w.txHash}</p>
                  )}
                  {w.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => processWithdrawal(w.id, 'complete')}
                        className="flex-1 text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600/25 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/40 transition">
                        Mark as Paid
                      </button>
                      <button onClick={() => processWithdrawal(w.id, 'reject')}
                        className="flex-1 text-xs font-bold px-3 py-2 rounded-lg bg-red-600/20 text-red-300 border border-red-500/40 hover:bg-red-600/35 transition">
                        Reject & Refund
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* My withdrawal history — visible on Mine + History tabs for team users */}
        {(view === 'mine' || view === 'history') && !loading && myWithdrawals.length > 0 && (
          <div className="bg-[#131722] border border-white/10 rounded-xl p-4">
            <p className="text-[11px] font-bold text-white uppercase tracking-wider mb-3">Withdrawal Requests · {myWithdrawals.length}</p>
            <div className="space-y-2">
              {myWithdrawals.map(w => (
                <div key={w.id} className="flex items-center justify-between text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="text-gray-200 tabular-nums">{fmtBtc(w.amountBtc)} BTC</div>
                    <div className="text-[10px] text-gray-500 truncate font-mono">{w.btcAddress}</div>
                    {w.note && <div className="text-[10px] text-gray-500 italic mt-0.5">{w.note}</div>}
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                    w.status === 'pending'   ? 'bg-amber-500/15 text-amber-300 border-amber-500/40' :
                    w.status === 'completed' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' :
                                               'bg-red-500/15 text-red-300 border-red-500/40'
                  }`}>{w.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Modal: Deposit BTC (info only) ────────────────────────────────── */}
      {depositOpen && (
        <Modal title="Deposit BTC to your team balance" onClose={() => setDepositOpen(false)}>
          <div className="space-y-4">
            <div className="rounded-xl bg-red-500/10 border border-red-500/35 px-4 py-3 text-xs text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold mb-1">BITCOIN (BTC) ONLY — Bitcoin Mainnet</p>
                <p className="text-red-300/80 leading-relaxed">
                  Send only BTC on the Bitcoin network to this address. Any other coin or token (ETH, USDT, BTC on a different chain, etc.) will be <strong>permanently lost</strong>. Admin will credit your team balance after the deposit confirms on-chain (~1 confirmation).
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 flex flex-col items-center">
              {/* QR generated from the address — deterministic, no upload needed */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(BTC_RECEIVE_ADDRESS)}&margin=8&qzone=1`}
                alt="BTC deposit address QR"
                width={240} height={240}
                className="rounded-lg bg-white p-2"
              />
              <p className="mt-3 text-[10px] uppercase font-bold tracking-wider text-gray-500">Receive Address</p>
              <p className="mt-1 text-xs font-mono text-white text-center break-all px-2">{BTC_RECEIVE_ADDRESS}</p>
              <button
                onClick={copyAddress}
                className="mt-3 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition"
              >
                <Copy className="w-3 h-3" />
                {copyToast ? 'Copied!' : 'Copy address'}
              </button>
            </div>

            <ol className="text-[11px] text-gray-400 space-y-1.5 leading-relaxed list-decimal pl-4">
              <li>Open your BTC wallet and send any amount to the address above.</li>
              <li>Wait for the transaction to confirm on-chain (usually 10–30 min).</li>
              <li>Tap <strong>&quot;I&apos;ve sent it&quot;</strong> below so admin gets a Telegram alert immediately. Your balance will be credited after on-chain confirmation.</li>
            </ol>

            {/* Notify admin block */}
            <div className="rounded-xl bg-blue-500/[0.06] border border-blue-500/25 p-3 space-y-2">
              <p className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">Already sent? Let admin know</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number" step="0.0001" min="0"
                  value={depNotifyAmount}
                  onChange={e => setDepNotifyAmount(e.target.value)}
                  placeholder="Amount (BTC)"
                  className="bg-[#0b1322] border border-white/15 rounded-lg px-2 py-1.5 text-white text-xs tabular-nums outline-none focus:border-blue-500/60"
                />
                <input
                  type="text"
                  value={depNotifyTx}
                  onChange={e => setDepNotifyTx(e.target.value)}
                  placeholder="Tx hash (optional)"
                  className="bg-[#0b1322] border border-white/15 rounded-lg px-2 py-1.5 text-white text-[10px] font-mono outline-none focus:border-blue-500/60"
                />
              </div>
              <button
                onClick={notifyDepositSent}
                disabled={depNotifyBusy}
                className="w-full flex items-center justify-center gap-1.5 bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600/35 disabled:opacity-50 text-blue-300 py-2 rounded-lg text-xs font-bold transition"
              >
                {depNotifyOk ? <><CheckCircle2 className="w-3.5 h-3.5" /> Admin notified</> : depNotifyBusy ? 'Sending…' : "I've sent it — notify admin"}
              </button>
            </div>

            <button onClick={() => setDepositOpen(false)} className="w-full bg-white/5 text-gray-300 hover:text-white py-2.5 rounded-xl text-sm font-bold transition">
              Done
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Withdraw BTC ────────────────────────────────────────────── */}
      {wdOpen && (
        <Modal title="Withdraw BTC" onClose={() => setWdOpen(false)}>
          <div className="space-y-3">
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/35 px-4 py-3 text-xs text-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-amber-300/90 leading-relaxed">
                Enter a <strong>Bitcoin (BTC) mainnet</strong> address. Withdrawals to wrong networks or non-BTC addresses are unrecoverable. Admin reviews and pays manually — expect up to 24 h.
              </p>
            </div>
            <div className="text-xs text-gray-400">
              Available balance: <span className="font-bold text-amber-300 tabular-nums">{fmtBtc(me?.teamBalanceBtc ?? 0)} BTC</span>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Amount (BTC)</label>
              <input
                type="number" step="0.0001" min="0.0001"
                value={wdAmount}
                onChange={e => setWdAmount(e.target.value)}
                placeholder="0.0100"
                className="w-full bg-[#0b1322] border border-white/15 rounded-lg px-3 py-2.5 text-white text-sm tabular-nums outline-none focus:border-blue-500/60"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Your BTC Receive Address
                {me?.btcWithdrawalAddress && me.btcWithdrawalAddress === wdAddress && (
                  <span className="ml-2 normal-case text-emerald-400">· saved</span>
                )}
              </label>
              <input
                type="text"
                value={wdAddress}
                onChange={e => setWdAddress(e.target.value)}
                placeholder="bc1q..."
                className="w-full bg-[#0b1322] border border-white/15 rounded-lg px-3 py-2.5 text-white text-xs font-mono outline-none focus:border-blue-500/60"
              />
              <p className="mt-1 text-[10px] text-gray-500">
                Double-check this — funds sent to the wrong address are unrecoverable.{' '}
                {me?.btcWithdrawalAddress
                  ? 'We saved this from your last withdrawal — edit it any time and the new one will be remembered.'
                  : 'We&apos;ll remember this address for next time.'}
              </p>
            </div>
            {wdErr && <p className="text-xs text-red-400">{wdErr}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={submitWithdraw} disabled={wdBusy}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-bold transition">
                {wdBusy ? 'Submitting…' : 'Submit Withdrawal'}
              </button>
              <button onClick={() => setWdOpen(false)} className="px-4 py-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white text-sm transition">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Open position (team) ───────────────────────────────────── */}
      {posModal && (
        <Modal title={`Open position — ${posModal.trade.decision} ${posModal.trade.display}`} onClose={() => setPosModal(null)}>
          <div className="space-y-3">
            <div className="text-xs text-gray-400">
              Entry zone: <span className="font-bold text-white">{fmtPrice(posModal.trade.entryLow)} – {fmtPrice(posModal.trade.entryHigh)}</span>
              {posModal.trade.entryPrice && <> · Filled at <span className="font-bold text-white">{fmtPrice(posModal.trade.entryPrice)}</span></>}
            </div>
            <div className="text-xs text-gray-400">
              Available balance: <span className="font-bold text-amber-300 tabular-nums">{fmtBtc(me?.teamBalanceBtc ?? 0)} BTC</span>
            </div>
            <div className="rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2 text-[10px] text-gray-500 grid grid-cols-3 gap-2">
              <div>Leverage <span className="text-amber-300 font-bold tabular-nums">1:{posModal.trade.leverage}</span></div>
              <div>Slippage <span className="text-gray-300 font-bold tabular-nums">{(posModal.trade.slippagePct * 100).toFixed(2)}%</span></div>
              <div>Perf fee <span className="text-gray-300 font-bold tabular-nums">{(posModal.trade.feePct * 100).toFixed(0)}%</span> <span className="text-[9px] text-gray-600">(profits only)</span></div>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Amount to stake (BTC)
                {posModal.trade.suggestedAmountBtc && (
                  <span className="ml-2 normal-case text-amber-400">· Suggested {fmtBtc(posModal.trade.suggestedAmountBtc)}</span>
                )}
              </label>
              <input
                type="number" step="0.0001" min="0"
                autoFocus
                value={posAmount}
                onChange={e => setPosAmount(e.target.value)}
                placeholder={posModal.trade.suggestedAmountBtc ? String(posModal.trade.suggestedAmountBtc) : '0.0500'}
                className="w-full bg-[#0b1322] border border-white/15 rounded-lg px-3 py-2.5 text-white text-sm tabular-nums outline-none focus:border-amber-500/60"
              />
            </div>
            {posErr && <p className="text-xs text-red-400">{posErr}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={openPosition} disabled={posBusy}
                className="flex-1 bg-[#1D9E75] hover:bg-[#22b585] disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-bold transition"
              >
                {posBusy ? 'Opening…' : `Open ${posModal.trade.decision} Position`}
              </button>
              <button onClick={() => setPosModal(null)} className="px-4 py-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white text-sm transition">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Admin set entry / close ────────────────────────────────── */}
      {editModal && (
        <Modal
          title={
            editModal.action === 'entry'    ? `Set entry price — ${editModal.trade.decision} ${editModal.trade.display}`
            : editModal.action === 'stopLoss' ? `Move stop loss — ${editModal.trade.decision} ${editModal.trade.display}`
            :                                   `Set close price — ${editModal.trade.decision} ${editModal.trade.display}`
          }
          onClose={() => setEditModal(null)}
        >
          <div className="space-y-3">
            {editModal.action === 'close' && editModal.trade.entryPrice && (
              <div className="text-xs text-gray-400">
                Entry was <span className="font-bold text-white">{fmtPrice(editModal.trade.entryPrice)}</span> ·
                {editModal.trade._count.positions} position{editModal.trade._count.positions === 1 ? '' : 's'} will settle when you submit.
              </div>
            )}
            {editModal.action === 'stopLoss' && (
              <div className="text-xs text-gray-400">
                Current stop loss: <span className="font-bold text-red-300">{fmtPrice(editModal.trade.stopLoss)}</span>.
                {editModal.trade.entryPrice && <> Entry: <span className="font-bold text-white">{fmtPrice(editModal.trade.entryPrice)}</span>.</>}
                {' '}Team users will see the new level immediately.
              </div>
            )}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                {editModal.action === 'entry'    ? 'Entry price'
                 : editModal.action === 'stopLoss' ? 'New stop loss'
                 :                                   'Close price'}
              </label>
              <input
                type="number" step="0.00001" min="0" autoFocus
                value={editPrice}
                onChange={e => setEditPrice(e.target.value)}
                placeholder="0.0000"
                className="w-full bg-[#0b1322] border border-white/15 rounded-lg px-3 py-2.5 text-white text-sm tabular-nums outline-none focus:border-emerald-500/60"
              />
            </div>
            {editErr && <p className="text-xs text-red-400">{editErr}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={submitEdit} disabled={editBusy}
                className="flex-1 bg-[#1D9E75] hover:bg-[#22b585] disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-bold transition"
              >
                {editBusy ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditModal(null)} className="px-4 py-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white text-sm transition">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: New trade (admin) ──────────────────────────────────────── */}
      {newModal && (
        <Modal title="Create live trade" onClose={() => setNewModal(false)} wide>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pair display"><input value={newForm.display} onChange={e => setNewForm(f => ({ ...f, display: e.target.value }))} placeholder="EUR/USD" className={inpCls} /></Field>
            <Field label="Slug"><input value={newForm.slug} onChange={e => setNewForm(f => ({ ...f, slug: e.target.value }))} placeholder="eur-usd" className={inpCls} /></Field>
            <Field label="Direction">
              <select value={newForm.decision} onChange={e => setNewForm(f => ({ ...f, decision: e.target.value as 'BUY' | 'SELL' }))} className={inpCls}>
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </Field>
            <Field label="Confidence (%)"><input type="number" value={newForm.confidence} onChange={e => setNewForm(f => ({ ...f, confidence: e.target.value }))} className={inpCls} /></Field>
            <Field label="Entry low"><input type="number" step="0.00001" value={newForm.entryLow} onChange={e => setNewForm(f => ({ ...f, entryLow: e.target.value }))} className={inpCls} /></Field>
            <Field label="Entry high"><input type="number" step="0.00001" value={newForm.entryHigh} onChange={e => setNewForm(f => ({ ...f, entryHigh: e.target.value }))} className={inpCls} /></Field>
            <Field label="Stop loss"><input type="number" step="0.00001" value={newForm.stopLoss} onChange={e => setNewForm(f => ({ ...f, stopLoss: e.target.value }))} className={inpCls} /></Field>
            <Field label="Setup grade">
              <select value={newForm.setupGrade} onChange={e => setNewForm(f => ({ ...f, setupGrade: e.target.value }))} className={inpCls}>
                <option value="A">A</option><option value="B">B</option><option value="C">C</option>
              </select>
            </Field>
            <Field label="TP1"><input type="number" step="0.00001" value={newForm.tp1} onChange={e => setNewForm(f => ({ ...f, tp1: e.target.value }))} className={inpCls} /></Field>
            <Field label="TP2"><input type="number" step="0.00001" value={newForm.tp2} onChange={e => setNewForm(f => ({ ...f, tp2: e.target.value }))} className={inpCls} /></Field>
            <Field label="TP3"><input type="number" step="0.00001" value={newForm.tp3} onChange={e => setNewForm(f => ({ ...f, tp3: e.target.value }))} className={inpCls} /></Field>
            <div className="col-span-2">
              <Field label="Suggested starting stake (BTC) — team users see this pre-filled, becomes the minimum stake">
                <input type="number" step="0.0001" min="0" value={newForm.suggestedAmountBtc} onChange={e => setNewForm(f => ({ ...f, suggestedAmountBtc: e.target.value }))} placeholder="0.05 (optional)" className={inpCls} />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Leverage — amplifies stake P/L by this multiplier (loss capped at -100% of stake). Default 1:500 for crypto, 1:300 otherwise.">
                <div className="grid grid-cols-5 gap-1.5">
                  {([20, 50, 100, 300, 500] as const).map(lv => (
                    <button
                      key={lv}
                      type="button"
                      onClick={() => setNewForm(f => ({ ...f, leverage: lv }))}
                      className={`py-2 rounded-lg text-xs font-black tabular-nums transition border ${
                        newForm.leverage === lv
                          ? 'bg-amber-500/25 text-amber-200 border-amber-500/60'
                          : 'bg-[#0b1322] text-gray-400 border-white/10 hover:text-white'
                      }`}
                    >
                      1:{lv}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Note (optional)"><textarea value={newForm.note} onChange={e => setNewForm(f => ({ ...f, note: e.target.value }))} rows={2} className={inpCls + ' resize-none'} /></Field>
            </div>
          </div>
          {newErr && <p className="text-xs text-red-400 mt-3">{newErr}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={createTrade} disabled={newBusy}
              className="flex-1 bg-[#1D9E75] hover:bg-[#22b585] disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-bold transition">
              {newBusy ? 'Creating…' : 'Create trade'}
            </button>
            <button onClick={() => setNewModal(false)} className="px-4 py-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white text-sm transition">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

const inpCls = 'w-full bg-[#0b1322] border border-white/15 rounded-lg px-3 py-2 text-white text-sm tabular-nums outline-none focus:border-emerald-500/60'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Modal({ title, onClose, wide = false, children }: { title: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} bg-[#0b1322] border border-white/15 rounded-2xl shadow-2xl overflow-hidden`}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function TradeCard({
  trade, isAdmin, myBalance, onJoin, onSetEntry, onSetClose, onSetSL, onCancel,
  showJoin = true, hideAdminActions = false, livePrice = null,
}: {
  trade: LiveTrade
  isAdmin: boolean
  myBalance: number
  onJoin: () => void
  onSetEntry: () => void
  onSetClose: () => void
  onSetSL: () => void
  onCancel: () => void
  showJoin?: boolean
  hideAdminActions?: boolean
  livePrice?: number | null
}) {
  const myPos = trade.positions.find(p => p.status === 'open') ?? trade.positions[0]
  // Joining is only allowed while the trade is 'pending' (admin has not yet
  // set the entry price). Once status flips to 'open', the trade is in session
  // and locked — no new participants until close.
  const canJoin = showJoin && trade.status === 'pending' && !trade.positions.length && myBalance > 0
  const statusCfg = {
    pending:   { label: 'AWAITING ENTRY',  cls: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
    open:      { label: 'TRADE IN SESSION', cls: 'bg-blue-500/15 text-blue-300 border-blue-500/40' },
    closed:    { label: 'CLOSED',          cls: 'bg-white/10 text-gray-400 border-white/15' },
    cancelled: { label: 'CANCELLED',       cls: 'bg-red-500/15 text-red-300 border-red-500/40' },
  }[trade.status]

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${
      trade.decision === 'BUY' ? 'bg-emerald-500/[0.04] border-emerald-500/25' :
                                  'bg-red-500/[0.04] border-red-500/25'
    }`}>
      {/* Live P/L banner — only while the trade is in session (entry set, not closed) */}
      {(() => {
        if (trade.status !== 'open' || !trade.entryPrice || !livePrice) return null
        const rawPct = trade.decision === 'BUY'
          ? (livePrice - trade.entryPrice) / trade.entryPrice
          : (trade.entryPrice - livePrice) / trade.entryPrice
        // Apply leverage, then floor leveraged loss at -100% (can't lose more than stake)
        const lev = trade.leverage ?? 300
        const pct = Math.max(rawPct * lev, -1)
        const tone = pct > 0 ? 'emerald' : pct < 0 ? 'red' : 'gray'
        const cls  = tone === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                   : tone === 'red'     ? 'bg-red-500/10 border-red-500/30 text-red-300'
                                          : 'bg-white/5 border-white/10 text-gray-400'
        return (
          <div className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 mb-3 border ${cls}`}>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Live P/L</span>
              <span className="text-[10px] text-gray-500 tabular-nums">@ {fmtPrice(livePrice)} · 1:{lev}</span>
            </div>
            <span className="text-base font-black tabular-nums">{pct >= 0 ? '+' : ''}{(pct * 100).toFixed(2)}%</span>
          </div>
        )
      })()}

      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black border ${
            trade.decision === 'BUY'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
              : 'bg-red-500/15 text-red-300 border-red-500/40'
          }`}>
            {trade.decision === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trade.decision}
          </span>
          <span className="text-sm font-black text-white">{trade.display}</span>
          {trade.setupGrade && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/5 text-gray-400 border border-white/10">G{trade.setupGrade}</span>
          )}
          {trade.leverage && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 tabular-nums">1:{trade.leverage}</span>
          )}
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${statusCfg.cls}`}>{statusCfg.label}</span>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Conf</div>
          <div className="text-sm font-bold text-white tabular-nums">{trade.confidence}%</div>
        </div>
      </div>

      {/* Levels — full 5-cell grid */}
      <div className="grid grid-cols-5 gap-1.5 mb-3">
        <Lvl label="Entry" value={trade.entryPrice ?? (trade.entryLow + trade.entryHigh) / 2} tone="white" hint={trade.entryPrice ? 'Filled' : `${fmtPrice(trade.entryLow)}–${fmtPrice(trade.entryHigh)}`} />
        <Lvl label="SL"    value={trade.stopLoss}   tone="red"   />
        <Lvl label="TP1"   value={trade.tp1}         tone="green" />
        <Lvl label="TP2"   value={trade.tp2}         tone="green" />
        <Lvl label="TP3"   value={trade.tp3}         tone="green" />
      </div>

      {/* Close price banner (visible when trade is closed) */}
      {trade.closePrice != null && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 mb-3 flex items-center justify-between text-xs">
          <span className="text-amber-300 font-bold uppercase tracking-wider text-[10px]">Closed at</span>
          <span className="text-white font-bold tabular-nums">{fmtPrice(trade.closePrice)}</span>
        </div>
      )}

      {/* Admin-only: full participants list */}
      {isAdmin && trade.allPositions && trade.allPositions.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
              Participants · {trade.allPositions.length}
            </span>
            <span className="text-[10px] text-gray-500 tabular-nums">
              Total staked {fmtBtc(trade.allPositions.reduce((s, p) => s + p.amountBtc, 0))} BTC
            </span>
          </div>
          <div className="space-y-1.5">
            {trade.allPositions.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="text-gray-200 font-medium truncate">{p.user.name ?? p.user.email}</div>
                  {p.user.name && <div className="text-[10px] text-gray-600 truncate">{p.user.email}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-amber-300 tabular-nums">{fmtBtc(p.amountBtc)} BTC</div>
                  {p.status === 'closed' && p.pnlBtc != null && (
                    <div className={`text-[10px] font-bold tabular-nums ${p.pnlBtc > 0 ? 'text-emerald-300' : p.pnlBtc < 0 ? 'text-red-300' : 'text-gray-500'}`}>
                      {p.pnlBtc >= 0 ? '+' : ''}{fmtBtc(p.pnlBtc)}
                    </div>
                  )}
                  {p.status === 'open' && (
                    <div className="text-[10px] text-blue-400">open</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My position */}
      {myPos && (
        <div className={`rounded-xl px-3 py-2.5 mb-3 border ${
          myPos.status === 'closed'
            ? (myPos.pnlBtc != null && myPos.pnlBtc > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30')
            : 'bg-white/5 border-white/10'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-0.5">Your position</div>
              <div className="text-xs text-gray-300">
                Staked <span className="font-bold text-white tabular-nums">{fmtBtc(myPos.amountBtc)} BTC</span>
                {myPos.status === 'closed' && myPos.pnlBtc != null && (
                  <> · Net P/L <span className={`font-bold tabular-nums ${myPos.pnlBtc > 0 ? 'text-emerald-300' : myPos.pnlBtc < 0 ? 'text-red-300' : 'text-gray-400'}`}>
                    {myPos.pnlBtc >= 0 ? '+' : ''}{fmtBtc(myPos.pnlBtc)} BTC
                  </span></>
                )}
              </div>
            </div>
            {myPos.status === 'closed' && (
              <CheckCircle2 className={`w-5 h-5 ${myPos.pnlBtc != null && myPos.pnlBtc > 0 ? 'text-emerald-400' : 'text-red-400'}`} />
            )}
          </div>
          {/* Settlement breakdown — only on closed positions where we have all 4 fields */}
          {myPos.status === 'closed' && myPos.grossPnlBtc != null && myPos.slippageBtc != null && myPos.feeBtc != null && (
            <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-3 gap-2 text-[10px]">
              <div>
                <div className="text-gray-500 uppercase font-bold tracking-wider">Gross</div>
                <div className={`tabular-nums font-bold ${myPos.grossPnlBtc > 0 ? 'text-emerald-300' : myPos.grossPnlBtc < 0 ? 'text-red-300' : 'text-gray-400'}`}>
                  {myPos.grossPnlBtc >= 0 ? '+' : ''}{fmtBtc(myPos.grossPnlBtc)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 uppercase font-bold tracking-wider">Slippage · {(trade.slippagePct * 100).toFixed(2)}%</div>
                <div className="tabular-nums font-bold text-red-300">−{fmtBtc(myPos.slippageBtc)}</div>
              </div>
              <div>
                <div className="text-gray-500 uppercase font-bold tracking-wider">Fee · {(trade.feePct * 100).toFixed(0)}%</div>
                <div className="tabular-nums font-bold text-red-300">{myPos.feeBtc > 0 ? `−${fmtBtc(myPos.feeBtc)}` : '—'}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Outcome (closed trades) */}
      {trade.status === 'closed' && trade.pnlPct != null && (
        <div className={`rounded-xl px-3 py-2 mb-3 text-xs flex items-center justify-between ${
          trade.pnlPct > 0 ? 'bg-emerald-500/10 text-emerald-300' :
          trade.pnlPct < 0 ? 'bg-red-500/10 text-red-300' :
                             'bg-white/5 text-gray-400'
        }`}>
          <span>Trade result · {trade._count.positions} position{trade._count.positions === 1 ? '' : 's'}</span>
          <span className="font-bold tabular-nums">{fmtPct(trade.pnlPct)}</span>
        </div>
      )}

      {/* Note */}
      {trade.note && (
        <p className="text-[11px] text-gray-500 italic mb-3">&quot;{trade.note}&quot;</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[10px] text-gray-600 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Created {timeAgo(trade.createdAt)}
          {trade.openedAt  && <> · Opened {timeAgo(trade.openedAt)}</>}
          {trade.closedAt  && <> · Closed {timeAgo(trade.closedAt)}</>}
          {' · '}{trade._count.positions} stake{trade._count.positions === 1 ? '' : 's'}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {trade.suggestedAmountBtc && trade.status === 'pending' && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 tabular-nums">
              Suggested {fmtBtc(trade.suggestedAmountBtc)} BTC
            </span>
          )}
          {trade.status === 'open' && showJoin && !trade.positions.length && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-white/5 text-gray-500 border border-white/10 italic">
              Locked — trade in session
            </span>
          )}
          {canJoin && (
            <button onClick={onJoin}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                trade.decision === 'BUY'
                  ? 'bg-emerald-600/25 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/40'
                  : 'bg-red-600/25 text-red-300 border border-red-500/40 hover:bg-red-600/40'
              }`}>
              Open {trade.decision} Position
            </button>
          )}
          {isAdmin && !hideAdminActions && (trade.status === 'pending' || trade.status === 'open') && (
            <>
              {trade.status === 'pending' && (
                <button onClick={onSetEntry} className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/40 hover:bg-blue-600/35 transition">
                  <Edit3 className="w-3 h-3" /> Set Entry
                </button>
              )}
              <button onClick={onSetSL} className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-red-600/15 text-red-300 border border-red-500/30 hover:bg-red-600/30 transition">
                <Edit3 className="w-3 h-3" /> Set SL
              </button>
              {trade.status === 'open' && (
                <button onClick={onSetClose} className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/35 transition">
                  <Edit3 className="w-3 h-3" /> Set Close
                </button>
              )}
              <button onClick={onCancel} className="text-[11px] font-bold px-2 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-red-300 hover:bg-red-500/10 transition">
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Lvl({ label, value, tone, hint }: { label: string; value: number; tone: 'white' | 'red' | 'green' | 'amber'; hint?: string }) {
  const cls = {
    white:  'bg-white/[0.04] border-white/10 text-white',
    red:    'bg-red-500/10 border-red-500/25 text-red-200',
    green:  'bg-emerald-500/10 border-emerald-500/25 text-emerald-200',
    amber:  'bg-amber-500/10 border-amber-500/25 text-amber-200',
  }[tone]
  const labelCls = {
    white:  'text-gray-400',
    red:    'text-red-400',
    green:  'text-emerald-400',
    amber:  'text-amber-400',
  }[tone]
  return (
    <div className={`rounded-lg border px-2 py-2 text-center ${cls}`}>
      <div className={`text-[9px] uppercase font-black tracking-wider mb-0.5 ${labelCls}`}>{label}</div>
      <div className="text-xs font-bold tabular-nums">{fmtPrice(value)}</div>
      {hint && <div className="text-[9px] text-gray-600 mt-0.5">{hint}</div>}
    </div>
  )
}
