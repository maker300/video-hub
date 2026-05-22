// Hourly scanner: finds top high-confidence signals, creates pending trades, sends Telegram alert
// Filter: confidence >= 50 AND confluenceScore >= 45, top 5 by combined score
// Each qualifying signal creates a BrokerTrade record (status: pending) with 55-min expiry
// Telegram message includes a direct link to /admin/broker to approve or reject
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTelegramMessage } from '@/lib/telegram'
import { sendBulkEmail } from '@/lib/email'
import { buildSignalEmail, buildSignalText } from '@/lib/email-templates'
import { calcLotSize, SLUG_TO_MT4 } from '@/lib/metaapi'
import type { FMTraderRequest, FMTraderResponse, SessionSlotId } from '@/lib/fm-trader-types'
import { runAnalysis } from '@/app/api/fm-trader/route'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Crypto trades 24/7 — scanned every day including weekends
const CRYPTO_SLUGS = ['btc-usd', 'eth-usd', 'sol-usd', 'xrp-usd', 'bnb-usd']

// Market-hours instruments — forex, commodities, indices (weekdays only)
// Stocks removed: low relevance for forex/macro traders + high CPU cost per scan
const MARKET_SLUGS = [
  'eur-usd', 'gbp-usd', 'usd-jpy', 'gbp-jpy', 'aud-usd', 'eur-jpy', 'usd-cad', 'usd-chf', 'nzd-usd', 'eur-gbp',
  'xau-usd', 'xag-usd', 'wti-usd',
  'nas-100', 'sp-500', 'dj-30',
]

function dpFmt(price: number) {
  if (price >= 10000) return 2
  if (price >= 100)   return 2
  if (price >= 1)     return 4
  return 5
}
function fmt(n: number, dec: number) {
  if (!n || !isFinite(n)) return '—'
  return n.toFixed(dec)
}

function sessionName(utcHour: number): string {
  if (utcHour >= 6  && utcHour < 8)  return 'London Pre-Open'
  if (utcHour >= 8  && utcHour < 12) return 'London Session'
  if (utcHour >= 12 && utcHour < 17) return 'London/NY Overlap'
  if (utcHour >= 17 && utcHour < 21) return 'NY Session'
  return 'Low-Liquidity Window'
}

interface ScanResult {
  slug:     string
  display:  string
  analysis: FMTraderResponse
  price:    number
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET ?? 'dev'
  const auth = req.headers.get('authorization')

  // Accept either cron secret (Vercel/cron-job.org) or admin session
  if (auth !== `Bearer ${cronSecret}`) {
    const { getAdminSession } = await import('@/lib/adminAuth')
    const { isAdmin } = await getAdminSession()
    if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now      = new Date()
  const utcHour  = now.getUTCHours()
  const utcDay   = now.getUTCDay()
  const isWeekend   = utcDay === 0 || utcDay === 6
  const inMarketHrs = !isWeekend && utcHour >= 6 && utcHour <= 21

  // Crypto scanned 24/7; forex/indices/stocks only on weekdays 06-21 UTC
  const slugsToScan = inMarketHrs
    ? [...CRYPTO_SLUGS, ...MARKET_SLUGS]
    : isWeekend || utcHour < 6 || utcHour > 21
      ? CRYPTO_SLUGS
      : CRYPTO_SLUGS

  const slotId = String(utcHour).padStart(2, '0') as SessionSlotId
  const base   = (process.env.NEXTAUTH_URL?.replace(/\/$/, ''))
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  // Scan all instruments in parallel — runAnalysis runs in-process (no HTTP overhead)
  const rawResults = await Promise.allSettled(
    slugsToScan.map(async (slug): Promise<ScanResult> => {
      const mdRes = await fetch(`${base}/api/market-data/${slug}`, {
        headers: { 'x-cron-secret': cronSecret },
        signal:  AbortSignal.timeout(20_000),
      })
      if (!mdRes.ok) throw new Error(`Market data ${slug}: ${mdRes.status}`)
      const data = await mdRes.json() as FMTraderRequest

      const analysis = runAnalysis({ ...data, sessionSlot: slotId })

      return { slug, display: data.display, analysis, price: data.price }
    })
  )

  const failedFetches = rawResults
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason?.message ?? String(r.reason))

  // All fulfilled results sorted by combined score — included in every response
  // so cron-job.org history shows exactly what each instrument scored this run.
  const allScores = rawResults
    .filter((r): r is PromiseFulfilledResult<ScanResult> => r.status === 'fulfilled')
    .map(r => r.value)
    .sort((a, b) =>
      (b.analysis.confidence + (b.analysis.confluenceScore ?? 0)) -
      (a.analysis.confidence + (a.analysis.confluenceScore ?? 0))
    )
    .map(({ slug, display, analysis }) => ({
      slug,
      display,
      decision:   analysis.decision,
      confidence: analysis.confidence,
      confluence: analysis.confluenceScore ?? 0,
      pass:       analysis.decision !== 'NO TRADE' && analysis.confidence >= 50 && (analysis.confluenceScore ?? 0) >= 45,
    }))

  // Filter: decision ≠ NO TRADE, confidence ≥ 50, confluence ≥ 45
  // Dedup by slug so the highest-scoring result per instrument wins,
  // then cap at 5 — no instrument appears twice in the same roll.
  const seenSlugs = new Set<string>()
  const qualified = allScores
    .filter(s => s.pass)
    .filter(s => {
      if (seenSlugs.has(s.slug)) return false
      seenSlugs.add(s.slug)
      return true
    })
    .slice(0, 5)
    .map(s => rawResults
      .filter((r): r is PromiseFulfilledResult<ScanResult> => r.status === 'fulfilled')
      .map(r => r.value)
      .find(v => v.slug === s.slug)!)
    .filter(Boolean)

  if (qualified.length === 0) {
    return NextResponse.json({
      scanned:   slugsToScan.length,
      qualified: 0,
      alerts:    0,
      failed:    failedFetches,
      allScores,
      message:   'No signals met the confidence ≥50 + confluence ≥45 threshold',
      utcHour,
    })
  }

  // ── Atomic dedup via DB unique constraint ────────────────────────────────────
  // sessionKey = "slug:decision:YYYY-MM-DD:bucket" (bucket = floor(utcHour/4))
  // Two concurrent scan requests cannot both insert the same key — the second
  // gets a unique violation and skips that pair. SignalAlert is saved BEFORE
  // Telegram so the lock is held even if Telegram or BrokerTrade creation fails.
  const dateStr = now.toISOString().slice(0, 10)           // "YYYY-MM-DD"
  const bucket  = Math.floor(utcHour / 4)                  // 0-5, changes every 4 hours

  const toAlert: ScanResult[] = []
  const deduped: string[]     = []

  for (const signal of qualified) {
    const sessionKey = `${signal.slug}:${signal.analysis.decision}:${dateStr}:${bucket}`
    try {
      await prisma.signalAlert.create({
        data: {
          slug:       signal.slug,
          display:    signal.display,
          decision:   signal.analysis.decision,
          confidence: signal.analysis.confidence,
          confluence: signal.analysis.confluenceScore ?? 0,
          entryLow:   signal.analysis.entryZone[0],
          entryHigh:  signal.analysis.entryZone[1],
          price:      signal.price,
          stopLoss:   signal.analysis.stopLoss,
          tp1:        signal.analysis.tp1,
          rrRatio:    signal.analysis.rrRatio ?? '—',
          sessionKey,
        },
      })
      // Insert succeeded → this pair is new this 4-hour block
      toAlert.push(signal)
    } catch {
      // Unique violation (or any DB error) → already alerted this block, skip
      deduped.push(signal.slug)
    }
  }

  if (toAlert.length === 0) {
    return NextResponse.json({
      scanned:   slugsToScan.length,
      qualified: qualified.length,
      alerts:    0,
      deduped,
      failed:    failedFetches,
      allScores,
      message:   'All qualifying signals already alerted this 4-hour block',
    })
  }

  // Create pending BrokerTrade records for each new signal (55-min approval window)
  const balance   = parseFloat(process.env.BROKER_BALANCE_USD ?? '0')
  const expiresAt = new Date(Date.now() + 55 * 60 * 1000)

  for (const signal of toAlert) {
    try {
      const mt4Symbol = SLUG_TO_MT4[signal.slug]
      if (!mt4Symbol) continue  // no MT4 mapping — informational alert only

      const entry   = (signal.analysis.entryZone[0] + signal.analysis.entryZone[1]) / 2
      const lotSize = balance > 0
        ? calcLotSize(balance, 1.0, entry, signal.analysis.stopLoss, mt4Symbol)
        : 0.01

      await prisma.brokerTrade.create({
        data: {
          slug:          signal.slug,
          display:       signal.display,
          decision:      signal.analysis.decision as 'BUY' | 'SELL',
          confidence:    signal.analysis.confidence,
          entryLow:      signal.analysis.entryZone[0],
          entryHigh:     signal.analysis.entryZone[1],
          stopLoss:      signal.analysis.stopLoss,
          tp1:           signal.analysis.tp1,
          tp2:           signal.analysis.tp2,
          tp3:           signal.analysis.tp3,
          rrRatio:       signal.analysis.rrRatio,
          lotSize,
          priceAtSignal: signal.price,
          status:        'pending',
          expiresAt,
        },
      })
    } catch (err) {
      console.error(`Failed to create broker trade for ${signal.slug}:`, err)
    }
  }

  // ── Email subscribed users for each new signal ───────────────────────────────
  for (const signal of toAlert) {
    // Find the SignalAlert record just created (for email template compatibility)
    const alertRecord = await prisma.signalAlert.findFirst({
      where: { slug: signal.slug, decision: signal.analysis.decision },
      orderBy: { sentAt: 'desc' },
    })
    if (!alertRecord) continue

    // Find users subscribed to this pair (include role to detect admin)
    const subs = await prisma.pairSubscription.findMany({
      where:   { slug: signal.slug },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    })
    if (subs.length === 0) continue

    const recipients = subs.map(s => s.user)
    const dir        = signal.analysis.decision === 'BUY' ? 'buy' : 'sell'
    const subject    = `New ${dir} signal on ${signal.display}`

    // Email all subscribed users
    await sendBulkEmail(
      recipients,
      subject,
      (name) => buildSignalEmail(name, alertRecord),
      (name) => buildSignalText(name, alertRecord),
    ).catch(err => console.error(`[scan] email error for ${signal.slug}:`, err))

    // Send a dedicated Telegram alert if any admin has subscribed to this pair
    const adminSubscribed = subs.some(s => s.user.role === 'admin')
    if (adminSubscribed) {
      const dec  = dpFmt(signal.price)
      const icon = signal.analysis.decision === 'BUY' ? '📈' : '📉'
      const tgLines = [
        `📌 <b>Subscribed Pair Alert — ${signal.analysis.decision} ${signal.display}</b>`,
        ``,
        `${icon} <b>${signal.analysis.decision}</b> · Confidence: <b>${signal.analysis.confidence}%</b> · Confluence: <b>${signal.analysis.confluenceScore ?? 0}%</b>`,
        `• Entry: ${fmt(signal.analysis.entryZone[0], dec)} – ${fmt(signal.analysis.entryZone[1], dec)}`,
        `• SL: ${fmt(signal.analysis.stopLoss, dec)} · TP1: ${fmt(signal.analysis.tp1, dec)} · R/R ${signal.analysis.rrRatio}`,
        `• Price: ${fmt(signal.price, dec)}`,
        ``,
        `🔗 ${base}/analysis/${signal.slug}`,
      ]
      await sendTelegramMessage(tgLines.join('\n')).catch(err =>
        console.error(`[scan] Telegram admin subscription alert error for ${signal.slug}:`, err)
      )
    }
  }

  // ── Subscribed-pair alerts for BELOW-threshold signals ──────────────────────
  // If a user has subscribed to a pair, notify them of ANY BUY/SELL prediction
  // regardless of confidence/confluence — even if it didn't pass the main threshold.
  // Uses a ":sub" sessionKey suffix so dedup is independent of the main scanner.
  {
    const subSlugsRows = await prisma.pairSubscription.findMany({
      distinct: ['slug'],
      select:   { slug: true },
    })
    const subscribedSlugs = new Set(subSlugsRows.map(s => s.slug))

    // Full ScanResult objects for subscribed pairs that have a BUY/SELL decision
    // and were NOT already handled by the main toAlert loop above.
    const alreadyAlertedslugs = new Set(toAlert.map(s => s.slug))
    const subOnlySignals = rawResults
      .filter((r): r is PromiseFulfilledResult<ScanResult> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter(s =>
        subscribedSlugs.has(s.slug) &&
        s.analysis.decision !== 'NO TRADE' &&
        !alreadyAlertedslugs.has(s.slug)
      )

    for (const signal of subOnlySignals) {
      const sessionKey = `${signal.slug}:${signal.analysis.decision}:${dateStr}:${bucket}:sub`

      let alertRecord: Awaited<ReturnType<typeof prisma.signalAlert.create>> | null = null
      try {
        alertRecord = await prisma.signalAlert.create({
          data: {
            slug:       signal.slug,
            display:    signal.display,
            decision:   signal.analysis.decision,
            confidence: signal.analysis.confidence,
            confluence: signal.analysis.confluenceScore ?? 0,
            entryLow:   signal.analysis.entryZone[0],
            entryHigh:  signal.analysis.entryZone[1],
            price:      signal.price,
            stopLoss:   signal.analysis.stopLoss,
            tp1:        signal.analysis.tp1,
            rrRatio:    signal.analysis.rrRatio ?? '—',
            sessionKey,
          },
        })
      } catch {
        // Already sent this 4-hour block — skip
        continue
      }

      const subs = await prisma.pairSubscription.findMany({
        where:   { slug: signal.slug },
        include: { user: { select: { id: true, name: true, email: true, role: true } } },
      })
      if (subs.length === 0) continue

      // Email all subscribed users
      const dir     = signal.analysis.decision === 'BUY' ? 'buy' : 'sell'
      const subject = `New ${dir} signal on ${signal.display}`
      await sendBulkEmail(
        subs.map(s => s.user),
        subject,
        (name) => buildSignalEmail(name, alertRecord!),
        (name) => buildSignalText(name, alertRecord!),
      ).catch(err => console.error(`[scan:sub] email error for ${signal.slug}:`, err))

      // Telegram to admin subscribers
      const adminSubscribed = subs.some(s => s.user.role === 'admin')
      if (adminSubscribed) {
        const dec  = dpFmt(signal.price)
        const icon = signal.analysis.decision === 'BUY' ? '📈' : '📉'
        const tgLines = [
          `📌 <b>Subscribed Pair Alert — ${signal.analysis.decision} ${signal.display}</b>`,
          ``,
          `${icon} <b>${signal.analysis.decision}</b> · Confidence: <b>${signal.analysis.confidence}%</b> · Confluence: <b>${signal.analysis.confluenceScore ?? 0}%</b>`,
          `• Entry: ${fmt(signal.analysis.entryZone[0], dec)} – ${fmt(signal.analysis.entryZone[1], dec)}`,
          `• SL: ${fmt(signal.analysis.stopLoss, dec)} · TP1: ${fmt(signal.analysis.tp1, dec)} · R/R ${signal.analysis.rrRatio}`,
          `• Price: ${fmt(signal.price, dec)}`,
          ``,
          `🔗 ${base}/analysis/${signal.slug}`,
        ]
        await sendTelegramMessage(tgLines.join('\n')).catch(err =>
          console.error(`[scan:sub] Telegram error for ${signal.slug}:`, err)
        )
      }
    }
  }

  // Build and send Telegram message AFTER SignalAlerts are committed
  const session = sessionName(utcHour)
  const nums    = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣']
  const lines: string[] = [
    `📡 <b>FM Trader — ${toAlert.length} Signal${toAlert.length > 1 ? 's' : ''} Ready</b>`,
    `🕐 ${String(utcHour).padStart(2,'0')}:00 UTC · ${session}`,
    ``,
  ]

  for (let i = 0; i < toAlert.length; i++) {
    const { display, analysis, price } = toAlert[i]
    const dir  = analysis.decision === 'BUY' ? '📈' : '📉'
    const dec  = dpFmt(price)
    const conf = analysis.confluenceScore ?? 0

    lines.push(`${nums[i]} ${dir} <b>${analysis.decision} ${display}</b>`)
    lines.push(`• Confidence: <b>${analysis.confidence}%</b> · Confluence: <b>${conf}%</b>`)
    lines.push(`• Entry: ${fmt(analysis.entryZone[0], dec)} – ${fmt(analysis.entryZone[1], dec)}`)
    lines.push(`• SL: ${fmt(analysis.stopLoss, dec)} · TP1: ${fmt(analysis.tp1, dec)} · R/R ${analysis.rrRatio}`)
    if (i < toAlert.length - 1) lines.push(``)
  }

  lines.push(``)
  lines.push(`👇 <b>Tap to approve or reject trades:</b>`)
  lines.push(`🔗 ${base}/admin/broker`)

  await sendTelegramMessage(lines.join('\n'))

  return NextResponse.json({
    scanned:   slugsToScan.length,
    qualified: qualified.length,
    alerts:    toAlert.length,
    deduped,
    failed:    failedFetches,
    allScores,
    signals:   toAlert.map(s => ({
      slug:       s.slug,
      display:    s.display,
      decision:   s.analysis.decision,
      confidence: s.analysis.confidence,
      confluence: s.analysis.confluenceScore,
      entryLow:   s.analysis.entryZone[0],
      entryHigh:  s.analysis.entryZone[1],
    })),
  })
}
