import { prisma } from '@/lib/prisma'
import { anthropic, WRITING_MODEL } from '@/lib/claude'

/**
 * The day's FM Trader recap, written as a short video script.
 *
 * Everything the script can say is assembled here first and passed in as facts.
 * The model is told, explicitly and more than once, that it may not invent a
 * result — an entertaining recap that overstates performance is worse than no
 * recap, and this project has already had one incident where unmeasured
 * confidence went unchecked for weeks.
 */

export interface RecapPrediction {
  display:        string
  decision:       string
  confidence:     number
  outcome:        string
  priceAtCall:    number
  priceAtOutcome: number | null
  entryLow:       number
  entryHigh:      number
  stopLoss:       number
  tp1:            number
  rrRatio:        string
}

/** Gold and Bitcoin get a mention every day whether or not they were traded. */
export interface FlagshipSnapshot {
  display:   string
  price:     number
  changePct: number | null
  signal:    string | null          // overall rule-engine read
  trend:     string                 // per-timeframe signals, condensed
  support:   number | null
  resistance: number | null
  /** False when the instrument's market is shut — the price is last-close, not live. */
  marketOpen: boolean
}

export interface RecapData {
  date:        string
  total:       number
  resolved:    number
  wins:        number
  losses:      number
  expired:     number
  pending:     number
  winRatePct:  number | null
  // Split rather than a single "top 5": the recap is about what resolved, and
  // a mixed list sorted by confidence surfaced five open trades on the first
  // run, which is exactly what the post should not dwell on.
  winners:     RecapPrediction[]
  losers:      RecapPrediction[]
  pairs:       string[]
  flagships:   FlagshipSnapshot[]
}

const WIN_OUTCOMES  = ['tp1_hit', 'tp2_hit', 'tp3_hit']

const shape = (r: any): RecapPrediction => ({
  display: r.display, decision: r.decision, confidence: r.confidence,
  outcome: r.outcome, priceAtCall: r.priceAtCall,
  priceAtOutcome: r.priceAtOutcome, entryLow: r.entryLow, entryHigh: r.entryHigh,
  stopLoss: r.stopLoss, tp1: r.tp1, rrRatio: r.rrRatio,
})

/**
 * Gold and Bitcoin, fetched live.
 *
 * These get a slot in every recap regardless of whether FM Trader traded them —
 * they are the two instruments the audience watches daily. Failures are
 * tolerated: a missing snapshot drops the mention rather than losing the post.
 */
const FLAGSHIP_SLUGS = ['xau-usd', 'btc-usd']

/**
 * Is the spot FX / metals market open?
 *
 * The week runs Sunday 22:00 UTC to Friday 21:00 UTC. Gold sits inside that;
 * Bitcoin does not stop, so it is never gated by this. Without the check a
 * weekend recap would report Friday's close as if it were today's move.
 */
function isForexOpen(now: Date): boolean {
  const day  = now.getUTCDay()          // 0 Sun … 6 Sat
  const hour = now.getUTCHours()
  if (day === 6) return false                    // Saturday
  if (day === 0) return hour >= 22               // Sunday, after the open
  if (day === 5) return hour < 21                // Friday, before the close
  return true
}

const ALWAYS_OPEN = new Set(['btc-usd', 'eth-usd', 'sol-usd', 'xrp-usd', 'bnb-usd', 'doge-usd'])

async function gatherFlagships(): Promise<FlagshipSnapshot[]> {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, '')
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const out = await Promise.allSettled(FLAGSHIP_SLUGS.map(async slug => {
    const res = await fetch(`${base}/api/market-data/${slug}`, {
      headers: { 'x-cron-secret': process.env.CRON_SECRET ?? '' },
      signal:  AbortSignal.timeout(20_000),
    })
    if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`)
    const d = await res.json()
    const tfs: Array<{ key: string; signal: string }> = d.timeframes ?? []
    return {
      display:    d.display ?? slug,
      price:      d.price,
      changePct:  typeof d.changePct === 'number' ? Number(d.changePct.toFixed(2)) : null,
      signal:     d.overallSignal ?? null,
      trend:      tfs.filter(t => ['daily', '4h', '1h'].includes(t.key))
                     .map(t => `${t.key} ${t.signal}`).join(', '),
      support:    d.keyLevels?.support1    ?? null,
      resistance: d.keyLevels?.resistance1 ?? null,
      marketOpen: ALWAYS_OPEN.has(slug) || isForexOpen(new Date()),
    } as FlagshipSnapshot
  }))

  return out.flatMap(r => {
    if (r.status === 'fulfilled') return [r.value]
    console.error('[daily-recap] flagship fetch failed:', r.reason)
    return []
  })
}

/** Everything created in the last 24 hours, with whatever has resolved. */
export async function gatherRecap(now = new Date()): Promise<RecapData> {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const rows = await prisma.fMPrediction.findMany({
    where:   { createdAt: { gte: since } },
    orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
    select:  {
      display: true, decision: true, confidence: true,
      outcome: true, priceAtCall: true, slug: true,
      priceAtOutcome: true, entryLow: true, entryHigh: true,
      stopLoss: true, tp1: true, rrRatio: true,
    },
  })

  const flagships = await gatherFlagships()

  const wins    = rows.filter(r => WIN_OUTCOMES.includes(r.outcome)).length
  const losses  = rows.filter(r => r.outcome === 'sl_hit').length
  const expired = rows.filter(r => r.outcome === 'expired').length
  const pending = rows.filter(r => r.outcome === 'pending').length
  const resolved = wins + losses

  return {
    date:  now.toISOString().slice(0, 10),
    total: rows.length,
    resolved, wins, losses, expired, pending,
    // Null rather than 0 when nothing resolved — "0% win rate" would be a lie
    // about a day that simply has not finished yet.
    winRatePct: resolved > 0 ? Math.round((wins / resolved) * 100) : null,
    winners: rows.filter(r => WIN_OUTCOMES.includes(r.outcome)).slice(0, 5).map(shape),
    losers:  rows.filter(r => r.outcome === 'sl_hit').slice(0, 5).map(shape),
    pairs: [...new Set(rows.map(r => r.slug))],
    flagships,
  }
}

const SYSTEM = `You are FM Trader, an analyst who teaches. The traders reading this are your students, and the feed is how you talk to them each day.

VOICE
- Open with a hook. A number, a reversal, a blunt admission — something that stops a trader mid-scroll. Never "Welcome back."
- Energetic, direct, short sentences. Speak to one student, not a crowd.
- A teacher who trades, not a hype account. Confident, never boastful.

WHAT THE POST IS ABOUT
The trades that finished. That is the whole subject.

For the winners: what the setup was and why it worked. Name the thing a student should recognise next time.

For the losers: this is the most valuable part of the post, so give it the most room. For each loss, work through it — where the entry was, where the stop sat, where price actually went. Then answer the two questions a student is really asking:
  1. Was this avoidable, or was it a good trade that lost? Say which. Not every loss is a mistake, and pretending otherwise teaches superstition.
  2. What specifically should they do differently tomorrow? Concrete. "Wait for the retest" beats "be more patient."

GOLD AND BITCOIN
Every post includes a short read on XAU/USD and BTC/USD, whether or not you traded them. Your students watch both daily. Two or three lines each at most: where price is, which way the timeframes lean, and the level that matters next. Work it into the flow — a paragraph, not a data dump — and skip either one if no data is supplied for it.

If an instrument is marked closed (gold over the weekend), do not narrate a move or momentum it cannot have had. Say it is shut, and give the level worth watching when it reopens. Bitcoin never closes, so it always gets its read.

Close with one lesson they can act on, and a short sign-off.

DO NOT
- Do not dwell on open or unresolved positions. One passing clause at most if it matters; usually skip entirely. A recap about trades that have not finished teaches nothing.
- Do not invent trades, prices, percentages or outcomes. Use only what you are given.
- Do not spin a loss as a win, and do not blame the market.
- Do not promise profits or guarantee performance.

FORMAT
180-340 words. Plain text only: no markdown, no headers, no asterisks, no bullet characters. Emoji sparingly, two at most. Line breaks between beats.`

export function buildRecapPrompt(d: RecapData): string {
  const label = (o: string) =>
    o === 'tp1_hit' ? 'hit TP1'
    : o === 'tp2_hit' ? 'hit TP2'
    : o === 'tp3_hit' ? 'ran to TP3, the full target'
    : 'stopped out'

  const line = (p: RecapPrediction) =>
    `- ${p.decision} ${p.display} @ ${p.priceAtCall} (entry zone ${p.entryLow}-${p.entryHigh}, stop ${p.stopLoss}, TP1 ${p.tp1}, R:R ${p.rrRatio}, confidence ${p.confidence}%) — ${label(p.outcome)}` +
    (p.priceAtOutcome != null ? `, price at close ${p.priceAtOutcome}` : '')

  const winBlock  = d.winners.length ? d.winners.map(line).join('\n') : '(none today)'
  const lossBlock = d.losers.length  ? d.losers.map(line).join('\n')  : '(none today)'

  return `Write today's post. Date: ${d.date}

THE DAY, IN FACTS — use only these:
- Trades that finished: ${d.resolved} (${d.wins} won, ${d.losses} stopped out)
- Win rate on finished trades: ${d.winRatePct === null ? 'nothing finished yet, so there is no rate to quote' : d.winRatePct + '%'}
- Instruments traded: ${d.pairs.length}

WINNERS:
${winBlock}

LOSSES — spend most of the post here:
${lossBlock}

${d.resolved === 0
  ? 'NOTE: nothing finished today. Do not quote a win rate and do not narrate open positions. Instead, teach one thing properly — pick a concept a trader needs (stop placement, R:R, session timing) and give them a real lesson on it.'
  : d.losses === 0
    ? 'NOTE: no losses today. Do not pad with open trades. Use the space to teach what made the winners work, and warn against the overconfidence a green day breeds.'
    : ''}

GOLD AND BITCOIN — include a short read on each of these:
${d.flagships.length
  ? d.flagships.map(f =>
      f.marketOpen === false
        ? `- ${f.display}: MARKET CLOSED for the weekend. Last close ${f.price}. Do not describe today's move or momentum — say it is shut and, if useful, flag the level to watch when it reopens.`
        : `- ${f.display}: ${f.price}${f.changePct != null ? ` (${f.changePct > 0 ? '+' : ''}${f.changePct}% on the day)` : ''}` +
      `${f.signal ? `, overall read ${f.signal}` : ''}` +
      `${f.trend ? `, timeframes ${f.trend}` : ''}` +
      `${f.support != null ? `, support ${f.support}` : ''}` +
      `${f.resistance != null ? `, resistance ${f.resistance}` : ''}`
    ).join('\n')
  : '(market data unavailable today — skip this section entirely rather than guessing)'}

Also worth knowing, but do NOT build the post around it: ${d.pending} trades are still open.`
}

/** Generates the script. Returns null if the model is unavailable. */
export async function writeRecap(d: RecapData): Promise<string | null> {
  try {
    const res = await anthropic.messages.create({
      model:      WRITING_MODEL,
      max_tokens: 1600,
      system:     SYSTEM,
      messages:   [{ role: 'user', content: buildRecapPrompt(d) }],
    })
    const text = res.content.find(b => b.type === 'text')
    return text && text.type === 'text' ? text.text.trim() : null
  } catch (e) {
    console.error('[daily-recap] generation failed:', e)
    return null
  }
}
