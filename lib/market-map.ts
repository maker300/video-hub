/**
 * Which tracked instruments a currency's macro releases bear on.
 *
 * Used by the FM News agent to answer "a US CPI print just landed — which of
 * the pairs we cover does that touch?". Deliberately exposure-only: being on
 * this list means the release is relevant to the instrument, not that it should
 * be bought or sold.
 *
 * NOTE: app/api/news/[slug]/route.ts holds an overlapping `ffCurrencies` table
 * inside its route-local PAIR_CONFIG. That one drives per-pair article
 * filtering and predates this file. The two should be consolidated — this is
 * the better home — but that route is working and the refactor is not free, so
 * it is left alone for now. If you add a pair, add it in both places.
 */

/** Instrument slug -> the currencies whose macro data moves it. */
const SLUG_CURRENCIES: Record<string, string[]> = {
  // ── Majors ──
  'eur-usd': ['EUR', 'USD'],
  'gbp-usd': ['GBP', 'USD'],
  'usd-jpy': ['USD', 'JPY'],
  'aud-usd': ['AUD', 'USD'],
  'usd-cad': ['USD', 'CAD'],
  'usd-chf': ['USD', 'CHF'],
  'nzd-usd': ['NZD', 'USD'],
  // ── Crosses ──
  'eur-gbp': ['EUR', 'GBP'],
  'eur-jpy': ['EUR', 'JPY'],
  'gbp-jpy': ['GBP', 'JPY'],
  'eur-aud': ['EUR', 'AUD'],
  'eur-cad': ['EUR', 'CAD'],
  'eur-chf': ['EUR', 'CHF'],
  'gbp-aud': ['GBP', 'AUD'],
  'gbp-cad': ['GBP', 'CAD'],
  'gbp-chf': ['GBP', 'CHF'],
  'aud-cad': ['AUD', 'CAD'],
  'aud-jpy': ['AUD', 'JPY'],
  'usd-mxn': ['USD', 'MXN'],
  'usd-sgd': ['USD', 'SGD'],
  // ── Dollar index ──
  'us-dxy':  ['USD'],
  // ── Commodities: priced in USD, so USD data is the dominant macro driver ──
  'xau-usd': ['USD'],
  'xag-usd': ['USD'],
  'wti-usd': ['USD'],
  'copper':  ['USD'],
  // ── Indices ──
  'nas-100': ['USD'],
}

/**
 * Crypto is intentionally excluded from macro mapping.
 *
 * BTC/ETH do react to US rate expectations, but the relationship is far looser
 * and less consistent than for FX, and tagging every CPI print as "affects
 * BTC/USD" would make the alerts noisy enough that users tune them out. Revisit
 * only with evidence.
 */

/** Currency code -> instrument slugs it bears on. Inverted from the table above. */
export const CURRENCY_TO_SLUGS: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {}
  for (const [slug, currencies] of Object.entries(SLUG_CURRENCIES)) {
    for (const c of currencies) {
      (out[c] ??= []).push(slug)
    }
  }
  return out
})()

/** Instrument slugs affected by a release in `currency`. Empty if untracked. */
export function slugsForCurrency(currency: string): string[] {
  return CURRENCY_TO_SLUGS[currency.toUpperCase()] ?? []
}

/** Display label for a slug, e.g. "eur-usd" -> "EUR/USD". */
export function displayForSlug(slug: string): string {
  const special: Record<string, string> = {
    'us-dxy': 'US Dollar Index',
    'nas-100': 'NAS 100',
    'copper': 'Copper',
    'wti-usd': 'WTI/USD',
  }
  if (special[slug]) return special[slug]
  const parts = slug.split('-')
  return parts.length === 2 ? `${parts[0].toUpperCase()}/${parts[1].toUpperCase()}` : slug.toUpperCase()
}
