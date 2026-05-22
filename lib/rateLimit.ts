/**
 * Simple in-memory rate limiter.
 * Works on Vercel serverless (per-instance) — good enough to stop bots and
 * casual abuse. For distributed rate limiting at scale, swap for Upstash Redis.
 */

interface Window {
  count:    number
  resetAt:  number
}

const store = new Map<string, Window>()

// Clean up stale entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now()
  for (const [key, win] of store.entries()) {
    if (now > win.resetAt) store.delete(key)
  }
}, 5 * 60 * 1000)

/**
 * @param key        — usually `ip:route`, e.g. "1.2.3.4:register"
 * @param limit      — max requests allowed in the window
 * @param windowMs   — rolling window in milliseconds
 * @returns true if the request is allowed, false if rate-limited
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const win = store.get(key)

  if (!win || now > win.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (win.count >= limit) return false

  win.count++
  return true
}

/**
 * Extract client IP from a Next.js Request object.
 *
 * Priority order (most trustworthy first):
 *  1. x-vercel-forwarded-for — set by Vercel's edge; clients CANNOT spoof this
 *     (Vercel strips any incoming header with this name and sets its own).
 *  2. x-real-ip — set by reverse proxies in trusted infrastructure.
 *  3. x-forwarded-for LAST IP — the rightmost IP is added by the last trusted
 *     proxy; using the leftmost value is spoofable by clients.
 *  4. 'unknown' — all unknowns share a bucket so rate limiting still applies.
 */
export function getClientIp(req: Request): string {
  const h = req.headers
  // Vercel-specific: guaranteed tamper-proof on Vercel deployments
  const vercelIp = h.get('x-vercel-forwarded-for')
  if (vercelIp) return vercelIp.split(',')[0].trim()

  // Trusted reverse proxy header
  const realIp = h.get('x-real-ip')
  if (realIp) return realIp.trim()

  // x-forwarded-for: use the LAST entry (added by the final trusted proxy),
  // not the first (which clients can inject).
  const forwarded = h.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded.split(',')
    return parts[parts.length - 1].trim()
  }

  return 'unknown'
}
