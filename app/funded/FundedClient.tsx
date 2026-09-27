'use client'

import { useCallback, useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import TradingTerminal from '@/components/funded/TradingTerminal'
import {
  Trophy, Loader2, ShieldCheck, Target, TrendingDown, CalendarDays,
  Percent, AlertTriangle, Check, X, Activity, Info,
} from 'lucide-react'

interface Progress {
  equity: number; startingBalance: number; profit: number; profitPct: number
  targetEquity: number; drawdownFloor: number; dailyLossFloor: number | null
  progressPct: number; tradingDays: number; daysRemaining: number; canPass: boolean
}
interface FundedInfo {
  equity: number; baseline: number; grossProfit: number
  traderShare: number; firmShare: number; drawdownFloor: number
  canRequestPayout: boolean
}
interface Payout {
  id: string; amount: number; grossProfit: number
  status: string; requestedAt: string; paidAt: string | null; note: string | null
}
interface Evaluation {
  id: string; status: string; phase: string
  fundedBalance: number | null; fundedAt: string | null
  phase1TargetPct: number; phase2TargetPct: number; phase1PassedAt: string | null
  funded: FundedInfo | null
  payouts: Payout[]
  accountSize: number; feePaid: number
  profitTargetPct: number; maxDrawdownPct: number; maxDailyLossPct: number
  minTradingDays: number; profitSplitPct: number
  breachReason: string | null
  startedAt: string; passedAt: string | null; endedAt: string | null
  lastEquityAt: string | null
  progress: Progress
}
interface Terms {
  feePaid: number; accountSize: number; fundedBalance: number
  profitTargetPct: number; phase1TargetPct: number; phase2TargetPct: number
  maxDrawdownPct: number; maxDailyLossPct: number
  minTradingDays: number; profitSplitPct: number
}

const gbp = (p: number) =>
  `£${(p / 100).toLocaleString('en-GB', { maximumFractionDigits: 2 })}`

const STATUS: Record<string, { label: string; cls: string }> = {
  evaluation: { label: 'In progress', cls: 'text-amber-300 bg-amber-500/10 border-amber-500/30' },
  passed:     { label: 'Passed',      cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
  funded:     { label: 'Funded',      cls: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/40' },
  breached:   { label: 'Breached',    cls: 'text-red-300 bg-red-500/10 border-red-500/30' },
  cancelled:  { label: 'Cancelled',   cls: 'text-gray-400 bg-white/5 border-white/15' },
}

export default function FundedClient() {
  const [evals,   setEvals]   = useState<Evaluation[]>([])
  const [tiers,   setTiers]   = useState<Terms[]>([])
  const [loading, setLoading] = useState(true)
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState('')

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/evaluation')
      if (r.ok) { const d = await r.json(); setEvals(d.evaluations ?? []); setTiers(d.tiers ?? []) }
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  async function buy(tierIndex: number) {
    setBusy(true); setError('')
    try {
      const r = await fetch('/api/stripe/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'evaluation', tier: tierIndex }),
      })
      const d = await r.json()
      if (!r.ok || !d.url) throw new Error(d.error ?? 'Could not start checkout.')
      window.location.href = d.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout.')
      setBusy(false)
    }
  }

  const active = evals.find(e => ['evaluation', 'passed', 'funded'].includes(e.status))

  return (
    <div className="min-h-screen bg-[#080e1a] text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-full px-3 py-1 mb-4">
            <Trophy className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-amber-300 text-xs font-semibold">Funded account</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Prove it, then trade our capital</h1>
          <p className="text-gray-400 mt-2 text-sm leading-relaxed">
            Trade directly on our platform — no broker, no MT5, nothing to install. Hit the target under real
            risk rules and we fund you — you keep the majority of the profit.
          </p>
        </header>

        {loading && <p className="text-gray-500 text-sm">Loading…</p>}

        {!loading && active && (
          <ActiveCard e={active} onChange={load} />
        )}

        {!loading && !active && tiers.length > 0 && (
          <>
            <div className="grid sm:grid-cols-3 gap-4 mb-5">
              {tiers.map((t, i) => (
                <div
                  key={t.feePaid}
                  className={`rounded-2xl p-5 border ${
                    i === 1
                      ? 'bg-amber-500/[0.06] border-amber-500/30'
                      : 'bg-white/5 border-white/10'}`}
                >
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black">{gbp(t.feePaid)}</span>
                    <span className="text-gray-500 mb-1 text-xs">one-off</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {gbp(t.accountSize)} funded on passing &middot; {t.profitSplitPct}% split
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="bg-white/[0.03] border border-white/10 rounded-lg p-2.5">
                      <div className="text-[10px] text-gray-500">Phase 1</div>
                      <div className="text-sm font-bold text-white">+{t.phase1TargetPct}%</div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/10 rounded-lg p-2.5">
                      <div className="text-[10px] text-amber-300/80">Phase 2</div>
                      <div className="text-sm font-bold text-white">+{t.phase2TargetPct}%</div>
                    </div>
                  </div>

                  <button
                    onClick={() => buy(i)}
                    disabled={busy}
                    className={`mt-4 w-full flex items-center justify-center gap-2 disabled:opacity-50 font-bold py-2.5 rounded-xl transition text-sm ${
                      i === 1
                        ? 'bg-amber-500 hover:bg-amber-400 text-[#2b1a02]'
                        : 'bg-white/10 hover:bg-white/15 text-white'}`}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Start — {gbp(t.feePaid)}
                  </button>
                </div>
              ))}
            </div>
            {error && <p className="mb-5 text-xs text-red-300">{error}</p>}

            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { Icon: TrendingDown, label: 'Max drawdown',     value: `${tiers[0].maxDrawdownPct}%`,   sub: 'peak to trough' },
                { Icon: Activity,     label: 'Max daily loss',   value: `${tiers[0].maxDailyLossPct}%`,  sub: 'from day open' },
                { Icon: CalendarDays, label: 'Min trading days', value: `${tiers[0].minTradingDays}`,    sub: 'per phase' },
                { Icon: Trophy,       label: 'Same rules',        value: 'Every tier',                    sub: 'only the size scales' },
              ].map(r => (
                <div key={r.label} className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <r.Icon className="w-3 h-3" /> {r.label}
                  </div>
                  <div className="text-lg font-bold text-white mt-0.5">{r.value}</div>
                  <div className="text-[10px] text-gray-600">{r.sub}</div>
                </div>
              ))}
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 mb-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">How it works</h2>
              <ol className="space-y-3">
                {[
                  'Pick a tier and pay the one-off fee — your trading terminal unlocks right here on the site, nothing to install.',
                  `Phase 1: reach +${tiers[0].phase1TargetPct}% on your tier's account over at least ${tiers[0].minTradingDays} trading days, without breaching the drawdown rules.`,
                  `Phase 2: the account resets and you do it again with a +${tiers[0].phase2TargetPct}% target. Phase 2 is the harder one.`,
                  `Clear both and we fund you with our capital at the same size as your tier's account, on an ${tiers[0].profitSplitPct}% profit split. The capital at risk is ours, not yours.`,
                ].map((t, i) => (
                  <li key={t} className="flex gap-3">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-300 leading-relaxed">{t}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex gap-2.5 bg-white/[0.03] border border-white/10 rounded-xl p-4">
              <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-500 leading-relaxed">
                This is a skills evaluation, not an investment. Your fee buys the evaluation itself — it is not
                deposited, pooled, or traded, and we do not manage money on your behalf. Evaluation and funded
                accounts trade on our own simulated engine, priced from live market data — no broker, no real
                money moves until you&apos;re funded, and at the funded stage the capital at risk is ours. Trading
                carries substantial risk of loss.
              </p>
            </div>
          </>
        )}

        {/* History */}
        {!loading && evals.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Your evaluations</h2>
            <div className="space-y-2">
              {evals.map(e => {
                const st = STATUS[e.status] ?? STATUS.cancelled
                return (
                  <div key={e.id} className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${st.cls}`}>
                        {st.label}
                      </span>
                      <span className="text-xs text-gray-300">{gbp(e.accountSize)} account</span>
                      <span className="text-[11px] text-gray-600 ml-auto">
                        {new Date(e.startedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {e.breachReason && (
                      <p className="text-[11px] text-red-300/90 mt-1.5 leading-relaxed">{e.breachReason}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ActiveCard({ e, onChange }: { e: Evaluation; onChange: () => void }) {
  const [payBusy, setPayBusy] = useState(false)
  const [payMsg,  setPayMsg]  = useState('')

  async function requestPayout() {
    setPayBusy(true); setPayMsg('')
    try {
      const r = await fetch('/api/evaluation/payout', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not request a payout.')
      setPayMsg('Payout requested — we\u2019ll confirm by email.')
      onChange()
    } catch (err) {
      setPayMsg(err instanceof Error ? err.message : 'Could not request a payout.')
    } finally { setPayBusy(false) }
  }

  // A funded account has its own dashboard — profit is measured against the
  // payout baseline, not the original evaluation target.
  if (e.status === 'funded' && e.funded) {
    return <FundedCard e={e} f={e.funded} busy={payBusy} msg={payMsg} onRequest={requestPayout} />
  }

  const p  = e.progress
  const st = STATUS[e.status] ?? STATUS.evaluation
  const inProfit = p.profit >= 0

  return (
    <div className="space-y-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${st.cls}`}>
            {st.label}
          </span>
          {e.status === 'evaluation' && (
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
              e.phase === 'phase2'
                ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                : 'text-blue-300 bg-blue-500/10 border-blue-500/30'}`}>
              {e.phase === 'phase2' ? 'Phase 2 of 2' : 'Phase 1 of 2'}
            </span>
          )}
          <span className="text-sm text-gray-400">
            {gbp(e.accountSize)} account &middot; +{e.profitTargetPct}% target
          </span>
          {e.lastEquityAt && (
            <span className="text-[11px] text-gray-600 ml-auto">
              Updated {new Date(e.lastEquityAt).toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex items-end gap-3 mb-1">
          <span className="text-4xl font-black tabular-nums">{gbp(p.equity)}</span>
          <span className={`text-sm font-semibold mb-1.5 tabular-nums ${inProfit ? 'text-emerald-400' : 'text-red-400'}`}>
            {inProfit ? '+' : ''}{gbp(p.profit)} ({inProfit ? '+' : ''}{p.profitPct.toFixed(2)}%)
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-4">Target {gbp(p.targetEquity)}</p>

        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1.5">
          <div
            className={`h-full rounded-full transition-all ${p.canPass ? 'bg-emerald-500' : 'bg-amber-500'}`}
            style={{ width: `${p.progressPct}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-600">{p.progressPct.toFixed(0)}% of profit target</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
          <Stat label="Trading days" value={`${p.tradingDays} / ${e.minTradingDays}`}
                ok={p.tradingDays >= e.minTradingDays} />
          <Stat label="Drawdown floor" value={gbp(p.drawdownFloor)} danger />
          {p.dailyLossFloor != null && (
            <Stat label="Today's floor" value={gbp(p.dailyLossFloor)} danger />
          )}
        </div>
      </div>

      {e.status === 'evaluation' && (
        <div className="flex gap-2.5 bg-amber-500/[0.07] border border-amber-500/25 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            Equity below <strong>{gbp(p.drawdownFloor)}</strong> ends the evaluation
            {p.dailyLossFloor != null && <> — as does closing today below <strong>{gbp(p.dailyLossFloor)}</strong></>}.
          </p>
        </div>
      )}

      {e.status === 'passed' && (
        <div className="flex gap-2.5 bg-emerald-500/[0.07] border border-emerald-500/30 rounded-xl p-4">
          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-emerald-200/90 leading-relaxed">
            You passed. We&apos;ll be in touch to set up your funded account on a {e.profitSplitPct}% profit split.
          </p>
        </div>
      )}

      {e.status === 'breached' && e.breachReason && (
        <div className="flex gap-2.5 bg-red-500/[0.07] border border-red-500/30 rounded-xl p-4">
          <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-200/90 leading-relaxed">{e.breachReason}</p>
        </div>
      )}

      {(e.status === 'evaluation' || e.status === 'funded') && (
        <TradingTerminal evaluationId={e.id} status={e.status} />
      )}
    </div>
  )
}

function FundedCard({ e, f, busy, msg, onRequest }: {
  e: Evaluation; f: FundedInfo; busy: boolean; msg: string; onRequest: () => void
}) {
  const pending = e.payouts.find(p => p.status === 'requested')
  const inProfit = f.equity >= f.baseline

  return (
    <div className="space-y-4">
      <div className="bg-emerald-500/[0.06] border border-emerald-500/30 rounded-2xl p-6">
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded border text-emerald-300 bg-emerald-500/15 border-emerald-500/40">
            Funded
          </span>
          <span className="text-sm text-gray-400">
            {gbp(e.fundedBalance ?? 0)} of firm capital &middot; {e.profitSplitPct}% split
          </span>
          {e.lastEquityAt && (
            <span className="text-[11px] text-gray-600 ml-auto">
              Updated {new Date(e.lastEquityAt).toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex items-end gap-3 mb-1">
          <span className="text-4xl font-black tabular-nums">{gbp(f.equity)}</span>
          <span className={`text-sm font-semibold mb-1.5 tabular-nums ${inProfit ? 'text-emerald-400' : 'text-red-400'}`}>
            {inProfit ? '+' : ''}{gbp(f.equity - f.baseline)} vs baseline
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Payout baseline {gbp(f.baseline)} &middot; drawdown floor {gbp(f.drawdownFloor)}
        </p>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="Gross profit" value={gbp(f.grossProfit)} />
          <Stat label="Your share" value={gbp(f.traderShare)} ok={f.traderShare > 0} />
          <Stat label="Firm share" value={gbp(f.firmShare)} />
        </div>

        {pending ? (
          <div className="mt-5 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
            <Loader2 className="w-4 h-4 text-amber-300 animate-spin shrink-0" />
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              Payout of <strong>{gbp(pending.amount)}</strong> requested on{' '}
              {new Date(pending.requestedAt).toLocaleDateString()} — awaiting review.
            </p>
          </div>
        ) : (
          <>
            <button
              onClick={onRequest}
              disabled={busy || !f.canRequestPayout}
              className="mt-5 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Percent className="w-4 h-4" />}
              {f.canRequestPayout ? `Request payout — ${gbp(f.traderShare)}` : 'Not enough profit to withdraw yet'}
            </button>
            {msg && <p className="mt-3 text-xs text-gray-400">{msg}</p>}
          </>
        )}
      </div>

      <div className="flex gap-2.5 bg-amber-500/[0.07] border border-amber-500/25 rounded-xl p-4">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-200/90 leading-relaxed">
          The drawdown rules still apply. Equity at or below <strong>{gbp(f.drawdownFloor)}</strong> revokes the
          funded account.
        </p>
      </div>

      {e.payouts.length > 0 && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Payouts</h2>
          <div className="space-y-2">
            {e.payouts.map(p => (
              <div key={p.id} className="flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5">
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                  p.status === 'paid'     ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                  : p.status === 'rejected' ? 'text-red-300 bg-red-500/10 border-red-500/30'
                  : 'text-amber-300 bg-amber-500/10 border-amber-500/30'}`}>
                  {p.status}
                </span>
                <span className="text-sm font-semibold text-white tabular-nums">{gbp(p.amount)}</span>
                <span className="text-[11px] text-gray-600">of {gbp(p.grossProfit)} profit</span>
                <span className="text-[11px] text-gray-700 ml-auto">
                  {new Date(p.paidAt ?? p.requestedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <TradingTerminal evaluationId={e.id} status={e.status} />
    </div>
  )
}

function Stat({ label, value, ok, danger }: { label: string; value: string; ok?: boolean; danger?: boolean }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wider text-gray-500 flex items-center gap-1">
        {ok && <Check className="w-3 h-3 text-emerald-400" />}
        {label}
      </div>
      <div className={`text-sm font-bold mt-0.5 tabular-nums ${danger ? 'text-red-300' : ok ? 'text-emerald-300' : 'text-white'}`}>
        {value}
      </div>
    </div>
  )
}
