'use client'

import Link from 'next/link'
import { Lock, TrendingUp, ShieldCheck, Clock, Zap, ArrowRight } from 'lucide-react'
import { PLANS } from '@/lib/plans'

export default function AnalysisAccessDenied() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-[#1D9E75]/10 border border-[#1D9E75]/20 flex items-center justify-center">
            <Lock className="w-9 h-9 text-[#1D9E75]" />
          </div>
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-black text-white mb-2">Analysis Access Required</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            Unlock live signals, FM Trader buy/sell predictions, and real-time price data across 60+ instruments.
          </p>
        </div>

        {/* Features */}
        <div className="bg-[#131722] border border-white/10 rounded-2xl p-5 text-left space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">What you get with access</p>
          {[
            { icon: <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />, text: 'Live multi-timeframe analysis for 60+ instruments' },
            { icon: <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />, text: 'FM Trader — hourly AI buy/sell signals' },
            { icon: <Clock className="w-4 h-4 text-emerald-400 shrink-0" />,       text: 'Real-time prices updated every 5 seconds' },
            { icon: <Zap className="w-4 h-4 text-emerald-400 shrink-0" />,         text: 'Forex, commodities, indices & crypto' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              {item.icon}
              <span className="text-sm text-gray-300">{item.text}</span>
            </div>
          ))}
        </div>

        {/* Pricing teaser */}
        <div className="bg-[#1D9E75]/8 border border-[#1D9E75]/25 rounded-2xl px-5 py-4">
          <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">Plans from</p>
          <p className="text-2xl font-black text-white">£{(PLANS[0].price / 100).toFixed(2)} <span className="text-sm font-normal text-gray-400">/ month</span></p>
          <p className="text-xs text-gray-500 mt-1">One-time payment · No auto-renewal · Instant access</p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/analysis/plans"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#1D9E75] hover:bg-[#22b886] text-white text-sm font-semibold rounded-xl transition"
          >
            View Plans <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/course"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-sm font-semibold rounded-xl transition"
          >
            Continue Learning
          </Link>
        </div>

        <p className="text-xs text-gray-600">
          Already purchased?{' '}
          <Link href="/auth/signin" className="text-[#1D9E75] hover:underline">Sign in again</Link>
          {' '}to refresh your access.
        </p>
      </div>
    </div>
  )
}
