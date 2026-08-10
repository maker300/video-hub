import Anthropic from '@anthropic-ai/sdk'

const globalForAnthropic = globalThis as unknown as { anthropic: Anthropic | undefined }

export const anthropic =
  globalForAnthropic.anthropic ??
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

if (process.env.NODE_ENV !== 'production') globalForAnthropic.anthropic = anthropic

export const CLAUDE_MODEL = 'claude-opus-4-6'

// Separate from CLAUDE_MODEL so the daily recap's voice can be tuned without
// touching the analysis engine, which is measured and should not move for a
// copy change. CLAUDE_MODEL is a generation behind (claude-opus-4-6) and is
// worth upgrading on its own, deliberately, with the accuracy watched.
export const WRITING_MODEL = 'claude-opus-5'
