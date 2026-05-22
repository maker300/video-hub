'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Flame, Trophy, Target } from 'lucide-react'
import { getProgress } from '@/lib/progress'
import { courseModules, totalLessons } from '@/lib/courseData'

export default function ProgressTracker() {
  const [stats, setStats] = useState({
    completed: 0,
    total: totalLessons,
    percentage: 0,
    completedModules: 0,
    quizAverage: 0,
  })

  useEffect(() => {
    function update() {
      const p = getProgress()
      const completed = p.completedLessons.length
      const percentage = Math.round((completed / totalLessons) * 100)

      const completedModules = courseModules.filter(m =>
        m.lessons.every(l => p.completedLessons.includes(l.id))
      ).length

      const scores = Object.values(p.quizScores)
      const quizAverage = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0

      setStats({ completed, total: totalLessons, percentage, completedModules, quizAverage })
    }

    update()
    window.addEventListener('lessonComplete', update)
    return () => window.removeEventListener('lessonComplete', update)
  }, [])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        {
          icon: <Target className="w-5 h-5 text-blue-400" />,
          label: 'Progress',
          value: `${stats.percentage}%`,
          sub: `${stats.completed}/${stats.total} lessons`,
          color: 'blue',
        },
        {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
          label: 'Lessons Done',
          value: stats.completed,
          sub: `${stats.total - stats.completed} remaining`,
          color: 'emerald',
        },
        {
          icon: <Trophy className="w-5 h-5 text-yellow-400" />,
          label: 'Modules Done',
          value: stats.completedModules,
          sub: `of ${courseModules.length} modules`,
          color: 'yellow',
        },
        {
          icon: <Flame className="w-5 h-5 text-orange-400" />,
          label: 'Quiz Average',
          value: stats.quizAverage > 0 ? `${stats.quizAverage}%` : '—',
          sub: stats.quizAverage > 0 ? (stats.quizAverage >= 70 ? 'Keep it up!' : 'Keep practicing') : 'No quizzes yet',
          color: 'orange',
        },
      ].map(item => (
        <div key={item.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            {item.icon}
            <span className="text-xs text-gray-500">{item.label}</span>
          </div>
          <div className="text-2xl font-bold text-white mb-0.5">{item.value}</div>
          <div className="text-xs text-gray-500">{item.sub}</div>
        </div>
      ))}
    </div>
  )
}
