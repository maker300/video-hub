'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { TOKEN_PACKS } from '@/lib/tokens'
import { Coins, Check, Loader2, AlertCircle } from 'lucide-react'

function gbp(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}

export default function TokensClient() {
  const params    = useSearchParams()
  const cancelled = params.get('payment') === 'cancelled'

  const [balance, setBalance] = useState<number | null>(null)
  const [exempt,  setExempt]  = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/tokens/balance')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setBalance(d.balance); setExempt(!!d.exempt) } })
      .catch(() => { /* balance is informational — the page still works */ })
  }, [])

  async function handleBuy(packId: string) {
    setError(null)
    setLoading(packId)
    try {
      const res  = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ packId }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Could not start checkout.')
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout.')
      setLoading(null)
    }
  }

  // Cheapest pack sets the baseline the others are compared against.
  const baseRate = TOKEN_PACKS[0].price / TOKEN_PACKS[0].tokens

  return (
    <div className="min-h-screen bg-[#080e1a] text-white">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1 mb-4">
            <Coins className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-300 text-xs font-semibold">FM Trader tokens</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">Buy tokens</h1>
          <p className="text-gray-400 mt-3 max-w-xl mx-auto">
            One token runs FM Trader once, on any instrument you choose.
            Charts, analysis and the economic calendar stay free — you only pay
            when you ask for a prediction.
          </p>

          {balance !== null && !exempt && (
            <div className="mt-6 inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-2">
              <Coins className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-300">
                Balance: <strong className="text-white">{balance}</strong> token{balance === 1 ? '' : 's'}
              </span>
            </div>
          )}
          {exempt && (
            <div className="mt-6 inline-block text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5">
              Admin account — FM Trader runs are not charged.
            </div>
          )}
        </header>

        {cancelled && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-200">
            Checkout cancelled — you have not been charged.
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span className="text-sm text-red-200">{error}</span>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-3">
          {TOKEN_PACKS.map(pack => {
            const rate  = pack.price / pack.tokens
            const saving = Math.round((1 - rate / baseRate) * 100)
            return (
              <div
                key={pack.id}
                className={`relative bg-[#0d1b2a] rounded-xl p-6 border transition-colors ${
                  pack.popular
                    ? 'border-emerald-500/50 ring-1 ring-emerald-500/20'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                {pack.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-[#052e21] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    Most popular
                  </span>
                )}

                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">{pack.label}</h2>

                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-white">{gbp(pack.price)}</span>
                </div>

                <div className="mt-2 text-emerald-300 font-semibold">
                  {pack.tokens.toLocaleString()} tokens
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {(rate).toFixed(1)}p per run
                  {saving > 0 && <span className="text-emerald-400 ml-1.5">· {saving}% better rate</span>}
                </div>

                <ul className="mt-5 space-y-2 text-sm text-gray-300">
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    {pack.tokens.toLocaleString()} FM Trader runs
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    Any instrument, any timeframe
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    Tokens never expire
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    Refunded automatically if a run fails
                  </li>
                </ul>

                <button
                  onClick={() => handleBuy(pack.id)}
                  disabled={loading !== null}
                  className={`mt-6 w-full py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    pack.popular
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-[#052e21]'
                      : 'bg-white/10 hover:bg-white/15 text-white'
                  }`}
                >
                  {loading === pack.id
                    ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</span>
                    : `Buy ${pack.tokens.toLocaleString()} tokens`}
                </button>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-600 mt-8">
          Secure payment via Stripe. One-off purchase — no subscription, nothing recurring.
        </p>
      </div>
    </div>
  )
}
