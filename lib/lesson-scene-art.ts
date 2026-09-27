// Hand-matched illustrations for specific lesson scenes.
//
// The automatic pipeline (scene spec → generic card, or a topic diagram when
// one fits) covers all 72 lessons with no per-lesson work. This table is the
// escape hatch for moments where a picture made for that exact sentence beats
// anything generic — and it takes priority over both.
//
// Lessons are worked through one at a time; anything not listed here still
// gets the automatic treatment.

export interface ArtRule {
  /** Substring of the lesson title, lower-case. Scopes the rule. */
  lesson: string
  /** All of these must appear in the scene text for the rule to fire. */
  all?: string[]
  /** Any one of these is enough. */
  any?: string[]
  art: string
  /** Passed to the illustration — used for "which tier is lit" style art. */
  variant?: number
}

export const ART_RULES: ArtRule[] = [
  // ── Module 1 · Lesson 1 — What is the Forex Market? ──────────────────────
  {
    lesson: 'what is the forex market',
    all: ['holiday'],
    art: 'currency-swap',
  },
  {
    lesson: 'what is the forex market',
    any: ['no central building', 'no headquarters'],
    art: 'decentralised',
  },
  {
    lesson: 'what is the forex market',
    any: ['big banks'],
    art: 'participant-tiers', variant: 1,
  },
  {
    lesson: 'what is the forex market',
    any: ['central banks'],
    art: 'participant-tiers', variant: 0,
  },
  {
    lesson: 'what is the forex market',
    any: ['hedge funds'],
    art: 'participant-tiers', variant: 2,
  },
  {
    lesson: 'what is the forex market',
    all: ['businesses'],
    art: 'participant-tiers', variant: 3,
  },
  {
    lesson: 'what is the forex market',
    any: ['retail traders'],
    art: 'participant-tiers', variant: 4,
  },
  {
    lesson: 'what is the forex market',
    any: ['over-the-counter', 'otc'],
    art: 'otc-vs-exchange',
  },
  {
    lesson: 'what is the forex market',
    any: ['liquidity'],
    art: 'liquidity-depth',
  },
  {
    lesson: 'what is the forex market',
    any: ['volatility'],
    art: 'volatility-compare',
  },

  // ── Module 1 · Lesson 2 — Forex Market Sessions ──────────────────────────
  // Rules are matched in order, so the specific windows are listed before the
  // general session rules that would otherwise swallow them.
  {
    lesson: 'forex market sessions',
    any: ['earth is round', 'sun is always shining', 'around the clock'],
    art: 'sun-terminator',
  },
  {
    lesson: 'forex market sessions',
    all: ['tokyo + london'],
    art: 'session-overlap', variant: 1,
  },
  {
    lesson: 'forex market sessions',
    all: ['london + new york'],
    art: 'session-overlap', variant: 0,
  },
  {
    lesson: 'forex market sessions',
    any: ['magic hours', 'session overlaps', 'two sessions are open'],
    art: 'session-overlap', variant: 0,
  },
  {
    lesson: 'forex market sessions',
    any: ['when not to trade', 'beginners should avoid'],
    art: 'session-overlap', variant: 2,
  },
  {
    lesson: 'forex market sessions',
    any: ['friday'],
    art: 'trading-week', variant: 0,
  },
  {
    lesson: 'forex market sessions',
    any: ['public holiday', 'christmas'],
    art: 'trading-week', variant: 1,
  },
  {
    lesson: 'forex market sessions',
    any: ['sydney session'],
    art: 'session-ring', variant: 0,
  },
  {
    lesson: 'forex market sessions',
    any: ['tokyo session'],
    art: 'session-ring', variant: 1,
  },
  {
    lesson: 'forex market sessions',
    any: ['london session'],
    art: 'session-ring', variant: 2,
  },
  {
    lesson: 'forex market sessions',
    any: ['new york session'],
    art: 'session-ring', variant: 3,
  },

  // ── Module 1 · Lesson 3 — How Forex Trading Works ────────────────────────
  {
    lesson: 'how forex trading works',
    all: ['three things'],
    art: 'three-pillars',
  },
  {
    lesson: 'how forex trading works',
    any: ['what is a pip', 'smallest normal price movement'],
    art: 'pip-digits', variant: 0,
  },
  {
    lesson: 'how forex trading works',
    any: ['jpy pairs'],
    art: 'pip-digits', variant: 2,
  },
  {
    lesson: 'how forex trading works',
    any: ['most pairs'],
    art: 'pip-digits', variant: 1,
  },
  {
    lesson: 'how forex trading works',
    any: ['worked example'],
    art: 'pip-math', variant: 0,
  },
  {
    lesson: 'how forex trading works',
    any: ['profit = 30 pips', '30 pips ×'],
    art: 'pip-math', variant: 1,
  },
  {
    lesson: 'how forex trading works',
    any: ['practice account', 'sound small'],
    art: 'pip-math', variant: 2,
  },
  {
    lesson: 'how forex trading works',
    any: ['what is a lot', 'size of your trade'],
    art: 'lot-ladder', variant: 0,
  },
  {
    lesson: 'how forex trading works',
    any: ['standard lot'],
    art: 'lot-ladder', variant: 1,
  },
  {
    lesson: 'how forex trading works',
    any: ['mini lot'],
    art: 'lot-ladder', variant: 2,
  },
  {
    lesson: 'how forex trading works',
    any: ['micro lot (0.01)', 'micro lot'],
    art: 'lot-ladder', variant: 3,
  },

  // ── Module 1 · Lesson 4 — Choosing a Forex Broker ────────────────────────
  // Red-flag rules come first: "unregulated" also contains "regulated", which
  // the regulator rules would otherwise claim.
  {
    lesson: 'choosing a forex broker',
    any: ['unregulated or offshore', 'no oversight'],
    art: 'red-flags', variant: 0,
  },
  {
    lesson: 'choosing a forex broker',
    any: ['guaranteed profit'],
    art: 'red-flags', variant: 1,
  },
  {
    lesson: 'choosing a forex broker',
    any: ['withdrawal difficult', 'hidden fees'],
    art: 'red-flags', variant: 2,
  },
  {
    lesson: 'choosing a forex broker',
    any: ['selecting the right broker', 'infrastructure for all your trades'],
    art: 'broker-gateway',
  },
  {
    lesson: 'choosing a forex broker',
    any: ['fca'],
    art: 'regulator-badges', variant: 1,
  },
  {
    lesson: 'choosing a forex broker',
    any: ['cftc', 'nfa'],
    art: 'regulator-badges', variant: 2,
  },
  {
    lesson: 'choosing a forex broker',
    any: ['asic'],
    art: 'regulator-badges', variant: 3,
  },
  {
    lesson: 'choosing a forex broker',
    any: ['cysec'],
    art: 'regulator-badges', variant: 4,
  },
  {
    lesson: 'choosing a forex broker',
    any: ['regulatory bodies', 'regulated broker'],
    art: 'regulator-badges', variant: 0,
  },
  {
    lesson: 'choosing a forex broker',
    any: ['trading costs', 'spreads and commissions'],
    art: 'cost-compare',
  },
  {
    lesson: 'choosing a forex broker',
    any: ['metatrader', 'mt4', 'mt5'],
    art: 'platform-window',
  },
  {
    lesson: 'choosing a forex broker',
    any: ['execution speed', 'ecn/stp', 'fast execution'],
    art: 'execution-speed',
  },

  // ── Module 1 · Lesson 5 — Setting Up Your Trading Account ────────────────
  // "Demo Account" must be tested before the bare "demo" rule, and the live
  // transition before "micro account", which appears in both.
  {
    lesson: 'setting up your trading account',
    any: ['when to go live', 'consistently profitable on demo'],
    art: 'go-live-gate',
  },
  {
    lesson: 'setting up your trading account',
    any: ['before risking real money'],
    art: 'demo-fork',
  },
  {
    lesson: 'setting up your trading account',
    any: ['demo account:', 'virtual money'],
    art: 'account-map', variant: 1,
  },
  {
    lesson: 'setting up your trading account',
    any: ['micro account'],
    art: 'account-map', variant: 2,
  },
  {
    lesson: 'setting up your trading account',
    any: ['mini account'],
    art: 'account-map', variant: 3,
  },
  {
    lesson: 'setting up your trading account',
    any: ['standard account'],
    art: 'account-map', variant: 4,
  },
  {
    lesson: 'setting up your trading account',
    any: ['ecn account'],
    art: 'account-map', variant: 5,
  },
  {
    lesson: 'setting up your trading account',
    any: ['starting with demo trading', 'demo trading is critical'],
    art: 'skill-gauges', variant: 0,
  },
  {
    lesson: 'setting up your trading account',
    any: ['learn the trading platform'],
    art: 'skill-gauges', variant: 1,
  },
  {
    lesson: 'setting up your trading account',
    any: ['test trading strategies'],
    art: 'skill-gauges', variant: 2,
  },
  {
    lesson: 'setting up your trading account',
    any: ['order types and position'],
    art: 'skill-gauges', variant: 3,
  },
  {
    lesson: 'setting up your trading account',
    any: ['discipline and emotional'],
    art: 'skill-gauges', variant: 4,
  },
  {
    lesson: 'setting up your trading account',
    any: ['account types'],
    art: 'account-map', variant: 0,
  },

  // ── Module 1 · Lesson 6 — Order Types & Trade Execution ──────────────────
  // Specific order names are tested before the general "limit orders" /
  // "stop orders" headers, and stop-loss before the bare "stop" rules.
  {
    lesson: 'order types',
    any: ['oco', 'one-cancels'],
    art: 'oco-pair',
  },
  {
    lesson: 'order types',
    any: ['stop loss:', 'closes a losing position'],
    art: 'position-exits', variant: 0,
  },
  {
    lesson: 'order types',
    any: ['take profit', 'closes a winning position'],
    art: 'position-exits', variant: 1,
  },
  {
    lesson: 'order types',
    any: ['buy limit'],
    art: 'order-ladder', variant: 1,
  },
  {
    lesson: 'order types',
    any: ['sell limit'],
    art: 'order-ladder', variant: 2,
  },
  {
    lesson: 'order types',
    any: ['buy stop'],
    art: 'order-ladder', variant: 4,
  },
  {
    lesson: 'order types',
    any: ['sell stop'],
    art: 'order-ladder', variant: 5,
  },
  {
    lesson: 'order types',
    any: ['limit orders'],
    art: 'order-ladder', variant: 0,
  },
  {
    lesson: 'order types',
    any: ['stop orders', 'becomes a market order'],
    art: 'order-ladder', variant: 3,
  },
  {
    lesson: 'order types',
    any: ['market orders', 'executes immediately'],
    art: 'market-order',
  },
  {
    lesson: 'order types',
    any: ['understanding the different order types'],
    art: 'order-pipeline',
  },
]

export interface ArtPick { art: string; variant: number }

/** Bespoke illustration for this scene, if one has been authored for it. */
export function artFor(lessonTitle: string, sceneText: string): ArtPick | null {
  const lesson = lessonTitle.toLowerCase()
  const text = sceneText.toLowerCase()

  for (const rule of ART_RULES) {
    if (!lesson.includes(rule.lesson)) continue
    if (rule.all && !rule.all.every(k => text.includes(k))) continue
    if (rule.any && !rule.any.some(k => text.includes(k))) continue
    if (!rule.all && !rule.any) continue
    return { art: rule.art, variant: rule.variant ?? 0 }
  }
  return null
}
