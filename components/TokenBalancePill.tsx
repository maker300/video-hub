'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Coins, Plus } from 'lucide-react'

/**
 * Token balance with a top-up link.
 *
 * Renders nothing at all for admins (never charged) and while the balance is
 * still loading, so it cannot flash a misleading "0 tokens" at a user who
 * actually has some. Polls on window focus rather than an interval — the
 * balance only changes when the user runs FM Trader or completes a purchase,
 * and both bring them back to the tab.
 */
export default function TokenBalancePill({ className = '' }: { className?: string }) {
  const [balance, setBalance] = useState<number | null>(null)
  const [exempt,  setExempt]  = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetch('/api/tokens/balance')
        .then(r => (r.ok ? r.json() : null))
        .then(d => { if (d && !cancelled) { setBalance(d.balance); setExempt(!!d.exempt) } })
        .catch(() => { /* informational only — never block the page on this */ })

    load()
    window.addEventListener('focus', load)
    return () => { cancelled = true; window.removeEventListener('focus', load) }
  }, [])

  if (exempt || balance === null) return null

  const low = balance <= 5

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
          low
            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            : 'bg-white/5 text-gray-300 border-white/10'
        }`}
        title="Each FM Trader prediction costs 1 token"
      >
        <Coins className="w-3.5 h-3.5" />
        {balance.toLocaleString()} token{balance === 1 ? '' : 's'}
      </span>
      <Link
        href="/analysis/tokens"
        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300 hover:text-emerald-200 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Top up
      </Link>
    </div>
  )
}
