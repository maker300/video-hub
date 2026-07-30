'use client'

// Browser-side cache of /api/runtime-config so each component doesn't refetch.
// The endpoint is CDN-cached for 60s, so admin flag changes propagate within
// ~60s + however long the in-process cache lives.

export interface RuntimeConfig {
  liveTradePollMs:   number | null   // null = polling disabled
  marketLivePollMs:  number | null
  claudeNarrative:   boolean
  fmTraderStreaming: boolean
}

const DEFAULTS: RuntimeConfig = {
  liveTradePollMs:   60_000,
  marketLivePollMs:  30_000,
  claudeNarrative:   true,
  fmTraderStreaming: true,
}

let cache: { value: RuntimeConfig; ts: number } | null = null
let inflight: Promise<RuntimeConfig> | null = null
const TTL_MS = 60_000

export async function getRuntimeConfig(): Promise<RuntimeConfig> {
  if (cache && Date.now() - cache.ts < TTL_MS) return cache.value
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const r = await fetch('/api/runtime-config')
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const j = await r.json() as Partial<RuntimeConfig>
      const merged: RuntimeConfig = { ...DEFAULTS, ...j }
      cache = { value: merged, ts: Date.now() }
      return merged
    } catch {
      return DEFAULTS
    } finally {
      inflight = null
    }
  })()
  return inflight
}
