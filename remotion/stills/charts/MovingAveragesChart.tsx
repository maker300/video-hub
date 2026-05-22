import React from "react";
import { tv } from "../shared/tvTheme";
import { generateCandles, makePriceMapper } from "../shared/candleData";
import { ChartFrame } from "../shared/ChartFrame";

const CHART_LEFT   = 10;
const CHART_RIGHT  = 1110;
const CHART_TOP    = 52;
const CHART_BOTTOM = 570;
const VOL_BOTTOM   = 635;

function calcEMA(candles: { close: number }[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];
  let ema: number | null = null;
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      const sum = candles.slice(0, period).reduce((a, c) => a + c.close, 0);
      ema = sum / period;
      result.push(ema);
    } else {
      ema = candles[i].close * k + (ema as number) * (1 - k);
      result.push(ema);
    }
  }
  return result;
}

export const MovingAveragesChart: React.FC = () => {
  const candles = generateCandles(50, 1.0780, "up", 17);

  const ema20 = calcEMA(candles, 20);
  const ema50 = calcEMA(candles, 50);

  const pm = makePriceMapper(candles, CHART_TOP, CHART_BOTTOM);
  const colW = (CHART_RIGHT - CHART_LEFT) / candles.length;
  const cx = (i: number) => CHART_LEFT + (i + 0.5) * colW;

  // Golden cross zone (where 20 EMA crosses above 50 EMA)
  let crossIdx = -1;
  for (let i = 1; i < candles.length; i++) {
    const prev20 = ema20[i - 1];
    const prev50 = ema50[i - 1];
    const cur20 = ema20[i];
    const cur50 = ema50[i];
    if (prev20 !== null && prev50 !== null && cur20 !== null && cur50 !== null) {
      if (prev20 <= prev50 && cur20 > cur50) {
        crossIdx = i;
      }
    }
  }

  const ema20Points = ema20
    .map((v, i) => v !== null ? `${cx(i)},${pm.toY(v)}` : null)
    .filter(Boolean) as string[];

  const ema50Points = ema50
    .map((v, i) => v !== null ? `${cx(i)},${pm.toY(v)}` : null)
    .filter(Boolean) as string[];

  // Pullback entry annotation — find a candle that touches 20 EMA
  const pullbackIdx = Math.floor(candles.length * 0.72);

  return (
    <ChartFrame
      candles={candles}
      symbol="EUR/USD"
      timeframe="4H"
      chartLeft={CHART_LEFT}
      chartRight={CHART_RIGHT}
      chartTop={CHART_TOP}
      chartBottom={CHART_BOTTOM}
      volBottom={VOL_BOTTOM}
    >
      {/* EMA 50 line */}
      {ema50Points.length > 1 && (
        <polyline
          points={ema50Points.join(" ")}
          fill="none"
          stroke={tv.ema50}
          strokeWidth={2}
          opacity={0.9}
        />
      )}

      {/* EMA 20 line */}
      {ema20Points.length > 1 && (
        <polyline
          points={ema20Points.join(" ")}
          fill="none"
          stroke={tv.ema20}
          strokeWidth={2.5}
          opacity={0.9}
        />
      )}

      {/* EMA labels */}
      <rect x={CHART_LEFT + 8} y={CHART_BOTTOM - 60} width={72} height={18} rx={3} fill="rgba(245,197,24,0.18)" />
      <text x={CHART_LEFT + 44} y={CHART_BOTTOM - 47}
        textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.ema20}>
        EMA 20
      </text>
      <rect x={CHART_LEFT + 8} y={CHART_BOTTOM - 38} width={72} height={18} rx={3} fill="rgba(33,150,243,0.18)" />
      <text x={CHART_LEFT + 44} y={CHART_BOTTOM - 25}
        textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.ema50}>
        EMA 50
      </text>

      {/* Golden cross marker */}
      {crossIdx > 0 && ema20[crossIdx] !== null && (
        <g>
          <circle cx={cx(crossIdx)} cy={pm.toY(ema20[crossIdx] as number)}
            r={10} fill="none" stroke={tv.lineAmber} strokeWidth={2.5} />
          <rect x={cx(crossIdx) - 54} y={pm.toY(ema20[crossIdx] as number) - 32}
            width={108} height={22} rx={4} fill={tv.pillAmber} />
          <text x={cx(crossIdx)} y={pm.toY(ema20[crossIdx] as number) - 17}
            textAnchor="middle" fontFamily={tv.font} fontSize={12} fontWeight={700} fill={tv.lineAmber}>
            Golden Cross ✓
          </text>
        </g>
      )}

      {/* Pullback to EMA entry */}
      {(() => {
        const emaVal = ema20[pullbackIdx];
        if (!emaVal) return null;
        const y = pm.toY(emaVal);
        return (
          <g>
            <defs>
              <marker id="arrBuyMA" markerWidth="7" markerHeight="7" refX="3.5" refY="0" orient="auto">
                <polygon points="0 7, 7 7, 3.5 0" fill={tv.lineGreen} />
              </marker>
            </defs>
            <line x1={cx(pullbackIdx)} y1={y + 28} x2={cx(pullbackIdx)} y2={y + 6}
              stroke={tv.lineGreen} strokeWidth={2} markerEnd="url(#arrBuyMA)" />
            <rect x={cx(pullbackIdx) - 64} y={y + 30} width={128} height={20} rx={4} fill={tv.pillGreen} />
            <text x={cx(pullbackIdx)} y={y + 44}
              textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.textGreen}>
              Pullback to EMA → Buy
            </text>
          </g>
        );
      })()}

      {/* Bottom annotation */}
      <rect x={CHART_LEFT + 8} y={CHART_BOTTOM - 16} width={380} height={18}
        rx={4} fill="rgba(0,0,0,0.5)" />
      <text x={CHART_LEFT + 16} y={CHART_BOTTOM - 3}
        fontFamily={tv.font} fontSize={11} fill={tv.textMuted}>
        Price above both EMAs + 20 EMA above 50 EMA = uptrend confirmed
      </text>
    </ChartFrame>
  );
};
