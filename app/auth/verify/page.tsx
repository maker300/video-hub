'use client'

import Link from 'next/link'

export default function VerifyPage() {
  return (
    <div className="bg-[#131722] border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
      <div className="w-14 h-14 rounded-full bg-[#1D9E75]/10 border border-[#1D9E75]/20 flex items-center justify-center mx-auto mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      </div>
      <h1 className="text-xl font-bold text-white mb-2">Check your email</h1>
      <p className="text-sm text-gray-400 mb-2">
        A sign-in link has been sent to your email address.
      </p>
      <p className="text-xs text-gray-500 mb-6">
        Click the link in the email to sign in. The link expires in 24 hours.
      </p>
      <Link
        href="/auth/signin"
        className="text-sm text-[#1D9E75] hover:underline"
      >
        ← Back to sign in
      </Link>
    </div>
  )
}
