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
  display:    string
  decision:   string
  confidence: number
  outcome:    string
  priceAtCall: number
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
  top:         RecapPrediction[]
  pairs:       string[]
}

const WIN_OUTCOMES  = ['tp1_hit', 'tp2_hit', 'tp3_hit']

/** Everything created in the last 24 hours, with whatever has resolved. */
export async function gatherRecap(now = new Date()): Promise<RecapData> {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const rows = await prisma.fMPrediction.findMany({
    where:   { createdAt: { gte: since } },
    orderBy: [{ confidence: 'desc' }, { createdAt: 'desc' }],
    select:  {
      display: true, decision: true, confidence: true,
      outcome: true, priceAtCall: true, slug: true,
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
    top: rows.slice(0, 5).map(r => ({
      display: r.display, decision: r.decision, confidence: r.confidence,
      outcome: r.outcome, priceAtCall: r.priceAtCall,
    })),
    pairs: [...new Set(rows.map(r => r.slug))],
  }
}

const SYSTEM = `You are FM Trader, the in-house analyst for a forex education platform, writing the daily recap as a short video script.

VOICE
- Open with a hook in the first line. Something that makes a trader stop scrolling — a number, a reversal, a blunt admission. Never "Welcome back to another day of trading."
- Energetic and direct. Short sentences. Speak to one person, not an audience.
- You are a teacher who trades, not a hype account. Confident, never boastful.

STRUCTURE
1. Hook (1-2 lines)
2. How the day actually went, using only the numbers given
3. The notable calls, what they were, and what happened
4. One concrete lesson a trader can use tomorrow
5. A short sign-off

ON LOSING DAYS
Losing days are the point of the channel. Say plainly that it was a red day, then teach: what the setup looked like, why the market did something else, what a disciplined trader does with that. Never spin a loss as a win. Never blame the market. A trader who only posts green days is selling something.

HARD RULES
- Use ONLY the statistics provided. Do not invent trades, prices, percentages or outcomes.
- If little resolved, say so honestly and talk about what is still open instead of manufacturing a result.
- Never promise profits or guarantee future performance.
- No emoji spam — two or three at most, and only if they earn their place.
- 180-320 words. Plain text only: no markdown, no headers, no asterisks, no bullet characters. Line breaks between beats.`

export function buildRecapPrompt(d: RecapData): string {
  const outcomeLabel = (o: string) =>
    o === 'tp1_hit' ? 'hit TP1 (win)'
    : o === 'tp2_hit' ? 'hit TP2 (solid win)'
    : o === 'tp3_hit' ? 'hit TP3 (full target)'
    : o === 'sl_hit'  ? 'stopped out (loss)'
    : o === 'expired' ? 'expired without hitting TP or SL'
    : 'still open'

  const lines = d.top.length
    ? d.top.map((p, i) =>
        `${i + 1}. ${p.decision} ${p.display} — called at ${p.priceAtCall}, ${p.confidence}% confidence, ${outcomeLabel(p.outcome)}`
      ).join('\n')
    : '(no predictions were run today)'

  return `Write today's recap. Date: ${d.date}

THE NUMBERS — these are the only facts you may use:
- Predictions run: ${d.total} across ${d.pairs.length} instruments
- Resolved so far: ${d.resolved} (${d.wins} winners, ${d.losses} stopped out)
- Still open: ${d.pending}
- Expired without hitting a level: ${d.expired}
- Win rate on resolved trades: ${d.winRatePct === null ? 'not enough resolved yet to state one' : d.winRatePct + '%'}

TOP CALLS BY CONFIDENCE:
${lines}

${d.resolved === 0
  ? 'NOTE: nothing has resolved yet today. Do not state a win rate or claim any result. Talk about what is open and what you are watching.'
  : d.losses > d.wins
    ? 'NOTE: this was a losing day. Say so directly in the first few lines, then teach.'
    : ''}`
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
