// Performance / cost-saver flags. Admin can flip these from
// Admin → Settings → Performance Controls to throttle the heaviest CPU
// consumers when the Vercel Fluid Active CPU budget is tight.
//
// Storage: one row in AdminSetting keyed 'perf_flags' with a JSON value.
// Read-side: every call goes through getPerfFlags() which caches in-process
// for 30s so we don't hit the DB on every heavy request.

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export type PollMode = 'normal' | 'slow' | 'off'

export interface PerfFlags {
  // FM Trader: skip the Claude narrative call — rule-engine output still ships
  claudeNarrative:    boolean
  // /api/generate-audio: skip TTS generation; cached audio still plays
  lessonAudio:        boolean
  // /api/admin/lesson-images POST + regenerate: block Imagen 3 calls. Existing
  // approved images still serve to Video Hub. Use when image-gen cost spikes.
  lessonImageGen:     boolean
  // /api/fm-trader/check-outcomes: skip the work but return 200 (so crons don't error)
  autoCheckOutcomes:  boolean
  // /api/cron/scan: skip the heavy scan
  cronScan:           boolean
  // Client poll cadence (live-trades page)
  liveTradePoll:      PollMode
  // Client poll cadence (analysis page live prices)
  marketLivePoll:     PollMode
  // FM Trader streaming response: when off, return single buffered JSON
  fmTraderStreaming:  boolean
}

export const DEFAULT_FLAGS: PerfFlags = {
  claudeNarrative:    true,
  lessonAudio:        true,
  lessonImageGen:     true,
  autoCheckOutcomes:  true,
  cronScan:           true,
  liveTradePoll:      'normal',
  marketLivePoll:     'normal',
  fmTraderStreaming:  true,
}

const KEY = 'perf_flags'
const CACHE_TTL_MS = 30_000

let cache: { flags: PerfFlags; ts: number } | null = null

export async function getPerfFlags(): Promise<PerfFlags> {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) return cache.flags
  try {
    const row = await prisma.adminSetting.findUnique({ where: { key: KEY } })
    const raw = (row?.value ?? {}) as Partial<PerfFlags>
    // Merge with defaults so missing fields don't crash
    const flags: PerfFlags = { ...DEFAULT_FLAGS, ...raw }
    cache = { flags, ts: Date.now() }
    return flags
  } catch {
    // On DB error fall back to defaults — never block traffic
    return DEFAULT_FLAGS
  }
}

export async function setPerfFlags(next: Partial<PerfFlags>): Promise<PerfFlags> {
  const current = await getPerfFlags()
  const merged: PerfFlags = { ...current, ...next }
  // Prisma's JSON column expects InputJsonValue; PerfFlags is structurally
  // a JSON object, so we cast via unknown to satisfy the index-signature check.
  const value = merged as unknown as Prisma.InputJsonValue
  await prisma.adminSetting.upsert({
    where:  { key: KEY },
    update: { value },
    create: { key: KEY, value },
  })
  cache = { flags: merged, ts: Date.now() }
  return merged
}

/** Map a poll mode + base interval into actual ms. Returns null when 'off'. */
export function pollIntervalMs(mode: PollMode, baseMs: number): number | null {
  if (mode === 'off')   return null
  if (mode === 'slow')  return baseMs * 5
  return baseMs
}
