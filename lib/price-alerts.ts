// Price alert types and localStorage helpers — client-side only.

export interface PriceAlert {
  id:        string
  slug:      string    // e.g. 'eur-usd'
  display:   string    // e.g. 'EUR/USD'
  decision:  'BUY' | 'SELL'
  entryLow:  number
  entryHigh: number
  createdAt: number
  active:    boolean
}

export interface PriceNotification {
  id:          string
  slug:        string
  display:     string
  decision:    'BUY' | 'SELL'
  price:       number
  entryLow:    number
  entryHigh:   number
  triggeredAt: number
  read:        boolean
  readAt?:     number
  type?:       'price' | 'signal' | 'subscription' | 'trade_update' | 'broadcast'
  confidence?: number
  rrRatio?:    string
  // Optional deep-link target — when set, tapping the notification routes here.
  // Used by broadcast notifications (e.g. live-trade lifecycle alerts) to
  // jump straight to /analysis/live-trades.
  linkUrl?:    string
}

const ALERTS_KEY = 'fm_price_alerts'
const NOTIFS_KEY  = 'fm_notifications'

// ── Alerts ────────────────────────────────────────────────────────────────────

export function getAlerts(): PriceAlert[] {
  try { return JSON.parse(localStorage.getItem(ALERTS_KEY) ?? '[]') }
  catch { return [] }
}

function saveAlerts(alerts: PriceAlert[]) {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts))
}

export function hasActiveAlert(slug: string): boolean {
  return getAlerts().some(a => a.slug === slug && a.active)
}

/** Toggle alert on/off. Returns true if now active, false if removed. */
export function toggleAlert(
  slug: string, display: string,
  decision: 'BUY' | 'SELL',
  entryLow: number, entryHigh: number,
): boolean {
  const alerts = getAlerts()
  const idx    = alerts.findIndex(a => a.slug === slug && a.active)
  if (idx !== -1) {
    alerts.splice(idx, 1)
    saveAlerts(alerts)
    return false
  }
  alerts.push({ id: `${slug}_${Date.now()}`, slug, display, decision, entryLow, entryHigh, createdAt: Date.now(), active: true })
  saveAlerts(alerts)
  return true
}

/** Deactivate an alert after it fires (so it only fires once per zone entry). */
export function deactivateAlert(id: string) {
  const alerts = getAlerts()
  const a      = alerts.find(a => a.id === id)
  if (a) { a.active = false; saveAlerts(alerts) }
}

// ── Notifications ─────────────────────────────────────────────────────────────

const FIVE_HOURS = 5 * 60 * 60 * 1000

function ttl(n: PriceNotification) {
  return FIVE_HOURS   // signals and price alerts both expire after 5 h
}

export function getNotifications(): PriceNotification[] {
  try {
    const raw: PriceNotification[] = JSON.parse(localStorage.getItem(NOTIFS_KEY) ?? '[]')
    const now = Date.now()
    const kept = raw.filter(n => (now - n.triggeredAt) < ttl(n))
    if (kept.length !== raw.length) {
      localStorage.setItem(NOTIFS_KEY, JSON.stringify(kept))
    }
    return kept.slice(-50)
  } catch { return [] }
}

function playDingSound() {
  try {
    const ctx = new (window.AudioContext ?? (window as unknown as Record<string, typeof AudioContext>)['webkitAudioContext'])()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    // Two-tone ding: C6 → E6
    osc.frequency.setValueAtTime(1047, ctx.currentTime)
    osc.frequency.setValueAtTime(1319, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.7)
  } catch { /* silently ignore — AudioContext may be blocked before user gesture */ }
}

export function addNotification(notif: PriceNotification) {
  const list = getNotifications()
  list.push(notif)
  localStorage.setItem(NOTIFS_KEY, JSON.stringify(list))
  playDingSound()
  window.dispatchEvent(new CustomEvent('fm-notification-update'))
}

export function markAllRead() {
  const now  = Date.now()
  const list = getNotifications().map(n =>
    n.read ? n : { ...n, read: true, readAt: now }
  )
  localStorage.setItem(NOTIFS_KEY, JSON.stringify(list))
  window.dispatchEvent(new CustomEvent('fm-notification-update'))
}

export function getUnreadCount(): number {
  return getNotifications().filter(n => !n.read).length
}

// ── Browser notification permission ───────────────────────────────────────────

/** Returns true if browser push notifications are supported on this device. */
export function isBrowserNotifSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

/**
 * Request browser push permission.
 * Always resolves — never throws.
 * Returns false silently on iOS Safari (Notification API not available).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isBrowserNotifSupported()) return false
  if (Notification.permission === 'granted') return true
  try {
    const perm = await Notification.requestPermission()
    return perm === 'granted'
  } catch {
    return false
  }
}

/**
 * Fire a browser push notification if permission is granted.
 * On mobile (iOS) where push API is absent, this is a no-op — the caller
 * should always call addNotification() so the in-app bell catches it.
 */
export function fireBrowserNotification(display: string, decision: 'BUY' | 'SELL', price: string) {
  if (!isBrowserNotifSupported()) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(`FM Trader Alert — ${display}`, {
      body: `Price ${price} is within the ${decision} entry zone. Proceed with caution & apply risk management.`,
      icon: '/favicon.ico',
    })
  } catch { /* silently ignore */ }
}

export function fireSignalBrowserNotification(display: string, decision: 'BUY' | 'SELL', confidence: number) {
  if (!isBrowserNotifSupported()) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(`FM Trader Signal — ${decision} ${display}`, {
      body: `New scanner signal · Confidence ${confidence}% · Tap to open FM Trader`,
      icon: '/favicon.ico',
    })
  } catch { /* silently ignore */ }
}

// ── Seen-signal tracking (prevents re-injecting the same signal on re-poll) ───

const SEEN_SIGNALS_KEY = 'fm_seen_signals'

export function getSeenSignalIds(): string[] {
  try { return JSON.parse(localStorage.getItem(SEEN_SIGNALS_KEY) ?? '[]') }
  catch { return [] }
}

export function markSignalsSeen(ids: string[]) {
  const merged = [...new Set([...getSeenSignalIds(), ...ids])]
  localStorage.setItem(SEEN_SIGNALS_KEY, JSON.stringify(merged.slice(-200)))
}

// ── Pair subscriptions ────────────────────────────────────────────────────────
// When subscribed to a pair, every new BUY/SELL signal for that pair fires a
// browser push notification (not just price-zone entry).

const PAIR_SUBS_KEY = 'fm_pair_subscriptions'

export function getPairSubscriptions(): string[] {
  try { return JSON.parse(localStorage.getItem(PAIR_SUBS_KEY) ?? '[]') }
  catch { return [] }
}

export function isPairSubscribed(slug: string): boolean {
  return getPairSubscriptions().includes(slug)
}

/**
 * Toggle subscription for a pair.
 * Returns true if now subscribed, false if unsubscribed.
 */
export function togglePairSubscription(slug: string): boolean {
  const subs = getPairSubscriptions()
  const idx  = subs.indexOf(slug)
  if (idx !== -1) {
    subs.splice(idx, 1)
    localStorage.setItem(PAIR_SUBS_KEY, JSON.stringify(subs))
    return false
  }
  subs.push(slug)
  localStorage.setItem(PAIR_SUBS_KEY, JSON.stringify(subs))
  return true
}

export function firePairBrowserNotification(display: string, decision: 'BUY' | 'SELL', confidence: number) {
  if (!isBrowserNotifSupported()) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(`📌 ${decision} ${display} — Subscribed Pair Alert`, {
      body:    `New ${decision} signal · Confidence ${confidence}% · Tap to open FM Trader`,
      icon:    '/favicon.ico',
      tag:     `pair-${display}-${Date.now()}`,
      requireInteraction: true,
    })
  } catch { /* silently ignore */ }
}
