import React from "react";
import { tv } from "../shared/tvTheme";

const W = tv.W;
const H = tv.H;

export const TraderMindset: React.FC = () => {
  const font = tv.font;
  const mono = tv.fontMono;

  const RULES = [
    {
      num: "01",
      title: "Stick to Your Plan",
      body: "Write your rules before you open the chart. Entry signal, stop loss, target. If the setup doesn't appear — you don't trade.",
      color: tv.lineGreen,
      icon: "✓",
    },
    {
      num: "02",
      title: "Risk Only 1–2% Per Trade",
      body: "Never risk more than 2% of your account on a single trade. With £1,000: max risk = £20. This lets you survive 50 losers in a row.",
      color: tv.lineAmber,
      icon: "⚖",
    },
    {
      num: "03",
      title: "Accept That Losses Are Normal",
      body: "Even the world's best traders lose 40–50% of trades. A loss is not a failure — failing to cut a loss quickly IS a failure.",
      color: tv.lineBlue,
      icon: "◇",
    },
    {
      num: "04",
      title: "Never Chase the Market",
      body: "Missed a move? Wait for the next setup. Chasing price after a big move is how beginners get destroyed. The market will always give another opportunity.",
      color: "#ab47bc",
      icon: "⏸",
    },
    {
      num: "05",
      title: "Keep a Trading Journal",
      body: "After every trade: write what you saw, why you entered, what happened. In 3 months your journal will show you exactly where you're losing money.",
      color: tv.lineGreen,
      icon: "📋",
    },
    {
      num: "06",
      title: "Treat Trading Like a Business",
      body: "A business has rules, risk management, and reviews. Not feelings. Your job is to execute your strategy — not to 'feel' the market.",
      color: tv.lineAmber,
      icon: "🏢",
    },
  ];

  const cols = 3;
  const cardW = 360;
  const cardH = 130;
  const startX = 40;
  const startY = 80;
  const gapX = 20;
  const gapY = 16;

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={tv.bgOuter} />

      {/* Header */}
      <rect x={0} y={0} width={W} height={52} fill={tv.bgPanel} />
      <text x={W / 2} y={34} textAnchor="middle" fontFamily={font} fontSize={22}
        fontWeight={800} fill="#fff">The Trader Mindset — 6 Rules Every Beginner Must Learn</text>

      {/* Rule cards */}
      {RULES.map((r, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * (cardW + gapX);
        const y = startY + row * (cardH + gapY);

        return (
          <g key={i}>
            <rect x={x} y={y} width={cardW} height={cardH} rx={8}
              fill={`${r.color}08`} stroke={`${r.color}40`} strokeWidth={1.5} />
            {/* Number badge */}
            <rect x={x} y={y} width={44} height={44} rx={8}
              fill={`${r.color}30`} stroke={r.color} strokeWidth={1.5} />
            <text x={x + 22} y={y + 27} textAnchor="middle" fontFamily={mono}
              fontSize={16} fontWeight={900} fill={r.color}>{r.num}</text>

            {/* Left accent bar */}
            <rect x={x + 50} y={y + 10} width={3} height={cardH - 20} rx={2} fill={r.color} opacity={0.5} />

            {/* Title */}
            <text x={x + 62} y={y + 28} fontFamily={font} fontSize={13} fontWeight={800} fill={r.color}>
              {r.title}
            </text>

            {/* Body text via foreignObject */}
            <foreignObject x={x + 58} y={y + 36} width={cardW - 66} height={cardH - 44}>
              <div style={{ fontFamily: font, fontSize: '10.5px', color: '#d1d4dc', lineHeight: '1.65' }}>
                {r.body}
              </div>
            </foreignObject>
          </g>
        );
      })}

      {/* ===== BOTTOM SECTION: Emotional Cycle ===== */}
      <rect x={40} y={H - 130} width={1120} height={118} rx={8}
        fill={tv.bgPanel} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      <text x={60} y={H - 110} fontFamily={font} fontSize={12} fontWeight={700} fill={tv.textWhite}>
        THE EMOTIONAL TRADING TRAP (and how to avoid it)
      </text>

      {[
        { label: "Win → Overconfident", sub: "Risk too much", color: tv.lineAmber, x: 60 },
        { label: "Big Loss → Panic", sub: "Revenge trade", color: tv.lineRed, x: 290 },
        { label: "More Losses", sub: "Chasing losses", color: tv.lineRed, x: 520 },
        { label: "Blow Up Account", sub: "Ruin", color: "#ff0000", x: 740 },
        { label: "THE FIX: Journal + Rules", sub: "Remove emotion", color: tv.lineGreen, x: 930 },
      ].map((e, i) => (
        <g key={i}>
          <rect x={e.x} y={H - 100} width={200} height={44} rx={5}
            fill={`${e.color}15`} stroke={`${e.color}50`} strokeWidth={1} />
          <text x={e.x + 100} y={H - 82} textAnchor="middle" fontFamily={font} fontSize={10} fontWeight={700} fill={e.color}>
            {e.label}
          </text>
          <text x={e.x + 100} y={H - 66} textAnchor="middle" fontFamily={font} fontSize={9} fill={tv.textMuted}>
            {e.sub}
          </text>
          {i < 4 && (
            <text x={e.x + 208} y={H - 74} fontFamily={font} fontSize={16} fill="rgba(255,255,255,0.2)">→</text>
          )}
        </g>
      ))}
    </svg>
  );
};
