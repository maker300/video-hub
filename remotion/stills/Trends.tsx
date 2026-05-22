import React from "react";
import { theme } from "./shared/theme";
import { Candle } from "./shared/Candle";

const { W, H, font } = theme;
const secW = W / 3;
const chartTop = 120;
const chartBot = H - 90;
const chartH = chartBot - chartTop;

// Helper to render a badge circle
const Badge: React.FC<{ x: number; y: number; label: string; color: string }> = ({ x, y, label, color }) => (
  <g>
    <circle cx={x} cy={y} r={14} fill={color} opacity={0.25} />
    <circle cx={x} cy={y} r={14} fill="none" stroke={color} strokeWidth={1.5} />
    <text x={x} y={y + 5} textAnchor="middle" fontFamily={font} fontSize={11}
      fontWeight={700} fill={color}>{label}</text>
  </g>
);

export const Trends: React.FC = () => {
  // ── Uptrend candles (left section) ──
  const upCandles = [
    { o: 0.80, c: 0.70, h: 0.68, l: 0.83 },
    { o: 0.72, c: 0.60, h: 0.57, l: 0.75 },
    { o: 0.65, c: 0.55, h: 0.52, l: 0.68 },
    { o: 0.62, c: 0.52, h: 0.49, l: 0.65 },
    { o: 0.56, c: 0.45, h: 0.42, l: 0.59 },
    { o: 0.50, c: 0.38, h: 0.35, l: 0.52 },
    { o: 0.44, c: 0.32, h: 0.29, l: 0.47 },
    { o: 0.38, c: 0.26, h: 0.23, l: 0.41 },
  ];

  // ── Downtrend candles (center section) ──
  const downCandles = [
    { o: 0.20, c: 0.30, h: 0.17, l: 0.33 },
    { o: 0.28, c: 0.40, h: 0.25, l: 0.43 },
    { o: 0.36, c: 0.50, h: 0.33, l: 0.53 },
    { o: 0.45, c: 0.57, h: 0.42, l: 0.60 },
    { o: 0.52, c: 0.65, h: 0.49, l: 0.68 },
    { o: 0.58, c: 0.72, h: 0.55, l: 0.75 },
    { o: 0.65, c: 0.78, h: 0.62, l: 0.81 },
    { o: 0.72, c: 0.85, h: 0.69, l: 0.88 },
  ];

  const toY = (ratio: number) => chartTop + ratio * chartH;
  const upX = (i: number) => 40 + (i + 0.5) * ((secW - 60) / upCandles.length);
  const dnX = (i: number) => secW + 30 + (i + 0.5) * ((secW - 60) / downCandles.length);
  const rgX = (i: number) => secW * 2 + 30 + (i + 0.5) * ((secW - 60) / 8);

  // Trend line for uptrend (connecting lows)
  const upLowPts = upCandles.map((c, i) => `${upX(i)},${toY(c.l)}`).join(' ');
  const dnHighPts = downCandles.map((c, i) => `${dnX(i)},${toY(c.h)}`).join(' ');

  // Ranging zone
  const rTop = toY(0.25);
  const rBot = toY(0.75);
  const rangingCandles = [
    { o: 0.70, c: 0.55, h: 0.50, l: 0.75 },
    { o: 0.55, c: 0.42, h: 0.38, l: 0.60 },
    { o: 0.45, c: 0.65, h: 0.42, l: 0.75 },
    { o: 0.62, c: 0.50, h: 0.48, l: 0.75 },
    { o: 0.52, c: 0.38, h: 0.35, l: 0.55 },
    { o: 0.40, c: 0.55, h: 0.36, l: 0.60 },
    { o: 0.55, c: 0.68, h: 0.50, l: 0.75 },
    { o: 0.65, c: 0.52, h: 0.48, l: 0.75 },
  ];

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={theme.bg} />
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />

      {/* Section dividers */}
      <line x1={secW} y1={80} x2={secW} y2={H - 20} stroke={theme.border} strokeWidth={1.5} />
      <line x1={secW * 2} y1={80} x2={secW * 2} y2={H - 20} stroke={theme.border} strokeWidth={1.5} />

      {/* ── Section headers ── */}
      {[
        { x: secW / 2, label: "Uptrend", color: theme.greenLight, desc: "Higher Highs + Higher Lows" },
        { x: secW + secW / 2, label: "Downtrend", color: theme.redLight, desc: "Lower Highs + Lower Lows" },
        { x: secW * 2 + secW / 2, label: "Ranging", color: theme.amber, desc: "Price Between Two Levels" },
      ].map(s => (
        <g key={s.label}>
          <text x={s.x} y={50} textAnchor="middle" fontFamily={font} fontSize={20}
            fontWeight={700} fill={s.color}>{s.label}</text>
          <text x={s.x} y={70} textAnchor="middle" fontFamily={font} fontSize={12}
            fill={theme.whiteSec}>{s.desc}</text>
        </g>
      ))}

      {/* ── UPTREND ── */}
      {upCandles.map((c, i) => (
        <Candle key={i} x={upX(i)} open={toY(c.o)} close={toY(c.c)}
          high={toY(c.h)} low={toY(c.l)} width={18} />
      ))}
      {/* Rising trend line */}
      <polyline points={upLowPts} fill="none" stroke={theme.green}
        strokeWidth={2} strokeDasharray="6 3" opacity={0.8} />
      {/* HH badges at peaks */}
      <Badge x={upX(1)} y={toY(upCandles[1].h) - 20} label="HH" color={theme.greenLight} />
      <Badge x={upX(5)} y={toY(upCandles[5].h) - 20} label="HH" color={theme.greenLight} />
      {/* HL badges at lows */}
      <Badge x={upX(2)} y={toY(upCandles[2].l) + 20} label="HL" color={theme.green} />
      <Badge x={upX(6)} y={toY(upCandles[6].l) + 20} label="HL" color={theme.green} />

      {/* ── DOWNTREND ── */}
      {downCandles.map((c, i) => (
        <Candle key={i} x={dnX(i)} open={toY(c.o)} close={toY(c.c)}
          high={toY(c.h)} low={toY(c.l)} width={18} />
      ))}
      {/* Falling trend line */}
      <polyline points={dnHighPts} fill="none" stroke={theme.red}
        strokeWidth={2} strokeDasharray="6 3" opacity={0.8} />
      {/* LH badges */}
      <Badge x={dnX(1)} y={toY(downCandles[1].h) - 20} label="LH" color={theme.amber} />
      <Badge x={dnX(5)} y={toY(downCandles[5].h) - 20} label="LH" color={theme.amber} />
      {/* LL badges */}
      <Badge x={dnX(2)} y={toY(downCandles[2].l) + 20} label="LL" color={theme.red} />
      <Badge x={dnX(6)} y={toY(downCandles[6].l) + 20} label="LL" color={theme.red} />

      {/* ── RANGING ── */}
      {/* Resistance line */}
      <line x1={secW * 2 + 10} y1={rTop} x2={W - 10} y2={rTop}
        stroke={theme.red} strokeWidth={2} strokeDasharray="8 4" opacity={0.85} />
      <rect x={secW * 2 + 12} y={rTop - 18} width={90} height={20} rx={5} fill={theme.redDim} />
      <text x={secW * 2 + 57} y={rTop - 4} textAnchor="middle" fontFamily={font}
        fontSize={12} fontWeight={700} fill={theme.red}>Resistance</text>

      {/* Support line */}
      <line x1={secW * 2 + 10} y1={rBot} x2={W - 10} y2={rBot}
        stroke={theme.green} strokeWidth={2} strokeDasharray="8 4" opacity={0.85} />
      <rect x={secW * 2 + 12} y={rBot + 2} width={72} height={20} rx={5} fill={theme.greenDim} />
      <text x={secW * 2 + 48} y={rBot + 16} textAnchor="middle" fontFamily={font}
        fontSize={12} fontWeight={700} fill={theme.green}>Support</text>

      {rangingCandles.map((c, i) => (
        <Candle key={i} x={rgX(i)} open={toY(c.o)} close={toY(c.c)}
          high={toY(c.h)} low={toY(c.l)} width={18} />
      ))}

      {/* Bottom summaries */}
      {[
        { x: secW / 2, text: "Price makes higher peaks & valleys", color: theme.greenLight },
        { x: secW + secW / 2, text: "Price makes lower peaks & valleys", color: theme.redLight },
        { x: secW * 2 + secW / 2, text: "Price bounces between two zones", color: theme.amber },
      ].map(s => (
        <text key={s.text} x={s.x} y={H - 20} textAnchor="middle" fontFamily={font}
          fontSize={13} fill={s.color}>{s.text}</text>
      ))}
    </svg>
  );
};
