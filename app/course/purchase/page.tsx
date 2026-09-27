import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getCourseAccess, COURSE_PRICE_STANDARD,
  COURSE_BONUS_TOKENS, COURSE_LIVE_CALLS, COURSE_LIVE_CALL_WEEKS,
} from '@/lib/course-pricing'
import { courseModules, totalLessons } from '@/lib/courseData'
import PurchaseClient from './PurchaseClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title:       'Get full course access — Forex Mastery',
  description: 'One-off payment for lifetime access to every module, lesson, quiz and the AI tutor.',
}

export default async function CoursePurchasePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) redirect('/auth/signin?callbackUrl=/course/purchase')

  const access = await getCourseAccess((session.user as { id?: string }).id)
  // Already bought — nothing to sell them.
  if (access.purchased) redirect('/course')

  const totalDuration = courseModules.reduce(
    (acc, m) => acc + m.lessons.reduce((a, l) => a + l.duration, 0), 0
  )

  return (
    <PurchaseClient
      price={access.price}
      legacy={access.legacy}
      standardPrice={COURSE_PRICE_STANDARD}
      moduleCount={courseModules.length}
      lessonCount={totalLessons}
      hours={Math.round(totalDuration / 60)}
      bonusTokens={COURSE_BONUS_TOKENS}
      liveCalls={COURSE_LIVE_CALLS}
      liveWeeks={COURSE_LIVE_CALL_WEEKS}
    />
  )
}
