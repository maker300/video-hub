import React from "react";
import { theme } from "./theme";

export interface CandleProps {
  x: number;
  open: number;
  close: number;
  high: number;
  low: number;
  width?: number;
  color?: string;
}

export const Candle: React.FC<CandleProps> = ({
  x, open, close, high, low, width = 24, color,
}) => {
  const bull = close < open; // lower y = higher price in SVG
  const fill = color ?? (bull ? theme.green : theme.red);
  const bodyTop = Math.min(open, close);
  const bodyH = Math.max(Math.abs(close - open), 2);
  return (
    <g>
      <line x1={x} y1={high} x2={x} y2={bodyTop} stroke={fill} strokeWidth={1.5} />
      <line x1={x} y1={bodyTop + bodyH} x2={x} y2={low} stroke={fill} strokeWidth={1.5} />
      <rect x={x - width / 2} y={bodyTop} width={width} height={bodyH} fill={fill} rx={2} />
    </g>
  );
};
