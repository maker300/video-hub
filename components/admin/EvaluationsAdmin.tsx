'use client'

import { useCallback, useEffect, useState } from 'react'
import { Trophy, Loader2, Check, X, Banknote, AlertTriangle, Sparkles } from 'lucide-react'

interface Payout {
  id: string; amount: number; grossProfit: number
  status: string; requestedAt: string; paidAt: string | null; note: string | null
}
interface Funded {
  equity: number; baseline: number; grossProfit: number
  traderShare: number; firmShare: number; drawdownFloor: number
}
interface Progress {
  equity: number; profit: number; profitPct: number; targetEquity: number
  drawdownFloor: number; progressPct: number; tradingDays: number; canPass: boolean
}
interface Evaluation {
  id: string; status: string; phase: string; email: string | null
  profitTargetPct: number
  accountSize: number; profitSplitPct: number
  fundedBalance: number | null
  breachReason: string | null
  startedAt: string; passedAt: string | null; fundedAt: string | null
  lastEquityAt: string | null
  progress: Progress; funded: Funded | null; payouts: Payout[]
}

const gbp = (p: number) => `£${(p / 100).toLocaleString('en-GB', { maximumFractionDigits: 2 })}`

const ST: Record<string, string> = {
  evaluation: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  passed:     'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  funded:     'text-emerald-300 bg-emerald-500/15 border-emerald-500/40',
  breached:   'text-red-300 bg-red-500/10 border-red-500/30',
  cancelled:  'text-gray-400 bg-white/5 border-white/15',
}

const GRANT_TIERS = [
  { label: '£1,000', tier: 0 },
  { label: '£2,000', tier: 1 },
  { label: '£5,000', tier: 2 },
]

export default function EvaluationsAdmin() {
  const [rows, setRows] = useState<Evaluation[]>([])
  const [busy, setBusy] = useState(false)
  const [msg,  setMsg]  = useState('')
  const [grantTier, setGrantTier] = useState(2)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/evaluation')
      if (r.ok) setRows((await r.json()).evaluations ?? [])
    } catch { /* non-critical */ }
  }, [])
  useEffect(() => { load() }, [load])

  async function act(id: string, action: string, extra: Record<string, unknown> = {}) {
    setBusy(true); setMsg('')
    try {
      const r = await fetch(`/api/admin/evaluation/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Failed.')
      setMsg(action === 'fund' ? 'Funded account issued — trader notified.' : 'Updated.')
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed.')
    } finally { setBusy(false) }
  }

  async function settle(id: string, status: 'paid' | 'rejected') {
    setBusy(true); setMsg('')
    try {
      const r = await fetch(`/api/admin/payout/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Failed.')
      setMsg(status === 'paid' ? 'Marked paid — baseline moved up.' : 'Payout rejected.')
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed.')
    } finally { setBusy(false) }
  }

  async function grantSelf() {
    setBusy(true); setMsg('')
    try {
      const r = await fetch('/api/admin/evaluation/grant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: grantTier }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Failed.')
      setMsg('Funded account granted — no payment taken.')
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed.')
    } finally { setBusy(false) }
  }

  const awaitingFund   = rows.filter(r => r.status === 'passed').length
  const awaitingPayout = rows.reduce((n, r) => n + r.payouts.filter(p => p.status === 'requested').length, 0)

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Trophy className="w-4 h-4 text-amber-300" />
        <h3 className="text-sm font-bold text-white">Funded evaluations</h3>
        {awaitingFund > 0 && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
            {awaitingFund} to fund
          </span>
        )}
        {awaitingPayout > 0 && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
            {awaitingPayout} payout{awaitingPayout === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap bg-white/[0.03] border border-white/10 rounded-xl p-3 mb-4">
        <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
        <span className="text-[11px] text-gray-400">Admin bypass — grant yourself a funded account, no payment, no evaluation phases:</span>
        <select
          value={grantTier}
          onChange={e => setGrantTier(Number(e.target.value))}
          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
        >
          {GRANT_TIERS.map(t => (
            <option key={t.tier} value={t.tier} className="bg-[#0a0f1a]">{t.label}</option>
          ))}
        </select>
        <button
          onClick={grantSelf}
          disabled={busy}
          className="text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-[#2b1a02] px-3 py-1.5 rounded-lg transition"
        >
          Grant funded access
        </button>
      </div>

      {rows.length === 0 && <p className="text-xs text-gray-500">No evaluations yet.</p>}

      <div className="space-y-3">
        {rows.map(r => (
          <div key={r.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${ST[r.status] ?? ST.cancelled}`}>
                {r.status}
              </span>
              <span className="text-xs font-semibold text-white truncate">{r.email}</span>
              <span className="text-[11px] text-gray-500">{gbp(r.accountSize)}</span>
              {r.status === 'evaluation' && (
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                  r.phase === 'phase2'
                    ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                    : 'text-blue-300 bg-blue-500/10 border-blue-500/30'}`}>
                  {r.phase === 'phase2' ? 'P2' : 'P1'} · +{r.profitTargetPct}%
                </span>
              )}
              <span className="text-[11px] text-gray-600 ml-auto">
                {r.lastEquityAt ? `seen ${new Date(r.lastEquityAt).toLocaleDateString()}` : 'no equity yet'}
              </span>
            </div>

            {r.status === 'evaluation' && (
              <div className="text-[11px] text-gray-400">
                {gbp(r.progress.equity)} &middot; {r.progress.progressPct.toFixed(0)}% to target &middot;{' '}
                {r.progress.tradingDays} day{r.progress.tradingDays === 1 ? '' : 's'} &middot; floor {gbp(r.progress.drawdownFloor)}
              </div>
            )}

            {r.status === 'funded' && r.funded && (
              <div className="text-[11px] text-gray-400">
                {gbp(r.funded.equity)} &middot; baseline {gbp(r.funded.baseline)} &middot;{' '}
                profit {gbp(r.funded.grossProfit)} (their share {gbp(r.funded.traderShare)})
              </div>
            )}

            {r.breachReason && (
              <p className="text-[11px] text-red-300/90 mt-1 leading-relaxed">{r.breachReason}</p>
            )}

            {/* Issue funded account */}
            {r.status === 'passed' && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-emerald-300 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Cleared both phases — ready to fund
                </span>
                <button
                  onClick={() => act(r.id, 'fund')}
                  disabled={busy}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-[#052e21] text-xs font-bold px-3 py-1.5 rounded-lg transition"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Banknote className="w-3.5 h-3.5" />}
                  Issue funded account
                </button>
              </div>
            )}

            {/* Pending payouts */}
            {r.payouts.filter(p => p.status === 'requested').map(p => (
              <div key={p.id} className="mt-3 bg-amber-500/[0.07] border border-amber-500/25 rounded-lg p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-xs text-amber-200">
                    Payout requested: <strong>{gbp(p.amount)}</strong> of {gbp(p.grossProfit)} profit
                  </span>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => settle(p.id, 'paid')}
                    disabled={busy}
                    className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-[#052e21] text-xs font-bold px-3 py-1.5 rounded-lg transition"
                  >
                    <Check className="w-3.5 h-3.5" /> Mark paid
                  </button>
                  <button
                    onClick={() => settle(p.id, 'rejected')}
                    disabled={busy}
                    className="text-xs text-gray-500 hover:text-red-300 px-2 py-1.5 transition"
                  >
                    Reject
                  </button>
                </div>
                <p className="text-[10px] text-gray-600 mt-1.5">
                  Marking paid moves their baseline up so the same profit can&apos;t be claimed twice.
                </p>
              </div>
            ))}

            {(r.status === 'evaluation' || r.status === 'funded') && (
              <button
                onClick={() => act(r.id, 'revoke', { note: 'Revoked by admin.' })}
                disabled={busy}
                className="mt-2 text-[11px] text-gray-600 hover:text-red-300 transition inline-flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Revoke
              </button>
            )}
          </div>
        ))}
      </div>

      {msg && <p className="mt-3 text-xs text-gray-400">{msg}</p>}
    </div>
  )
}
