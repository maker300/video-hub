export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

export interface Quiz {
  questions: QuizQuestion[]
}

export interface Lesson {
  id: string
  moduleId: string
  lessonNumber: number
  title: string
  description: string
  duration: number // minutes
  videoTitle: string
  content: string // HTML content
  quiz: Quiz
}

export interface Module {
  id: string
  moduleNumber: number
  title: string
  description: string
  lessons: Lesson[]
}

export interface UserProgress {
  completedLessons: string[]
  quizScores: Record<string, number>
  lastLesson: string | null
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}
