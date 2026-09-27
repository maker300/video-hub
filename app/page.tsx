import Link from 'next/link'
import {
  TrendingUp, BookOpen, Clock, Star, ChevronRight, Play, Award, BarChart2, Shield,
  LineChart, CalendarClock, MessagesSquare, Zap, Sparkles, Radio, Bot, Check, Video,
} from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import ModuleList from '@/components/ModuleList'
import ProgressTracker from '@/components/ProgressTracker'
import { courseModules, totalLessons } from '@/lib/courseData'
import {
  COURSE_PRICE_STANDARD, COURSE_BONUS_TOKENS,
  COURSE_LIVE_CALLS, COURSE_LIVE_CALL_WEEKS, formatGbp,
} from '@/lib/course-pricing'
import { COACHING_PRICE_MONTHLY, COACHING_SESSIONS_PER_MONTH } from '@/lib/coaching'
import { EVAL_TIERS, EVAL_PHASE1_TARGET_PCT, EVAL_PHASE2_TARGET_PCT, EVAL_PROFIT_SPLIT_PCT, gbp } from '@/lib/evaluation'

// Positioning is platform-wide, not course-only. The page used to sell the
// course exclusively — the platform now covers analysis, live signals, an
// economic calendar with auto-fetched actuals, a community feed, and the
// course. Signed-out visitors need to see all five surfaces on the home
// page, not sign up before they find out about them.
export const metadata = {
  title:       'Forex Mastery — AI Analysis, Live Signals, Course, Calendar',
  description: `Complete forex trading platform: AI-driven per-pair analysis, live signals, an economic calendar with real-time actuals, a trader community feed, and a full ${courseModules.length}-module course.`,
}

const totalDuration = courseModules.reduce(
  (acc, m) => acc + m.lessons.reduce((a, l) => a + l.duration, 0),
  0
)

// One source of truth for the services grid. Ordered by user value on
// first landing: Analysis leads because it's the flagship + revenue driver.
// The Course sits at position 5 so it's still one row above the fold on
// desktop without dominating the page.
interface Service {
  href:     string
  label:    string
  tagline:  string
  Icon:     typeof BookOpen
  accent:   string      // ring/glow colour token
  cta:      string
}

const services: Service[] = [
  {
    href:    '/analysis',
    label:   'FM Trader Analysis',
    tagline: 'AI-driven per-instrument analysis. Entry zone, stop, TP1/TP2/TP3, confidence, session context. 20+ pairs.',
    Icon:    LineChart,
    accent:  'emerald',
    cta:     'Run an analysis',
  },
  {
    href:    '/funded',
    label:   'Funded Account',
    tagline: `Trade directly on our platform — no broker, nothing to install. Evaluations from ${gbp(EVAL_TIERS[0].fee)}, clear both phases and trade our capital on an ${EVAL_PROFIT_SPLIT_PCT}% profit split.`,
    Icon:    Zap,
    accent:  'amber',
    cta:     'Start an evaluation',
  },
  {
    href:    '/analysis/news',
    label:   'Economic Calendar',
    tagline: 'Macro releases with actuals fetched in the minutes after each print. Instrument exposure for every event.',
    Icon:    CalendarClock,
    accent:  'blue',
    cta:     'Today’s releases',
  },
  {
    href:    '/analysis/feed',
    label:   'Trader Feed',
    tagline: 'Daily recaps written as short video scripts, macro posts, and community discussion around the setups.',
    Icon:    MessagesSquare,
    accent:  'violet',
    cta:     'Open the feed',
  },
  {
    href:    '/course',
    label:   'Forex Mastery Course',
    tagline: `${courseModules.length} modules, ${totalLessons} lessons, 4 weekly live calls and 10 bonus tokens. One-off £100.`,
    Icon:    BookOpen,
    accent:  'teal',
    cta:     'Browse curriculum',
  },
  {
    href:    '/coaching',
    label:   '1-on-1 Coaching',
    tagline: '4 private sessions a month with a trading professional, plus a seat in every live trading session we run. £50/month.',
    Icon:    Video,
    accent:  'violet',
    cta:     'Book a session',
  },
  {
    href:    '/profile',
    label:   'Auto-Execute (MT4/5)',
    tagline: 'Run our Expert Advisor in your own MetaTrader terminal. Signals fire as real orders on your broker account, at your risk settings.',
    Icon:    Bot,
    accent:  'purple',
    cta:     'Set up the EA',
  },
]

// Map accent → concrete Tailwind classes. Keeping a static map means the
// JIT compiler sees every class at build time and none get purged.
const accentMap: Record<Service['accent'], { icon: string; ring: string; glow: string; cta: string }> = {
  emerald: { icon: 'text-emerald-400', ring: 'hover:border-emerald-500/40', glow: 'from-emerald-500/10',   cta: 'text-emerald-300' },
  amber:   { icon: 'text-amber-400',   ring: 'hover:border-amber-500/40',   glow: 'from-amber-500/10',     cta: 'text-amber-300'   },
  blue:    { icon: 'text-blue-400',    ring: 'hover:border-blue-500/40',    glow: 'from-blue-500/10',      cta: 'text-blue-300'    },
  violet:  { icon: 'text-violet-400',  ring: 'hover:border-violet-500/40',  glow: 'from-violet-500/10',    cta: 'text-violet-300'  },
  teal:    { icon: 'text-teal-400',    ring: 'hover:border-teal-500/40',    glow: 'from-teal-500/10',      cta: 'text-teal-300'    },
  purple:  { icon: 'text-purple-400',  ring: 'hover:border-purple-500/40',  glow: 'from-purple-500/10',    cta: 'text-purple-300'  },
}

export default async function HomePage() {
  const firstLesson = courseModules[0].lessons[0]
  // Server-side session read so the mobile sticky bar can drop for
  // signed-in users. The page stays a server component with static metadata.
  const session      = await getServerSession(authOptions)
  const isSignedIn   = !!session?.user?.email

  return (
    <div className="min-h-screen bg-[#080e1a] text-white">
      <Navbar />

      {/* ───── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#080e1a] to-[#050d18]" />
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-16 left-1/4 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
        </div>
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#10b981" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-16 sm:pb-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-sm font-medium">AI-assisted forex trading platform</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight mb-6">
              Trade smarter.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                Learn deeper.
              </span>{' '}
              Move faster.
            </h1>

            <p className="text-base sm:text-xl text-gray-400 leading-relaxed mb-8 max-w-2xl">
              Per-pair AI analysis, live signals from our trading desk, macro releases with actuals in minutes, a
              community feed, and a full {courseModules.length}-module forex course &mdash; all in one place.
            </p>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-8 text-sm">
              <div className="flex items-center gap-1.5 text-gray-400">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>20+ instruments</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <LineChart className="w-4 h-4 text-blue-400" />
                <span>Hourly rule-engine + Claude</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <CalendarClock className="w-4 h-4 text-violet-400" />
                <span>Auto-fetched calendar actuals</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <BookOpen className="w-4 h-4 text-teal-400" />
                <span>{totalLessons} lessons</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Funded accounts from {gbp(EVAL_TIERS[0].fee)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>4.9 rating</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/auth/signup"
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/25 text-sm"
              >
                <Play className="w-4 h-4 fill-white" />
                Create free account
              </Link>
              <Link
                href="#pricing"
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold px-6 py-3.5 rounded-xl transition-all text-sm"
              >
                See pricing
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Free account &middot; First lesson free &middot; 10 FM Trader tokens on signup
            </p>
          </div>
        </div>
      </section>


      {/* ───── Proof strip — verifiable facts only ──────────────────────── */}
      <section className="border-y border-white/5 bg-[#0a1120]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '21',                        label: 'Instruments scanned' },
              { value: `${courseModules.length}`,   label: 'Course modules' },
              { value: `${totalLessons}`,           label: 'Lessons' },
              { value: `${Math.round(totalDuration / 60)}+`, label: 'Hours of video' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-white tabular-nums">{stat.value}</div>
                <div className="text-[11px] uppercase tracking-wider text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-600 text-center mt-6 leading-relaxed">
            Forex, metals, indices and crypto &mdash; scanned on a schedule across multiple timeframes.
            Signal performance is tracked openly: every prediction records its outcome, wins and losses alike.
          </p>
        </div>
      </section>

      {/* ───── Services grid — the main navigation surface ──────────────── */}
      <section id="services" className="py-16 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Everything in one platform</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Seven surfaces that work together. Each tile jumps you straight into the tool &mdash; no upsell wall
              between you and the analysis, funded terminal, or feed.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(s => {
              const c = accentMap[s.accent]
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  className={`relative group bg-white/[0.03] border border-white/10 rounded-2xl p-5 transition-all ${c.ring} hover:bg-white/[0.05] overflow-hidden`}
                >
                  <div className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-radial ${c.glow} to-transparent opacity-50 group-hover:opacity-100 transition-opacity blur-2xl pointer-events-none`} />
                  <div className="relative">
                    <div className={`w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center mb-4 ${c.icon}`}>
                      <s.Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1.5">{s.label}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed mb-4">{s.tagline}</p>
                    <div className={`inline-flex items-center gap-1 text-xs font-semibold ${c.cta} opacity-80 group-hover:opacity-100 transition`}>
                      {s.cta}
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>


      {/* ───── How it works — three steps, no jargon ────────────────────── */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">How it works</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Learn the reasoning, get the setup, then decide how it gets executed. You stay in control at
              every step &mdash; we publish analysis, we never touch your broker account.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                n: '01',
                title: 'Analyse',
                body: 'Pick an instrument and run FM Trader. A rule engine scores multi-timeframe confluence, then Claude writes the thesis. You get an entry zone, stop, and three targets with the reasoning behind each.',
              },
              {
                n: '02',
                title: 'Decide',
                body: 'Cross-check against the economic calendar and what the desk is trading live. Every signal carries a confidence score and session context, so you can skip the ones that do not fit your plan.',
              },
              {
                n: '03',
                title: 'Execute',
                body: 'Place it yourself, or install our MetaTrader Expert Advisor and let qualifying signals fire automatically on your own account, sized to your own risk percentage.',
              },
            ].map(step => (
              <div key={step.n} className="relative bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                <div className="text-4xl font-black text-white/10 leading-none mb-3">{step.n}</div>
                <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Feature highlights ───────────────────────────────────────── */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Play className="w-6 h-6 text-emerald-400" />,   title: 'Animated video lessons',  desc: 'Every course lesson comes with an animated Remotion video for visual learning.' },
              { icon: <Award className="w-6 h-6 text-blue-400" />,     title: 'Quizzes + AI tutor',      desc: 'Test understanding after each lesson. Ask the AI tutor anything.' },
              { icon: <BarChart2 className="w-6 h-6 text-purple-400" />, title: 'Progress tracking',      desc: 'Lesson progress, quiz scores, and running FM Trader outcomes on your profile.' },
              { icon: <Shield className="w-6 h-6 text-orange-400" />,  title: 'Learn-first billing',     desc: 'Site tokens: 10 free on signup, 1 per FM Trader run. No timed subscription.' },
            ].map(f => (
              <div key={f.title} className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-1">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ───── Pricing — the offer, stated plainly ──────────────────────── */}
      <section id="pricing" className="py-16 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Pricing</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Start free. Buy the course once for the full curriculum, subscribe to coaching if you want
              direct feedback, or fund a trading account &mdash; pick what you need.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Free */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 flex flex-col">
              <div className="text-sm font-bold text-gray-300 uppercase tracking-wider">Free account</div>
              <div className="mt-3 mb-1 text-4xl font-black text-white">£0</div>
              <p className="text-xs text-gray-500 mb-5">No card required</p>
              <ul className="space-y-2.5 flex-1">
                {[
                  '10 FM Trader tokens on signup',
                  'First course lesson',
                  'Economic calendar with live actuals',
                  'Trader feed and daily recaps',
                ].map(t => (
                  <li key={t} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-400 leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup"
                className="mt-6 block text-center py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-sm font-semibold transition"
              >
                Create free account
              </Link>
            </div>

            {/* Course */}
            <div className="relative bg-emerald-500/[0.06] border border-emerald-500/30 rounded-2xl p-6 flex flex-col">
              <div className="absolute -top-2.5 left-6 text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-[#052e21] px-2 py-0.5 rounded">
                Full access
              </div>
              <div className="text-sm font-bold text-emerald-300 uppercase tracking-wider">Course</div>
              <div className="mt-3 mb-1 text-4xl font-black text-white">{formatGbp(COURSE_PRICE_STANDARD)}</div>
              <p className="text-xs text-gray-500 mb-5">One-off payment &middot; lifetime access</p>
              <ul className="space-y-2.5 flex-1">
                {[
                  `All ${courseModules.length} modules · ${totalLessons} lessons`,
                  `${COURSE_LIVE_CALLS} live group calls with a moderator — one a week for ${COURSE_LIVE_CALL_WEEKS} weeks`,
                  `${COURSE_BONUS_TOKENS} bonus FM Trader tokens`,
                  'Quizzes and the AI tutor on every lesson',
                  'Everything in the free account, kept',
                ].map(t => (
                  <li key={t} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300 leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/course/purchase"
                className="mt-6 block text-center py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition"
              >
                Get full access — {formatGbp(COURSE_PRICE_STANDARD)}
              </Link>
            </div>

            {/* Coaching */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 flex flex-col">
              <div className="text-sm font-bold text-violet-300 uppercase tracking-wider">1-on-1 coaching</div>
              <div className="mt-3 mb-1 text-4xl font-black text-white">{formatGbp(COACHING_PRICE_MONTHLY)}<span className="text-base text-gray-500 font-semibold">/mo</span></div>
              <p className="text-xs text-gray-500 mb-5">Recurring · cancel any time</p>
              <ul className="space-y-2.5 flex-1">
                {[
                  `${COACHING_SESSIONS_PER_MONTH} private sessions a month with a trading professional`,
                  'A seat in every live trading session run that month',
                  'Direct feedback on your own setups and risk',
                ].map(t => (
                  <li key={t} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300 leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/coaching"
                className="mt-6 block text-center py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition"
              >
                Book coaching — {formatGbp(COACHING_PRICE_MONTHLY)}/mo
              </Link>
            </div>
          </div>

          <p className="text-[11px] text-gray-600 mt-5 leading-relaxed">
            FM Trader tokens are sold separately in packs if you run out &mdash; one token runs one analysis on
            any instrument, and tokens never expire. Accounts unused for 6 months are closed automatically;
            accounts with course access or any token purchase are never closed.
          </p>

          {/* Funded evaluation tiers — pulled straight from lib/evaluation.ts
              so this can never drift from what checkout actually charges. */}
          <div className="mt-12">
            <div className="max-w-2xl mb-6">
              <h3 className="text-lg font-bold text-white mb-1.5">Funded evaluation</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Trade directly on our platform — no broker, nothing to install. Same rules on every tier:
                +{EVAL_PHASE1_TARGET_PCT}% in Phase 1, +{EVAL_PHASE2_TARGET_PCT}% in Phase 2, then trade our
                capital on an {EVAL_PROFIT_SPLIT_PCT}% profit split.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {EVAL_TIERS.map((t, i) => (
                <div
                  key={t.fee}
                  className={`rounded-2xl p-5 border ${
                    i === 1 ? 'bg-amber-500/[0.06] border-amber-500/30' : 'bg-white/[0.03] border-white/10'}`}
                >
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-white">{gbp(t.fee)}</span>
                    <span className="text-gray-500 mb-1 text-xs">one-off</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{gbp(t.accountSize)} funded account on passing</p>
                  <Link
                    href="/funded"
                    className={`mt-4 block text-center py-2.5 rounded-xl text-sm font-bold transition ${
                      i === 1
                        ? 'bg-amber-500 hover:bg-amber-400 text-[#2b1a02]'
                        : 'bg-white/10 hover:bg-white/15 text-white'}`}
                  >
                    Start — {gbp(t.fee)}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───── Progress (auth-only content is inside ProgressTracker) ───── */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-white mb-5">Your progress</h2>
          <ProgressTracker />
        </div>
      </section>

      {/* ───── Course curriculum (kept from the previous design) ────────── */}
      <section id="modules" className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Course curriculum</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {totalLessons} lessons across {courseModules.length} modules &middot; fundamentals through advanced strategy
                </p>
              </div>
              <ModuleList />
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-20 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-br from-emerald-900/50 to-[#0d1b2a] h-40 flex items-center justify-center border-b border-white/10">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                    <p className="text-emerald-400 font-bold text-sm">FOREX MASTERY</p>
                    <p className="text-gray-500 text-xs">Complete course</p>
                  </div>
                </div>

                <div className="p-5">
                  <Link
                    href={`/course/${firstLesson.moduleId}/${firstLesson.id}`}
                    className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all mb-4 text-sm"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Start course now
                  </Link>

                  <div className="space-y-3">
                    {[
                      { label: 'Modules', value: courseModules.length },
                      { label: 'Total lessons', value: totalLessons },
                      { label: 'Total duration', value: `${Math.round(totalDuration / 60)}+ hours` },
                      { label: 'Skill level', value: 'Beginner → Advanced' },
                      { label: 'Access', value: 'Lifetime (one-off £100)' },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between text-sm">
                        <span className="text-gray-500">{item.label}</span>
                        <span className="text-white font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Module overview grid (deep discovery for SEO + scanning) ── */}
      <section className="py-16 bg-white/[0.02] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">What you&#39;ll learn</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {courseModules.map(module => (
              <Link
                key={module.id}
                href={`/course/${module.id}/${module.lessons[0].id}`}
                className="group bg-white/5 border border-white/10 hover:border-emerald-500/30 rounded-xl p-4 transition-all hover:bg-white/8"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
                    {module.moduleNumber}
                  </div>
                  <span className="text-xs text-gray-500">{module.lessons.length} lessons</span>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-emerald-300 transition-colors">
                  {module.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{module.description}</p>
                <div className="flex items-center gap-1 mt-3 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs">Start module</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Disclaimer ───────────────────────────────────────────────── */}
      <section className="border-t border-white/[0.06] bg-[#050a12] py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-full px-4 py-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-amber-500 text-[11px] font-bold uppercase tracking-wider">Educational use only &mdash; not financial advice</span>
          </div>
          <p className="text-gray-600 text-xs leading-relaxed max-w-2xl mx-auto">
            Forex Mastery is an educational platform. All content, market analysis, AI-generated signals, and commentary are intended solely for
            learning purposes and do not constitute regulated financial advice, investment recommendations, or solicitation to trade. Trading forex,
            commodities, indices, and crypto involves substantial risk and may not be suitable for all investors. Past performance is not
            indicative of future results. You should seek independent financial advice before making any trading decisions.
          </p>
        </div>
      </section>

      {/* ───── Footer ──────────────────────────────────────────────────── */}
      {/* The extra bottom padding (pb-28) only exists to clear the sticky
          mobile signup bar. Signed-in users don't get that bar, so their
          footer uses normal padding. */}
      <footer className={`border-t border-white/10 py-8 sm:pb-8 ${isSignedIn ? '' : 'pb-28'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span className="text-white font-bold">Forex<span className="text-emerald-400">Mastery</span></span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-500 justify-center">
            <Link href="/analysis"            className="hover:text-white transition">Analysis</Link>
            <Link href="/funded"              className="hover:text-white transition">Funded</Link>
            <Link href="/analysis/feed"       className="hover:text-white transition">Feed</Link>
            <Link href="/course"              className="hover:text-white transition">Course</Link>
            <Link href="/coaching"            className="hover:text-white transition">Coaching</Link>
            <Link href="#pricing"             className="hover:text-white transition">Pricing</Link>
          </div>
        </div>
      </footer>

      {/* Sticky mobile signup bar — only for signed-out visitors. Signed-in
          users already have full nav in the hamburger; showing them a Sign
          In / Create Account bar was redundant and covered the last row of
          every section on small screens. */}
      {!isSignedIn && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0f1a]/95 backdrop-blur-md border-t border-white/10 px-4 py-3 flex gap-3">
          <Link
            href="/auth/signin"
            className="flex-1 text-center py-3 rounded-xl border border-white/20 text-white text-sm font-semibold hover:bg-white/5 transition"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="flex-1 text-center py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition"
          >
            Create free account
          </Link>
        </div>
      )}
    </div>
  )
}
