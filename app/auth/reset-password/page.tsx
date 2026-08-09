'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { KeyRound, CheckCircle2 } from 'lucide-react'

const INPUT = 'w-full px-4 py-3 rounded-lg bg-[#161b2b] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#1D9E75] transition text-sm'
const BTN   = 'w-full py-3 rounded-lg bg-[#1D9E75] hover:bg-[#17856A] disabled:opacity-60 text-white font-semibold transition text-sm'

function Spinner() {
  return (
    <span
      className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
      style={{ animation: 'spin 0.7s linear infinite' }}
    />
  )
}

function ResetContent() {
  const router = useRouter()
  const params = useSearchParams()
  const token  = params.get('token') ?? ''

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState('')

  if (!token) {
    return (
      <div className="bg-[#131722] border border-white/10 rounded-2xl p-5 sm:p-8 shadow-2xl text-center">
        <p className="text-red-400 text-sm mb-4">Invalid or missing reset link.</p>
        <Link href="/auth/forgot-password" className="text-[#1D9E75] hover:underline text-sm">
          Request a new one
        </Link>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
      } else {
        setDone(true)
        setTimeout(() => router.push('/auth/signin'), 3000)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div className="bg-[#131722] border border-white/10 rounded-2xl p-5 sm:p-8 shadow-2xl">

        {done ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Password updated!</h1>
            <p className="text-sm text-gray-400">Redirecting you to sign in…</p>
          </div>
        ) : (
          <>
            <div className="w-11 h-11 rounded-xl bg-[#1D9E75]/10 border border-[#1D9E75]/30 flex items-center justify-center mb-4">
              <KeyRound className="w-5 h-5 text-[#1D9E75]" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-1">Set new password</h1>
            <p className="text-sm text-gray-400 mb-6">Choose a strong password for your account.</p>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
                {error.includes('expired') && (
                  <Link href="/auth/forgot-password" className="block mt-1 text-[#1D9E75] hover:underline">
                    Request a new reset link →
                  </Link>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-xs text-gray-400 mb-1.5">New password</label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    disabled={loading}
                    className={INPUT + ' pr-10'}
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    tabIndex={-1}
                  >
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Confirm new password</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  required
                  disabled={loading}
                  className={INPUT}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className={BTN + ' mt-2'}
              >
                {loading
                  ? <span className="flex items-center justify-center gap-2"><Spinner /> Updating…</span>
                  : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="bg-[#131722] border border-white/10 rounded-2xl p-5 sm:p-8 shadow-2xl">
        <div className="h-7 bg-white/10 rounded w-1/2 mb-2 animate-pulse" />
        <div className="h-4 bg-white/5 rounded w-2/3 mb-6" />
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg" />)}
        </div>
      </div>
    }>
      <ResetContent />
    </Suspense>
  )
}
