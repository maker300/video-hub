'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Play, Clock } from 'lucide-react'
import type { Module } from '@/types'
import { getProgress } from '@/lib/progress'

interface LessonSidebarProps {
  modules: Module[]
  currentModuleId: string
  currentLessonId: string
}

export default function LessonSidebar({ modules, currentModuleId, currentLessonId }: LessonSidebarProps) {
  const [expanded, setExpanded] = useState<string>(currentModuleId)
  const [completedLessons, setCompletedLessons] = useState<string[]>([])

  useEffect(() => {
    const p = getProgress()
    setCompletedLessons(p.completedLessons)
  }, [])

  // Listen for lesson completion events
  useEffect(() => {
    function handler() {
      const p = getProgress()
      setCompletedLessons([...p.completedLessons])
    }
    window.addEventListener('lessonComplete', handler)
    return () => window.removeEventListener('lessonComplete', handler)
  }, [])

  return (
    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
      <div className="p-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Course Content</h2>
        <div className="space-y-2">
          {modules.map(module => {
            const isExpanded = expanded === module.id
            const completedCount = module.lessons.filter(l => completedLessons.includes(l.id)).length

            return (
              <div key={module.id} className="rounded-lg overflow-hidden">
                {/* Module header */}
                <button
                  className={`w-full flex items-center gap-2 p-3 text-left rounded-lg transition-colors ${
                    module.id === currentModuleId
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : 'bg-white/5 hover:bg-white/8 border border-white/5'
                  }`}
                  onClick={() => setExpanded(isExpanded ? '' : module.id)}
                >
                  <div className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center shrink-0 ${
                    module.id === currentModuleId ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/10 text-gray-400'
                  }`}>
                    {module.moduleNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${
                      module.id === currentModuleId ? 'text-emerald-300' : 'text-gray-300'
                    }`}>
                      {module.title}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {completedCount}/{module.lessons.length} completed
                    </p>
                  </div>
                  {isExpanded
                    ? <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  }
                </button>

                {/* Lessons */}
                {isExpanded && (
                  <div className="mt-1 ml-2 border-l border-white/10 pl-2 space-y-0.5">
                    {module.lessons.map(lesson => {
                      const isCurrent = lesson.id === currentLessonId
                      const isComplete = completedLessons.includes(lesson.id)

                      return (
                        <Link
                          key={lesson.id}
                          href={`/course/${module.id}/${lesson.id}`}
                          className={`flex items-center gap-2 p-2 rounded-lg transition-all group ${
                            isCurrent
                              ? 'bg-emerald-500/15 border border-emerald-500/25'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="shrink-0">
                            {isComplete ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : isCurrent ? (
                              <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-gray-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-tight truncate ${
                              isCurrent ? 'text-emerald-300 font-medium' : isComplete ? 'text-emerald-400/70' : 'text-gray-400'
                            }`}>
                              {lesson.lessonNumber}. {lesson.title}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Clock className="w-2.5 h-2.5 text-gray-600" />
                              <span className="text-xs text-gray-600">{lesson.duration}m</span>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
