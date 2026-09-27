import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientIp } from '@/lib/rateLimit'
import { sendTelegramMessage } from '@/lib/telegram'
import { sendBulkEmail } from '@/lib/email'
import { buildWelcomeEmail, buildWelcomeText } from '@/lib/email-templates'
import { creditTokens } from '@/lib/tokens'

const SIGNUP_TOKEN_GRANT = 10

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

    // Grant signup tokens. One token = one FM Trader prediction. 10 is a
    // taster: enough to judge the product, not enough to never need more.
    // Buying the course adds another 10 (see lib/course-pricing). Awaited
    // (not fire-and-forget) so the welcome copy cannot claim a grant that
    // failed to land.
    await creditTokens(user.id, SIGNUP_TOKEN_GRANT, 'signup_grant', 'welcome-grant').catch(err => {
      console.error('[register] signup token grant failed:', err)
    })

    // Welcome email + in-app notification (fire-and-forget)
    sendBulkEmail(
      [{ name: user.name, email: user.email }],
      `Welcome to Forex Mastery — ${SIGNUP_TOKEN_GRANT} free FM Trader tokens are in your account`,
      () => buildWelcomeEmail(user.name),
      () => buildWelcomeText(user.name),
    ).catch(() => {})

    prisma.adminNotification.create({
      data: {
        userId:  user.id,
        subject: `🎉 Welcome — ${SIGNUP_TOKEN_GRANT} free FM Trader tokens added`,
        message: `Your account is ready and ${SIGNUP_TOKEN_GRANT} FM Trader tokens have been credited to your balance. One token runs one prediction on any instrument — head to the Analysis page to try FM Trader.`,
        linkUrl: '/analysis',
      },
    }).catch(() => {})

    // Notify admin via Telegram (fire-and-forget)
    sendTelegramMessage(
      `🆕 <b>New User Signup</b>\n👤 ${user.name ?? 'No name'}\n📧 ${user.email}\n🎁 ${SIGNUP_TOKEN_GRANT} tokens granted\n🕐 ${new Date().toUTCString()}`
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
