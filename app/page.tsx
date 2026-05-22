import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TrendingUp, BookOpen, Clock, Star, ChevronRight, Play, Award, BarChart2, Shield } from 'lucide-react'
import Navbar from '@/components/Navbar'
import ModuleList from '@/components/ModuleList'
import ProgressTracker from '@/components/ProgressTracker'
import { courseModules, totalLessons } from '@/lib/courseData'

export const metadata = {
  title: 'Forex Mastery Course — Learn Professional Forex Trading',
  description: 'Master forex trading from fundamentals to advanced strategies. 8 modules, 48 lessons with video, quizzes, and AI chat.',
}

const totalDuration = courseModules.reduce(
  (acc, m) => acc + m.lessons.reduce((a, l) => a + l.duration, 0),
  0
)

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  if (session) redirect('/course')

  const firstLesson = courseModules[0].lessons[0]

  return (
    <div className="min-h-screen bg-[#080e1a] text-white">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1628] via-[#080e1a] to-[#050d18]" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
        </div>
        <div className="absolute inset-0 opacity-5">
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
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-sm font-medium">Professional Forex Trading Course</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight mb-6">
              Master Forex{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                From Zero
              </span>{' '}
              to Professional
            </h1>

            <p className="text-base sm:text-xl text-gray-400 leading-relaxed mb-8 max-w-2xl">
              A complete, structured forex education covering fundamentals, technical analysis,
              risk management, and trading psychology — everything you need to trade profitably.
            </p>

            <div className="flex flex-wrap items-center gap-6 mb-10">
              {[
                { icon: <BookOpen className="w-4 h-4" />, label: `${courseModules.length} Modules` },
                { icon: <Play className="w-4 h-4" />, label: `${totalLessons} Lessons` },
                { icon: <Clock className="w-4 h-4" />, label: `${Math.round(totalDuration / 60)}+ Hours` },
                { icon: <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />, label: '4.9 Rating' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1.5 text-gray-400 text-sm">
                  <span className="text-emerald-400">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/auth/signup"
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-emerald-500/25 text-sm"
              >
                <Play className="w-4 h-4 fill-white" />
                Create Free Account
              </Link>
              <Link
                href="/auth/signin"
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold px-6 py-3.5 rounded-xl transition-all text-sm"
              >
                Sign In
              </Link>
            </div>

            {/* Mobile trust line */}
            <p className="mt-4 text-xs text-gray-500">
              Free to join · No credit card required · Start in 30 seconds
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Play className="w-6 h-6 text-emerald-400" />,
                title: 'Animated Video Lessons',
                desc: 'Every lesson comes with an animated Remotion video for visual learning.',
              },
              {
                icon: <Award className="w-6 h-6 text-blue-400" />,
                title: 'Knowledge Quizzes',
                desc: 'Test your understanding with detailed quizzes after each lesson.',
              },
              {
                icon: <BarChart2 className="w-6 h-6 text-purple-400" />,
                title: 'Progress Tracking',
                desc: 'Track your learning progress across all modules and lessons.',
              },
              {
                icon: <Shield className="w-6 h-6 text-orange-400" />,
                title: 'AI Tutor Chat',
                desc: 'Ask questions and get instant explanations from your AI trading tutor.',
              },
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

      {/* Progress */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-white mb-5">Your Progress</h2>
          <ProgressTracker />
        </div>
      </section>

      {/* Course Content */}
      <section id="modules" className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white">Course Curriculum</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {totalLessons} lessons across {courseModules.length} comprehensive modules
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
                    <p className="text-gray-500 text-xs">Complete Course</p>
                  </div>
                </div>

                <div className="p-5">
                  <Link
                    href={`/course/${firstLesson.moduleId}/${firstLesson.id}`}
                    className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all mb-4 text-sm"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Start Course Now
                  </Link>

                  <div className="space-y-3">
                    {[
                      { label: 'Modules', value: courseModules.length },
                      { label: 'Total Lessons', value: totalLessons },
                      { label: 'Total Duration', value: `${Math.round(totalDuration / 60)}+ hours` },
                      { label: 'Skill Level', value: 'Beginner → Advanced' },
                      { label: 'Access', value: 'Lifetime' },
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

      {/* Module overview grid */}
      <section className="py-16 bg-white/[0.02] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">What You&#39;ll Learn</h2>
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

      {/* Disclaimer */}
      <section className="border-t border-white/[0.06] bg-[#050a12] py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 rounded-full px-4 py-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-amber-500 text-[11px] font-bold uppercase tracking-wider">Educational Use Only — Not Financial Advice</span>
          </div>
          <p className="text-gray-600 text-xs leading-relaxed max-w-2xl mx-auto">
            Forex Mastery is an educational platform. All course content, market analysis, AI-generated signals, and commentary are intended solely for learning purposes and do not constitute regulated financial advice, investment recommendations, or solicitation to trade. Trading forex, commodities, indices, and crypto involves substantial risk and may not be suitable for all investors. Past performance is not indicative of future results. You should seek independent financial advice before making any trading decisions.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 pb-28 sm:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span className="text-white font-bold">Forex<span className="text-emerald-400">Mastery</span></span>
          </div>
          <p className="text-gray-600 text-sm">
            {totalLessons} lessons · {courseModules.length} modules · Complete forex education
          </p>
        </div>
      </footer>

      {/* Sticky mobile signup bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0f1a]/95 backdrop-blur-md border-t border-white/10 px-4 py-3 flex gap-3">
        <Link
          href="/auth/signin"
          className="flex-1 text-center py-3 rounded-xl border border-white/20 text-white text-sm font-semibold hover:bg-white/5 transition"
        >
          Sign In
        </Link>
        <Link
          href="/auth/signup"
          className="flex-1 text-center py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition"
        >
          Create Free Account
        </Link>
      </div>
    </div>
  )
}
