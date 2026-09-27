// Auto-fetch macro release actuals via Claude with web search.
//
// The calendar provider (ForexFactory scrape) publishes the schedule but never
// the actual print. Waiting for a human to type each number in means the feed
// runs cold through most releases. This helper closes that loop: after the
// scheduled time, we ask Claude to search a few reliable financial sources for
// the printed figure, parse a strict JSON envelope, and hand the number back
// to the caller (which then runs it through the existing publish pipeline).
//
// Guardrails (enforced by the caller in cron/econ-news, not here):
//   • Attempt only if `actual` is still null
//   • At most N attempts per event (searchAttempts field)
//   • ≥15 min between attempts (actualsSearchedAt field)
//   • Only within a grace window after release (source data goes stale fast
//     for a caller that isn't watching live)
//
// Confidence gate: we only apply the actual when Claude reports 'high'
// confidence. Medium/low are logged and left for a human to file — a
// slightly-wrong CPI print alerting every subscriber is a worse outcome than
// leaving the number missing for a few more minutes.

import { anthropic } from '@/lib/claude'
import type { MessageParam, ContentBlock } from '@anthropic-ai/sdk/resources/messages'

// Haiku 4.5 with web-search tool. The task is narrow — "search for this
// released macro number and return a JSON envelope citing sources" — and
// does not need Opus-level reasoning. Haiku is roughly 15× cheaper per
// token than Opus 5, which materially extends how many releases each
// top-up of Anthropic credits can cover. Confidence gate + 2-source rule
// in the prompt still catches the failure modes that matter.
const FETCH_MODEL = 'claude-haiku-4-5-20251001'

export interface FetchActualsInput {
  currency:    string    // "USD"
  event:       string    // "CPI y/y"
  scheduledAt: Date
  forecast:    number | null
  previous:    number | null
  unit:        string | null
}

export interface FetchActualsResult {
  actual:      number | null
  confidence:  'high' | 'medium' | 'low'
  source:      string      // URL or outlet name
  notes:       string      // one-sentence rationale
}

// ── JSON envelope Claude must return ─────────────────────────────────────────
// Enforced by parsing: if the model returns anything else, we treat the whole
// pass as low-confidence and skip applying it.
const JSON_SHAPE = `{
  "actual":     <number|null>,
  "confidence": "high" | "medium" | "low",
  "source":     "<publisher name or URL>",
  "notes":      "<one-sentence rationale>"
}`

function buildPrompt(input: FetchActualsInput): string {
  const period = input.scheduledAt.toLocaleString('en-US', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  })
  const forecastLine = input.forecast != null ? `Forecast: ${input.forecast}${input.unit ?? ''}` : ''
  const previousLine = input.previous != null ? `Previous month/reading: ${input.previous}${input.unit ?? ''}` : ''

  return [
    `Find the officially released actual value for this macro data point:`,
    ``,
    `Country/currency:  ${input.currency}`,
    `Release:           ${input.event}`,
    `Reference period:  ${period} (release printed on or after ${input.scheduledAt.toISOString().slice(0, 10)})`,
    forecastLine,
    previousLine,
    ``,
    `Search reputable financial sources (BLS / Eurostat / ONS / official statistics office; Reuters, Bloomberg, FT, WSJ, MarketWatch, FXStreet). Prefer the OFFICIAL source for the number itself.`,
    ``,
    `Return ONLY a JSON object (no prose, no code fence, no leading/trailing text) with this exact shape:`,
    JSON_SHAPE,
    ``,
    `Rules:`,
    `• "actual" is the NUMERIC print in the SAME UNIT as the forecast/previous shown above. For y/y or m/m percent readings, return the percent value as a plain number (e.g. 2.7 for 2.7%, NOT 0.027).`,
    `• Report "high" confidence ONLY when you can cite the exact figure on at least two independent reputable sources (or the official statistics office directly) with matching numbers.`,
    `• Report "medium" when one reputable source has the number but you cannot cross-check.`,
    `• Report "low" when the release has not yet published, sources disagree, or you cannot find it.`,
    `• If you cannot find it, set "actual": null and set confidence to "low" — do not guess.`,
  ].join('\n')
}

// Web-search tool definition (Anthropic native). The SDK types require the
// literal `name: "web_search"` — this is a named tool, not a custom function.
const WEB_SEARCH_TOOL = {
  type:     'web_search_20250305' as const,
  name:     'web_search' as const,
  max_uses: 4,
}

function extractText(blocks: ContentBlock[]): string {
  // web_search results interleave; we want ONLY the final text block(s)
  return blocks
    .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim()
}

function parseJson(raw: string): FetchActualsResult | null {
  // Claude usually returns bare JSON, but strip any accidental code fence.
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```\s*$/, '').trim()
  try {
    const obj = JSON.parse(cleaned) as Record<string, unknown>
    const actual = obj.actual === null ? null
                 : typeof obj.actual === 'number' && Number.isFinite(obj.actual) ? obj.actual
                 : null
    const conf = obj.confidence === 'high' || obj.confidence === 'medium' || obj.confidence === 'low'
      ? obj.confidence : 'low'
    return {
      actual,
      confidence: conf,
      source:     typeof obj.source === 'string' ? obj.source.slice(0, 200) : '',
      notes:      typeof obj.notes  === 'string' ? obj.notes.slice(0, 500)  : '',
    }
  } catch {
    return null
  }
}

/**
 * Failure kind, so the cron can react differently to a depleted Anthropic
 * balance (needs admin action) vs an ordinary transient error (just retry
 * on the next tick).
 */
export type FetchErrorKind = 'credit_low' | 'rate_limit' | 'other' | null

export interface FetchActualsResponse {
  result:    FetchActualsResult | null
  errorKind: FetchErrorKind
}

function classifyError(err: unknown): FetchErrorKind {
  const e = err as { status?: number; error?: { error?: { message?: string } } }
  const msg = (e.error?.error?.message ?? '').toLowerCase()
  if (msg.includes('credit balance is too low') || msg.includes('insufficient credit')) return 'credit_low'
  if (e.status === 429) return 'rate_limit'
  return 'other'
}

export async function fetchActualsFromWeb(input: FetchActualsInput): Promise<FetchActualsResponse> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[fetch-actuals] ANTHROPIC_API_KEY not set — skipping')
    return { result: null, errorKind: 'other' }
  }
  const messages: MessageParam[] = [{ role: 'user', content: buildPrompt(input) }]
  try {
    const msg = await anthropic.messages.create({
      model:      FETCH_MODEL,
      max_tokens: 1024,
      tools:      [WEB_SEARCH_TOOL],
      messages,
    })
    const text = extractText(msg.content)
    const parsed = parseJson(text)
    if (!parsed) {
      console.warn(`[fetch-actuals] JSON parse failed for ${input.currency} ${input.event}: ${text.slice(0, 200)}`)
      return { result: null, errorKind: 'other' }
    }
    return { result: parsed, errorKind: null }
  } catch (err) {
    console.error(`[fetch-actuals] Claude call failed for ${input.currency} ${input.event}:`, err)
    return { result: null, errorKind: classifyError(err) }
  }
}
