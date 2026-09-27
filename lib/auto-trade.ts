// FM Trader auto-execute — shared helpers for the MT4/5 EA integration.
//
// LEGAL POSTURE (do not change without advice): this platform PUBLISHES
// signals. The user's own MetaTrader terminal executes them, on their own
// machine, against their own broker account, using credentials this site
// never sees or stores. That is a signal-service pattern, not discretionary
// account management. Every string shown to users must reflect that.

import { randomBytes, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'

/** Opaque bearer token handed to the EA. Prefixed so it's greppable in logs. */
export function generateAutoTradeKey(): string {
  return `fmk_${randomBytes(24).toString('base64url')}`
}

export interface AutoTradeUser {
  id:              string
  email:           string
  tokenBalance:    number
  enabled:         boolean
  killSwitch:      boolean
  maxRiskPct:      number
  maxConcurrent:   number
  minConfidence:   number
  allowedSlugs:    string[]
}

/**
 * Resolve the `Authorization: Bearer <key>` header an EA sends into a user.
 *
 * Returns null for any failure — missing header, unknown key, malformed.
 * Callers must treat null as 401 and MUST NOT leak which of those it was.
 *
 * Note on lookup: the key is stored plaintext and indexed unique, so this is
 * a single indexed read. The token is high-entropy (192 bits) and scoped to
 * signal delivery only — it cannot move money, change settings, or read
 * personal data. A constant-time compare is still applied after the fetch so
 * the DB index isn't the only thing standing between a guess and a match.
 */
export async function authenticateEA(req: Request): Promise<AutoTradeUser | null> {
  const header = req.headers.get('authorization') ?? ''
  const m = header.match(/^Bearer\s+(.+)$/i)
  if (!m) return null
  const presented = m[1].trim()
  if (!presented.startsWith('fmk_') || presented.length < 20) return null

  const row = await (prisma as any).user.findUnique({
    where:  { autoTradeApiKey: presented },
    select: {
      id: true, email: true, tokenBalance: true,
      autoTradeApiKey: true,
      autoTradeEnabled: true, autoTradeKillSwitch: true,
      autoTradeMaxRiskPct: true, autoTradeMaxConcurrent: true,
      autoTradeMinConfidence: true, autoTradeAllowedSlugs: true,
    },
  })
  if (!row?.autoTradeApiKey) return null

  // Constant-time confirmation of the exact match.
  const a = Buffer.from(row.autoTradeApiKey)
  const b = Buffer.from(presented)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  return {
    id:            row.id,
    email:         row.email,
    tokenBalance:  row.tokenBalance,
    enabled:       row.autoTradeEnabled,
    killSwitch:    row.autoTradeKillSwitch,
    maxRiskPct:    row.autoTradeMaxRiskPct,
    maxConcurrent: row.autoTradeMaxConcurrent,
    minConfidence: row.autoTradeMinConfidence,
    allowedSlugs:  Array.isArray(row.autoTradeAllowedSlugs) ? row.autoTradeAllowedSlugs as string[] : [],
  }
}

/** Clamp user-supplied risk settings into sane bounds before persisting. */
export function sanitiseSettings(input: {
  maxRiskPct?: unknown; maxConcurrent?: unknown; minConfidence?: unknown
}) {
  const num = (v: unknown, fallback: number) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
  }
  return {
    // 0.1%–5% per trade. Above 5% is account-destroying on a normal strategy
    // and we refuse to be the tool that makes it one click away.
    maxRiskPct:    Math.min(5,   Math.max(0.1, num(input.maxRiskPct, 1))),
    maxConcurrent: Math.min(10,  Math.max(1,   Math.round(num(input.maxConcurrent, 3)))),
    minConfidence: Math.min(100, Math.max(0,   Math.round(num(input.minConfidence, 70)))),
  }
}
