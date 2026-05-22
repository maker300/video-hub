import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { ChatMessage } from '@/types'

const FOREX_KNOWLEDGE: Record<string, string[]> = {
  pip: [
    'A pip (percentage in point) is the smallest standard price movement in forex. For most pairs it\'s the 4th decimal place (0.0001). For JPY pairs it\'s the 2nd decimal (0.01). On a standard lot (100,000 units), 1 pip = $10 for EUR/USD.',
  ],
  spread: [
    'The spread is the difference between the bid (sell) and ask (buy) price. It\'s the broker\'s primary cost. For EUR/USD, typical spreads are 0.5–2 pips with ECN brokers, wider with market makers.',
  ],
  leverage: [
    'Leverage lets you control a larger position than your account balance. 100:1 leverage means $1,000 controls $100,000. While this amplifies profits, it equally amplifies losses. Professional traders use 5:1 to 10:1 effective leverage.',
  ],
  'risk management': [
    'Risk management is the most important skill in trading. The key rule: never risk more than 1-2% of your account on a single trade. This protects you through losing streaks while keeping capital intact to recover.',
  ],
  'stop loss': [
    'A stop loss is an order to close a trade at a maximum loss level. Place it beyond a key technical level (support/resistance) to give the trade room while limiting risk. Never move a stop further away to avoid a loss.',
  ],
  support: [
    'Support is a price level where buying pressure has historically prevented further decline — a "floor." The more times it\'s been tested and held, the more significant it is. Broken support often becomes new resistance.',
  ],
  resistance: [
    'Resistance is a price level where selling pressure has historically prevented further rises — a "ceiling." Like support, more tests make it stronger. Broken resistance often becomes new support (role reversal).',
  ],
  trend: [
    'An uptrend is defined by higher highs and higher lows. A downtrend has lower highs and lower lows. "The trend is your friend" — always identify the trend on higher timeframes before looking for entries on lower timeframes.',
  ],
  fibonacci: [
    'Fibonacci retracements identify potential support/resistance levels. Key levels: 38.2%, 50%, 61.8% (the golden ratio). Draw from swing low to swing high in an uptrend to find retracement support levels.',
  ],
  candlestick: [
    'Candlesticks show Open, High, Low, Close for a period. A green/white body = close above open (bullish). Red/black = close below open (bearish). The wicks show the high and low. Key patterns: Hammer, Doji, Engulfing.',
  ],
  rsi: [
    'RSI (Relative Strength Index) measures momentum from 0-100. Above 70 = overbought (potential reversal down). Below 30 = oversold (potential bounce). RSI divergence — when price makes new high/low but RSI doesn\'t — is a powerful reversal signal.',
  ],
  macd: [
    'MACD = 12 EMA - 26 EMA. The signal line is a 9-period EMA of MACD. When MACD crosses above signal: bullish. Below signal: bearish. The histogram shows momentum. MACD divergence is a leading reversal indicator.',
  ],
  psychology: [
    'Trading psychology accounts for ~80% of success. The key biases to overcome: fear of loss (causes early exits), greed (causes overtrading), revenge trading (increasing size after losses). Focus on process execution, not outcomes.',
  ],
  'position sizing': [
    'Formula: Risk Amount = Account × Risk%. Then: Lot Size = Risk Amount ÷ (Stop Loss pips × Pip value per lot). Example: $10,000 account, 1% risk, 50-pip stop, EUR/USD: ($100 ÷ 50) ÷ $10 = 0.2 lots.',
  ],
}

function generateResponse(message: string, lessonTitle: string, moduleTitle: string): string {
  const msgLower = message.toLowerCase()

  // Check for specific forex topics
  for (const [keyword, responses] of Object.entries(FOREX_KNOWLEDGE)) {
    if (msgLower.includes(keyword)) {
      const response = responses[0]
      return `${response}\n\nThis relates directly to what you're learning in **${lessonTitle}**. Would you like me to explain any specific aspect in more detail?`
    }
  }

  // Context-aware responses
  if (msgLower.includes('explain') || msgLower.includes('simple') || msgLower.includes('what is') || msgLower.includes('what are')) {
    return `Great question about **${lessonTitle}**! The core concept here is understanding how price movements and market dynamics work together. In the context of ${moduleTitle}, this builds on the foundational knowledge of how markets are driven by supply and demand.\n\nCould you tell me which specific part you'd like me to break down? I want to make sure I address exactly what's unclear for you.`
  }

  if (msgLower.includes('example') || msgLower.includes('practical')) {
    return `Here's a practical example related to **${lessonTitle}**:\n\nImagine you're trading EUR/USD. You've analyzed the chart and identified a key support level at 1.0850. You enter a long trade at 1.0855 with a stop loss at 1.0820 (35 pips below support) and a take profit at 1.0960 (3:1 R:R). This setup incorporates the principles from ${moduleTitle} — using technical levels to define risk and reward precisely.\n\nDoes this help illustrate the concept? Feel free to ask for more examples!`
  }

  if (msgLower.includes('mistake') || msgLower.includes('wrong') || msgLower.includes('avoid')) {
    return `The most common mistakes in **${lessonTitle}** and ${moduleTitle}:\n\n1. **Ignoring the higher timeframe** — always check daily/weekly before trading lower timeframes\n2. **Moving stop losses** — if the setup is invalid, close the trade; don't move stops\n3. **Overtrading** — quality over quantity; wait for high-probability setups\n4. **Ignoring risk management** — position sizing is more important than entry timing\n\nWhich of these do you want to dive deeper into?`
  }

  if (msgLower.includes('how') || msgLower.includes('strategy') || msgLower.includes('apply')) {
    return `To apply the concepts from **${lessonTitle}** in your trading:\n\n**Step 1:** Start on the daily chart to identify the major trend direction\n**Step 2:** Drop to the 4H to find key support/resistance and potential setups\n**Step 3:** Use the 1H for precise entry with a confirmation signal (candlestick pattern)\n**Step 4:** Calculate position size using the 1-2% rule\n**Step 5:** Set stop and target, then let the trade work\n\nThe key is consistency — apply the same process every time. What aspect of the application would you like help with?`
  }

  if (msgLower.includes('difference') || msgLower.includes('vs') || msgLower.includes('compare')) {
    return `That's a great comparison question! In the context of **${moduleTitle}**, the key distinction often comes down to:\n\n- **Timeframe perspective** — Short-term noise vs. long-term trend\n- **Risk profile** — How much capital is at stake and over what period\n- **Market conditions** — Trending vs. ranging environments call for different approaches\n\nCould you be more specific about what you're comparing? I can give you a much more precise answer!`
  }

  // Default response
  const defaultResponses = [
    `That's an insightful question about **${lessonTitle}**! This topic is central to ${moduleTitle}. The key principle to understand is that in forex, every decision should be backed by analysis, not emotion. What specific aspect would you like me to expand on?`,
    `Great question! In the context of **${lessonTitle}**, the most important thing to grasp is how these concepts interact with real market dynamics. Could you give me more context about what's confusing you? I want to make sure my explanation targets your exact question.`,
    `I'm glad you're engaging deeply with **${lessonTitle}**! Understanding this thoroughly will significantly improve your trading. The foundational idea here connects to how professional traders in ${moduleTitle} approach the market. What part would you like clarified?`,
  ]

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)]
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json() as {
      message: string
      lessonTitle: string
      moduleTitle: string
      history: ChatMessage[]
    }

    const { message, lessonTitle, moduleTitle } = body

    // Simulate thinking time
    await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 800))

    const reply = generateResponse(message, lessonTitle, moduleTitle)

    return Response.json({ reply })
  } catch {
    return Response.json({ reply: 'Sorry, I encountered an error. Please try again.' }, { status: 500 })
  }
}
