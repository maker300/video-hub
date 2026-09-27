import Anthropic from '@anthropic-ai/sdk'

const globalForAnthropic = globalThis as unknown as { anthropic: Anthropic | undefined }

export const anthropic =
  globalForAnthropic.anthropic ??
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

if (process.env.NODE_ENV !== 'production') globalForAnthropic.anthropic = anthropic

export const CLAUDE_MODEL = 'claude-opus-4-6'

// Separate from CLAUDE_MODEL so the daily recap's voice can be tuned without
// touching the analysis engine, which is measured and should not move for a
// copy change. Sonnet 4.6 handles daily-recap writing well and costs
// roughly 5× less per call than Opus 5 — the previous choice. The recap is
// a copy task, not a reasoning task; the model class was the wrong tier for
// the workload.
export const WRITING_MODEL = 'claude-sonnet-4-6'
