'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, BookOpen, BarChart2, LineChart, Menu, X, User, LogOut, Settings, ChevronDown, Shield, Bell, TrendingDown, Minus, Mail, Zap } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { getProgress } from '@/lib/progress'
import { totalLessons } from '@/lib/courseData'
import { getNotifications, markAllRead, addNotification, patchNotifications, fireSignalBrowserNotification, firePairBrowserNotification, getSeenSignalIds, markSignalsSeen, getPairSubscriptions, type PriceNotification } from '@/lib/price-alerts'

export default function Navbar() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [mobileOpen,    setMobileOpen]    = useState(false)
  const [dropdownOpen,  setDropdownOpen]  = useState(false)
  const [notifOpen,     setNotifOpen]     = useState(false)
  const [progress,      setProgress]      = useState(0)
  const [notifications, setNotifications] = useState<PriceNotification[]>([])
  const dropdownRef      = useRef<HTMLDivElement>(null)
  const notifDesktopRef  = useRef<HTMLDivElement>(null)
  const notifMobileRef   = useRef<HTMLDivElement>(null)

  function refreshNotifs() {
    setNotifications(
      getNotifications().slice().sort((a, b) => b.triggeredAt - a.triggeredAt)
    )
  }

  useEffect(() => {
    refreshNotifs()
    window.addEventListener('fm-notification-update', refreshNotifs)
    return () => window.removeEventListener('fm-notification-update', refreshNotifs)
  }, [])

  // Single combined poll every 10 min — replaces 3 separate loops to save server CPU
  useEffect(() => {
    if (status !== 'authenticated') return

    const seenUpdatesKey   = 'fm_seen_trade_updates'
    const seenBroadcastKey = 'fm_seen_broadcasts'

    function getSeenUpdateIds(): string[] {
      try { return JSON.parse(localStorage.getItem(seenUpdatesKey) ?? '[]') } catch { return [] }
    }
    function markUpdatesSeen(ids: string[]) {
      const merged = [...new Set([...getSeenUpdateIds(), ...ids])]
      localStorage.setItem(seenUpdatesKey, JSON.stringify(merged.slice(-200)))
    }
    function getSeenBroadcastIds(): string[] {
      try { return JSON.parse(localStorage.getItem(seenBroadcastKey) ?? '[]') } catch { return [] }
    }
    function markBroadcastsSeen(ids: string[]) {
      const merged = [...new Set([...getSeenBroadcastIds(), ...ids])]
      localStorage.setItem(seenBroadcastKey, JSON.stringify(merged.slice(-200)))
    }

    async function syncAll() {
      try {
        const res = await fetch('/api/notifications/all')
        if (!res.ok) return
        const { signals, tradeUpdates, adminNotifications } = await res.json() as {
          signals: Array<{
            id: string; slug: string; display: string; decision: 'BUY' | 'SELL'
            confidence: number; entryLow: number; entryHigh: number
            priceAtSignal: number; rrRatio: string; createdAt: string
          }>
          tradeUpdates: Array<{
            id: string; predictionId: string; slug: string; display: string
            type: string; message: string; currentPrice: number
            suggestedSL: number | null; read: boolean; createdAt: string
          }>
          adminNotifications: Array<{
            id: string; subject: string; message: string; linkUrl?: string | null; read: boolean; createdAt: string
          }>
        }

        // Signals
        const seenSigs    = getSeenSignalIds()
        const freshSigs   = signals.filter(s => !seenSigs.includes(s.id))
        const subscribedPairs = getPairSubscriptions()
        for (const s of freshSigs) {
          addNotification({
            id:          `sig_${s.id}`,
            slug:        s.slug,
            display:     s.display,
            decision:    s.decision,
            price:       s.priceAtSignal,
            entryLow:    s.entryLow,
            entryHigh:   s.entryHigh,
            triggeredAt: new Date(s.createdAt).getTime(),
            read:        false,
            type:        'signal',
            confidence:  s.confidence,
            rrRatio:     s.rrRatio,
          })
          if (subscribedPairs.includes(s.slug)) {
            firePairBrowserNotification(s.display, s.decision, s.confidence)
          }
        }
        if (freshSigs.length > 0) markSignalsSeen(freshSigs.map(s => s.id))

        // Trade updates
        const seenUpdates  = getSeenUpdateIds()
        const freshUpdates = tradeUpdates.filter(u => !u.read && !seenUpdates.includes(u.id))
        for (const u of freshUpdates) {
          addNotification({
            id:          `tu_${u.id}`,
            slug:        u.slug,
            display:     u.display,
            decision:    'BUY',
            price:       u.currentPrice,
            entryLow:    u.currentPrice,
            entryHigh:   u.currentPrice,
            triggeredAt: new Date(u.createdAt).getTime(),
            read:        false,
            type:        'trade_update',
            rrRatio:     `${u.type}||${u.message}`,
          })
        }
        if (freshUpdates.length > 0) markUpdatesSeen(freshUpdates.map(u => u.id))

        // Admin broadcast notifications
        const seenBC  = getSeenBroadcastIds()
        const freshBC = adminNotifications.filter(n => !n.read && !seenBC.includes(n.id))
        for (const n of freshBC) {
          addNotification({
            id:          `bc_${n.id}`,
            slug:        '',
            display:     n.subject,
            decision:    'BUY',
            price:       0, entryLow: 0, entryHigh: 0,
            triggeredAt: new Date(n.createdAt).getTime(),
            read:        false,
            type:        'broadcast',
            rrRatio:     n.message,
            linkUrl:     n.linkUrl ?? undefined,
          })
        }
        if (freshBC.length > 0) markBroadcastsSeen(freshBC.map(n => n.id))

        // Backfill linkUrl on already-stored broadcasts. Older notifications
        // stored before the linkUrl feature existed had no link — this brings
        // them in line with the latest server data so tapping them navigates.
        patchNotifications(
          adminNotifications
            .filter(n => n.linkUrl)
            .map(n => ({ id: `bc_${n.id}`, linkUrl: n.linkUrl })),
        )

      } catch { /* non-critical */ }
    }

    syncAll()
    const t = setInterval(syncAll, 10 * 60 * 1000)
    return () => clearInterval(t)
  }, [status])

  const unread = notifications.filter(n => !n.read).length

  useEffect(() => {
    const p = getProgress()
    const pct = totalLessons > 0 ? Math.round((p.completedLessons.length / totalLessons) * 100) : 0
    setProgress(pct)
  }, [])

  // Close dropdowns on outside click/touch (mousedown covers desktop, touchstart covers iOS)
  useEffect(() => {
    function handler(e: MouseEvent | TouchEvent) {
      const target = ('touches' in e ? e.touches[0]?.target : e.target) as Node | null
      if (!target) return
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setDropdownOpen(false)
      }
      const inDesktop = notifDesktopRef.current?.contains(target)
      const inMobile  = notifMobileRef.current?.contains(target)
      if (!inDesktop && !inMobile) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler as EventListener, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler as EventListener)
    }
  }, [])

  const avatarLetter = session?.user?.name?.[0]?.toUpperCase()
    ?? session?.user?.email?.[0]?.toUpperCase()
    ?? '?'

  return (
    <nav className="sticky top-0 z-50 bg-[#0a0f1a]/95 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <TrendingUp className="w-7 h-7 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
            <span className="text-white font-bold text-lg tracking-tight">
              Forex<span className="text-emerald-400">Mastery</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/course" className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors text-sm font-medium">
              <BookOpen className="w-4 h-4" />
              Course
            </Link>
            {session && (
              <Link href="/profile" className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors text-sm font-medium">
                <BarChart2 className="w-4 h-4" />
                Progress
              </Link>
            )}
            {session && (
              <Link href="/analysis" className="flex items-center gap-1.5 text-gray-300 hover:text-white transition-colors text-sm font-medium">
                <LineChart className="w-4 h-4" />
                Analysis
              </Link>
            )}
            {(session?.user?.role === 'team' || session?.user?.role === 'admin') && (
              <Link href="/analysis/live-trades" className="flex items-center gap-1.5 text-amber-300 hover:text-amber-200 transition-colors text-sm font-medium">
                <Zap className="w-4 h-4" />
                Live Trade
              </Link>
            )}
            {session?.user?.role === 'admin' && (
              <Link href="/admin" className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors text-sm font-medium">
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">

            {/* Notification bell */}
            {session && (
              <div className="relative" ref={notifDesktopRef}>
                <button
                  onClick={() => {
                    const opening = !notifOpen
                    setNotifOpen(opening)
                    if (opening && unread > 0) { markAllRead(); refreshNotifs() }
                  }}
                  className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-0.5 animate-pulse">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-[#131722] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                      <p className="text-sm font-bold text-white">Notifications</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</span>
                        <button onClick={() => setNotifOpen(false)} className="text-gray-500 hover:text-white transition p-0.5" aria-label="Close"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <Bell className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No notifications yet</p>
                          <p className="text-xs text-gray-600 mt-1">Scanner signals and price alerts will appear here.</p>
                        </div>
                      ) : (
                        notifications.map(n => {
                          const fmtP = (p: number) => p >= 100 ? p.toFixed(2) : p.toFixed(5)
                          const ago = (ms: number) => {
                            const s = Math.floor((Date.now() - ms) / 1000)
                            if (s < 60) return `${s}s ago`
                            if (s < 3600) return `${Math.floor(s / 60)}m ago`
                            return `${Math.floor(s / 3600)}h ago`
                          }
                          const isSignal      = n.type === 'signal'
                          const isSub         = n.type === 'subscription'
                          const isTradeUpdate = n.type === 'trade_update'
                          const isBroadcast   = n.type === 'broadcast'
                          const [tuType, tuMsg] = isTradeUpdate && n.rrRatio ? n.rrRatio.split('||') : ['', '']
                          const tuLabel = tuType === 'cancel' ? '⚠️ Cancel Advisory'
                            : tuType === 'move_sl_breakeven' ? '🛡️ Move SL to Break Even'
                            : tuType === 'trail_sl' ? '📈 Trail SL into Profit'
                            : tuType === 'tp1_hit' ? '🎯 TP1 Hit'
                            : tuType === 'tp2_hit' ? '🎯 TP2 Hit'
                            : tuType === 'tp3_hit' ? '🏆 TP3 Hit — Full Target'
                            : tuType === 'sl_hit'  ? '🛑 Stop Loss Hit'
                            : tuType === 'expired' ? '⏱ Expired'
                            : 'Trade Advisory'
                          return (
                            <button
                              key={n.id}
                              onClick={() => {
                                setNotifOpen(false)
                                if (isSub) return
                                if (isBroadcast) { if (n.linkUrl) router.push(n.linkUrl); return }
                                router.push(isTradeUpdate ? `/analysis/${n.slug}?fmtrader=1&history=1` : `/analysis/${n.slug}?fmtrader=1`)
                              }}
                              className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/10 border-b border-white/5 transition"
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isSub ? 'bg-blue-500/20' : isTradeUpdate ? 'bg-amber-500/20' : isBroadcast ? 'bg-violet-500/20' : n.decision === 'BUY' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                                {isSub
                                  ? <Bell className="w-3.5 h-3.5 text-blue-400" />
                                  : isTradeUpdate
                                    ? <Bell className="w-3.5 h-3.5 text-amber-400" />
                                    : isBroadcast
                                      ? <Mail className="w-3.5 h-3.5 text-violet-400" />
                                      : n.decision === 'BUY'
                                        ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                        : <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                {isSub ? (
                                  <>
                                    <p className="text-sm font-semibold text-white">Subscribed to {n.display}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">You&apos;ll receive a notification every time there&apos;s a new BUY or SELL signal on this pair.</p>
                                    <p className="text-[10px] text-blue-400/80 mt-1">You can unsubscribe anytime from the FM Trader bell icon.</p>
                                  </>
                                ) : isBroadcast ? (
                                  <>
                                    <p className="text-sm font-semibold text-white">{n.display}</p>
                                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-3">{n.rrRatio}</p>
                                    <p className="text-[10px] text-violet-400/80 mt-1">Message from ForexMastery</p>
                                  </>
                                ) : isTradeUpdate ? (
                                  <>
                                    <p className="text-sm font-semibold text-white">{tuLabel} — {n.display}</p>
                                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{tuMsg}</p>
                                    <p className="text-[10px] text-amber-400/80 mt-1">FM Trader advisory · Tap to open analysis</p>
                                  </>
                                ) : isSignal ? (
                                  <>
                                    <p className="text-sm font-semibold text-white">{n.display} — {n.decision} Signal</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      Confidence <span className="text-emerald-400 font-medium">{n.confidence}%</span> · Entry {fmtP(n.entryLow)}–{fmtP(n.entryHigh)}
                                    </p>
                                    <p className="text-[10px] text-[#1D9E75]/80 mt-1">FM Trader signal · Tap to open analysis</p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-sm font-semibold text-white">{n.display} — {n.decision} Zone</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      Price <span className="text-white font-medium">{fmtP(n.price)}</span> entered entry zone {fmtP(n.entryLow)}–{fmtP(n.entryHigh)}
                                    </p>
                                    <p className="text-[10px] text-amber-400/80 mt-1">Proceed with caution · Apply risk management</p>
                                  </>
                                )}
                                <p className="text-[10px] text-gray-600 mt-0.5">{ago(n.triggeredAt)}</p>
                              </div>
                              <Minus className="w-3 h-3 text-gray-600 shrink-0 mt-1 rotate-90" />
                            </button>
                          )
                        })
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="px-4 py-2.5 border-t border-white/10 text-center">
                        <p className="text-[10px] text-gray-600">Tap a notification to open the pair</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Progress pill */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
              <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 font-medium">{progress}%</span>
            </div>

            {/* Auth state */}
            {status === 'loading' ? (
              <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
            ) : session ? (
              /* Avatar dropdown */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(v => !v)}
                  className="flex items-center gap-1.5 group"
                >
                  {session.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt={session.user.name ?? 'avatar'}
                      className="w-8 h-8 rounded-full border-2 border-white/10 group-hover:border-emerald-400/50 transition"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#1D9E75] flex items-center justify-center text-white text-sm font-bold border-2 border-white/10 group-hover:border-emerald-400/50 transition">
                      {avatarLetter}
                    </div>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-[#131722] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-sm font-semibold text-white truncate">{session.user?.name ?? 'Trader'}</p>
                      <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition"
                      >
                        <User className="w-4 h-4" />
                        Profile &amp; Progress
                      </Link>
                      <Link
                        href="/course"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition"
                      >
                        <BookOpen className="w-4 h-4" />
                        My Course
                      </Link>
                      <Link
                        href="/analysis"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition"
                      >
                        <LineChart className="w-4 h-4" />
                        Market Analysis
                      </Link>
                      <Link
                        href="/profile#settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                      {session.user?.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition"
                        >
                          <Shield className="w-4 h-4" />
                          Admin Panel
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-white/10 py-1">
                      <button
                        onClick={() => { setDropdownOpen(false); signOut({ callbackUrl: '/' }) }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Logged-out buttons */
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/signin"
                  className="px-4 py-1.5 text-sm text-gray-300 hover:text-white transition font-medium"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-1.5 rounded-lg bg-[#1D9E75] hover:bg-[#17856A] text-white text-sm font-semibold transition"
                >
                  Get started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: show auth buttons inline when logged out, bell + hamburger when logged in */}
          <div className="flex md:hidden items-center gap-2">
            {status !== 'loading' && !session && (
              <>
                <Link
                  href="/auth/signin"
                  className="text-sm text-gray-300 font-medium px-3 py-1.5 rounded-lg hover:bg-white/5 transition"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="text-sm font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
                >
                  Sign up
                </Link>
              </>
            )}
            {session && (
              <>
                {/* Bell — mobile */}
                <div className="relative" ref={notifMobileRef}>
                  <button
                    onClick={() => {
                      const opening = !notifOpen
                      setNotifOpen(opening)
                      setMobileOpen(false)
                      if (opening && unread > 0) { markAllRead(); refreshNotifs() }
                    }}
                    className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white transition"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-0.5 animate-pulse">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-[#131722] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                        <p className="text-sm font-bold text-white">Notifications</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500">{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</span>
                          <button onClick={() => setNotifOpen(false)} className="text-gray-500 hover:text-white transition p-0.5" aria-label="Close"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <Bell className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No notifications yet</p>
                            <p className="text-xs text-gray-600 mt-1">Scanner signals and price alerts will appear here.</p>
                          </div>
                        ) : (
                          notifications.map(n => {
                            const fmtP = (p: number) => p >= 100 ? p.toFixed(2) : p.toFixed(5)
                            const ago = (ms: number) => {
                              const s = Math.floor((Date.now() - ms) / 1000)
                              if (s < 60) return `${s}s ago`
                              if (s < 3600) return `${Math.floor(s / 60)}m ago`
                              return `${Math.floor(s / 3600)}h ago`
                            }
                            const isSignal      = n.type === 'signal'
                            const isSub         = n.type === 'subscription'
                            const isTradeUpdate = n.type === 'trade_update'
                            const isBroadcast   = n.type === 'broadcast'
                            const [tuType, tuMsg] = isTradeUpdate && n.rrRatio ? n.rrRatio.split('||') : ['', '']
                            const tuLabel = tuType === 'cancel' ? '⚠️ Cancel Advisory'
                              : tuType === 'move_sl_breakeven' ? '🛡️ Move SL to Break Even'
                              : tuType === 'trail_sl' ? '📈 Trail SL into Profit'
                              : tuType === 'tp1_hit' ? '🎯 TP1 Hit'
                              : tuType === 'tp2_hit' ? '🎯 TP2 Hit'
                              : tuType === 'tp3_hit' ? '🏆 TP3 Hit — Full Target'
                              : tuType === 'sl_hit'  ? '🛑 Stop Loss Hit'
                              : tuType === 'expired' ? '⏱ Expired'
                              : 'Trade Advisory'
                            return (
                              <button
                                key={n.id}
                                onClick={() => {
                                setNotifOpen(false)
                                if (isSub) return
                                if (isBroadcast) { if (n.linkUrl) router.push(n.linkUrl); return }
                                router.push(isTradeUpdate ? `/analysis/${n.slug}?fmtrader=1&history=1` : `/analysis/${n.slug}?fmtrader=1`)
                              }}
                                className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/10 border-b border-white/5 transition"
                              >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isSub ? 'bg-blue-500/20' : isTradeUpdate ? 'bg-amber-500/20' : isBroadcast ? 'bg-violet-500/20' : n.decision === 'BUY' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                                  {isSub
                                    ? <Bell className="w-3.5 h-3.5 text-blue-400" />
                                    : isTradeUpdate
                                      ? <Bell className="w-3.5 h-3.5 text-amber-400" />
                                      : isBroadcast
                                        ? <Mail className="w-3.5 h-3.5 text-violet-400" />
                                        : n.decision === 'BUY'
                                          ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                          : <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                                  }
                                </div>
                                <div className="flex-1 min-w-0">
                                  {isSub ? (
                                    <>
                                      <p className="text-sm font-semibold text-white">Subscribed to {n.display}</p>
                                      <p className="text-xs text-gray-400 mt-0.5">You&apos;ll receive a notification every time there&apos;s a new BUY or SELL signal on this pair.</p>
                                      <p className="text-[10px] text-blue-400/80 mt-1">You can unsubscribe anytime from the FM Trader bell icon.</p>
                                    </>
                                  ) : isBroadcast ? (
                                    <>
                                      <p className="text-sm font-semibold text-white">{n.display}</p>
                                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-3">{n.rrRatio}</p>
                                      <p className="text-[10px] text-violet-400/80 mt-1">Message from ForexMastery</p>
                                    </>
                                  ) : isTradeUpdate ? (
                                    <>
                                      <p className="text-sm font-semibold text-white">{tuLabel} — {n.display}</p>
                                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{tuMsg}</p>
                                      <p className="text-[10px] text-amber-400/80 mt-1">FM Trader advisory · Tap to open analysis</p>
                                    </>
                                  ) : isSignal ? (
                                    <>
                                      <p className="text-sm font-semibold text-white">{n.display} — {n.decision} Signal</p>
                                      <p className="text-xs text-gray-400 mt-0.5">
                                        Confidence <span className="text-emerald-400 font-medium">{n.confidence}%</span> · Entry {fmtP(n.entryLow)}–{fmtP(n.entryHigh)}
                                      </p>
                                      <p className="text-[10px] text-[#1D9E75]/80 mt-1">FM Trader signal · Tap to open analysis</p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-sm font-semibold text-white">{n.display} — {n.decision} Zone</p>
                                      <p className="text-xs text-gray-400 mt-0.5">
                                        Price <span className="text-white font-medium">{fmtP(n.price)}</span> entered entry zone {fmtP(n.entryLow)}–{fmtP(n.entryHigh)}
                                      </p>
                                      <p className="text-[10px] text-amber-400/80 mt-1">Proceed with caution · Apply risk management</p>
                                    </>
                                  )}
                                  <p className="text-[10px] text-gray-600 mt-0.5">{ago(n.triggeredAt)}</p>
                                </div>
                                <Minus className="w-3 h-3 text-gray-600 shrink-0 mt-1 rotate-90" />
                              </button>
                            )
                          })
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <div className="px-4 py-2.5 border-t border-white/10 text-center">
                          <p className="text-[10px] text-gray-600">Tap a notification to open the pair</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  className="text-gray-300 hover:text-white p-1"
                  onClick={() => { setMobileOpen(!mobileOpen); setNotifOpen(false) }}
                  aria-label="Toggle menu"
                >
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-white/10 space-y-3">
            <Link
              href="/course"
              className="flex items-center gap-2 text-gray-300 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all"
              onClick={() => setMobileOpen(false)}
            >
              <BookOpen className="w-4 h-4" />
              <span className="text-sm font-medium">Course</span>
            </Link>

            {session && (
              <Link
                href="/profile"
                className="flex items-center gap-2 text-gray-300 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all"
                onClick={() => setMobileOpen(false)}
              >
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Profile</span>
              </Link>
            )}
            {session && (
              <Link
                href="/analysis"
                className="flex items-center gap-2 text-gray-300 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all"
                onClick={() => setMobileOpen(false)}
              >
                <LineChart className="w-4 h-4" />
                <span className="text-sm font-medium">Analysis</span>
              </Link>
            )}
            {(session?.user?.role === 'team' || session?.user?.role === 'admin') && (
              <Link
                href="/analysis/live-trades"
                className="flex items-center gap-2 text-amber-300 hover:text-amber-200 px-2 py-1.5 rounded-lg hover:bg-amber-500/10 transition-all"
                onClick={() => setMobileOpen(false)}
              >
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">Live Trade</span>
              </Link>
            )}
            {session?.user?.role === 'admin' && (
              <Link
                href="/admin"
                className="flex items-center gap-2 text-amber-400 hover:text-amber-300 px-2 py-1.5 rounded-lg hover:bg-amber-500/10 transition-all"
                onClick={() => setMobileOpen(false)}
              >
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">Admin Panel</span>
              </Link>
            )}

            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-gray-400">{progress}% complete</span>
            </div>

            {session ? (
              <button
                onClick={() => { setMobileOpen(false); signOut({ callbackUrl: '/' }) }}
                className="flex items-center gap-2 w-full text-red-400 px-2 py-1.5 rounded-lg hover:bg-red-500/10 transition-all text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href="/auth/signin"
                  className="text-center py-2 rounded-lg border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/5 transition"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="text-center py-2 rounded-lg bg-[#1D9E75] text-white text-sm font-semibold hover:bg-[#17856A] transition"
                  onClick={() => setMobileOpen(false)}
                >
                  Get started free
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
