/**
 * Economic calendar source for the FM News agent.
 *
 * Behind a provider interface on purpose. Neither Twelve Data (calendar is a
 * paid add-on — returns 404 on the current basic plan) nor Polygon (news
 * articles only, no scheduled releases with forecast/actual) can serve this,
 * so it is a new dependency, and whether Finnhub's calendar sits on their free
 * tier could not be verified without a live key — an invalid token returns an
 * identical 401 on both gated and ungated endpoints. If it turns out to be
 * premium, write another CalendarProvider and change ACTIVE_PROVIDER; nothing
 * else in the agent needs to move.
 */

export interface CalendarEvent {
  /** Stable dedup key — the poller re-sees the same event on every run. */
  eventKey:    string
  country:     string          // ISO-ish country code from the provider, e.g. "US"
  currency:    string          // resolved from country, e.g. "USD"
  event:       string          // "CPI y/y"
  impact:      'high' | 'medium' | 'low'
  scheduledAt: Date
  actual:      number | null   // null until the print lands
  forecast:    number | null
  previous:    number | null
  unit:        string | null
}

export interface CalendarProvider {
  name: string
  /** Events scheduled within [from, to]. Throws on transport/auth failure. */
  fetchWindow(from: Date, to: Date): Promise<CalendarEvent[]>
}

/** Provider country codes -> the currency their data moves. */
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: 'USD', EU: 'EUR', EA: 'EUR', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR',
  GB: 'GBP', UK: 'GBP',
  JP: 'JPY', AU: 'AUD', CA: 'CAD', CH: 'CHF', NZ: 'NZD',
  MX: 'MXN', SG: 'SGD',
}

/** Releases worth waking users for. Everything else is noise at alert volume. */
const TRACKED_IMPACTS = new Set(['high', 'medium'])

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ── Finnhub ───────────────────────────────────────────────────────────────────

interface FinnhubRow {
  actual?:   number | null
  country?:  string
  estimate?: number | null
  event?:    string
  impact?:   string
  prev?:     number | null
  time?:     string
  unit?:     string
}

export const finnhubProvider: CalendarProvider = {
  name: 'finnhub',

  async fetchWindow(from: Date, to: Date): Promise<CalendarEvent[]> {
    const token = process.env.FINNHUB_API_KEY
    if (!token) throw new Error('FINNHUB_API_KEY is not set')

    const url = `https://finnhub.io/api/v1/calendar/economic?from=${ymd(from)}&to=${ymd(to)}&token=${token}`
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) })

    if (!res.ok) {
      // Include the provider's own message. A 403 here can mean the calendar is
      // gated to a paid plan, the account is unverified, or the key is still
      // activating — and those need different responses, so the status code
      // alone is not enough to act on. Truncated: it is going into a log line.
      const body = await res.text().catch(() => '')
      throw new Error(`finnhub calendar HTTP ${res.status}: ${body.slice(0, 200)}`)
    }

    const json = await res.json() as { economicCalendar?: FinnhubRow[] }
    const rows = json.economicCalendar ?? []

    return rows.flatMap((r): CalendarEvent[] => {
      const country  = (r.country ?? '').toUpperCase()
      const currency = COUNTRY_TO_CURRENCY[country]
      const impact   = (r.impact ?? '').toLowerCase()

      // Skip anything we can't map to a tracked currency, or that isn't
      // impactful enough to justify an alert.
      if (!currency || !TRACKED_IMPACTS.has(impact)) return []
      if (!r.event || !r.time) return []

      // Finnhub returns "YYYY-MM-DD HH:mm:ss" in UTC without a zone marker.
      const scheduledAt = new Date(r.time.replace(' ', 'T') + 'Z')
      if (Number.isNaN(scheduledAt.getTime())) return []

      return [{
        eventKey:    `finnhub|${country}|${r.event}|${scheduledAt.toISOString()}`,
        country,
        currency,
        event:       r.event,
        impact:      impact as 'high' | 'medium',
        scheduledAt,
        actual:      r.actual   ?? null,
        forecast:    r.estimate ?? null,
        previous:    r.prev     ?? null,
        unit:        r.unit || null,
      }]
    })
  },
}

// ── ForexFactory (faireconomy mirror) ─────────────────────────────────────────
//
// Free and keyless, and its currency codes already match the ffCurrencies table
// in app/api/news/[slug]/route.ts. Three constraints shape the code below:
//
//   1. It rate-limits aggressively — a handful of requests inside a few minutes
//      returns 429. Hence FETCH_TTL_MS and the module-level cache; the cron must
//      run at ~20 minute intervals, NOT the 5 minutes a keyed API would allow.
//   2. Only ff_calendar_thisweek.json exists. today/tomorrow/nextweek/lastweek
//      all 404, so the horizon is the current week and the "upcoming" view goes
//      short as the week ends.
//   3. Numbers arrive as display strings with units ("5.7%", "2.50T", "-0.7"),
//      so they need parsing before any surprise arithmetic.
//
// Unofficial mirror: no SLA and no ToS guarantee. If it starts failing, that is
// expected rather than surprising — swap ACTIVE_PROVIDER to a keyed source.

const FF_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'
// Sits below the 15-minute cron cadence on purpose: at TTL == interval the two
// straddle the boundary and a scheduled run can be served stale rows. Still
// guards against rapid manual re-runs, which is what triggers the 429.
const FETCH_TTL_MS = 10 * 60 * 1000

let ffCache: { at: number; rows: FFRow[] } | null = null

interface FFRow {
  title?:    string
  country?:  string   // despite the name, this is the CURRENCY code (USD, JPY…)
  date?:     string   // ISO 8601 with offset
  impact?:   string   // "High" | "Medium" | "Low" | "Holiday"
  forecast?: string
  previous?: string
  actual?:   string
}

/**
 * "5.7%" -> 5.7, "2.50T" -> 2.5, "-0.7" -> -0.7, "" -> null.
 *
 * Magnitude suffixes are stripped rather than scaled: actual, forecast and
 * previous for a given event share a unit, so the surprise arithmetic is
 * consistent either way, and the raw string is kept for display.
 */
export function parseFFValue(raw: string | undefined | null): number | null {
  if (!raw) return null
  const m = raw.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  if (!m) return null
  const n = Number(m[0])
  return Number.isFinite(n) ? n : null
}

/** Trailing unit from a display value: "5.7%" -> "%", "2.50T" -> "T". */
export function parseFFUnit(raw: string | undefined | null): string | null {
  if (!raw) return null
  const m = raw.match(/[%KMBT]$/i)
  return m ? m[0] : null
}

export const forexFactoryProvider: CalendarProvider = {
  name: 'forexfactory',

  async fetchWindow(from: Date, to: Date): Promise<CalendarEvent[]> {
    let rows: FFRow[]

    if (ffCache && Date.now() - ffCache.at < FETCH_TTL_MS) {
      rows = ffCache.rows
    } else {
      const res = await fetch(FF_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ForexMastery/1.0)' },
        signal:  AbortSignal.timeout(20_000),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        // 429 here means the poll cadence is too tight, not that anything broke.
        throw new Error(`forexfactory HTTP ${res.status}: ${body.slice(0, 120)}`)
      }
      const json = await res.json()
      if (!Array.isArray(json)) throw new Error('forexfactory: unexpected payload shape')
      rows = json as FFRow[]
      ffCache = { at: Date.now(), rows }
    }

    return rows.flatMap((r): CalendarEvent[] => {
      const currency = (r.country ?? '').toUpperCase()
      const impact   = (r.impact ?? '').toLowerCase()

      if (!currency || !r.title || !r.date) return []
      if (!TRACKED_IMPACTS.has(impact)) return []   // drops Low and Holiday

      const scheduledAt = new Date(r.date)
      if (Number.isNaN(scheduledAt.getTime())) return []
      if (scheduledAt < from || scheduledAt > to) return []

      return [{
        eventKey:    `ff|${currency}|${r.title}|${scheduledAt.toISOString()}`,
        country:     currency,   // feed gives no separate country code
        currency,
        event:       r.title,
        impact:      impact as 'high' | 'medium',
        scheduledAt,
        actual:      parseFFValue(r.actual),
        forecast:    parseFFValue(r.forecast),
        previous:    parseFFValue(r.previous),
        unit:        parseFFUnit(r.actual ?? r.forecast ?? r.previous),
      }]
    })
  },
}

// ── Financial Modeling Prep ───────────────────────────────────────────────────
//
// Written ahead of having a key so switching is one line if FMP's free tier
// carries actuals. Whether it does could not be determined from outside: the
// calendar and every other endpoint return an identical 401 without a key, the
// same dead end Finnhub presented. Set FMP_API_KEY and point ACTIVE_PROVIDER
// here to find out.
//
// Response shape (v3): country is a 2-letter code, date is "YYYY-MM-DD HH:mm:ss"
// in UTC, estimate is the forecast, and values are numbers rather than the
// display strings ForexFactory returns.

interface FMPRow {
  event?:    string
  date?:     string
  country?:  string
  actual?:   number | null
  previous?: number | null
  estimate?: number | null
  impact?:   string
}

export const fmpProvider: CalendarProvider = {
  name: 'fmp',

  async fetchWindow(from: Date, to: Date): Promise<CalendarEvent[]> {
    const key = process.env.FMP_API_KEY
    if (!key) throw new Error('FMP_API_KEY is not set')

    const url = `https://financialmodelingprep.com/api/v3/economic_calendar`
      + `?from=${ymd(from)}&to=${ymd(to)}&apikey=${key}`
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`fmp calendar HTTP ${res.status}: ${body.slice(0, 200)}`)
    }

    const json = await res.json()
    if (!Array.isArray(json)) {
      // FMP returns an object with "Error Message" rather than a non-2xx on
      // some plan errors, so a shape check is not optional here.
      throw new Error(`fmp: unexpected payload — ${JSON.stringify(json).slice(0, 160)}`)
    }

    return (json as FMPRow[]).flatMap((r): CalendarEvent[] => {
      const country  = (r.country ?? '').toUpperCase()
      const currency = COUNTRY_TO_CURRENCY[country]
      const impact   = (r.impact ?? '').toLowerCase()

      if (!currency || !TRACKED_IMPACTS.has(impact)) return []
      if (!r.event || !r.date) return []

      // No zone marker; FMP publishes in UTC.
      const scheduledAt = new Date(r.date.replace(' ', 'T') + 'Z')
      if (Number.isNaN(scheduledAt.getTime())) return []

      return [{
        eventKey:    `fmp|${country}|${r.event}|${scheduledAt.toISOString()}`,
        country,
        currency,
        event:       r.event,
        impact:      impact as 'high' | 'medium',
        scheduledAt,
        actual:      r.actual   ?? null,
        forecast:    r.estimate ?? null,
        previous:    r.previous ?? null,
        unit:        null,
      }]
    })
  },
}

export const ACTIVE_PROVIDER: CalendarProvider = forexFactoryProvider

// ── Surprise classification ───────────────────────────────────────────────────

export type SurpriseDir = 'hotter' | 'cooler' | 'inline'

/**
 * How the print landed against expectations.
 *
 * "hotter"/"cooler" describe the number relative to forecast — NOT a trade
 * direction. Whether a hot CPI lifts or sinks a pair depends on positioning and
 * what was already priced in, which this agent does not model and should not
 * pretend to.
 *
 * The inline band is 5% of the forecast's magnitude, with an absolute floor so
 * that forecasts at or near zero (common for MoM prints) don't classify every
 * rounding difference as a surprise.
 */
export function classifySurprise(
  actual:   number | null,
  forecast: number | null,
): { surprise: number | null; dir: SurpriseDir | null } {
  if (actual == null || forecast == null) return { surprise: null, dir: null }

  const surprise = actual - forecast
  const band     = Math.max(Math.abs(forecast) * 0.05, 0.05)

  if (Math.abs(surprise) <= band) return { surprise, dir: 'inline' }
  return { surprise, dir: surprise > 0 ? 'hotter' : 'cooler' }
}

/** Human-readable one-liner, e.g. "3.1% vs 3.4% expected (prev 3.5%)". */
export function formatPrint(e: {
  actual: number | null; forecast: number | null; previous: number | null; unit: string | null
}): string {
  const u = e.unit && e.unit !== '%' ? '' : (e.unit ?? '')
  const n = (v: number | null) => v == null ? '—' : `${v}${u}`
  const parts = [`${n(e.actual)}`]
  if (e.forecast != null) parts.push(`vs ${n(e.forecast)} expected`)
  if (e.previous != null) parts.push(`(prev ${n(e.previous)})`)
  return parts.join(' ')
}

// ── First-order currency bias ─────────────────────────────────────────────────

export type CurrencyBias = 'positive' | 'negative' | 'neutral'

/**
 * Indicators where a HIGHER reading is bad for the currency.
 *
 * For most releases a beat means a stronger economy and a firmer currency, but
 * unemployment and claims invert that — rising joblessness is not good news
 * however much it beats forecast. Without this list the agent would label a
 * spike in claims as positive.
 */
const INVERSE_INDICATORS = [
  'unemployment rate', 'jobless claims', 'continuing claims', 'unemployment change',
  'claimant count', 'trade deficit', 'budget deficit', 'inventories',
]

/**
 * Whether a print reads as supportive or negative for its own currency.
 *
 * Deliberately first-order and labelled as such wherever it is shown: the real
 * reaction depends on positioning and what was already priced in, which this
 * does not model. It is a starting point for the pair analysis, not a trade
 * call.
 */
export function currencyBias(eventName: string, dir: SurpriseDir | null): CurrencyBias {
  if (!dir || dir === 'inline') return 'neutral'

  const name     = eventName.toLowerCase()
  const inverted = INVERSE_INDICATORS.some(k => name.includes(k))

  const strongPrint = dir === 'hotter'
  const supportive  = inverted ? !strongPrint : strongPrint

  return supportive ? 'positive' : 'negative'
}

// ── Commentary vs numeric releases ────────────────────────────────────────────

const COMMENTARY_KEYWORDS = [
  'speaks', 'speech', 'statement', 'press conference', 'minutes', 'testimony',
  'holiday', 'summit', 'symposium', 'remarks', 'address', 'panel', 'meeting',
  'bank holiday', 'vote', 'election', 'outlook',
]

/**
 * True for events that never carry a number: speeches, statements, press
 * conferences, holidays.
 *
 * These were being labelled "figure not published to our data source", which
 * reads as a broken feed when nothing is wrong — an RBA press conference has no
 * figure to publish and never will. They are worth showing (guidance often
 * moves price more than the print it accompanies), just not as a missing number.
 */
export function isCommentaryEvent(
  eventName: string,
  forecast: number | null,
  previous: number | null,
): boolean {
  const name = eventName.toLowerCase()
  if (COMMENTARY_KEYWORDS.some(k => name.includes(k))) return true
  // Nothing to compare against and nothing expected — there is no figure here.
  return forecast === null && previous === null
}
