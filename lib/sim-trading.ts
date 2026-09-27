// Simulated trading engine for funded-account evaluations.
//
// LEGAL SHAPE: this is a simulation. Members never deposit, we never execute
// on an exchange or hold client money, and every price comes from our own
// market-data feed. The £50 fee buys the evaluation; payouts at the funded
// stage come from firm revenue. Keeping it simulated is what keeps this out
// of brokerage regulation (FCA authorisation, CASS client-money rules).
//
// Money is in PENCE. Prices are decimals at the instrument's precision.

// Contract size per lot, by instrument class. A "lot" means the same thing
// it does at a broker, so a trader's existing intuition about position size
// carries over: 0.01 lots of EUR/USD is 1,000 units.
const CONTRACT_SIZE: Record<string, number> = {
  // FX majors/crosses — 100,000 units per standard lot
  'eur-usd': 100_000, 'gbp-usd': 100_000, 'usd-jpy': 100_000,
  'aud-usd': 100_000, 'usd-cad': 100_000, 'usd-chf': 100_000,
  'nzd-usd': 100_000, 'eur-gbp': 100_000, 'gbp-jpy': 100_000,
  'eur-jpy': 100_000,
  // Metals — troy ounces
  'xau-usd': 100, 'xag-usd': 5_000,
  // Energy — barrels
  'wti-usd': 1_000,
  // Indices — 1 unit per point
  'sp-500': 1, 'nas-100': 1, 'dj-30': 1, 'ger-40': 1,
  // Crypto — 1 coin
  'btc-usd': 1, 'eth-usd': 1, 'sol-usd': 1, 'xrp-usd': 1, 'bnb-usd': 1,
}

export const DEFAULT_CONTRACT_SIZE = 100_000

/** Leverage available on a simulated account. Retail-equivalent. */
export const SIM_LEVERAGE = 30

export const MIN_LOTS = 0.01
export const MAX_LOTS = 5

export function contractSize(slug: string): number {
  return CONTRACT_SIZE[slug] ?? DEFAULT_CONTRACT_SIZE
}

/**
 * Unrealised or realised P/L, in PENCE.
 *
 * Deliberately simplified: profit is computed in the quote currency and
 * treated as GBP rather than converted. On a £1,000 simulated account the
 * distortion is small and identical for every participant, so it cannot
 * advantage one trader over another — and it avoids a live FX-conversion
 * dependency in the middle of the rules engine. Stated plainly in the UI.
 */
export function positionPnl(p: {
  slug: string; side: string; lots: number; openPrice: number
}, currentPrice: number): number {
  const dir   = p.side === 'BUY' ? 1 : -1
  const units = p.lots * contractSize(p.slug)
  const move  = (currentPrice - p.openPrice) * dir
  return Math.round(move * units * 100)   // → pence
}

/** Notional exposure in pence — used for the margin check. */
export function notional(slug: string, lots: number, price: number): number {
  return Math.round(lots * contractSize(slug) * price * 100)
}

export interface OpenPositionLike {
  id: string; slug: string; display: string; side: string
  lots: number; openPrice: number
  stopLoss: number | null; takeProfit: number | null
}

export interface AccountState {
  balance:      number   // realised: starting balance + closed P/L
  unrealised:   number
  equity:       number   // balance + unrealised
  usedMargin:   number
  freeMargin:   number
  openCount:    number
}

export function accountState(
  startingBalance: number,
  closedPnl: number,
  open: OpenPositionLike[],
  prices: Record<string, number>,
): AccountState {
  const balance = startingBalance + closedPnl
  let unrealised = 0
  let usedMargin = 0

  for (const p of open) {
    const px = prices[p.slug]
    if (typeof px !== 'number' || !Number.isFinite(px)) continue
    unrealised += positionPnl(p, px)
    usedMargin += Math.round(notional(p.slug, p.lots, p.openPrice) / SIM_LEVERAGE)
  }

  const equity = balance + unrealised
  return {
    balance, unrealised, equity, usedMargin,
    freeMargin: equity - usedMargin,
    openCount:  open.length,
  }
}

/**
 * Has this position's stop loss or take profit been reached?
 *
 * Uses the last traded price rather than a bid/ask spread — the feed gives
 * one price per instrument. That is marginally generous to the trader on
 * stops and marginally harsh on targets, equally for everyone.
 */
export function hitLevel(p: OpenPositionLike, price: number): 'stop_loss' | 'take_profit' | null {
  const isBuy = p.side === 'BUY'
  if (p.stopLoss != null) {
    if (isBuy ? price <= p.stopLoss : price >= p.stopLoss) return 'stop_loss'
  }
  if (p.takeProfit != null) {
    if (isBuy ? price >= p.takeProfit : price <= p.takeProfit) return 'take_profit'
  }
  return null
}

/** Validate a requested order before it is accepted. */
export function validateOrder(o: {
  slug: string; side: string; lots: number; price: number
  stopLoss?: number | null; takeProfit?: number | null
}, freeMargin: number): { ok: true } | { ok: false; error: string } {
  if (o.side !== 'BUY' && o.side !== 'SELL') return { ok: false, error: 'Side must be BUY or SELL.' }
  if (!Number.isFinite(o.lots) || o.lots < MIN_LOTS || o.lots > MAX_LOTS) {
    return { ok: false, error: `Lot size must be between ${MIN_LOTS} and ${MAX_LOTS}.` }
  }
  if (!Number.isFinite(o.price) || o.price <= 0) {
    return { ok: false, error: 'No live price available for that instrument right now.' }
  }

  const isBuy = o.side === 'BUY'
  // A stop on the wrong side would close the position instantly at open.
  if (o.stopLoss != null) {
    if (isBuy ? o.stopLoss >= o.price : o.stopLoss <= o.price) {
      return { ok: false, error: `Stop loss must be ${isBuy ? 'below' : 'above'} the current price.` }
    }
  }
  if (o.takeProfit != null) {
    if (isBuy ? o.takeProfit <= o.price : o.takeProfit >= o.price) {
      return { ok: false, error: `Take profit must be ${isBuy ? 'above' : 'below'} the current price.` }
    }
  }

  const margin = Math.round(notional(o.slug, o.lots, o.price) / SIM_LEVERAGE)
  if (margin > freeMargin) {
    return { ok: false, error: 'Not enough free margin for that position size.' }
  }
  return { ok: true }
}
