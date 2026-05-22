import React from "react";
import { tv } from "../shared/tvTheme";

const W = tv.W;
const H = tv.H;

export const PipsAndLots: React.FC = () => {
  const font = tv.font;
  const mono = tv.fontMono;

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={tv.bgOuter} />

      {/* Header */}
      <rect x={0} y={0} width={W} height={52} fill={tv.bgPanel} />
      <text x={W / 2} y={34} textAnchor="middle" fontFamily={font} fontSize={22}
        fontWeight={800} fill="#fff">Pips &amp; Lots — The Units of Forex Trading</text>

      {/* Divider */}
      <line x1={600} y1={60} x2={600} y2={H - 10} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

      {/* ====== LEFT PANEL — PIPS ====== */}
      <text x={300} y={90} textAnchor="middle" fontFamily={font} fontSize={17} fontWeight={800} fill={tv.lineGreen}>
        WHAT IS A PIP?
      </text>
      <text x={300} y={110} textAnchor="middle" fontFamily={font} fontSize={11} fill={tv.textMuted}>
        The smallest standard price movement
      </text>

      {/* Price zoom display */}
      <rect x={50} y={125} width={500} height={120} rx={8} fill={tv.bgChart} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

      {/* Before price */}
      <text x={130} y={165} textAnchor="middle" fontFamily={font} fontSize={11} fill={tv.axisText}>BEFORE</text>
      <text x={80} y={200} fontFamily={mono} fontSize={28} fontWeight={700} fill={tv.textWhite}>1.0847</text>

      {/* Arrow */}
      <text x={280} y={196} textAnchor="middle" fontFamily={font} fontSize={30} fill={tv.lineGreen}>→</text>

      {/* After price */}
      <text x={390} y={165} textAnchor="middle" fontFamily={font} fontSize={11} fill={tv.axisText}>AFTER</text>
      <g>
        <text x={328} y={200} fontFamily={mono} fontSize={28} fontWeight={700} fill={tv.textWhite}>1.084</text>
        <text x={484} y={200} fontFamily={mono} fontSize={28} fontWeight={900} fill={tv.lineGreen}>8</text>
        {/* Underline the pip digit */}
        <line x1={484} y1={205} x2={510} y2={205} stroke={tv.lineGreen} strokeWidth={3} />
        <text x={497} y={222} textAnchor="middle" fontFamily={font} fontSize={10} fontWeight={700} fill={tv.lineGreen}>1 PIP</text>
      </g>

      {/* Pip = 0.0001 badge */}
      <rect x={50} y={255} width={500} height={46} rx={8} fill="rgba(38,166,154,0.12)"
        stroke="rgba(38,166,154,0.3)" strokeWidth={1} />
      <text x={300} y={276} textAnchor="middle" fontFamily={font} fontSize={13} fontWeight={700} fill={tv.lineGreen}>
        1 PIP = 0.0001  (4th decimal place for most pairs)
      </text>
      <text x={300} y={294} textAnchor="middle" fontFamily={font} fontSize={11} fill={tv.textWhite}>
        For USD/JPY: 1 pip = 0.01 (2nd decimal place)
      </text>

      {/* Pip value table */}
      <text x={60} y={330} fontFamily={font} fontSize={13} fontWeight={700} fill={tv.textWhite}>PIP VALUE TABLE</text>
      {[
        { lot: "Standard lot",  units: "100,000", val: "$10",  note: "per pip" },
        { lot: "Mini lot",      units: "10,000",  val: "$1",   note: "per pip" },
        { lot: "Micro lot",     units: "1,000",   val: "$0.10",note: "per pip" },
      ].map((r, i) => (
        <g key={i}>
          <rect x={50} y={340 + i * 52} width={500} height={44} rx={5}
            fill={i === 2 ? "rgba(38,166,154,0.15)" : "rgba(255,255,255,0.03)"}
            stroke={i === 2 ? "rgba(38,166,154,0.4)" : "rgba(255,255,255,0.05)"} strokeWidth={1} />
          <text x={70} y={366 + i * 52} fontFamily={font} fontSize={12} fontWeight={i === 2 ? 700 : 400} fill={i === 2 ? tv.lineGreen : tv.textWhite}>{r.lot}</text>
          <text x={230} y={366 + i * 52} fontFamily={mono} fontSize={12} fill={tv.axisText}>{r.units} units</text>
          <text x={380} y={366 + i * 52} fontFamily={mono} fontSize={13} fontWeight={700} fill={i === 2 ? tv.lineGreen : tv.lineAmber}>{r.val}</text>
          <text x={430} y={366 + i * 52} fontFamily={font} fontSize={11} fill={tv.textMuted}>{r.note}</text>
          {i === 2 && <text x={510} y={366 + i * 52} fontFamily={font} fontSize={10} fontWeight={700} fill={tv.lineGreen}>← START HERE</text>}
        </g>
      ))}

      {/* Pip calculation example */}
      <rect x={50} y={510} width={500} height={70} rx={8} fill="rgba(245,197,24,0.08)"
        stroke="rgba(245,197,24,0.2)" strokeWidth={1} />
      <text x={70} y={530} fontFamily={font} fontSize={11} fontWeight={700} fill={tv.lineAmber}>EXAMPLE CALCULATION</text>
      <text x={70} y={550} fontFamily={font} fontSize={11} fill={tv.textWhite}>EUR/USD moves 30 pips · Micro lot (0.01) · Pip value = $0.10</text>
      <text x={70} y={570} fontFamily={font} fontSize={12} fontWeight={700} fill={tv.lineGreen}>Profit = 30 × $0.10 = $3.00</text>

      {/* ====== RIGHT PANEL — LOT SIZES ====== */}
      <text x={900} y={90} textAnchor="middle" fontFamily={font} fontSize={17} fontWeight={800} fill={tv.lineAmber}>
        LOT SIZES VISUALISED
      </text>

      {[
        { label: "STANDARD LOT", units: "100,000 units", val: "$10/pip", color: tv.lineRed,   h: 280, icon: "⚠" },
        { label: "MINI LOT",     units: "10,000 units",  val: "$1/pip",  color: tv.lineAmber, h: 180, icon: "" },
        { label: "MICRO LOT",    units: "1,000 units",   val: "$0.10/pip",color: tv.lineGreen, h: 90, icon: "✓" },
      ].map((l, i) => {
        const barW = 90;
        const x = 640 + i * 180;
        const baseY = H - 90;
        return (
          <g key={i}>
            {/* Bar */}
            <rect x={x} y={baseY - l.h} width={barW} height={l.h} rx={6} fill={`${l.color}30`}
              stroke={l.color} strokeWidth={2} />
            {/* Fill */}
            <rect x={x} y={baseY - l.h} width={barW} height={l.h * 0.7} rx={4} fill={`${l.color}15`} />
            <rect x={x} y={baseY - l.h * 0.3} width={barW} height={l.h * 0.3} rx={0} fill={`${l.color}35`} />
            {/* Label inside */}
            {l.h > 120 && (
              <text x={x + barW / 2} y={baseY - l.h / 2} textAnchor="middle"
                fontFamily={mono} fontSize={22} fontWeight={900} fill={l.color}>{l.icon}</text>
            )}
            {/* Name */}
            <rect x={x - 10} y={baseY + 5} width={barW + 20} height={36} rx={4}
              fill="rgba(0,0,0,0.4)" />
            <text x={x + barW / 2} y={baseY + 18} textAnchor="middle"
              fontFamily={font} fontSize={10} fontWeight={700} fill={l.color}>{l.label}</text>
            <text x={x + barW / 2} y={baseY + 30} textAnchor="middle"
              fontFamily={font} fontSize={9} fill={tv.textMuted}>{l.units}</text>
            {/* Pip value top */}
            <rect x={x} y={baseY - l.h - 28} width={barW} height={22} rx={4}
              fill="rgba(0,0,0,0.5)" />
            <text x={x + barW / 2} y={baseY - l.h - 13} textAnchor="middle"
              fontFamily={mono} fontSize={11} fontWeight={700} fill={l.color}>{l.val}</text>
          </g>
        );
      })}

      {/* Legend right */}
      <rect x={630} y={125} width={540} height={40} rx={6}
        fill="rgba(38,166,154,0.1)" stroke="rgba(38,166,154,0.2)" strokeWidth={1} />
      <text x={900} y={142} textAnchor="middle" fontFamily={font} fontSize={11} fontWeight={700} fill={tv.lineGreen}>
        BEGINNERS: Always start with Micro lots (0.01)
      </text>
      <text x={900} y={157} textAnchor="middle" fontFamily={font} fontSize={10} fill={tv.textMuted}>
        Smallest risk while learning — losses stay manageable
      </text>
    </svg>
  );
};
