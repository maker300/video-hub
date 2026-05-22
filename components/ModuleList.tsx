'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, CheckCircle2, Circle, Lock, Play, Clock } from 'lucide-react'
import { courseModules } from '@/lib/courseData'
import { getProgress, getModuleProgress } from '@/lib/progress'

export default function ModuleList() {
  const [expanded, setExpanded] = useState<string | null>('module-1')
  const [completedLessons, setCompletedLessons] = useState<string[]>([])

  useEffect(() => {
    const p = getProgress()
    setCompletedLessons(p.completedLessons)
  }, [])

  return (
    <div className="space-y-3">
      {courseModules.map((module, moduleIndex) => {
        const lessonIds = module.lessons.map(l => l.id)
        const moduleProgress = completedLessons.length > 0
          ? Math.round((lessonIds.filter(id => completedLessons.includes(id)).length / lessonIds.length) * 100)
          : 0
        const isExpanded = expanded === module.id
        const isLocked = moduleIndex > 0 && moduleProgress === 0 && completedLessons.length === 0

        return (
          <div
            key={module.id}
            className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors"
          >
            {/* Module header */}
            <button
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors"
              onClick={() => setExpanded(isExpanded ? null : module.id)}
            >
              {/* Module number */}
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                moduleProgress === 100
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : moduleProgress > 0
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-white/10 text-gray-400'
              }`}>
                {moduleProgress === 100 ? <CheckCircle2 className="w-5 h-5" /> : module.moduleNumber}
              </div>

              {/* Module info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-semibold text-sm truncate">{module.title}</h3>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500">{module.lessons.length} lessons</span>
                  {moduleProgress > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${moduleProgress}%` }}
                        />
                      </div>
                      <span className="text-xs text-emerald-400">{moduleProgress}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Chevron */}
              <div className="text-gray-500 shrink-0">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
            </button>

            {/* Lessons */}
            {isExpanded && (
              <div className="border-t border-white/10">
                {module.lessons.map((lesson, lessonIndex) => {
                  const isComplete = completedLessons.includes(lesson.id)
                  const isFirst = lessonIndex === 0

                  return (
                    <Link
                      key={lesson.id}
                      href={`/course/${module.id}/${lesson.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group"
                    >
                      {/* Status icon */}
                      <div className="shrink-0">
                        {isComplete ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                        )}
                      </div>

                      {/* Lesson info */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate transition-colors ${
                          isComplete ? 'text-emerald-300' : 'text-gray-300 group-hover:text-white'
                        }`}>
                          {lesson.lessonNumber}. {lesson.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Clock className="w-3 h-3 text-gray-600" />
                          <span className="text-xs text-gray-600">{lesson.duration} min</span>
                        </div>
                      </div>

                      {/* Play button */}
                      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
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
  )
}
