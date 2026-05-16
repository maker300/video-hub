import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CLASSIFY_SYSTEM = `Classify the user's media request into one of three types and return ONLY valid JSON — no markdown, no extra text.

Types:
- "image": photos, backgrounds, artwork, illustrations, logos, textures, anything visual and static
- "forex": forex/crypto trading charts, currency pair setups, candlestick patterns, technical analysis
- "animation": motion graphics, text animations, title cards, intros, outros, countdown, typewriter effects, video scenes

Return exactly one of these JSON shapes:
{ "type": "image", "prompt": "vivid detailed prompt for image generation, add style/lighting/mood cues" }
{ "type": "forex", "prompt": "the full forex request as written" }
{ "type": "animation", "sceneType": "hook|feature|cta|announcement|quote|stat|reveal|countdown|typewriter|split|problem|solution|bullet|question|glitch|testimonial", "headline": "punchy main text max 8 words", "subtext": "supporting line max 12 words" }

Only JSON. Nothing else.`

const FOREX_SYSTEM = `You are a professional forex trader and data generator.
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
- Candles should visually tell the story of the setup.
- EMA20 crosses above/below EMA50 where relevant.
- Provide 3–5 annotations within the candle price range.`

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json() as { prompt: string }
    if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt required' }, { status: 400 })

    // Classify intent with fast haiku model
    const classMsg = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system:     CLASSIFY_SYSTEM,
      messages:   [{ role: 'user', content: prompt }],
    })

    const classRaw = classMsg.content[0].type === 'text' ? classMsg.content[0].text : ''
    const classMatch = classRaw.match(/\{[\s\S]*\}/)
    if (!classMatch) return NextResponse.json({ error: 'Could not classify request' }, { status: 502 })

    const classified = JSON.parse(classMatch[0]) as {
      type: string
      prompt?: string
      sceneType?: string
      headline?: string
      subtext?: string
    }

    // ── Image ─────────────────────────────────────────────────────────────────
    if (classified.type === 'image') {
      const imagePrompt = classified.prompt || prompt
      const seed = Math.floor(Math.random() * 999999)
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1280&height=720&nologo=true&seed=${seed}&model=flux`
      return NextResponse.json({ type: 'image', url, prompt: imagePrompt })
    }

    // ── Forex chart ───────────────────────────────────────────────────────────
    if (classified.type === 'forex') {
      const forexMsg = await client.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 2000,
        system:     FOREX_SYSTEM,
        messages:   [{ role: 'user', content: `Generate a forex chart animation for: ${classified.prompt || prompt}` }],
      })
      const forexRaw = forexMsg.content[0].type === 'text' ? forexMsg.content[0].text : ''
      const forexMatch = forexRaw.match(/\{[\s\S]*\}/)
      if (!forexMatch) return NextResponse.json({ error: 'Chart generation failed' }, { status: 502 })
      return NextResponse.json({ type: 'forex', config: JSON.parse(forexMatch[0]) })
    }

    // ── Animated scene ────────────────────────────────────────────────────────
    if (classified.type === 'animation') {
      return NextResponse.json({
        type: 'animation',
        scene: {
          id:       String(Date.now() + Math.random()),
          type:     classified.sceneType ?? 'feature',
          headline: classified.headline ?? prompt,
          subtext:  classified.subtext  ?? '',
          duration: 5,
        },
      })
    }

    return NextResponse.json({ error: 'Unknown generation type' }, { status: 400 })
  } catch (err) {
    console.error('generate-ai-media error:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
