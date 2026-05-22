import React from "react";
import { theme } from "./shared/theme";

const { W, H, font } = theme;

// Build a smooth price line from control points
function linePoints(pts: [number, number][]): string {
  return pts.map(([x, y]) => `${x},${y}`).join(' ');
}

export const HeadAndShoulders: React.FC = () => {
  // ── Bearish H&S (top half) ──
  const topBase = H * 0.08;
  const topMid = H * 0.44;

  const hsPts: [number, number][] = [
    [60,  topMid],
    [140, topMid - 70],   // left shoulder peak
    [210, topMid - 15],   // left trough
    [320, topMid - 140],  // head peak
    [430, topMid - 15],   // right trough
    [510, topMid - 70],   // right shoulder peak
    [590, topMid],        // neckline break
    [680, topMid + 60],   // target move down
  ];

  // Neckline connects the two troughs
  const neckY = topMid - 15;

  // ── Inverse H&S (bottom half) ──
  const botMid = H * 0.72;

  const ihsPts: [number, number][] = [
    [W - 680, botMid],
    [W - 590, botMid + 70],   // left shoulder trough
    [W - 510, botMid + 15],   // left peak
    [W - 430, botMid + 140],  // head trough
    [W - 320, botMid + 15],   // right peak
    [W - 210, botMid + 70],   // right shoulder trough
    [W - 140, botMid],        // neckline break
    [W - 60,  botMid - 60],   // target move up
  ];

  const iNeckY = botMid + 15;

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={theme.bg} />
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        </pattern>
        <marker id="arrowRed" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={theme.red} />
        </marker>
        <marker id="arrowGreen" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={theme.green} />
        </marker>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />

      {/* Section divider */}
      <line x1={20} y1={H / 2} x2={W - 20} y2={H / 2} stroke={theme.border} strokeWidth={1} strokeDasharray="6 6" />

      {/* ── BEARISH H&S ── */}
      {/* Price line */}
      <polyline points={linePoints(hsPts)} fill="none" stroke={theme.white}
        strokeWidth={2.5} strokeLinejoin="round" />
      {/* Area fill */}
      <polygon points={`${hsPts[0][0]},${topMid + 40} ${linePoints(hsPts)} ${hsPts[hsPts.length-1][0]},${topMid + 40}`}
        fill="rgba(255,255,255,0.04)" />

      {/* Neckline */}
      <line x1={60} y1={neckY} x2={640} y2={neckY} stroke={theme.amber}
        strokeWidth={2} strokeDasharray="8 4" />
      <rect x={640} y={neckY - 12} width={84} height={22} rx={6} fill={theme.amberDim} />
      <text x={682} y={neckY + 4} textAnchor="middle" fontFamily={font} fontSize={12}
        fontWeight={700} fill={theme.amber}>Neckline</text>

      {/* Peak labels */}
      {[
        { pt: hsPts[1], label: "Left\nShoulder" },
        { pt: hsPts[3], label: "Head" },
        { pt: hsPts[5], label: "Right\nShoulder" },
      ].map(({ pt, label }) => (
        <g key={label}>
          <circle cx={pt[0]} cy={pt[1]} r={5} fill={theme.white} />
          {label.split('\n').map((line, i) => (
            <text key={i} x={pt[0]} y={pt[1] - 20 + i * 16} textAnchor="middle"
              fontFamily={font} fontSize={12} fontWeight={600} fill={theme.white}>{line}</text>
          ))}
        </g>
      ))}

      {/* Entry arrow */}
      <line x1={590} y1={neckY - 8} x2={590} y2={neckY + 50}
        stroke={theme.red} strokeWidth={2} markerEnd="url(#arrowRed)" />
      <rect x={600} y={neckY + 8} width={52} height={20} rx={5} fill={theme.redDim} />
      <text x={626} y={neckY + 22} textAnchor="middle" fontFamily={font} fontSize={11}
        fontWeight={700} fill={theme.red}>Entry</text>

      {/* Target dotted line */}
      <line x1={590} y1={topMid + 50} x2={590} y2={topMid + 10} stroke={theme.red}
        strokeWidth={1.5} strokeDasharray="4 3" opacity={0.6} />
      <text x={620} y={topMid + 35} fontFamily={font} fontSize={11} fill={theme.redLight}>Target</text>

      {/* Label */}
      <rect x={W - 230} y={topBase + 10} width={210} height={36} rx={8} fill={theme.redDim} />
      <text x={W - 125} y={topBase + 33} textAnchor="middle" fontFamily={font} fontSize={14}
        fontWeight={700} fill={theme.red}>Bearish Reversal Pattern</text>

      {/* ── INVERSE H&S ── */}
      <polyline points={linePoints(ihsPts)} fill="none" stroke={theme.greenLight}
        strokeWidth={2.5} strokeLinejoin="round" />
      <polygon points={`${ihsPts[0][0]},${botMid - 40} ${linePoints(ihsPts)} ${ihsPts[ihsPts.length-1][0]},${botMid - 40}`}
        fill="rgba(29,158,117,0.05)" />

      {/* Inverse neckline */}
      <line x1={W - 640} y1={iNeckY} x2={W - 60} y2={iNeckY} stroke={theme.amber}
        strokeWidth={2} strokeDasharray="8 4" />
      <rect x={W - 724} y={iNeckY - 12} width={84} height={22} rx={6} fill={theme.amberDim} />
      <text x={W - 682} y={iNeckY + 4} textAnchor="middle" fontFamily={font} fontSize={12}
        fontWeight={700} fill={theme.amber}>Neckline</text>

      {/* Trough labels */}
      {[
        { pt: ihsPts[1], label: "Left\nShoulder" },
        { pt: ihsPts[3], label: "Head" },
        { pt: ihsPts[5], label: "Right\nShoulder" },
      ].map(({ pt, label }) => (
        <g key={label}>
          <circle cx={pt[0]} cy={pt[1]} r={5} fill={theme.greenLight} />
          {label.split('\n').map((line, i) => (
            <text key={i} x={pt[0]} y={pt[1] + 26 + i * 16} textAnchor="middle"
              fontFamily={font} fontSize={12} fontWeight={600} fill={theme.greenLight}>{line}</text>
          ))}
        </g>
      ))}

      {/* Entry arrow up */}
      <line x1={W - 590} y1={iNeckY + 8} x2={W - 590} y2={iNeckY - 50}
        stroke={theme.green} strokeWidth={2} markerEnd="url(#arrowGreen)" />
      <rect x={W - 648} y={iNeckY - 28} width={52} height={20} rx={5} fill={theme.greenDim} />
      <text x={W - 622} y={iNeckY - 14} textAnchor="middle" fontFamily={font} fontSize={11}
        fontWeight={700} fill={theme.green}>Entry</text>

      {/* Label */}
      <rect x={20} y={H - 56} width={220} height={36} rx={8} fill={theme.greenDim} />
      <text x={130} y={H - 33} textAnchor="middle" fontFamily={font} fontSize={14}
        fontWeight={700} fill={theme.greenLight}>Bullish Reversal Pattern</text>
    </svg>
  );
};
