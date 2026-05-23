import React from "react";
import { tv } from "../shared/tvTheme";
import { generateCandles, makePriceMapper } from "../shared/candleData";
import { ChartFrame } from "../shared/ChartFrame";

const CHART_LEFT   = 10;
const CHART_RIGHT  = 1110;
const CHART_TOP    = 52;
const CHART_BOTTOM = 570;
const VOL_BOTTOM   = 635;

const PillLabel: React.FC<{
  y: number; text: string; color: string; bg: string;
}> = ({ y, text, color, bg }) => (
  <g>
    <rect x={CHART_RIGHT + 82} y={y - 11} width={text.length * 6.5 + 10} height={22} rx={4} fill={bg} />
    <text x={CHART_RIGHT + 87} y={y + 3}
      fontFamily={tv.fontMono} fontSize={11} fontWeight={600} fill={color}>
      {text}
    </text>
  </g>
);

export const TradeEntryChart: React.FC = () => {
  const candles = generateCandles(30, 1.0800, "up", 19);
  const pm = makePriceMapper(candles, CHART_TOP, CHART_BOTTOM);
  const colW = (CHART_RIGHT - CHART_LEFT) / candles.length;
  const cx = (i: number) => CHART_LEFT + (i + 0.5) * colW;

  // EMA 20 (simple approximation)
  const k = 2 / (20 + 1);
  const ema: number[] = [];
  ema[0] = candles[0].close;
  for (let i = 1; i < candles.length; i++) {
    ema[i] = candles[i].close * k + ema[i - 1] * (1 - k);
  }

  // Entry candle = candle 22
  const entryIdx = 22;
  const entryPrice = candles[entryIdx].close;
  const slPrice = entryPrice - 0.0025;   // 25 pips
  const tpPrice = entryPrice + 0.0075;   // 75 pips

  const entryY = pm.toY(entryPrice);
  const slY    = pm.toY(slPrice);
  const tpY    = pm.toY(tpPrice);

  const lineFromX = cx(entryIdx);
  const lineToX   = CHART_RIGHT - 2;
  const bracketX  = CHART_RIGHT + 14;

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
      {/* EMA 20 line */}
      <polyline
        points={candles.map((_, i) => `${cx(i)},${pm.toY(ema[i])}`).join(" ")}
        fill="none" stroke={tv.ema20} strokeWidth={1.5} opacity={0.85}
      />
      <rect x={CHART_LEFT + 6} y={pm.toY(ema[candles.length - 1]) - 10} width={46} height={16} rx={3} fill={tv.pillAmber} />
      <text x={CHART_LEFT + 29} y={pm.toY(ema[candles.length - 1]) + 1}
        textAnchor="middle" fontFamily={tv.font} fontSize={10} fontWeight={700} fill={tv.lineAmber}>
        EMA 20
      </text>

      {/* Entry line */}
      <line x1={lineFromX} y1={entryY} x2={lineToX} y2={entryY}
        stroke={tv.lineAmber} strokeWidth={2} strokeDasharray="6 3" />
      <PillLabel y={entryY} text={`Entry  ${entryPrice.toFixed(4)}`} color={tv.lineAmber} bg={tv.pillAmber} />

      {/* Stop Loss line */}
      <line x1={lineFromX} y1={slY} x2={lineToX} y2={slY}
        stroke={tv.lineRed} strokeWidth={2} strokeDasharray="6 3" />
      <PillLabel y={slY} text={`SL  ${slPrice.toFixed(4)}  −25 pips`} color={tv.textRed} bg={tv.pillRed} />

      {/* Take Profit line */}
      <line x1={lineFromX} y1={tpY} x2={lineToX} y2={tpY}
        stroke={tv.lineGreen} strokeWidth={2} strokeDasharray="6 3" />
      <PillLabel y={tpY} text={`TP  ${tpPrice.toFixed(4)}  +75 pips`} color={tv.textGreen} bg={tv.pillGreen} />

      {/* Bracket – Risk */}
      <line x1={bracketX} y1={entryY} x2={bracketX} y2={slY} stroke={tv.lineRed} strokeWidth={2} />
      <line x1={bracketX} y1={entryY} x2={bracketX + 6} y2={entryY} stroke={tv.lineRed} strokeWidth={2} />
      <line x1={bracketX} y1={slY} x2={bracketX + 6} y2={slY} stroke={tv.lineRed} strokeWidth={2} />
      <text x={bracketX + 9} y={(entryY + slY) / 2 + 4}
        fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.lineRed}>Risk</text>

      {/* Bracket – Reward */}
      <line x1={bracketX} y1={tpY} x2={bracketX} y2={entryY} stroke={tv.lineGreen} strokeWidth={2} />
      <line x1={bracketX} y1={tpY} x2={bracketX + 6} y2={tpY} stroke={tv.lineGreen} strokeWidth={2} />
      <line x1={bracketX} y1={entryY} x2={bracketX + 6} y2={entryY} stroke={tv.lineGreen} strokeWidth={2} />
      <text x={bracketX + 9} y={(tpY + entryY) / 2 + 4}
        fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.lineGreen}>Reward</text>

      {/* Entry arrow */}
      <defs>
        <marker id="arrUp" markerWidth="7" markerHeight="7" refX="3.5" refY="7" orient="auto">
          <polygon points="0 7, 7 7, 3.5 0" fill={tv.lineGreen} />
        </marker>
      </defs>
      <line x1={cx(entryIdx)} y1={entryY + 28} x2={cx(entryIdx)} y2={entryY + 6}
        stroke={tv.lineGreen} strokeWidth={2.5} markerEnd="url(#arrUp)" />

      {/* Info panel top-left */}
      <rect x={CHART_LEFT + 8} y={CHART_TOP + 6} width={178} height={92}
        rx={8} fill="rgba(0,0,0,0.65)" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
      {[
        { k: "Setup:",   v: "Pullback to 20 EMA" },
        { k: "Risk:",    v: "25 pips" },
        { k: "Reward:",  v: "75 pips" },
        { k: "R:R =",   v: "1 : 3" },
      ].map(({ k, v }, i) => (
        <g key={i}>
          <text x={CHART_LEFT + 18} y={CHART_TOP + 28 + i * 20}
            fontFamily={tv.font} fontSize={11} fill={tv.axisText}>{k}</text>
          <text x={CHART_LEFT + 72} y={CHART_TOP + 28 + i * 20}
            fontFamily={tv.font} fontSize={11} fontWeight={600}
            fill={k === "R:R =" ? tv.textGreen : tv.textWhite}>{v}</text>
        </g>
      ))}
    </ChartFrame>
  );
};
