'use client'

import type { UserProgress } from '@/types'

const PROGRESS_KEY = 'forex_course_progress'

function getDefaultProgress(): UserProgress {
  return {
    completedLessons: [],
    quizScores: {},
    lastLesson: null,
  }
}

export function getProgress(): UserProgress {
  if (typeof window === 'undefined') return getDefaultProgress()
  try {
    const stored = localStorage.getItem(PROGRESS_KEY)
    if (!stored) return getDefaultProgress()
    return JSON.parse(stored) as UserProgress
  } catch {
    return getDefaultProgress()
  }
}

export function saveProgress(progress: UserProgress): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

// Persist a lesson completion to the database (fire-and-forget, best effort)
function syncToDb(lessonId: string, quizScore?: number): void {
  fetch('/api/progress', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ lessonId, completed: true, quizScore }),
  }).catch(() => { /* silent — localStorage is the source of truth client-side */ })
}

export function markLessonComplete(lessonId: string): void {
  const progress = getProgress()
  if (!progress.completedLessons.includes(lessonId)) {
    progress.completedLessons.push(lessonId)
  }
  progress.lastLesson = lessonId
  saveProgress(progress)
  syncToDb(lessonId)
}

export function saveQuizScore(lessonId: string, score: number): void {
  const progress = getProgress()
  progress.quizScores[lessonId] = score
  saveProgress(progress)
  syncToDb(lessonId, score)
}

export function setLastLesson(lessonId: string): void {
  const progress = getProgress()
  progress.lastLesson = lessonId
  saveProgress(progress)
}

export function isLessonComplete(lessonId: string): boolean {
  const progress = getProgress()
  return progress.completedLessons.includes(lessonId)
}

export function getModuleProgress(moduleId: string, lessonIds: string[]): number {
  const progress = getProgress()
  const completed = lessonIds.filter(id => progress.completedLessons.includes(id))
  return lessonIds.length > 0 ? Math.round((completed.length / lessonIds.length) * 100) : 0
}

export function getOverallProgress(totalLessons: number): number {
  const progress = getProgress()
  return totalLessons > 0 ? Math.round((progress.completedLessons.length / totalLessons) * 100) : 0
}
