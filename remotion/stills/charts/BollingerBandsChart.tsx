import React from "react";
import { tv } from "../shared/tvTheme";
import { generateCandles, makePriceMapper } from "../shared/candleData";
import { ChartFrame } from "../shared/ChartFrame";

const CHART_LEFT   = 10;
const CHART_RIGHT  = 1110;
const CHART_TOP    = 52;
const CHART_BOTTOM = 570;
const VOL_BOTTOM   = 635;

function calcBollinger(candles: { close: number }[], period = 20, stdDev = 2) {
  const upper: (number | null)[] = [];
  const middle: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      upper.push(null); middle.push(null); lower.push(null);
      continue;
    }
    const slice = candles.slice(i - period + 1, i + 1).map(c => c.close);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, v) => a + (v - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    middle.push(mean);
    upper.push(mean + stdDev * sd);
    lower.push(mean - stdDev * sd);
  }
  return { upper, middle, lower };
}

export const BollingerBandsChart: React.FC = () => {
  // Use a range then breakout pattern to show squeeze → expansion
  const baseCandles = generateCandles(50, 1.0850, "range", 41);

  // Force a squeeze in the middle, then a breakout
  const candles = baseCandles.map((c, i) => {
    if (i >= 22 && i <= 32) {
      // Squeeze: tighten price around midpoint
      const mid = 1.0860;
      const tightFactor = 0.0004;
      return { ...c, open: mid + (c.open - mid) * 0.3, close: mid + (c.close - mid) * 0.3,
               high: mid + tightFactor, low: mid - tightFactor };
    }
    if (i > 32) {
      // Breakout upward
      const boost = (i - 32) * 0.0014;
      return { ...c, open: c.open + boost, close: c.close + boost + 0.0005,
               high: c.high + boost + 0.001, low: c.low + boost };
    }
    return c;
  });

  const bb = calcBollinger(candles);
  const pm = makePriceMapper(candles, CHART_TOP, CHART_BOTTOM);
  const colW = (CHART_RIGHT - CHART_LEFT) / candles.length;
  const cx = (i: number) => CHART_LEFT + (i + 0.5) * colW;

  // Build band paths
  const upperPoints: string[] = [];
  const middlePoints: string[] = [];
  const lowerPoints: string[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (bb.upper[i] !== null) {
      upperPoints.push(`${cx(i)},${pm.toY(bb.upper[i] as number)}`);
      middlePoints.push(`${cx(i)},${pm.toY(bb.middle[i] as number)}`);
      lowerPoints.push(`${cx(i)},${pm.toY(bb.lower[i] as number)}`);
    }
  }

  // Fill area between bands
  const fillPath = upperPoints.length > 0
    ? `M${upperPoints.join(" L")} L${lowerPoints.slice().reverse().join(" L")} Z`
    : "";

  // Find squeeze zone (narrowest band width)
  const squeezeStartX = cx(22);
  const squeezeEndX = cx(32);
  const squeezeY1 = CHART_TOP;
  const squeezeY2 = CHART_BOTTOM;

  // Find breakout candle
  const breakoutX = cx(33);
  const breakoutBand = bb.upper[33];
  const breakoutY = breakoutBand !== null ? pm.toY(breakoutBand) : CHART_TOP + 100;

  return (
    <ChartFrame
      candles={candles}
      symbol="USD/JPY"
      timeframe="4H"
      chartLeft={CHART_LEFT}
      chartRight={CHART_RIGHT}
      chartTop={CHART_TOP}
      chartBottom={CHART_BOTTOM}
      volBottom={VOL_BOTTOM}
    >
      {/* Band fill */}
      {fillPath && (
        <path d={fillPath} fill="rgba(33,150,243,0.06)" />
      )}

      {/* Upper band */}
      {upperPoints.length > 1 && (
        <polyline points={upperPoints.join(" ")} fill="none"
          stroke={tv.lineBlue} strokeWidth={1.5} strokeDasharray="5 3" opacity={0.8} />
      )}

      {/* Middle band (SMA 20) */}
      {middlePoints.length > 1 && (
        <polyline points={middlePoints.join(" ")} fill="none"
          stroke={tv.ema20} strokeWidth={1.5} opacity={0.7} />
      )}

      {/* Lower band */}
      {lowerPoints.length > 1 && (
        <polyline points={lowerPoints.join(" ")} fill="none"
          stroke={tv.lineBlue} strokeWidth={1.5} strokeDasharray="5 3" opacity={0.8} />
      )}

      {/* Squeeze zone highlight */}
      <rect x={squeezeStartX} y={squeezeY1} width={squeezeEndX - squeezeStartX} height={squeezeY2 - squeezeY1}
        fill="rgba(245,197,24,0.06)" />
      <rect x={(squeezeStartX + squeezeEndX) / 2 - 44} y={squeezeY1 + 8}
        width={88} height={20} rx={4} fill={tv.pillAmber} />
      <text x={(squeezeStartX + squeezeEndX) / 2} y={squeezeY1 + 22}
        textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.lineAmber}>
        Squeeze
      </text>

      {/* Breakout arrow */}
      <defs>
        <marker id="arrBB" markerWidth="7" markerHeight="7" refX="3.5" refY="7" orient="auto">
          <polygon points="0 7, 7 7, 3.5 0" fill={tv.lineGreen} />
        </marker>
      </defs>
      <line x1={breakoutX} y1={breakoutY + 40} x2={breakoutX} y2={breakoutY + 8}
        stroke={tv.lineGreen} strokeWidth={2} markerEnd="url(#arrBB)" />
      <rect x={breakoutX - 52} y={breakoutY + 42} width={104} height={20} rx={4} fill={tv.pillGreen} />
      <text x={breakoutX} y={breakoutY + 56}
        textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.textGreen}>
        Breakout!
      </text>

      {/* Band labels */}
      <rect x={CHART_LEFT + 8} y={CHART_TOP + 8} width={102} height={18} rx={3} fill="rgba(33,150,243,0.15)" />
      <text x={CHART_LEFT + 59} y={CHART_TOP + 20}
        textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.lineBlue}>
        Upper Band
      </text>
      <rect x={CHART_LEFT + 8} y={CHART_TOP + 30} width={88} height={18} rx={3} fill="rgba(245,197,24,0.15)" />
      <text x={CHART_LEFT + 52} y={CHART_TOP + 42}
        textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.ema20}>
        SMA 20
      </text>

      {/* Bottom annotation */}
      <rect x={CHART_LEFT + 8} y={CHART_BOTTOM - 18} width={420} height={16} rx={3} fill="rgba(0,0,0,0.5)" />
      <text x={CHART_LEFT + 16} y={CHART_BOTTOM - 5}
        fontFamily={tv.font} fontSize={10} fill={tv.textMuted}>
        Squeeze = bands contract = low volatility → explosive breakout follows
      </text>
    </ChartFrame>
  );
};
