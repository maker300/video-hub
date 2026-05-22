import React from "react";
import { tv } from "./tvTheme";
import { OHLCV, makePriceMapper } from "./candleData";

interface ChartFrameProps {
  candles: OHLCV[];
  symbol: string;
  timeframe: string;
  chartLeft: number;
  chartRight: number;
  chartTop: number;
  chartBottom: number;
  volBottom: number;
  children?: React.ReactNode;
}

export const ChartFrame: React.FC<ChartFrameProps> = ({
  candles,
  symbol,
  timeframe,
  chartLeft,
  chartRight,
  chartTop,
  chartBottom,
  volBottom,
  children,
}) => {
  const { W, H } = tv;
  const priceAxisW = 80;
  const headerH = 44;

  const pm = makePriceMapper(candles, chartTop, chartBottom);
  const colW = (chartRight - chartLeft) / candles.length;

  // Volume mapper
  const maxVol = Math.max(...candles.map(c => c.volume));
  const volH = volBottom - chartBottom;
  const toVolH = (v: number) => (v / maxVol) * (volH - 4);

  // Price axis levels (6 ticks)
  const priceTicks: number[] = [];
  for (let i = 0; i <= 5; i++) {
    priceTicks.push(pm.minP + (pm.range * i) / 5);
  }

  // Time axis — label every 4th candle
  const timeTicks = candles
    .map((c, i) => ({ i, time: c.time }))
    .filter((_, i) => i % 4 === 0);

  const lastCandle = candles[candles.length - 1];
  const isBull = lastCandle.close >= lastCandle.open;
  const lastClose = lastCandle.close;
  const firstClose = candles[0].close;
  const changePct = (((lastClose - firstClose) / firstClose) * 100).toFixed(2);
  const changeSign = lastClose >= firstClose ? "+" : "";

  const cx = (i: number) => chartLeft + (i + 0.5) * colW;

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      {/* Outer background */}
      <rect width={W} height={H} fill={tv.bgOuter} />

      {/* Chart canvas */}
      <rect
        x={chartLeft} y={chartTop}
        width={chartRight - chartLeft} height={volBottom - chartTop}
        fill={tv.bgChart}
      />

      {/* Horizontal grid lines */}
      {priceTicks.map((p, i) => {
        const y = pm.toY(p);
        if (y < chartTop || y > chartBottom) return null;
        return (
          <line key={i}
            x1={chartLeft} y1={y} x2={chartRight} y2={y}
            stroke={tv.gridLine} strokeWidth={1}
          />
        );
      })}

      {/* Vertical grid lines */}
      {timeTicks.map(({ i }) => {
        const x = cx(i);
        return (
          <line key={i}
            x1={x} y1={chartTop} x2={x} y2={chartBottom}
            stroke={tv.gridLine} strokeWidth={1}
          />
        );
      })}

      {/* Volume panel background */}
      <rect
        x={chartLeft} y={chartBottom + 1}
        width={chartRight - chartLeft} height={volH - 1}
        fill="rgba(0,0,0,0.2)"
      />

      {/* Volume bars */}
      {candles.map((c, i) => {
        const isBullC = c.close >= c.open;
        const barH = toVolH(c.volume);
        return (
          <rect key={i}
            x={cx(i) - colW * 0.4} y={volBottom - barH}
            width={colW * 0.8} height={barH}
            fill={isBullC ? tv.bullVol : tv.bearVol}
          />
        );
      })}

      {/* Candle wicks */}
      {candles.map((c, i) => {
        const isBullC = c.close >= c.open;
        const color = isBullC ? tv.bullWick : tv.bearWick;
        return (
          <line key={i}
            x1={cx(i)} y1={pm.toY(c.high)}
            x2={cx(i)} y2={pm.toY(c.low)}
            stroke={color} strokeWidth={1.5}
          />
        );
      })}

      {/* Candle bodies */}
      {candles.map((c, i) => {
        const isBullC = c.close >= c.open;
        const color = isBullC ? tv.bullBody : tv.bearBody;
        const top = pm.toY(Math.max(c.open, c.close));
        const bot = pm.toY(Math.min(c.open, c.close));
        const bodyH = Math.max(bot - top, 2);
        const bw = Math.max(colW * 0.6, 4);
        return (
          <rect key={i}
            x={cx(i) - bw / 2} y={top}
            width={bw} height={bodyH}
            fill={color}
          />
        );
      })}

      {/* Price axis background */}
      <rect
        x={chartRight} y={chartTop}
        width={priceAxisW} height={volBottom - chartTop}
        fill={tv.axisBg}
      />

      {/* Price axis ticks */}
      {priceTicks.map((p, i) => {
        const y = pm.toY(p);
        if (y < chartTop || y > chartBottom) return null;
        return (
          <g key={i}>
            <line x1={chartRight} y1={y} x2={chartRight + 6} y2={y} stroke={tv.axisText} strokeWidth={1} />
            <text
              x={chartRight + 10} y={y + 4}
              fontFamily={tv.fontMono} fontSize={11}
              fill={tv.axisText}
            >
              {p.toFixed(4)}
            </text>
          </g>
        );
      })}

      {/* Last price pill */}
      {(() => {
        const y = pm.toY(lastClose);
        const pillColor = isBull ? tv.bullBody : tv.bearBody;
        if (y < chartTop || y > chartBottom) return null;
        return (
          <g>
            <line x1={chartLeft} y1={y} x2={chartRight} y2={y}
              stroke={pillColor} strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
            <rect x={chartRight} y={y - 10} width={priceAxisW - 2} height={20}
              fill={pillColor} rx={3} />
            <text x={chartRight + (priceAxisW - 2) / 2} y={y + 4}
              textAnchor="middle" fontFamily={tv.fontMono} fontSize={11}
              fontWeight={700} fill="#fff">
              {lastClose.toFixed(4)}
            </text>
          </g>
        );
      })()}

      {/* Time axis */}
      <rect x={chartLeft} y={volBottom} width={chartRight - chartLeft} height={22} fill={tv.axisBg} />
      {timeTicks.map(({ i, time }) => {
        const x = cx(i);
        return (
          <text key={i}
            x={x} y={volBottom + 15}
            textAnchor="middle"
            fontFamily={tv.font} fontSize={10}
            fill={tv.axisText}
          >
            {time}
          </text>
        );
      })}

      {/* Header bar */}
      <rect x={0} y={0} width={W} height={headerH} fill={tv.bgPanel} />
      <text x={chartLeft} y={28}
        fontFamily={tv.font} fontSize={15} fontWeight={700} fill={tv.textWhite}>
        {symbol}
      </text>
      <rect x={chartLeft + 80} y={12} width={36} height={18} rx={3} fill="rgba(255,255,255,0.08)" />
      <text x={chartLeft + 98} y={25}
        textAnchor="middle"
        fontFamily={tv.font} fontSize={11} fontWeight={600} fill={tv.axisText}>
        {timeframe}
      </text>
      <text x={chartLeft + 124} y={28}
        fontFamily={tv.font} fontSize={11} fill={tv.textMuted}>
        FX · FOREX
      </text>

      {/* Change badge */}
      <text
        x={chartRight - 10} y={28}
        textAnchor="end"
        fontFamily={tv.fontMono} fontSize={13} fontWeight={700}
        fill={isBull ? tv.textGreen : tv.textRed}
      >
        {lastClose.toFixed(4)}  {changeSign}{changePct}%
      </text>

      {/* Chart border */}
      <rect
        x={chartLeft} y={chartTop}
        width={chartRight - chartLeft} height={volBottom - chartTop}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1}
      />

      {/* Overlay annotations */}
      {children}
    </svg>
  );
};
