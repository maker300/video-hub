'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import {
  Check, Loader2, ShieldCheck, ArrowLeft, Sparkles,
  BookOpen, Play, MessageSquare, Award, Infinity as InfinityIcon, Video, Coins,
} from 'lucide-react'

interface Props {
  price:         number   // pence, already resolved for this user
  legacy:        boolean
  standardPrice: number
  moduleCount:   number
  lessonCount:   number
  hours:         number
  bonusTokens:   number
  liveCalls:     number
  liveWeeks:     number
}

function gbp(pence: number) {
  return `£${(pence / 100).toFixed(pence % 100 === 0 ? 0 : 2)}`
}

export default function PurchaseClient({
  price, legacy, standardPrice, moduleCount, lessonCount, hours,
  bonusTokens, liveCalls, liveWeeks,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function checkout() {
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ kind: 'course' }),
      })
      const d = await res.json()
      if (!res.ok || !d.url) throw new Error(d.error ?? 'Could not start checkout.')
      window.location.href = d.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout.')
      setBusy(false)
    }
  }

  const includes = [
    { Icon: BookOpen,      text: `All ${moduleCount} modules · ${lessonCount} lessons`, highlight: false },
    { Icon: Video,         text: `${liveCalls} live group calls with a moderator — one a week for ${liveWeeks} weeks`, highlight: true },
    { Icon: Coins,         text: `${bonusTokens} bonus FM Trader tokens on top of your signup tokens`, highlight: true },
    { Icon: Play,          text: `${hours}+ hours of video, with animated lesson visuals`, highlight: false },
    { Icon: Award,         text: 'Quizzes after every lesson to check understanding', highlight: false },
    { Icon: MessageSquare, text: 'AI tutor — ask questions on any lesson, any time', highlight: false },
    { Icon: InfinityIcon,  text: 'Lifetime access · one payment, no subscription', highlight: false },
  ]

  return (
    <div className="min-h-screen bg-[#080e1a] text-white">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link
          href="/course"
          className="inline-flex items-center gap-1.5 min-h-11 text-sm text-gray-400 hover:text-white transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to curriculum
        </Link>

        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Get full course access</h1>
          <p className="text-gray-400 mt-2 text-sm leading-relaxed">
            One payment unlocks every module for life, plus live group calls with a moderator and bonus
            FM Trader tokens. No subscription, no renewal.
          </p>
        </header>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Price card */}
          <div className="md:col-span-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sticky top-20">
              {legacy && (
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-1 mb-3">
                  <Sparkles className="w-3 h-3" />
                  Existing member
                </div>
              )}

              <div className="flex items-end gap-2">
                <span className="text-4xl font-black">{gbp(price)}</span>
                {legacy && (
                  <span className="text-lg text-gray-600 line-through mb-1">{gbp(standardPrice)}</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">One-off payment · lifetime access</p>

              {legacy && (
                <p className="text-[11px] text-emerald-300/90 mt-3 leading-relaxed">
                  You joined before the course became paid, so you keep the reduced member price.
                </p>
              )}

              <button
                onClick={checkout}
                disabled={busy}
                className="mt-5 w-full flex items-center justify-center gap-2 bg-[#1D9E75] hover:bg-[#17856A] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {busy ? 'Starting checkout…' : `Pay ${gbp(price)}`}
              </button>

              {error && <p className="mt-3 text-xs text-red-300">{error}</p>}

              <p className="text-[11px] text-gray-600 mt-3 text-center leading-relaxed">
                Secure payment via Stripe. Card details never touch our servers.
              </p>
            </div>
          </div>

          {/* What's included */}
          <div className="md:col-span-3">
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
                What&apos;s included
              </h2>
              <ul className="space-y-3">
                {includes.map(({ Icon, text, highlight }) => (
                  <li key={text} className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      highlight ? 'bg-amber-500/15' : 'bg-emerald-500/10'
                    }`}>
                      <Icon className={`w-3.5 h-3.5 ${highlight ? 'text-amber-400' : 'text-emerald-400'}`} />
                    </div>
                    <span className={`text-sm leading-relaxed ${highlight ? 'text-white font-medium' : 'text-gray-300'}`}>
                      {text}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 pt-5 border-t border-white/10 space-y-2.5">
                {[
                  'The first lesson stays free — try before you buy',
                  `Your existing tokens are kept — the ${bonusTokens} bonus is added on top`,
                  'Progress you have already made is kept',
                ].map(t => (
                  <div key={t} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-500 leading-relaxed">{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-gray-600 mt-4 leading-relaxed">
              Forex Mastery is an educational platform. Course content is for learning purposes and does not
              constitute financial advice. Trading carries substantial risk of loss.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
