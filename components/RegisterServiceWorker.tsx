// Registers /sw.js on mount. Small enough to inline in the root layout,
// but kept as a client component so the layout stays a server component
// with its static metadata untouched.
//
// Runs once per page-load. Browsers dedupe registration internally, so
// this is safe on route changes too. Failures log but never throw — the
// site works fine without a service worker, we just lose the install
// prompt on Android.
'use client'

import { useEffect } from 'react'

export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    // Register on next tick so it doesn't compete with the first paint.
    const id = window.setTimeout(() => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(err => {
        console.warn('[sw] register failed:', err)
      })
    }, 100)
    return () => clearTimeout(id)
  }, [])
  return null
}
