import React from "react";
import { theme } from "./shared/theme";
import { Candle } from "./shared/Candle";

const { W, H, font } = theme;

interface PatternCardProps {
  x: number; y: number; w: number; h: number;
  title: string; subtitle: string; bullish: boolean;
  children: React.ReactNode;
}

const PatternCard: React.FC<PatternCardProps> = ({ x, y, w, h, title, subtitle, bullish, children }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={16} fill={theme.bgCard} stroke={theme.border} strokeWidth={1.5} />
    <text x={x + w / 2} y={y + 34} textAnchor="middle" fontFamily={font} fontSize={17}
      fontWeight={700} fill={theme.white}>{title}</text>
    <text x={x + w / 2} y={y + 54} textAnchor="middle" fontFamily={font} fontSize={12}
      fill={bullish ? theme.greenLight : theme.redLight}>{subtitle}</text>
    {children}
  </g>
);

// Arrow helper
const Arrow: React.FC<{ x: number; y: number; up: boolean; color: string }> = ({ x, y, up, color }) => {
  const d = up
    ? `M${x},${y} L${x - 12},${y + 22} L${x},${y + 10} L${x + 12},${y + 22}Z`
    : `M${x},${y} L${x - 12},${y - 22} L${x},${y - 10} L${x + 12},${y - 22}Z`;
  return <path d={d} fill={color} opacity={0.9} />;
};

export const MultiCandlePatterns: React.FC = () => {
  const pad = 24;
  const cardW = (W - pad * 3) / 2;
  const cardH = (H - pad * 3 - 70) / 2;
  const x1 = pad, x2 = pad * 2 + cardW;
  const y1 = 70, y2 = 70 + cardH + pad;

  // Candle data helpers (y coords — lower y = higher price)
  const mid = (y: number) => y + cardH / 2 - 10;

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={theme.bg} />
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />

      <text x={W / 2} y={48} textAnchor="middle" fontFamily={font} fontSize={24}
        fontWeight={700} fill={theme.white}>Multi-Candle Patterns</text>

      {/* ── TOP LEFT: Bullish Engulfing ── */}
      <PatternCard x={x1} y={y1} w={cardW} h={cardH} title="Bullish Engulfing"
        subtitle="Bullish reversal signal" bullish={true}>
        {/* small red, then larger green */}
        <Candle x={x1 + cardW * 0.38} open={mid(y1) + 20} close={mid(y1) - 10}
          high={mid(y1) - 20} low={mid(y1) + 35} width={28} color={theme.red} />
        <Candle x={x1 + cardW * 0.62} open={mid(y1) + 45} close={mid(y1) - 35}
          high={mid(y1) - 50} low={mid(y1) + 60} width={40} color={theme.green} />
        <Arrow x={x1 + cardW * 0.82} y={mid(y1) + 55} up={true} color={theme.green} />
      </PatternCard>

      {/* ── TOP RIGHT: Bearish Engulfing ── */}
      <PatternCard x={x2} y={y1} w={cardW} h={cardH} title="Bearish Engulfing"
        subtitle="Bearish reversal signal" bullish={false}>
        <Candle x={x2 + cardW * 0.38} open={mid(y1) - 20} close={mid(y1) + 10}
          high={mid(y1) - 35} low={mid(y1) + 20} width={28} color={theme.green} />
        <Candle x={x2 + cardW * 0.62} open={mid(y1) - 45} close={mid(y1) + 35}
          high={mid(y1) - 60} low={mid(y1) + 50} width={40} color={theme.red} />
        <Arrow x={x2 + cardW * 0.82} y={mid(y1) - 50} up={false} color={theme.red} />
      </PatternCard>

      {/* ── BOTTOM LEFT: Morning Star ── */}
      <PatternCard x={x1} y={y2} w={cardW} h={cardH} title="Morning Star"
        subtitle="3-candle bullish reversal" bullish={true}>
        <Candle x={x1 + cardW * 0.28} open={mid(y2) - 20} close={mid(y2) + 55}
          high={mid(y2) - 35} low={mid(y2) + 70} width={32} color={theme.red} />
        <Candle x={x1 + cardW * 0.50} open={mid(y2) + 70} close={mid(y2) + 62}
          high={mid(y2) + 55} low={mid(y2) + 80} width={20} color={theme.whiteSec} />
        <Candle x={x1 + cardW * 0.72} open={mid(y2) + 55} close={mid(y2) - 15}
          high={mid(y2) - 30} low={mid(y2) + 70} width={32} color={theme.green} />
        <Arrow x={x1 + cardW * 0.88} y={mid(y2) + 60} up={true} color={theme.green} />
      </PatternCard>

      {/* ── BOTTOM RIGHT: Evening Star ── */}
      <PatternCard x={x2} y={y2} w={cardW} h={cardH} title="Evening Star"
        subtitle="3-candle bearish reversal" bullish={false}>
        <Candle x={x2 + cardW * 0.28} open={mid(y2) + 20} close={mid(y2) - 55}
          high={mid(y2) - 70} low={mid(y2) + 35} width={32} color={theme.green} />
        <Candle x={x2 + cardW * 0.50} open={mid(y2) - 70} close={mid(y2) - 62}
          high={mid(y2) - 80} low={mid(y2) - 55} width={20} color={theme.whiteSec} />
        <Candle x={x2 + cardW * 0.72} open={mid(y2) - 55} close={mid(y2) + 15}
          high={mid(y2) - 70} low={mid(y2) + 30} width={32} color={theme.red} />
        <Arrow x={x2 + cardW * 0.88} y={mid(y2) - 60} up={false} color={theme.red} />
      </PatternCard>
    </svg>
  );
};
