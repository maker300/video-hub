import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getLessonById, getAdjacentLessons, courseModules, totalLessons } from '@/lib/courseData'
import CoursePlayerClient from './CoursePlayerClient'
import GateOverlay from '@/components/GateOverlay'
import { getCourseAccess } from '@/lib/course-pricing'

// Only the first lesson of module-1 is free; everything else requires sign-in
const FREE_LESSON_IDS = new Set(
  courseModules
    .find(m => m.id === 'module-1')
    ?.lessons.slice(0, 1)
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

  // Two-stage gate on non-free lessons:
  //   1. Not signed in            → sign-in gate (unchanged)
  //   2. Signed in, hasn't bought → purchase gate
  // The first lesson of module 1 stays free in both cases so visitors can
  // judge the material before paying. Staff bypass via getCourseAccess.
  const isFree = FREE_LESSON_IDS.has(lessonId)
  if (!isFree) {
    const session = await getServerSession(authOptions)
    if (!session) {
      return (
        <GateOverlay
          lesson={lesson} module={module} allModules={courseModules}
          prev={adjacent.prev} next={adjacent.next}
          mode="signin" totalLessons={totalLessons}
        />
      )
    }

    const access = await getCourseAccess((session.user as { id?: string })?.id)
    if (!access.purchased) {
      return (
        <GateOverlay
          lesson={lesson} module={module} allModules={courseModules}
          prev={adjacent.prev} next={adjacent.next}
          mode="purchase" price={access.price} legacy={access.legacy}
          totalLessons={totalLessons}
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
