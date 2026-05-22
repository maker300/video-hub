import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { sendTelegramMessage } from '@/lib/telegram'
import { sendBulkEmail } from '@/lib/email'
import { buildWelcomeEmail, buildWelcomeText } from '@/lib/email-templates'

export async function POST(req: Request) {
  // 5 registration attempts per IP per 15 minutes
  const ip = getClientIp(req)
  if (!rateLimit(`${ip}:register`, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      { status: 429 },
    )
  }

  try {
    const { name, email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      // Generic message — don't reveal whether the email is registered (prevents enumeration)
      return NextResponse.json({ error: 'Unable to create account. Please try a different email or sign in.' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name:     name?.trim() || null,
        email:    email.toLowerCase().trim(),
        password: hashedPassword,
      },
    })

    // Grant free 1-month trial access
    const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await prisma.analysisAccess.create({
      data: {
        userId:    user.id,
        type:      'one_month',
        startDate: new Date(),
        endDate:   trialEnd,
        active:    true,
        note:      'Free trial on signup',
      },
    }).catch(() => {})  // non-fatal if already exists

    // Welcome email + in-app notification (fire-and-forget)
    sendBulkEmail(
      [{ name: user.name, email: user.email }],
      'Welcome to Forex Mastery — your free 1-month trial is active',
      () => buildWelcomeEmail(user.name),
      () => buildWelcomeText(user.name),
    ).catch(() => {})

    prisma.adminNotification.create({
      data: {
        userId:  user.id,
        subject: '🎉 Welcome to Forex Mastery — 1 Month Free Trial Activated',
        message: `Your free 1-month trial is now active. You have full access to FM Trader analysis, live signals, and all pair insights until ${trialEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. Head to the Analysis page to run your first prediction.`,
      },
    }).catch(() => {})

    // Notify admin via Telegram (fire-and-forget)
    sendTelegramMessage(
      `🆕 <b>New User Signup</b>\n👤 ${user.name ?? 'No name'}\n📧 ${user.email}\n🕐 ${new Date().toUTCString()}`
    ).catch(() => {})

    return NextResponse.json({
      id:    user.id,
      email: user.email,
      name:  user.name,
    }, { status: 201 })

  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
