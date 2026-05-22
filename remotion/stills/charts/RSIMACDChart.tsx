import React from "react";
import { tv } from "../shared/tvTheme";
import { generateCandles, makePriceMapper } from "../shared/candleData";

const W = tv.W;
const H = tv.H;

function calcRSI(candles: { close: number }[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  for (let i = 0; i < candles.length; i++) {
    if (i < period) { result.push(null); continue; }
    const g = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    const l = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    if (l === 0) { result.push(100); continue; }
    result.push(100 - (100 / (1 + g / l)));
  }
  return result;
}

function calcEMA(candles: { close: number }[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];
  let ema: number | null = null;
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    if (i === period - 1) {
      ema = candles.slice(0, period).reduce((a, c) => a + c.close, 0) / period;
    } else {
      ema = candles[i].close * k + (ema as number) * (1 - k);
    }
    result.push(ema);
  }
  return result;
}

function calcMACD(candles: { close: number }[]) {
  const ema12 = calcEMA(candles, 12);
  const ema26 = calcEMA(candles, 26);
  const macdLine: (number | null)[] = ema12.map((v, i) =>
    v !== null && ema26[i] !== null ? (v as number) - (ema26[i] as number) : null
  );
  // Signal: 9 EMA of MACD
  const macdValues = macdLine.map(v => ({ close: v ?? 0 }));
  const signal = calcEMA(macdValues, 9);
  const histogram: (number | null)[] = macdLine.map((v, i) =>
    v !== null && signal[i] !== null ? (v as number) - (signal[i] as number) : null
  );
  return { macdLine, signal, histogram };
}

export const RSIMACDChart: React.FC = () => {
  const candles = generateCandles(50, 1.0850, "range", 23);
  const rsi = calcRSI(candles);
  const { macdLine, signal, histogram } = calcMACD(candles);

  const HEADER_H = 44;
  const PRICE_TOP = HEADER_H + 6;
  const PRICE_BOT = Math.floor(H * 0.52);
  const RSI_TOP = PRICE_BOT + 10;
  const RSI_BOT = Math.floor(H * 0.72);
  const MACD_TOP = RSI_BOT + 10;
  const MACD_BOT = H - 16;
  const LEFT = 10;
  const RIGHT = 1110;

  const pm = makePriceMapper(candles, PRICE_TOP, PRICE_BOT);
  const colW = (RIGHT - LEFT) / candles.length;
  const cx = (i: number) => LEFT + (i + 0.5) * colW;
  const maxVol = Math.max(...candles.map(c => c.volume));
  const VOL_H = 40;
  const VOL_BOT = PRICE_BOT + 6;

  // RSI mapper: 0-100 → pixels
  const rsiH = RSI_BOT - RSI_TOP;
  const rsiY = (val: number) => RSI_BOT - (val / 100) * rsiH;

  // MACD mapper
  const validMACD = histogram.filter(v => v !== null) as number[];
  const macdMax = Math.max(...validMACD.map(Math.abs), 0.0001) * 1.2;
  const macdMid = (MACD_TOP + MACD_BOT) / 2;
  const macdScale = (MACD_BOT - MACD_TOP) / 2 / macdMax;
  const macdY = (val: number) => macdMid - val * macdScale;

  const rsiPoints = rsi
    .map((v, i) => v !== null ? `${cx(i)},${rsiY(v)}` : null)
    .filter(Boolean) as string[];

  const macdPoints = macdLine
    .map((v, i) => v !== null ? `${cx(i)},${macdY(v)}` : null)
    .filter(Boolean) as string[];

  const signalPoints = signal
    .map((v, i) => v !== null ? `${cx(i)},${macdY(v)}` : null)
    .filter(Boolean) as string[];

  // RSI overbought/oversold zones
  const ob70 = rsiY(70);
  const os30 = rsiY(30);
  const mid50 = rsiY(50);

  // Find RSI divergence signal (price makes new low, RSI doesn't)
  let divIdx = -1;
  for (let i = 20; i < candles.length - 2; i++) {
    const r = rsi[i];
    if (r !== null && r < 32 && r > 20) { divIdx = i; break; }
  }

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={tv.bgOuter} />

      {/* Price chart */}
      <rect x={LEFT} y={PRICE_TOP} width={RIGHT - LEFT} height={PRICE_BOT - PRICE_TOP} fill={tv.bgChart} />

      {/* Grid */}
      {[0.25, 0.5, 0.75].map((f, i) => {
        const y = PRICE_TOP + f * (PRICE_BOT - PRICE_TOP);
        return <line key={i} x1={LEFT} y1={y} x2={RIGHT} y2={y} stroke={tv.gridLine} strokeWidth={1} />;
      })}

      {/* Volume */}
      {candles.map((c, i) => {
        const barH = (c.volume / maxVol) * VOL_H;
        return <rect key={i} x={cx(i) - colW * 0.4} y={VOL_BOT - barH} width={colW * 0.8} height={barH}
          fill={c.close >= c.open ? tv.bullVol : tv.bearVol} />;
      })}

      {/* Candle wicks */}
      {candles.map((c, i) => (
        <line key={i} x1={cx(i)} y1={pm.toY(c.high)} x2={cx(i)} y2={pm.toY(c.low)}
          stroke={c.close >= c.open ? tv.bullWick : tv.bearWick} strokeWidth={1.5} />
      ))}

      {/* Candle bodies */}
      {candles.map((c, i) => {
        const top = pm.toY(Math.max(c.open, c.close));
        const bot = pm.toY(Math.min(c.open, c.close));
        const bh = Math.max(bot - top, 2);
        return <rect key={i} x={cx(i) - Math.max(colW * 0.6, 4) / 2} y={top}
          width={Math.max(colW * 0.6, 4)} height={bh}
          fill={c.close >= c.open ? tv.bullBody : tv.bearBody} />;
      })}

      <text x={LEFT + 8} y={PRICE_TOP + 18} fontFamily={tv.font} fontSize={12} fontWeight={700} fill={tv.textWhite}>EUR/USD · 1H</text>

      {/* RSI panel */}
      <rect x={LEFT} y={RSI_TOP} width={RIGHT - LEFT} height={rsiH} fill="rgba(22,27,43,0.95)" />
      <rect x={LEFT} y={ob70} width={RIGHT - LEFT} height={os30 - ob70} fill="rgba(245,197,24,0.05)" />
      <line x1={LEFT} y1={ob70} x2={RIGHT} y2={ob70} stroke={tv.lineRed} strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
      <line x1={LEFT} y1={os30} x2={RIGHT} y2={os30} stroke={tv.lineGreen} strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
      <line x1={LEFT} y1={mid50} x2={RIGHT} y2={mid50} stroke={tv.gridLine} strokeWidth={1} />

      <text x={LEFT + 6} y={RSI_TOP + 14} fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.lineAmber}>RSI (14)</text>
      <text x={RIGHT - 6} y={ob70 + 4} textAnchor="end" fontFamily={tv.fontMono} fontSize={9} fill={tv.textRed}>70</text>
      <text x={RIGHT - 6} y={os30 + 4} textAnchor="end" fontFamily={tv.fontMono} fontSize={9} fill={tv.textGreen}>30</text>
      <text x={RIGHT - 6} y={mid50 + 4} textAnchor="end" fontFamily={tv.fontMono} fontSize={9} fill={tv.axisText}>50</text>

      {rsiPoints.length > 1 && (
        <polyline points={rsiPoints.join(" ")} fill="none" stroke={tv.lineAmber} strokeWidth={2} />
      )}

      {/* RSI oversold annotation */}
      {divIdx > 0 && rsi[divIdx] !== null && (
        <g>
          <circle cx={cx(divIdx)} cy={rsiY(rsi[divIdx] as number)} r={7}
            fill="none" stroke={tv.lineGreen} strokeWidth={2} />
          <rect x={cx(divIdx) + 10} y={rsiY(rsi[divIdx] as number) - 10} width={90} height={18} rx={3} fill={tv.pillGreen} />
          <text x={cx(divIdx) + 55} y={rsiY(rsi[divIdx] as number) + 3}
            textAnchor="middle" fontFamily={tv.font} fontSize={10} fontWeight={700} fill={tv.textGreen}>Oversold</text>
        </g>
      )}

      {/* MACD panel */}
      <rect x={LEFT} y={MACD_TOP} width={RIGHT - LEFT} height={MACD_BOT - MACD_TOP} fill="rgba(19,23,34,0.97)" />
      <line x1={LEFT} y1={macdMid} x2={RIGHT} y2={macdMid} stroke={tv.gridLine} strokeWidth={1} />
      <text x={LEFT + 6} y={MACD_TOP + 14} fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.lineBlue}>MACD (12,26,9)</text>

      {/* Histogram bars */}
      {histogram.map((v, i) => {
        if (v === null) return null;
        const y1 = macdMid;
        const y2 = macdY(v);
        const top = Math.min(y1, y2);
        const barH = Math.abs(y2 - y1);
        return <rect key={i} x={cx(i) - colW * 0.4} y={top} width={colW * 0.8} height={Math.max(barH, 1)}
          fill={v >= 0 ? "rgba(38,166,154,0.5)" : "rgba(239,83,80,0.5)"} />;
      })}

      {/* MACD line */}
      {macdPoints.length > 1 && (
        <polyline points={macdPoints.join(" ")} fill="none" stroke={tv.lineBlue} strokeWidth={1.5} />
      )}

      {/* Signal line */}
      {signalPoints.length > 1 && (
        <polyline points={signalPoints.join(" ")} fill="none" stroke={tv.lineRed} strokeWidth={1.5} />
      )}

      <text x={RIGHT - 70} y={MACD_TOP + 14} fontFamily={tv.font} fontSize={9} fill={tv.lineBlue}>MACD</text>
      <text x={RIGHT - 70} y={MACD_TOP + 25} fontFamily={tv.font} fontSize={9} fill={tv.lineRed}>Signal</text>

      {/* Header */}
      <rect x={0} y={0} width={W} height={44} fill={tv.bgPanel} />
      <text x={LEFT} y={28} fontFamily={tv.font} fontSize={14} fontWeight={700} fill={tv.textWhite}>EUR/USD</text>
      <text x={LEFT + 80} y={28} fontFamily={tv.font} fontSize={11} fill={tv.axisText}>RSI + MACD Momentum Analysis</text>
    </svg>
  );
};
