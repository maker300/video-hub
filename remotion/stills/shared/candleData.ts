export interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: string;
}

export function generateCandles(
  count: number,
  startPrice: number,
  trend: "up" | "down" | "range" | "hs" | "double_top" | "bull_flag",
  seed = 42
): OHLCV[] {
  let price = startPrice;
  const candles: OHLCV[] = [];
  let rng = seed;

  const rand = () => {
    rng = (rng * 1664525 + 1013904223) & 0xffffffff;
    return (rng >>> 0) / 0xffffffff;
  };

  const hours = [
    "08:00","08:15","08:30","08:45","09:00","09:15",
    "09:30","09:45","10:00","10:15","10:30","10:45","11:00",
    "11:15","11:30","11:45","12:00","12:15","12:30","12:45",
    "13:00","13:15","13:30","13:45","14:00","14:15","14:30",
    "14:45","15:00","15:15","15:30","15:45","16:00","16:15",
    "16:30","16:45","17:00","17:15","17:30","17:45",
  ];

  for (let i = 0; i < count; i++) {
    const pct = i / count;
    let drift = 0;

    if (trend === "up") {
      drift = 0.0008 + (rand() - 0.3) * 0.0006;
    } else if (trend === "down") {
      drift = -0.0008 + (rand() - 0.7) * 0.0006;
    } else if (trend === "range") {
      const distFromMid = (price - startPrice) / startPrice;
      drift = -distFromMid * 0.15 + (rand() - 0.5) * 0.0006;
    } else if (trend === "hs") {
      if (pct < 0.15) drift = 0.001;
      else if (pct < 0.25) drift = -0.0008;
      else if (pct < 0.45) drift = 0.0013;
      else if (pct < 0.55) drift = -0.001;
      else if (pct < 0.68) drift = 0.0007;
      else drift = -0.0012;
    } else if (trend === "double_top") {
      if (pct < 0.2) drift = 0.001;
      else if (pct < 0.35) drift = -0.0009;
      else if (pct < 0.55) drift = 0.001;
      else drift = -0.0011;
    } else if (trend === "bull_flag") {
      if (pct < 0.35) drift = 0.0018;
      else if (pct < 0.65) drift = -0.0003 + (rand() - 0.5) * 0.0002;
      else drift = 0.0015;
    }

    const volatility = price * 0.0018;
    const open = price;
    const move = drift * price + (rand() - 0.5) * volatility;
    const close = open + move;
    const wickExtra = rand() * volatility * 0.8;
    const high = Math.max(open, close) + wickExtra;
    const low = Math.min(open, close) - rand() * volatility * 0.8;
    const volume = 800 + rand() * 1200 + Math.abs(move / price) * 8000;

    candles.push({
      open: +open.toFixed(5),
      high: +high.toFixed(5),
      low: +low.toFixed(5),
      close: +close.toFixed(5),
      volume: Math.round(volume),
      time: hours[i % hours.length],
    });

    price = close;
  }
  return candles;
}

export function makePriceMapper(
  candles: OHLCV[],
  chartTop: number,
  chartBottom: number,
  paddingPct = 0.08
) {
  const allPrices = candles.flatMap(c => [c.high, c.low]);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP;
  const pad = range * paddingPct;
  const lo = minP - pad;
  const hi = maxP + pad;
  return {
    toY: (p: number) =>
      chartBottom - ((p - lo) / (hi - lo)) * (chartBottom - chartTop),
    minP: lo,
    maxP: hi,
    range: hi - lo,
  };
}
