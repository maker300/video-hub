// Public endpoint — returns the top 5 most recent high-quality signals for display
// on the analysis page. Reads from SignalAlert table (populated by hourly scanner).
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SLUG_DISPLAY: Record<string, { display: string; category: string }> = {
  'eur-usd':   { display: 'EUR/USD',    category: 'forex'     },
  'gbp-usd':   { display: 'GBP/USD',    category: 'forex'     },
  'usd-jpy':   { display: 'USD/JPY',    category: 'forex'     },
  'aud-usd':   { display: 'AUD/USD',    category: 'forex'     },
  'usd-cad':   { display: 'USD/CAD',    category: 'forex'     },
  'usd-chf':   { display: 'USD/CHF',    category: 'forex'     },
  'nzd-usd':   { display: 'NZD/USD',    category: 'forex'     },
  'eur-gbp':   { display: 'EUR/GBP',    category: 'forex'     },
  'gbp-jpy':   { display: 'GBP/JPY',    category: 'forex'     },
  'eur-jpy':   { display: 'EUR/JPY',    category: 'forex'     },
  'xau-usd':   { display: 'XAU/USD',    category: 'commodity' },
  'xag-usd':   { display: 'XAG/USD',    category: 'commodity' },
  'wti-usd':   { display: 'WTI/USD',    category: 'commodity' },
  'nas-100':   { display: 'NAS 100',    category: 'indices'   },
  'sp-500':    { display: 'S&P 500',    category: 'indices'   },
  'dj-30':     { display: 'DJ 30',      category: 'indices'   },
  'btc-usd':   { display: 'BTC/USD',    category: 'crypto'    },
  'eth-usd':   { display: 'ETH/USD',    category: 'crypto'    },
  'sol-usd':   { display: 'SOL/USD',    category: 'crypto'    },
  'xrp-usd':   { display: 'XRP/USD',    category: 'crypto'    },
  'bnb-usd':   { display: 'BNB/USD',    category: 'crypto'    },
  'apple':     { display: 'APPLE',      category: 'stocks'    },
  'microsoft': { display: 'MICROSOFT',  category: 'stocks'    },
  'google':    { display: 'GOOGLE',     category: 'stocks'    },
  'tesla':     { display: 'TESLA',      category: 'stocks'    },
}

export async function GET() {
  try {
    // Fetch up to 50 rows sorted best-first, then deduplicate by slug so the
    // same instrument never appears twice regardless of how many scan buckets
    // overlap in the window (e.g. sp-500 scanned at 07:59 and again at 08:01).
    const since = new Date(Date.now() - 5 * 60 * 60 * 1000)
    const rows = await prisma.signalAlert.findMany({
      where:   { sentAt: { gte: since } },
      orderBy: [{ confidence: 'desc' }, { confluence: 'desc' }],
      take:    50,
    })

    const seen = new Set<string>()
    const alerts = rows.filter(a => {
      if (seen.has(a.slug)) return false
      seen.add(a.slug)
      return true
    }).slice(0, 5)

    const signals = alerts.map(a => ({
      slug:       a.slug,
      display:    SLUG_DISPLAY[a.slug]?.display    ?? a.slug.toUpperCase(),
      category:   SLUG_DISPLAY[a.slug]?.category   ?? 'forex',
      decision:   a.decision,
      confidence: a.confidence,
      confluence: a.confluence,
      sentAt:     a.sentAt.toISOString(),
    }))

    return NextResponse.json({ signals, updatedAt: Date.now() })
  } catch {
    // Table may not exist yet — return empty list gracefully
    return NextResponse.json({ signals: [], updatedAt: Date.now() })
  }
}
