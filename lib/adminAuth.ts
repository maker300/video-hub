/**
 * Reads the next-auth JWT cookie directly via next/headers and decodes it.
 * Works reliably in Next.js 16 App Router route handlers without needing
 * getServerSession or getToken (both have issues in this version).
 */
import { cookies } from 'next/headers'
import { decode } from 'next-auth/jwt'

// Decodes the next-auth JWT once and returns full session info (id, email, role).
// Use this from any route that needs to know who's calling — not just admin gates.
export async function getSessionInfo(): Promise<{ id: string | null; email: string | null; role: string | null }> {
  try {
    const cookieStore = await cookies()
    const token =
      cookieStore.get('next-auth.session-token')?.value ??
      cookieStore.get('__Secure-next-auth.session-token')?.value
    if (!token) return { id: null, email: null, role: null }
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) return { id: null, email: null, role: null }
    const decoded = await decode({ token, secret })
    return {
      id:    (decoded?.sub as string) ?? null,
      email: (decoded?.email as string) ?? null,
      role:  (decoded?.role as string) ?? null,
    }
  } catch {
    return { id: null, email: null, role: null }
  }
}

export async function getAdminSession(): Promise<{ isAdmin: boolean; role: string | null }> {
  try {
    const cookieStore = await cookies()

    // next-auth stores the session token under one of two names depending on
    // whether NEXTAUTH_URL is https (secure) or http (dev/local)
    const token =
      cookieStore.get('next-auth.session-token')?.value ??
      cookieStore.get('__Secure-next-auth.session-token')?.value

    if (!token) return { isAdmin: false, role: null }

    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      console.error('[adminAuth] NEXTAUTH_SECRET is not set — admin access denied')
      return { isAdmin: false, role: null }
    }

    const decoded = await decode({ token, secret })

    const role = (decoded?.role as string) ?? null
    return { isAdmin: role === 'admin', role }
  } catch (err) {
    console.error('[adminAuth] JWT decode failed:', err)
    return { isAdmin: false, role: null }
  }
}
