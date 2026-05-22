'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Trophy, RotateCcw, ChevronRight } from 'lucide-react'
import type { Quiz as QuizType } from '@/types'
import { saveQuizScore, getProgress } from '@/lib/progress'

interface QuizProps {
  quiz: QuizType
  lessonId: string
  onComplete?: (score: number) => void
}

export default function Quiz({ quiz, lessonId, onComplete }: QuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(quiz.questions.length).fill(null))
  const [completed, setCompleted] = useState(false)
  const [previousScore, setPreviousScore] = useState<number | null>(null)

  useEffect(() => {
    const p = getProgress()
    if (p.quizScores[lessonId] !== undefined) {
      setPreviousScore(p.quizScores[lessonId])
    }
  }, [lessonId])

  const q = quiz.questions[currentQuestion]
  const isCorrect = selectedAnswer === q.correctAnswer
  const score = answers.filter((a, i) => a === quiz.questions[i].correctAnswer).length
  const percentage = Math.round((score / quiz.questions.length) * 100)

  function handleAnswerSelect(idx: number) {
    if (selectedAnswer !== null) return
    setSelectedAnswer(idx)
    setShowExplanation(true)
    const newAnswers = [...answers]
    newAnswers[currentQuestion] = idx
    setAnswers(newAnswers)
  }

  function handleNext() {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setSelectedAnswer(null)
      setShowExplanation(false)
    } else {
      // Calculate final score
      const finalAnswers = [...answers]
      const finalScore = finalAnswers.filter((a, i) => a === quiz.questions[i].correctAnswer).length
      const finalPct = Math.round((finalScore / quiz.questions.length) * 100)
      saveQuizScore(lessonId, finalPct)
      setCompleted(true)
      onComplete?.(finalPct)
    }
  }

  function handleRetry() {
    setCurrentQuestion(0)
    setSelectedAnswer(null)
    setShowExplanation(false)
    setAnswers(new Array(quiz.questions.length).fill(null))
    setCompleted(false)
  }

  if (completed) {
    return (
      <div className="bg-[#0d1b2a] rounded-xl border border-white/10 p-6">
        <div className="text-center py-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
            percentage >= 70 ? 'bg-emerald-500/20' : 'bg-orange-500/20'
          }`}>
            <Trophy className={`w-10 h-10 ${percentage >= 70 ? 'text-emerald-400' : 'text-orange-400'}`} />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">Quiz Complete!</h3>
          <p className="text-gray-400 mb-6">
            You scored <span className={`font-bold ${percentage >= 70 ? 'text-emerald-400' : 'text-orange-400'}`}>
              {score}/{quiz.questions.length}
            </span> ({percentage}%)
          </p>

          {/* Score breakdown */}
          <div className="grid grid-cols-3 gap-3 mb-6 max-w-xs mx-auto">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-2xl font-bold text-white">{score}</div>
              <div className="text-xs text-emerald-400">Correct</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-2xl font-bold text-white">{quiz.questions.length - score}</div>
              <div className="text-xs text-red-400">Wrong</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-2xl font-bold text-white">{percentage}%</div>
              <div className="text-xs text-gray-400">Score</div>
            </div>
          </div>

          {percentage < 70 && (
            <p className="text-orange-300 text-sm mb-4">Try again to improve your score!</p>
          )}
          {percentage >= 70 && (
            <p className="text-emerald-300 text-sm mb-4">Great work! You've mastered this lesson.</p>
          )}

          <button
            onClick={handleRetry}
            className="flex items-center gap-2 mx-auto text-sm text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0d1b2a] rounded-xl border border-white/10 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">Knowledge Check</h3>
        <div className="flex items-center gap-2">
          {previousScore !== null && (
            <span className="text-xs text-gray-500">
              Best: <span className="text-emerald-400">{previousScore}%</span>
            </span>
          )}
          <span className="text-sm text-gray-400 bg-white/5 px-3 py-1 rounded-full">
            {currentQuestion + 1} / {quiz.questions.length}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-white/10 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${((currentQuestion + (selectedAnswer !== null ? 1 : 0)) / quiz.questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <div className="mb-6">
        <p className="text-white font-medium text-base leading-relaxed">{q.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {q.options.map((option, idx) => {
          let stateClass = 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20 hover:text-white cursor-pointer'

          if (selectedAnswer !== null) {
            if (idx === q.correctAnswer) {
              stateClass = 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 cursor-default'
            } else if (idx === selectedAnswer && idx !== q.correctAnswer) {
              stateClass = 'bg-red-500/15 border-red-500/50 text-red-300 cursor-default'
            } else {
              stateClass = 'bg-white/3 border-white/5 text-gray-500 cursor-default'
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleAnswerSelect(idx)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-lg border transition-all text-left ${stateClass}`}
              disabled={selectedAnswer !== null}
            >
              <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="text-sm flex-1">{option}</span>
              {selectedAnswer !== null && idx === q.correctAnswer && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              {selectedAnswer !== null && idx === selectedAnswer && idx !== q.correctAnswer && (
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
            </button>
          )
        })}
      </div>

      {/* Explanation */}
      {showExplanation && (
        <div className={`p-4 rounded-lg mb-4 text-sm ${
          isCorrect ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200' : 'bg-red-500/10 border border-red-500/20 text-red-200'
        }`}>
          <div className="flex items-start gap-2">
            {isCorrect
              ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
            }
            <div>
              <p className="font-medium mb-1">{isCorrect ? 'Correct!' : 'Not quite.'}</p>
              <p className="opacity-90">{q.explanation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Next button */}
      {selectedAnswer !== null && (
        <button
          onClick={handleNext}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {currentQuestion < quiz.questions.length - 1 ? (
            <>Next Question <ChevronRight className="w-4 h-4" /></>
          ) : (
            <>See Results <Trophy className="w-4 h-4" /></>
          )}
        </button>
      )}
    </div>
  )
}
