'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const INPUT = 'w-full px-4 py-3 rounded-lg bg-[#161b2b] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#1D9E75] transition text-sm'
const BTN_PRIMARY = 'w-full py-3 rounded-lg bg-[#1D9E75] hover:bg-[#17856A] disabled:opacity-60 text-white font-semibold transition text-sm'
const BTN_SOCIAL = 'w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[#161b2b] border border-white/10 hover:border-white/25 disabled:opacity-50 text-white text-sm font-medium transition cursor-pointer'

function Spinner() {
  return (
    <span
      className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
      style={{ animation: 'spin 0.7s linear infinite' }}
    />
  )
}

function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8)          score++
  if (pw.length >= 12)         score++
  if (/[A-Z]/.test(pw))        score++
  if (/[0-9]/.test(pw))        score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { score, label: 'Weak',   color: '#ef5350' }
  if (score <= 2) return { score, label: 'Fair',   color: '#f5c518' }
  if (score <= 3) return { score, label: 'Good',   color: '#26a69a' }
  return                { score, label: 'Strong', color: '#1D9E75' }
}

function SignUpContent() {
  const router = useRouter()

  const [name,           setName]           = useState('')
  const [email,          setEmail]          = useState('')
  const [password,       setPassword]       = useState('')
  const [showPw,         setShowPw]         = useState(false)
  const [loadingProvider,setLoadingProvider]= useState<string | null>(null)
  const [error,          setError]          = useState('')

  const busy     = loadingProvider !== null
  const strength = getStrength(password)

  async function handleOAuth(provider: string) {
    setError('')
    setLoadingProvider(provider)
    await signIn(provider, { callbackUrl: '/course' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoadingProvider('credentials')

    const res = await fetch('/api/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, email, password }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Registration failed. Please try again.')
      setLoadingProvider(null)
      return
    }

    const result = await signIn('credentials', {
      email, password, redirect: false, callbackUrl: '/course',
    })

    if (result?.error) {
      router.push('/auth/signin')
    } else {
      router.push('/course')
    }
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div className="bg-[#131722] border border-white/10 rounded-2xl p-5 sm:p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-1">Start learning today</h1>
        <p className="text-sm text-gray-400 mb-6">Create your free account — no credit card needed</p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}


        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Full name <span className="text-gray-600">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jane Doe"
              disabled={busy}
              className={INPUT}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={busy}
              className={INPUT}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
                disabled={busy}
                className={INPUT + ' pr-10'}
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
            {password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(i => (
                    <div
                      key={i}
                      className="flex-1 h-1 rounded-full transition-all"
                      style={{ background: i <= strength.score ? strength.color : '#1e2538' }}
                    />
                  ))}
                </div>
                <p className="text-xs mt-1" style={{ color: strength.color }}>{strength.label}</p>
              </div>
            )}
          </div>

          <button type="submit" disabled={busy} className={BTN_PRIMARY + ' mt-2'}>
            {loadingProvider === 'credentials' ? 'Creating account…' : 'Create free account'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-4">
          By signing up you agree to our{' '}
          <span className="text-gray-400">Terms of Service</span>
          {' & '}
          <span className="text-gray-400">Privacy Policy</span>
        </p>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-[#1D9E75] hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="bg-[#131722] border border-white/10 rounded-2xl p-5 sm:p-8 shadow-2xl">
        <div className="h-7 bg-white/10 rounded w-1/2 mb-2 animate-pulse" />
        <div className="h-4 bg-white/5 rounded w-2/3 mb-6" />
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg" />)}
        </div>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  )
}
