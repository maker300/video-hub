'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  TrendingUp, ShieldCheck, Clock, Zap, CheckCircle2,
  ArrowLeft, Loader2, Star, AlertCircle,
} from 'lucide-react'
import { PLANS } from '@/lib/plans'

const FEATURES = [
  { icon: <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />,  text: 'Live multi-timeframe analysis for 60+ instruments' },
  { icon: <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />, text: 'FM Trader — AI-powered buy/sell signals updated every hour' },
  { icon: <Clock className="w-4 h-4 text-emerald-400 shrink-0" />,       text: 'Real-time price feeds updated every 5 seconds' },
  { icon: <Zap className="w-4 h-4 text-emerald-400 shrink-0" />,         text: 'Forex, commodities, indices & crypto coverage' },
]

function PlansContent() {
  const { data: session, status } = useSession()
  const router      = useRouter()
  const params      = useSearchParams()
  const cancelled   = params.get('payment') === 'cancelled'

  const [loading, setLoading] = useState<string | null>(null)
  const [error,   setError]   = useState('')

  async function handleBuy(planId: string) {
    if (status === 'loading') return
    if (!session?.user) {
      router.push(`/auth/signin?callbackUrl=/analysis/plans`)
      return
    }

    setError('')
    setLoading(planId)

    try {
      const res  = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ planId }),
      })
      const data = await res.json()

      if (!res.ok || !data.url) {
        setError(data.error ?? 'Failed to start checkout. Please try again.')
        setLoading(null)
        return
      }

      window.location.assign(data.url)
    } catch {
      setError('Connection error. Please try again.')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#080e1a] px-4 py-12">
      <div className="max-w-5xl mx-auto">

        {/* Back */}
        <Link
          href="/analysis"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Analysis
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">
            Unlock Market Analysis
          </h1>
          <p className="text-gray-400 text-base max-w-xl mx-auto">
            Get full access to live signals, FM Trader, and real-time price data across 60+ instruments.
          </p>
        </div>

        {/* Cancelled notice */}
        {cancelled && (
          <div className="mb-8 max-w-xl mx-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Payment was cancelled. Your card was not charged — choose a plan below whenever you&apos;re ready.
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-8 max-w-xl mx-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Plans grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {PLANS.map(plan => {
            const months   = plan.days === 30 ? 1 : plan.days === 90 ? 3 : plan.days === 180 ? 6 : 12
            const perMonth = (plan.price / 100 / months).toFixed(2)
            const total    = (plan.price / 100).toFixed(2)
            const isLoading = loading === plan.id

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-6 transition ${
                  plan.popular
                    ? 'bg-[#1D9E75]/8 border-[#1D9E75]/50 ring-1 ring-[#1D9E75]/30'
                    : 'bg-[#131722] border-white/10'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1 bg-[#1D9E75] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                      <Star className="w-2.5 h-2.5" /> Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-sm font-bold text-white mb-1">{plan.label}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">£{perMonth}</span>
                    <span className="text-xs text-gray-500">/mo</span>
                  </div>
                  {plan.id !== 'monthly' && (
                    <p className="text-xs text-emerald-400 mt-0.5">£{total} billed once</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{plan.desc}</p>
                </div>

                <button
                  onClick={() => handleBuy(plan.id)}
                  disabled={!!loading}
                  className={`mt-auto w-full py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
                    plan.popular
                      ? 'bg-[#1D9E75] hover:bg-[#22b886] text-white disabled:opacity-60'
                      : 'bg-white/8 hover:bg-white/15 border border-white/15 text-white disabled:opacity-60'
                  }`}
                >
                  {isLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</>
                    : !session?.user
                    ? 'Sign in to buy'
                    : 'Get access'}
                </button>
              </div>
            )
          })}
        </div>

        {/* Features */}
        <div className="max-w-xl mx-auto bg-[#131722] border border-white/10 rounded-2xl p-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Everything included with any plan</p>
          <div className="space-y-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                {f.icon}
                <span className="text-sm text-gray-300">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust */}
        <div className="text-center mt-8 space-y-2">
          <div className="flex items-center justify-center gap-6 text-xs text-gray-600">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Secure payment via Stripe</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Access granted instantly</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> No recurring charge</span>
          </div>
          <p className="text-xs text-gray-700">All prices in GBP. One-time payment — no subscription, no auto-renewal.</p>
        </div>
      </div>
    </div>
  )
}

export default function PlansPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080e1a] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    }>
      <PlansContent />
    </Suspense>
  )
}
