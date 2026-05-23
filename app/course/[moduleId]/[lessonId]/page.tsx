import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLessonById, getAdjacentLessons, courseModules } from '@/lib/courseData'
import CoursePlayerClient from './CoursePlayerClient'
import GateOverlay from '@/components/GateOverlay'

// First 3 lessons of module-1 are free; everything else requires sign-in
const FREE_LESSON_IDS = new Set(
  courseModules
    .find(m => m.id === 'module-1')
    ?.lessons.slice(0, 3)
    .map(l => l.id) ?? []
)

interface PageProps {
  params: Promise<{ moduleId: string; lessonId: string }>
}

export async function generateStaticParams() {
  const params: Array<{ moduleId: string; lessonId: string }> = []
  for (const mod of courseModules) {
    for (const lesson of mod.lessons) {
      params.push({ moduleId: mod.id, lessonId: lesson.id })
    }
  }
  return params
}

export async function generateMetadata({ params }: PageProps) {
  const { moduleId, lessonId } = await params
  const result = getLessonById(moduleId, lessonId)
  if (!result) return { title: 'Lesson Not Found' }
  return {
    title: `${result.lesson.title} — Forex Mastery Course`,
    description: result.lesson.description,
  }
}

export default async function CoursePlayerPage({ params }: PageProps) {
  const { moduleId, lessonId } = await params
  const result = getLessonById(moduleId, lessonId)

  if (!result) notFound()

  const { lesson, module } = result
  const adjacent = getAdjacentLessons(moduleId, lessonId)

  // Gate non-free lessons behind authentication
  const isFree = FREE_LESSON_IDS.has(lessonId)
  if (!isFree) {
    const session = await getServerSession(authOptions)
    if (!session) {
      return (
        <GateOverlay
          lesson={lesson}
          module={module}
          allModules={courseModules}
          prev={adjacent.prev}
          next={adjacent.next}
        />
      )
    }
  }

  return (
    <CoursePlayerClient
      lesson={lesson}
      module={module}
      allModules={courseModules}
      prev={adjacent.prev}
      next={adjacent.next}
    />
  )
}
