import React from "react";
import { tv } from "../shared/tvTheme";

const W = tv.W; // 1200
const H = tv.H; // 675

interface City { x: number; y: number; name: string; currency: string; session: string; color: string }

const CITIES: City[] = [
  { x: 555, y: 168, name: "London",   currency: "GBP £",  session: "08:00–17:00 GMT", color: "#2196f3" },
  { x: 290, y: 230, name: "New York", currency: "USD $",  session: "13:00–22:00 GMT", color: "#26a69a" },
  { x: 980, y: 230, name: "Tokyo",    currency: "JPY ¥",  session: "00:00–09:00 GMT", color: "#ef5350" },
  { x: 990, y: 400, name: "Sydney",   currency: "AUD $",  session: "22:00–07:00 GMT", color: "#f5c518" },
  { x: 620, y: 205, name: "Frankfurt",currency: "EUR €",  session: "07:00–16:00 GMT", color: "#ab47bc" },
];

const PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "GBP/EUR", "AUD/USD"];

const CONNECTIONS = [
  [0, 1], [0, 2], [0, 4], [1, 2], [2, 3],
];

export const WhatIsForex: React.FC = () => {
  const font = tv.font;

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#1a2340" />
          <stop offset="100%" stopColor="#0d1117" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <marker id="arrFX" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="rgba(38,166,154,0.7)" />
        </marker>
      </defs>

      {/* Background */}
      <rect width={W} height={H} fill="url(#bgGrad)" />

      {/* Header */}
      <rect x={0} y={0} width={W} height={56} fill="rgba(0,0,0,0.4)" />
      <text x={W / 2} y={36} textAnchor="middle" fontFamily={font}
        fontSize={26} fontWeight={800} fill="#fff" letterSpacing="2">
        THE FOREX MARKET
      </text>
      <text x={W / 2} y={52} textAnchor="middle" fontFamily={font}
        fontSize={12} fill={tv.axisText}>
        {"The world's largest financial market — $7.5 trillion traded every single day"}
      </text>

      {/* Faint world map grid */}
      {Array.from({ length: 9 }, (_, i) => (
        <line key={`v${i}`} x1={60 + i * 120} y1={60} x2={60 + i * 120} y2={H - 40}
          stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <line key={`h${i}`} x1={40} y1={70 + i * 110} x2={W - 40} y2={70 + i * 110}
          stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
      ))}

      {/* Connection lines with arrows */}
      {CONNECTIONS.map(([a, b], i) => {
        const ca = CITIES[a], cb = CITIES[b];
        const mx = (ca.x + cb.x) / 2, my = (ca.y + cb.y) / 2 - 20;
        const pair = PAIRS[i % PAIRS.length];
        return (
          <g key={i}>
            <path d={`M${ca.x},${ca.y} Q${mx},${my} ${cb.x},${cb.y}`}
              fill="none" stroke="rgba(38,166,154,0.35)" strokeWidth={1.5}
              strokeDasharray="6 3" />
            <text x={mx} y={my - 6} textAnchor="middle" fontFamily={tv.fontMono}
              fontSize={9} fill="rgba(38,166,154,0.7)">{pair}</text>
          </g>
        );
      })}

      {/* City nodes */}
      {CITIES.map((c, i) => (
        <g key={i} filter="url(#glow)">
          {/* Pulse ring */}
          <circle cx={c.x} cy={c.y} r={28} fill={`${c.color}15`} stroke={`${c.color}40`} strokeWidth={1} />
          <circle cx={c.x} cy={c.y} r={18} fill={`${c.color}25`} stroke={c.color} strokeWidth={2} />
          <circle cx={c.x} cy={c.y} r={5} fill={c.color} />
          {/* City name */}
          <rect x={c.x - 50} y={c.y + 24} width={100} height={18} rx={4}
            fill="rgba(0,0,0,0.65)" stroke={`${c.color}60`} strokeWidth={1} />
          <text x={c.x} y={c.y + 36} textAnchor="middle" fontFamily={font}
            fontSize={11} fontWeight={700} fill={c.color}>{c.name}</text>
          {/* Currency badge */}
          <rect x={c.x - 28} y={c.y - 44} width={56} height={18} rx={9}
            fill={c.color} />
          <text x={c.x} y={c.y - 31} textAnchor="middle" fontFamily={tv.fontMono}
            fontSize={11} fontWeight={800} fill="#fff">{c.currency}</text>
          {/* Session time */}
          <text x={c.x} y={c.y + 52} textAnchor="middle" fontFamily={tv.fontMono}
            fontSize={8} fill={tv.axisText}>{c.session}</text>
        </g>
      ))}

      {/* 24hr clock strip */}
      <rect x={40} y={H - 100} width={W - 80} height={54} rx={6}
        fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      <text x={60} y={H - 82} fontFamily={font} fontSize={10} fontWeight={700}
        fill={tv.axisText}>24-HOUR MARKET CLOCK (GMT)</text>

      {/* Hour ticks */}
      {Array.from({ length: 25 }, (_, h) => {
        const x = 40 + (h / 24) * (W - 80);
        const isMain = h % 6 === 0;
        return (
          <g key={h}>
            <line x1={x} y1={H - 72} x2={x} y2={H - 58} stroke="rgba(255,255,255,0.2)" strokeWidth={isMain ? 1.5 : 0.5} />
            {isMain && <text x={x} y={H - 54} textAnchor="middle" fontFamily={tv.fontMono} fontSize={9} fill={tv.axisText}>{h.toString().padStart(2, '0')}:00</text>}
          </g>
        );
      })}

      {/* Session bars */}
      {[
        { start: 22, end: 31, color: "#f5c518", label: "Sydney" },
        { start: 0,  end: 9,  color: "#ef5350", label: "Tokyo" },
        { start: 8,  end: 17, color: "#2196f3", label: "London" },
        { start: 13, end: 22, color: "#26a69a", label: "New York" },
      ].map((s, i) => {
        const xStart = 40 + ((s.start % 24) / 24) * (W - 80);
        const width = ((Math.min(s.end, 24) - s.start) / 24) * (W - 80);
        const y = H - 104 + i * 10;
        return (
          <g key={i}>
            <rect x={xStart} y={H - 76} width={Math.max(width, 0)} height={14}
              rx={3} fill={s.color} opacity={0.45} />
            <text x={xStart + Math.max(width, 0) / 2} y={H - 65}
              textAnchor="middle" fontFamily={font} fontSize={8} fontWeight={700}
              fill={s.color}>{s.label}</text>
          </g>
        );
      })}

      {/* Bottom stat boxes */}
      {[
        { label: "$7.5 Trillion", sub: "traded daily" },
        { label: "24 Hours", sub: "Mon–Fri" },
        { label: "180+", sub: "currencies" },
        { label: "No Central", sub: "exchange" },
      ].map((b, i) => (
        <g key={i}>
          <rect x={40 + i * 285} y={H - 40} width={260} height={32} rx={5}
            fill="rgba(38,166,154,0.12)" stroke="rgba(38,166,154,0.25)" strokeWidth={1} />
          <text x={40 + i * 285 + 130} y={H - 24} textAnchor="middle" fontFamily={font}
            fontSize={13} fontWeight={800} fill={tv.lineGreen}>{b.label}</text>
          <text x={40 + i * 285 + 130} y={H - 12} textAnchor="middle" fontFamily={font}
            fontSize={9} fill={tv.axisText}>{b.sub}</text>
        </g>
      ))}
    </svg>
  );
};
