import Link from 'next/link'
import type { Lesson, Module } from '@/types'
import LessonSidebar from './LessonSidebar'
import Navbar from './Navbar'

interface GateOverlayProps {
  lesson: Lesson
  module: Module
  allModules: Module[]
  prev: { moduleId: string; lessonId: string } | null
  next: { moduleId: string; lessonId: string } | null
  /**
   * 'signin'   — visitor isn't logged in (original behaviour)
   * 'purchase' — logged in, but hasn't bought the course
   */
  mode?: 'signin' | 'purchase'
  /** Price in pence for this user. Only used in 'purchase' mode. */
  price?: number
  /** True when they qualify for the reduced existing-member price. */
  legacy?: boolean
  totalLessons?: number
}

export default function GateOverlay({
  lesson, module, allModules, prev, next,
  mode = 'signin', price = 10000, legacy = false, totalLessons = 72,
}: GateOverlayProps) {
  void prev; void next // kept for future use

  const priceLabel = `£${(price / 100).toFixed(price % 100 === 0 ? 0 : 2)}`

  return (
    <div className="min-h-screen bg-[#080e1a] text-white flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="hidden lg:block w-72 shrink-0">
          <LessonSidebar modules={allModules} currentModuleId={module.id} currentLessonId={lesson.id} />
        </div>

        {/* Main content area — blurred */}
        <main className="flex-1 relative overflow-hidden">
          {/* Blurred content mockup */}
          <div className="absolute inset-0 select-none pointer-events-none overflow-hidden">
            <div className="filter blur-md opacity-30 p-8 space-y-4">
              <div className="h-6 bg-white/20 rounded w-2/3" />
              <div className="h-4 bg-white/10 rounded w-full" />
              <div className="h-4 bg-white/10 rounded w-5/6" />
              <div className="h-4 bg-white/10 rounded w-4/5" />
              <div className="h-48 bg-white/5 rounded-xl mt-6" />
              <div className="h-4 bg-white/10 rounded w-full" />
              <div className="h-4 bg-white/10 rounded w-3/4" />
              <div className="h-4 bg-white/10 rounded w-full" />
              <div className="h-4 bg-white/10 rounded w-5/6" />
            </div>
          </div>

          {/* Overlay card */}
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="bg-[#131722]/95 border border-white/10 rounded-2xl p-5 sm:p-8 shadow-2xl max-w-md w-full text-center backdrop-blur-sm max-h-[90vh] overflow-y-auto">
              {/* Lock icon */}
              <div className="w-16 h-16 rounded-full bg-[#1D9E75]/10 border border-[#1D9E75]/20 flex items-center justify-center mx-auto mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>

              <div className="text-xs font-semibold text-[#1D9E75] uppercase tracking-widest mb-2">
                Module {module.moduleNumber} · {module.title}
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{lesson.title}</h2>

              {mode === 'purchase' ? (
                <>
                  <p className="text-sm text-gray-400 mb-1">
                    Unlock this lesson and all{' '}
                    <span className="text-white font-medium">{totalLessons} lessons</span> with one-off
                    lifetime access.
                  </p>
                  <div className="my-5">
                    <div className="text-3xl font-black text-white">{priceLabel}</div>
                    {legacy && (
                      <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-1">
                        Existing-member price · normally £100
                      </div>
                    )}
                    <p className="text-[11px] text-gray-600 mt-2">One payment · no subscription</p>
                  </div>

                  <div className="space-y-3">
                    <Link
                      href="/course/purchase"
                      className="block w-full py-3 rounded-lg bg-[#1D9E75] hover:bg-[#17856A] text-white font-semibold text-sm transition"
                    >
                      Get full access — {priceLabel}
                    </Link>
                    <Link
                      href="/course"
                      className="block w-full py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition"
                    >
                      Back to curriculum
                    </Link>
                  </div>

                  <p className="text-xs text-gray-600 mt-4">
                    Includes 4 weekly live calls + 10 bonus tokens · First lesson stays free
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-400 mb-6">
                    Sign in to continue this lesson and see the full{' '}
                    <span className="text-white font-medium">{totalLessons}-lesson</span> curriculum.
                  </p>

                  <div className="space-y-3">
                    <Link
                      href={`/auth/signup?callbackUrl=/course/${module.id}/${lesson.id}`}
                      className="block w-full py-3 rounded-lg bg-[#1D9E75] hover:bg-[#17856A] text-white font-semibold text-sm transition"
                    >
                      Create free account
                    </Link>
                    <Link
                      href={`/auth/signin?callbackUrl=/course/${module.id}/${lesson.id}`}
                      className="block w-full py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition"
                    >
                      Sign in
                    </Link>
                  </div>

                  <p className="text-xs text-gray-600 mt-4">
                    Free account · First lesson free · 10 FM Trader tokens on signup
                  </p>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
