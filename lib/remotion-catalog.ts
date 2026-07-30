// Catalog of Remotion motion-graphic components that Video Hub can render.
//
// Each entry is what Claude sees when planning a lesson video — name and a
// short description of when to pick it. The component itself lives in
// /remotion/stills/ (or /remotion/stills/charts/) and Video Hub imports it
// by `name` when assembling the composition.

export interface MotionGraphic {
  name:        string   // matches the Remotion component name 1:1
  topic:       string   // editorial keywords for Claude's matching
  description: string   // shown to Claude in the planning prompt
}

export const REMOTION_CATALOG: MotionGraphic[] = [
  { name: 'CandlestickAnatomy',   topic: 'candlestick parts', description: 'Single candle showing body, wicks, open/close. Pick for any segment explaining candle structure.' },
  { name: 'CandleTypes',          topic: 'candle types',      description: 'Bullish vs bearish vs doji comparison. Pick when contrasting candle types.' },
  { name: 'MultiCandlePatterns',  topic: 'candle patterns',   description: 'Engulfing, pin bar, inside bar. Pick for multi-candle pattern segments.' },
  { name: 'Trends',               topic: 'trend definition',  description: 'Higher highs / lower lows trend visual. Pick when defining uptrend / downtrend.' },
  { name: 'HeadAndShoulders',     topic: 'reversal pattern',  description: 'Head & shoulders top/bottom diagram. Pick for that specific pattern.' },
  { name: 'ChartPatterns',        topic: 'chart patterns',    description: 'Triangle, flag, wedge overview. Pick for chart-pattern catalog segments.' },
  { name: 'TradeEntry',           topic: 'entry execution',   description: 'Entry zone, stop loss, take profit visual. Pick when explaining trade mechanics.' },
  { name: 'SupportResistance',    topic: 'support resistance',description: 'S/R levels on a price line. Pick when defining or showing S/R.' },
  { name: 'CandlestickChart',     topic: 'chart with candles',description: 'Animated candlestick chart sequence. Pick for general "look at this chart" framing.' },
  { name: 'MovingAveragesChart',  topic: 'EMA SMA',           description: 'Price line with moving average overlays. Pick for MA explanation.' },
  { name: 'RSIMACDChart',         topic: 'oscillators',       description: 'RSI and MACD indicator panels. Pick for momentum oscillator segments.' },
  { name: 'FibonacciChart',       topic: 'fib retracement',   description: 'Fibonacci retracement levels drawn on price. Pick for fib segments.' },
  { name: 'PriceActionChart',     topic: 'price action',      description: 'Clean candles emphasising price action. Pick for "naked chart" / price-action-only segments.' },
  { name: 'BollingerBandsChart',  topic: 'bollinger bands',   description: 'Price with Bollinger Bands envelope. Pick for BB segments.' },
  { name: 'BreakoutChart',        topic: 'breakout',          description: 'Breakout of a range or level. Pick when explaining breakouts.' },
  { name: 'WhatIsForex',          topic: 'forex basics',      description: 'Currencies exchanging on a world map. Pick for intro-to-forex segments.' },
  { name: 'CurrencyPairs',        topic: 'currency pairs',    description: 'Major pairs with codes. Pick when listing or explaining pairs.' },
  { name: 'PipsAndLots',          topic: 'pips lots',         description: 'Pip size + lot size visualisation. Pick for pip/lot segments.' },
  { name: 'BidAskSpread',         topic: 'bid ask spread',    description: 'Bid vs ask price with spread highlighted. Pick when explaining spread.' },
  { name: 'LeverageExplained',    topic: 'leverage',          description: 'Margin × leverage = position size visual. Pick for leverage segments.' },
  { name: 'BullBearMarket',       topic: 'bull bear',         description: 'Bull and bear market trend visual. Pick when contrasting market modes.' },
  { name: 'RiskRewardVisual',     topic: 'risk reward',       description: 'R-multiple stop and target visualisation. Pick for risk:reward segments.' },
  { name: 'TradingSessionsMap',   topic: 'sessions',          description: 'World map of London / NY / Tokyo / Sydney sessions. Pick for session-timing segments.' },
  { name: 'TraderMindset',        topic: 'psychology',        description: 'Calm vs panicked trader contrast. Pick for trading-psychology segments.' },
  { name: 'StopLossVisual',       topic: 'stop loss',         description: 'Stop loss order on a chart. Pick for SL-specific segments.' },
]

/** Compact list for the Claude planning prompt. */
export function catalogForPrompt(): string {
  return REMOTION_CATALOG
    .map(g => `- ${g.name}: ${g.description}`)
    .join('\n')
}
