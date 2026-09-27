// Auto-trade API key lifecycle — generate / rotate / revoke.
//
// The key is returned in FULL exactly once per generate call, because the
// user must paste it into their MetaTrader EA input dialog. The GET side of
// the profile only ever returns a masked preview, so a shoulder-surfer or a
// stale browser tab can't harvest it later.
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateAutoTradeKey } from '@/lib/auto-trade'

export const dynamic = 'force-dynamic'

// POST — create a key, or rotate an existing one. Rotation invalidates the
// old key immediately; the user's EA will start 401-ing until they paste the
// new one. That is the intended behaviour for "my key leaked".
export async function POST() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const key = generateAutoTradeKey()
  await (prisma as any).user.update({
    where: { id: userId },
    data:  { autoTradeApiKey: key, autoTradeKeyCreatedAt: new Date() },
  })

  // Full key returned once. Never retrievable again.
  return NextResponse.json({ ok: true, key })
}

// DELETE — revoke. Clears the key and disables auto-trade so a revoked user
// doesn't silently re-enable by generating a new key later.
export async function DELETE() {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as { id?: string } | undefined)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  await (prisma as any).user.update({
    where: { id: userId },
    data:  {
      autoTradeApiKey:       null,
      autoTradeKeyCreatedAt: null,
      autoTradeEnabled:      false,
    },
  })
  return NextResponse.json({ ok: true })
}
