import React from "react";
import { theme } from "./shared/theme";
import { Candle } from "./shared/Candle";

const { W, H, font } = theme;

export const SupportResistance: React.FC = () => {
  const chartLeft = 50;
  const chartRight = W - 180;
  const chartTop = 90;
  const chartBot = H - 70;
  const chartH = chartBot - chartTop;

  const resRatio = 0.18;
  const supRatio = 0.72;
  const midRatio = 0.45;   // role reversal zone

  const resY = chartTop + resRatio * chartH;
  const supY = chartTop + supRatio * chartH;
  const midY = chartTop + midRatio * chartH;

  const cy = (r: number) => chartTop + r * chartH;

  // Candles: bouncing between support and resistance, then breaks through old resistance
  const candles = [
    // Section 1: bounce off support, approach resistance
    { o: 0.68, c: 0.55, h: 0.52, l: 0.72 },
    { o: 0.57, c: 0.45, h: 0.42, l: 0.60 },
    { o: 0.48, c: 0.38, h: 0.35, l: 0.51 },
    { o: 0.40, c: 0.28, h: 0.25, l: 0.43 },
    { o: 0.30, c: 0.20, h: 0.17, l: 0.33 },   // near resistance
    { o: 0.22, c: 0.32, h: 0.19, l: 0.35 },   // rejection at resistance
    { o: 0.30, c: 0.42, h: 0.28, l: 0.45 },
    { o: 0.40, c: 0.52, h: 0.38, l: 0.55 },
    { o: 0.50, c: 0.62, h: 0.48, l: 0.65 },
    { o: 0.60, c: 0.72, h: 0.58, l: 0.75 },   // near support
    { o: 0.70, c: 0.60, h: 0.67, l: 0.73 },   // bounce off support
    { o: 0.62, c: 0.50, h: 0.59, l: 0.65 },
    // Break through old resistance → role reversal
    { o: 0.36, c: 0.22, h: 0.18, l: 0.39 },   // break above resistance
    { o: 0.24, c: 0.14, h: 0.10, l: 0.27 },   // above old resistance
    { o: 0.18, c: 0.28, h: 0.15, l: 0.31 },   // pullback to new support (old res)
    { o: 0.27, c: 0.17, h: 0.14, l: 0.30 },   // bounce up from new support
    { o: 0.20, c: 0.10, h: 0.07, l: 0.23 },
    { o: 0.13, c: 0.05, h: 0.02, l: 0.16 },
  ];

  const totalCandles = candles.length;
  const colW = (chartRight - chartLeft) / totalCandles;
  const cx = (i: number) => chartLeft + (i + 0.5) * colW;

  // Rejection arrows (small red triangles pointing down)
  const rejections = [4, 5];  // candle indices near resistance
  // Bounce arrows (small green triangles pointing up)
  const bounces = [9, 10];    // candle indices near support

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={theme.bg} />
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />

      <text x={W / 2} y={50} textAnchor="middle" fontFamily={font} fontSize={24}
        fontWeight={700} fill={theme.white}>Support &amp; Resistance</text>
      <line x1={W/2-140} y1={64} x2={W/2+140} y2={64} stroke={theme.greenLight} strokeWidth={2} opacity={0.4} />

      {/* ── Resistance line ── */}
      <line x1={chartLeft} y1={resY} x2={chartRight + 10} y2={resY}
        stroke={theme.amber} strokeWidth={2.5} strokeDasharray="10 5" opacity={0.9} />
      <rect x={chartRight + 14} y={resY - 13} width={140} height={24} rx={7} fill={theme.amberDim} stroke={theme.amber} strokeWidth={1} />
      <text x={chartRight + 84} y={resY + 4} textAnchor="middle" fontFamily={font}
        fontSize={13} fontWeight={700} fill={theme.amber}>Resistance</text>

      {/* ── Support line ── */}
      <line x1={chartLeft} y1={supY} x2={chartRight + 10} y2={supY}
        stroke={theme.greenLight} strokeWidth={2.5} strokeDasharray="10 5" opacity={0.9} />
      <rect x={chartRight + 14} y={supY - 13} width={120} height={24} rx={7} fill={theme.greenDim} stroke={theme.greenLight} strokeWidth={1} />
      <text x={chartRight + 74} y={supY + 4} textAnchor="middle" fontFamily={font}
        fontSize={13} fontWeight={700} fill={theme.greenLight}>Support</text>

      {/* ── Role reversal zone ── */}
      {/* Old resistance now acts as support after breakout */}
      <line x1={cx(11)} y1={resY} x2={chartRight + 10} y2={resY}
        stroke={theme.green} strokeWidth={2} strokeDasharray="6 3" opacity={0.7} />
      <rect x={cx(12)} y={resY + 6} width={128} height={40} rx={8} fill="rgba(29,158,117,0.12)" stroke={theme.green} strokeWidth={1} opacity={0.8} />
      <text x={cx(12) + 64} y={resY + 22} textAnchor="middle" fontFamily={font} fontSize={11} fontWeight={700} fill={theme.greenLight}>Role Reversal</text>
      <text x={cx(12) + 64} y={resY + 38} textAnchor="middle" fontFamily={font} fontSize={10} fill={theme.whiteSec}>Resistance → Support</text>

      {/* Dotted connecting arrow for role reversal */}
      <path d={`M${cx(12)},${resY} Q${cx(12)-20},${(resY+midY)/2} ${cx(12)-20},${midY}`}
        fill="none" stroke={theme.green} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.5} />

      {/* ── Candles ── */}
      {candles.map((c, i) => (
        <Candle key={i} x={cx(i)} open={cy(c.o)} close={cy(c.c)}
          high={cy(c.h)} low={cy(c.l)} width={Math.max(colW * 0.6, 8)} />
      ))}

      {/* Rejection arrows at resistance */}
      {rejections.map(i => (
        <g key={i}>
          <polygon points={`${cx(i)},${resY+18} ${cx(i)-8},${resY+6} ${cx(i)+8},${resY+6}`}
            fill={theme.red} opacity={0.85} />
        </g>
      ))}

      {/* Bounce arrows at support */}
      {bounces.map(i => (
        <g key={i}>
          <polygon points={`${cx(i)},${supY-18} ${cx(i)-8},${supY-6} ${cx(i)+8},${supY-6}`}
            fill={theme.green} opacity={0.85} />
        </g>
      ))}

      {/* Bottom caption */}
      <text x={W/2} y={H-24} textAnchor="middle" fontFamily={font} fontSize={13}
        fill={theme.whiteSec}>
        Price respects these levels multiple times — the more touches, the stronger the zone
      </text>
    </svg>
  );
};
