// Broker utilities — no external SDK required
// Trade execution is handled by the MT4 EA that polls /api/broker/pending

// MT4/MT5 symbol map — FM Trader slugs → MT4 symbols (Vantage convention)
export const SLUG_TO_MT4: Record<string, string> = {
  'eur-usd':  'EURUSD',
  'gbp-usd':  'GBPUSD',
  'usd-jpy':  'USDJPY',
  'aud-usd':  'AUDUSD',
  'usd-cad':  'USDCAD',
  'usd-chf':  'USDCHF',
  'nzd-usd':  'NZDUSD',
  'eur-gbp':  'EURGBP',
  'gbp-jpy':  'GBPJPY',
  'eur-jpy':  'EURJPY',
  'xau-usd':  'XAUUSD',
  'xag-usd':  'XAGUSD',
  'wti-usd':  'USOIL',
  'btc-usd':  'BTCUSD',
  'eth-usd':  'ETHUSD',
  'sol-usd':  'SOLUSD',
  'xrp-usd':  'XRPUSD',
  'bnb-usd':  'BNBUSD',
  'doge-usd': 'DOGEUSD',
  'sp-500':   'SPX500',
  'nas-100':  'NAS100',
  'dj-30':    'US30',
  'apple':    'AAPL',
  'microsoft':'MSFT',
  'google':   'GOOGL',
  'tesla':    'TSLA',
}

// Calculate lot size from account balance, risk %, and SL distance
export function calcLotSize(
  accountBalance: number,
  riskPct:        number,   // e.g. 1.0 = 1%
  entryPrice:     number,
  stopLoss:       number,
  symbol:         string,
): number {
  const riskAmount = accountBalance * (riskPct / 100)
  const slDist     = Math.abs(entryPrice - stopLoss)
  if (slDist === 0) return 0.01

  // Approximate pip value per standard lot:
  // Gold (XAUUSD): ~$100  |  Everything else: ~$10
  const pipValue = symbol === 'XAUUSD' ? 100 : 10

  const lots = riskAmount / (slDist * pipValue)
  return Math.max(0.01, Math.min(10, Math.round(lots * 100) / 100))
}
