'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { courseModules } from '@/lib/courseData'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Home, Users, BarChart2, Settings, Shield, Loader2, AlertCircle, CheckCircle2,
  Play, RefreshCw, Search, Trash2, Edit3, KeyRound, X,
  TrendingUp, BookOpen, Activity, UserCheck, EyeOff, Eye, Mail, Send,
  Lock, Unlock, Calendar, RotateCcw, LineChart, MessageSquare,
  ChevronDown, ChevronUp, Bot, Clock, Flag, CircleCheck, Inbox,
  Video, Sparkles, ExternalLink, DatabaseZap, TriangleAlert,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'users' | 'notify' | 'content' | 'settings' | 'support' | 'scripts'

interface AnalysisAccess {
  id:        string
  userId:    string
  type:      'one_week' | 'one_month' | 'three_months' | 'six_months' | 'twelve_months' | 'monthly_rollover'
  startDate: string
  endDate:   string
  active:    boolean
  grantedAt: string
  note:      string | null
}

interface UserRow {
  id:            string
  name:          string | null
  email:         string
  role:          string
  hasPassword:   boolean
  createdAt:     string
  emailVerified: string | null
  image:         string | null
  lastSeenAt:    string | null
  accounts:      { provider: string }[]
  progress:      { id: string; completed: boolean }[]
  subscription:  { plan: string; status: string } | null
  analysisAccess?: AnalysisAccess | null
}

interface Stats {
  totalUsers:    number
  totalProgress: number
  recentUsers:   number
  oauthUsers:    number
  todayVisits:   number
}

interface PieSlice  { label: string; count: number }
interface DailyPoint { date: string; count: number }
interface AnalyticsData {
  pieData:        PieSlice[]
  dailyData:      DailyPoint[]
  totalViews:     number
  analysisAccess: { total: number; active: number; rollover: number }
}

// ── Audio pre-gen types ───────────────────────────────────────────────────────

type EventType = 'start' | 'progress' | 'skip' | 'done' | 'error' | 'complete'
interface StreamEvent {
  type: EventType; lessonId?: string; title?: string; status?: string
  audioUrl?: string; slides?: number; durationSecs?: number
  generated?: number; skipped?: number; failed?: number; total?: number
  error?: string; fromCache?: boolean
}
interface LessonState {
  id: string; title: string; moduleTitle: string
  status: 'idle' | 'generating' | 'done' | 'cached' | 'skipped' | 'error'
  slides?: number; durationSecs?: number; audioUrl?: string; error?: string
}

function buildInitialState(): Record<string, LessonState> {
  const map: Record<string, LessonState> = {}
  for (const mod of courseModules)
    for (const l of mod.lessons)
      map[l.id] = { id: l.id, title: l.title, moduleTitle: mod.title, status: 'idle' }
  return map
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 30)  return `${d}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isAccessValid(a: AnalysisAccess | null | undefined): boolean {
  if (!a || !a.active) return false
  if (a.type === 'monthly_rollover') return true
  return new Date(a.endDate) > new Date()
}

function ProviderBadge({ provider }: { provider: string }) {
  const colors: Record<string, string> = {
    google:  'bg-blue-500/20 text-blue-300',
    github:  'bg-gray-500/20 text-gray-300',
    discord: 'bg-indigo-500/20 text-indigo-300',
  }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${colors[provider] ?? 'bg-white/10 text-gray-400'}`}>
      {provider}
    </span>
  )
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className={`bg-[#131722] border border-white/15 rounded-2xl w-full ${wide ? 'max-w-lg' : 'max-w-md'} shadow-2xl max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

// ── SVG Pie Chart ─────────────────────────────────────────────────────────────

const PIE_COLORS = ['#1D9E75', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef5350', '#06b6d4']

function PieChart({ data }: { data: PieSlice[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) return <div className="flex items-center justify-center h-40 text-gray-600 text-sm">No data yet</div>

  const R = 70, cx = 90, cy = 90
  let angle = -Math.PI / 2
  const slices = data.map((d, i) => {
    const pct   = d.count / total
    const start = angle
    angle += pct * 2 * Math.PI
    const end  = angle
    const x1   = cx + R * Math.cos(start)
    const y1   = cy + R * Math.sin(start)
    const x2   = cx + R * Math.cos(end)
    const y2   = cy + R * Math.sin(end)
    const large = pct > 0.5 ? 1 : 0
    return { ...d, pct, path: `M${cx},${cy} L${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} Z`, color: PIE_COLORS[i % PIE_COLORS.length] }
  })

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg viewBox="0 0 180 180" className="w-40 h-40 shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="#131722" strokeWidth="1.5" opacity="0.9" />
        ))}
        <circle cx={cx} cy={cy} r={30} fill="#131722" />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{total}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fill="#6b7280" fontSize="7">views</text>
      </svg>
      <div className="space-y-2 flex-1 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-gray-300 flex-1 truncate">{s.label}</span>
            <span className="text-xs font-bold text-white tabular-nums">{s.count}</span>
            <span className="text-[10px] text-gray-500 tabular-nums w-8 text-right">{(s.pct * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── SVG Bar Chart (daily visits) ──────────────────────────────────────────────

function BarChart({ data }: { data: DailyPoint[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const W = 560, H = 100, PAD_L = 28, PAD_B = 20, BAR_GAP = 3
  const barW = (W - PAD_L - BAR_GAP) / data.length - BAR_GAP

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + PAD_B}`} className="w-full min-w-[320px]" style={{ height: 120 }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const y = PAD_L - (t === 0 ? 0 : 4) + (1 - t) * (H - PAD_L + 4)
          return (
            <g key={t}>
              <line x1={PAD_L} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              {t > 0 && (
                <text x={PAD_L - 4} y={y + 3} textAnchor="end" fill="#4b5563" fontSize="7">
                  {Math.round(max * t)}
                </text>
              )}
            </g>
          )
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const x    = PAD_L + i * ((W - PAD_L) / data.length) + BAR_GAP / 2
          const pct  = d.count / max
          const barH = Math.max(pct * (H - PAD_L), d.count > 0 ? 2 : 0)
          const y    = H - barH
          const isToday = d.date === new Date().toISOString().slice(0, 10)
          const label = new Date(d.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

          return (
            <g key={d.date}>
              <rect
                x={x} y={y} width={barW} height={barH}
                fill={isToday ? '#1D9E75' : '#1D9E7560'}
                rx="2"
              />
              {i % 2 === 0 && (
                <text x={x + barW / 2} y={H + PAD_B - 2} textAnchor="middle" fill="#4b5563" fontSize="6.5">
                  {label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ onTabChange }: { onTabChange: (tab: Tab) => void }) {
  const [stats,     setStats]     = useState<Stats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)

  const fetchStats = () => fetch('/api/admin/stats').then(r => r.json()).then(setStats).catch(() => null)

  useEffect(() => {
    fetchStats()
    fetch('/api/admin/analytics').then(r => r.json()).then(setAnalytics).catch(() => null)
    const interval = setInterval(fetchStats, 60 * 60_000)
    return () => clearInterval(interval)
  }, [])

  const cards = stats ? [
    { label: "Today's Visits",     value: stats.todayVisits,   icon: <Activity className="w-5 h-5" />,   color: 'text-green-400',   bg: 'bg-green-500/10 border-green-500/20'  },
    { label: 'Total Users',        value: stats.totalUsers,    icon: <Users className="w-5 h-5" />,      color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'New (last 7 days)',   value: stats.recentUsers,   icon: <UserCheck className="w-5 h-5" />,  color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20'       },
    { label: 'Analysis Access',    value: analytics?.analysisAccess?.active ?? '—', icon: <Lock className="w-5 h-5" />, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' },
  ] : []

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {!stats && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
        ))}
        {cards.map(c => (
          <div key={c.label} className={`border rounded-2xl p-4 sm:p-5 ${c.bg}`}>
            <div className={`mb-2 sm:mb-3 ${c.color}`}>{c.icon}</div>
            <p className={`text-2xl sm:text-3xl font-black ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Pie chart */}
        <div className="bg-[#131722] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Page Usage Breakdown</h3>
            <span className="text-[10px] text-gray-600 ml-1">— last 30 days</span>
          </div>
          {!analytics ? (
            <div className="h-40 bg-white/5 rounded-xl animate-pulse" />
          ) : (
            <PieChart data={analytics.pieData ?? []} />
          )}
        </div>

        {/* Bar chart */}
        <div className="bg-[#131722] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <LineChart className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Daily Visits</h3>
            <span className="text-[10px] text-gray-600 ml-1">— last 14 days</span>
            {analytics && (
              <span className="ml-auto text-[10px] font-bold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                {analytics.totalViews} total views (30d)
              </span>
            )}
          </div>
          {!analytics ? (
            <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
          ) : (
            <BarChart data={analytics.dailyData ?? []} />
          )}
        </div>
      </div>

      {/* Analysis access summary */}
      {analytics?.analysisAccess && (
        <div className="bg-[#131722] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-white">Analysis Access Overview</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: 'Total Granted',    value: analytics.analysisAccess.total    ?? 0, color: 'text-gray-300'    },
              { label: 'Currently Active', value: analytics.analysisAccess.active   ?? 0, color: 'text-emerald-400' },
              { label: 'Auto-Rollover',    value: analytics.analysisAccess.rollover ?? 0, color: 'text-teal-400'   },
            ].map(s => (
              <div key={s.label} className="bg-white/5 rounded-xl p-3 sm:p-4 text-center">
                <p className={`text-xl sm:text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[10px] sm:text-[11px] text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="bg-[#131722] border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {([
            { label: 'View All Users',   icon: <Users className="w-4 h-4" />,      onClick: () => onTabChange('users') },
            { label: 'Market Analysis',  icon: <TrendingUp className="w-4 h-4" />, href: '/analysis'      },
            { label: 'Course',           icon: <BookOpen className="w-4 h-4" />,   href: '/course'        },
            { label: 'Broker & Signals', icon: <Shield className="w-4 h-4" />,     href: '/admin/broker'  },
          ] as ({ label: string; icon: React.ReactNode } & ({ onClick: () => void; href?: never } | { href: string; onClick?: never }))[]).map(item =>
            item.onClick ? (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 hover:text-white transition"
              >
                {item.icon}
                {item.label}
              </button>
            ) : (
              <Link
                key={item.label}
                href={item.href!}
                className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-300 hover:text-white transition"
              >
                {item.icon}
                {item.label}
              </Link>
            )
          )}
        </div>
      </div>

      {/* Admin info */}
      <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-4">
        <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-300 mb-1">Admin Access</p>
          <p className="text-xs text-amber-300/70 leading-relaxed">
            You are logged in as the site administrator. You have full access to all pages, user data, and site controls. Handle user data responsibly.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Grant Access Modal ────────────────────────────────────────────────────────

function GrantAccessModal({
  user,
  existing,
  onClose,
  onSaved,
}: {
  user:     UserRow
  existing: AnalysisAccess | null | undefined
  onClose:  () => void
  onSaved:  () => void
}) {
  const [type,      setType]      = useState<'one_week' | 'one_month' | 'three_months' | 'six_months' | 'twelve_months' | 'monthly_rollover'>(existing?.type ?? 'one_month')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [note,      setNote]      = useState(existing?.note ?? '')
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState('')

  async function grant() {
    setSaving(true); setMsg('')
    const res = await fetch(`/api/admin/analysis-access/${user.id}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type, startDate, note: note.trim() || null }),
    })
    setSaving(false)
    if (res.ok) { setMsg('Access granted!'); setTimeout(() => { onSaved(); onClose() }, 600) }
    else { const e = await res.json(); setMsg(e.error ?? 'Error') }
  }

  async function revoke() {
    setSaving(true); setMsg('')
    const res = await fetch(`/api/admin/analysis-access/${user.id}`, { method: 'DELETE' })
    setSaving(false)
    if (res.ok) { setMsg('Access revoked.'); setTimeout(() => { onSaved(); onClose() }, 600) }
    else setMsg('Revoke failed.')
  }

  const daysMap: Record<string, number> = { one_week: 7, one_month: 30, three_months: 90, six_months: 180, twelve_months: 365 }
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + (daysMap[type] ?? 0))

  return (
    <Modal title={`Analysis Access — ${user.name ?? user.email}`} onClose={onClose} wide>
      <div className="space-y-5">

        {/* Current status */}
        {existing && (
          <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border text-sm ${
            isAccessValid(existing)
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}>
            {isAccessValid(existing)
              ? <Unlock className="w-4 h-4 shrink-0" />
              : <Lock className="w-4 h-4 shrink-0" />}
            <div>
              <p className="font-semibold">
                {isAccessValid(existing)
                  ? `Active — ${existing.type === 'monthly_rollover' ? 'Auto-Rollover (never expires)' : `Expires ${fmtDate(existing.endDate)}`}`
                  : `Revoked / Expired`}
              </p>
              <p className="text-[11px] opacity-70 mt-0.5">Granted {fmtDate(existing.grantedAt)}</p>
            </div>
          </div>
        )}

        {/* Access type */}
        <div>
          <label className="text-xs text-gray-400 mb-2 block font-semibold uppercase tracking-wider">Access Type</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'one_week'         as const, label: '1 Week',        desc: 'Fixed 7-day window.' },
              { value: 'one_month'        as const, label: '1 Month',       desc: 'Fixed 30-day window.' },
              { value: 'three_months'     as const, label: '3 Months',      desc: 'Fixed 90-day window.' },
              { value: 'six_months'       as const, label: '6 Months',      desc: 'Fixed 180-day window.' },
              { value: 'twelve_months'    as const, label: '12 Months',     desc: 'Fixed 365-day window.' },
              { value: 'monthly_rollover' as const, label: 'Auto-Rollover', desc: 'Never expires until revoked.' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setType(opt.value)}
                className={`flex flex-col items-start text-left px-3 py-3 rounded-xl border transition-all ${
                  type === opt.value
                    ? 'bg-[#1D9E75]/15 border-[#1D9E75]/50 text-white'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                <span className={`text-sm font-bold ${type === opt.value ? 'text-[#1D9E75]' : ''}`}>{opt.label}</span>
                <span className="text-[10px] mt-0.5 leading-tight">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Start date */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
          />
          {type !== 'monthly_rollover' && (
            <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Expires: {endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Note */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Admin Note (optional)</label>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Paid subscription, trial, promo…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {msg && (
          <p className={`text-xs font-medium ${msg.includes('granted') || msg.includes('revoked') ? 'text-emerald-400' : 'text-red-400'}`}>
            {msg}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={grant}
            disabled={saving}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
            {existing && isAccessValid(existing) ? 'Update Access' : 'Grant Access'}
          </button>
          {existing && isAccessValid(existing) && (
            <button
              onClick={revoke}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              Revoke
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white text-sm transition">Cancel</button>
        </div>
      </div>
    </Modal>
  )
}

// ── Users Tab ─────────────────────────────────────────────────────────────────

function UsersTab({ onUsersLoaded }: { onUsersLoaded: (users: UserRow[]) => void }) {
  const [users,      setUsers]      = useState<UserRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh,setLastRefresh]= useState<Date | null>(null)
  const [search,     setSearch]     = useState('')
  const [editing,    setEditing]    = useState<UserRow | null>(null)
  const [pwdUser,    setPwdUser]    = useState<UserRow | null>(null)
  const [delUser,    setDelUser]    = useState<UserRow | null>(null)
  const [accessUser, setAccessUser] = useState<UserRow | null>(null)
  const [editForm,   setEditForm]   = useState({ name: '', email: '', role: 'user' })
  const [pwdForm,    setPwdForm]    = useState({ password: '', confirm: '', show: false })
  const [saving,     setSaving]     = useState(false)
  const [msg,        setMsg]        = useState('')
  const [fetchError, setFetchError] = useState('')

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true)
    setFetchError('')
    try {
      const r    = await fetch('/api/admin/users')
      const json = await r.json()
      if (!r.ok) { setFetchError(`Error ${r.status}: ${(json as { error?: string })?.error ?? 'Failed'}`); return }
      if (!Array.isArray(json)) { setFetchError('Unexpected response.'); return }

      const enriched = json as UserRow[]
      setUsers(enriched)
      setLastRefresh(new Date())
      onUsersLoaded(enriched)
    } catch {
      setFetchError('Could not reach server.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [onUsersLoaded])

  useEffect(() => {
    load()
    // Silent refresh every 30 minutes — presence data doesn't need real-time sync
    const id = setInterval(() => load(true), 30 * 60 * 1000)
    return () => clearInterval(id)
  }, [load])

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function openEdit(u: UserRow) { setEditing(u); setEditForm({ name: u.name ?? '', email: u.email, role: u.role }); setMsg('') }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    const res = await fetch(`/api/admin/users/${editing.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm),
    })
    setSaving(false)
    if (res.ok) { setMsg('Saved.'); load(true); setTimeout(() => setEditing(null), 800) }
    else { const e = await res.json(); setMsg(e.error ?? 'Error') }
  }

  async function savePassword() {
    if (!pwdUser) return
    if (pwdForm.password !== pwdForm.confirm) { setMsg('Passwords do not match.'); return }
    setSaving(true)
    const res = await fetch(`/api/admin/users/${pwdUser.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwdForm.password }),
    })
    setSaving(false)
    if (res.ok) { setMsg('Password updated.'); setTimeout(() => { setPwdUser(null); setMsg('') }, 800) }
    else { const e = await res.json(); setMsg(e.error ?? 'Error') }
  }

  async function confirmDelete() {
    if (!delUser) return
    setSaving(true)
    const res = await fetch(`/api/admin/users/${delUser.id}`, { method: 'DELETE' })
    setSaving(false)
    if (res.ok) { setDelUser(null); load(true) }
    else setMsg('Delete failed.')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:border-white/20 transition disabled:opacity-50"
          title="Refresh user list"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {lastRefresh ? (
            <span className="hidden sm:inline">{lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          ) : (
            <span className="hidden sm:inline">Refresh</span>
          )}
        </button>
      </div>

      {fetchError && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300 flex-1">{fetchError}</p>
          <button onClick={() => load()} className="text-xs text-red-400 hover:text-white underline">Retry</button>
        </div>
      )}

      <div className="bg-[#131722] border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Login via</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Progress</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Analysis</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr><td colSpan={8} className="py-12 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500 mx-auto" />
                </td></tr>
              )}
              {!loading && !fetchError && filtered.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-gray-500 text-sm">
                  {search ? 'No users match your search.' : 'No registered users yet.'}
                </td></tr>
              )}
              {filtered.map(u => {
                const completedLessons = u.progress.filter(p => p.completed).length
                const avatarLetter = (u.name?.[0] ?? u.email[0]).toUpperCase()
                const loginMethods = [...u.accounts.map(a => a.provider), ...(u.hasPassword ? ['password'] : [])]
                const access   = u.analysisAccess
                const hasAccess = isAccessValid(access)
                const isRollover = access?.type === 'monthly_rollover'
                const accessLabelMap: Record<string, string> = { one_week: '1 Week', one_month: '1 Month', three_months: '3 Months', six_months: '6 Months', twelve_months: '12 Months', monthly_rollover: 'Rollover' }
                const accessLabel = access?.type ? (accessLabelMap[access.type] ?? 'Active') : 'Active'

                const lastSeen      = u.lastSeenAt ? new Date(u.lastSeenAt) : null
                const msSinceSeen  = lastSeen ? Date.now() - lastSeen.getTime() : Infinity
                const isLive       = msSinceSeen < 5 * 60 * 1000              // < 5 min = on site now
                const isRecent     = msSinceSeen < 30 * 24 * 60 * 60 * 1000  // < 30 days = has visited
                const lastSeenLabel = (() => {
                  if (!lastSeen || !isRecent) return null
                  if (isLive) return 'Online'
                  const mins = Math.floor(msSinceSeen / 60_000)
                  const hrs  = Math.floor(msSinceSeen / 3_600_000)
                  const days = Math.floor(msSinceSeen / 86_400_000)
                  if (mins < 60)  return `${mins}m ago`
                  if (hrs  < 24)  return `${hrs}h ago`
                  if (days === 1) return 'Yesterday'
                  return `${days}d ago`
                })()

                return (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          {u.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.image} alt="" className="w-8 h-8 rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-xs font-bold">
                              {avatarLetter}
                            </div>
                          )}
                          {isLive && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#131722] animate-pulse" title="Active now" />
                          )}
                          {!isLive && isRecent && lastSeen && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-yellow-400/70 border-2 border-[#131722]" title={`Last seen: ${lastSeenLabel}`} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white leading-tight whitespace-nowrap">{u.name ?? <span className="text-gray-600 italic">No name</span>}</p>
                          {isLive && <p className="text-[10px] text-emerald-400 leading-tight font-semibold">● Online</p>}
                          {!isLive && lastSeenLabel && (
                            <p className="text-[10px] text-yellow-400/70 leading-tight">{lastSeenLabel}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-200 font-mono">{u.email}</p>
                      {u.emailVerified && <p className="text-[10px] text-emerald-500 mt-0.5">✓ verified</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {loginMethods.length === 0 && <span className="text-[10px] text-gray-600 italic">unknown</span>}
                        {loginMethods.map(m => <ProviderBadge key={m} provider={m} />)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-400">{completedLessons} lessons</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        u.role === 'admin' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-gray-400'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    {/* Analysis Access column */}
                    <td className="px-4 py-3">
                      {u.role === 'admin' ? (
                        <span className="text-[10px] text-amber-400 font-medium">Admin (always)</span>
                      ) : hasAccess ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full">
                            <Unlock className="w-2.5 h-2.5" />
                            {accessLabel}
                          </span>
                          {!isRollover && access && (
                            <p className="text-[9px] text-gray-600 mt-0.5">exp {fmtDate(access.endDate)}</p>
                          )}
                        </div>
                      ) : access ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-300 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                          <Lock className="w-2.5 h-2.5" />
                          {access.active ? 'Expired' : 'Revoked'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-600 italic">No access</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{timeAgo(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Analysis access button */}
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => setAccessUser(u)}
                            className={`p-1.5 rounded-lg hover:bg-white/10 transition ${hasAccess ? 'text-emerald-500 hover:text-emerald-400' : 'text-gray-500 hover:text-teal-400'}`}
                            title={hasAccess ? 'Manage analysis access' : 'Grant analysis access'}
                          >
                            {hasAccess ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition" title="Edit user">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setPwdUser(u); setPwdForm({ password: '', confirm: '', show: false }); setMsg('') }}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-amber-400 transition" title="Reset password">
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setDelUser(u); setMsg('') }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition" title="Delete user">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!loading && (
          <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
            <p className="text-xs text-gray-600">{filtered.length} of {users.length} user{users.length !== 1 ? 's' : ''}</p>
            <button onClick={() => load(true)} className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
        )}
      </div>

      {/* Grant Access Modal */}
      {accessUser && (
        <GrantAccessModal
          user={accessUser}
          existing={accessUser.analysisAccess}
          onClose={() => setAccessUser(null)}
          onSaved={load}
        />
      )}

      {/* Edit Modal */}
      {editing && (
        <Modal title="Edit User" onClose={() => setEditing(null)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Name</label>
              <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Email</label>
              <input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Role</label>
              <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                className="w-full bg-[#0a0f1e] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </div>
            {msg && <p className={`text-xs ${msg === 'Saved.' ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={saveEdit} disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Changes
              </button>
              <button onClick={() => setEditing(null)} className="px-4 py-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white text-sm transition">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Password Reset Modal */}
      {pwdUser && (
        <Modal title={`Reset Password — ${pwdUser.name ?? pwdUser.email}`} onClose={() => setPwdUser(null)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">New Password</label>
              <div className="relative">
                <input type={pwdForm.show ? 'text' : 'password'} value={pwdForm.password}
                  onChange={e => setPwdForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-white focus:outline-none focus:border-emerald-500/50" placeholder="Min 8 characters" />
                <button type="button" onClick={() => setPwdForm(f => ({ ...f, show: !f.show }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  {pwdForm.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Confirm Password</label>
              <input type={pwdForm.show ? 'text' : 'password'} value={pwdForm.confirm}
                onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50" placeholder="Repeat password" />
            </div>
            {msg && <p className={`text-xs ${msg === 'Password updated.' ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={savePassword} disabled={saving || !pwdForm.password}
                className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Update Password
              </button>
              <button onClick={() => setPwdUser(null)} className="px-4 py-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white text-sm transition">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {delUser && (
        <Modal title="Delete User" onClose={() => setDelUser(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300 leading-relaxed">
                This will permanently delete <strong>{delUser.name ?? delUser.email}</strong> and all their progress data. This cannot be undone.
              </p>
            </div>
            {msg && <p className="text-xs text-red-400">{msg}</p>}
            <div className="flex gap-3">
              <button onClick={confirmDelete} disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Delete User
              </button>
              <button onClick={() => setDelUser(null)} className="px-4 py-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-white text-sm transition">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Content Tab ───────────────────────────────────────────────────────────────

function ContentTab() {
  const [lessons,          setLessons]          = useState<Record<string, LessonState>>(buildInitialState)
  const [running,          setRunning]          = useState(false)
  const [singleRunning,    setSingleRunning]    = useState<string | null>(null)
  const [summary,          setSummary]          = useState<StreamEvent | null>(null)
  const [filter,           setFilter]           = useState('all')
  const abortRef = useRef<AbortController | null>(null)

  const counts = (() => {
    const all = Object.values(lessons)
    return {
      total:      all.length,
      done:       all.filter(l => ['done','cached','skipped'].includes(l.status)).length,
      generating: all.filter(l => l.status === 'generating').length,
      errors:     all.filter(l => l.status === 'error').length,
      idle:       all.filter(l => l.status === 'idle').length,
    }
  })()
  const pct = Math.round((counts.done / counts.total) * 100)

  async function consumeStream(url: string, signal: AbortSignal) {
    const res = await fetch(url, { signal })
    if (!res.body) throw new Error('No body')
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n'); buf = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        try { handleEvent(JSON.parse(line) as StreamEvent) } catch { /* ignore */ }
      }
    }
  }

  async function startGeneration(moduleFilter?: string) {
    if (running || singleRunning) return
    setRunning(true); setSummary(null)
    abortRef.current = new AbortController()
    const url = moduleFilter ? `/api/pregenerate?module=${moduleFilter}` : '/api/pregenerate'
    try {
      await consumeStream(url, abortRef.current.signal)
    } catch (e: unknown) {
      if (!(e instanceof Error && e.name === 'AbortError')) console.error(e)
    } finally { setRunning(false) }
  }

  async function generateSingle(lessonId: string) {
    if (running || singleRunning) return
    setSingleRunning(lessonId)
    setLessons(prev => ({ ...prev, [lessonId]: { ...prev[lessonId], status: 'generating', error: undefined } }))
    abortRef.current = new AbortController()
    try {
      await consumeStream(`/api/pregenerate?lesson=${lessonId}`, abortRef.current.signal)
    } catch (e: unknown) {
      if (!(e instanceof Error && e.name === 'AbortError')) {
        setLessons(prev => ({ ...prev, [lessonId]: { ...prev[lessonId], status: 'error', error: String(e) } }))
      }
    } finally { setSingleRunning(null) }
  }

  function handleEvent(ev: StreamEvent) {
    if (ev.type === 'complete') { setSummary(ev); return }
    if (!ev.lessonId) return
    setLessons(prev => {
      const l = { ...prev[ev.lessonId!] }
      if (ev.type === 'progress') l.status = 'generating'
      if (ev.type === 'skip')     l.status = 'skipped'
      if (ev.type === 'done')     { l.status = ev.fromCache ? 'cached' : 'done'; l.slides = ev.slides; l.durationSecs = ev.durationSecs; l.audioUrl = ev.audioUrl }
      if (ev.type === 'error')    { l.status = 'error'; l.error = ev.error }
      return { ...prev, [ev.lessonId!]: l }
    })
  }

  const filteredModules = filter === 'all' ? courseModules : courseModules.filter(m => m.id === filter)
  const busy = running || !!singleRunning

  function StatusIcon({ status }: { status: LessonState['status'] }) {
    if (['done','cached','skipped'].includes(status)) return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
    if (status === 'generating') return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin shrink-0" />
    if (status === 'error')      return <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
    return <div className="w-4 h-4 rounded-full border border-white/15 shrink-0" />
  }

  return (
    <div className="space-y-5">
      <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white">Lesson Audio Cache</h2>
            <p className="text-xs text-gray-400 mt-0.5">Pre-generate narration for all lessons, or generate one at a time.</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-emerald-400">{pct}%</div>
            <div className="text-xs text-gray-500">{counts.done}/{counts.total} done</div>
          </div>
        </div>
        <div className="h-2 bg-white/8 rounded-full overflow-hidden mb-4">
          <div className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-600 to-emerald-400" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Cached',  value: counts.done,       color: 'text-emerald-400' },
            { label: 'Running', value: counts.generating, color: 'text-yellow-400'  },
            { label: 'Errors',  value: counts.errors,     color: 'text-red-400'     },
            { label: 'Pending', value: counts.idle,       color: 'text-gray-400'    },
          ].map(s => (
            <div key={s.label} className="bg-white/4 rounded-xl p-3 text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => startGeneration()} disabled={busy}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? 'Generating…' : 'Generate All'}
          </button>
          {busy && (
            <button onClick={() => { abortRef.current?.abort(); setRunning(false); setSingleRunning(null) }}
              className="flex items-center gap-2 bg-red-600/20 text-red-400 border border-red-500/25 px-4 py-2.5 rounded-xl text-sm font-semibold transition">
              Stop
            </button>
          )}
          {!busy && (
            <button onClick={() => { setLessons(buildInitialState); setSummary(null) }}
              className="flex items-center gap-2 bg-white/5 text-gray-400 border border-white/10 px-4 py-2.5 rounded-xl text-sm transition">
              <RefreshCw className="w-4 h-4" /> Reset view
            </button>
          )}
        </div>
        {summary && (
          <div className={`mt-4 rounded-xl p-4 flex items-start gap-3 ${summary.failed ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
            {summary.failed ? <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            <p className={`text-sm font-medium ${summary.failed ? 'text-yellow-300' : 'text-emerald-300'}`}>
              {summary.generated} generated · {summary.skipped} cached{summary.failed ? ` · ${summary.failed} failed` : ''}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', ...courseModules.map(m => m.id)].map(id => (
          <button key={id} onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === id ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
            {id === 'all' ? 'All modules' : `Module ${courseModules.find(m => m.id === id)?.moduleNumber}`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredModules.map(mod => {
          const modLessons = mod.lessons.map(l => lessons[l.id]).filter(Boolean)
          const modDone    = modLessons.filter(l => ['done','cached','skipped'].includes(l.status)).length
          return (
            <div key={mod.id} className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/8 bg-white/2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Module {mod.moduleNumber}</span>
                  <span className="text-sm font-semibold text-white">{mod.title}</span>
                </div>
                <span className="text-xs text-gray-500">{modDone}/{modLessons.length}</span>
              </div>
              <div className="divide-y divide-white/5">
                {modLessons.map(lesson => {
                  const isThisRunning = singleRunning === lesson.id || (running && lesson.status === 'generating')
                  return (
                    <div key={lesson.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/2 transition-colors">
                      <StatusIcon status={lesson.status} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{lesson.title}</div>
                        <div className="text-xs text-gray-500">{lesson.id}
                          {isThisRunning && <span className="text-yellow-400 ml-2 animate-pulse">Generating…</span>}
                          {lesson.status === 'done' && lesson.durationSecs && <span className="text-emerald-500 ml-2">{lesson.durationSecs}s · {lesson.slides} slides</span>}
                          {lesson.error && <span className="text-red-400 ml-2 truncate">{lesson.error}</span>}
                        </div>
                      </div>
                      {lesson.audioUrl && (
                        <a href={lesson.audioUrl} target="_blank" rel="noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 text-xs shrink-0">▶</a>
                      )}
                      <button
                        onClick={() => generateSingle(lesson.id)}
                        disabled={busy}
                        title={`Generate audio for ${lesson.title}`}
                        className="shrink-0 p-1.5 rounded-lg bg-white/5 hover:bg-emerald-600/30 disabled:opacity-30 text-gray-400 hover:text-emerald-300 transition-colors"
                      >
                        {isThisRunning
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Play className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Signal Notify Section ─────────────────────────────────────────────────────

interface SignalAlertRow {
  id:         string
  slug:       string
  display:    string
  decision:   string
  confidence: number
  confluence: number
  entryLow:   number
  entryHigh:  number
  price:      number
  stopLoss:   number
  tp1:        number
  rrRatio:    string
  sentAt:     string
  notifiedAt: string | null
  notifiedTo: string | null
}

interface SavedRecipients {
  mode:    'all' | 'selected'
  userIds: string[]
}

function sigDec(price: number) {
  if (price >= 100) return 2
  if (price >= 1)   return 4
  return 5
}
function sigFmt(n: number, dec: number) {
  return (!n || !isFinite(n)) ? '—' : n.toFixed(dec)
}

function SignalNotifySection({ users }: { users: UserRow[] }) {
  const [signals,    setSignals]    = useState<SignalAlertRow[]>([])
  const [savedPref,  setSavedPref]  = useState<SavedRecipients>({ mode: 'all', userIds: [] })
  const [loading,    setLoading]    = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [recipMode,  setRecipMode]  = useState<'all' | 'select'>('all')
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [search,     setSearch]     = useState('')
  const [sending,    setSending]    = useState(false)
  const [results,    setResults]    = useState<Record<string, { ok: boolean; sent?: number; error?: string }>>({})

  useEffect(() => {
    fetch('/api/admin/signals')
      .then(r => r.ok ? r.json() : { alerts: [], savedRecipients: { mode: 'all', userIds: [] } })
      .then((data: { alerts: SignalAlertRow[]; savedRecipients: SavedRecipients }) => {
        setSignals(data.alerts ?? [])
        const pref = data.savedRecipients ?? { mode: 'all', userIds: [] }
        setSavedPref(pref)
        setRecipMode(pref.mode === 'selected' ? 'select' : 'all')
        if (pref.mode === 'selected' && pref.userIds.length > 0) {
          setSelected(new Set(pref.userIds))
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  function toggleUser(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function notifySignal(signalId: string) {
    const to = recipMode === 'all' ? 'all' : Array.from(selected)
    if (recipMode === 'select' && selected.size === 0) return
    setSending(true)
    try {
      const res  = await fetch(`/api/admin/signals/${signalId}/notify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      })
      const json = await res.json() as { sent?: number; error?: string }
      if (!res.ok) {
        setResults(prev => ({ ...prev, [signalId]: { ok: false, error: json.error ?? 'Failed' } }))
      } else {
        setResults(prev => ({ ...prev, [signalId]: { ok: true, sent: json.sent } }))
        setSignals(prev => prev.map(s => s.id === signalId ? { ...s, notifiedAt: new Date().toISOString() } : s))
        setSavedPref({ mode: recipMode === 'all' ? 'all' : 'selected', userIds: recipMode === 'all' ? [] : Array.from(selected) })
        setExpandedId(null)
      }
    } catch {
      setResults(prev => ({ ...prev, [signalId]: { ok: false, error: 'Network error' } }))
    } finally {
      setSending(false)
    }
  }

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="bg-[#131722] border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-bold text-white">Signal Notifications</h3>
        <span className="text-xs text-gray-500 ml-auto">Last 24 h · admin-approved only</span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-1">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading scanner signals…
        </div>
      )}

      {!loading && signals.length === 0 && (
        <p className="text-xs text-gray-500 py-1">No scanner signals in the last 24 hours.</p>
      )}

      {!loading && signals.length > 0 && (
        <div className="space-y-2">
          {signals.map(sig => {
            const dec      = sigDec(sig.price)
            const isBuy    = sig.decision === 'BUY'
            const notified = !!sig.notifiedAt
            const isOpen   = expandedId === sig.id
            const res      = results[sig.id]

            return (
              <div key={sig.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                {/* Signal row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isBuy ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                    {sig.decision}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{sig.display}</p>
                    <p className="text-[11px] text-gray-500 leading-snug">
                      {sig.confidence}% conf · Entry {sigFmt(sig.entryLow,dec)}–{sigFmt(sig.entryHigh,dec)} · SL {sigFmt(sig.stopLoss,dec)} · TP1 {sigFmt(sig.tp1,dec)} · R/R {sig.rrRatio}
                    </p>
                  </div>
                  {notified ? (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Notified
                    </span>
                  ) : res ? (
                    <span className={`text-[11px] shrink-0 ${res.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                      {res.ok ? `Sent to ${res.sent}` : res.error}
                    </span>
                  ) : (
                    <button
                      onClick={() => setExpandedId(isOpen ? null : sig.id)}
                      className="flex items-center gap-1.5 shrink-0 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition"
                    >
                      <Send className="w-3 h-3" />
                      Notify
                      {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>

                {/* Expanded recipient picker */}
                {isOpen && (
                  <div className="border-t border-white/10 px-4 py-4 space-y-3">
                    <p className="text-xs text-gray-400">Choose who receives this signal notification. Selection is saved for next time.</p>
                    <div className="flex gap-2">
                      {(['all', 'select'] as const).map(m => (
                        <button key={m} onClick={() => setRecipMode(m)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                            recipMode === m ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                          }`}>
                          {m === 'all' ? `All users (${users.length})` : `Select users${selected.size > 0 ? ` (${selected.size})` : ''}`}
                        </button>
                      ))}
                    </div>
                    {recipMode === 'select' && (
                      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
                          <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter users…"
                            className="flex-1 bg-transparent text-xs text-white placeholder-gray-600 focus:outline-none" />
                          <button onClick={() => setSelected(new Set(users.map(u => u.id)))} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium">All</button>
                          <span className="text-gray-700">·</span>
                          <button onClick={() => setSelected(new Set())} className="text-[10px] text-gray-500 hover:text-white font-medium">None</button>
                        </div>
                        <div className="max-h-40 overflow-y-auto divide-y divide-white/5">
                          {filtered.length === 0 && <p className="text-xs text-gray-600 px-4 py-3">No users match.</p>}
                          {filtered.map(u => (
                            <label key={u.id} className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 cursor-pointer">
                              <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleUser(u.id)} className="accent-emerald-500" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-white truncate">{u.name ?? <span className="text-gray-500 italic">No name</span>}</p>
                                <p className="text-[10px] text-gray-400 font-mono truncate">{u.email}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-gray-500">
                        {recipMode === 'all' ? `Sends to all ${users.length} users` : `Sends to ${selected.size} selected`}
                        {(savedPref.mode === 'selected' && savedPref.userIds.length > 0) || savedPref.mode === 'all'
                          ? ' · selection auto-saved'
                          : ''}
                      </p>
                      <button
                        onClick={() => notifySignal(sig.id)}
                        disabled={sending || (recipMode === 'select' && selected.size === 0)}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-xs font-semibold transition"
                      >
                        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        {sending ? 'Sending…' : 'Send Notification'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Notify Tab ────────────────────────────────────────────────────────────────

function NotifyTab({ users }: { users: UserRow[] }) {
  const [subject,       setSubject]       = useState('')
  const [message,       setMessage]       = useState('')
  const [recipientMode, setRecipientMode] = useState<'all' | 'select'>('all')
  const [selected,      setSelected]      = useState<Set<string>>(new Set())
  const [search,        setSearch]        = useState('')
  const [sending,       setSending]       = useState(false)
  const [result,        setResult]        = useState<{
    ok?: boolean; sent?: number; failed?: number; total?: number;
    preview?: boolean; recipients?: string[]; note?: string; error?: string;
  } | null>(null)

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function toggleUser(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function selectAll() { setSelected(new Set(users.map(u => u.id))) }
  function clearAll()  { setSelected(new Set()) }

  async function send() {
    if (!subject.trim() || !message.trim()) return
    const to = recipientMode === 'all' ? 'all' : Array.from(selected)
    if (recipientMode === 'select' && selected.size === 0) return
    setSending(true); setResult(null)
    try {
      const res  = await fetch('/api/admin/notify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, message }),
      })
      const json = await res.json()
      if (!res.ok) setResult({ ok: false, error: (json as { error?: string }).error ?? 'Send failed.' })
      else setResult({ ...(json as object), ok: true })
    } catch {
      setResult({ ok: false, error: 'Network error.' })
    } finally {
      setSending(false)
    }
  }

  const recipientCount = recipientMode === 'all' ? users.length : selected.size

  return (
    <div className="space-y-5">
      <SignalNotifySection users={users} />

      <div className="bg-[#131722] border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Compose Notification</h3>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-2 block">Send to</label>
          <div className="flex gap-2">
            {(['all', 'select'] as const).map(m => (
              <button key={m} onClick={() => setRecipientMode(m)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${
                  recipientMode === m ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                }`}>
                {m === 'all' ? `All users (${users.length})` : `Select users${m === 'select' && selected.size > 0 ? ` (${selected.size})` : ''}`}
              </button>
            ))}
          </div>
        </div>
        {recipientMode === 'select' && (
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
              <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter users…"
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none" />
              <button onClick={selectAll} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium">All</button>
              <span className="text-gray-700">·</span>
              <button onClick={clearAll} className="text-[10px] text-gray-500 hover:text-white font-medium">None</button>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-white/5">
              {filtered.length === 0 && <p className="text-xs text-gray-600 px-4 py-3">No users match.</p>}
              {filtered.map(u => (
                <label key={u.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 cursor-pointer">
                  <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleUser(u.id)} className="accent-emerald-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{u.name ?? <span className="text-gray-500 italic">No name</span>}</p>
                    <p className="text-xs text-gray-400 font-mono truncate">{u.email}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Subject</label>
          <input value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="e.g. New feature: Multi-timeframe analysis is live!"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Message</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your message here…" rows={6}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 resize-none" />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {recipientCount > 0 ? `Will send to ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}` : 'Select at least one recipient'}
          </p>
          <button onClick={send} disabled={sending || !subject.trim() || !message.trim() || recipientCount === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>

      {result && (
        <div className={`rounded-xl p-5 border ${result.preview ? 'bg-blue-500/10 border-blue-500/20' : result.ok ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
          {result.error && <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-red-400 shrink-0" /><p className="text-sm text-red-300">{result.error}</p></div>}
          {result.preview && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <p className="text-sm font-semibold text-blue-300">Preview — SMTP not configured</p>
              </div>
              <p className="text-xs text-blue-300/70 leading-relaxed">{result.note}</p>
              <div className="bg-white/5 rounded-xl px-4 py-3 space-y-2">
                <p className="text-xs text-gray-400"><span className="text-gray-500">To:</span> {result.recipients?.join(', ')}</p>
                <p className="text-xs text-gray-400"><span className="text-gray-500">Subject:</span> {subject}</p>
              </div>
              <div className="bg-white/5 rounded-xl px-4 py-3"><p className="text-xs text-gray-400 whitespace-pre-wrap">{message}</p></div>
            </div>
          )}
          {result.ok && !result.preview && (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-300">
                Sent to {result.sent} of {result.total} recipients{result.failed ? ` · ${result.failed} failed` : ''}
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  )
}

// ── Emergency Cleanup ─────────────────────────────────────────────────────────

interface CleanupItem { key: string; label: string; description: string; count: number }

function EmergencyCleanup() {
  const [items,    setItems]    = useState<CleanupItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [running,  setRunning]  = useState(false)
  const [result,   setResult]   = useState<{ total: number; results: Record<string,number> } | null>(null)
  const [error,    setError]    = useState('')
  const [confirm,  setConfirm]  = useState(false)

  useEffect(() => {
    fetch('/api/admin/cleanup')
      .then(r => r.json())
      .then(d => { setItems(d.items ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function toggle(key: string) {
    setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  function selectAll() {
    setSelected(new Set(items.filter(i => i.count > 0).map(i => i.key)))
  }

  function clearAll() { setSelected(new Set()) }

  async function runCleanup() {
    setRunning(true); setError(''); setResult(null); setConfirm(false)
    try {
      const res = await fetch('/api/admin/cleanup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: Array.from(selected) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Cleanup failed'); return }
      setResult(data)
      setSelected(new Set())
      // Refresh counts
      const r2 = await fetch('/api/admin/cleanup')
      const d2 = await r2.json()
      setItems(d2.items ?? [])
    } catch (e) {
      setError(String(e))
    } finally {
      setRunning(false)
    }
  }

  const totalSelected = items.filter(i => selected.has(i.key)).reduce((s, i) => s + i.count, 0)

  return (
    <div className="bg-[#131722] border border-red-500/20 rounded-2xl p-5">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
          <DatabaseZap className="w-4 h-4 text-red-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Emergency Cleanup</h3>
          <p className="text-xs text-gray-500 mt-0.5">Select excess or unwanted data categories and hit Clean to permanently delete them.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-xs py-4">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading data counts…
        </div>
      ) : (
        <>
          {/* Select all / clear row */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-500">{items.filter(i => i.count > 0).length} categories with data</span>
            <div className="flex gap-2">
              <button onClick={selectAll}  className="text-[11px] text-blue-400 hover:text-blue-300 transition">Select all</button>
              <span className="text-gray-700">·</span>
              <button onClick={clearAll}   className="text-[11px] text-gray-500 hover:text-gray-400 transition">Clear</button>
            </div>
          </div>

          {/* Cleanup items */}
          <div className="space-y-2 mb-5">
            {items.map(item => {
              const checked  = selected.has(item.key)
              const hasData  = item.count > 0
              return (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 rounded-xl px-4 py-3 cursor-pointer transition border ${
                    checked
                      ? 'bg-red-500/10 border-red-500/30'
                      : hasData
                        ? 'bg-white/5 border-transparent hover:bg-white/8'
                        : 'bg-white/[0.02] border-transparent opacity-50 cursor-default'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!hasData}
                    onChange={() => hasData && toggle(item.key)}
                    className="mt-0.5 accent-red-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-medium ${checked ? 'text-red-300' : 'text-gray-200'}`}>{item.label}</span>
                      <span className={`text-[11px] font-mono tabular-nums shrink-0 ${
                        item.count > 0 ? (checked ? 'text-red-400' : 'text-yellow-400') : 'text-gray-600'
                      }`}>
                        {item.count.toLocaleString()} row{item.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{item.description}</p>
                  </div>
                </label>
              )
            })}
          </div>

          {/* Result banner */}
          {result && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mb-4">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              <span className="text-xs text-green-300">
                Deleted <strong>{result.total.toLocaleString()}</strong> row{result.total !== 1 ? 's' : ''} across {Object.keys(result.results).length} categor{Object.keys(result.results).length !== 1 ? 'ies' : 'y'}.
              </span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-xs text-red-300">{error}</span>
            </div>
          )}

          {/* Confirm step */}
          {confirm && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
              <div className="flex items-start gap-2.5 mb-3">
                <TriangleAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300 leading-relaxed">
                  This will permanently delete <strong>{totalSelected.toLocaleString()} rows</strong> across {selected.size} categor{selected.size !== 1 ? 'ies' : 'y'}. This cannot be undone.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={runCleanup} disabled={running}
                  className="flex items-center gap-1.5 text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg font-semibold transition disabled:opacity-50">
                  {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  {running ? 'Cleaning…' : 'Yes, delete permanently'}
                </button>
                <button onClick={() => setConfirm(false)} className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg transition">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Clean button */}
          {!confirm && (
            <button
              disabled={selected.size === 0 || running}
              onClick={() => setConfirm(true)}
              className="flex items-center gap-2 text-sm bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 px-4 py-2.5 rounded-xl font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed w-full justify-center"
            >
              <Trash2 className="w-4 h-4" />
              {selected.size === 0
                ? 'Select categories above'
                : `Clean ${selected.size} categor${selected.size !== 1 ? 'ies' : 'y'} (${totalSelected.toLocaleString()} rows)`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab() {
  return (
    <div className="space-y-5">
      <div className="bg-[#131722] border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-1">Admin Credentials</h3>
        <p className="text-xs text-gray-500 mb-4">Admin login is hardcoded and separate from the user database.</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
            <span className="text-xs text-gray-400">Email</span>
            <span className="text-sm font-mono text-white">admin@forex.com</span>
          </div>
          <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
            <span className="text-xs text-gray-400">Password</span>
            <span className="text-sm font-mono text-gray-300">Set via ADMIN_PASSWORD env var</span>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2.5 bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3">
          <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300/70 leading-relaxed">
            To change the admin password, set <code className="text-blue-300 bg-blue-500/10 px-1 rounded">ADMIN_PASSWORD</code> in your <code className="text-blue-300 bg-blue-500/10 px-1 rounded">.env.local</code> file and restart the server.
          </p>
        </div>
      </div>

      <div className="bg-[#131722] border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4">Site Navigation</h3>
        <div className="space-y-2">
          {[
            { label: 'Homepage',        href: '/'           },
            { label: 'Course',          href: '/course'     },
            { label: 'Market Analysis', href: '/analysis'   },
            { label: 'Profile',         href: '/profile'    },
            { label: 'Sign In',         href: '/auth/signin'},
          ].map(link => (
            <Link key={link.href} href={link.href}
              className="flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 transition group">
              <span className="text-sm text-gray-300 group-hover:text-white transition">{link.label}</span>
              <span className="text-xs text-gray-600 font-mono">{link.href}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-[#131722] border border-white/10 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4">Environment</h3>
        <div className="space-y-2">
          {[
            { key: 'Database',       value: 'SQLite (prisma/dev.db)'   },
            { key: 'Auth provider',  value: 'NextAuth v4 + JWT'        },
            { key: 'Market data',    value: 'Yahoo Finance (25 pairs)' },
            { key: 'Course modules', value: `${courseModules.length} modules` },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2.5">
              <span className="text-xs text-gray-500">{item.key}</span>
              <span className="text-xs text-gray-300 font-mono">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <EmergencyCleanup />
    </div>
  )
}

// ── Support Tab ───────────────────────────────────────────────────────────────

interface SupportTicket {
  id:          string
  userId:      string | null
  guestName:   string | null
  guestEmail:  string | null
  subject:     string
  messages:    { role: string; content: string }[]
  status:      'open' | 'in_progress' | 'resolved'
  priority:    'low' | 'normal' | 'high'
  adminNote:   string | null
  adminReply:  string | null
  repliedAt:   string | null
  replyRead:   boolean
  resolvedAt:  string | null
  createdAt:   string
  updatedAt:   string
  user:        { id: string; name: string | null; email: string } | null
}

function SupportTab() {
  const [tickets,      setTickets]      = useState<SupportTicket[]>([])
  const [loading,      setLoading]      = useState(true)
  const [expanded,     setExpanded]     = useState<string | null>(null)
  const [noteInputs,   setNoteInputs]   = useState<Record<string, string>>({})
  const [replyInputs,  setReplyInputs]  = useState<Record<string, string>>({})
  const [saving,       setSaving]       = useState<Record<string, boolean>>({})

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/support')
    if (res.ok) setTickets(await res.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function updateTicket(id: string, patch: object) {
    setSaving(s => ({ ...s, [id]: true }))
    await fetch(`/api/admin/support/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    await load()
    setSaving(s => ({ ...s, [id]: false }))
  }

  async function deleteTicket(id: string) {
    if (!confirm('Delete this ticket permanently?')) return
    await fetch(`/api/admin/support/${id}`, { method: 'DELETE' })
    setTickets(t => t.filter(x => x.id !== id))
  }

  const open_count  = tickets.filter(t => t.status === 'open').length
  const inprog_count = tickets.filter(t => t.status === 'in_progress').length

  const priorityColor = (p: string) =>
    p === 'high'   ? 'text-red-400 bg-red-500/10 border-red-500/30' :
    p === 'normal' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                     'text-gray-400 bg-white/5 border-white/15'

  const statusColor = (s: string) =>
    s === 'resolved'    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
    s === 'in_progress' ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' :
                          'text-orange-400 bg-orange-500/10 border-orange-500/30'

  const statusLabel = (s: string) =>
    s === 'resolved' ? 'Resolved' : s === 'in_progress' ? 'In Progress' : 'Open'

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Open',        val: open_count,          color: 'text-orange-400' },
          { label: 'In Progress', val: inprog_count,        color: 'text-blue-400'   },
          { label: 'Total',       val: tickets.length,      color: 'text-white'      },
        ].map(s => (
          <div key={s.label} className="bg-[#131722] border border-white/10 rounded-xl p-4 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {tickets.length === 0 ? (
        <div className="bg-[#131722] border border-white/10 rounded-2xl p-10 text-center">
          <Inbox className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No support tickets yet</p>
          <p className="text-xs text-gray-600 mt-1">Customer messages from the Aria chat widget will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => {
            const isExp    = expanded === ticket.id
            const note     = noteInputs[ticket.id]  ?? ticket.adminNote  ?? ''
            const replyDraft = replyInputs[ticket.id] ?? ''
            const who      = ticket.user?.name ?? ticket.guestName ?? 'Guest'
            const email    = ticket.user?.email ?? ticket.guestEmail ?? '—'
            const hasReply = !!ticket.adminReply

            return (
              <div key={ticket.id} className="bg-[#131722] border border-white/10 rounded-2xl overflow-hidden">
                {/* Ticket header */}
                <div className="flex items-start gap-3 px-5 py-4">
                  <div className="w-9 h-9 rounded-full bg-[#1D9E75]/15 border border-[#1D9E75]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-[#1D9E75]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityColor(ticket.priority)}`}>
                        {ticket.priority.toUpperCase()}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColor(ticket.status)}`}>
                        {statusLabel(ticket.status)}
                      </span>
                      {hasReply && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ticket.replyRead ? 'text-gray-400 bg-white/5 border-white/15' : 'text-blue-300 bg-blue-500/15 border-blue-500/30'}`}>
                          {ticket.replyRead ? 'REPLY READ' : 'REPLY SENT'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-white leading-snug">{ticket.subject}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{who} · {email} · {timeAgo(ticket.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => setExpanded(isExp ? null : ticket.id)}
                    className="text-gray-600 hover:text-white transition shrink-0 mt-1"
                  >
                    {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Expanded body */}
                {isExp && (
                  <div className="border-t border-white/8 px-5 pb-5">
                    {/* Conversation */}
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mt-4 mb-2">Conversation ({ticket.messages.length} messages)</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto bg-[#0b1120] rounded-xl p-3 border border-white/8">
                      {ticket.messages.map((m, i) => (
                        <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                            m.role === 'user'
                              ? 'bg-[#1D9E75]/20 text-emerald-200'
                              : 'bg-white/5 text-gray-300'
                          }`}>
                            <span className="font-bold text-[9px] opacity-60 uppercase">{m.role === 'user' ? 'User' : 'Aria'}</span>
                            <p className="mt-0.5 whitespace-pre-wrap">{m.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reply to user */}
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mt-4 mb-2">Reply to User</p>
                    {hasReply && (
                      <div className="mb-3 bg-blue-500/8 border border-blue-500/20 rounded-xl px-3 py-2.5">
                        <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-1">Previously sent reply {ticket.replyRead ? '(read)' : '(unread)'}</p>
                        <p className="text-xs text-blue-200 whitespace-pre-wrap">{ticket.adminReply}</p>
                      </div>
                    )}
                    <textarea
                      value={replyDraft}
                      onChange={e => setReplyInputs(r => ({ ...r, [ticket.id]: e.target.value }))}
                      placeholder={hasReply ? 'Send another reply…' : 'Type your reply to the user…'}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-blue-500/50 transition"
                    />
                    <div className="mt-2">
                      <button
                        onClick={async () => {
                          if (!replyDraft.trim()) return
                          await updateTicket(ticket.id, { adminReply: replyDraft.trim(), status: ticket.status === 'open' ? 'in_progress' : ticket.status })
                          setReplyInputs(r => ({ ...r, [ticket.id]: '' }))
                        }}
                        disabled={!replyDraft.trim() || saving[ticket.id]}
                        className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {saving[ticket.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Send Reply to User
                      </button>
                      <p className="text-[9px] text-gray-600 mt-1.5">The reply appears directly in the user's Aria chat widget under "Customer Service Agent" the next time they open it.</p>
                    </div>

                    {/* Admin note */}
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mt-4 mb-2">Internal Note</p>
                    <textarea
                      value={note}
                      onChange={e => setNoteInputs(n => ({ ...n, [ticket.id]: e.target.value }))}
                      placeholder="Add an internal note or resolution details (not visible to user)…"
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-[#1D9E75]/50 transition"
                    />

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {ticket.status !== 'in_progress' && (
                        <button
                          onClick={() => updateTicket(ticket.id, { status: 'in_progress', adminNote: note })}
                          disabled={saving[ticket.id]}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 hover:bg-blue-500/25 transition disabled:opacity-50"
                        >
                          <Clock className="w-3 h-3" />In Progress
                        </button>
                      )}
                      {ticket.status !== 'resolved' && (
                        <button
                          onClick={() => updateTicket(ticket.id, { status: 'resolved', adminNote: note })}
                          disabled={saving[ticket.id]}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition disabled:opacity-50"
                        >
                          <CircleCheck className="w-3 h-3" />Resolve
                        </button>
                      )}
                      {ticket.status === 'resolved' && (
                        <button
                          onClick={() => updateTicket(ticket.id, { status: 'open', adminNote: note })}
                          disabled={saving[ticket.id]}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-gray-400 hover:text-white transition disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" />Reopen
                        </button>
                      )}
                      <button
                        onClick={() => updateTicket(ticket.id, { adminNote: note })}
                        disabled={saving[ticket.id]}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-gray-400 hover:text-white transition disabled:opacity-50"
                      >
                        {saving[ticket.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Edit3 className="w-3 h-3" />}
                        Save Note
                      </button>
                      <button
                        onClick={() => deleteTicket(ticket.id)}
                        className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
                      >
                        <Trash2 className="w-3 h-3" />Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Scripts Tab ───────────────────────────────────────────────────────────────

interface FMPredRow {
  id:          string
  display:     string
  slug:        string
  decision:    string
  confidence:  number
  entryLow:    number
  entryHigh:   number
  stopLoss:    number
  tp1:         number
  tp2:         number
  tp3:         number
  rrRatio:     string
  outcome:     string
  priceAtCall: number
  generatedAt: string
}

interface ScriptSegment {
  id:          string
  type:        string
  headline:    string
  narration:   string
  duration:    number
  showChart:   boolean
  chartLabel?: string
}

interface TradeScript {
  id:            string
  title:         string
  predictionIds: string[]
  segments:      ScriptSegment[]
  status:        string
  approvedAt:    string | null
  createdAt:     string
}

function outcomeColor(o: string) {
  if (o.startsWith('tp')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
  if (o === 'sl_hit')     return 'text-red-400 bg-red-500/10 border-red-500/30'
  return 'text-gray-400 bg-white/5 border-white/15'
}
function outcomeLabel(o: string) {
  if (o === 'tp1_hit') return 'TP1 ✓'
  if (o === 'tp2_hit') return 'TP2 ✓'
  if (o === 'tp3_hit') return 'TP3 ✓'
  if (o === 'sl_hit')  return 'SL ✗'
  if (o === 'expired') return 'Expired'
  return o
}

function ScriptsTab() {
  const [preds,       setPreds]       = useState<FMPredRow[]>([])
  const [scripts,     setScripts]     = useState<TradeScript[]>([])
  const [selected,    setSelected]    = useState<Set<string>>(new Set())
  const [generating,  setGenerating]  = useState(false)
  const [loadingPreds, setLoadingPreds] = useState(true)
  const [loadingScripts, setLoadingScripts] = useState(true)
  const [expanded,    setExpanded]    = useState<string | null>(null)
  const [approving,   setApproving]   = useState<Record<string, boolean>>({})
  const [deleting,    setDeleting]    = useState<Record<string, boolean>>({})
  const [genError,    setGenError]    = useState('')
  const [predFilter,  setPredFilter]  = useState('')

  async function loadPreds() {
    setLoadingPreds(true)
    const r = await fetch('/api/admin/predictions')
    if (r.ok) setPreds(await r.json())
    setLoadingPreds(false)
  }
  async function loadScripts() {
    setLoadingScripts(true)
    const r = await fetch('/api/admin/trade-scripts')
    if (r.ok) setScripts(await r.json())
    setLoadingScripts(false)
  }

  useEffect(() => { loadPreds(); loadScripts() }, [])

  function togglePred(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function generateScript() {
    if (selected.size === 0) return
    setGenerating(true); setGenError('')
    try {
      const r = await fetch('/api/admin/trade-scripts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictionIds: Array.from(selected) }),
      })
      const text = await r.text()
      if (!r.ok) {
        let msg = `Server error ${r.status}`
        try { msg = (JSON.parse(text) as { error?: string }).error ?? msg } catch { /* html error page */ }
        setGenError(msg); return
      }
      const json = JSON.parse(text) as TradeScript
      setScripts(prev => [json, ...prev])
      setSelected(new Set())
      setExpanded(json.id)
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setGenerating(false)
    }
  }

  async function toggleApprove(script: TradeScript) {
    const newStatus = script.status === 'approved' ? 'draft' : 'approved'
    setApproving(a => ({ ...a, [script.id]: true }))
    const r = await fetch(`/api/admin/trade-scripts/${script.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (r.ok) {
      const updated = await r.json()
      setScripts(prev => prev.map(s => s.id === script.id ? updated : s))
    }
    setApproving(a => ({ ...a, [script.id]: false }))
  }

  async function deleteScript(id: string) {
    if (!confirm('Delete this script permanently?')) return
    setDeleting(a => ({ ...a, [id]: true }))
    await fetch(`/api/admin/trade-scripts/${id}`, { method: 'DELETE' })
    setScripts(prev => prev.filter(s => s.id !== id))
    if (expanded === id) setExpanded(null)
    setDeleting(a => ({ ...a, [id]: false }))
  }

  const filteredPreds = predFilter.trim()
    ? preds.filter(p =>
        p.display.toLowerCase().includes(predFilter.toLowerCase()) ||
        p.decision.toLowerCase().includes(predFilter.toLowerCase()))
    : preds

  const segTypeColor = (t: string) => {
    if (t === 'intro')    return 'bg-blue-500/20 text-blue-300'
    if (t === 'setup')    return 'bg-purple-500/20 text-purple-300'
    if (t === 'entry')    return 'bg-amber-500/20 text-amber-300'
    if (t === 'progress') return 'bg-orange-500/20 text-orange-300'
    if (t === 'outcome')  return 'bg-emerald-500/20 text-emerald-300'
    if (t === 'summary')  return 'bg-teal-500/20 text-teal-300'
    return 'bg-white/10 text-gray-300'
  }

  return (
    <div className="space-y-6">

      {/* Generate new script */}
      <div className="bg-[#131722] border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <h3 className="text-sm font-bold text-white">Generate New Script</h3>
          <span className="text-xs text-gray-500 ml-auto">Select resolved trades → Claude writes the script</span>
        </div>

        {loadingPreds ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading predictions…
          </div>
        ) : preds.length === 0 ? (
          <p className="text-xs text-gray-500">No resolved predictions yet. Predictions with outcomes (TP/SL hit) will appear here.</p>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  value={predFilter}
                  onChange={e => setPredFilter(e.target.value)}
                  placeholder="Filter by pair or direction…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                />
              </div>
              {selected.size > 0 && (
                <span className="text-xs font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-lg shrink-0">
                  {selected.size} selected
                </span>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 mb-4">
              {filteredPreds.map(p => {
                const isBuy   = p.decision === 'BUY'
                const isChk   = selected.has(p.id)
                const dec     = p.entryLow >= 100 ? 2 : p.entryLow >= 1 ? 4 : 5
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${
                      isChk
                        ? 'bg-violet-500/10 border-violet-500/30'
                        : 'bg-white/3 border-white/8 hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChk}
                      onChange={() => togglePred(p.id)}
                      className="accent-violet-500 shrink-0"
                    />
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${isBuy ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                      {p.decision}
                    </span>
                    <span className="text-sm font-semibold text-white shrink-0">{p.display}</span>
                    <span className="text-xs text-gray-500 flex-1 min-w-0 truncate">
                      Entry {p.entryLow.toFixed(dec)}–{p.entryHigh.toFixed(dec)} · SL {p.stopLoss.toFixed(dec)} · R/R {p.rrRatio}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${outcomeColor(p.outcome)}`}>
                      {outcomeLabel(p.outcome)}
                    </span>
                    <span className="text-[10px] text-gray-600 shrink-0">
                      {new Date(p.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </label>
                )
              })}
            </div>

            {genError && <p className="text-xs text-red-400 mb-3">{genError}</p>}

            <button
              onClick={generateScript}
              disabled={selected.size === 0 || generating}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? 'Generating script…' : `Generate Script (${selected.size} trade${selected.size !== 1 ? 's' : ''})`}
            </button>
          </>
        )}
      </div>

      {/* Existing scripts */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-bold text-white">Trade Scripts</h3>
          <span className="text-xs text-gray-500 ml-auto">
            {scripts.filter(s => s.status === 'approved').length} approved · {scripts.filter(s => s.status === 'draft').length} draft
          </span>
          <button onClick={loadScripts} className="text-gray-500 hover:text-white transition">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingScripts ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading scripts…
          </div>
        ) : scripts.length === 0 ? (
          <div className="bg-[#131722] border border-white/10 rounded-2xl p-8 text-center">
            <Video className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-400 text-sm font-medium">No scripts yet</p>
            <p className="text-xs text-gray-600 mt-1">Select trades above and click "Generate Script" to create one.</p>
          </div>
        ) : (
          scripts.map(script => {
            const isExp     = expanded === script.id
            const isApproved = script.status === 'approved'
            const segs      = script.segments as ScriptSegment[]

            return (
              <div key={script.id} className="bg-[#131722] border border-white/10 rounded-2xl overflow-hidden">
                {/* Script header */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isApproved
                          ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
                          : 'text-gray-400 bg-white/5 border-white/15'
                      }`}>
                        {isApproved ? 'APPROVED' : 'DRAFT'}
                      </span>
                      <span className="text-xs text-gray-600">{segs.length} segments</span>
                    </div>
                    <p className="text-sm font-semibold text-white truncate">{script.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Created {new Date(script.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {script.approvedAt && ` · Approved ${new Date(script.approvedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleApprove(script)}
                      disabled={approving[script.id]}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition ${
                        isApproved
                          ? 'bg-white/5 border border-white/15 text-gray-400 hover:text-white'
                          : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                      }`}
                    >
                      {approving[script.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                      {isApproved ? 'Unapprove' : 'Approve'}
                    </button>
                    <button
                      onClick={() => deleteScript(script.id)}
                      disabled={deleting[script.id]}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition"
                    >
                      {deleting[script.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => setExpanded(isExp ? null : script.id)}
                      className="text-gray-600 hover:text-white transition"
                    >
                      {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Segments */}
                {isExp && (
                  <div className="border-t border-white/8 px-5 py-4 space-y-3">
                    {segs.map((seg, i) => (
                      <div key={seg.id} className="bg-white/3 border border-white/8 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] font-bold text-gray-500 tabular-nums w-5">{i + 1}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${segTypeColor(seg.type)}`}>
                            {seg.type.toUpperCase()}
                          </span>
                          <span className="text-xs font-semibold text-white flex-1 truncate">{seg.headline}</span>
                          <span className="text-[10px] text-gray-600 shrink-0">{seg.duration}s</span>
                          {seg.showChart && (
                            <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded shrink-0">
                              📊 {seg.chartLabel ?? 'Chart'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{seg.narration}</p>
                      </div>
                    ))}

                    {isApproved && (
                      <div className="flex items-center gap-2 pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <p className="text-xs text-emerald-400">
                          This script is live — Video Hub can now fetch and import it to the timeline.
                        </p>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-500 ml-auto shrink-0" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Root Admin Page ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab,            setTab]           = useState<Tab>('overview')
  const [users,          setUsers]         = useState<UserRow[]>([])
  const [supportUnread,  setSupportUnread] = useState(0)
  const [newUsers,       setNewUsers]      = useState(0)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user?.role !== 'admin') router.replace('/')
  }, [session, status, router])

  // Pre-load users so NotifyTab has data even if Users tab was never visited
  useEffect(() => {
    if (!session || session.user?.role !== 'admin') return
    fetch('/api/admin/users')
      .then(r => r.ok ? r.json() : [])
      .then((data: UserRow[]) => { if (Array.isArray(data)) setUsers(data) })
      .catch(() => null)
  }, [session])

  // Poll for unread support tickets every 5 min
  useEffect(() => {
    if (!session || session.user?.role !== 'admin') return
    const fetch_ = () =>
      fetch('/api/admin/support/unread')
        .then(r => r.json())
        .then(d => setSupportUnread(d.count ?? 0))
        .catch(() => null)
    fetch_()
    const id = setInterval(fetch_, 5 * 60_000)
    return () => clearInterval(id)
  }, [session])

  // Poll for new user signups every 2 min
  useEffect(() => {
    if (!session || session.user?.role !== 'admin') return
    const fetch_ = () =>
      fetch('/api/admin/users/new')
        .then(r => r.json())
        .then(d => setNewUsers(d.count ?? 0))
        .catch(() => null)
    fetch_()
    const id = setInterval(fetch_, 2 * 60_000)
    return () => clearInterval(id)
  }, [session])

  // Clear badges when admin opens the relevant tab
  useEffect(() => {
    if (tab === 'support') setSupportUnread(0)
    if (tab === 'users') {
      setNewUsers(0)
      fetch('/api/admin/users/new', { method: 'POST' }).catch(() => null)
    }
  }, [tab])

  if (status === 'loading' || !session || session.user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#080e1a] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    )
  }

  const navItems: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 className="w-4 h-4" />                                                              },
    { id: 'users',    label: 'Users',    icon: <Users className="w-4 h-4" />,          badge: newUsers      > 0 ? newUsers      : undefined },
    { id: 'support',  label: 'Support',  icon: <MessageSquare className="w-4 h-4" />, badge: supportUnread > 0 ? supportUnread : undefined },
    { id: 'notify',   label: 'Notify',   icon: <Mail className="w-4 h-4" />                                                            },
    { id: 'content',  label: 'Content',  icon: <BookOpen className="w-4 h-4" />                                                        },
    { id: 'scripts',  label: 'Scripts',  icon: <Video className="w-4 h-4" />                                                          },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" />                                                        },
  ]

  const brokerLink  = { href: '/admin/broker',  label: 'Broker & Signals', icon: <Shield className="w-4 h-4 text-emerald-400" /> }

  return (
    <div className="min-h-screen bg-[#080e1a] text-white">
      <div className="border-b border-white/10 bg-[#0a0f1e] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4 overflow-x-auto">
          <Link href="/" className="text-gray-500 hover:text-white transition"><Home className="w-4 h-4" /></Link>
          <span className="text-white/20">/</span>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-white">Admin Panel</span>
          </div>
          <div className="flex-1" />
          <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full font-medium">
            Logged in as Admin
          </span>
          <Link href="/" className="text-xs text-gray-500 hover:text-white transition">Exit →</Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row gap-6">
          <aside className="w-48 shrink-0 hidden sm:block">
            <nav className="space-y-1 sticky top-20">
              {navItems.map(item => (
                <button key={item.id} onClick={() => setTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    tab === item.id
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}>
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="min-w-[1.25rem] h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center px-1 animate-pulse">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              ))}
              <div className="pt-2 mt-2 border-t border-white/10 space-y-1">
                <Link href={brokerLink.href}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20">
                  {brokerLink.icon}
                  <span className="flex-1 text-left">{brokerLink.label}</span>
                </Link>
              </div>
            </nav>
          </aside>

          {/* Mobile tab bar */}
          <div className="sm:hidden overflow-x-auto w-full mb-4">
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-max min-w-full">
              {navItems.map(item => (
                <button key={item.id} onClick={() => setTab(item.id)}
                  className={`relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    tab === item.id ? 'bg-[#1D9E75] text-white' : 'text-gray-400 hover:text-white'
                  }`}>
                  {item.icon}
                  {item.label}
                  {item.badge !== undefined && (
                    <span className="ml-0.5 min-w-[1.1rem] h-[1.1rem] rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-0.5 animate-pulse">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              ))}
              <Link href={brokerLink.href}
                className="flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-all">
                {brokerLink.icon}
                {brokerLink.label}
              </Link>
            </div>
          </div>

          <main className="flex-1 min-w-0">
            <div className="mb-6 hidden sm:block">
              <h1 className="text-xl font-black text-white">{navItems.find(n => n.id === tab)?.label}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {tab === 'overview' && 'Site statistics, usage charts, and access overview.'}
                {tab === 'users'    && 'Manage all registered users, roles, passwords, and analysis access.'}
                {tab === 'support'  && 'View customer messages from Aria and reply directly to users.'}
                {tab === 'notify'   && 'Send emails and notifications to users.'}
                {tab === 'content'  && 'Pre-generate and manage lesson audio files.'}
                {tab === 'scripts'  && 'Generate YouTube trade review scripts from FM Trader predictions and approve for Video Hub.'}
                {tab === 'settings' && 'Site configuration and admin credentials.'}
              </p>
            </div>

            {tab === 'overview' && <OverviewTab onTabChange={setTab} />}
            {tab === 'users'    && <UsersTab onUsersLoaded={setUsers} />}
            {tab === 'support'  && <SupportTab />}
            {tab === 'notify'   && <NotifyTab users={users} />}
            {tab === 'content'  && <ContentTab />}
            {tab === 'scripts'  && <ScriptsTab />}
            {tab === 'settings' && <SettingsTab />}
          </main>
        </div>
      </div>
    </div>
  )
}
