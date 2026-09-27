// Profile → Auto-Execute card.
//
// Presents the MT4/5 EA integration honestly: the site publishes signals,
// the user's own terminal executes them. Every string here is written to
// keep that distinction clear — this must never read like managed trading.
'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Zap, KeyRound, Copy, Check, Download, Loader2, ShieldAlert,
  Power, RefreshCw, Trash2, ExternalLink,
} from 'lucide-react'

interface Dispatch {
  id: string; display: string; decision: string; confidence: number
  status: string; brokerTicket: string | null; filledPrice: number | null
  ackNote: string | null; createdAt: string
}
interface Settings {
  hasKey: boolean; keyPreview: string | null; keyCreatedAt: string | null
  tokenBalance: number; enabled: boolean; killSwitch: boolean
  maxRiskPct: number; maxConcurrent: number; minConfidence: number
  allowedSlugs: string[]; recent: Dispatch[]
}

const STATUS_STYLE: Record<string, string> = {
  filled:     'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  rejected:   'text-red-300 bg-red-500/10 border-red-500/30',
  error:      'text-red-300 bg-red-500/10 border-red-500/30',
  skipped:    'text-gray-400 bg-white/5 border-white/15',
  dispatched: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
}

export default function AutoTradeCard() {
  const [s,        setS]        = useState<Settings | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [busy,     setBusy]     = useState(false)
  const [freshKey, setFreshKey] = useState<string | null>(null)
  const [copied,   setCopied]   = useState(false)
  const [msg,      setMsg]      = useState('')

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/auto-trade/settings')
      if (r.ok) setS(await r.json())
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  async function patch(body: Record<string, unknown>) {
    setBusy(true); setMsg('')
    try {
      const r = await fetch('/api/auto-trade/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not save.')
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not save.')
    } finally { setBusy(false) }
  }

  async function generateKey() {
    setBusy(true); setMsg('')
    try {
      const r = await fetch('/api/auto-trade/key', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not generate a key.')
      setFreshKey(d.key)
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not generate a key.')
    } finally { setBusy(false) }
  }

  async function revokeKey() {
    if (!confirm('Revoke this key? Your EA will stop trading until you paste a new one.')) return
    setBusy(true); setFreshKey(null)
    try {
      await fetch('/api/auto-trade/key', { method: 'DELETE' })
      await load()
    } finally { setBusy(false) }
  }

  function copyKey() {
    if (!freshKey) return
    navigator.clipboard.writeText(freshKey).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-sm text-gray-500">Loading auto-execute…</p>
      </div>
    )
  }
  if (!s) return null

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
          <Zap className="w-4.5 h-4.5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold">Auto-Execute (MT4/5)</h2>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            Run our Expert Advisor in your own MetaTrader terminal. It reads your signals and places the
            orders on your broker account. We publish the signals — your terminal does the trading.
          </p>
        </div>
        {s.enabled && !s.killSwitch && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded shrink-0">
            Active
          </span>
        )}
      </div>

      {/* Risk notice — deliberately prominent and not dismissible. */}
      <div className="flex gap-2.5 bg-amber-500/[0.07] border border-amber-500/25 rounded-xl p-3 mb-4">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-200/90 leading-relaxed">
          This places <strong>real orders with real money</strong> on your account. Signals are educational and
          are not financial advice. Test on a <strong>demo account</strong> first. You remain responsible for
          every trade your terminal places.
        </p>
      </div>

      {/* Step 1 — key */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">1 · API key</span>
        </div>

        {freshKey ? (
          <div className="bg-emerald-500/[0.07] border border-emerald-500/30 rounded-xl p-3">
            <p className="text-[11px] text-emerald-300 font-semibold mb-2">
              Copy this now — it won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 truncate bg-[#0a0f1e] border border-white/15 rounded-lg px-3 py-2 text-xs text-emerald-200 font-mono">
                {freshKey}
              </code>
              <button
                onClick={copyKey}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-[#052e21] text-xs font-bold px-3 py-2 rounded-lg transition shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        ) : s.hasKey ? (
          <div className="flex items-center gap-2 flex-wrap">
            <code className="bg-[#0a0f1e] border border-white/15 rounded-lg px-3 py-2 text-xs text-gray-400 font-mono">
              {s.keyPreview}
            </code>
            <button
              onClick={generateKey}
              disabled={busy}
              className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 px-3 py-2 rounded-lg transition disabled:opacity-40"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Rotate
            </button>
            <button
              onClick={revokeKey}
              disabled={busy}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-300 px-2 py-2 rounded-lg transition disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" /> Revoke
            </button>
          </div>
        ) : (
          <button
            onClick={generateKey}
            disabled={busy}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-[#2b1a02] text-sm font-bold px-4 py-2 rounded-lg transition disabled:opacity-40"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
            Generate key
          </button>
        )}
      </div>

      {/* Step 2 — download */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Download className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">2 · Expert Advisor</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/downloads/FMTrader.mq5"
            download
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/15 text-sm text-white px-4 py-2 rounded-lg transition"
          >
            <Download className="w-3.5 h-3.5" /> FMTrader.mq5
          </a>
          <a
            href="/downloads/FMTrader-setup.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2 py-2 transition"
          >
            Setup guide <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">
          Copy into <code className="text-gray-500">MQL5/Experts/</code>, press F7 in MetaEditor to compile, then
          drag onto any one chart. It handles every pair from that single chart.
        </p>
      </div>

      {/* Step 3 — settings */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Power className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">3 · Risk settings</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          {([
            { key: 'maxRiskPct',    label: 'Risk per trade (%)', value: s.maxRiskPct,    min: 0.1, max: 5,   step: 0.1 },
            { key: 'maxConcurrent', label: 'Max open trades',    value: s.maxConcurrent, min: 1,   max: 10,  step: 1   },
            { key: 'minConfidence', label: 'Min confidence',     value: s.minConfidence, min: 0,   max: 100, step: 5   },
          ] as const).map(f => (
            <label key={f.key} className="block">
              <span className="text-[11px] text-gray-500">{f.label}</span>
              <input
                type="number"
                defaultValue={f.value}
                min={f.min} max={f.max} step={f.step}
                onBlur={e => {
                  const v = Number(e.target.value)
                  if (Number.isFinite(v) && v !== f.value) patch({ [f.key]: v })
                }}
                className="mt-1 w-full bg-[#0a0f1e] border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
              />
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 bg-white/[0.03] rounded-xl px-4 py-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white">Auto-execute</div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {s.hasKey
                ? 'When on, your EA receives signals. 1 token per signal delivered.'
                : 'Generate an API key first.'}
            </p>
          </div>
          <button
            onClick={() => patch({ enabled: !s.enabled })}
            disabled={busy || !s.hasKey}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition shrink-0 disabled:opacity-40 ${
              s.enabled ? 'bg-emerald-500/70' : 'bg-gray-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              s.enabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {s.enabled && (
          <button
            onClick={() => patch({ killSwitch: !s.killSwitch })}
            disabled={busy}
            className={`mt-2 w-full flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-lg border transition disabled:opacity-40 ${
              s.killSwitch
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/15'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {s.killSwitch ? 'Resume signal delivery' : 'Pause immediately (kill switch)'}
          </button>
        )}

        <p className="text-[11px] text-gray-600 mt-2">
          Token balance: <span className="text-gray-400 font-medium">{s.tokenBalance}</span> · each delivered signal costs 1
        </p>
      </div>

      {/* Recent activity */}
      {s.recent.length > 0 && (
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Recent dispatches</span>
          <div className="mt-2 space-y-1.5">
            {s.recent.slice(0, 8).map(d => (
              <div key={d.id} className="flex items-center gap-2 text-[11px] bg-white/[0.02] rounded-lg px-3 py-2">
                <span className="font-semibold text-gray-300 w-24 shrink-0 truncate">{d.display}</span>
                <span className={d.decision === 'BUY' ? 'text-emerald-400' : 'text-red-400'}>{d.decision}</span>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${STATUS_STYLE[d.status] ?? STATUS_STYLE.dispatched}`}>
                  {d.status}
                </span>
                {d.filledPrice && <span className="text-gray-500 tabular-nums">@ {d.filledPrice}</span>}
                {d.ackNote && <span className="text-gray-600 truncate hidden sm:block">{d.ackNote}</span>}
                <span className="text-gray-700 ml-auto shrink-0">
                  {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {msg && <p className="mt-3 text-xs text-red-300">{msg}</p>}
    </div>
  )
}
