'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'

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

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      // Always show success — don't leak whether the email exists
      setSent(true)
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

        {sent ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Check your inbox</h1>
            <p className="text-sm text-gray-400 mb-6">
              If an account exists for <span className="text-white font-medium">{email}</span>, we&apos;ve sent a password reset link. It expires in 1 hour.
            </p>
            <p className="text-xs text-gray-600 mb-6">Didn&apos;t receive it? Check your spam folder or try again.</p>
            <Link
              href="/auth/signin"
              className="text-sm text-[#1D9E75] hover:underline font-medium flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition mb-5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </Link>

            <div className="w-11 h-11 rounded-xl bg-[#1D9E75]/10 border border-[#1D9E75]/30 flex items-center justify-center mb-4">
              <Mail className="w-5 h-5 text-[#1D9E75]" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-1">Forgot password?</h1>
            <p className="text-sm text-gray-400 mb-6">
              Enter your email and we&apos;ll send you a reset link.
            </p>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  className={INPUT}
                  autoFocus
                />
              </div>
              <button type="submit" disabled={loading || !email.trim()} className={BTN}>
                {loading ? <span className="flex items-center justify-center gap-2"><Spinner /> Sending…</span> : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </div>
    </>
  )
}
