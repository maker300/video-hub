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
      // 401/403 here most likely means the calendar is gated to a paid plan
      // rather than a bad key — surface the status so the cron log says which.
      throw new Error(`finnhub calendar HTTP ${res.status}`)
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

export const ACTIVE_PROVIDER: CalendarProvider = finnhubProvider

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
