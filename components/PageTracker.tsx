'use client'

import { usePageTrack } from '@/lib/usePageTrack'

/** Renders nothing — just fires the page-view tracker on every route change. */
export default function PageTracker() {
  usePageTrack()
  return null
}
