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
}

const WIN_OUTCOMES  = ['tp1_hit', 'tp2_hit', 'tp3_hit']

const shape = (r: any): RecapPrediction => ({
  display: r.display, decision: r.decision, confidence: r.confidence,
  outcome: r.outcome, priceAtCall: r.priceAtCall,
  priceAtOutcome: r.priceAtOutcome, entryLow: r.entryLow, entryHigh: r.entryHigh,
  stopLoss: r.stopLoss, tp1: r.tp1, rrRatio: r.rrRatio,
})

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
