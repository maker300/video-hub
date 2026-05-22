import React from "react";
import { tv } from "../shared/tvTheme";
import { generateCandles, makePriceMapper, OHLCV } from "../shared/candleData";
import { ChartFrame } from "../shared/ChartFrame";

const CHART_LEFT   = 10;
const CHART_RIGHT  = 1110;
const CHART_TOP    = 52;
const CHART_BOTTOM = 570;
const VOL_BOTTOM   = 635;

export const CandleTypesChart: React.FC = () => {
  const base = generateCandles(30, 1.0850, "range", 13);
  const pm = makePriceMapper(base, CHART_TOP, CHART_BOTTOM);
  const colW = (CHART_RIGHT - CHART_LEFT) / base.length;
  const cx = (i: number) => CHART_LEFT + (i + 0.5) * colW;

  // Mid price for override anchoring
  const midP = (pm.minP + pm.maxP) / 2;
  const bodySize = pm.range * 0.06;
  const wickLen = pm.range * 0.12;
  const longWick = pm.range * 0.18;

  // Override positions (evenly spaced across the chart)
  const overrideIdxs = [3, 8, 13, 18, 23, 27];
  const types: OHLCV[] = [
    // Doji
    { open: midP, close: midP, high: midP + wickLen, low: midP - wickLen, volume: base[3].volume, time: base[3].time },
    // Hammer
    { open: midP + bodySize * 0.4, close: midP + bodySize * 1.2, high: midP + bodySize * 1.4, low: midP - longWick, volume: base[8].volume, time: base[8].time },
    // Shooting Star
    { open: midP - bodySize * 0.4, close: midP - bodySize * 1.2, high: midP + longWick, low: midP - bodySize * 1.4, volume: base[13].volume, time: base[13].time },
    // Bullish Marubozu
    { open: midP - bodySize, close: midP + bodySize, high: midP + bodySize, low: midP - bodySize, volume: base[18].volume, time: base[18].time },
    // Bearish Marubozu
    { open: midP + bodySize, close: midP - bodySize, high: midP + bodySize, low: midP - bodySize, volume: base[23].volume, time: base[23].time },
    // Spinning Top
    { open: midP + bodySize * 0.3, close: midP - bodySize * 0.3, high: midP + wickLen, low: midP - wickLen, volume: base[27].volume, time: base[27].time },
  ];

  const labels = ["Doji", "Hammer", "Shooting\nStar", "Bullish\nMarubozu", "Bearish\nMarubozu", "Spinning\nTop"];

  const candles: OHLCV[] = [...base];
  overrideIdxs.forEach((idx, j) => { candles[idx] = types[j]; });

  // Re-render overridden candles on top
  const renderCandle = (c: OHLCV, i: number) => {
    const isBull = c.close >= c.open;
    const color = isBull ? tv.bullBody : tv.bearBody;
    const top = pm.toY(Math.max(c.open, c.close));
    const bot = pm.toY(Math.min(c.open, c.close));
    const bodyH = Math.max(bot - top, 2);
    const bw = Math.max(colW * 0.7, 5);
    const x = cx(i);
    return (
      <g key={`over-${i}`}>
        {/* Erase original candle */}
        <rect x={x - colW * 0.5} y={CHART_TOP} width={colW} height={CHART_BOTTOM - CHART_TOP} fill={tv.bgChart} />
        {/* Draw wick */}
        <line x1={x} y1={pm.toY(c.high)} x2={x} y2={pm.toY(c.low)} stroke={color} strokeWidth={1.5} />
        {/* Draw body */}
        <rect x={x - bw / 2} y={top} width={bw} height={bodyH} fill={color} />
      </g>
    );
  };

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
      {overrideIdxs.map((idx, j) => renderCandle(types[j], idx))}

      {/* Labels above each candle type */}
      {overrideIdxs.map((idx, j) => {
        const x = cx(idx);
        const lines = labels[j].split("\n");
        const labelY = pm.toY(Math.max(types[j].high, types[j].close)) - 20;
        return (
          <g key={`lbl-${j}`}>
            <defs>
              <marker id={`arrowDown${j}`} markerWidth="6" markerHeight="6" refX="3" refY="0" orient="auto">
                <polygon points="0 0, 6 0, 3 6" fill={tv.textWhite} />
              </marker>
            </defs>
            <line x1={x} y1={labelY - 4} x2={x} y2={pm.toY(Math.max(types[j].high, types[j].close)) - 2}
              stroke={tv.textWhite} strokeWidth={1} strokeDasharray="3 2" />
            {lines.map((line, li) => (
              <text key={li} x={x} y={labelY - lines.length * 13 + li * 13}
                textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={600} fill={tv.textWhite}>
                {line}
              </text>
            ))}
          </g>
        );
      })}

      {/* Bracket under the 6 candles */}
      {(() => {
        const x1 = cx(overrideIdxs[0]) - colW;
        const x2 = cx(overrideIdxs[overrideIdxs.length - 1]) + colW;
        const y = CHART_BOTTOM - 16;
        return (
          <g>
            <line x1={x1} y1={y} x2={x2} y2={y} stroke={tv.axisText} strokeWidth={1.5} />
            <line x1={x1} y1={y} x2={x1} y2={y - 6} stroke={tv.axisText} strokeWidth={1.5} />
            <line x1={x2} y1={y} x2={x2} y2={y - 6} stroke={tv.axisText} strokeWidth={1.5} />
            <text x={(x1 + x2) / 2} y={y + 14}
              textAnchor="middle" fontFamily={tv.font} fontSize={12} fill={tv.textMuted}>
              Key candlestick types
            </text>
          </g>
        );
      })()}
    </ChartFrame>
  );
};
