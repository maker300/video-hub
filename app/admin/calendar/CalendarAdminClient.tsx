'use client'

import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import { Loader2, Check, AlertCircle, Clock } from 'lucide-react'

interface Ev {
  id: string; currency: string; event: string; impact: string
  scheduledAt: string; actual: number | null; forecast: number | null
  previous: number | null; unit: string | null; surpriseDir: string | null
  needsFigure: boolean; figureAnnouncedAt: string | null
  editedBy: string | null; affected: string[]
}

export default function CalendarAdminClient() {
  const [events, setEvents] = useState<Ev[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/econ-events')
    if (res.ok) { const d = await res.json(); setEvents(d.events) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function save(ev: Ev) {
    const raw = (draft[ev.id] ?? '').trim()
    if (!raw) return
    setBusy(ev.id); setMsg('')
    try {
      const res = await fetch(`/api/admin/econ-events/${ev.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual: raw }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Failed')
      setMsg(d.announced
        ? `Published ${d.print} — ${d.notified} follower${d.notified === 1 ? '' : 's'} notified.`
        : 'Saved. The figure was already announced, so no new alert was sent.')
      setDraft(x => ({ ...x, [ev.id]: '' }))
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to save.')
    } finally { setBusy(null) }
  }

  // Releases still missing a figure come first — they are the actionable ones,
  // and a macro number is worth little an hour after the fact.
  const sorted = [...events].sort((a, b) =>
    Number(b.needsFigure) - Number(a.needsFigure) ||
    +new Date(b.scheduledAt) - +new Date(a.scheduledAt))

  return (
    <div className="min-h-screen bg-[#080e1a] text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Calendar figures</h1>
          <p className="text-gray-400 mt-1.5 text-sm">
            Our calendar source publishes the schedule but not the results. Enter the
            actual after a release and it publishes to the feed, alerts everyone
            following an affected pair, and posts to Telegram.
          </p>
        </header>

        {msg && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-sm text-emerald-200">{msg}</div>
        )}
        {loading && <p className="text-gray-500 text-sm">Loading…</p>}

        <div className="space-y-3">
          {sorted.map(ev => (
            <div key={ev.id} className={`bg-[#0d1b2a] border rounded-xl p-4 ${ev.needsFigure ? 'border-amber-500/40' : 'border-white/10'}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold">{ev.currency}</span>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                      ev.impact === 'high' ? 'bg-red-500/15 text-red-300 border-red-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'}`}>{ev.impact}</span>
                    {ev.needsFigure && (
                      <span className="text-[10px] font-bold uppercase text-amber-300 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> needs figure
                      </span>
                    )}
                    {ev.figureAnnouncedAt && (
                      <span className="text-[10px] font-bold uppercase text-emerald-300 flex items-center gap-1">
                        <Check className="w-3 h-3" /> published
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold mt-1">{ev.event}</h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {new Date(ev.scheduledAt).toLocaleString()} · forecast {ev.forecast ?? '—'} · previous {ev.previous ?? '—'}
                    {ev.actual != null && <span className="text-white"> · actual {ev.actual}</span>}
                    {ev.editedBy && <span> · edited by {ev.editedBy}</span>}
                  </p>
                  {ev.affected.length > 0 && (
                    <p className="text-[11px] text-gray-600 mt-1">Affects: {ev.affected.join(', ')}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <input
                    value={draft[ev.id] ?? ''}
                    onChange={e => setDraft(x => ({ ...x, [ev.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') save(ev) }}
                    placeholder={ev.actual != null ? String(ev.actual) : 'actual'}
                    inputMode="decimal"
                    className="w-28 bg-[#0a0f1e] border border-white/15 rounded-lg px-3 py-2 text-sm tabular-nums outline-none focus:border-emerald-500/60"
                  />
                  <button
                    onClick={() => save(ev)}
                    disabled={busy === ev.id || !(draft[ev.id] ?? '').trim()}
                    className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-[#052e21] text-sm font-bold transition"
                  >
                    {busy === ev.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!loading && sorted.length === 0 && (
          <div className="bg-[#0d1b2a] border border-white/10 rounded-xl p-6 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" /> No calendar events tracked right now.
          </div>
        )}
      </div>
    </div>
  )
}
