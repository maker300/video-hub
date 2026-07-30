'use client'

// Polling that pauses while the tab is hidden.
//
// Why: every interval that fires while the user has the tab in the background
// still hits our API (and Neon's egress budget) for no user-visible benefit.
// This hook skips the tick when `document.hidden`, and triggers an immediate
// catch-up fetch the moment the tab comes back into focus — so the user never
// sees stale data when they return.

import { useEffect, useRef } from 'react'

export function usePolling(
  fetchFn: () => void | Promise<void>,
  intervalMs: number,
  deps: React.DependencyList = [],
) {
  // Keep a ref to the latest fetchFn so the effect doesn't re-run on every render
  // just because the closure identity changed.
  const fetchRef = useRef(fetchFn)
  useEffect(() => { fetchRef.current = fetchFn }, [fetchFn])

  useEffect(() => {
    let alive = true
    const tick = () => { if (alive && !document.hidden) void fetchRef.current() }
    const onVisible = () => { if (!document.hidden) tick() }

    tick()  // initial fetch
    const id = setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      alive = false
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps])
}
