import React from "react";
import { tv } from "../shared/tvTheme";
import { generateCandles, makePriceMapper } from "../shared/candleData";

const W = tv.W;
const H = tv.H;

export const CurrencyPairs: React.FC = () => {
  const candles = generateCandles(30, 1.0820, "up", 19);
  const CHART_LEFT = 40, CHART_RIGHT = 720, CHART_TOP = 130, CHART_BOTTOM = 500, VOL_BOT = 550;
  const pm = makePriceMapper(candles, CHART_TOP, CHART_BOTTOM);
  const colW = (CHART_RIGHT - CHART_LEFT) / candles.length;
  const cx = (i: number) => CHART_LEFT + (i + 0.5) * colW;
  const maxVol = Math.max(...candles.map(c => c.volume));
  const volH = VOL_BOT - CHART_BOTTOM;
  const lastClose = candles[candles.length - 1].close;
  const font = tv.font;

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={tv.bgOuter} />

      {/* Header bar */}
      <rect x={0} y={0} width={W} height={56} fill={tv.bgPanel} />
      <text x={CHART_LEFT} y={34} fontFamily={font} fontSize={22} fontWeight={800} fill="#fff">EUR/USD</text>
      <rect x={CHART_LEFT + 130} y={14} width={42} height={20} rx={4} fill="rgba(255,255,255,0.08)" />
      <text x={CHART_LEFT + 151} y={28} textAnchor="middle" fontFamily={font} fontSize={12} fill={tv.axisText}>1H</text>
      <text x={CHART_LEFT + 190} y={34} fontFamily={font} fontSize={12} fill={tv.textMuted}>FX · FOREX</text>
      <text x={CHART_RIGHT + 10} y={34} fontFamily={font} fontSize={18} fontWeight={700} fill={tv.textGreen}>
        {lastClose.toFixed(4)}  +0.42%
      </text>

      {/* Chart canvas */}
      <rect x={CHART_LEFT} y={CHART_TOP} width={CHART_RIGHT - CHART_LEFT} height={VOL_BOT - CHART_TOP} fill={tv.bgChart} />
      {[0.25, 0.5, 0.75].map((f, i) => {
        const y = CHART_TOP + f * (CHART_BOTTOM - CHART_TOP);
        return <line key={i} x1={CHART_LEFT} y1={y} x2={CHART_RIGHT} y2={y} stroke={tv.gridLine} strokeWidth={1} />;
      })}

      {/* Volume */}
      {candles.map((c, i) => {
        const barH = (c.volume / maxVol) * (volH - 4);
        return <rect key={i} x={cx(i) - colW * 0.4} y={VOL_BOT - barH} width={colW * 0.8} height={barH}
          fill={c.close >= c.open ? tv.bullVol : tv.bearVol} />;
      })}
      {/* Candles */}
      {candles.map((c, i) => {
        const isBull = c.close >= c.open;
        const col = isBull ? tv.bullBody : tv.bearBody;
        const top = pm.toY(Math.max(c.open, c.close));
        const bh = Math.max(pm.toY(Math.min(c.open, c.close)) - top, 2);
        return (
          <g key={i}>
            <line x1={cx(i)} y1={pm.toY(c.high)} x2={cx(i)} y2={pm.toY(c.low)} stroke={col} strokeWidth={1.5} />
            <rect x={cx(i) - Math.max(colW * 0.6, 4) / 2} y={top} width={Math.max(colW * 0.6, 4)} height={bh} fill={col} />
          </g>
        );
      })}

      {/* Price axis */}
      <rect x={CHART_RIGHT} y={CHART_TOP} width={80} height={VOL_BOT - CHART_TOP} fill={tv.axisBg} />
      {[0, 1, 2, 3, 4].map(i => {
        const p = pm.minP + (pm.range * i) / 4;
        const y = pm.toY(p);
        if (y < CHART_TOP || y > CHART_BOTTOM) return null;
        return (
          <g key={i}>
            <line x1={CHART_RIGHT} y1={y} x2={CHART_RIGHT + 6} y2={y} stroke={tv.axisText} strokeWidth={1} />
            <text x={CHART_RIGHT + 10} y={y + 4} fontFamily={tv.fontMono} fontSize={10} fill={tv.axisText}>{p.toFixed(4)}</text>
          </g>
        );
      })}

      {/* === RIGHT PANEL: Explainer === */}
      <rect x={740} y={60} width={440} height={H - 70} rx={8} fill={tv.bgPanel} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

      {/* TITLE */}
      <text x={960} y={100} textAnchor="middle" fontFamily={font} fontSize={18} fontWeight={800} fill="#fff">
        How to Read a Currency Pair
      </text>

      {/* Large pair display */}
      <rect x={760} y={115} width={400} height={70} rx={8} fill="rgba(0,0,0,0.4)" />
      {/* BASE box */}
      <rect x={770} y={122} width={130} height={56} rx={6} fill="rgba(38,166,154,0.2)" stroke={tv.lineGreen} strokeWidth={2} />
      <text x={835} y={143} textAnchor="middle" fontFamily={font} fontSize={10} fontWeight={700} fill={tv.lineGreen}>BASE CURRENCY</text>
      <text x={835} y={167} textAnchor="middle" fontFamily={font} fontSize={28} fontWeight={900} fill="#fff">EUR</text>
      {/* Divider */}
      <text x={920} y={162} textAnchor="middle" fontFamily={font} fontSize={28} fontWeight={300} fill={tv.axisText}>/</text>
      {/* QUOTE box */}
      <rect x={950} y={122} width={130} height={56} rx={6} fill="rgba(33,150,243,0.2)" stroke={tv.lineBlue} strokeWidth={2} />
      <text x={1015} y={143} textAnchor="middle" fontFamily={font} fontSize={10} fontWeight={700} fill={tv.lineBlue}>QUOTE CURRENCY</text>
      <text x={1015} y={167} textAnchor="middle" fontFamily={font} fontSize={28} fontWeight={900} fill="#fff">USD</text>

      {/* Explanation */}
      <rect x={760} y={200} width={400} height={90} rx={6} fill="rgba(38,166,154,0.08)" stroke="rgba(38,166,154,0.2)" strokeWidth={1} />
      <text x={775} y={222} fontFamily={font} fontSize={12} fontWeight={700} fill={tv.lineGreen}>WHAT THE PRICE MEANS:</text>
      <text x={775} y={244} fontFamily={font} fontSize={22} fontWeight={900} fill="#fff">1.0847</text>
      <text x={775} y={266} fontFamily={font} fontSize={11} fill={tv.textWhite}>= 1 Euro buys 1.0847 US Dollars</text>
      <text x={775} y={283} fontFamily={font} fontSize={11} fill={tv.textMuted}>If this number goes UP → Euro is getting stronger</text>

      {/* 3 types of pairs */}
      <text x={775} y={320} fontFamily={font} fontSize={13} fontWeight={700} fill={tv.textWhite}>THREE TYPES OF PAIRS</text>
      {[
        { name: "MAJOR", ex: "EUR/USD, GBP/USD, USD/JPY", desc: "Includes USD — most traded", color: tv.lineGreen },
        { name: "MINOR", ex: "EUR/GBP, GBP/JPY",         desc: "No USD — still liquid",     color: tv.lineAmber },
        { name: "EXOTIC", ex: "USD/TRY, EUR/ZAR",         desc: "Emerging markets — risky",  color: tv.lineRed },
      ].map((t, i) => (
        <g key={i}>
          <rect x={760} y={330 + i * 68} width={400} height={58} rx={6}
            fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <rect x={760} y={330 + i * 68} width={6} height={58} rx={3} fill={t.color} />
          <text x={775} y={350 + i * 68} fontFamily={font} fontSize={12} fontWeight={800} fill={t.color}>{t.name}</text>
          <text x={775} y={367 + i * 68} fontFamily={tv.fontMono} fontSize={11} fill={tv.textWhite}>{t.ex}</text>
          <text x={775} y={382 + i * 68} fontFamily={font} fontSize={10} fill={tv.textMuted}>{t.desc}</text>
        </g>
      ))}

      {/* Beginner tip */}
      <rect x={760} y={540} width={400} height={36} rx={6} fill="rgba(38,166,154,0.12)" stroke="rgba(38,166,154,0.3)" strokeWidth={1} />
      <text x={775} y={556} fontFamily={font} fontSize={11} fontWeight={700} fill={tv.lineGreen}>✓ BEGINNER TIP:</text>
      <text x={775} y={571} fontFamily={font} fontSize={10} fill={tv.textWhite}>Start with EUR/USD — tightest spreads, most predictable</text>
    </svg>
  );
};
