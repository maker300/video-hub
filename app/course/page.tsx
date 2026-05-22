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
  title: 'My Course — Forex Mastery',
  description: 'Your forex trading course dashboard.',
}

const totalDuration = courseModules.reduce(
  (acc, m) => acc + m.lessons.reduce((a, l) => a + l.duration, 0),
  0
)

export default async function CourseDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin?callbackUrl=/course')

  const firstLesson = courseModules[0].lessons[0]
  const userName = session.user?.name?.split(' ')[0] ?? 'Trader'

  return (
    <div className="min-h-screen bg-[#080e1a] text-white">
      <Navbar />

      {/* Welcome banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#080e1a] to-[#050d18] border-b border-white/5">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 rounded-full bg-blue-500/15 blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">
                Welcome back, <span className="text-emerald-400">{userName}</span> 👋
              </h1>
              <p className="text-gray-400 text-sm">
                Continue where you left off · {totalLessons} lessons across {courseModules.length} modules
              </p>
            </div>
            <Link
              href={`/course/${firstLesson.moduleId}/${firstLesson.id}`}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all text-sm shrink-0"
            >
              <Play className="w-4 h-4 fill-white" />
              Continue Learning
            </Link>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            {[
              { icon: <BookOpen className="w-4 h-4" />, label: `${courseModules.length} Modules`,      color: 'text-emerald-400' },
              { icon: <Play className="w-4 h-4" />,     label: `${totalLessons} Lessons`,              color: 'text-blue-400' },
              { icon: <Clock className="w-4 h-4" />,    label: `${Math.round(totalDuration / 60)}+ hrs`, color: 'text-purple-400' },
              { icon: <Star className="w-4 h-4 fill-yellow-400" />, label: '4.9 Rating',               color: 'text-yellow-400' },
            ].map(item => (
              <div key={item.label} className={`flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium ${item.color}`}>
                {item.icon}
                <span className="text-gray-300">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section className="py-10 border-b border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Play className="w-5 h-5 text-emerald-400" />,  title: 'Animated Video Lessons', desc: 'Every lesson has a Remotion video for visual learning.' },
              { icon: <Award className="w-5 h-5 text-blue-400" />,    title: 'Knowledge Quizzes',       desc: 'Test your understanding after each lesson.' },
              { icon: <BarChart2 className="w-5 h-5 text-purple-400" />, title: 'Progress Tracking',   desc: 'Track your progress across all modules.' },
              { icon: <Shield className="w-5 h-5 text-orange-400" />, title: 'AI Tutor Chat',           desc: 'Ask questions and get instant explanations.' },
            ].map(f => (
              <div key={f.title} className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">{f.icon}</div>
                <div>
                  <h3 className="text-white font-semibold text-sm mb-0.5">{f.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Progress tracker */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-lg font-bold text-white mb-4">Your Progress</h2>
          <ProgressTracker />
        </div>
      </section>

      {/* Course curriculum */}
      <section id="modules" className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2">
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-white">Course Curriculum</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {totalLessons} lessons across {courseModules.length} comprehensive modules
                </p>
              </div>
              <ModuleList />
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-20 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-br from-emerald-900/50 to-[#0d1b2a] h-36 flex items-center justify-center border-b border-white/10">
                  <div className="text-center">
                    <TrendingUp className="w-10 h-10 text-emerald-400 mx-auto mb-1.5" />
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
                      { label: 'Modules',        value: courseModules.length },
                      { label: 'Total Lessons',  value: totalLessons },
                      { label: 'Duration',       value: `${Math.round(totalDuration / 60)}+ hours` },
                      { label: 'Skill Level',    value: 'Beginner → Advanced' },
                      { label: 'Access',         value: 'Lifetime' },
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

      {/* Module grid */}
      <section className="py-14 bg-white/[0.02] border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">All Modules</h2>
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

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
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
    </div>
  )
}
