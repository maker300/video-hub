'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Zap, Clock, ShieldCheck, Star, ArrowRight, X } from 'lucide-react'

const SLIDES = [
  {
    badge:    'FM Trader — AI Signal Engine',
    headline: 'Institutional-grade buy/sell signals',
    sub:      'Weekly · Daily · 4H · 1H analysis on 60+ instruments. Every hour, automatically.',
    icon:     <TrendingUp className="w-5 h-5" />,
    color:    'from-emerald-500/20 to-teal-500/10',
    accent:   'text-emerald-400',
    border:   'border-emerald-500/25',
    pill:     'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  {
    badge:    'From £13.50 / month',
    headline: 'Pick the plan that fits your trading',
    sub:      '1 month · 3 months · 6 months · 12 months — cancel any time.',
    icon:     <Star className="w-5 h-5" />,
    color:    'from-amber-500/20 to-yellow-500/10',
    accent:   'text-amber-400',
    border:   'border-amber-500/25',
    pill:     'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  {
    badge:    'Live Price Feeds',
    headline: 'Real-time data. Updated every 5 seconds.',
    sub:      'Forex, commodities, indices & crypto. Always fresh, never stale.',
    icon:     <Zap className="w-5 h-5" />,
    color:    'from-blue-500/20 to-indigo-500/10',
    accent:   'text-blue-400',
    border:   'border-blue-500/25',
    pill:     'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  {
    badge:    'Session-Aware Signals',
    headline: 'Signals only when markets are alive',
    sub:      'London open · NY session · Asian session instruments. No dead-session noise.',
    icon:     <Clock className="w-5 h-5" />,
    color:    'from-violet-500/20 to-purple-500/10',
    accent:   'text-violet-400',
    border:   'border-violet-500/25',
    pill:     'bg-violet-500/15 text-violet-300 border-violet-500/30',
  },
  {
    badge:    '3-Months Most Popular',
    headline: 'Save £5.40 — get 3 months for £35.10',
    sub:      'Full access to FM Trader, AI signals, live data & 60+ instruments.',
    icon:     <ShieldCheck className="w-5 h-5" />,
    color:    'from-rose-500/20 to-pink-500/10',
    accent:   'text-rose-400',
    border:   'border-rose-500/25',
    pill:     'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
]

const INTERVAL_MS = 30000

export default function AdBanner() {
  const [current,   setCurrent]   = useState(0)
  const [animDir,   setAnimDir]   = useState<'in' | 'out'>('in')
  const [dismissed, setDismissed] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  function startTimer() {
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(() => {
      setAnimDir('out')
      setTimeout(() => {
        setCurrent(c => (c + 1) % SLIDES.length)
        setAnimDir('in')
      }, 300)
    }, INTERVAL_MS)
  }

  useEffect(() => {
    startTimer()
    return () => { if (timer.current) clearInterval(timer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function goTo(idx: number) {
    if (idx === current) return
    setAnimDir('out')
    setTimeout(() => {
      setCurrent(idx)
      setAnimDir('in')
      startTimer()
    }, 250)
  }

  if (dismissed) return null

  const slide = SLIDES[current]

  return (
    <div className={`w-full border-t ${slide.border} bg-gradient-to-r ${slide.color} backdrop-blur-sm transition-colors duration-700`}>
      {/* Advertisement label */}
      <div className="flex items-center justify-between px-3 pt-1 pb-0">
        <span className="text-[9px] text-gray-600 uppercase tracking-widest font-medium select-none">
          Advertisement
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-600 hover:text-gray-400 transition-colors p-0.5 rounded"
          aria-label="Dismiss banner"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Slide content */}
      <Link
        href="/analysis/plans"
        className="flex items-center justify-between gap-4 px-4 py-2.5 group"
        style={{
          opacity:   animDir === 'in' ? 1 : 0,
          transform: animDir === 'in' ? 'translateY(0)' : 'translateY(-6px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}
      >
        {/* Left: icon + text */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`shrink-0 ${slide.accent} opacity-80`}>
            {slide.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${slide.pill}`}>
                {slide.badge}
              </span>
            </div>
            <p className={`text-sm font-bold ${slide.accent} leading-tight mt-0.5 truncate`}>
              {slide.headline}
            </p>
            <p className="text-[11px] text-gray-400 leading-tight truncate hidden sm:block">
              {slide.sub}
            </p>
          </div>
        </div>

        {/* Right: CTA */}
        <div className={`shrink-0 flex items-center gap-1.5 text-xs font-bold ${slide.accent} group-hover:gap-2.5 transition-all`}>
          <span className="hidden sm:inline">View Plans</span>
          <ArrowRight className="w-4 h-4" />
        </div>
      </Link>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5 pb-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? `w-4 h-1.5 ${slide.accent.replace('text-', 'bg-')} opacity-80`
                : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
