'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

type ErrorInfo = { title: string; message: string; hint?: string }

function getErrorInfo(code: string | null): ErrorInfo {
  switch (code) {
    case 'Configuration':
      return {
        title:   'Provider not configured',
        message: 'The sign-in provider is not yet set up on this server.',
        hint:    'Add the required credentials (e.g. GOOGLE_CLIENT_ID) to .env.local and restart the dev server. See GOOGLE_OAUTH_SETUP.md for step-by-step instructions.',
      }
    case 'OAuthSignin':
    case 'OAuthCallback':
      return {
        title:   'Could not connect to provider',
        message: 'The OAuth sign-in failed. This usually means the provider credentials are missing or incorrect.',
        hint:    'Check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in .env.local. See GOOGLE_OAUTH_SETUP.md.',
      }
    case 'OAuthAccountNotLinked':
      return {
        title:   'Email already in use',
        message: 'This email address is already linked to a different sign-in method.',
        hint:    'Try signing in with the method you used originally (email/password or a different social provider).',
      }
    case 'AccessDenied':
      return {
        title:   'Access denied',
        message: 'You do not have permission to sign in.',
      }
    case 'Verification':
      return {
        title:   'Link expired',
        message: 'The sign-in link may have expired or already been used.',
        hint:    'Request a new sign-in link.',
      }
    case 'CredentialsSignin':
      return {
        title:   'Invalid credentials',
        message: 'Incorrect email or password.',
      }
    default:
      return {
        title:   'Something went wrong',
        message: 'An unexpected error occurred. Please try again.',
      }
  }
}

function ErrorContent() {
  const params = useSearchParams()
  const code   = params.get('error')
  const info   = getErrorInfo(code)

  return (
    <div className="bg-[#131722] border border-white/10 rounded-2xl p-8 shadow-2xl">
      {/* Icon */}
      <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef5350" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>

      <h1 className="text-xl font-bold text-white mb-2 text-center">{info.title}</h1>
      <p className="text-sm text-gray-400 text-center mb-4">{info.message}</p>

      {info.hint && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 mb-5">
          <p className="text-xs text-amber-300/80 leading-relaxed">{info.hint}</p>
        </div>
      )}

      {code && (
        <p className="text-center text-xs text-gray-600 mb-5">
          Error code: <span className="text-gray-500 font-mono">{code}</span>
        </p>
      )}

      <div className="space-y-2">
        <Link
          href="/auth/signin"
          className="block w-full py-3 rounded-lg bg-[#1D9E75] hover:bg-[#17856A] text-white text-sm font-semibold text-center transition"
        >
          Try again
        </Link>
        <Link
          href="/auth/signup"
          className="block w-full py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium text-center transition"
        >
          Sign up with email instead
        </Link>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="bg-[#131722] border border-white/10 rounded-2xl p-8 shadow-2xl">
        <div className="w-14 h-14 rounded-full bg-white/5 animate-pulse mx-auto mb-4" />
        <div className="h-5 bg-white/10 rounded w-2/3 mx-auto mb-2" />
        <div className="h-4 bg-white/5 rounded w-3/4 mx-auto" />
      </div>
    }>
      <ErrorContent />
    </Suspense>
  )
}
