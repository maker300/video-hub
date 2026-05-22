import React from "react";
import { theme } from "./shared/theme";
import { Candle } from "./shared/Candle";

const { W, H, font } = theme;

export const CandlestickAnatomy: React.FC = () => {
  const midY = H / 2 - 20;

  // Bullish candle (left)
  const bx = W * 0.28;
  const bHigh = midY - 160;
  const bClose = midY - 100;
  const bOpen = midY + 80;
  const bLow = midY + 150;

  // Bearish candle (right)
  const rx = W * 0.72;
  const rHigh = midY - 160;
  const rOpen = midY - 100;
  const rClose = midY + 80;
  const rLow = midY + 150;

  const labelStyle: React.CSSProperties = {
    fontFamily: font, fontSize: 15, fontWeight: 600,
  };
  const descStyle: React.CSSProperties = {
    fontFamily: font, fontSize: 13, fill: theme.whiteSec,
  };

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <rect width={W} height={H} fill={theme.bg} />

      {/* Grid */}
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />

      {/* Title */}
      <text x={W / 2} y={52} textAnchor="middle" fontFamily={font} fontSize={26}
        fontWeight={700} fill={theme.white}>Candlestick Anatomy</text>
      <line x1={W / 2 - 120} y1={66} x2={W / 2 + 120} y2={66}
        stroke={theme.greenLight} strokeWidth={2} opacity={0.5} />

      {/* Column headers */}
      <text x={bx} y={100} textAnchor="middle" fontFamily={font} fontSize={18}
        fontWeight={700} fill={theme.greenLight}>BULLISH</text>
      <text x={rx} y={100} textAnchor="middle" fontFamily={font} fontSize={18}
        fontWeight={700} fill={theme.redLight}>BEARISH</text>

      {/* Bullish candle */}
      <Candle x={bx} open={bOpen} close={bClose} high={bHigh} low={bLow} width={52} color={theme.green} />

      {/* Bearish candle */}
      <Candle x={rx} open={rOpen} close={rClose} high={rHigh} low={rLow} width={52} color={theme.red} />

      {/* ── Bullish labels ─────────────────────────────────────────── */}
      {/* High */}
      <line x1={bx - 60} y1={bHigh} x2={bx - 26} y2={bHigh} stroke={theme.whiteTer} strokeWidth={1} strokeDasharray="4 3" />
      <text x={bx - 68} y={bHigh + 5} textAnchor="end" {...labelStyle as object} fill={theme.white}>High</text>
      <text x={bx - 68} y={bHigh + 20} textAnchor="end" style={descStyle}>Highest point</text>

      {/* Close */}
      <line x1={bx - 60} y1={bClose} x2={bx - 26} y2={bClose} stroke={theme.whiteTer} strokeWidth={1} strokeDasharray="4 3" />
      <text x={bx - 68} y={bClose + 5} textAnchor="end" {...labelStyle as object} fill={theme.greenLight}>Close</text>
      <text x={bx - 68} y={bClose + 20} textAnchor="end" style={descStyle}>Buyers finished here</text>

      {/* Body bracket */}
      <line x1={bx - 36} y1={bClose} x2={bx - 36} y2={bOpen} stroke={theme.green} strokeWidth={2} />
      <line x1={bx - 36} y1={bClose} x2={bx - 30} y2={bClose} stroke={theme.green} strokeWidth={2} />
      <line x1={bx - 36} y1={bOpen} x2={bx - 30} y2={bOpen} stroke={theme.green} strokeWidth={2} />
      <text x={bx - 42} y={(bClose + bOpen) / 2 + 5} textAnchor="end" {...labelStyle as object} fill={theme.green}>Body</text>

      {/* Open */}
      <line x1={bx - 60} y1={bOpen} x2={bx - 26} y2={bOpen} stroke={theme.whiteTer} strokeWidth={1} strokeDasharray="4 3" />
      <text x={bx - 68} y={bOpen + 5} textAnchor="end" {...labelStyle as object} fill={theme.greenLight}>Open</text>
      <text x={bx - 68} y={bOpen + 20} textAnchor="end" style={descStyle}>Sellers started here</text>

      {/* Low */}
      <line x1={bx - 60} y1={bLow} x2={bx - 26} y2={bLow} stroke={theme.whiteTer} strokeWidth={1} strokeDasharray="4 3" />
      <text x={bx - 68} y={bLow + 5} textAnchor="end" {...labelStyle as object} fill={theme.white}>Low</text>
      <text x={bx - 68} y={bLow + 20} textAnchor="end" style={descStyle}>Lowest point</text>

      {/* ── Bearish labels ─────────────────────────────────────────── */}
      {/* High */}
      <line x1={rx + 26} y1={rHigh} x2={rx + 60} y2={rHigh} stroke={theme.whiteTer} strokeWidth={1} strokeDasharray="4 3" />
      <text x={rx + 68} y={rHigh + 5} fontFamily={font} fontSize={15} fontWeight={600} fill={theme.white}>High</text>

      {/* Open */}
      <line x1={rx + 26} y1={rOpen} x2={rx + 60} y2={rOpen} stroke={theme.whiteTer} strokeWidth={1} strokeDasharray="4 3" />
      <text x={rx + 68} y={rOpen + 5} fontFamily={font} fontSize={15} fontWeight={600} fill={theme.redLight}>Open</text>
      <text x={rx + 68} y={rOpen + 20} fontFamily={font} fontSize={13} fill={theme.whiteSec}>Sellers started here</text>

      {/* Body bracket */}
      <line x1={rx + 36} y1={rOpen} x2={rx + 36} y2={rClose} stroke={theme.red} strokeWidth={2} />
      <line x1={rx + 30} y1={rOpen} x2={rx + 36} y2={rOpen} stroke={theme.red} strokeWidth={2} />
      <line x1={rx + 30} y1={rClose} x2={rx + 36} y2={rClose} stroke={theme.red} strokeWidth={2} />
      <text x={rx + 42} y={(rOpen + rClose) / 2 + 5} fontFamily={font} fontSize={15} fontWeight={600} fill={theme.red}>Body</text>

      {/* Close */}
      <line x1={rx + 26} y1={rClose} x2={rx + 60} y2={rClose} stroke={theme.whiteTer} strokeWidth={1} strokeDasharray="4 3" />
      <text x={rx + 68} y={rClose + 5} fontFamily={font} fontSize={15} fontWeight={600} fill={theme.redLight}>Close</text>
      <text x={rx + 68} y={rClose + 20} fontFamily={font} fontSize={13} fill={theme.whiteSec}>Buyers finished here</text>

      {/* Low */}
      <line x1={rx + 26} y1={rLow} x2={rx + 60} y2={rLow} stroke={theme.whiteTer} strokeWidth={1} strokeDasharray="4 3" />
      <text x={rx + 68} y={rLow + 5} fontFamily={font} fontSize={15} fontWeight={600} fill={theme.white}>Low</text>

      {/* ── Caption row ─────────────────────────────────────────── */}
      <rect x={80} y={H - 70} width={W / 2 - 120} height={44} rx={10}
        fill={theme.greenDim} stroke={theme.green} strokeWidth={1} />
      <text x={W / 4} y={H - 43} textAnchor="middle" fontFamily={font} fontSize={14}
        fontWeight={600} fill={theme.greenLight}>Close {">"} Open = Buyers won</text>

      <rect x={W / 2 + 40} y={H - 70} width={W / 2 - 120} height={44} rx={10}
        fill={theme.redDim} stroke={theme.red} strokeWidth={1} />
      <text x={W * 3 / 4} y={H - 43} textAnchor="middle" fontFamily={font} fontSize={14}
        fontWeight={600} fill={theme.redLight}>Close {"<"} Open = Sellers won</text>
    </svg>
  );
};
