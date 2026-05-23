// Shared types for FM Trader — no server-only imports here.
// Both the API route and client components import from this file.

// Forex / institutional slots: 08:00–22:00 UTC (London open → NY close)
export const SESSION_SLOTS = [
  { id: '08', label: '08:00 – 09:00', name: 'London Open',        desc: 'High volatility, breakout zone'     },
  { id: '09', label: '09:00 – 10:00', name: 'London Morning',     desc: 'Momentum builds, trend emerges'     },
  { id: '10', label: '10:00 – 11:00', name: 'London Mid-Morning', desc: 'Trend continuation phase'           },
  { id: '11', label: '11:00 – 12:00', name: 'Pre-Overlap',        desc: 'Pre-NY positioning begins'          },
  { id: '12', label: '12:00 – 13:00', name: 'London/NY Overlap',  desc: 'Peak liquidity opens'               },
  { id: '13', label: '13:00 – 14:00', name: 'Overlap Mid',        desc: 'Highest volume of the day'          },
  { id: '14', label: '14:00 – 15:00', name: 'Overlap Peak',       desc: 'US data & institutional flows'      },
  { id: '15', label: '15:00 – 16:00', name: 'London Close',       desc: 'London closes, position squaring'   },
  { id: '16', label: '16:00 – 17:00', name: 'NY Afternoon',       desc: 'USD dominates, strong momentum'     },
  { id: '17', label: '17:00 – 18:00', name: 'NY Mid-Session',     desc: 'London close reversal risk'         },
  { id: '18', label: '18:00 – 19:00', name: 'NY Late Session',    desc: 'Momentum fades, consolidation'      },
  { id: '19', label: '19:00 – 20:00', name: 'NY Pre-Close',       desc: 'Position squaring begins'           },
  { id: '20', label: '20:00 – 21:00', name: 'End of Day',         desc: 'Low liquidity, thin market'         },
  { id: '21', label: '21:00 – 22:00', name: 'Market Close',       desc: 'Session close, Asian opens'         },
] as const

// Crypto slots: all 24 UTC hours. Crypto trades 24/7 — no dead session.
export const CRYPTO_SESSION_SLOTS = [
  { id: '00', label: '00:00 – 01:00', name: 'Crypto Midnight',    desc: 'Late NY / early Asia crypto flow'   },
  { id: '01', label: '01:00 – 02:00', name: 'Crypto Early Asia',  desc: 'Asia opens, low but building volume'},
  { id: '02', label: '02:00 – 03:00', name: 'Crypto Asia',        desc: 'Asian crypto market active'         },
  { id: '03', label: '03:00 – 04:00', name: 'Crypto Asia Peak',   desc: 'Asian session peak volume'          },
  { id: '04', label: '04:00 – 05:00', name: 'Crypto Asia Late',   desc: 'Asia mid-session momentum'          },
  { id: '05', label: '05:00 – 06:00', name: 'Crypto Pre-Europe',  desc: 'Asia winds down, Europe stirs'      },
  { id: '06', label: '06:00 – 07:00', name: 'Crypto Early EU',    desc: 'European crypto traders online'     },
  { id: '07', label: '07:00 – 08:00', name: 'Crypto Pre-London',  desc: 'Pre-London positioning'             },
  { id: '08', label: '08:00 – 09:00', name: 'London Open',        desc: 'High volatility, breakout zone'     },
  { id: '09', label: '09:00 – 10:00', name: 'London Morning',     desc: 'Momentum builds, trend emerges'     },
  { id: '10', label: '10:00 – 11:00', name: 'London Mid-Morning', desc: 'Trend continuation phase'           },
  { id: '11', label: '11:00 – 12:00', name: 'Pre-Overlap',        desc: 'Pre-NY positioning begins'          },
  { id: '12', label: '12:00 – 13:00', name: 'London/NY Overlap',  desc: 'Peak liquidity for crypto'          },
  { id: '13', label: '13:00 – 14:00', name: 'Overlap Mid',        desc: 'Highest volume of the day'          },
  { id: '14', label: '14:00 – 15:00', name: 'Overlap Peak',       desc: 'US data drives crypto volatility'   },
  { id: '15', label: '15:00 – 16:00', name: 'London Close',       desc: 'Position squaring affects crypto'   },
  { id: '16', label: '16:00 – 17:00', name: 'NY Afternoon',       desc: 'Strong US crypto momentum'          },
  { id: '17', label: '17:00 – 18:00', name: 'NY Mid-Session',     desc: 'Volatility risk on reversals'       },
  { id: '18', label: '18:00 – 19:00', name: 'NY Late Session',    desc: 'Momentum fades, consolidation'      },
  { id: '19', label: '19:00 – 20:00', name: 'NY Pre-Close',       desc: 'Position squaring in crypto'        },
  { id: '20', label: '20:00 – 21:00', name: 'NY Eve',             desc: 'US retail crypto activity'          },
  { id: '21', label: '21:00 – 22:00', name: 'NY Close',           desc: 'US market closes, crypto persists'  },
  { id: '22', label: '22:00 – 23:00', name: 'Crypto Late NY',     desc: 'Late US / early Asia transition'    },
  { id: '23', label: '23:00 – 00:00', name: 'Crypto Pre-Asia',    desc: 'Asia positions forming overnight'   },
] as const

export type SessionSlotId = typeof SESSION_SLOTS[number]['id'] | typeof CRYPTO_SESSION_SLOTS[number]['id']

export interface FMTraderRequest {
  slug:          string
  display:       string
  name:          string
  category:      string
  price:         number
  change:        number
  changePct:     number
  high:          number
  low:           number
  open:          number
  volume:        number
  overallSignal: string
  sessionSlot:   SessionSlotId
  keyLevels: {
    pivot:        number
    resistance1:  number
    resistance2:  number
    support1:     number
    support2:     number
  }
  timeframes: {
    label:    string
    key:      string
    signal:   string
    rsi:      number
    ema9:     number
    ema21:    number
    ema50:    number
    ema200:   number
    close:    number
    high:     number
    low:      number
    analysis: string
    candles:  { o: number; h: number; l: number; c: number }[]
  }[]
  // News blackout: set by client when a high-impact event is imminent (±30 min)
  newsBlackout?:   boolean
  blackoutReason?: string

  // Scanner mode: skip Claude narrative, skip caching — used by the hourly cron scanner
  scanOnly?:       boolean

  // User-initiated mid-hour refresh: bypass cache and regenerate after 30 min
  forceRefresh?:   boolean

  // Current live price (for staleness / zone-hit detection on the server)
  livePrice?:      number

  // Injected by the server before passing to Claude — summary of learned patterns
  learningContext?: string

  // Inter-market correlation context
  intermarket?: {
    dxyChangePct:   number   // DXY % change today — USD strength gauge
    dxyDirection:   'rising' | 'falling' | 'flat'
    goldChangePct:  number   // XAU/USD % change today — risk/safe-haven gauge
    goldDirection:  'rising' | 'falling' | 'flat'
    vixLevel:       number   // VIX — fear gauge (>25 = elevated fear)
    correlation:    number   // this pair's DXY correlation: -1 to +1
    signal:         'confirms' | 'conflicts' | 'neutral'  // vs current FM direction
  }

  // Senior analyst signals — computed from full candle history server-side
  marketContext: {
    atr14:          number   // True 14-period ATR (Wilder) from daily bars
    prevDayHigh:    number   // Previous day high — key institutional level
    prevDayLow:     number   // Previous day low  — key institutional level
    prevDayClose:   number   // Previous day close
    swingHigh:      number   // 20-bar swing high — macro resistance
    swingLow:       number   // 20-bar swing low  — macro support
    avgVolume20:    number   // 20-day average volume
    volumeRatio:    number   // today / avg (>1.5 = elevated conviction, <0.5 = thin)
    last3Candles1H: { o: number; h: number; l: number; c: number }[]   // 3 most recent CLOSED 1H candles
    last3Candles4H: { o: number; h: number; l: number; c: number }[]   // 3 most recent CLOSED 4H candles
    // The single most recent CLOSED 1H candle — the institutional "signal candle"
    // for this session. Claude's decision is based on this, not the live tick.
    prevClosed1H: { o: number; h: number; l: number; c: number }
  }
}

export interface FMTraderResponse {
  decision:           'BUY' | 'SELL' | 'NO TRADE'
  confidence:         number
  entryZone:          [number, number]
  stopLoss:           number
  tp1:                number
  tp2:                number
  tp3:                number
  rrRatio:            string
  timeValidity:       string
  thesis:             string
  technicalBreakdown: string
  riskFactors:        string[]
  sessionContext:     string
  marketBias:         string
  traderNote:         string
  generatedAt:        number
  // Institutional analysis metadata (optional — populated by rule engine for BUY/SELL)
  setupGrade?:        'A' | 'B' | 'C'       // institutional setup quality grade
  confluenceScore?:   number                 // 0–100 multi-timeframe confluence
  institutionalMeta?: {
    grade:            'A' | 'B' | 'C'
    confluence:       number
    regime:           string
    hasSweep:         boolean
    sweepDetail:      string
    hasOB:            boolean
    obDetail:         string
    obStrength:       'strong' | 'moderate' | null
    hasDivergence:    boolean
    divergenceDetail: string
    pdQuality:        'optimal' | 'good' | 'fair' | 'poor'
    pdDetail:         string
    hasFVG?:          boolean      // Fair Value Gap in trend direction
    fvgDetail?:       string
    hasBOS?:          boolean      // Break of Structure (continuation)
    hasCHoCH?:        boolean      // Change of Character (potential reversal)
    bosChochDetail?:  string
    hasEqLevels?:     boolean      // Equal highs/lows = liquidity pool ahead
    eqLevelsDetail?:  string
    macdConfirms?:    boolean      // MACD momentum confirms direction
    macdDetail?:      string
  }
}
