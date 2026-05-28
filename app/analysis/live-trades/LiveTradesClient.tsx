'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { ArrowLeft, Bitcoin, TrendingUp, TrendingDown, Plus, Edit3, X, CheckCircle2, Clock, RefreshCw, AlertTriangle, Wallet } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface MyPosition {
  id: string
  amountBtc: number
  pnlBtc: number | null
  status: 'open' | 'closed'
  openedAt: string
  closedAt: string | null
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
  status:       'pending' | 'open' | 'closed' | 'cancelled'
  entryPrice:   number | null
  closePrice:   number | null
  pnlPct:       number | null
  note:         string | null
  suggestedAmountBtc: number | null
  createdAt:    string
  openedAt:     string | null
  closedAt:     string | null
  positions:    MyPosition[]
  _count:       { positions: number }
}

interface Me {
  id: string
  name: string | null
  email: string
  role: 'admin' | 'team' | 'user'
  teamBalanceBtc: number
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
  const [err,        setErr]        = useState<string | null>(null)
  const [view,       setView]       = useState<'open' | 'mine' | 'history' | 'admin'>('open')

  // Open-position modal (team action)
  const [posModal,   setPosModal]   = useState<{ trade: LiveTrade } | null>(null)
  const [posAmount,  setPosAmount]  = useState('')
  const [posBusy,    setPosBusy]    = useState(false)
  const [posErr,     setPosErr]     = useState<string | null>(null)

  // Admin: edit trade modal (set entry / close / cancel)
  const [editModal,  setEditModal]  = useState<{ trade: LiveTrade; action: 'entry' | 'close' } | null>(null)
  const [editPrice,  setEditPrice]  = useState('')
  const [editBusy,   setEditBusy]   = useState(false)
  const [editErr,    setEditErr]    = useState<string | null>(null)

  // Admin: new trade modal
  const [newModal,   setNewModal]   = useState(false)
  const [newBusy,    setNewBusy]    = useState(false)
  const [newErr,     setNewErr]     = useState<string | null>(null)
  const [newForm,    setNewForm]    = useState({
    slug: '', display: '', decision: 'BUY' as 'BUY' | 'SELL',
    entryLow: '', entryHigh: '', stopLoss: '',
    tp1: '', tp2: '', tp3: '',
    confidence: '70', setupGrade: 'B', note: '',
    suggestedAmountBtc: '',
  })

  // ── Load data ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setErr(null)
    try {
      const res = await fetch('/api/live-trades')
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`)
      const data = await res.json() as { me: Me; trades: LiveTrade[] }
      setMe(data.me)
      setTrades(data.trades ?? [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Polling — refresh every 60s so status changes (close, entry) appear without manual reload
  useEffect(() => {
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [load])

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

  // ── Admin: set entry / close / cancel ─────────────────────────────────────
  async function submitEdit() {
    if (!editModal) return
    const p = Number(editPrice)
    if (!isFinite(p) || p <= 0) { setEditErr('Price must be a positive number'); return }
    setEditBusy(true); setEditErr(null)
    try {
      const body = editModal.action === 'entry' ? { entryPrice: p } : { closePrice: p }
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
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`)
      setNewModal(false)
      setNewForm({ slug: '', display: '', decision: 'BUY', entryLow: '', entryHigh: '', stopLoss: '', tp1: '', tp2: '', tp3: '', confidence: '70', setupGrade: 'B', note: '', suggestedAmountBtc: '' })
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
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 bg-white/[0.04] border border-white/10 rounded-xl overflow-x-auto">
          {([
            { id: 'open',    label: `Open Trades${openTrades.length ? ` · ${openTrades.length}` : ''}` },
            { id: 'mine',    label: `My Positions${myPositions.length ? ` · ${myPositions.length}` : ''}` },
            { id: 'history', label: 'History' },
            ...(isAdmin ? [{ id: 'admin' as const, label: 'Manage' }] : []),
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
                myBalance={me?.teamBalanceBtc ?? 0}
                onJoin={() => { setPosErr(null); setPosAmount(t.suggestedAmountBtc ? String(t.suggestedAmountBtc) : ''); setPosModal({ trade: t }) }}
                onSetEntry={() => { setEditErr(null); setEditPrice(''); setEditModal({ trade: t, action: 'entry' }) }}
                onSetClose={() => { setEditErr(null); setEditPrice(''); setEditModal({ trade: t, action: 'close' }) }}
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
              <TradeCard key={t.id} trade={t} isAdmin={isAdmin} myBalance={me?.teamBalanceBtc ?? 0}
                onJoin={() => null} showJoin={false}
                onSetEntry={() => { setEditErr(null); setEditPrice(''); setEditModal({ trade: t, action: 'entry' }) }}
                onSetClose={() => { setEditErr(null); setEditPrice(''); setEditModal({ trade: t, action: 'close' }) }}
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
              <TradeCard key={t.id} trade={t} isAdmin={isAdmin} myBalance={me?.teamBalanceBtc ?? 0}
                onJoin={() => null} showJoin={false}
                onSetEntry={() => null} onSetClose={() => null} onCancel={() => null} hideAdminActions
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
                  myBalance={me?.teamBalanceBtc ?? 0}
                  onJoin={() => { setPosErr(null); setPosAmount(''); setPosModal({ trade: t }) }}
                  showJoin={false}
                  onSetEntry={() => { setEditErr(null); setEditPrice(''); setEditModal({ trade: t, action: 'entry' }) }}
                  onSetClose={() => { setEditErr(null); setEditPrice(''); setEditModal({ trade: t, action: 'close' }) }}
                  onCancel={() => cancelTrade(t.id)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

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
              {posModal.trade.suggestedAmountBtc && (
                <p className="mt-1 text-[10px] text-gray-500">
                  Admin suggested this starting stake. You can accept it or increase the amount.
                </p>
              )}
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
          title={editModal.action === 'entry'
            ? `Set entry price — ${editModal.trade.decision} ${editModal.trade.display}`
            : `Set close price — ${editModal.trade.decision} ${editModal.trade.display}`}
          onClose={() => setEditModal(null)}
        >
          <div className="space-y-3">
            {editModal.action === 'close' && editModal.trade.entryPrice && (
              <div className="text-xs text-gray-400">
                Entry was <span className="font-bold text-white">{fmtPrice(editModal.trade.entryPrice)}</span> ·
                {editModal.trade._count.positions} position{editModal.trade._count.positions === 1 ? '' : 's'} will settle when you submit.
              </div>
            )}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                {editModal.action === 'entry' ? 'Entry price' : 'Close price'}
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
  trade, isAdmin, myBalance, onJoin, onSetEntry, onSetClose, onCancel,
  showJoin = true, hideAdminActions = false,
}: {
  trade: LiveTrade
  isAdmin: boolean
  myBalance: number
  onJoin: () => void
  onSetEntry: () => void
  onSetClose: () => void
  onCancel: () => void
  showJoin?: boolean
  hideAdminActions?: boolean
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
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${statusCfg.cls}`}>{statusCfg.label}</span>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Conf</div>
          <div className="text-sm font-bold text-white tabular-nums">{trade.confidence}%</div>
        </div>
      </div>

      {/* Levels */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <Lvl label="Entry" value={trade.entryPrice ?? (trade.entryLow + trade.entryHigh) / 2} tone="white" hint={trade.entryPrice ? 'Filled' : `${fmtPrice(trade.entryLow)}–${fmtPrice(trade.entryHigh)}`} />
        <Lvl label="SL"    value={trade.stopLoss}   tone="red"   />
        <Lvl label="TP2"   value={trade.tp2}         tone="green" />
        <Lvl label={trade.closePrice ? 'Close' : 'TP3'} value={trade.closePrice ?? trade.tp3} tone={trade.closePrice ? 'amber' : 'green'} />
      </div>

      {/* My position */}
      {myPos && (
        <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 mb-3 border ${
          myPos.status === 'closed'
            ? (myPos.pnlBtc != null && myPos.pnlBtc > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30')
            : 'bg-white/5 border-white/10'
        }`}>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-0.5">Your position</div>
            <div className="text-xs text-gray-300">
              Staked <span className="font-bold text-white tabular-nums">{fmtBtc(myPos.amountBtc)} BTC</span>
              {myPos.status === 'closed' && myPos.pnlBtc != null && (
                <> · P/L <span className={`font-bold tabular-nums ${myPos.pnlBtc > 0 ? 'text-emerald-300' : myPos.pnlBtc < 0 ? 'text-red-300' : 'text-gray-400'}`}>
                  {myPos.pnlBtc >= 0 ? '+' : ''}{fmtBtc(myPos.pnlBtc)} BTC
                </span></>
              )}
            </div>
          </div>
          {myPos.status === 'closed' && (
            <CheckCircle2 className={`w-5 h-5 ${myPos.pnlBtc != null && myPos.pnlBtc > 0 ? 'text-emerald-400' : 'text-red-400'}`} />
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
