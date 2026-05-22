import React from "react";
import { tv } from "../shared/tvTheme";
import { generateCandles, makePriceMapper } from "../shared/candleData";
import { ChartFrame } from "../shared/ChartFrame";

const CHART_LEFT   = 10;
const CHART_RIGHT  = 1110;
const CHART_TOP    = 52;
const CHART_BOTTOM = 570;
const VOL_BOTTOM   = 635;

const FIB_LEVELS = [
  { ratio: 0,     label: "0%",    color: tv.lineRed,   alpha: 0.5 },
  { ratio: 0.236, label: "23.6%", color: tv.lineAmber, alpha: 0.4 },
  { ratio: 0.382, label: "38.2%", color: tv.lineGreen, alpha: 0.7 },
  { ratio: 0.5,   label: "50%",   color: tv.lineAmber, alpha: 0.5 },
  { ratio: 0.618, label: "61.8%", color: tv.lineGreen, alpha: 1.0 },
  { ratio: 0.786, label: "78.6%", color: tv.lineAmber, alpha: 0.4 },
  { ratio: 1.0,   label: "100%",  color: tv.lineGreen, alpha: 0.5 },
];

export const FibonacciChart: React.FC = () => {
  // Price first makes a strong impulse up, then pulls back
  const candles = generateCandles(50, 1.0700, "up", 31);

  // Force a clear impulse then pullback
  const modified = candles.map((c, i) => {
    if (i >= 28) {
      // Pullback phase
      const pullFactor = (i - 28) * 0.0012;
      return { ...c, open: c.open - pullFactor, close: c.close - pullFactor,
               high: c.high - pullFactor, low: c.low - pullFactor };
    }
    return c;
  });

  const pm = makePriceMapper(modified, CHART_TOP, CHART_BOTTOM);
  const colW = (CHART_RIGHT - CHART_LEFT) / modified.length;
  const cx = (i: number) => CHART_LEFT + (i + 0.5) * colW;

  // Swing low = start of impulse (candle 0)
  // Swing high = peak before pullback (candle ~27)
  const swingLowIdx = 2;
  const swingHighIdx = 27;
  const swingLow = modified[swingLowIdx].low;
  const swingHigh = modified[swingHighIdx].high;

  const swingLowY = pm.toY(swingLow);
  const swingHighY = pm.toY(swingHigh);
  const priceRange = swingHigh - swingLow;

  // Fib level prices
  const fibPrices = FIB_LEVELS.map(f => ({
    ...f,
    price: swingHigh - f.ratio * priceRange,
  }));

  // Label right-side X
  const labelX = CHART_RIGHT - 145;

  return (
    <ChartFrame
      candles={modified}
      symbol="EUR/USD"
      timeframe="1H"
      chartLeft={CHART_LEFT}
      chartRight={CHART_RIGHT}
      chartTop={CHART_TOP}
      chartBottom={CHART_BOTTOM}
      volBottom={VOL_BOTTOM}
    >
      {/* Fib level lines */}
      {fibPrices.map((f, i) => {
        const y = pm.toY(f.price);
        if (y < CHART_TOP || y > CHART_BOTTOM) return null;
        const isGolden = f.ratio === 0.618;
        return (
          <g key={i}>
            <line
              x1={cx(swingLowIdx)} y1={y} x2={CHART_RIGHT - 4} y2={y}
              stroke={f.color} strokeWidth={isGolden ? 2.5 : 1.5}
              strokeDasharray={f.ratio === 0 || f.ratio === 1 ? "none" : "6 3"}
              opacity={f.alpha}
            />
            <rect x={labelX} y={y - 10} width={130} height={18} rx={3}
              fill={isGolden ? tv.pillGreen : "rgba(0,0,0,0.5)"} />
            <text x={labelX + 6} y={y + 3}
              fontFamily={tv.fontMono} fontSize={10} fontWeight={isGolden ? 700 : 400}
              fill={isGolden ? tv.textGreen : tv.axisText}>
              {f.label}  {f.price.toFixed(4)}
            </text>
          </g>
        );
      })}

      {/* Swing high marker */}
      <circle cx={cx(swingHighIdx)} cy={swingHighY - 10} r={7}
        fill="none" stroke={tv.lineRed} strokeWidth={2} />
      <rect x={cx(swingHighIdx) - 52} y={swingHighY - 38} width={104} height={20} rx={4} fill={tv.pillRed} />
      <text x={cx(swingHighIdx)} y={swingHighY - 24}
        textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.textRed}>
        Swing High
      </text>

      {/* Swing low marker */}
      <circle cx={cx(swingLowIdx)} cy={swingLowY + 10} r={7}
        fill="none" stroke={tv.lineGreen} strokeWidth={2} />
      <rect x={cx(swingLowIdx) - 48} y={swingLowY + 16} width={96} height={20} rx={4} fill={tv.pillGreen} />
      <text x={cx(swingLowIdx)} y={swingLowY + 30}
        textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.textGreen}>
        Swing Low
      </text>

      {/* Golden ratio highlight */}
      {(() => {
        const goldenPrice = swingHigh - 0.618 * priceRange;
        const y = pm.toY(goldenPrice);
        return (
          <g>
            <rect x={CHART_LEFT + 8} y={y - 32} width={188} height={22} rx={4} fill="rgba(38,166,154,0.25)" />
            <text x={CHART_LEFT + 100} y={y - 17}
              textAnchor="middle" fontFamily={tv.font} fontSize={12} fontWeight={700} fill={tv.lineGreen}>
              61.8% — Golden Retracement
            </text>
          </g>
        );
      })()}

      {/* Bottom note */}
      <rect x={CHART_LEFT + 8} y={CHART_BOTTOM - 18} width={340} height={16} rx={3} fill="rgba(0,0,0,0.5)" />
      <text x={CHART_LEFT + 16} y={CHART_BOTTOM - 5}
        fontFamily={tv.font} fontSize={10} fill={tv.textMuted}>
        Draw from swing low to swing high — 61.8% is the golden retracement
      </text>
    </ChartFrame>
  );
};
