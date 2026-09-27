// Photographic backdrops for lesson scenes.
//
// These are AI-generated establishing shots (Higgsfield `soul_location`),
// generated once and committed to public/scenes — not fetched at runtime, so
// renders stay deterministic and offline-safe.
//
// They are used DELIBERATELY SPARINGLY:
//   • a photo can't animate the way the SVG charts do — it can only sit there
//     and drift — so anything that actually teaches a concept keeps its
//     drawn diagram;
//   • backdrops go behind the scenes that were weakest, i.e. narrative prose
//     with no structure to illustrate, plus the lesson intro and outro.
//
// Every backdrop is darkened heavily at render time; it is scene-setting, not
// the subject.

export interface Backdrop {
  id:   string
  file: string
  /** Lower-case terms that make this backdrop the right establishing shot. */
  cues: string[]
}

export const BACKDROPS: Backdrop[] = [
  {
    id: 'world-sessions', file: 'scenes/world-sessions.jpg',
    cues: ['session', 'london', 'new york', 'tokyo', 'sydney', 'around the world',
      'global', 'worldwide', 'time zone', '24 hours', 'around the clock',
      'international', 'across the globe', 'countries', 'earth'],
  },
  {
    id: 'financial-district', file: 'scenes/financial-district.jpg',
    cues: ['bank', 'banks', 'institution', 'corporation', 'company', 'companies',
      'broker', 'brokers', 'hedge fund', 'firm', 'wall street', 'city'],
  },
  {
    id: 'trading-floor', file: 'scenes/trading-floor.jpg',
    cues: ['trading floor', 'desk', 'terminal', 'platform', 'execution',
      'liquidity', 'volume', 'order flow', 'market maker'],
  },
  {
    id: 'trader-desk', file: 'scenes/trader-desk.jpg',
    cues: ['retail trader', 'your own', 'at home', 'beginner', 'getting started',
      'your account', 'your trades', 'screen', 'monitor', 'setup', 'everyday people'],
  },
  {
    id: 'candles-abstract', file: 'scenes/candles-abstract.jpg',
    cues: ['candlestick', 'ohlc', 'price action', 'reading price',
      'market structure', 'chart pattern'],
  },
  {
    id: 'candle-macro', file: 'scenes/candle-macro.jpg',
    cues: ['single candle', 'body', 'wick', 'shadow', 'open and close',
      'timeframe', 'time frame', 'one bar'],
  },
  {
    id: 'risk-storm', file: 'scenes/risk-storm.jpg',
    cues: ['risk', 'lose', 'loss', 'losses', 'danger', 'blow up', 'wiped out',
      'drawdown', 'margin call', 'never risk', 'protect'],
  },
  {
    id: 'volatility', file: 'scenes/volatility.jpg',
    cues: ['volatility', 'volatile', 'whipsaw', 'noise', 'erratic', 'choppy',
      'spike', 'sudden', 'unpredictable', 'swings'],
  },
  {
    id: 'central-bank', file: 'scenes/central-bank.jpg',
    cues: ['central bank', 'interest rate', 'monetary policy', 'federal reserve',
      'ecb', 'bank of england', 'inflation', 'policy', 'government'],
  },
  {
    id: 'news-wall', file: 'scenes/news-wall.jpg',
    cues: ['news', 'economic calendar', 'data release', 'announcement', 'report',
      'nfp', 'gdp', 'headline', 'event', 'fundamental'],
  },
  {
    id: 'money-flow', file: 'scenes/money-flow.jpg',
    cues: ['currency pair', 'exchange', 'buy one', 'sell another', 'quote currency',
      'base currency', 'convert', 'swap', 'flow', 'capital'],
  },
  {
    id: 'discipline-dawn', file: 'scenes/discipline-dawn.jpg',
    cues: ['discipline', 'patience', 'emotion', 'psychology', 'mindset', 'calm',
      'routine', 'stick to', 'trading plan', 'rules', 'consistent'],
  },
  {
    id: 'growth-steps', file: 'scenes/growth-steps.jpg',
    cues: ['compound', 'grow', 'growth', 'consistent profit', 'long run',
      'over time', 'build', 'progress', 'improve', 'edge'],
  },
  {
    id: 'study-desk', file: 'scenes/study-desk.jpg',
    cues: ['journal', 'record', 'review', 'learn', 'study', 'practice', 'demo',
      'backtest', 'notes', 'homework', 'lesson'],
  },
  {
    id: 'market-open', file: 'scenes/market-open.jpg',
    cues: ['open', 'opening', 'start of the', 'begins', 'first', 'monday',
      'new week', 'early', 'morning'],
  },
]

const BY_ID = new Map(BACKDROPS.map(b => [b.id, b]))

/**
 * Backdrop for a scene, or null to leave the plain gradient background.
 *
 * `allow` gates which scene kinds get one at all — the caller passes true
 * only for intro/outro and unstructured prose, so photos never crowd out a
 * chart that is doing real teaching work.
 */
export function backdropFor(text: string, allow: boolean): Backdrop | null {
  return rankBackdrops(text, allow)[0] ?? null
}

/** All matching backdrops for a scene, strongest first. */
export function rankBackdrops(text: string, allow: boolean): Backdrop[] {
  if (!allow) return []
  const t = text.toLowerCase()
  return BACKDROPS
    .map(b => ({ b, score: b.cues.reduce((n, cue) => n + (t.includes(cue) ? 1 : 0), 0) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.b)
}

export interface BackdropRequest {
  text:     string
  allow:    boolean
  /** Bookends always get a shot, falling back to the deterministic pick. */
  bookend:  boolean
  fallbackKey: string
}

/**
 * Backdrops for a whole lesson.
 *
 * Done per lesson rather than per scene so it can enforce spacing: a photo
 * that just appeared is not allowed back for several scenes. Without this the
 * strongest-matching shot repeats down a whole section, which is the same
 * staleness the drawn visuals had to be fixed for.
 */
export function buildBackdropPlan(items: BackdropRequest[]): (Backdrop | null)[] {
  const out: (Backdrop | null)[] = []
  const recent: string[] = []
  const RECENT_WINDOW = 4

  for (const item of items) {
    const ranked = rankBackdrops(item.text, item.allow)
    let chosen = ranked.find(b => !recent.includes(b.id)) ?? null

    if (!chosen && item.bookend) {
      const fb = defaultBackdrop(item.fallbackKey)
      chosen = recent.includes(fb.id)
        ? BACKDROPS.find(b => !recent.includes(b.id)) ?? fb
        : fb
    }

    out.push(chosen)
    if (chosen) {
      recent.push(chosen.id)
      if (recent.length > RECENT_WINDOW) recent.shift()
    }
  }
  return out
}

export function backdropById(id: string): Backdrop | null {
  return BY_ID.get(id) ?? null
}

/**
 * Deterministic pick for scenes that should always have a backdrop (intro /
 * outro) but whose wording matches no cue list. Keyed off the lesson title so
 * a given lesson always opens on the same shot, and neighbouring lessons in a
 * module tend to differ.
 */
export function defaultBackdrop(key: string): Backdrop {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return BACKDROPS[(h >>> 0) % BACKDROPS.length]
}
