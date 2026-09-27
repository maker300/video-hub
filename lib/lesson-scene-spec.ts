// Turns one lesson scene into a bespoke card spec.
//
// The previous approach picked from a fixed library of ~22 illustrations, so
// a long lesson cycled the same few pictures. This reads what the narrator is
// ACTUALLY saying in this scene — the numbers, the currency pairs, the times,
// the label/detail structure — and describes a card built from that content.
// Two scenes only look alike if they genuinely say the same thing.
//
// Pure string work: no API call, no network, deterministic.

export interface SceneCue {
  type:    string
  heading: string
  body:    string
  meta?:   string
}

export type SceneLayout =
  | 'stat'      // one dominant figure pulled from the text
  | 'chips'     // a set of named things (pairs, cities, entities)
  | 'timeline'  // labelled time ranges
  | 'dual'      // two opposed ideas
  | 'callout'   // label → detail, the workhorse
  | 'concept'   // a key term lifted out of the prose, with the sentence
  | 'quote'     // a single punchy line, nothing else to pull out
  | 'diagram'   // a proper chart diagram, when the scene is really about it
  | 'art'       // a bespoke illustration authored for this exact scene
  | 'define'    // term + definition

export interface SceneSpec {
  layout:  SceneLayout
  /** Small kicker above the card, e.g. "3 Things That Make Forex Special". */
  title?:  string
  /** Headline line of the card. */
  label?:  string
  /** Supporting sentence. */
  detail?: string
  stat?:   { value: string; caption?: string }
  /** The term this scene is really about, lifted from its own wording. */
  keyphrase?: string
  /** Other terms the scene mentions, used to avoid repeating a key phrase. */
  keyphraseAlts?: string[]
  /** Diagram to draw instead of a text card, when the scene earns one. */
  diagramId?: string
  diagramVariant?: number
  /** Bespoke illustration authored for this scene; outranks everything. */
  artId?: string
  artVariant?: number
  chips?:  string[]
  times?:  { label: string; from: string; to: string }[]
  dual?:   { left: string; right: string }
  accent:  'bull' | 'bear' | 'amber' | 'blue' | 'violet'
  /** Deterministic per-scene seed — drives chart data and small layout shifts. */
  seed:    number
  /** Whether a decorative seeded mini-chart should be drawn behind/below. */
  chart:   'none' | 'spark' | 'candles'
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Lesson prose runs words together after times/numbers ("07:00Quiet"). */
export function normaliseProse(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/(\d)([A-Z])/g, '$1. $2')
    .replace(/([a-z])([A-Z][a-z])/g, '$1. $2')
    // Source prose leaves "…for most traders:." — render that as a full stop
    // rather than printing both marks on screen.
    .replace(/\s*:\s*\./g, '.')
    .replace(/\.{2,}/g, '.')
    .trim()
}

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu
const strip = (s: string) => s.replace(EMOJI, '').replace(/\s+/g, ' ').trim()

const PAIR_RE  = /\b([A-Z]{3})\/([A-Z]{3})\b/g
const TIME_RE  = /\b(\d{1,2}:\d{2})\s*(?:to|–|—|-)\s*(\d{1,2}:\d{2})\b/g
const MONEY_RE = /[$£€]\s?\d[\d,.]*\s?(?:trillion|billion|million|bn|tn|k)?/gi
const PCT_RE   = /\b\d+(?:\.\d+)?\s?%/g
const RATIO_RE = /\b\d+\s?:\s?\d+\b/g
const PIPS_RE  = /\b\d+(?:\.\d+)?\s?pips?\b/gi
const COUNT_RE = /\b(\d+)\s+(hours?|days?|weeks?|months?|years?|sessions?|things?|steps?|types?|reasons?|rules?|ways?|mistakes?)\b/gi

const DUAL_HINTS: [RegExp, [string, string]][] = [
  [/\bup or down\b/i,            ['UP', 'DOWN']],
  [/\blong\b.*\bshort\b/i,       ['LONG', 'SHORT']],
  [/\bbuy\b.*\bsell\b/i,         ['BUY', 'SELL']],
  [/\bbid\b.*\bask\b/i,          ['BID', 'ASK']],
  [/\bbullish\b.*\bbearish\b/i,  ['BULLISH', 'BEARISH']],
  [/\bprofit\b.*\bloss\b/i,      ['PROFIT', 'LOSS']],
  [/\brisk\b.*\breward\b/i,      ['RISK', 'REWARD']],
  [/\bwin\b.*\blose\b/i,         ['WIN', 'LOSE']],
]

const ACCENTS: SceneSpec['accent'][] = ['bull', 'blue', 'amber', 'violet', 'bear']

// Domain vocabulary, longest first so "stop loss" beats "stop". A scene's
// key phrase is what the card leads with, so this is what makes two prose
// scenes in the same lesson look like different cards.
const GLOSSARY = [
  'risk-to-reward', 'risk to reward', 'risk management', 'money management',
  'support and resistance', 'technical analysis', 'fundamental analysis',
  'central bank', 'interest rate', 'economic calendar', 'trading plan',
  'trading journal', 'position size', 'lot size', 'pip value', 'stop loss',
  'take profit', 'moving average', 'candlestick', 'price action', 'order book',
  'market order', 'limit order', 'currency pair', 'base currency',
  'quote currency', 'trading session', 'time frame', 'timeframe',
  'breakout', 'pullback', 'retracement', 'divergence', 'momentum',
  'volatility', 'liquidity', 'leverage', 'margin', 'spread', 'slippage',
  'drawdown', 'exposure', 'hedging', 'scalping', 'swing trading',
  'day trading', 'resistance', 'support', 'trend', 'broker', 'equity',
  'volume', 'session', 'signal', 'strategy', 'discipline', 'psychology',
  'confirmation', 'reversal', 'consolidation', 'correlation',
]

/**
 * Candidate terms this scene is about, strongest first. A list rather than a
 * single value so the lesson-level pass can skip one that was just used and
 * still lead with something the scene genuinely says.
 */
function findKeyphrases(text: string): string[] {
  const out: string[] = []

  // Something the author explicitly quoted or shouted is the strongest signal.
  const quoted = text.match(/["“']([A-Za-z][A-Za-z \-]{2,26})["”']/)
  if (quoted) out.push(quoted[1].trim())

  const shout = text.match(/\b([A-Z]{2,})\b(?!\/)/)
  if (shout && !['GMT', 'USD', 'EUR', 'GBP', 'JPY', 'UK', 'US'].includes(shout[1])) {
    out.push(shout[1])
  }

  const lower = text.toLowerCase()
  for (const term of GLOSSARY) {
    if (lower.includes(term)) out.push(term)
  }
  return uniq(out)
}

function uniq(list: string[]): string[] {
  return Array.from(new Set(list))
}

/**
 * Keeps enough of the sentence to make the point. One sentence is often a
 * set-up with no payoff ("Imagine you're going on holiday to America."), so
 * a second is taken when there's room.
 */
function firstSentence(s: string, max = 170): string {
  const parts = s.split(/(?<=[.!?])\s/)
  let out = parts[0] ?? s
  if (parts[1] && out.length + parts[1].length + 1 <= max) out += ' ' + parts[1]
  return out.length > max ? out.slice(0, max - 1).trimEnd() + '…' : out
}

// ── Main ────────────────────────────────────────────────────────────────────

export function buildSceneSpec(cue: SceneCue): SceneSpec | null {
  if (cue.type === 'intro' || cue.type === 'outro' || cue.type === 'section-header') {
    return null
  }

  const rawBody = `${cue.body ?? ''} ${cue.meta ?? ''}`.trim()
  if (!rawBody) return null

  const body = normaliseProse(rawBody)
  const seed = hashStr(`${cue.heading}|${rawBody}`)
  const accent = ACCENTS[seed % ACCENTS.length]

  // ── Pull structured content out of the sentence ──────────────────────────

  // "The Four Sessions (all times in GMT): ..." → title + remainder
  let title: string | undefined
  let rest = body
  // The first colon is NOT always the title separator — "22:00 to 07:00"
  // has one too, and splitting there leaves a title of "Tokyo Session — 00"
  // and a body starting "00 to 09:00". Skip colons flanked by digits.
  let colon = -1
  for (let i = 0; i < Math.min(body.length, 90); i++) {
    if (body[i] !== ':') continue
    if (/\d/.test(body[i - 1] ?? '') && /\d/.test(body[i + 1] ?? '')) continue
    colon = i
    break
  }
  if (colon > 0 && colon < 74) {
    const head = strip(body.slice(0, colon))
    const tail = body.slice(colon + 1).trim()
    if (head.length > 3 && tail.length > 8) {
      title = head.replace(/\s*\([^)]*\)\s*$/, '').trim()
      rest = tail
    }
  }

  // "Sydney Session — 22:00 to 07:00. Quiet start to the week."
  let label: string | undefined
  let detail: string | undefined
  const dash = rest.match(/^(.{3,64}?)\s+[—–]\s+(.+)$/)
  if (dash) {
    label = strip(dash[1])
    detail = firstSentence(strip(dash[2]))
  } else {
    label = undefined
    detail = firstSentence(strip(rest))
  }

  const pairs = uniq((body.match(PAIR_RE) ?? []))
  const times = Array.from(body.matchAll(TIME_RE)).map(m => ({ from: m[1], to: m[2] }))
  // A clock time ("22:00") satisfies the ratio pattern, so ratios are read
  // from text with the time ranges taken out — otherwise every session scene
  // renders "22:00" as though it were a risk-reward ratio.
  const bodyNoTimes = body.replace(TIME_RE, ' ').replace(/\b\d{1,2}:\d{2}\b/g, ' ')

  // Parenthetical or comma list of named things: "(London, New York, Tokyo)"
  const paren = body.match(/\(([^)]{6,90})\)/)
  const parenItems = paren
    ? paren[1]
        .split(/,\s*|\s+and\s+/)
        .map(s => strip(s).replace(/^(?:like|such as|e\.g\.?|including)\s+/i, ''))
        .filter(s => s.length > 1 && s.length < 22)
    : []

  const money = bodyNoTimes.match(MONEY_RE) ?? []
  const pct   = bodyNoTimes.match(PCT_RE) ?? []
  const ratio = bodyNoTimes.match(RATIO_RE) ?? []
  const pips  = bodyNoTimes.match(PIPS_RE) ?? []
  const count = Array.from(bodyNoTimes.matchAll(COUNT_RE))

  const dualHit = DUAL_HINTS.find(([re]) => re.test(body))

  // ── Choose the layout that fits what we actually found ───────────────────

  // 1. A hard figure is the most striking thing a scene can have.
  const statValue =
    money[0] ?? pct[0] ?? ratio[0] ?? pips[0] ??
    (count.length > 0 ? `${count[0][1]} ${count[0][2]}` : undefined)

  // 1. Explicit time ranges → timeline.
  if (times.length > 0) {
    return {
      layout: 'timeline', title,
      label: label ?? undefined,
      detail,
      times: times.slice(0, 4).map((t, i) => ({
        label: label && times.length === 1 ? label : `Window ${i + 1}`,
        from: t.from, to: t.to,
      })),
      accent, seed, chart: 'none',
    }
  }

  // 2. A hard figure is the most striking thing a scene can have.
  if (statValue && (money.length > 0 || pct.length > 0 || ratio.length > 0 || pips.length > 0)) {
    return {
      layout: 'stat', title, label,
      stat: { value: strip(statValue), caption: detail },
      accent, seed,
      chart: 'spark',
    }
  }

  // 3. Named things worth showing as chips.
  const chips = uniq([...pairs, ...parenItems]).slice(0, 6)
  if (chips.length >= 2) {
    // The chips usually came out of a bracket inside the label, so leaving
    // the bracket in prints the same names twice on one card.
    const chipLabel = label?.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
    return {
      layout: 'chips', title, label: chipLabel || label, detail, chips,
      accent, seed, chart: 'none',
    }
  }

  // 4. Two opposed ideas.
  if (dualHit) {
    return {
      layout: 'dual', title, label, detail,
      dual: { left: dualHit[1][0], right: dualHit[1][1] },
      accent, seed, chart: 'none',
    }
  }

  // 5. A defined term.
  if (cue.type === 'term') {
    return {
      layout: 'define',
      label: strip(cue.heading) || label,
      detail: firstSentence(strip(cue.body ?? ''), 180),
      accent, seed, chart: 'none',
    }
  }

  // 6. Otherwise shape the card around what the scene actually has: a bare
  // sentence reads as a pull quote, a short label with a gloss reads as a
  // definition, and anything richer gets the label/detail callout.
  if (!label && !detail) return null

  if (!label && detail) {
    // Only from the spoken sentence — pulling from `body` let the lesson
    // heading leak in, so four scenes in a row led with the word "trend"
    // while their sentences were about completely different things. A term
    // already sitting in the kicker is dropped for the same reason.
    const kicker = (title ?? '').toLowerCase()
    const candidates = findKeyphrases(detail)
      .filter(k => !kicker.includes(k.toLowerCase()))
    if (candidates.length > 0) {
      return {
        layout: 'concept', title, keyphrase: candidates[0], keyphraseAlts: candidates,
        detail, accent, seed,
        chart: seed % 3 === 0 ? 'candles' : 'spark',
      }
    }
    return { layout: 'quote', title, detail, accent, seed, chart: seed % 2 === 0 ? 'spark' : 'candles' }
  }

  if (label && label.length <= 30 && detail) {
    return { layout: 'define', title, label, detail, accent, seed, chart: 'none' }
  }

  return {
    layout: 'callout', title, label, detail,
    accent, seed,
    chart: seed % 3 === 0 ? 'candles' : 'spark',
  }
}

/**
 * Specs for a whole lesson, with a nudge for variety: if a layout would
 * repeat back to back, the seed is rotated so the card at least composes
 * differently (different chart data, accent and alignment).
 */
export function buildSceneSpecs(
  cues: SceneCue[],
  /** (cue) => diagram id, injected so this module stays free of render code. */
  diagramFor?: (cue: SceneCue) => string | null,
  variantCounts: Record<string, number> = {},
  /** Bespoke per-scene illustration lookup, checked before anything else. */
  artFor?: (cue: SceneCue) => { art: string; variant: number } | null,
): (SceneSpec | null)[] {
  const out: (SceneSpec | null)[] = []
  let prevLayout: SceneLayout | null = null
  let prevAccent: string | null = null
  const recentPhrases: string[] = []
  // Diagrams are the richest thing on screen, so they're rationed: a given
  // diagram can't come back until several scenes have passed, which is what
  // stopped the old build cycling the same chart through a whole lesson.
  const recentDiagrams: string[] = []
  const diagramUses: Record<string, number> = {}

  for (const cue of cues) {
    const spec = buildSceneSpec(cue)
    if (!spec) { out.push(null); continue }

    // A hand-authored illustration always wins: it was written for this
    // sentence, so nothing generic can beat it.
    const art = artFor?.(cue) ?? null
    if (art) {
      spec.layout = 'art'
      spec.artId = art.art
      spec.artVariant = art.variant
      out.push(spec)
      prevLayout = spec.layout
      prevAccent = spec.accent
      continue
    }

    // A diagram may stand in for a weak, generic card — but never for a
    // layout built from something concrete the scene actually said. A
    // "$7.5 trillion" stat reads far harder than a stock currency diagram.
    const WEAK: SceneLayout[] = ['quote', 'concept', 'callout', 'define']
    const diagram = WEAK.includes(spec.layout) ? (diagramFor?.(cue) ?? null) : null
    if (diagram && !recentDiagrams.includes(diagram)) {
      const uses = diagramUses[diagram] ?? 0
      spec.layout = 'diagram'
      spec.diagramId = diagram
      spec.diagramVariant = uses % Math.max(variantCounts[diagram] ?? 1, 1)
      diagramUses[diagram] = uses + 1
      recentDiagrams.push(diagram)
      if (recentDiagrams.length > 5) recentDiagrams.shift()
    }

    // Lead with a term this scene mentions that hasn't just been used. If
    // every candidate is stale, drop to a quote card — repeating the same
    // hero word is the thing this whole pass exists to avoid.
    if (spec.keyphrase && recentPhrases.includes(spec.keyphrase.toLowerCase())) {
      const fresh = (spec.keyphraseAlts ?? [])
        .find(k => !recentPhrases.includes(k.toLowerCase()))
      if (fresh) {
        spec.keyphrase = fresh
      } else if (spec.layout === 'concept') {
        spec.layout = 'quote'
        spec.keyphrase = undefined
      }
    }
    if (spec.keyphrase) {
      recentPhrases.push(spec.keyphrase.toLowerCase())
      if (recentPhrases.length > 6) recentPhrases.shift()
    }

    if (spec.layout === prevLayout) {
      spec.seed = (spec.seed * 2654435761) >>> 0
      if (spec.accent === prevAccent) {
        spec.accent = ACCENTS[(ACCENTS.indexOf(spec.accent) + 1 + (spec.seed % 3)) % ACCENTS.length]
      }
    }

    out.push(spec)
    prevLayout = spec.layout
    prevAccent = spec.accent
  }
  return out
}
