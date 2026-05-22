import React from "react";
import { theme } from "./shared/theme";
import { Candle } from "./shared/Candle";

const { W, H, font } = theme;

interface CardProps {
  x: number; y: number; w: number; h: number;
  title: string; color: string; children: React.ReactNode;
}
const Card: React.FC<CardProps> = ({ x, y, w, h, title, color, children }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={14} fill={theme.bgCard} stroke={theme.border} strokeWidth={1.5} />
    <rect x={x} y={y} width={w} height={36} rx={14} fill={`${color}22`} />
    <rect x={x} y={y + 22} width={w} height={14} fill={`${color}22`} />
    <text x={x + w / 2} y={y + 24} textAnchor="middle" fontFamily={font} fontSize={15}
      fontWeight={700} fill={theme.white}>{title}</text>
    {children}
  </g>
);

export const ChartPatterns: React.FC = () => {
  const pad = 20;
  const cW = (W - pad * 3) / 2;
  const cH = (H - pad * 3 - 60) / 2;
  const x1 = pad, x2 = pad * 2 + cW;
  const y1 = 60, y2 = 60 + cH + pad;

  const toY = (base: number, ratio: number, range: number) => base + cH * 0.1 + ratio * cH * range;

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={theme.bg} />
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        </pattern>
        <marker id="arrowDown" markerWidth="8" markerHeight="7" refX="4" refY="0" orient="auto">
          <polygon points="0 0, 8 0, 4 7" fill={theme.red} />
        </marker>
        <marker id="arrowUp" markerWidth="8" markerHeight="7" refX="4" refY="7" orient="auto-start-reverse">
          <polygon points="0 7, 8 7, 4 0" fill={theme.green} />
        </marker>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />

      <text x={W / 2} y={44} textAnchor="middle" fontFamily={font} fontSize={22}
        fontWeight={700} fill={theme.white}>Chart Patterns</text>

      {/* ── TOP LEFT: Double Top ── */}
      <Card x={x1} y={y1} w={cW} h={cH} title="Double Top" color={theme.red}>
        {(() => {
          const base = y1 + cH * 0.15;
          const peakY = y1 + cH * 0.25;
          const troughY = y1 + cH * 0.55;
          const neckY = troughY;
          const pts: [number,number][] = [
            [x1+30, base+50], [x1+90, peakY], [x1+160, troughY], [x1+220, peakY+5], [x1+290, neckY+10], [x1+330, neckY+50]
          ];
          return (
            <>
              <polyline points={pts.map(p=>p.join(',')).join(' ')} fill="none" stroke={theme.red} strokeWidth={2.5} strokeLinejoin="round" />
              <line x1={x1+30} y1={neckY} x2={x1+340} y2={neckY} stroke={theme.amber} strokeWidth={1.5} strokeDasharray="6 3" />
              <text x={x1+cW/2} y={neckY-8} textAnchor="middle" fontFamily={font} fontSize={11} fill={theme.amber}>Neckline</text>
              <circle cx={x1+90} cy={peakY} r={5} fill={theme.red} />
              <circle cx={x1+220} cy={peakY+5} r={5} fill={theme.red} />
              {/* down arrow */}
              <line x1={x1+310} y1={neckY+15} x2={x1+310} y2={neckY+55} stroke={theme.red} strokeWidth={2} markerEnd="url(#arrowDown)" />
              <rect x={x1+cW-95} y={y1+cH-38} width={86} height={20} rx={5} fill={theme.redDim} />
              <text x={x1+cW-52} y={y1+cH-24} textAnchor="middle" fontFamily={font} fontSize={11} fontWeight={700} fill={theme.red}>Breakdown ↓</text>
            </>
          );
        })()}
      </Card>

      {/* ── TOP RIGHT: Double Bottom ── */}
      <Card x={x2} y={y1} w={cW} h={cH} title="Double Bottom" color={theme.green}>
        {(() => {
          const troughY = y1 + cH * 0.65;
          const peakY = y1 + cH * 0.35;
          const neckY = peakY + 10;
          const pts: [number,number][] = [
            [x2+30, y1+cH*0.3], [x2+90, troughY], [x2+160, neckY+5], [x2+220, troughY-5], [x2+290, neckY], [x2+330, neckY-60]
          ];
          return (
            <>
              <polyline points={pts.map(p=>p.join(',')).join(' ')} fill="none" stroke={theme.green} strokeWidth={2.5} strokeLinejoin="round" />
              <line x1={x2+30} y1={neckY} x2={x2+340} y2={neckY} stroke={theme.amber} strokeWidth={1.5} strokeDasharray="6 3" />
              <text x={x2+cW/2} y={neckY-8} textAnchor="middle" fontFamily={font} fontSize={11} fill={theme.amber}>Neckline</text>
              <circle cx={x2+90} cy={troughY} r={5} fill={theme.green} />
              <circle cx={x2+220} cy={troughY-5} r={5} fill={theme.green} />
              <line x1={x2+310} y1={neckY-15} x2={x2+310} y2={neckY-55} stroke={theme.green} strokeWidth={2} markerEnd="url(#arrowUp)" />
              <rect x={x2+cW-95} y={y1+cH-38} width={86} height={20} rx={5} fill={theme.greenDim} />
              <text x={x2+cW-52} y={y1+cH-24} textAnchor="middle" fontFamily={font} fontSize={11} fontWeight={700} fill={theme.green}>Breakout ↑</text>
            </>
          );
        })()}
      </Card>

      {/* ── BOTTOM LEFT: Ascending Triangle ── */}
      <Card x={x1} y={y2} w={cW} h={cH} title="Ascending Triangle" color={theme.green}>
        {(() => {
          const flatY = y2 + cH * 0.3;
          const startLow = y2 + cH * 0.8;
          const apexX = x1 + cW * 0.72;
          const pts: [number,number][] = [
            [x1+30, startLow], [x1+90, flatY+5], [x1+140, startLow-35],
            [x1+200, flatY+3], [x1+260, startLow-70], [apexX, flatY],
          ];
          return (
            <>
              {/* Flat resistance */}
              <line x1={x1+30} y1={flatY} x2={x1+cW-30} y2={flatY} stroke={theme.red} strokeWidth={2} strokeDasharray="6 3" />
              <text x={x1+cW-30} y={flatY-8} textAnchor="end" fontFamily={font} fontSize={11} fill={theme.red}>Resistance</text>
              {/* Rising lows line */}
              <line x1={x1+30} y1={startLow} x2={apexX} y2={flatY} stroke={theme.green} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />
              <polyline points={pts.map(p=>p.join(',')).join(' ')} fill="none" stroke={theme.white} strokeWidth={2} strokeLinejoin="round" />
              {/* Breakout */}
              <line x1={apexX} y1={flatY} x2={x1+cW-30} y2={flatY-50} stroke={theme.green} strokeWidth={2.5} markerEnd="url(#arrowUp)" />
            </>
          );
        })()}
      </Card>

      {/* ── BOTTOM RIGHT: Bull Flag ── */}
      <Card x={x2} y={y2} w={cW} h={cH} title="Bull Flag" color={theme.green}>
        {(() => {
          const poleBot = y2 + cH * 0.82;
          const poleTop = y2 + cH * 0.22;
          const poleX = x2 + cW * 0.32;
          const flagBot1 = poleTop + 30;
          const flagTop1 = poleTop + 12;
          const flagBot2 = flagBot1 + 45;
          const flagTop2 = flagTop1 + 45;
          const flagEndX = poleX + 130;
          return (
            <>
              {/* Flagpole */}
              <line x1={poleX} y1={poleBot} x2={poleX} y2={poleTop} stroke={theme.green} strokeWidth={3} />
              {/* Candles on pole */}
              {[0,1,2,3].map(i => (
                <Candle key={i} x={poleX - 30 + i * 18} open={poleBot - i*42 + 12} close={poleBot - i*42 - 28}
                  high={poleBot - i*42 - 36} low={poleBot - i*42 + 20} width={12} color={theme.green} />
              ))}
              {/* Flag rectangle */}
              <polygon points={`${poleX},${flagTop1} ${flagEndX},${flagTop2} ${flagEndX},${flagBot2} ${poleX},${flagBot1}`}
                fill={theme.redDim} stroke={theme.red} strokeWidth={1.5} />
              <text x={poleX + 65} y={(flagTop1+flagBot1)/2 + (flagTop2-flagTop1)*0.5 + 5}
                textAnchor="middle" fontFamily={font} fontSize={11} fill={theme.redLight}>Flag</text>
              {/* Continuation arrow */}
              <line x1={flagEndX} y1={flagTop2 + 10} x2={flagEndX + 60} y2={flagTop2 - 50}
                stroke={theme.green} strokeWidth={2.5} markerEnd="url(#arrowUp)" />
            </>
          );
        })()}
      </Card>
    </svg>
  );
};
