import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { sendTelegramMessage } from '@/lib/telegram'

export async function POST(req: Request) {
  // 5 attempts per IP per 15 minutes
  const ip = getClientIp(req)
  if (!rateLimit(`${ip}:reset-password`, 5, 15 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }

  let token: string, password: string
  try {
    const body = await req.json()
    token    = (body.token ?? '').trim()
    password = body.password ?? ''
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!token || !password) {
    return NextResponse.json({ error: 'Token and password are required.' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const db = prisma as any

  // Find and validate token
  const record = await db.passwordResetToken.findUnique({ where: { token } })

  if (!record) {
    return NextResponse.json({ error: 'Invalid or expired reset link.' }, { status: 400 })
  }

  if (new Date(record.expires) < new Date()) {
    await db.passwordResetToken.delete({ where: { token } })
    return NextResponse.json({ error: 'This reset link has expired. Please request a new one.' }, { status: 400 })
  }

  // Find user
  const user = await prisma.user.findUnique({ where: { email: record.email } })
  if (!user) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
  }

  // Hash and save new password
  const hashed = await bcrypt.hash(password, 12)
  await prisma.user.update({
    where: { id: user.id },
    data:  { password: hashed },
  })

  // Delete the used token
  await db.passwordResetToken.delete({ where: { token } })

  // Notify admin — support ticket (fire-and-forget)
  db.supportTicket.create({
    data: {
      userId:    user.id,
      subject:   `🔑 Password Reset — ${user.email}`,
      messages:  [{ role: 'assistant', content: `User ${user.name ?? user.email} successfully reset their password on ${new Date().toUTCString()}.` }],
      status:    'resolved',
      priority:  'low',
      adminNote: 'Auto-generated system notice. No action required.',
    },
  }).catch(() => {})

  sendTelegramMessage(
    `🔑 <b>Password Reset</b>\n👤 ${user.name ?? 'No name'}\n📧 ${user.email}\n🕐 ${new Date().toUTCString()}`
  ).catch(() => {})

  return NextResponse.json({ ok: true })
}
