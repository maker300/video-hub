'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/** Fire-and-forget page view tracker. Call once per page layout. */
export function usePageTrack() {
  const pathname = usePathname()

  useEffect(() => {
    // Best-effort — never block render
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => null)
  }, [pathname])
}
