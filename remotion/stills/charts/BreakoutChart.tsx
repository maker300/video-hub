import React from "react";
import { tv } from "../shared/tvTheme";
import { generateCandles, makePriceMapper } from "../shared/candleData";
import { ChartFrame } from "../shared/ChartFrame";

const CHART_LEFT   = 10;
const CHART_RIGHT  = 1110;
const CHART_TOP    = 52;
const CHART_BOTTOM = 570;
const VOL_BOTTOM   = 635;

export const BreakoutChart: React.FC = () => {
  const base = generateCandles(44, 1.0800, "range", 53);

  // Create consolidation zone then a breakout
  const candles = base.map((c, i) => {
    if (i >= 26) {
      // Ascending triangle: higher lows, flat resistance
      const bIdx = i - 26;
      const boost = bIdx * 0.0008;
      if (bIdx >= 10) {
        // Breakout candle onwards
        const bBoost = (bIdx - 9) * 0.0018;
        return { ...c, open: c.open + boost + bBoost, close: c.close + boost + bBoost + 0.001,
                 high: c.high + boost + bBoost + 0.002, low: c.low + boost + bBoost };
      }
      return { ...c, low: c.low + boost * 0.7 };
    }
    return c;
  });

  const pm = makePriceMapper(candles, CHART_TOP, CHART_BOTTOM);
  const colW = (CHART_RIGHT - CHART_LEFT) / candles.length;
  const cx = (i: number) => CHART_LEFT + (i + 0.5) * colW;

  // Flat resistance (top of consolidation)
  const consCandles = candles.slice(5, 36);
  const resistanceP = consCandles.map(c => c.high).sort((a, b) => b - a)[2];
  const resY = pm.toY(resistanceP);

  // Rising support trendline — connect lows of candles 26 and 33
  const tl1Idx = 26, tl2Idx = 33;
  const tl1Y = pm.toY(candles[tl1Idx].low);
  const tl2Y = pm.toY(candles[tl2Idx].low);
  // Extend to breakout
  const tlSlope = (tl2Y - tl1Y) / (tl2Idx - tl1Idx);
  const tlAtBreak = tl1Y + tlSlope * (36 - tl1Idx);
  const tlAtStart = tl1Y + tlSlope * (10 - tl1Idx);

  // Breakout candle
  const breakIdx = 36;
  const breakX = cx(breakIdx);
  const breakCandleHigh = candles[breakIdx]?.high ?? resistanceP + 0.003;

  // Stop loss zone
  const stopPrice = resistanceP - 0.0010;
  const stopY = pm.toY(stopPrice);

  // Target
  const flagpoleH = resistanceP - (candles.slice(0, 26).map(c => c.low).reduce((a, b) => Math.min(a, b), Infinity));
  const targetPrice = resistanceP + flagpoleH * 0.8;
  const targetY = pm.toY(Math.min(targetPrice, pm.maxP - 0.0005));

  return (
    <ChartFrame
      candles={candles}
      symbol="EUR/USD"
      timeframe="4H"
      chartLeft={CHART_LEFT}
      chartRight={CHART_RIGHT}
      chartTop={CHART_TOP}
      chartBottom={CHART_BOTTOM}
      volBottom={VOL_BOTTOM}
    >
      {/* Consolidation zone fill */}
      <rect x={cx(5)} y={resY} width={cx(36) - cx(5)} height={stopY - resY}
        fill="rgba(245,197,24,0.06)" />

      {/* Flat resistance line */}
      <line x1={cx(5)} y1={resY} x2={cx(36)} y2={resY}
        stroke={tv.lineRed} strokeWidth={2.5} strokeDasharray="8 4" />

      {/* Rising support trendline */}
      <line x1={cx(10)} y1={tlAtStart} x2={cx(36)} y2={tlAtBreak}
        stroke={tv.lineGreen} strokeWidth={2} strokeDasharray="8 4" />

      {/* Ascending triangle label */}
      <rect x={cx(18) - 74} y={resY + 10} width={148} height={20} rx={4} fill={tv.pillAmber} />
      <text x={cx(18)} y={resY + 24}
        textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.lineAmber}>
        Ascending Triangle
      </text>

      {/* Resistance label */}
      <rect x={CHART_LEFT + 6} y={resY - 22} width={82} height={18} rx={3} fill={tv.pillRed} />
      <text x={CHART_LEFT + 47} y={resY - 9}
        textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.textRed}>Resistance</text>

      {/* Breakout candle highlight */}
      {candles[breakIdx] && (
        <rect x={cx(breakIdx) - colW * 0.45} y={pm.toY(candles[breakIdx].high) - 4}
          width={colW * 0.9} height={pm.toY(candles[breakIdx].low) - pm.toY(candles[breakIdx].high) + 8}
          fill="rgba(38,166,154,0.18)" rx={2} />
      )}

      {/* Breakout arrow */}
      <defs>
        <marker id="arrBreak" markerWidth="7" markerHeight="7" refX="3.5" refY="7" orient="auto">
          <polygon points="0 7, 7 7, 3.5 0" fill={tv.lineGreen} />
        </marker>
      </defs>
      <line x1={breakX} y1={resY + 30} x2={breakX} y2={resY + 4}
        stroke={tv.lineGreen} strokeWidth={2.5} markerEnd="url(#arrBreak)" />
      <rect x={breakX - 44} y={resY + 32} width={88} height={20} rx={4} fill={tv.pillGreen} />
      <text x={breakX} y={resY + 46}
        textAnchor="middle" fontFamily={tv.font} fontSize={12} fontWeight={700} fill={tv.textGreen}>
        Breakout!
      </text>

      {/* Entry, Stop, Target levels */}
      <line x1={breakX} y1={resY} x2={CHART_RIGHT - 4} y2={resY}
        stroke={tv.lineBlue} strokeWidth={1.5} strokeDasharray="6 3" opacity={0.7} />
      <rect x={CHART_RIGHT - 130} y={resY - 10} width={118} height={18} rx={3} fill={tv.pillBlue} />
      <text x={CHART_RIGHT - 71} y={resY + 3}
        textAnchor="middle" fontFamily={tv.font} fontSize={10} fontWeight={700} fill={tv.lineBlue}>
        Entry: {resistanceP.toFixed(4)}
      </text>

      <line x1={breakX} y1={stopY} x2={CHART_RIGHT - 4} y2={stopY}
        stroke={tv.lineRed} strokeWidth={1.5} strokeDasharray="6 3" opacity={0.7} />
      <rect x={CHART_RIGHT - 130} y={stopY - 10} width={118} height={18} rx={3} fill={tv.pillRed} />
      <text x={CHART_RIGHT - 71} y={stopY + 3}
        textAnchor="middle" fontFamily={tv.font} fontSize={10} fontWeight={700} fill={tv.textRed}>
        Stop: {stopPrice.toFixed(4)}
      </text>

      {targetY > CHART_TOP && (
        <>
          <line x1={breakX} y1={targetY} x2={CHART_RIGHT - 4} y2={targetY}
            stroke={tv.lineGreen} strokeWidth={1.5} strokeDasharray="6 3" opacity={0.7} />
          <rect x={CHART_RIGHT - 130} y={targetY - 10} width={118} height={18} rx={3} fill={tv.pillGreen} />
          <text x={CHART_RIGHT - 71} y={targetY + 3}
            textAnchor="middle" fontFamily={tv.font} fontSize={10} fontWeight={700} fill={tv.textGreen}>
            Target: {Math.min(targetPrice, pm.maxP - 0.0005).toFixed(4)}
          </text>
        </>
      )}

      {/* Bottom annotation */}
      <rect x={CHART_LEFT + 8} y={CHART_BOTTOM - 18} width={460} height={16} rx={3} fill="rgba(0,0,0,0.5)" />
      <text x={CHART_LEFT + 16} y={CHART_BOTTOM - 5}
        fontFamily={tv.font} fontSize={10} fill={tv.textMuted}>
        Ascending triangle: higher lows into flat resistance → breakout entry above resistance
      </text>
    </ChartFrame>
  );
};
