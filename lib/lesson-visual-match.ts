// Decides when a scene has earned a full chart diagram.
//
// Most scenes render a bespoke card built from their own wording (see
// lib/lesson-scene-spec.ts). This module answers the narrower question: is
// this scene so squarely about one charting concept that the real diagram
// beats a text card? Pure keyword scoring — no API call, no cost, no network.

export interface VisualCue {
  type:    string
  heading: string
  body:    string
  meta?:   string
}

/** Keyword sets per visual. Order within a list doesn't matter. */
const KEYWORDS: Record<string, string[]> = {
  'candle-anatomy': [
    'candlestick', 'candle body', 'wick', 'shadow', 'open and close',
    'anatomy', 'body of the candle', 'high and low',
  ],
  'candle-types': [
    'bullish candle', 'bearish candle', 'doji', 'candle type', 'green candle',
    'red candle', 'indecision',
  ],
  'candle-patterns': [
    'engulfing', 'pin bar', 'hammer', 'shooting star', 'inside bar',
    'candlestick pattern', 'morning star', 'evening star', 'rejection',
  ],
  'trend-up': [
    'uptrend', 'higher high', 'higher low', 'bull market', 'bullish trend',
    'rising', 'upward trend',
  ],
  'trend-down': [
    'downtrend', 'lower high', 'lower low', 'bear market', 'bearish trend',
    'falling', 'downward trend',
  ],
  'support-resistance': [
    'support', 'resistance', 'key level', 'price level', 'supply and demand',
    'bounce', 'floor', 'ceiling', 'zone',
  ],
  'breakout': [
    'breakout', 'break out', 'consolidation', 'range bound', 'squeeze',
    'expansion', 'break above', 'break below', 'false break',
  ],
  'risk-reward': [
    'risk reward', 'risk-reward', 'risk to reward', 'r multiple', 'reward ratio',
    'take profit', 'profit target', 'position sizing', 'risk per trade',
    '1:2', '1:3', 'money management',
  ],
  'stop-loss': [
    'stop loss', 'stop-loss', 'stopped out', 'cut your loss', 'exit the trade',
    'protective stop', 'stop order',
  ],
  'moving-average': [
    'moving average', 'ema', 'sma', 'crossover', 'golden cross', 'death cross',
    'average price', 'trend following indicator',
  ],
  'oscillator': [
    'rsi', 'macd', 'stochastic', 'oscillator', 'momentum', 'overbought',
    'oversold', 'divergence', 'indicator reading',
  ],
  'fibonacci': [
    'fibonacci', 'fib', 'retracement', 'golden ratio', '61.8', '38.2',
    'pullback level',
  ],
  'head-shoulders': [
    'head and shoulders', 'neckline', 'double top', 'double bottom',
    'reversal pattern', 'chart pattern', 'triangle', 'wedge', 'flag',
  ],
  'pips-lots': [
    'pip', 'pips', 'lot size', 'standard lot', 'mini lot', 'micro lot',
    'position size', 'units of currency', 'pip value',
  ],
  'spread': [
    'spread', 'bid', 'ask', 'bid-ask', 'transaction cost', 'commission',
    'broker cost', 'slippage',
  ],
  'leverage': [
    'leverage', 'margin', 'margin call', 'leveraged', 'borrowed',
    'buying power', 'gearing',
  ],
  'sessions': [
    'session', 'london', 'new york', 'tokyo', 'sydney', 'market hours',
    'overlap', 'trading hours', 'time zone', 'when to trade',
  ],
  'psychology': [
    'psychology', 'emotion', 'discipline', 'fear', 'greed', 'patience',
    'mindset', 'revenge trad', 'overtrad', 'journal', 'confidence',
    'stick to your plan', 'trading plan',
  ],
  'currency-pairs': [
    'currency pair', 'base currency', 'quote currency', 'major pair',
    'cross pair', 'exotic', 'eur/usd', 'gbp/usd', 'usd/jpy',
  ],
  'what-is-forex': [
    'what is forex', 'foreign exchange', 'currency market', 'forex market',
    'largest market', 'trillion', 'exchange one currency', 'global market',
  ],
  'order-types': [
    'market order', 'limit order', 'stop order', 'pending order',
    'order type', 'execution', 'fill',
  ],
  'price-action': [
    'price action', 'chart', 'naked chart', 'reading price', 'market structure',
  ],
}

function scoreVisual(text: string, heading: string, keywords: string[]): number {
  let score = 0
  for (const kw of keywords) {
    if (heading.includes(kw)) score += 3      // heading is the slide's subject
    else if (text.includes(kw)) score += 1
  }
  return score
}

/**
 * Best-matching diagram for one scene, or null if nothing matches strongly.
 * `minScore` is deliberately high: a diagram should only displace the scene's
 * own bespoke card when the scene is genuinely about that concept.
 */
export function bestDiagram(cue: VisualCue, minScore = 3): string | null {
  const heading = (cue.heading ?? '').toLowerCase()
  const text = `${cue.heading ?? ''} ${cue.body ?? ''} ${cue.meta ?? ''}`.toLowerCase()
  let best: { id: string; score: number } | null = null
  for (const [id, kws] of Object.entries(KEYWORDS)) {
    const score = scoreVisual(text, heading, kws)
    if (score >= minScore && (!best || score > best.score)) best = { id, score }
  }
  return best?.id ?? null
}
