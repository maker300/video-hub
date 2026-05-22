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
}

export default function GateOverlay({ lesson, module, allModules, prev, next }: GateOverlayProps) {
  void prev; void next // kept for future use

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
              <p className="text-sm text-gray-400 mb-6">
                Create a free account to unlock this lesson and all{' '}
                <span className="text-white font-medium">72 lessons</span> in the full course.
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
                No credit card required · Free forever for the first 3 lessons
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
