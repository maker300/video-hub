import React from "react";
import { tv } from "../shared/tvTheme";
import { generateCandles, makePriceMapper, OHLCV } from "../shared/candleData";
import { ChartFrame } from "../shared/ChartFrame";

const CHART_LEFT   = 10;
const CHART_RIGHT  = 1110;
const CHART_TOP    = 52;
const CHART_BOTTOM = 570;
const VOL_BOTTOM   = 635;

export const MultiCandleChart: React.FC = () => {
  const base = generateCandles(35, 1.0840, "range", 17);
  const pm = makePriceMapper(base, CHART_TOP, CHART_BOTTOM);
  const colW = (CHART_RIGHT - CHART_LEFT) / base.length;
  const cx = (i: number) => CHART_LEFT + (i + 0.5) * colW;
  const candles = [...base];

  const midP = (pm.minP + pm.maxP) / 2;
  const body = pm.range * 0.065;

  // Bullish engulfing at 8-9
  candles[8]  = { ...candles[8],  open: midP + body * 0.4, close: midP - body * 0.2, high: midP + body * 0.7, low: midP - body * 0.5, volume: candles[8].volume };
  candles[9]  = { ...candles[9],  open: midP - body * 0.6, close: midP + body * 0.8, high: midP + body * 1.1, low: midP - body * 0.9, volume: candles[9].volume };

  // Bearish engulfing at 16-17
  candles[16] = { ...candles[16], open: midP - body * 0.4, close: midP + body * 0.2, high: midP + body * 0.5, low: midP - body * 0.7, volume: candles[16].volume };
  candles[17] = { ...candles[17], open: midP + body * 0.6, close: midP - body * 0.8, high: midP + body * 0.9, low: midP - body * 1.1, volume: candles[17].volume };

  // Morning star at 24-26
  candles[24] = { ...candles[24], open: midP + body, close: midP + body * 0.1, high: midP + body * 1.2, low: midP, volume: candles[24].volume };
  candles[25] = { ...candles[25], open: midP - body * 0.1, close: midP - body * 0.15, high: midP + body * 0.1, low: midP - body * 0.4, volume: candles[25].volume };
  candles[26] = { ...candles[26], open: midP - body * 0.2, close: midP + body * 0.8, high: midP + body * 1.0, low: midP - body * 0.4, volume: candles[26].volume };

  // Evening star at 28-30
  candles[28] = { ...candles[28], open: midP - body, close: midP - body * 0.1, high: midP + body * 0.2, low: midP - body * 1.2, volume: candles[28].volume };
  candles[29] = { ...candles[29], open: midP + body * 0.1, close: midP + body * 0.15, high: midP + body * 0.4, low: midP - body * 0.1, volume: candles[29].volume };
  candles[30] = { ...candles[30], open: midP + body * 0.2, close: midP - body * 0.8, high: midP + body * 0.4, low: midP - body * 1.0, volume: candles[30].volume };

  const renderOverride = (c: OHLCV, i: number) => {
    const isBull = c.close >= c.open;
    const color = isBull ? tv.bullBody : tv.bearBody;
    const top = pm.toY(Math.max(c.open, c.close));
    const bot = pm.toY(Math.min(c.open, c.close));
    const bodyH = Math.max(bot - top, 2);
    const bw = Math.max(colW * 0.65, 5);
    const x = cx(i);
    return (
      <g key={`oc-${i}`}>
        <rect x={x - colW * 0.5} y={CHART_TOP} width={colW} height={CHART_BOTTOM - CHART_TOP} fill={tv.bgChart} />
        <line x1={x} y1={pm.toY(c.high)} x2={x} y2={pm.toY(c.low)} stroke={color} strokeWidth={1.5} />
        <rect x={x - bw / 2} y={top} width={bw} height={bodyH} fill={color} />
      </g>
    );
  };

  interface PatternGroup {
    idxs: number[];
    label: string;
    bullish: boolean;
    arrow: "up" | "down";
  }

  const groups: PatternGroup[] = [
    { idxs: [8, 9],     label: "Bullish Engulfing", bullish: true,  arrow: "up" },
    { idxs: [16, 17],   label: "Bearish Engulfing", bullish: false, arrow: "down" },
    { idxs: [24, 25, 26], label: "Morning Star",    bullish: true,  arrow: "up" },
    { idxs: [28, 29, 30], label: "Evening Star",    bullish: false, arrow: "down" },
  ];

  return (
    <ChartFrame
      candles={candles}
      symbol="EUR/USD"
      timeframe="1H"
      chartLeft={CHART_LEFT}
      chartRight={CHART_RIGHT}
      chartTop={CHART_TOP}
      chartBottom={CHART_BOTTOM}
      volBottom={VOL_BOTTOM}
    >
      {/* Redraw overridden candles */}
      {[8,9,16,17,24,25,26,28,29,30].map(i => renderOverride(candles[i], i))}

      {/* Pattern boxes and labels */}
      {groups.map((g, gi) => {
        const color = g.bullish ? tv.lineGreen : tv.lineRed;
        const pill  = g.bullish ? tv.pillGreen : tv.pillRed;
        const x1 = cx(g.idxs[0]) - colW * 0.55;
        const x2 = cx(g.idxs[g.idxs.length - 1]) + colW * 0.55;
        const allHigh = Math.max(...g.idxs.map(i => candles[i].high));
        const allLow  = Math.min(...g.idxs.map(i => candles[i].low));
        const top = pm.toY(allHigh) - 6;
        const bot = pm.toY(allLow) + 6;
        const midX = (x1 + x2) / 2;
        const arrowY = g.arrow === "up" ? bot + 22 : top - 22;

        return (
          <g key={gi}>
            {/* Rectangle outline */}
            <rect x={x1} y={top} width={x2 - x1} height={bot - top}
              fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="4 3" rx={3} />

            {/* Pattern label */}
            <rect x={midX - g.label.length * 3.3} y={top - 22} width={g.label.length * 6.6} height={18}
              rx={3} fill={pill} />
            <text x={midX} y={top - 9}
              textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={600} fill={color}>
              {g.label}
            </text>

            {/* Direction arrow */}
            <defs>
              <marker id={`arr${gi}`} markerWidth="6" markerHeight="6"
                refX="3" refY={g.arrow === "up" ? "6" : "0"} orient="auto">
                <polygon
                  points={g.arrow === "up" ? "0 6, 6 6, 3 0" : "0 0, 6 0, 3 6"}
                  fill={color} />
              </marker>
            </defs>
            <line
              x1={midX}
              y1={g.arrow === "up" ? arrowY : arrowY}
              x2={midX}
              y2={g.arrow === "up" ? arrowY - 18 : arrowY + 18}
              stroke={color} strokeWidth={2}
              markerEnd={`url(#arr${gi})`}
            />
          </g>
        );
      })}
    </ChartFrame>
  );
};
