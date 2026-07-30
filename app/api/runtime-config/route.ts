// Client-facing slice of perf flags — exposes only the polling cadences the
// browser actually needs so we don't leak the whole flag set. Cached at the
// CDN for 60s; admin changes propagate within a minute of toggling.
import { NextResponse } from 'next/server'
import { getPerfFlags, pollIntervalMs } from '@/lib/perf-flags'

export const dynamic = 'force-dynamic'

const LIVE_TRADE_BASE_MS  = 60_000   // matches the historical interval
const MARKET_LIVE_BASE_MS = 30_000

export async function GET() {
  const f = await getPerfFlags()
  return NextResponse.json({
    liveTradePollMs:  pollIntervalMs(f.liveTradePoll,  LIVE_TRADE_BASE_MS),
    marketLivePollMs: pollIntervalMs(f.marketLivePoll, MARKET_LIVE_BASE_MS),
    // Surfaced so the FM Trader UI can show a "basic mode" banner when needed
    claudeNarrative:   f.claudeNarrative,
    fmTraderStreaming: f.fmTraderStreaming,
  }, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' },
  })
}
