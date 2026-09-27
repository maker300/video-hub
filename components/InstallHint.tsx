// iOS install hint — a small dismissible banner shown to iPhone / iPad
// Safari users so they can find "Add to Home Screen" without hunting.
//
// iOS never shows an automatic install prompt (that's a Chrome-only
// feature), and the Share → Add to Home Screen path is famously hidden.
// Without a hint, most iOS visitors leave without installing.
//
// Behaviour:
//   • iOS Safari, not already standalone, not dismissed → show hint
//   • iOS in-app browser (Instagram / FB / X in-app WebView) → show a
//     different message telling users to open in Safari first
//   • Everywhere else (Android, desktop, macOS Safari, etc) → render nothing
//     (Android has its own automatic install prompt via the SW/manifest,
//     desktop shows an address-bar icon)
//
// Dismissal model:
//   • On general pages, a dismissal sticks per-device via localStorage.
//   • On /auth/signin and /auth/signup, the dismissal flag is IGNORED
//     — sign-in and sign-up are high-intent moments (the user is about
//     to commit to the platform) and installing turns a "site" into an
//     "app" in their head. A close on that page only silences the hint
//     for the current mount; the next visit to /auth/* pops it again.
'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Share, X, Plus, Info } from 'lucide-react'

type State = 'hidden' | 'ios-safari' | 'ios-in-app'
const KEY = 'fm_install_hint_dismissed_v1'

export default function InstallHint() {
  const pathname = usePathname()
  const [state, setState] = useState<State>('hidden')

  // Auth pages force the banner regardless of previous dismissal.
  const isAuthPage = pathname === '/auth/signin' || pathname === '/auth/signup'

  useEffect(() => {
    // SSR guard
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return

    // Reset local state when navigating between pages so re-entering an
    // auth page shows the banner again even if the user closed it earlier
    // in this session.
    setState('hidden')

    // On non-auth pages, honour the persistent dismissal flag.
    if (!isAuthPage && localStorage.getItem(KEY) === '1') return

    const ua = navigator.userAgent || ''

    // Already installed — running in standalone display mode. No prompt needed.
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    if (isStandalone) return

    const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream
    if (!isIos) return

    // Detect the common in-app browsers. When the UA matches these, we know
    // Safari's share button is inaccessible until the user opens the site
    // in Safari directly. Tell them that instead of pretending share works.
    const isInApp = /FBAN|FBAV|Instagram|Line|WeChat|TikTok|Twitter|LinkedInApp|Snapchat|Pinterest|GSA|Google/i.test(ua)
    if (isInApp) {
      setState('ios-in-app')
      return
    }

    // iOS Safari — real deal
    setState('ios-safari')
  }, [isAuthPage, pathname])

  function dismiss() {
    // Auth-page dismissal is intentionally session-only: don't write to
    // localStorage. Every subsequent auth-page visit re-pops the banner
    // as a fresh install nudge. On non-auth pages we persist so users
    // aren't nagged after they've said no once.
    if (!isAuthPage) {
      try { localStorage.setItem(KEY, '1') } catch { /* private mode */ }
    }
    setState('hidden')
  }

  if (state === 'hidden') return null

  return (
    <div
      role="dialog"
      aria-label="Install Forex Mastery"
      className="fixed inset-x-3 bottom-3 z-[60] rounded-2xl border border-emerald-500/30 bg-[#0a0f1a]/95 backdrop-blur-md shadow-lg shadow-emerald-500/10 p-4 sm:hidden"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
          <Plus className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold">
            Install Forex Mastery
          </p>
          {state === 'ios-safari' ? (
            <p className="text-gray-400 text-xs leading-relaxed mt-1">
              Tap the{' '}
              <Share className="w-3.5 h-3.5 inline align-text-bottom text-blue-400 mx-0.5" aria-label="Share" />{' '}
              Share button in Safari&#39;s toolbar (bottom of the screen), then choose
              &ldquo;<span className="text-emerald-300 font-medium">Add to Home Screen</span>&rdquo;. It launches
              standalone, no browser bars.
            </p>
          ) : (
            <p className="text-gray-400 text-xs leading-relaxed mt-1">
              You&#39;re in an in-app browser. To install to your Home Screen, tap the
              menu ({state === 'ios-in-app' ? '⋯' : '…'}) and choose{' '}
              <span className="text-emerald-300 font-medium">&ldquo;Open in Safari&rdquo;</span>, then use Safari&#39;s Share
              button.
            </p>
          )}
          <p className="text-gray-600 text-[11px] mt-1.5 flex items-center gap-1">
            <Info className="w-3 h-3 shrink-0" />
            <span>Scroll up if the Safari toolbar is hidden.</span>
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss install hint"
          className="w-8 h-8 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 flex items-center justify-center shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
