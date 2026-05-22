import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

interface SupportMessage {
  role: 'user' | 'assistant'
  content: string
  // step is sent by the widget so the route never has to count assistant messages
  // (counting breaks when admin-reply messages are in the thread)
}

interface ChatRequest {
  messages:  SupportMessage[]
  ticketId?: string
  step:      number   // 1-based: which user-message turn is this?
  isGuest:   boolean
}

const db = prisma as any

// ── Tone helpers ──────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function seemsUrgent(msg: string) {
  return /urgent|asap|immediately|critical|emergency|can'?t (access|login|sign|use)|blocked|stuck/i.test(msg)
}
function seemsFrustrated(msg: string) {
  return /frustrated|annoying|ridiculous|waste|terrible|awful|not working|broken|useless|angry/i.test(msg)
}

function isDone(msg: string) {
  return /^(no\b|nope|nothing|that.?s (all|it|everything)|i.?m (good|done|fine|all good|ok)|all good|done|nah|no thanks|nothing else|not really|that.?s everything|that.?s it)/i.test(msg.trim())
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

function empathyOpener(msg: string, name: string | null) {
  const n = name ? `, **${name}**` : ''
  if (seemsFrustrated(msg)) return pick([
    `I'm really sorry to hear you're having a frustrating experience${n} — that's the last thing we want for you. 😔`,
    `Oh no${n}, I'm so sorry about that! You deserve a smooth experience and I'm going to make sure the right person looks into this straight away. 💙`,
  ])
  if (seemsUrgent(msg)) return pick([
    `I completely understand the urgency${n} — I'm getting this to the team right away. 🚀`,
    `Absolutely, I hear you${n} — let me flag this as priority for our team immediately. ⚡`,
  ])
  return pick([
    `Thank you for reaching out${n}! 😊`,
    `Got it${n}, thanks for letting us know! 👍`,
    `I appreciate you sharing that${n}! 🙏`,
    `Thanks so much for getting in touch${n}! ✨`,
  ])
}

function confirmationMsg(name: string | null) {
  const n = name ? `, **${name}**` : ''
  return pick([
    `✅ Your message has been received${n} and passed on to our customer service team — they'll review it and reply right here in this chat as soon as possible. You're in great hands! 🙌\n\nIs there anything else you'd like to add before I close this off?`,
    `🎯 All logged${n}! Our customer service team now has your message and will reply here in the chat shortly. We really appreciate your patience! 💙\n\nAnything else you'd like them to know?`,
    `📋 Perfect${n}! Everything has been passed on to our customer service team — they'll be in touch here in the chat very soon. Thank you for trusting us with this! 😊\n\nIs there anything else you'd like to add?`,
  ])
}

function addedMoreMsg(name: string | null) {
  const n = name ? `, **${name}**` : ''
  return pick([
    `Thank you for adding that${n}! 📝 I've updated your message so the team has the full picture.\n\nIs there anything else you'd like to include?`,
    `Really helpful, thank you${n}! 🙏 I've added that to your message — our team will have all of this context.\n\nAnything else on your mind?`,
    `Got it, noted! ✅ I've updated everything for the team${n}.\n\nIs there anything else you'd like to add?`,
  ])
}

function closingMsg(name: string | null) {
  const n = name ? `, **${name}**` : ''
  return pick([
    `All noted${n}! 🙌 Our customer service team has everything they need and will reply right here in this chat as soon as possible. Thank you so much for your patience — we really appreciate it! 💙\n\nFeel free to open Aria any time if anything else comes up!`,
    `Wonderful${n}! 😊 You're all set — our team will review your message and get back to you here in the chat very soon. We're on it! 🚀\n\nHave a great day, and don't hesitate to reach out if you need anything else!`,
    `That's everything noted${n}! ✅ Our customer service team will reply here shortly — they'll have everything you've shared. Thank you for your patience! 🙏`,
  ])
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  const ip = getClientIp(req)
  if (!rateLimit(`${ip}:support-chat`, 30, 60 * 1000)) {
    return NextResponse.json({ error: 'Too many messages. Please slow down.' }, { status: 429 })
  }

  let body: ChatRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { messages, ticketId, step, isGuest } = body

  if (!Array.isArray(messages) || messages.length === 0 || typeof step !== 'number') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const isLoggedIn = !!session?.user
  const userName   = session?.user?.name ?? null
  const userId     = (session?.user as any)?.id ?? null
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content ?? ''

  // ── LOGGED-IN FLOW ────────────────────────────────────────────────────────
  if (isLoggedIn && !isGuest) {
    // step 1: first message → create ticket
    if (step === 1) {
      try {
        const ticket = await db.supportTicket.create({
          data: {
            userId,
            subject:  lastUserMsg.slice(0, 120),
            messages,
            status:   'open',
            priority: (seemsUrgent(lastUserMsg) || seemsFrustrated(lastUserMsg)) ? 'high' : 'normal',
          },
        })
        const opener = empathyOpener(lastUserMsg, userName)
        return NextResponse.json({ reply: `${opener}\n\n${confirmationMsg(userName)}`, ticketId: ticket.id })
      } catch (err) {
        console.error('[support/chat] Failed to create ticket (logged-in):', err)
        return NextResponse.json({ error: 'Failed to log your message. Please try again.' }, { status: 500 })
      }
    }

    // step 2+: follow-up
    // updateMany scoped to userId prevents IDOR — other users' ticketIds are silently ignored
    if (isDone(lastUserMsg)) {
      if (ticketId) {
        await db.supportTicket.updateMany({ where: { id: ticketId, userId }, data: { messages } }).catch((e: unknown) => console.error('[support/chat] update error:', e))
      }
      return NextResponse.json({ reply: closingMsg(userName) })
    }

    // User added more info
    if (ticketId) {
      await db.supportTicket.updateMany({ where: { id: ticketId, userId }, data: { messages } }).catch((e: unknown) => console.error('[support/chat] update error:', e))
    }
    return NextResponse.json({ reply: addedMoreMsg(userName), ticketId })
  }

  // ── GUEST FLOW ────────────────────────────────────────────────────────────
  // step 1 → name   → ask email
  // step 2 → email  → ask issue
  // step 3 → issue  → create ticket
  // step 4+→ follow-up

  const guestName  = messages.filter(m => m.role === 'user')[0]?.content?.trim() ?? ''
  const guestEmail = messages.filter(m => m.role === 'user')[1]?.content?.trim() ?? ''
  const firstName  = guestName.split(/\s+/)[0]

  if (step === 1) {
    const name = lastUserMsg.trim().split(/\s+/)[0]
    return NextResponse.json({ reply: pick([
      `Lovely to meet you, **${name}**! 😊 So I can make sure our team can get back to you — what's the best **email address** to reach you at?`,
      `Great to meet you, **${name}**! 👋 Before we dive in, could I grab your **email address**? Our team will need it to follow up with you.`,
      `Hi **${name}**, welcome! 🌟 Could you share your **email address** please? Our team will need it to get back to you.`,
    ]) })
  }

  if (step === 2) {
    if (!isValidEmail(lastUserMsg)) {
      return NextResponse.json({ reply: pick([
        `Hmm, that email doesn't look quite right — could you double-check it? We need a valid address so our team can reach you! 😊`,
        `I just want to make sure we can get back to you — that email doesn't look valid. Could you try again? 📧`,
      ]) })
    }
    return NextResponse.json({ reply: pick([
      `Perfect, thank you **${firstName}**! 📧 Now please describe what's going on — the more detail you give, the better our team can help! 🙏`,
      `Got it, thank you **${firstName}**! ✅ Now tell me what's happening — describe your issue and I'll get it to the right person straight away. 📋`,
      `Brilliant **${firstName}**! 🌟 Now what can we help you with? Please describe your issue — we're all ears! 👂`,
    ]) })
  }

  if (step === 3) {
    try {
      const ticket = await db.supportTicket.create({
        data: {
          guestName:  guestName || null,
          guestEmail: isValidEmail(guestEmail) ? guestEmail : null,
          subject:    lastUserMsg.slice(0, 120),
          messages,
          status:     'open',
          priority:   (seemsUrgent(lastUserMsg) || seemsFrustrated(lastUserMsg)) ? 'high' : 'normal',
        },
      })
      const opener = empathyOpener(lastUserMsg, firstName || null)
      return NextResponse.json({ reply: `${opener}\n\n${confirmationMsg(firstName || null)}`, ticketId: ticket.id })
    } catch (err) {
      console.error('[support/chat] Failed to create ticket (guest):', err)
      return NextResponse.json({ error: 'Failed to log your message. Please try again.' }, { status: 500 })
    }
  }

  // step 4+: guest follow-up
  // Scope to userId: null so logged-in users can't overwrite guest tickets and vice-versa
  if (isDone(lastUserMsg)) {
    if (ticketId) {
      await db.supportTicket.updateMany({ where: { id: ticketId, userId: null }, data: { messages } }).catch((e: unknown) => console.error('[support/chat] update error:', e))
    }
    return NextResponse.json({ reply: closingMsg(firstName || null) })
  }

  if (ticketId) {
    await db.supportTicket.updateMany({ where: { id: ticketId, userId: null }, data: { messages } }).catch((e: unknown) => console.error('[support/chat] update error:', e))
  }
  return NextResponse.json({ reply: addedMoreMsg(firstName || null), ticketId })
}
