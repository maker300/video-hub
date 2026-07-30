import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Sends signed-in visitors from the marketing page straight to their course.
//
// This used to be a getServerSession() call at the top of app/page.tsx. Reading
// cookies there opted the whole route out of static rendering, so the landing
// page — the highest-traffic page on the site — re-rendered on every request and
// cold-started at ~7s. Doing the redirect here keeps app/page.tsx static and
// CDN-cacheable while preserving the same behaviour for signed-in users.
//
// Only the presence of the session cookie is checked, not its signature: this
// is a convenience redirect, not an access control. Every protected route still
// verifies the session itself, and a stale cookie just lands on /course, which
// bounces to /auth/signin as it always has.
export function middleware(req: NextRequest) {
  const hasSession =
    req.cookies.has('next-auth.session-token') ||
    req.cookies.has('__Secure-next-auth.session-token')

  if (hasSession) {
    return NextResponse.redirect(new URL('/course', req.url))
  }

  return NextResponse.next()
}

// Scoped to the landing page only — this must not add latency anywhere else.
export const config = {
  matcher: '/',
}
