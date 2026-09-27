'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Radio, Loader2, Video, Check, X, Calendar, Link as LinkIcon, AlertTriangle,
} from 'lucide-react'

interface Req {
  id: string; preferredTime: string; topic: string | null; timezone: string | null
  status: string; scheduledAt: string | null; meetingUrl: string | null; createdAt: string
  user: { name: string | null; email: string | null; coachingStatus: string | null }
  sessionsUsed: number; sessionsAllowed: number
}
interface LiveState { live: boolean; url: string | null; title: string | null; startedAt: string | null }

const STATUS_STYLE: Record<string, string> = {
  requested: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  scheduled: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  done:      'text-gray-400 bg-white/5 border-white/15',
  cancelled: 'text-red-300 bg-red-500/10 border-red-500/30',
}

export default function CoachingAdmin() {
  const [live,     setLive]     = useState<LiveState | null>(null)
  const [reqs,     setReqs]     = useState<Req[]>([])
  const [busy,     setBusy]     = useState(false)
  const [msg,      setMsg]      = useState('')
  const [url,      setUrl]      = useState('')
  const [title,    setTitle]    = useState('')
  // Per-request confirm drafts
  const [when,     setWhen]     = useState<Record<string, string>>({})
  const [link,     setLink]     = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      const [l, r] = await Promise.all([
        fetch('/api/admin/live-session'),
        fetch('/api/admin/coaching'),
      ])
      if (l.ok) setLive(await l.json())
      if (r.ok) setReqs((await r.json()).requests ?? [])
    } catch { /* non-critical */ }
  }, [])
  useEffect(() => { load() }, [load])

  async function goLive(action: 'start' | 'stop') {
    setBusy(true); setMsg('')
    try {
      const res = await fetch('/api/admin/live-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'start' ? { action, url, title } : { action }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Failed.')
      setMsg(action === 'start'
        ? `Live. ${d.notified ?? 0} subscriber${d.notified === 1 ? '' : 's'} notified.`
        : 'Session ended.')
      setUrl(''); setTitle('')
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed.')
    } finally { setBusy(false) }
  }

  async function updateReq(id: string, status: string) {
    setBusy(true); setMsg('')
    try {
      const res = await fetch(`/api/admin/coaching/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          ...(status === 'scheduled' ? { scheduledAt: when[id], meetingUrl: link[id] } : {}),
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Failed.')
      setMsg(status === 'scheduled' ? 'Confirmed — subscriber notified.' : 'Updated.')
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed.')
    } finally { setBusy(false) }
  }

  const open = reqs.filter(r => r.status === 'requested')

  return (
    <div className="space-y-4">
      {/* ── Go live ─────────────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-5 ${live?.live ? 'bg-red-500/[0.07] border-red-500/40' : 'bg-white/5 border-white/10'}`}>
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${live?.live ? 'bg-red-500/20' : 'bg-white/5'}`}>
            <Radio className={`w-4.5 h-4.5 ${live?.live ? 'text-red-400 animate-pulse' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white">Live trading session</h3>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
              Starting a session bells, emails and Telegrams every active coaching subscriber straight away.
            </p>
          </div>
          {live?.live && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500 text-white px-2 py-1 rounded shrink-0">
              Live
            </span>
          )}
        </div>

        {live?.live ? (
          <div className="space-y-3">
            <div className="bg-[#0a0f1e] border border-white/10 rounded-lg px-3 py-2">
              <div className="text-sm text-white font-medium">{live.title}</div>
              <a href={live.url ?? '#'} target="_blank" rel="noopener noreferrer"
                 className="text-[11px] text-blue-300 hover:text-blue-200 break-all">{live.url}</a>
              {live.startedAt && (
                <div className="text-[11px] text-gray-600 mt-1">
                  Started {new Date(live.startedAt).toLocaleTimeString()}
                </div>
              )}
            </div>
            <button
              onClick={() => goLive('stop')}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-bold py-2.5 rounded-lg transition disabled:opacity-40"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              End session
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://meet.google.com/… or Zoom link"
              className="w-full bg-[#0a0f1e] border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-red-500/50"
            />
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Session title (optional) — e.g. London open, gold"
              className="w-full bg-[#0a0f1e] border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-red-500/50"
            />
            <button
              onClick={() => goLive('start')}
              disabled={busy || !url.trim()}
              className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-400 disabled:opacity-40 text-white text-sm font-bold py-2.5 rounded-lg transition"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
              Go live now
            </button>
          </div>
        )}
        {msg && <p className="mt-3 text-xs text-gray-400">{msg}</p>}
      </div>

      {/* ── Session requests ────────────────────────────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Video className="w-4 h-4 text-violet-300" />
          <h3 className="text-sm font-bold text-white">Coaching requests</h3>
          {open.length > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
              {open.length} awaiting
            </span>
          )}
        </div>

        {reqs.length === 0 && <p className="text-xs text-gray-500">No requests yet.</p>}

        <div className="space-y-3">
          {reqs.map(r => {
            const atLimit = r.sessionsUsed >= r.sessionsAllowed
            return (
              <div key={r.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${STATUS_STYLE[r.status] ?? STATUS_STYLE.requested}`}>
                    {r.status}
                  </span>
                  <span className="text-xs font-semibold text-white truncate">{r.user.email}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    atLimit ? 'text-red-300 bg-red-500/10 border-red-500/30'
                            : 'text-gray-400 bg-white/5 border-white/15'}`}>
                    {r.sessionsUsed}/{r.sessionsAllowed} this month
                  </span>
                  <span className="text-[11px] text-gray-600 ml-auto">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs text-gray-300">{r.preferredTime}</p>
                {r.topic && <p className="text-[11px] text-gray-500 mt-0.5">Topic: {r.topic}</p>}
                {r.timezone && <p className="text-[11px] text-gray-600 mt-0.5">TZ: {r.timezone}</p>}

                {atLimit && r.status === 'requested' && (
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-red-300">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    Already used their {r.sessionsAllowed} sessions this month.
                  </div>
                )}

                {r.status === 'scheduled' && r.scheduledAt && (
                  <p className="text-[11px] text-emerald-300 mt-2">
                    Confirmed for {new Date(r.scheduledAt).toLocaleString()}
                  </p>
                )}

                {r.status === 'requested' && (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Date &amp; time
                        </span>
                        <input
                          type="datetime-local"
                          value={when[r.id] ?? ''}
                          onChange={e => setWhen(x => ({ ...x, [r.id]: e.target.value }))}
                          className="mt-1 w-full bg-[#0a0f1e] border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-500/50"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" /> Meeting link
                        </span>
                        <input
                          value={link[r.id] ?? ''}
                          onChange={e => setLink(x => ({ ...x, [r.id]: e.target.value }))}
                          placeholder="https://…"
                          className="mt-1 w-full bg-[#0a0f1e] border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-emerald-500/50"
                        />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateReq(r.id, 'scheduled')}
                        disabled={busy || !when[r.id]}
                        className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-[#052e21] text-xs font-bold px-3 py-1.5 rounded-lg transition"
                      >
                        <Check className="w-3.5 h-3.5" /> Confirm &amp; notify
                      </button>
                      <button
                        onClick={() => updateReq(r.id, 'cancelled')}
                        disabled={busy}
                        className="text-xs text-gray-500 hover:text-red-300 px-2 py-1.5 transition"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {r.status === 'scheduled' && (
                  <button
                    onClick={() => updateReq(r.id, 'done')}
                    disabled={busy}
                    className="mt-2 text-xs text-gray-400 hover:text-emerald-300 transition"
                  >
                    Mark as completed
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
