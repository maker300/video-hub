import React from "react";
import { tv } from "../shared/tvTheme";

const W = tv.W;
const H = tv.H;

export const RiskRewardVisual: React.FC = () => {
  const font = tv.font;
  const mono = tv.fontMono;

  // Entry price vertical position
  const ENTRY_Y = 380;
  const CHART_LEFT = 60;
  const CHART_RIGHT = 700;
  const CHART_TOP = 90;
  const CHART_BOT = H - 100;

  // Target (+90px above entry) and Stop (-45px below entry)
  const TARGET_Y = ENTRY_Y - 90;
  const STOP_Y = ENTRY_Y + 45;

  // Simulated price path
  const pricePoints = [
    { x: CHART_LEFT + 20, y: ENTRY_Y + 30 },
    { x: CHART_LEFT + 80, y: ENTRY_Y + 10 },
    { x: CHART_LEFT + 140, y: ENTRY_Y - 20 },
    { x: CHART_LEFT + 200, y: ENTRY_Y + 5 },
    { x: CHART_LEFT + 260, y: ENTRY_Y - 40 },
    { x: CHART_LEFT + 320, y: ENTRY_Y - 60 },
    { x: CHART_LEFT + 380, y: TARGET_Y - 10 },
    { x: CHART_LEFT + 420, y: TARGET_Y },
  ];
  const pricePath = pricePoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={tv.bgOuter} />

      {/* Header */}
      <rect x={0} y={0} width={W} height={52} fill={tv.bgPanel} />
      <text x={W / 2} y={34} textAnchor="middle" fontFamily={font} fontSize={22}
        fontWeight={800} fill="#fff">Risk : Reward — The Golden Ratio of Trading</text>

      {/* Chart area */}
      <rect x={CHART_LEFT} y={CHART_TOP} width={CHART_RIGHT - CHART_LEFT} height={CHART_BOT - CHART_TOP}
        fill={tv.bgChart} rx={6} />

      {/* Grid lines */}
      {[0.2, 0.4, 0.6, 0.8].map((f, i) => {
        const y = CHART_TOP + f * (CHART_BOT - CHART_TOP);
        return <line key={i} x1={CHART_LEFT} y1={y} x2={CHART_RIGHT} y2={y}
          stroke={tv.gridLine} strokeWidth={1} />;
      })}

      {/* TARGET zone (green fill) */}
      <rect x={CHART_LEFT} y={CHART_TOP} width={CHART_RIGHT - CHART_LEFT} height={ENTRY_Y - CHART_TOP}
        fill="rgba(38,166,154,0.06)" />

      {/* STOP zone (red fill) */}
      <rect x={CHART_LEFT} y={ENTRY_Y} width={CHART_RIGHT - CHART_LEFT} height={CHART_BOT - ENTRY_Y}
        fill="rgba(239,83,80,0.06)" />

      {/* TARGET line */}
      <line x1={CHART_LEFT} y1={TARGET_Y} x2={CHART_RIGHT} y2={TARGET_Y}
        stroke={tv.lineGreen} strokeWidth={2} strokeDasharray="8 4" />
      <rect x={CHART_RIGHT - 180} y={TARGET_Y - 20} width={175} height={18} rx={3}
        fill={tv.lineGreen} />
      <text x={CHART_RIGHT - 92} y={TARGET_Y - 7} textAnchor="middle" fontFamily={mono}
        fontSize={11} fontWeight={700} fill="#000">TARGET  1.0870  +90 pips</text>

      {/* ENTRY line */}
      <line x1={CHART_LEFT} y1={ENTRY_Y} x2={CHART_RIGHT} y2={ENTRY_Y}
        stroke={tv.lineAmber} strokeWidth={2.5} />
      <rect x={CHART_RIGHT - 180} y={ENTRY_Y - 10} width={175} height={18} rx={3}
        fill={tv.lineAmber} />
      <text x={CHART_RIGHT - 92} y={ENTRY_Y + 3} textAnchor="middle" fontFamily={mono}
        fontSize={11} fontWeight={700} fill="#000">ENTRY   1.0780</text>

      {/* STOP line */}
      <line x1={CHART_LEFT} y1={STOP_Y} x2={CHART_RIGHT} y2={STOP_Y}
        stroke={tv.lineRed} strokeWidth={2} strokeDasharray="8 4" />
      <rect x={CHART_RIGHT - 180} y={STOP_Y - 10} width={175} height={18} rx={3}
        fill={tv.lineRed} />
      <text x={CHART_RIGHT - 92} y={STOP_Y + 3} textAnchor="middle" fontFamily={mono}
        fontSize={11} fontWeight={700} fill="#fff">STOP    1.0735  -45 pips</text>

      {/* REWARD brace */}
      <line x1={CHART_LEFT + 30} y1={TARGET_Y} x2={CHART_LEFT + 30} y2={ENTRY_Y}
        stroke={tv.lineGreen} strokeWidth={2} />
      <line x1={CHART_LEFT + 22} y1={TARGET_Y} x2={CHART_LEFT + 38} y2={TARGET_Y} stroke={tv.lineGreen} strokeWidth={2} />
      <line x1={CHART_LEFT + 22} y1={ENTRY_Y} x2={CHART_LEFT + 38} y2={ENTRY_Y} stroke={tv.lineGreen} strokeWidth={2} />
      <text x={CHART_LEFT + 50} y={(TARGET_Y + ENTRY_Y) / 2 + 4} fontFamily={mono}
        fontSize={13} fontWeight={700} fill={tv.lineGreen}>+90 pips REWARD</text>

      {/* RISK brace */}
      <line x1={CHART_LEFT + 30} y1={ENTRY_Y} x2={CHART_LEFT + 30} y2={STOP_Y}
        stroke={tv.lineRed} strokeWidth={2} />
      <line x1={CHART_LEFT + 22} y1={ENTRY_Y} x2={CHART_LEFT + 38} y2={ENTRY_Y} stroke={tv.lineRed} strokeWidth={2} />
      <line x1={CHART_LEFT + 22} y1={STOP_Y} x2={CHART_LEFT + 38} y2={STOP_Y} stroke={tv.lineRed} strokeWidth={2} />
      <text x={CHART_LEFT + 50} y={(ENTRY_Y + STOP_Y) / 2 + 4} fontFamily={mono}
        fontSize={13} fontWeight={700} fill={tv.lineRed}>-45 pips RISK</text>

      {/* Price path */}
      <path d={pricePath} fill="none" stroke={tv.lineAmber} strokeWidth={2.5} strokeLinejoin="round" opacity={0.8} />
      {/* Hit target marker */}
      <circle cx={pricePoints[pricePoints.length - 1].x} cy={pricePoints[pricePoints.length - 1].y}
        r={8} fill={tv.lineGreen} stroke="#fff" strokeWidth={2} />
      <text x={pricePoints[pricePoints.length - 1].x + 14} y={pricePoints[pricePoints.length - 1].y + 4}
        fontFamily={font} fontSize={10} fontWeight={700} fill={tv.lineGreen}>TARGET HIT!</text>

      {/* ===== RIGHT PANEL ===== */}
      <rect x={720} y={60} width={450} height={H - 70} rx={8}
        fill={tv.bgPanel} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

      {/* RR Ratio display */}
      <text x={945} y={100} textAnchor="middle" fontFamily={font} fontSize={15} fontWeight={700} fill={tv.textWhite}>
        RISK : REWARD RATIO
      </text>
      <rect x={740} y={108} width={410} height={70} rx={8} fill="rgba(0,0,0,0.4)" />
      <text x={830} y={153} textAnchor="middle" fontFamily={mono} fontSize={48} fontWeight={900} fill={tv.lineRed}>1</text>
      <text x={870} y={153} textAnchor="middle" fontFamily={mono} fontSize={36} fontWeight={300} fill={tv.textMuted}> : </text>
      <text x={915} y={153} textAnchor="middle" fontFamily={mono} fontSize={48} fontWeight={900} fill={tv.lineGreen}>2</text>
      <text x={1020} y={148} textAnchor="middle" fontFamily={font} fontSize={11} fill={tv.textMuted}>
        45 pips risked
      </text>
      <text x={1020} y={163} textAnchor="middle" fontFamily={font} fontSize={11} fill={tv.textMuted}>
        90 pips target
      </text>

      {/* What it means */}
      <rect x={740} y={186} width={410} height={56} rx={6} fill="rgba(38,166,154,0.1)" stroke="rgba(38,166,154,0.2)" strokeWidth={1} />
      <text x={945} y={204} textAnchor="middle" fontFamily={font} fontSize={11} fontWeight={700} fill={tv.lineGreen}>
        WHAT THIS MEANS
      </text>
      <text x={945} y={221} textAnchor="middle" fontFamily={font} fontSize={10} fill={tv.textWhite}>
        For every £1 you risk, you aim to make £2.
      </text>
      <text x={945} y={236} textAnchor="middle" fontFamily={font} fontSize={10} fill={tv.textWhite}>
        You can be WRONG 50% of the time and still profit.
      </text>

      {/* Win rate table */}
      <text x={755} y={268} fontFamily={font} fontSize={11} fontWeight={700} fill={tv.textWhite}>
        WIN RATE NEEDED TO BREAK EVEN:
      </text>
      {[
        { rr: "1:1", winRate: "50%", verdict: "Tough", color: tv.lineRed },
        { rr: "1:2", winRate: "34%", verdict: "Achievable", color: tv.lineAmber },
        { rr: "1:3", winRate: "25%", verdict: "Excellent", color: tv.lineGreen },
      ].map((r, i) => (
        <g key={i}>
          <rect x={740} y={276 + i * 54} width={410} height={46} rx={5}
            fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <rect x={740} y={276 + i * 54} width={5} height={46} rx={2} fill={r.color} />
          <text x={762} y={300 + i * 54} fontFamily={mono} fontSize={16} fontWeight={900} fill={r.color}>{r.rr}</text>
          <text x={830} y={300 + i * 54} fontFamily={font} fontSize={12} fill={tv.textWhite}>
            Win {r.winRate} of trades to break even
          </text>
          <text x={1100} y={300 + i * 54} textAnchor="end" fontFamily={font} fontSize={11} fontWeight={700} fill={r.color}>{r.verdict}</text>
        </g>
      ))}

      {/* Rule box */}
      <rect x={740} y={444} width={410} height={56} rx={6}
        fill="rgba(245,197,24,0.1)" stroke="rgba(245,197,24,0.25)" strokeWidth={1} />
      <text x={755} y={464} fontFamily={font} fontSize={11} fontWeight={700} fill={tv.lineAmber}>
        THE GOLDEN RULE
      </text>
      <text x={755} y={482} fontFamily={font} fontSize={10} fill={tv.textWhite}>
        Never enter a trade with less than 1:2 risk-to-reward.
      </text>
      <text x={755} y={496} fontFamily={font} fontSize={10} fill={tv.textWhite}>
        Minimum 1:1.5 if you have a very high win rate strategy.
      </text>

      {/* Bottom bar */}
      <rect x={60} y={H - 36} width={1080} height={24} rx={5}
        fill="rgba(38,166,154,0.12)" stroke="rgba(38,166,154,0.25)" strokeWidth={1} />
      <text x={W / 2} y={H - 20} textAnchor="middle" fontFamily={font} fontSize={10} fontWeight={700} fill={tv.lineGreen}>
        {"SET YOUR STOP AND TARGET BEFORE YOU ENTER. If the R:R isn't at least 1:2, SKIP the trade."}
      </text>
    </svg>
  );
};
