import React from "react";
import { theme } from "./shared/theme";

const { W, H, font } = theme;

interface CandleDrawProps {
  x: number; cy: number;
  bodyH: number; bodyOffsetFromMid?: number;
  upperWick: number; lowerWick: number;
  color: string; bodyW?: number;
}

const CandleDraw: React.FC<CandleDrawProps> = ({
  x, cy, bodyH, bodyOffsetFromMid = 0, upperWick, lowerWick, color, bodyW = 30,
}) => {
  const bodyTop = cy - bodyH / 2 + bodyOffsetFromMid;
  const bodyBot = bodyTop + bodyH;
  return (
    <g>
      <line x1={x} y1={bodyTop - upperWick} x2={x} y2={bodyTop} stroke={color} strokeWidth={2} />
      <line x1={x} y1={bodyBot} x2={x} y2={bodyBot + lowerWick} stroke={color} strokeWidth={2} />
      <rect x={x - bodyW / 2} y={bodyTop} width={bodyW} height={Math.max(bodyH, 2)} fill={color} rx={3} />
    </g>
  );
};

const TYPES = [
  {
    label: "Doji",
    desc: "Indecision",
    color: theme.whiteSec,
    bodyH: 3, upperWick: 70, lowerWick: 70, bodyOffsetFromMid: 0,
  },
  {
    label: "Hammer",
    desc: "Bullish reversal",
    color: theme.green,
    bodyH: 28, upperWick: 8, lowerWick: 90, bodyOffsetFromMid: -30,
  },
  {
    label: "Shooting Star",
    desc: "Bearish reversal",
    color: theme.red,
    bodyH: 28, upperWick: 90, lowerWick: 8, bodyOffsetFromMid: 30,
  },
  {
    label: "Bullish Marubozu",
    desc: "Strong buyers",
    color: theme.green,
    bodyH: 110, upperWick: 0, lowerWick: 0, bodyOffsetFromMid: 0,
  },
  {
    label: "Bearish Marubozu",
    desc: "Strong sellers",
    color: theme.red,
    bodyH: 110, upperWick: 0, lowerWick: 0, bodyOffsetFromMid: 0,
  },
  {
    label: "Spinning Top",
    desc: "Weak trend",
    color: theme.whiteSec,
    bodyH: 30, upperWick: 55, lowerWick: 55, bodyOffsetFromMid: 0,
  },
];

export const CandleTypes: React.FC = () => {
  const cols = TYPES.length;
  const colW = W / cols;
  const cy = H / 2 - 30;

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={theme.bg} />
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />

      <text x={W / 2} y={50} textAnchor="middle" fontFamily={font} fontSize={26}
        fontWeight={700} fill={theme.white}>Candlestick Types</text>
      <line x1={W / 2 - 130} y1={64} x2={W / 2 + 130} y2={64}
        stroke={theme.greenLight} strokeWidth={2} opacity={0.5} />

      {TYPES.map((t, i) => {
        const x = colW * i + colW / 2;
        return (
          <g key={t.label}>
            {/* Divider accent */}
            <line x1={x - 28} y1={cy + 90} x2={x + 28} y2={cy + 90}
              stroke={theme.greenLight} strokeWidth={2} opacity={0.7} />

            <CandleDraw
              x={x} cy={cy}
              bodyH={t.bodyH}
              bodyOffsetFromMid={t.bodyOffsetFromMid}
              upperWick={t.upperWick}
              lowerWick={t.lowerWick}
              color={t.color}
            />

            <text x={x} y={cy + 110} textAnchor="middle" fontFamily={font}
              fontSize={15} fontWeight={700} fill={theme.white}>{t.label}</text>
            <text x={x} y={cy + 130} textAnchor="middle" fontFamily={font}
              fontSize={12} fill={theme.whiteSec}>{t.desc}</text>

            {/* Vertical dividers between columns */}
            {i > 0 && (
              <line x1={colW * i} y1={90} x2={colW * i} y2={H - 20}
                stroke={theme.border} strokeWidth={1} />
            )}
          </g>
        );
      })}
    </svg>
  );
};
