'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, ChevronRight, CheckCircle2, Menu, X,
  BookOpen, MessageSquare, HelpCircle, Home, TrendingUp, Clock
} from 'lucide-react'
import type { Lesson, Module } from '@/types'
import VideoPlayer from '@/components/VideoPlayer'
import LessonContent from '@/components/LessonContent'
import Quiz from '@/components/Quiz'
import AIChat from '@/components/AIChat'
import LessonSidebar from '@/components/LessonSidebar'
import { markLessonComplete, isLessonComplete } from '@/lib/progress'

interface CoursePlayerClientProps {
  lesson: Lesson
  module: Module
  allModules: Module[]
  prev: { moduleId: string; lessonId: string } | null
  next: { moduleId: string; lessonId: string } | null
}

type ActiveTab = 'content' | 'quiz' | 'chat'

const COUNTDOWN_SECS = 10

export default function CoursePlayerClient({
  lesson,
  module,
  allModules,
  prev,
  next,
}: CoursePlayerClientProps) {
  const router = useRouter()
  const [activeTab,    setActiveTab]    = useState<ActiveTab>('content')
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const [completed,    setCompleted]    = useState(false)
  const [quizDone,     setQuizDone]     = useState(false)
  // Countdown state: null = not counting, number = seconds remaining
  const [countdown,    setCountdown]    = useState<number | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setCompleted(isLessonComplete(lesson.id))
    setActiveTab('content')
    setSidebarOpen(false)
    // Clear any running countdown on lesson change
    setCountdown(null)
    if (countdownRef.current) clearInterval(countdownRef.current)
  }, [lesson.id])

  // Navigate to next lesson when countdown hits 0
  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      if (countdownRef.current) clearInterval(countdownRef.current)
      if (next) router.push(`/course/${next.moduleId}/${next.lessonId}`)
      return
    }
    countdownRef.current = setInterval(() => {
      setCountdown(c => (c !== null ? c - 1 : null))
    }, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown])

  function cancelCountdown() {
    if (countdownRef.current) clearInterval(countdownRef.current)
    setCountdown(null)
  }

  const handleMarkComplete = useCallback(() => {
    if (!completed) {
      markLessonComplete(lesson.id)
      setCompleted(true)
      window.dispatchEvent(new Event('lessonComplete'))
    }
  }, [completed, lesson.id])

  // Called by VideoPlayer when the Remotion video ends
  const handleVideoEnd = useCallback(() => {
    handleMarkComplete()
    // Start countdown to next lesson (only if there is one)
    if (next) {
      setCountdown(COUNTDOWN_SECS)
    }
  }, [handleMarkComplete, next])

  function handleQuizComplete(score: number) {
    setQuizDone(true)
    if (score >= 60) {
      markLessonComplete(lesson.id)
      setCompleted(true)
      window.dispatchEvent(new Event('lessonComplete'))
    }
  }

  const tabs: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'content', label: 'Lesson',  icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'quiz',    label: 'Quiz',    icon: <HelpCircle className="w-3.5 h-3.5" /> },
    { id: 'chat',    label: 'AI Chat', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="h-[100dvh] bg-[#080e1a] text-white flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 h-14 border-b border-white/10 bg-[#0a0f1a] shrink-0">
        <Link href="/" className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <span className="hidden sm:block text-sm font-bold text-white">
            Forex<span className="text-emerald-400">Mastery</span>
          </span>
        </Link>

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-1 min-w-0">
          <Link href="/" className="hover:text-gray-300 transition-colors flex items-center gap-1">
            <Home className="w-3 h-3" />
          </Link>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="truncate hidden sm:block text-gray-400">{module.title}</span>
          <ChevronRight className="w-3 h-3 shrink-0 hidden sm:block" />
          <span className="truncate text-gray-300">{lesson.title}</span>
        </div>

        {/* Completion badge */}
        {completed && (
          <div className="flex items-center gap-1 bg-emerald-500/15 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-500/20 shrink-0">
            <CheckCircle2 className="w-3 h-3" />
            <span className="hidden sm:block">Completed</span>
          </div>
        )}

        {/* Sidebar toggle on mobile */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </header>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar — desktop always visible */}
        <aside className={`
          lg:flex shrink-0 w-72 border-r border-white/10 bg-[#090e1a] overflow-hidden
          ${sidebarOpen ? 'flex' : 'hidden'}
          fixed lg:relative inset-0 lg:inset-auto z-40 lg:z-auto
        `}>
          <div className="w-72 h-full">
            <LessonSidebar
              modules={allModules}
              currentModuleId={module.id}
              currentLessonId={lesson.id}
            />
          </div>
        </aside>

        {/* Sidebar backdrop on mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/60 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-screen-xl mx-auto p-4 lg:p-6">
            <div className="grid xl:grid-cols-5 gap-5">

              {/* Left column: Video + tabs */}
              <div className="xl:col-span-3 space-y-4">

                {/* Video — wrapped in relative container for countdown overlay */}
                <div className="relative">
                  <VideoPlayer
                    lessonId={lesson.id}
                    lessonTitle={lesson.title}
                    moduleTitle={module.title}
                    moduleNumber={module.moduleNumber}
                    lessonNumber={lesson.lessonNumber}
                    lessonContent={lesson.content}
                    onVideoEnd={handleVideoEnd}
                  />

                  {/* ── Next-lesson countdown overlay ── */}
                  {countdown !== null && next && (
                    <div className="absolute inset-0 flex items-end justify-center pb-14 pointer-events-none">
                      <div className="pointer-events-auto flex items-center gap-3 bg-[#0a0f1a]/90 backdrop-blur-sm border border-emerald-500/30 rounded-2xl px-5 py-3 shadow-2xl">
                        {/* Circular countdown ring */}
                        <div className="relative w-11 h-11 shrink-0">
                          <svg viewBox="0 0 40 40" className="w-11 h-11 -rotate-90">
                            <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                            <circle
                              cx="20" cy="20" r="17" fill="none"
                              stroke="#1D9E75" strokeWidth="3"
                              strokeDasharray={`${(countdown / COUNTDOWN_SECS) * 106.8} 106.8`}
                              strokeLinecap="round"
                              style={{ transition: 'stroke-dasharray 0.9s linear' }}
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">
                            {countdown}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs text-gray-400">Next lesson in {countdown}s</p>
                          <p className="text-sm font-semibold text-white truncate max-w-[200px]">
                            <ChevronRight className="w-3.5 h-3.5 inline text-emerald-400" />
                            Next Lesson
                          </p>
                        </div>

                        <div className="flex items-center gap-2 ml-2">
                          <Link
                            href={`/course/${next.moduleId}/${next.lessonId}`}
                            onClick={cancelCountdown}
                            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-all"
                          >
                            Go Now
                          </Link>
                          <button
                            onClick={cancelCountdown}
                            className="text-xs text-gray-400 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/10 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Lesson header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Module {module.moduleNumber} · Lesson {lesson.lessonNumber}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />{lesson.duration} min
                      </span>
                    </div>
                    <h1 className="text-xl font-bold text-white">{lesson.title}</h1>
                    <p className="text-gray-500 text-sm mt-1">{lesson.description}</p>
                  </div>

                  {!completed && (
                    <button
                      onClick={handleMarkComplete}
                      className="shrink-0 flex items-center gap-1.5 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/25 px-3 py-2 rounded-lg transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:block">Mark Complete</span>
                    </button>
                  )}
                </div>

                {/* Tab selector */}
                <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 sm:px-3 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === tab.id
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {tab.icon}
                      <span className="hidden xs:inline sm:inline">{tab.label}</span>
                      {tab.id === 'quiz' && quizDone && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div>
                  {activeTab === 'content' && (
                    <LessonContent
                      content={lesson.content}
                      title={lesson.title}
                      lesson={lesson}
                      moduleTitle={module.title}
                    />
                  )}
                  {activeTab === 'quiz' && (
                    <Quiz
                      quiz={lesson.quiz}
                      lessonId={lesson.id}
                      onComplete={handleQuizComplete}
                    />
                  )}
                  {activeTab === 'chat' && (
                    <AIChat lessonTitle={lesson.title} moduleTitle={module.title} />
                  )}
                </div>
              </div>

              {/* Right column: quiz + chat visible on xl */}
              <div className="xl:col-span-2 space-y-4">
                <div className="hidden xl:block">
                  <Quiz
                    quiz={lesson.quiz}
                    lessonId={lesson.id}
                    onComplete={handleQuizComplete}
                  />
                </div>
                <div className="hidden xl:block">
                  <AIChat lessonTitle={lesson.title} moduleTitle={module.title} />
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-white/10">
              {prev ? (
                <Link
                  href={`/course/${prev.moduleId}/${prev.lessonId}`}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white px-3 sm:px-4 py-2.5 rounded-xl transition-all text-xs sm:text-sm font-medium"
                >
                  <ChevronLeft className="w-4 h-4 shrink-0" />
                  <span>Previous</span>
                </Link>
              ) : (
                <div />
              )}

              {next ? (
                <Link
                  href={`/course/${next.moduleId}/${next.lessonId}`}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 sm:px-4 py-2.5 rounded-xl transition-all text-xs sm:text-sm font-semibold"
                >
                  <span>Next Lesson</span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </Link>
              ) : (
                <div className="flex items-center gap-2 bg-yellow-600/20 border border-yellow-500/20 text-yellow-400 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold">
                  🎉 Course Complete!
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
