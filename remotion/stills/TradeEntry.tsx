import React from "react";
import { theme } from "./shared/theme";
import { Candle } from "./shared/Candle";

const { W, H, font } = theme;

export const TradeEntry: React.FC = () => {
  const chartLeft = 60;
  const chartRight = W * 0.62;
  const chartTop = 100;
  const chartBot = H - 110;
  const chartH = chartBot - chartTop;

  // Price levels (as ratios of chartH from top)
  const tpRatio = 0.18;
  const entryRatio = 0.42;
  const slRatio = 0.62;

  const tpY = chartTop + tpRatio * chartH;
  const entryY = chartTop + entryRatio * chartH;
  const slY = chartTop + slRatio * chartH;
  const bracketX = chartRight + 14;

  // 18 candles trending up with pullback then signal
  const candles = [
    { o: 0.80, c: 0.72, h: 0.70, l: 0.83 },
    { o: 0.74, c: 0.64, h: 0.62, l: 0.77 },
    { o: 0.67, c: 0.57, h: 0.55, l: 0.70 },
    { o: 0.60, c: 0.50, h: 0.48, l: 0.63 },
    { o: 0.54, c: 0.44, h: 0.42, l: 0.57 },
    { o: 0.48, c: 0.38, h: 0.36, l: 0.50 },
    // Pullback down
    { o: 0.38, c: 0.48, h: 0.36, l: 0.50 },
    { o: 0.46, c: 0.56, h: 0.44, l: 0.58 },
    { o: 0.54, c: 0.64, h: 0.52, l: 0.66 },
    // Resume up
    { o: 0.65, c: 0.55, h: 0.53, l: 0.67 },
    { o: 0.58, c: 0.48, h: 0.46, l: 0.60 },
    { o: 0.52, c: 0.42, h: 0.40, l: 0.54 },
    { o: 0.46, c: 0.36, h: 0.34, l: 0.48 },
    // Pullback to entry zone
    { o: 0.36, c: 0.46, h: 0.34, l: 0.48 },
    { o: 0.44, c: 0.54, h: 0.42, l: 0.57 },
    { o: 0.50, c: 0.62, h: 0.48, l: 0.64 },
    // Signal candle at entry
    { o: entryRatio + 0.04, c: entryRatio - 0.04, h: entryRatio - 0.07, l: entryRatio + 0.10 },
    { o: entryRatio + 0.03, c: entryRatio - 0.06, h: entryRatio - 0.09, l: entryRatio + 0.07 },
  ];

  const colW = (chartRight - chartLeft) / candles.length;
  const cx = (i: number) => chartLeft + (i + 0.5) * colW;
  const cy = (r: number) => chartTop + r * chartH;

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={theme.bg} />
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        </pattern>
        <marker id="arrowUp" markerWidth="8" markerHeight="7" refX="4" refY="7" orient="auto-start-reverse">
          <polygon points="0 7, 8 7, 4 0" fill={theme.green} />
        </marker>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />

      <text x={W / 2} y={46} textAnchor="middle" fontFamily={font} fontSize={24}
        fontWeight={700} fill={theme.white}>Trade Entry Setup</text>

      {/* Chart area border */}
      <rect x={chartLeft} y={chartTop} width={chartRight - chartLeft} height={chartH}
        fill="rgba(255,255,255,0.02)" rx={8} />

      {/* Candles */}
      {candles.map((c, i) => (
        <Candle key={i} x={cx(i)} open={cy(c.o)} close={cy(c.c)}
          high={cy(c.h)} low={cy(c.l)} width={Math.max(colW * 0.55, 8)} />
      ))}

      {/* Signal candle arrow */}
      <line x1={cx(16)} y1={cy(entryRatio + 0.14)} x2={cx(16)} y2={cy(entryRatio + 0.22)}
        stroke={theme.green} strokeWidth={2} markerEnd="url(#arrowUp)" />

      {/* ── Horizontal level lines ── */}
      {/* Take Profit */}
      <line x1={chartRight - 10} y1={tpY} x2={W - 20} y2={tpY}
        stroke={theme.green} strokeWidth={2} strokeDasharray="8 4" />
      <rect x={W - 230} y={tpY - 14} width={210} height={26} rx={6} fill={theme.greenDim} />
      <text x={W - 125} y={tpY + 4} textAnchor="middle" fontFamily={font} fontSize={13}
        fontWeight={700} fill={theme.greenLight}>Take Profit  1.0940  (+90 pips)</text>

      {/* Entry */}
      <line x1={chartRight - 10} y1={entryY} x2={W - 20} y2={entryY}
        stroke={theme.amber} strokeWidth={2} strokeDasharray="8 4" />
      <rect x={W - 230} y={entryY - 14} width={210} height={26} rx={6} fill={theme.amberDim} />
      <text x={W - 125} y={entryY + 4} textAnchor="middle" fontFamily={font} fontSize={13}
        fontWeight={700} fill={theme.amber}>Entry  1.0850</text>

      {/* Stop Loss */}
      <line x1={chartRight - 10} y1={slY} x2={W - 20} y2={slY}
        stroke={theme.red} strokeWidth={2} strokeDasharray="8 4" />
      <rect x={W - 230} y={slY - 14} width={210} height={26} rx={6} fill={theme.redDim} />
      <text x={W - 125} y={slY + 4} textAnchor="middle" fontFamily={font} fontSize={13}
        fontWeight={700} fill={theme.redLight}>Stop Loss  1.0820  (−30 pips)</text>

      {/* ── Right bracket: Risk / Reward ── */}
      {/* Risk bracket (entry to SL) */}
      <line x1={bracketX} y1={entryY} x2={bracketX} y2={slY}
        stroke={theme.red} strokeWidth={2} />
      <line x1={bracketX} y1={entryY} x2={bracketX + 8} y2={entryY} stroke={theme.red} strokeWidth={2} />
      <line x1={bracketX} y1={slY} x2={bracketX + 8} y2={slY} stroke={theme.red} strokeWidth={2} />
      <text x={bracketX + 12} y={(entryY + slY) / 2 + 5} fontFamily={font} fontSize={12}
        fontWeight={700} fill={theme.red}>Risk 1R</text>

      {/* Reward bracket (entry to TP) */}
      <line x1={bracketX} y1={tpY} x2={bracketX} y2={entryY}
        stroke={theme.green} strokeWidth={2} />
      <line x1={bracketX} y1={tpY} x2={bracketX + 8} y2={tpY} stroke={theme.green} strokeWidth={2} />
      <line x1={bracketX} y1={entryY} x2={bracketX + 8} y2={entryY} stroke={theme.green} strokeWidth={2} />
      <text x={bracketX + 12} y={(tpY + entryY) / 2 + 5} fontFamily={font} fontSize={12}
        fontWeight={700} fill={theme.green}>Reward 3R</text>

      {/* ── RR Badge ── */}
      <rect x={W - 190} y={chartTop} width={170} height={36} rx={10} fill="rgba(0,0,0,0.5)"
        stroke={theme.greenLight} strokeWidth={1.5} />
      <text x={W - 105} y={chartTop + 23} textAnchor="middle" fontFamily={font} fontSize={15}
        fontWeight={700} fill={theme.greenLight}>Risk-Reward = 3:1</text>

      {/* Bottom formula */}
      <rect x={chartLeft} y={H - 90} width={chartRight - chartLeft} height={34} rx={8} fill="rgba(255,255,255,0.04)" />
      <text x={(chartLeft + chartRight) / 2} y={H - 68} textAnchor="middle" fontFamily={font}
        fontSize={13} fill={theme.whiteSec}>
        Position Size = (Account × Risk%) ÷ (Entry − Stop Loss in pips × pip value)
      </text>
    </svg>
  );
};
