import React from "react";
import { tv } from "../shared/tvTheme";
import { generateCandles, makePriceMapper, OHLCV } from "../shared/candleData";
import { ChartFrame } from "../shared/ChartFrame";

const CHART_LEFT   = 10;
const CHART_RIGHT  = 1110;
const CHART_TOP    = 52;
const CHART_BOTTOM = 570;
const VOL_BOTTOM   = 635;

export const SupportResistanceChart: React.FC = () => {
  const base = generateCandles(40, 1.0850, "range", 29);

  // Force breakout on candles 30-40
  const candles: OHLCV[] = base.map((c, i) => {
    if (i >= 30) {
      const boost = ((i - 30) * 0.0015);
      return { ...c, open: c.open + boost, close: c.close + boost + 0.001, high: c.high + boost + 0.001, low: c.low + boost };
    }
    return c;
  });

  const pm = makePriceMapper(candles, CHART_TOP, CHART_BOTTOM);
  const colW = (CHART_RIGHT - CHART_LEFT) / candles.length;
  const cx = (i: number) => CHART_LEFT + (i + 0.5) * colW;

  // Find resistance and support from candles 0-29 (range phase)
  const rangeCandles = candles.slice(0, 30);
  const highPrices = rangeCandles.map(c => c.high);
  const lowPrices  = rangeCandles.map(c => c.low);
  const resistanceP = highPrices.sort((a, b) => b - a)[3];   // 4th highest
  const supportP    = lowPrices.sort((a, b) => a - b)[3];    // 4th lowest

  const resY = pm.toY(resistanceP);
  const supY = pm.toY(supportP);

  // Breakout candle index
  const breakoutIdx = 30;
  const breakoutX = cx(breakoutIdx);

  // Old resistance = new support line
  const newSupY = resY;

  // Rejection touches at resistance
  const resTouches = [4, 12, 21];
  // Support bounces
  const supBounces = [7, 16, 25];

  return (
    <ChartFrame
      candles={candles}
      symbol="EUR/USD"
      timeframe="1H"
      chartLeft={CHART_LEFT}
      chartRight={CHART_RIGHT}
      chartTop={CHART_TOP}
      chartBottom={CHART_BOTTOM}
      volBottom={VOL_BOTTOM}
    >
      {/* Resistance line (only up to breakout) */}
      <line x1={CHART_LEFT} y1={resY} x2={breakoutX} y2={resY}
        stroke={tv.lineRed} strokeWidth={2.5} strokeDasharray="8 4" />
      {/* Resistance label */}
      <rect x={CHART_LEFT + 6} y={resY - 22} width={92} height={20} rx={4} fill={tv.pillRed} />
      <text x={CHART_LEFT + 52} y={resY - 8}
        textAnchor="middle" fontFamily={tv.font} fontSize={12} fontWeight={700} fill={tv.textRed}>
        Resistance
      </text>

      {/* Support line */}
      <line x1={CHART_LEFT} y1={supY} x2={breakoutX} y2={supY}
        stroke={tv.lineGreen} strokeWidth={2.5} strokeDasharray="8 4" />
      {/* Support label */}
      <rect x={CHART_LEFT + 6} y={supY + 4} width={72} height={20} rx={4} fill={tv.pillGreen} />
      <text x={CHART_LEFT + 42} y={supY + 18}
        textAnchor="middle" fontFamily={tv.font} fontSize={12} fontWeight={700} fill={tv.textGreen}>
        Support
      </text>

      {/* Rejection arrows */}
      {resTouches.map((i, k) => (
        <text key={k} x={cx(i)} y={resY - 4}
          textAnchor="middle" fontFamily={tv.font} fontSize={16} fill={tv.lineRed}>↓</text>
      ))}

      {/* Bounce arrows */}
      {supBounces.map((i, k) => (
        <text key={k} x={cx(i)} y={supY + 18}
          textAnchor="middle" fontFamily={tv.font} fontSize={16} fill={tv.lineGreen}>↑</text>
      ))}

      {/* Breakout label */}
      <defs>
        <marker id="arrUpSR" markerWidth="7" markerHeight="7" refX="3.5" refY="7" orient="auto">
          <polygon points="0 7, 7 7, 3.5 0" fill={tv.lineGreen} />
        </marker>
      </defs>
      <line x1={breakoutX} y1={resY + 20} x2={breakoutX} y2={resY + 4}
        stroke={tv.lineGreen} strokeWidth={2} markerEnd="url(#arrUpSR)" />
      <rect x={breakoutX - 36} y={resY + 22} width={72} height={20} rx={4} fill={tv.pillAmber} />
      <text x={breakoutX} y={resY + 36}
        textAnchor="middle" fontFamily={tv.font} fontSize={12} fontWeight={700} fill={tv.lineAmber}>
        Breakout
      </text>

      {/* New support = old resistance line */}
      <line x1={breakoutX} y1={newSupY} x2={CHART_RIGHT - 4} y2={newSupY}
        stroke={tv.lineAmber} strokeWidth={2.5} strokeDasharray="8 4" />

      {/* Role reversal label */}
      <rect x={breakoutX + 4} y={newSupY + 4} width={192} height={20} rx={4} fill={tv.pillAmber} />
      <text x={breakoutX + 100} y={newSupY + 18}
        textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.lineAmber}>
        Old resistance = new support
      </text>
      <text x={breakoutX + 100} y={newSupY + 38}
        textAnchor="middle" fontFamily={tv.font} fontSize={10} fill={tv.axisText}>
        Role reversal
      </text>

      {/* Bottom annotation */}
      <rect x={CHART_LEFT + 8} y={CHART_BOTTOM - 36} width={350} height={24}
        rx={6} fill="rgba(0,0,0,0.5)" />
      <text x={CHART_LEFT + 16} y={CHART_BOTTOM - 20}
        fontFamily={tv.font} fontSize={12} fill={tv.textMuted}>
        The more times a level holds, the stronger it is
      </text>
    </ChartFrame>
  );
};
