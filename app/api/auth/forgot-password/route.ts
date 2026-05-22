import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { sendEmail } from '@/lib/email'
import { buildPasswordResetEmail, buildPasswordResetText } from '@/lib/email-templates'

export async function POST(req: Request) {
  // 3 requests per IP per hour
  const ip = getClientIp(req)
  if (!rateLimit(`${ip}:forgot-password`, 3, 60 * 60 * 1000)) {
    return NextResponse.json({ ok: true }) // silent — don't leak rate limit info
  }

  let email: string
  try {
    const body = await req.json()
    email = (body.email ?? '').toLowerCase().trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: true }) // silent — don't reveal whether email exists
  }

  const user = await prisma.user.findUnique({ where: { email } })

  // Always return ok regardless of whether the user exists (prevents email enumeration)
  if (!user || !user.password) {
    // No account or OAuth-only account — silently succeed
    return NextResponse.json({ ok: true })
  }

  // Delete any existing tokens for this email
  await (prisma as any).passwordResetToken.deleteMany({ where: { email } })

  // Create a new token — expires in 1 hour
  const token   = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 60 * 60 * 1000)

  await (prisma as any).passwordResetToken.create({
    data: { email, token, expires },
  })

  const baseUrl  = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`

  await sendEmail({
    to:      [{ email, name: user.name ?? undefined }],
    subject: 'Reset your Forex Mastery password',
    html:    buildPasswordResetEmail(user.name, resetUrl),
    text:    buildPasswordResetText(user.name, resetUrl),
  }).catch(err => {
    console.error('[forgot-password] email send failed:', err)
  })

  return NextResponse.json({ ok: true })
}
