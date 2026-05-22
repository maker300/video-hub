import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import DiscordProvider from 'next-auth/providers/discord'
import EmailProvider from 'next-auth/providers/email'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from './prisma'
import type { Adapter } from 'next-auth/adapters'

/** Constant-time string comparison to prevent timing attacks */
function safeEqual(a: string, b: string): boolean {
  // Pad both to the same length before comparing so length differences
  // don't leak information through timing. Always run the comparison.
  const maxLen  = Math.max(a.length, b.length)
  const bufA    = Buffer.alloc(maxLen)
  const bufB    = Buffer.alloc(maxLen)
  bufA.write(a)
  bufB.write(b)
  return crypto.timingSafeEqual(bufA, bufB) && a.length === b.length
}

// ── Admin credentials — must be set via env vars, no fallback defaults ─────────
// If these are missing the admin login path is disabled, never returning true.
const ADMIN_USERNAME = process.env.ADMIN_EMAIL    ?? ''
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? ''

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,

  session: {
    strategy: 'jwt',
  },

  pages: {
    signIn:        '/auth/signin',
    newUser:       '/auth/signup',
    error:         '/auth/error',
    verifyRequest: '/auth/verify',
  },

  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID     ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),

    GitHubProvider({
      clientId:     process.env.GITHUB_CLIENT_ID     ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
    }),

    DiscordProvider({
      clientId:     process.env.DISCORD_CLIENT_ID     ?? '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? '',
    }),

    ...(process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD
      ? [EmailProvider({
          server: {
            host:   process.env.EMAIL_SERVER_HOST ?? 'smtp.gmail.com',
            port:   Number(process.env.EMAIL_SERVER_PORT ?? 587),
            auth: {
              user: process.env.EMAIL_SERVER_USER,
              pass: process.env.EMAIL_SERVER_PASSWORD,
            },
          },
          from: process.env.EMAIL_FROM ?? 'noreply@forexcourse.com',
        })]
      : []),

    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email or Username', type: 'text' },
        password: { label: 'Password',          type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // ── Admin special case ─────────────────────────────────────────────────
        // Disabled if ADMIN_EMAIL / ADMIN_PASSWORD env vars are not set
        if (ADMIN_USERNAME && ADMIN_PASSWORD &&
            credentials.email.trim().toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
          if (!safeEqual(credentials.password, ADMIN_PASSWORD)) return null
          return {
            id:    'admin',
            email: 'admin@forexmastery.internal',
            name:  'Admin',
            image: null,
            role:  'admin',
          }
        }

        // ── Regular user ───────────────────────────────────────────────────────
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })

        if (!user?.password) return null

        const passwordMatch = await bcrypt.compare(credentials.password, user.password)
        if (!passwordMatch) return null

        return {
          id:    user.id,
          email: user.email,
          name:  user.name,
          image: user.image,
          role:  user.role,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id
        token.role = (user as { role?: string }).role ?? 'user'
      }
      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id   = token.id   as string
        session.user.role = token.role as string
      }
      return session
    },
  },

  events: {
    async signOut({ token }) {
      // Clear presence indicator when user explicitly signs out
      const userId = (token as { id?: string })?.id
      if (userId && userId !== 'admin') {
        try {
          await prisma.user.update({
            where: { id: userId },
            data:  { lastSeenAt: null },
          })
        } catch { /* ignore */ }
      }
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
}

// ── Helper — call from server components / route handlers ─────────────────────
export function isAdmin(session: { user?: { role?: string } } | null): boolean {
  return session?.user?.role === 'admin'
}
