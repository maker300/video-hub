import React from "react";
import { tv } from "../shared/tvTheme";
import { generateCandles, makePriceMapper } from "../shared/candleData";

const W = tv.W;
const H = tv.H;

export const BullBearMarket: React.FC = () => {
  const font = tv.font;

  // Bull market — left half
  const bullCandles = generateCandles(20, 1.0800, "up", 7);
  // Bear market — right half
  const bearCandles = generateCandles(20, 1.1200, "down", 13);

  const CHART_TOP = 100, CHART_BOTTOM = 440, VOL_BOT = 490;
  const BULL_LEFT = 30, BULL_RIGHT = 560;
  const BEAR_LEFT = 640, BEAR_RIGHT = 1170;

  const bullPm = makePriceMapper(bullCandles, CHART_TOP, CHART_BOTTOM);
  const bearPm = makePriceMapper(bearCandles, CHART_TOP, CHART_BOTTOM);

  const bullColW = (BULL_RIGHT - BULL_LEFT) / bullCandles.length;
  const bearColW = (BEAR_RIGHT - BEAR_LEFT) / bearCandles.length;

  const bx = (i: number) => BULL_LEFT + (i + 0.5) * bullColW;
  const rx = (i: number) => BEAR_LEFT + (i + 0.5) * bearColW;

  const bullMaxVol = Math.max(...bullCandles.map(c => c.volume));
  const bearMaxVol = Math.max(...bearCandles.map(c => c.volume));
  const volH = VOL_BOT - CHART_BOTTOM;

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={tv.bgOuter} />

      {/* Header */}
      <rect x={0} y={0} width={W} height={52} fill={tv.bgPanel} />
      <text x={W / 2} y={34} textAnchor="middle" fontFamily={font} fontSize={22}
        fontWeight={800} fill="#fff">Bull Market vs Bear Market</text>

      {/* Centre divider */}
      <line x1={600} y1={56} x2={600} y2={H - 10} stroke="rgba(255,255,255,0.12)" strokeWidth={2} strokeDasharray="6 3" />
      <rect x={568} y={260} width={64} height={24} rx={4} fill={tv.bgPanel} />
      <text x={600} y={276} textAnchor="middle" fontFamily={font} fontSize={11} fontWeight={700} fill={tv.textMuted}>VS</text>

      {/* ===== BULL MARKET ===== */}
      {/* Label */}
      <rect x={30} y={58} width={530} height={36} rx={6} fill="rgba(38,166,154,0.15)" stroke={tv.lineGreen} strokeWidth={1.5} />
      <text x={295} y={82} textAnchor="middle" fontFamily={font} fontSize={18} fontWeight={800} fill={tv.lineGreen}>
        🐂  BULL MARKET — Rising Prices
      </text>

      {/* Bull chart canvas */}
      <rect x={BULL_LEFT} y={CHART_TOP} width={BULL_RIGHT - BULL_LEFT} height={VOL_BOT - CHART_TOP} fill={tv.bgChart} />
      {[0.25, 0.5, 0.75].map((f, i) => {
        const y = CHART_TOP + f * (CHART_BOTTOM - CHART_TOP);
        return <line key={i} x1={BULL_LEFT} y1={y} x2={BULL_RIGHT} y2={y} stroke={tv.gridLine} strokeWidth={1} />;
      })}

      {/* Bull volume */}
      {bullCandles.map((c, i) => {
        const barH = (c.volume / bullMaxVol) * (volH - 4);
        return <rect key={i} x={bx(i) - bullColW * 0.4} y={VOL_BOT - barH} width={bullColW * 0.8} height={barH}
          fill="rgba(38,166,154,0.3)" />;
      })}

      {/* Trend arrow overlay on bull chart */}
      <path d={`M${BULL_LEFT + 20},${CHART_BOTTOM - 20} L${BULL_RIGHT - 20},${CHART_TOP + 30}`}
        stroke="rgba(38,166,154,0.2)" strokeWidth={3} strokeDasharray="8 4" fill="none" />

      {/* Bull candles */}
      {bullCandles.map((c, i) => {
        const isBull = c.close >= c.open;
        const col = isBull ? tv.bullBody : tv.bearBody;
        const top = bullPm.toY(Math.max(c.open, c.close));
        const bh = Math.max(bullPm.toY(Math.min(c.open, c.close)) - top, 2);
        return (
          <g key={i}>
            <line x1={bx(i)} y1={bullPm.toY(c.high)} x2={bx(i)} y2={bullPm.toY(c.low)} stroke={col} strokeWidth={1.5} />
            <rect x={bx(i) - Math.max(bullColW * 0.6, 4) / 2} y={top} width={Math.max(bullColW * 0.6, 4)} height={bh} fill={col} />
          </g>
        );
      })}

      {/* ===== BEAR MARKET ===== */}
      {/* Label */}
      <rect x={640} y={58} width={530} height={36} rx={6} fill="rgba(239,83,80,0.15)" stroke={tv.lineRed} strokeWidth={1.5} />
      <text x={905} y={82} textAnchor="middle" fontFamily={font} fontSize={18} fontWeight={800} fill={tv.lineRed}>
        🐻  BEAR MARKET — Falling Prices
      </text>

      {/* Bear chart canvas */}
      <rect x={BEAR_LEFT} y={CHART_TOP} width={BEAR_RIGHT - BEAR_LEFT} height={VOL_BOT - CHART_TOP} fill={tv.bgChart} />
      {[0.25, 0.5, 0.75].map((f, i) => {
        const y = CHART_TOP + f * (CHART_BOTTOM - CHART_TOP);
        return <line key={i} x1={BEAR_LEFT} y1={y} x2={BEAR_RIGHT} y2={y} stroke={tv.gridLine} strokeWidth={1} />;
      })}

      {/* Bear volume */}
      {bearCandles.map((c, i) => {
        const barH = (c.volume / bearMaxVol) * (volH - 4);
        return <rect key={i} x={rx(i) - bearColW * 0.4} y={VOL_BOT - barH} width={bearColW * 0.8} height={barH}
          fill="rgba(239,83,80,0.3)" />;
      })}

      {/* Trend arrow overlay on bear chart */}
      <path d={`M${BEAR_LEFT + 20},${CHART_TOP + 30} L${BEAR_RIGHT - 20},${CHART_BOTTOM - 20}`}
        stroke="rgba(239,83,80,0.2)" strokeWidth={3} strokeDasharray="8 4" fill="none" />

      {/* Bear candles */}
      {bearCandles.map((c, i) => {
        const isBull = c.close >= c.open;
        const col = isBull ? tv.bullBody : tv.bearBody;
        const top = bearPm.toY(Math.max(c.open, c.close));
        const bh = Math.max(bearPm.toY(Math.min(c.open, c.close)) - top, 2);
        return (
          <g key={i}>
            <line x1={rx(i)} y1={bearPm.toY(c.high)} x2={rx(i)} y2={bearPm.toY(c.low)} stroke={col} strokeWidth={1.5} />
            <rect x={rx(i) - Math.max(bearColW * 0.6, 4) / 2} y={top} width={Math.max(bearColW * 0.6, 4)} height={bh} fill={col} />
          </g>
        );
      })}

      {/* Bottom info boxes */}
      {[
        {
          x: 30, color: tv.lineGreen, bg: "rgba(38,166,154,0.08)",
          title: "What causes a Bull Market?",
          points: ["Strong economy & jobs", "High investor confidence", "Central banks cutting rates", "EUR/USD trending UP = bullish"],
        },
        {
          x: 640, color: tv.lineRed, bg: "rgba(239,83,80,0.08)",
          title: "What causes a Bear Market?",
          points: ["Recession fears or bad news", "Rising interest rates", "War, pandemic, crisis", "EUR/USD trending DOWN = bearish"],
        },
      ].map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={500} width={560} height={100} rx={8} fill={b.bg}
            stroke={`${b.color}40`} strokeWidth={1} />
          <rect x={b.x} y={500} width={6} height={100} rx={3} fill={b.color} />
          <text x={b.x + 20} y={520} fontFamily={font} fontSize={12} fontWeight={700} fill={b.color}>{b.title}</text>
          {b.points.map((pt, j) => (
            <text key={j} x={b.x + 20} y={538 + j * 18} fontFamily={font} fontSize={10} fill={tv.textWhite}>• {pt}</text>
          ))}
        </g>
      ))}

      {/* Bottom tip */}
      <rect x={30} y={H - 28} width={1140} height={22} rx={4}
        fill="rgba(245,197,24,0.1)" stroke="rgba(245,197,24,0.25)" strokeWidth={1} />
      <text x={W / 2} y={H - 13} textAnchor="middle" fontFamily={font} fontSize={10} fontWeight={700} fill={tv.lineAmber}>
        TIP: In forex you can PROFIT in BOTH directions — buy (go long) in bull markets, sell (go short) in bear markets
      </text>
    </svg>
  );
};
