import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

async function checkAuth() {
  const store = await cookies()
  const val = store.get('vh_auth')?.value
  return val === process.env.STUDIO_PASSWORD
}

// In-memory store — client also persists to localStorage so nothing is truly lost
const projects: VideoProject[] = []

interface VideoProject {
  id:          string
  title:       string
  aspectRatio: '16:9' | '9:16'
  scenes:      unknown[]
  createdAt:   string
}

export async function GET() {
  if (!await checkAuth()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json(projects)
}

export async function POST(req: Request) {
  if (!await checkAuth()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json() as Partial<VideoProject>
  if (!body.title || !Array.isArray(body.scenes)) {
    return NextResponse.json({ error: 'title and scenes required' }, { status: 400 })
  }

  const project: VideoProject = {
    id:          crypto.randomUUID(),
    title:       body.title,
    aspectRatio: body.aspectRatio ?? '16:9',
    scenes:      body.scenes,
    createdAt:   new Date().toISOString(),
  }

  projects.unshift(project)
  if (projects.length > 100) projects.splice(100)

  return NextResponse.json(project)
}

export async function DELETE(req: Request) {
  if (!await checkAuth()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json() as { id: string }
  const idx = projects.findIndex(p => p.id === id)
  if (idx !== -1) projects.splice(idx, 1)

  return NextResponse.json({ ok: true })
}
