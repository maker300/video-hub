'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { courseModules as modules, totalLessons } from '@/lib/courseData'

interface ProgressData {
  completedLessons: string[]
}

const BADGES = [
  { id: 'first_step',   icon: '🚀', label: 'First Step',     desc: 'Complete your first lesson',  threshold: 1  },
  { id: 'ten_lessons',  icon: '📚', label: 'Bookworm',       desc: 'Complete 10 lessons',          threshold: 10 },
  { id: 'halfway',      icon: '⚡', label: 'Halfway There',  desc: 'Complete 50% of the course',   threshold: Math.ceil(totalLessons * 0.5) },
  { id: 'module_one',   icon: '🎯', label: 'Module Master',  desc: 'Complete a full module',       threshold: 0, special: 'module' },
  { id: 'thirty_days',  icon: '🔥', label: 'Consistent',     desc: 'Complete 30 lessons',          threshold: 30 },
  { id: 'graduate',     icon: '🏆', label: 'Graduate',       desc: 'Complete the full course',     threshold: totalLessons },
]

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [progress, setProgress] = useState<ProgressData>({ completedLessons: [] })
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/profile')
    }
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return

    async function load() {
      try {
        const res = await fetch('/api/progress')
        if (res.ok) {
          const data = await res.json()
          setProgress(data)
        } else {
          // Fallback to localStorage
          const stored = localStorage.getItem('forex-progress')
          if (stored) {
            const parsed = JSON.parse(stored)
            setProgress({ completedLessons: parsed.completedLessons ?? [] })
          }
        }
      } catch {
        const stored = localStorage.getItem('forex-progress')
        if (stored) {
          const parsed = JSON.parse(stored)
          setProgress({ completedLessons: parsed.completedLessons ?? [] })
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [status])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Loading profile…</div>
      </div>
    )
  }

  if (!session) return null

  const completed = progress.completedLessons.length
  const pct = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0
  const joinDate = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const moduleProgress = modules.map(mod => {
    const total = mod.lessons.length
    const done  = mod.lessons.filter(l => progress.completedLessons.includes(l.id)).length
    return { ...mod, total, done }
  })

  function isBadgeUnlocked(badge: typeof BADGES[0]) {
    if (badge.special === 'module') {
      return moduleProgress.some(m => m.done === m.total && m.total > 0)
    }
    return completed >= badge.threshold
  }

  const avatarLetter = session.user?.name?.[0]?.toUpperCase()
    ?? session.user?.email?.[0]?.toUpperCase()
    ?? '?'

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white">
      {/* Header */}
      <div className="bg-[#131722] border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex items-center gap-4 sm:gap-6">
          {/* Avatar */}
          {session.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="avatar" className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-[#1D9E75]/30 shrink-0" />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#1D9E75] flex items-center justify-center text-2xl sm:text-3xl font-bold border-4 border-[#1D9E75]/30 shrink-0">
              {avatarLetter}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{session.user?.name ?? 'Trader'}</h1>
            <p className="text-gray-400 text-xs sm:text-sm truncate">{session.user?.email}</p>
            <p className="text-gray-500 text-xs mt-1">Member since {joinDate}</p>
          </div>
          {/* Overall progress ring */}
          <div className="hidden sm:flex flex-col items-center gap-1">
            <div className="relative w-16 h-16">
              <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e2538" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke="#1D9E75" strokeWidth="3"
                  strokeDasharray={`${pct} ${100 - pct}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{pct}%</span>
            </div>
            <span className="text-xs text-gray-500">Complete</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Lessons Done',   value: completed },
            { label: 'Total Lessons',  value: totalLessons },
            { label: 'Modules',        value: `${moduleProgress.filter(m => m.done === m.total && m.total > 0).length}/${modules.length}` },
            { label: 'Completion',     value: `${pct}%` },
          ].map(s => (
            <div key={s.label} className="bg-[#131722] border border-white/10 rounded-xl px-4 py-4 text-center">
              <p className="text-2xl font-bold text-[#1D9E75]">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Module progress grid */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Module Progress</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {moduleProgress.map(mod => {
              const modPct = mod.total > 0 ? Math.round((mod.done / mod.total) * 100) : 0
              return (
                <div key={mod.id} className="bg-[#131722] border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-white truncate pr-2">
                      <span className="text-[#1D9E75] mr-1.5">M{mod.moduleNumber}</span>
                      {mod.title}
                    </p>
                    <span className="text-xs text-gray-400 shrink-0">{mod.done}/{mod.total}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1D9E75] rounded-full transition-all"
                      style={{ width: `${modPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Achievement badges */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Achievements</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {BADGES.map(badge => {
              const unlocked = isBadgeUnlocked(badge)
              return (
                <div
                  key={badge.id}
                  className={`bg-[#131722] border rounded-xl p-4 flex flex-col items-center text-center gap-2 transition ${
                    unlocked ? 'border-[#1D9E75]/30' : 'border-white/5 opacity-40'
                  }`}
                >
                  <span className="text-3xl">{badge.icon}</span>
                  <p className="text-sm font-semibold text-white">{badge.label}</p>
                  <p className="text-xs text-gray-500">{badge.desc}</p>
                  {unlocked && (
                    <span className="text-xs bg-[#1D9E75]/20 text-[#1D9E75] px-2 py-0.5 rounded-full font-medium">Unlocked</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
