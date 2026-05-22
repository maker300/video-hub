import React from "react";
import { tv } from "../shared/tvTheme";
import { generateCandles, makePriceMapper } from "../shared/candleData";
import { ChartFrame } from "../shared/ChartFrame";

const CHART_LEFT   = 10;
const CHART_RIGHT  = 1110;
const CHART_TOP    = 52;
const CHART_BOTTOM = 570;
const VOL_BOTTOM   = 635;

export const PriceActionChart: React.FC = () => {
  const base = generateCandles(40, 1.0800, "range", 37);

  // Craft specific candles for price action patterns:
  // Candle 8: Pin bar (bullish) at support – long lower wick
  // Candle 24: Bearish engulfing at resistance
  // Candles 16-17: Inside bar setup
  const candles = base.map((c, i) => {
    if (i === 8) {
      // Bullish pin bar at support
      const body = 0.0008;
      return { ...c, open: c.low + 0.001, close: c.low + 0.001 + body,
               high: c.low + 0.001 + body + 0.0006, low: c.low };
    }
    if (i === 17) {
      // Inside bar (range inside previous candle 16)
      const p16 = base[16];
      return { ...c, open: p16.open - 0.0003, close: p16.open - 0.0001,
               high: Math.max(p16.open, p16.close) - 0.0003, low: Math.min(p16.open, p16.close) + 0.0003 };
    }
    if (i === 24) {
      // Bearish engulfing at resistance
      const prev = base[23];
      return { ...c, open: Math.max(prev.open, prev.close) + 0.0004,
               close: Math.min(prev.open, prev.close) - 0.0005,
               high: Math.max(prev.open, prev.close) + 0.0006, low: Math.min(prev.open, prev.close) - 0.0007 };
    }
    return c;
  });

  const pm = makePriceMapper(candles, CHART_TOP, CHART_BOTTOM);
  const colW = (CHART_RIGHT - CHART_LEFT) / candles.length;
  const cx = (i: number) => CHART_LEFT + (i + 0.5) * colW;

  // Support and resistance lines
  const supportP = candles.slice(0, 15).map(c => c.low).sort((a, b) => a - b)[2];
  const resistanceP = candles.slice(10, 30).map(c => c.high).sort((a, b) => b - a)[2];
  const supY = pm.toY(supportP);
  const resY = pm.toY(resistanceP);

  return (
    <ChartFrame
      candles={candles}
      symbol="GBP/USD"
      timeframe="1H"
      chartLeft={CHART_LEFT}
      chartRight={CHART_RIGHT}
      chartTop={CHART_TOP}
      chartBottom={CHART_BOTTOM}
      volBottom={VOL_BOTTOM}
    >
      {/* Support line */}
      <line x1={CHART_LEFT} y1={supY} x2={cx(20)} y2={supY}
        stroke={tv.lineGreen} strokeWidth={2} strokeDasharray="8 4" opacity={0.8} />

      {/* Resistance line */}
      <line x1={cx(10)} y1={resY} x2={cx(35)} y2={resY}
        stroke={tv.lineRed} strokeWidth={2} strokeDasharray="8 4" opacity={0.8} />

      {/* === BULLISH PIN BAR at support === */}
      {(() => {
        const c = candles[8];
        const y = pm.toY(c.high) - 36;
        return (
          <g>
            {/* Glow highlight on the pin bar candle */}
            <rect x={cx(8) - colW * 0.4} y={pm.toY(c.high) - 6}
              width={colW * 0.8} height={pm.toY(c.low) - pm.toY(c.high) + 12}
              fill="rgba(38,166,154,0.12)" rx={2} />
            {/* Label */}
            <rect x={cx(8) - 54} y={y - 2} width={108} height={20} rx={4} fill={tv.pillGreen} />
            <text x={cx(8)} y={y + 12}
              textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.textGreen}>
              Bullish Pin Bar
            </text>
            <line x1={cx(8)} y1={y + 18} x2={cx(8)} y2={pm.toY(c.high) - 8}
              stroke={tv.lineGreen} strokeWidth={1.5} strokeDasharray="3 2" />
          </g>
        );
      })()}

      {/* === INSIDE BAR === */}
      {(() => {
        const c16 = candles[16];
        const c17 = candles[17];
        const bracketTop = pm.toY(Math.max(c16.high, c17.high)) - 12;
        const bracketBot = pm.toY(Math.min(c16.low, c17.low)) + 12;
        const midX = (cx(16) + cx(17)) / 2;
        return (
          <g>
            {/* Bracket */}
            <rect x={cx(16) - colW * 0.45} y={bracketTop - 2} width={colW * 1.9} height={bracketBot - bracketTop + 4}
              fill="none" stroke={tv.lineAmber} strokeWidth={1.5} strokeDasharray="4 2" rx={2} />
            <rect x={midX - 46} y={bracketTop - 24} width={92} height={20} rx={4} fill={tv.pillAmber} />
            <text x={midX} y={bracketTop - 10}
              textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.lineAmber}>
              Inside Bar
            </text>
          </g>
        );
      })()}

      {/* === BEARISH ENGULFING at resistance === */}
      {(() => {
        const c = candles[24];
        const y = pm.toY(c.high) - 36;
        return (
          <g>
            {/* Glow */}
            <rect x={cx(23) - colW * 0.45} y={pm.toY(candles[23].high) - 6}
              width={colW * 1.9} height={pm.toY(candles[24].low) - pm.toY(candles[23].high) + 12}
              fill="rgba(239,83,80,0.1)" rx={2} />
            <rect x={cx(24) - 66} y={y - 2} width={132} height={20} rx={4} fill={tv.pillRed} />
            <text x={cx(24)} y={y + 12}
              textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.textRed}>
              Bearish Engulfing
            </text>
            <line x1={cx(24)} y1={y + 18} x2={cx(24)} y2={pm.toY(c.high) - 8}
              stroke={tv.lineRed} strokeWidth={1.5} strokeDasharray="3 2" />
          </g>
        );
      })()}

      {/* S/R labels */}
      <rect x={CHART_LEFT + 6} y={supY + 4} width={62} height={18} rx={3} fill={tv.pillGreen} />
      <text x={CHART_LEFT + 37} y={supY + 16}
        textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.textGreen}>Support</text>

      <rect x={CHART_LEFT + 6} y={resY - 22} width={76} height={18} rx={3} fill={tv.pillRed} />
      <text x={CHART_LEFT + 44} y={resY - 9}
        textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.textRed}>Resistance</text>

      {/* Bottom note */}
      <rect x={CHART_LEFT + 8} y={CHART_BOTTOM - 18} width={420} height={16} rx={3} fill="rgba(0,0,0,0.5)" />
      <text x={CHART_LEFT + 16} y={CHART_BOTTOM - 5}
        fontFamily={tv.font} fontSize={10} fill={tv.textMuted}>
        Price action: pin bars, engulfing candles, and inside bars at key S&R levels
      </text>
    </ChartFrame>
  );
};
