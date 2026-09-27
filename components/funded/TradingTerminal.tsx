'use client'

// In-house simulated trading terminal for evaluation and funded accounts.
// No broker, no MT5, no real money — prices come from our own market-data
// feed and every fill is computed server-side in lib/sim-trading.ts.

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, TrendingUp, TrendingDown, X, Info } from 'lucide-react'

interface Instrument { slug: string; display: string }
interface Position {
  id: string; slug: string; display: string; side: string
  lots: number; openPrice: number
  stopLoss: number | null; takeProfit: number | null
  openedAt: string; currentPrice: number | null; pnl: number | null
}
interface Closed {
  id: string; display: string; side: string; lots: number
  openPrice: number; closePrice: number | null
  pnl: number | null; closeReason: string | null; closedAt: string | null
}
interface Account {
  balance: number; unrealised: number; equity: number
  usedMargin: number; freeMargin: number; openCount: number
}
interface SimState {
  active: boolean; status?: string
  instruments: Instrument[]
  prices?: Record<string, number>
  account?: Account
  positions?: Position[]
  history?: Closed[]
  minLots?: number; maxLots?: number
}

const gbp = (p: number) => `£${(p / 100).toLocaleString('en-GB', { maximumFractionDigits: 2 })}`

// Display precision — indices/crypto/JPY pairs don't want 5 decimal places.
function decimalsFor(slug: string): number {
  if (slug.includes('jpy')) return 3
  if (['sp-500', 'nas-100', 'dj-30', 'ger-40'].includes(slug)) return 1
  if (['btc-usd', 'eth-usd'].includes(slug)) return 2
  if (['sol-usd', 'xrp-usd', 'bnb-usd'].includes(slug)) return 3
  if (slug === 'xau-usd' || slug === 'xag-usd' || slug === 'wti-usd') return 2
  return 5
}
const fmtPrice = (slug: string, p: number) => p.toFixed(decimalsFor(slug))

export default function TradingTerminal({ evaluationId, status }: { evaluationId: string; status: string }) {
  const [state, setState]   = useState<SimState | null>(null)
  const [loading, setLoading] = useState(true)
  const [slug, setSlug]     = useState('eur-usd')
  const [side, setSide]     = useState<'BUY' | 'SELL'>('BUY')
  const [lots, setLots]     = useState('0.10')
  const [sl, setSl]         = useState('')
  const [tp, setTp]         = useState('')
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/sim/positions')
      if (r.ok) setState(await r.json())
    } catch { /* transient */ } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    function tick() {
      if (document.hidden) return
      load()
    }
    pollRef.current = setInterval(tick, 5000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [load])

  const tradable = status === 'evaluation' || status === 'funded'
  const price = state?.prices?.[slug]

  async function submit() {
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/sim/positions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug, side, lots: Number(lots),
          stopLoss:   sl ? Number(sl) : null,
          takeProfit: tp ? Number(tp) : null,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not open that position.')
      setSl(''); setTp('')
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not open that position.')
    } finally { setBusy(false) }
  }

  async function closePosition(id: string) {
    setBusy(true); setErr('')
    try {
      const r = await fetch(`/api/sim/positions/${id}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not close that position.')
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not close that position.')
    } finally { setBusy(false) }
  }

  if (loading) {
    return <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-sm text-gray-500">Loading terminal…</div>
  }
  if (!state?.active || !tradable) return null

  const acct = state.account
  const instruments = state.instruments ?? []
  const minLots = state.minLots ?? 0.01
  const maxLots = state.maxLots ?? 5

  return (
    <div className="space-y-4">
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-white mb-4">Trading terminal</h2>

        {acct && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
            <MiniStat label="Equity" value={gbp(acct.equity)} />
            <MiniStat label="Balance" value={gbp(acct.balance)} />
            <MiniStat label="Free margin" value={gbp(acct.freeMargin)} />
            <MiniStat label="Open" value={String(acct.openCount)} />
          </div>
        )}

        {/* Order ticket */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">Instrument</label>
            <select
              value={slug}
              onChange={e => setSlug(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              {instruments.map(i => (
                <option key={i.slug} value={i.slug} className="bg-[#080e1a]">
                  {i.display}{state.prices?.[i.slug] != null ? ` — ${fmtPrice(i.slug, state.prices[i.slug])}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">Lots ({minLots}–{maxLots})</label>
            <input
              type="number" step={minLots} min={minLots} max={maxLots}
              value={lots} onChange={e => setLots(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">Stop loss (optional)</label>
            <input
              type="number" step="any" value={sl} onChange={e => setSl(e.target.value)}
              placeholder={price != null ? fmtPrice(slug, price) : ''}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600"
            />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 block mb-1">Take profit (optional)</label>
            <input
              type="number" step="any" value={tp} onChange={e => setTp(e.target.value)}
              placeholder={price != null ? fmtPrice(slug, price) : ''}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600"
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5 mt-3">
          <button
            onClick={() => setSide('BUY')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition ${
              side === 'BUY' ? 'bg-emerald-500 text-[#052e21]' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Buy
          </button>
          <button
            onClick={() => setSide('SELL')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition ${
              side === 'SELL' ? 'bg-red-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
          >
            <TrendingDown className="w-3.5 h-3.5" /> Sell
          </button>
          <button
            onClick={submit}
            disabled={busy || price == null}
            className="flex-1 flex items-center justify-center gap-1.5 bg-white text-[#080e1a] font-bold py-2.5 rounded-lg disabled:opacity-40 transition"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {price != null ? `at ${fmtPrice(slug, price)}` : 'No price'}
          </button>
        </div>
        {err && <p className="mt-2 text-xs text-red-300">{err}</p>}
      </div>

      {/* Open positions */}
      {(state.positions?.length ?? 0) > 0 && (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Open positions</h3>
          <div className="space-y-2">
            {state.positions!.map(p => {
              const inProfit = (p.pnl ?? 0) >= 0
              return (
                <div key={p.id} className="flex items-center gap-2 flex-wrap bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5">
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    p.side === 'BUY' ? 'text-emerald-300 bg-emerald-500/10' : 'text-red-300 bg-red-500/10'}`}>
                    {p.side}
                  </span>
                  <Link
                    href={`/analysis/${p.slug}`}
                    className="text-xs font-semibold text-white hover:text-emerald-300 hover:underline transition"
                    title={`View ${p.display} analysis`}
                  >
                    {p.display}
                  </Link>
                  <span className="text-[11px] text-gray-500">{p.lots} lots @ {fmtPrice(p.slug, p.openPrice)}</span>
                  {p.currentPrice != null && (
                    <span className="text-[11px] text-gray-600">→ {fmtPrice(p.slug, p.currentPrice)}</span>
                  )}
                  <span className={`text-xs font-bold tabular-nums ${inProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                    {p.pnl != null ? `${inProfit ? '+' : ''}${gbp(p.pnl)}` : '—'}
                  </span>
                  <button
                    onClick={() => closePosition(p.id)}
                    disabled={busy}
                    className="ml-auto text-[11px] text-gray-500 hover:text-red-300 disabled:opacity-40 flex items-center gap-1 transition"
                  >
                    <X className="w-3 h-3" /> Close
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent history */}
      {(state.history?.length ?? 0) > 0 && (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Recent closed</h3>
          <div className="space-y-1.5">
            {state.history!.slice(0, 8).map(p => {
              const inProfit = (p.pnl ?? 0) >= 0
              return (
                <div key={p.id} className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className={`font-bold uppercase px-1 rounded ${p.side === 'BUY' ? 'text-emerald-300' : 'text-red-300'}`}>{p.side}</span>
                  <span className="text-gray-400">{p.display}</span>
                  <span className="text-gray-600">{p.lots} lots</span>
                  <span className="text-gray-600 capitalize">{(p.closeReason ?? '').replace('_', ' ')}</span>
                  <span className={`ml-auto font-semibold tabular-nums ${inProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                    {p.pnl != null ? `${inProfit ? '+' : ''}${gbp(p.pnl)}` : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2.5 bg-white/[0.03] border border-white/10 rounded-xl p-4">
        <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
        <p className="text-[11px] text-gray-500 leading-relaxed">
          Trade directly with us — no broker, no MT5, no download. Prices are live market data; fills, stops and
          targets are computed automatically. This is a simulated account: no real money moves until you&apos;re
          funded, and at the funded stage the capital at risk is ours.
        </p>
      </div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-bold text-white tabular-nums mt-0.5">{value}</div>
    </div>
  )
}
