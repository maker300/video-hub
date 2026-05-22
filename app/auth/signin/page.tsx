'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

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

function SignInContent() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') ?? '/course'
  const errorParam  = params.get('error')

  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [showPw,          setShowPw]          = useState(false)
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const [error,           setError]           = useState(
    errorParam === 'OAuthAccountNotLinked'
      ? 'This email is already linked to a different sign-in method.'
      : errorParam === 'CredentialsSignin'
      ? 'Invalid email or password.'
      : errorParam === 'OAuthSignin' || errorParam === 'OAuthCallback'
      ? 'Could not connect to that provider. Try again or use email below.'
      // 'Configuration' means OAuth keys aren't set up yet — not a user error, don't show banner
      : ''
  )

  const busy = loadingProvider !== null

  async function handleOAuth(provider: string) {
    setError('')
    setLoadingProvider(provider)
    // signIn redirects the browser — no need to reset state
    await signIn(provider, { callbackUrl })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoadingProvider('credentials')

    const result = await signIn('credentials', {
      email, password, redirect: false, callbackUrl,
    })

    if (result?.error) {
      setError('Invalid email or password.')
      setLoadingProvider(null)
    } else {
      router.push(callbackUrl)
    }
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div className="bg-[#131722] border border-white/10 rounded-2xl p-5 sm:p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
        <p className="text-sm text-gray-400 mb-6">Sign in to continue your trading journey</p>

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
              disabled={busy}
              className={INPUT}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs text-gray-400">Password</label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-[#1D9E75] hover:underline"
                tabIndex={-1}
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
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
          </div>
          <button type="submit" disabled={busy} className={BTN_PRIMARY + ' mt-2'}>
            {loadingProvider === 'credentials' ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-[#1D9E75] hover:underline font-medium">
            Sign up free
          </Link>
        </p>
      </div>
    </>
  )
}

export default function SignInPage() {
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
      <SignInContent />
    </Suspense>
  )
}
