'use client'

import { useCallback, useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import {
  Video, Loader2, Check, Calendar, ShieldCheck, Info, Clock, ExternalLink,
} from 'lucide-react'

interface Req {
  id: string; preferredTime: string; topic: string | null
  status: string; scheduledAt: string | null; meetingUrl: string | null
  createdAt: string
}

interface Props {
  active:       boolean
  free:         boolean
  status:       string | null
  endsAt:       string | null
  price:        number
  sessionsPerMonth: number
  sessionsUsed:     number
  periodResetsAt:   string
}

const gbp = (p: number) => `£${(p / 100).toFixed(p % 100 === 0 ? 0 : 2)}`

const STATUS_STYLE: Record<string, string> = {
  requested: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  scheduled: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  done:      'text-gray-400 bg-white/5 border-white/15',
  cancelled: 'text-red-300 bg-red-500/10 border-red-500/30',
}

export default function CoachingClient({
  active, free, status, endsAt, price, sessionsPerMonth, sessionsUsed, periodResetsAt,
}: Props) {
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState('')
  const [requests, setRequests] = useState<Req[]>([])
  const [time,     setTime]     = useState('')
  const [topic,    setTopic]    = useState('')
  const [sent,     setSent]     = useState(false)
  const [liveNow,  setLiveNow]  = useState<{ url: string; title: string } | null>(null)

  const load = useCallback(async () => {
    if (!active) return
    try {
      const r = await fetch('/api/coaching/request')
      if (r.ok) { const d = await r.json(); setRequests(d.requests ?? []) }
    } catch { /* non-critical */ }
  }, [active])
  useEffect(() => { load() }, [load])

  // Poll for a live session while subscribed. 60s is responsive enough for
  // something that runs for an hour, and cheap enough to leave on.
  useEffect(() => {
    if (!active) return
    let cancelled = false
    const check = async () => {
      try {
        const r = await fetch('/api/coaching/live')
        if (!r.ok) return
        const d = await r.json()
        if (!cancelled) setLiveNow(d.live && d.url ? { url: d.url, title: d.title } : null)
      } catch { /* non-critical */ }
    }
    check()
    const t = setInterval(() => { if (!document.hidden) check() }, 60_000)
    return () => { cancelled = true; clearInterval(t) }
  }, [active])

  async function subscribe() {
    setBusy(true); setError('')
    try {
      const r = await fetch('/api/stripe/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'coaching' }),
      })
      const d = await r.json()
      if (!r.ok || !d.url) throw new Error(d.error ?? 'Could not start checkout.')
      window.location.href = d.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout.')
      setBusy(false)
    }
  }

  async function submitRequest() {
    if (!time.trim()) return
    setBusy(true); setError('')
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const r = await fetch('/api/coaching/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredTime: time, topic, timezone: tz }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Could not send the request.')
      setTime(''); setTopic(''); setSent(true)
      setTimeout(() => setSent(false), 5000)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the request.')
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen bg-[#080e1a] text-white">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/25 rounded-full px-3 py-1 mb-4">
            <Video className="w-3.5 h-3.5 text-violet-300" />
            <span className="text-violet-300 text-xs font-semibold">1-on-1 coaching</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Book time with a trading professional</h1>
          <p className="text-gray-400 mt-2 text-sm leading-relaxed">
            Four one-to-one sessions a month built around your own trading, plus a seat in every live
            trading session we run. Separate from the group calls included with the course.
          </p>
        </header>

        {!active ? (
          <>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-5">
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black">{gbp(price)}</span>
                <span className="text-gray-500 mb-1.5 text-sm">/ month</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Cancel any time · no minimum term</p>

              <ul className="mt-5 space-y-2.5">
                {[
                  `${sessionsPerMonth} one-to-one training sessions every month`,
                  'Join every live trading session we run that month — watch real trades as they are taken',
                  'Your charts and open positions reviewed directly',
                  'Risk and position-sizing worked through on your real account size',
                  'Follow-up notes after each session',
                ].map(t => (
                  <li key={t} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-violet-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-gray-300 leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={subscribe}
                disabled={busy}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {busy ? 'Starting checkout…' : `Subscribe — ${gbp(price)}/month`}
              </button>
              {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
              <p className="text-[11px] text-gray-600 mt-3 text-center">
                Secure payment via Stripe. Card details never touch our servers.
              </p>
            </div>

            <div className="flex gap-2.5 bg-white/[0.03] border border-white/10 rounded-xl p-4">
              <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Coaching is educational. Sessions cover strategy, risk and process — they are not financial
                advice, and no one will trade on your behalf or tell you what to buy. Trading carries
                substantial risk of loss.
              </p>
            </div>
          </>
        ) : (
          <>
            {liveNow && (
              <a
                href={liveNow.url}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-3 mb-4 hover:bg-red-500/15 transition"
              >
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white">Live now — {liveNow.title}</div>
                  <div className="text-[11px] text-red-200/80">Tap to join the session</div>
                </div>
                <ExternalLink className="w-4 h-4 text-red-300 shrink-0" />
              </a>
            )}

            {/* Allowance meter — both sides can see where they stand. */}
            <div className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 mb-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs font-semibold text-gray-300">
                  1-on-1 sessions this month
                </span>
                <span className="text-xs tabular-nums text-gray-400">
                  {sessionsUsed} / {sessionsPerMonth}
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    sessionsUsed >= sessionsPerMonth ? 'bg-amber-500' : 'bg-violet-500'
                  }`}
                  style={{ width: `${Math.min(100, (sessionsUsed / sessionsPerMonth) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-600 mt-2">
                {sessionsUsed >= sessionsPerMonth
                  ? 'You have used this month\u2019s sessions. Your allowance resets on '
                  : 'Resets on '}
                {new Date(periodResetsAt).toLocaleDateString()} &middot; live trading sessions are unlimited
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 bg-emerald-500/[0.07] border border-emerald-500/30 rounded-xl px-4 py-3 mb-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-sm font-semibold text-emerald-200 block">
                    {free ? 'Free access — no charge' : 'Coaching active'}
                  </span>
                  {free && (
                    <span className="text-[11px] text-emerald-300/70">
                      We&apos;re in a test phase — coaching is free for current users while we roll this out.
                    </span>
                  )}
                </div>
              </div>
              {status === 'cancelled' && endsAt && (
                <span className="text-[11px] text-amber-300">
                  Ends {new Date(endsAt).toLocaleDateString()}
                </span>
              )}
              {status === 'past_due' && (
                <span className="text-[11px] text-amber-300">Payment issue — please update your card</span>
              )}
            </div>

            {/* Request form */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-violet-300" />
                <h2 className="text-sm font-bold text-white">Request a session</h2>
              </div>

              <label className="block mb-3">
                <span className="text-[11px] text-gray-500">When are you available?</span>
                <textarea
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="e.g. weekday evenings after 18:00, ideally Tuesday or Thursday"
                  className="mt-1 w-full bg-[#0a0f1e] border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500/50 resize-none"
                />
              </label>

              <label className="block mb-4">
                <span className="text-[11px] text-gray-500">What do you want to cover? (optional)</span>
                <input
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  maxLength={200}
                  placeholder="e.g. reviewing my losing trades on gold"
                  className="mt-1 w-full bg-[#0a0f1e] border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500/50"
                />
              </label>

              <button
                onClick={submitRequest}
                disabled={busy || !time.trim()}
                className="w-full flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl transition"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                Send request
              </button>

              {sent && (
                <p className="mt-3 text-xs text-emerald-300">
                  Request sent. We&apos;ll confirm a time by email, usually within a day.
                </p>
              )}
              {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
              <p className="text-[11px] text-gray-600 mt-3 leading-relaxed">
                Sessions are confirmed by a person, not an automated calendar — we&apos;ll email you a time and
                a meeting link.
              </p>
            </div>

            {/* History */}
            {requests.length > 0 && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Your requests</span>
                <div className="mt-2 space-y-2">
                  {requests.map(r => (
                    <div key={r.id} className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${STATUS_STYLE[r.status] ?? STATUS_STYLE.requested}`}>
                          {r.status}
                        </span>
                        <span className="text-[11px] text-gray-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                        {r.meetingUrl && (
                          <a
                            href={r.meetingUrl}
                            target="_blank" rel="noopener noreferrer"
                            className="ml-auto text-[11px] text-violet-300 hover:text-violet-200 inline-flex items-center gap-1"
                          >
                            Join <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">{r.preferredTime}</p>
                      {r.topic && <p className="text-[11px] text-gray-600 mt-0.5">Topic: {r.topic}</p>}
                      {r.scheduledAt && (
                        <p className="text-[11px] text-emerald-300 mt-1">
                          Confirmed for {new Date(r.scheduledAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
