import { Composition } from 'remotion'
import { LessonVideo } from './compositions/LessonVideo'
import { buildNarrationSegments, estimateFrames } from '../lib/lessonParser'
import { CandlestickAnatomy } from './stills/CandlestickAnatomy'
import { CandleTypes } from './stills/CandleTypes'
import { MultiCandlePatterns } from './stills/MultiCandlePatterns'
import { Trends } from './stills/Trends'
import { HeadAndShoulders } from './stills/HeadAndShoulders'
import { ChartPatterns } from './stills/ChartPatterns'
import { TradeEntry } from './stills/TradeEntry'
import { SupportResistance } from './stills/SupportResistance'
import { CandlestickChart } from './stills/charts/CandlestickChart'
import { CandleTypesChart } from './stills/charts/CandleTypesChart'
import { MultiCandleChart } from './stills/charts/MultiCandleChart'
import { TrendsChart } from './stills/charts/TrendsChart'
import { HeadShouldersChart } from './stills/charts/HeadShouldersChart'
import { ChartPatternsChart } from './stills/charts/ChartPatternsChart'
import { TradeEntryChart } from './stills/charts/TradeEntryChart'
import { SupportResistanceChart } from './stills/charts/SupportResistanceChart'
import { MovingAveragesChart } from './stills/charts/MovingAveragesChart'
import { RSIMACDChart } from './stills/charts/RSIMACDChart'
import { FibonacciChart } from './stills/charts/FibonacciChart'
import { PriceActionChart } from './stills/charts/PriceActionChart'
import { BollingerBandsChart } from './stills/charts/BollingerBandsChart'
import { BreakoutChart } from './stills/charts/BreakoutChart'
import { WhatIsForex } from './stills/charts/WhatIsForex'
import { CurrencyPairs } from './stills/charts/CurrencyPairs'
import { PipsAndLots } from './stills/charts/PipsAndLots'
import { BidAskSpread } from './stills/charts/BidAskSpread'
import { LeverageExplained } from './stills/charts/LeverageExplained'
import { BullBearMarket } from './stills/charts/BullBearMarket'
import { RiskRewardVisual } from './stills/charts/RiskRewardVisual'
import { TradingSessionsMap } from './stills/charts/TradingSessionsMap'
import { TraderMindset } from './stills/charts/TraderMindset'
import { StopLossVisual } from './stills/charts/StopLossVisual'

const DEMO_SECTIONS = [
  {
    heading: 'What is Forex Trading?',
    paragraphs: [
      'Forex trading is the simultaneous buying of one currency and selling of another.',
      'The forex market is the largest and most liquid financial market in the world, with over six trillion dollars traded every day.',
    ],
  },
  {
    heading: 'Key Market Participants',
    paragraphs: [
      'Central banks, commercial banks, hedge funds, corporations, and retail traders all participate in the forex market.',
      'Each participant has different motivations — from hedging currency risk to speculating for profit.',
    ],
  },
]

const DEMO_KEY_POINTS = [
  { text: 'Forex is the most liquid market in the world' },
  { text: 'Currencies are always traded in pairs' },
  { text: 'The market runs 24 hours a day, five days a week' },
]

const DEMO_TERMS = [
  { word: 'Pip',      definition: 'The smallest price move in a currency pair (0.0001)' },
  { word: 'Spread',   definition: 'The difference between the bid and ask price' },
  { word: 'Leverage', definition: 'Using borrowed capital to increase potential return' },
]

const demoScript = buildNarrationSegments(
  'Introduction to Forex Trading',
  'Foundations of Forex',
  DEMO_SECTIONS,
  DEMO_KEY_POINTS,
  DEMO_TERMS,
).map(s => s.spokenText).join(' ')

const STILL = { width: 1200, height: 675, durationInFrames: 1, fps: 30 }

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="LessonVideo"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      component={LessonVideo as any}
      durationInFrames={estimateFrames(demoScript)}
      fps={30}
      width={1280}
      height={720}
      defaultProps={{
        lessonTitle:  'Introduction to Forex Trading',
        moduleTitle:  'Foundations of Forex',
        moduleNumber: 1,
        lessonNumber: 1,
        keyPoints:    DEMO_KEY_POINTS,
        terms:        DEMO_TERMS,
      }}
    />
    <Composition id="CandlestickAnatomy"   component={CandlestickAnatomy}   {...STILL} defaultProps={{}} />
    <Composition id="CandleTypes"          component={CandleTypes}           {...STILL} defaultProps={{}} />
    <Composition id="MultiCandlePatterns"  component={MultiCandlePatterns}   {...STILL} defaultProps={{}} />
    <Composition id="Trends"               component={Trends}                {...STILL} defaultProps={{}} />
    <Composition id="HeadAndShoulders"     component={HeadAndShoulders}      {...STILL} defaultProps={{}} />
    <Composition id="ChartPatterns"        component={ChartPatterns}         {...STILL} defaultProps={{}} />
    <Composition id="TradeEntry"           component={TradeEntry}            {...STILL} defaultProps={{}} />
    <Composition id="SupportResistance"    component={SupportResistance}     {...STILL} defaultProps={{}} />
    <Composition id="CandlestickChart"      component={CandlestickChart}      {...STILL} defaultProps={{}} />
    <Composition id="CandleTypesChart"      component={CandleTypesChart}      {...STILL} defaultProps={{}} />
    <Composition id="MultiCandleChart"      component={MultiCandleChart}      {...STILL} defaultProps={{}} />
    <Composition id="TrendsChart"           component={TrendsChart}           {...STILL} defaultProps={{}} />
    <Composition id="HeadShouldersChart"    component={HeadShouldersChart}    {...STILL} defaultProps={{}} />
    <Composition id="ChartPatternsChart"    component={ChartPatternsChart}    {...STILL} defaultProps={{}} />
    <Composition id="TradeEntryChart"       component={TradeEntryChart}       {...STILL} defaultProps={{}} />
    <Composition id="SupportResistanceChart" component={SupportResistanceChart} {...STILL} defaultProps={{}} />
    <Composition id="MovingAveragesChart"    component={MovingAveragesChart}    {...STILL} defaultProps={{}} />
    <Composition id="RSIMACDChart"           component={RSIMACDChart}           {...STILL} defaultProps={{}} />
    <Composition id="FibonacciChart"         component={FibonacciChart}         {...STILL} defaultProps={{}} />
    <Composition id="PriceActionChart"       component={PriceActionChart}       {...STILL} defaultProps={{}} />
    <Composition id="BollingerBandsChart"    component={BollingerBandsChart}    {...STILL} defaultProps={{}} />
    <Composition id="BreakoutChart"          component={BreakoutChart}          {...STILL} defaultProps={{}} />
    <Composition id="WhatIsForex"            component={WhatIsForex}            {...STILL} defaultProps={{}} />
    <Composition id="CurrencyPairs"          component={CurrencyPairs}          {...STILL} defaultProps={{}} />
    <Composition id="PipsAndLots"            component={PipsAndLots}            {...STILL} defaultProps={{}} />
    <Composition id="BidAskSpread"           component={BidAskSpread}           {...STILL} defaultProps={{}} />
    <Composition id="LeverageExplained"      component={LeverageExplained}      {...STILL} defaultProps={{}} />
    <Composition id="BullBearMarket"         component={BullBearMarket}         {...STILL} defaultProps={{}} />
    <Composition id="RiskRewardVisual"       component={RiskRewardVisual}       {...STILL} defaultProps={{}} />
    <Composition id="TradingSessionsMap"     component={TradingSessionsMap}     {...STILL} defaultProps={{}} />
    <Composition id="TraderMindset"          component={TraderMindset}          {...STILL} defaultProps={{}} />
    <Composition id="StopLossVisual"         component={StopLossVisual}         {...STILL} defaultProps={{}} />
  </>
)
