import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are a professional forex trader and data generator.
When given a forex setup request, output ONLY a valid JSON object — no markdown, no extra text.
The JSON must match this exact structure:
{
  "pair":        "SYMBOL",
  "setup":       "Setup Name",
  "timeframe":   "TIMEFRAME",
  "trend":       "bullish" | "bearish" | "ranging",
  "candles":     [{ "o": NUMBER, "h": NUMBER, "l": NUMBER, "c": NUMBER }],
  "ema20":       [NUMBER],
  "ema50":       [NUMBER],
  "annotations": [{ "type": "support"|"resistance"|"entry"|"target"|"stop", "price": NUMBER, "label": "TEXT" }],
  "description": "One line description"
}
Rules:
- Exactly 20 candles.
- Realistic prices: EURUSD/GBPUSD/AUDUSD: 5 dp; USDJPY/GBPJPY: 3 dp; XAUUSD: 2 dp.
- Candles should visually tell the story of the setup (e.g. consolidation then breakout).
- EMA20 crosses above/below EMA50 where relevant to the setup.
- Provide 3–5 annotations (support, resistance, entry, target, and optionally stop).
- Keep annotations within the candle price range.`

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json() as { prompt: string }
    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const msg = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2000,
      system:     SYSTEM,
      messages:   [{ role: 'user', content: `Generate a forex chart animation for: ${prompt}` }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Model returned no JSON' }, { status: 502 })

    const config = JSON.parse(match[0])
    return NextResponse.json({ config })
  } catch (err) {
    console.error('generate-forex error:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
