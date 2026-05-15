import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const { password } = await req.json() as { password: string }
  const correct = process.env.STUDIO_PASSWORD

  if (!correct) {
    return NextResponse.json({ error: 'STUDIO_PASSWORD not configured' }, { status: 503 })
  }

  if (password !== correct) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
  }

  const store = await cookies()
  store.set('vh_auth', correct, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const store = await cookies()
  store.delete('vh_auth')
  return NextResponse.json({ ok: true })
}
