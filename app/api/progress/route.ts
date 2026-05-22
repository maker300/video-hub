import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET — fetch all progress for logged-in user
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as { id?: string }).id
  if (!userId) return NextResponse.json({ completedLessons: [] })

  const rows = await prisma.userProgress.findMany({
    where:  { userId, completed: true },
    select: { lessonId: true, completedAt: true, quizScore: true },
    orderBy: { completedAt: 'asc' },
  })

  return NextResponse.json({
    completedLessons: rows.map((r: { lessonId: string }) => r.lessonId),
    details: rows,
  })
}

// POST — mark a lesson complete (or upsert quiz score)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as { id?: string }).id
  if (!userId) return NextResponse.json({ error: 'No user id in session' }, { status: 400 })

  const { lessonId, completed = true, quizScore } = await req.json()
  if (!lessonId) return NextResponse.json({ error: 'lessonId required' }, { status: 400 })
  // Validate lessonId format to prevent arbitrary data being stored
  if (typeof lessonId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(lessonId)) {
    return NextResponse.json({ error: 'Invalid lessonId' }, { status: 400 })
  }

  const row = await prisma.userProgress.upsert({
    where:  { userId_lessonId: { userId, lessonId } },
    update: {
      completed,
      ...(completed ? { completedAt: new Date() } : {}),
      ...(quizScore !== undefined ? { quizScore } : {}),
    },
    create: {
      userId,
      lessonId,
      completed,
      completedAt: completed ? new Date() : null,
      quizScore:   quizScore ?? null,
    },
  })

  return NextResponse.json({ ok: true, row })
}
