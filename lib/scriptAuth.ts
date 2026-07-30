/**
 * Shared-secret check for the endpoints the Video Hub / Remotion pipeline reads
 * from: approved trade scripts, lesson videos, and lesson images.
 *
 * Fails CLOSED. If FM_SCRIPT_API_KEY is unset, every request is denied.
 *
 * Each call site previously inlined `if (apiKey && provided !== apiKey)`, which
 * does the opposite: an unset or renamed env var silently removed the check and
 * published these routes to anyone. The EA routes (app/api/broker/*) and
 * lib/adminAuth.ts already fail closed; this brings the rest in line.
 */
export function checkScriptKey(req: Request): boolean {
  const expected = process.env.FM_SCRIPT_API_KEY
  if (!expected) {
    console.error('[scriptAuth] FM_SCRIPT_API_KEY is not set — request denied')
    return false
  }

  // The `?key=` form exists because Remotion's <Img> and similar contexts
  // cannot set request headers. Query strings land in server and proxy logs,
  // so this key should stay read-only and be rotated independently of any
  // header-only secret.
  const provided =
    req.headers.get('x-api-key') ?? new URL(req.url).searchParams.get('key')

  return provided === expected
}
