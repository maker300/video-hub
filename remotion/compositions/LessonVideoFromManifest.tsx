// Manifest-driven lesson composition.
//
// Drop-in entry for Video Hub: takes a LessonManifest (the JSON returned by
// /api/lesson-videos?lessonId=X) plus the `baseUrl` and API `key`, and renders
// the full lesson timeline. Each segment becomes a <Sequence> placed at its
// timestamp.
//
//   - whiteboard / photoreal  → fetched via <Img src={absoluteUrl + ?key=}> with auth in query
//   - motion                  → mounted from the local Remotion catalog by name
//   - title                   → simple title slide (heading text on brand bg)
//
// Edit by changing the manifest server-side and re-fetching, OR by editing the
// segments array directly before passing to this composition.

import React from 'react'
import { AbsoluteFill, Img, Sequence } from 'remotion'

// Catalog imports — kept in sync with /lib/remotion-catalog.ts
import { CandlestickAnatomy }    from '../stills/CandlestickAnatomy'
import { CandleTypes }           from '../stills/CandleTypes'
import { MultiCandlePatterns }   from '../stills/MultiCandlePatterns'
import { Trends }                from '../stills/Trends'
import { HeadAndShoulders }      from '../stills/HeadAndShoulders'
import { ChartPatterns }         from '../stills/ChartPatterns'
import { TradeEntry }            from '../stills/TradeEntry'
import { SupportResistance }     from '../stills/SupportResistance'
import { CandlestickChart }      from '../stills/charts/CandlestickChart'
import { CandleTypesChart }      from '../stills/charts/CandleTypesChart'
import { MultiCandleChart }      from '../stills/charts/MultiCandleChart'
import { TrendsChart }           from '../stills/charts/TrendsChart'
import { HeadShouldersChart }    from '../stills/charts/HeadShouldersChart'
import { ChartPatternsChart }    from '../stills/charts/ChartPatternsChart'
import { TradeEntryChart }       from '../stills/charts/TradeEntryChart'
import { SupportResistanceChart } from '../stills/charts/SupportResistanceChart'
import { MovingAveragesChart }   from '../stills/charts/MovingAveragesChart'
import { RSIMACDChart }          from '../stills/charts/RSIMACDChart'
import { FibonacciChart }        from '../stills/charts/FibonacciChart'
import { PriceActionChart }      from '../stills/charts/PriceActionChart'
import { BollingerBandsChart }   from '../stills/charts/BollingerBandsChart'
import { BreakoutChart }         from '../stills/charts/BreakoutChart'
import { WhatIsForex }           from '../stills/charts/WhatIsForex'
import { CurrencyPairs }         from '../stills/charts/CurrencyPairs'
import { PipsAndLots }           from '../stills/charts/PipsAndLots'
import { BidAskSpread }          from '../stills/charts/BidAskSpread'
import { LeverageExplained }     from '../stills/charts/LeverageExplained'
import { BullBearMarket }        from '../stills/charts/BullBearMarket'
import { RiskRewardVisual }      from '../stills/charts/RiskRewardVisual'
import { TradingSessionsMap }    from '../stills/charts/TradingSessionsMap'
import { TraderMindset }         from '../stills/charts/TraderMindset'
import { StopLossVisual }        from '../stills/charts/StopLossVisual'

const MOTION_MAP: Record<string, React.ComponentType> = {
  CandlestickAnatomy, CandleTypes, MultiCandlePatterns, Trends, HeadAndShoulders,
  ChartPatterns, TradeEntry, SupportResistance,
  CandlestickChart, CandleTypesChart, MultiCandleChart, TrendsChart, HeadShouldersChart,
  ChartPatternsChart, TradeEntryChart, SupportResistanceChart,
  MovingAveragesChart, RSIMACDChart, FibonacciChart, PriceActionChart,
  BollingerBandsChart, BreakoutChart,
  WhatIsForex, CurrencyPairs, PipsAndLots, BidAskSpread, LeverageExplained,
  BullBearMarket, RiskRewardVisual, TradingSessionsMap, TraderMindset, StopLossVisual,
}

// ── Manifest types (mirrors /lib/lesson-manifest.ts) ────────────────────────

export type AssetPlan =
  | { type: 'whiteboard'; imageId: string;     imageUrl: string }
  | { type: 'photoreal';  imageId: string;     imageUrl: string }
  | { type: 'motion';     componentName: string }
  | { type: 'title';      heading: string }

export interface SegmentPlan {
  segmentIndex: number
  startMs:      number
  durationMs:   number
  spokenText:   string
  heading:      string
  asset:        AssetPlan
  rationale:    string
}

export interface LessonManifest {
  lessonId:        string
  moduleId:        string
  title:           string
  moduleTitle:     string
  totalDurationMs: number
  brandPalette:    { primary: string; accent: string; background: string; ink: string }
  segments:        SegmentPlan[]
}

// ── Composition props ───────────────────────────────────────────────────────

export interface LessonVideoFromManifestProps {
  manifest: LessonManifest
  /** Absolute origin returned by the manifest endpoint, e.g. "https://forexmastery.org" */
  baseUrl:  string
  /** Same key that the manifest was fetched with — passed as ?key=… on image URLs */
  apiKey:   string
  /** Frames per second (must match Composition fps in Root.tsx) */
  fps:      number
}

// ── Title slide ─────────────────────────────────────────────────────────────

function TitleSlide({ heading, palette }: { heading: string; palette: LessonManifest['brandPalette'] }) {
  return (
    <AbsoluteFill style={{ backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        color:      'white',
        fontFamily: 'Patrick Hand, Caveat, cursive',
        fontSize:   140,
        textAlign:  'center',
        padding:    60,
        maxWidth:   '85%',
        lineHeight: 1.1,
      }}>
        {heading}
      </div>
      <div style={{
        marginTop:       20,
        width:           320,
        height:          6,
        background:      palette.accent,
        borderRadius:    3,
      }} />
    </AbsoluteFill>
  )
}

// ── Main composition ────────────────────────────────────────────────────────

export const LessonVideoFromManifest: React.FC<LessonVideoFromManifestProps> = ({
  manifest, baseUrl, apiKey, fps,
}) => {
  // Helper to convert ms → frames for the composition's fps
  const msToFrames = (ms: number) => Math.round((ms / 1000) * fps)

  return (
    <AbsoluteFill style={{ background: manifest.brandPalette.background }}>
      {manifest.segments.map(seg => {
        const from     = msToFrames(seg.startMs)
        const duration = Math.max(1, msToFrames(seg.durationMs))

        let content: React.ReactNode = null
        if (seg.asset.type === 'whiteboard' || seg.asset.type === 'photoreal') {
          if (seg.asset.imageId) {
            // Resolve absolute URL + inject api key for <Img>
            const url = `${baseUrl}${seg.asset.imageUrl}${seg.asset.imageUrl.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`
            content = <Img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          } else {
            content = <TitleSlide heading={seg.heading || '…'} palette={manifest.brandPalette} />
          }
        } else if (seg.asset.type === 'motion') {
          const Comp = MOTION_MAP[seg.asset.componentName]
          content = Comp ? <Comp /> : <TitleSlide heading={seg.heading} palette={manifest.brandPalette} />
        } else if (seg.asset.type === 'title') {
          content = <TitleSlide heading={seg.asset.heading} palette={manifest.brandPalette} />
        }

        return (
          <Sequence key={seg.segmentIndex} from={from} durationInFrames={duration} name={`seg-${seg.segmentIndex}`}>
            <AbsoluteFill>{content}</AbsoluteFill>
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}
