import React from "react";
import { tv } from "../shared/tvTheme";

const W = tv.W;
const H = tv.H;

export const LeverageExplained: React.FC = () => {
  const font = tv.font;
  const mono = tv.fontMono;

  const panels = [
    {
      label: "NO LEVERAGE",
      ratio: "1:1",
      deposit: "£100",
      controls: "£100",
      barH: 80,
      greenH: 80,
      color: tv.lineGreen,
      sub: "You control exactly what you deposit.",
      risk: "Low risk",
      riskColor: tv.lineGreen,
    },
    {
      label: "LOW LEVERAGE",
      ratio: "1:10",
      deposit: "£100",
      controls: "£1,000",
      barH: 260,
      greenH: 26,
      color: tv.lineAmber,
      sub: "£100 deposit controls a £1,000 position.",
      risk: "Moderate risk",
      riskColor: tv.lineAmber,
    },
    {
      label: "HIGH LEVERAGE",
      ratio: "1:100",
      deposit: "£100",
      controls: "£10,000",
      barH: 420,
      greenH: 4,
      color: tv.lineRed,
      sub: "£100 deposit controls a £10,000 position.",
      risk: "Very high risk",
      riskColor: tv.lineRed,
    },
  ];

  const baseY = H - 160;
  const barW = 160;
  const startX = 80;
  const gap = 340;

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={tv.bgOuter} />

      {/* Header */}
      <rect x={0} y={0} width={W} height={52} fill={tv.bgPanel} />
      <text x={W / 2} y={34} textAnchor="middle" fontFamily={font} fontSize={22}
        fontWeight={800} fill="#fff">Leverage — Controlling More With Less</text>

      {/* Subtitle */}
      <text x={W / 2} y={72} textAnchor="middle" fontFamily={font} fontSize={12} fill={tv.textMuted}>
        Leverage lets you open larger positions than your deposit. It multiplies both PROFITS and LOSSES.
      </text>

      {/* KEY */}
      <rect x={W - 220} y={85} width={200} height={50} rx={6} fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />
      <rect x={W - 210} y={95} width={16} height={12} rx={2} fill={tv.lineGreen} />
      <text x={W - 188} y={105} fontFamily={font} fontSize={10} fill={tv.textWhite}>Your money (deposit)</text>
      <rect x={W - 210} y={113} width={16} height={12} rx={2} fill={tv.lineAmber} opacity={0.7} />
      <text x={W - 188} y={123} fontFamily={font} fontSize={10} fill={tv.textWhite}>Borrowed from broker</text>

      {/* Bars */}
      {panels.map((p, i) => {
        const x = startX + i * gap;
        const borrowedH = p.barH - p.greenH;

        return (
          <g key={i}>
            {/* Ratio badge top */}
            <rect x={x - 10} y={baseY - p.barH - 44} width={barW + 20} height={36} rx={6}
              fill={`${p.color}20`} stroke={p.color} strokeWidth={1.5} />
            <text x={x + barW / 2} y={baseY - p.barH - 26} textAnchor="middle"
              fontFamily={mono} fontSize={18} fontWeight={900} fill={p.color}>{p.ratio}</text>
            <text x={x + barW / 2} y={baseY - p.barH - 12} textAnchor="middle"
              fontFamily={font} fontSize={9} fill={tv.textMuted}>leverage ratio</text>

            {/* Borrowed (amber) — top portion */}
            {borrowedH > 0 && (
              <rect x={x} y={baseY - p.barH} width={barW} height={borrowedH} rx={4}
                fill="rgba(245,197,24,0.5)" stroke="rgba(245,197,24,0.6)" strokeWidth={1} />
            )}

            {/* Your money (green) — bottom portion */}
            <rect x={x} y={baseY - p.greenH} width={barW} height={p.greenH} rx={4}
              fill="rgba(38,166,154,0.8)" stroke={tv.lineGreen} strokeWidth={1.5} />

            {/* £100 label inside green */}
            {p.greenH >= 20 && (
              <text x={x + barW / 2} y={baseY - p.greenH / 2 + 4} textAnchor="middle"
                fontFamily={mono} fontSize={11} fontWeight={700} fill="#fff">£100</text>
            )}

            {/* Controls label */}
            <rect x={x - 10} y={baseY + 6} width={barW + 20} height={28} rx={4} fill="rgba(0,0,0,0.5)" />
            <text x={x + barW / 2} y={baseY + 16} textAnchor="middle"
              fontFamily={font} fontSize={10} fill={tv.textMuted}>Controls</text>
            <text x={x + barW / 2} y={baseY + 30} textAnchor="middle"
              fontFamily={mono} fontSize={14} fontWeight={800} fill={p.color}>{p.controls}</text>

            {/* Label box */}
            <rect x={x - 10} y={baseY + 40} width={barW + 20} height={52} rx={6}
              fill={`${p.color}12`} stroke={`${p.color}40`} strokeWidth={1} />
            <text x={x + barW / 2} y={baseY + 55} textAnchor="middle"
              fontFamily={font} fontSize={11} fontWeight={800} fill={p.color}>{p.label}</text>
            <text x={x + barW / 2} y={baseY + 68} textAnchor="middle"
              fontFamily={font} fontSize={9} fill={p.riskColor}>▲ {p.risk}</text>
            <text x={x + barW / 2} y={baseY + 82} textAnchor="middle"
              fontFamily={font} fontSize={8} fill={tv.textMuted}>{p.sub}</text>
          </g>
        );
      })}

      {/* Arrow annotations between bars */}
      <text x={startX + gap - 60} y={baseY - 200} textAnchor="middle"
        fontFamily={font} fontSize={22} fill="rgba(255,255,255,0.2)">→</text>
      <text x={startX + gap * 2 - 60} y={baseY - 300} textAnchor="middle"
        fontFamily={font} fontSize={22} fill="rgba(255,255,255,0.2)">→</text>

      {/* Warning box */}
      <rect x={60} y={H - 100} width={1080} height={72} rx={8}
        fill="rgba(239,83,80,0.12)" stroke={tv.lineRed} strokeWidth={1.5} />
      <rect x={60} y={H - 100} width={6} height={72} rx={3} fill={tv.lineRed} />
      <text x={90} y={H - 78} fontFamily={font} fontSize={13} fontWeight={800} fill={tv.lineRed}>
        ⚠  WARNING — Losses Are Also Multiplied
      </text>
      <text x={90} y={H - 58} fontFamily={font} fontSize={11} fill={tv.textWhite}>
        {`With 1:100 leverage, a 1% move AGAINST you wipes out your entire £100 deposit (a "margin call").`}
      </text>
      <text x={90} y={H - 42} fontFamily={font} fontSize={11} fill={tv.textWhite}>
        Beginner rule: use max 1:10 leverage until you are consistently profitable. Most pros use 1:5 to 1:20.
      </text>

      {/* Worked example */}
      <rect x={60} y={84} width={460} height={72} rx={8}
        fill="rgba(38,166,154,0.08)" stroke="rgba(38,166,154,0.2)" strokeWidth={1} />
      <text x={80} y={104} fontFamily={font} fontSize={11} fontWeight={700} fill={tv.lineGreen}>WORKED EXAMPLE (1:100 leverage)</text>
      <text x={80} y={122} fontFamily={font} fontSize={11} fill={tv.textWhite}>
        EUR/USD rises 50 pips on a £10,000 position (micro lot)
      </text>
      <text x={80} y={140} fontFamily={font} fontSize={12} fontWeight={800} fill={tv.lineGreen}>
        Profit: 50 × $1 = $50  (50% return on your £100!)
      </text>
      <text x={80} y={155} fontFamily={font} fontSize={10} fill={tv.textMuted}>
        But if it falls 50 pips → $50 LOSS = half your deposit gone
      </text>
    </svg>
  );
};
