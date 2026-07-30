// Asset-class slippage table — round-trip rate applied at LiveTrade close.
// Lives in code (not config) so the slippage logic is auditable in git history.
//
// Forex / indices / stocks → 0.05%  (tight spreads, deep liquidity)
// Commodities              → 0.10%  (gold/silver/oil — moderate spreads)
// Crypto                   → 0.20%  (wider spreads, especially off-peak)

const CRYPTO_SLUGS    = new Set(['btc-usd', 'eth-usd', 'sol-usd', 'xrp-usd', 'bnb-usd', 'doge-usd'])
const COMMODITY_SLUGS = new Set(['xau-usd', 'xag-usd', 'wti-usd', 'copper'])

/** Round-trip slippage rate (e.g., 0.0005 = 0.05%) for the given pair slug. */
export function slippagePctFor(slug: string): number {
  if (CRYPTO_SLUGS.has(slug))    return 0.0020
  if (COMMODITY_SLUGS.has(slug)) return 0.0010
  return 0.0005
}

/** Performance fee on PROFITABLE positions only. Currently fixed at 10%. */
export const PERFORMANCE_FEE_PCT = 0.10
