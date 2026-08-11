'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { TrendingUp, TrendingDown, Minus, Clock, AlertCircle, PencilLine } from 'lucide-react'

interface Affected { slug: string; display: string }
interface FeedEvent {
  id:          string
  event:       string
  currency:    string
  impact:      'high' | 'medium' | 'low'
  scheduledAt: string
  releasedAt:  string | null
  print:       string | null
  awaitingResult: boolean
  surpriseDir: 'hotter' | 'cooler' | 'inline' | null
  affected:    Affected[]
}

const IMPACT_STYLE: Record<string, string> = {
  high:   'bg-red-500/15 text-red-300 border-red-500/30',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  low:    'bg-white/10 text-gray-400 border-white/10',
}

function SurpriseBadge({ dir }: { dir: FeedEvent['surpriseDir'] }) {
  if (!dir) return null
  // Deliberately neutral wording: "above/below expectations" describes the
  // number, not a trade direction. Colour follows the surprise, not a bias.
  const map = {
    hotter: { Icon: TrendingUp,   text: 'Above expectations', cls: 'text-emerald-300' },
    cooler: { Icon: TrendingDown, text: 'Below expectations', cls: 'text-orange-300' },
    inline: { Icon: Minus,        text: 'In line',            cls: 'text-gray-400' },
  }[dir]
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${map.cls}`}>
      <map.Icon className="w-3.5 h-3.5" />
      {map.text}
    </span>
  )
}

function EventCard({ e, isAdmin }: { e: FeedEvent; isAdmin: boolean }) {
  const when = new Date(e.releasedAt ?? e.scheduledAt)
  return (
    <div className="bg-[#0d1b2a] border border-white/10 rounded-xl p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">{e.currency}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${IMPACT_STYLE[e.impact] ?? IMPACT_STYLE.low}`}>
              {e.impact}
            </span>
          </div>
          <h3 className="text-white font-semibold mt-1 break-words">{e.event}</h3>
        </div>
        <time className="text-xs text-gray-500 shrink-0" dateTime={when.toISOString()}>
          {when.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </time>
      </div>

      {e.print ? (
        <div className="mt-3">
          <div className="text-lg font-bold text-white">{e.print}</div>
          <div className="mt-1"><SurpriseBadge dir={e.surpriseDir} /></div>
        </div>
      ) : e.awaitingResult ? (
        <div className="mt-3">
          <div className="flex items-center gap-1.5 text-sm text-amber-300/80">
            <Clock className="w-3.5 h-3.5" /> Released — figure not published to our data source
          </div>
          {/* The figure is entered by hand until a paid feed is wired in, so an
              admin reading this page needs the entry screen one tap away. */}
          {isAdmin && (
            <Link
              href="/admin/calendar"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1.5 transition"
            >
              <PencilLine className="w-3.5 h-3.5" /> Add the figure
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-1.5 text-sm text-gray-500">
          <Clock className="w-3.5 h-3.5" /> Awaiting release
        </div>
      )}

      {e.affected.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">
            Instruments with exposure
          </div>
          <div className="flex flex-wrap gap-1.5">
            {e.affected.map(a => (
              <Link
                key={a.slug}
                href={`/analysis/${a.slug}`}
                className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-2 py-1 rounded transition-colors"
              >
                {a.display}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function NewsFeedClient() {
  const { data: session } = useSession()
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin'
  const [data,    setData]    = useState<{ released: FeedEvent[]; upcoming: FeedEvent[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/news/feed')
        if (!res.ok) throw new Error(`Feed unavailable (${res.status})`)
        const json = await res.json()
        if (!cancelled) { setData(json); setError(null) }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    // Releases land on a schedule, so a slow poll is enough — the Telegram and
    // bell alerts are what deliver urgency, not this page.
    const t = setInterval(load, 120_000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  return (
    <div className="min-h-screen bg-[#080e1a] text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Economic Calendar</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Macro releases as they print, with the instruments each one has exposure to.
            Exposure is not a trade call — open a pair for the directional read.
          </p>
          {isAdmin && (
            <Link
              href="/admin/calendar"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-1.5 transition"
            >
              <PencilLine className="w-3.5 h-3.5" /> Manage figures
            </Link>
          )}
        </header>

        {loading && <div className="text-gray-500 text-sm">Loading releases…</div>}

        {error && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-amber-200 font-semibold text-sm">Feed unavailable</div>
              <div className="text-gray-400 text-sm mt-1">{error}</div>
            </div>
          </div>
        )}

        {data && !error && (
          <>
            {data.released.length === 0 && data.upcoming.length === 0 && (
              <div className="text-gray-500 text-sm bg-[#0d1b2a] border border-white/10 rounded-xl p-6">
                No releases tracked yet. The agent populates this as the calendar is polled.
              </div>
            )}

            {data.upcoming.length > 0 && (
              <section className="mb-10">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">Scheduled</h2>
                <div className="space-y-3">
                  {data.upcoming.map(e => <EventCard key={e.id} e={e} isAdmin={isAdmin} />)}
                </div>
              </section>
            )}

            {data.released.length > 0 && (
              <section>
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">Last 24 hours</h2>
                <div className="space-y-3">
                  {data.released.map(e => <EventCard key={e.id} e={e} isAdmin={isAdmin} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
