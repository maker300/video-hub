import React from "react";
import { tv } from "../shared/tvTheme";
import { generateCandles, makePriceMapper, OHLCV } from "../shared/candleData";

const W = tv.W;
const H = tv.H;
const HEADER_H = 44;
const VOL_H = 55;
const CHART_TOP = HEADER_H + 8;
const CHART_BOT = H - VOL_H - 26;
const VOL_BOT = H - 22;

// Mini chart panel
interface MiniChartProps {
  candles: OHLCV[];
  symbol: string;
  timeframe: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  titleColor: string;
  children?: React.ReactNode;
}

const MiniChart: React.FC<MiniChartProps> = ({
  candles, symbol, timeframe, x, y, width, height, title, titleColor, children
}) => {
  const volH = 40;
  const chartTop = y + 36;
  const chartBot = y + height - volH - 20;
  const volBot = y + height - 16;
  const pm = makePriceMapper(candles, chartTop, chartBot);
  const colW = width / candles.length;
  const cx = (i: number) => x + (i + 0.5) * colW;
  const maxVol = Math.max(...candles.map(c => c.volume));

  const priceTicks: number[] = [];
  for (let i = 0; i <= 3; i++) priceTicks.push(pm.minP + (pm.range * i) / 3);

  return (
    <g>
      {/* Panel bg */}
      <rect x={x} y={y} width={width} height={height} fill={tv.bgChart} rx={4} />
      {/* Header */}
      <rect x={x} y={y} width={width} height={34} fill={tv.bgPanel} rx={4} />
      <text x={x + 10} y={y + 22} fontFamily={tv.font} fontSize={13} fontWeight={700} fill={tv.textWhite}>{symbol}</text>
      <text x={x + width - 10} y={y + 22} textAnchor="end" fontFamily={tv.font} fontSize={11} fill={tv.axisText}>{timeframe}</text>

      {/* Grid */}
      {priceTicks.map((p, i) => {
        const gy = pm.toY(p);
        if (gy < chartTop || gy > chartBot) return null;
        return (
          <g key={i}>
            <line x1={x} y1={gy} x2={x + width} y2={gy} stroke={tv.gridLine} strokeWidth={0.5} />
            <text x={x + width - 4} y={gy + 3} textAnchor="end"
              fontFamily={tv.fontMono} fontSize={8} fill={tv.axisText}>{p.toFixed(4)}</text>
          </g>
        );
      })}

      {/* Volume */}
      {candles.map((c, i) => {
        const isBull = c.close >= c.open;
        const barH = (c.volume / maxVol) * (volH - 4);
        return <rect key={i} x={cx(i) - colW * 0.4} y={volBot - barH} width={colW * 0.8} height={barH}
          fill={isBull ? tv.bullVol : tv.bearVol} />;
      })}

      {/* Candles */}
      {candles.map((c, i) => {
        const isBull = c.close >= c.open;
        const color = isBull ? tv.bullBody : tv.bearBody;
        const top = pm.toY(Math.max(c.open, c.close));
        const bot2 = pm.toY(Math.min(c.open, c.close));
        const bh = Math.max(bot2 - top, 2);
        const bw = Math.max(colW * 0.6, 3);
        return (
          <g key={i}>
            <line x1={cx(i)} y1={pm.toY(c.high)} x2={cx(i)} y2={pm.toY(c.low)} stroke={color} strokeWidth={1} />
            <rect x={cx(i) - bw / 2} y={top} width={bw} height={bh} fill={color} />
          </g>
        );
      })}

      {/* Border */}
      <rect x={x} y={y} width={width} height={height} fill="none"
        stroke="rgba(255,255,255,0.08)" strokeWidth={1} rx={4} />

      {/* Title */}
      <text x={x + width / 2} y={chartBot - 10}
        textAnchor="middle" fontFamily={tv.font} fontSize={15} fontWeight={700} fill={titleColor}>
        {title}
      </text>

      {children}
    </g>
  );
};

export const TrendsChart: React.FC = () => {
  const panelW = Math.floor((W - 30) / 3);
  const panelH = H - 10;

  const upCandles   = generateCandles(20, 1.0780, "up",    7);
  const downCandles = generateCandles(20, 1.0950, "down",  9);
  const rangeCandles= generateCandles(20, 1.0850, "range", 11);

  const panelY = 5;

  // ── Uptrend helpers ──────────────────────────────────────────────────────────
  const upChartTop = panelY + 36;
  const upChartBot = panelY + panelH - 40 - 20;
  const upPm = makePriceMapper(upCandles, upChartTop, upChartBot);
  const upColW = panelW / upCandles.length;
  const upCx = (i: number) => 10 + (i + 0.5) * upColW;

  // Trendline: connect lows 2, 7, 14
  const upLows = [2, 7, 14];
  const upTLY = upLows.map(i => upPm.toY(upCandles[i].low));
  const upTLX = upLows.map(i => upCx(i));

  // HH / HL markers
  const hhIdxs = [4, 10, 17];
  const hlIdxs = [2, 7, 14];

  // ── Downtrend helpers ───────────────────────────────────────────────────────
  const dnX = 10 + panelW + 10;
  const dnChartTop = panelY + 36;
  const dnChartBot = panelY + panelH - 40 - 20;
  const dnPm = makePriceMapper(downCandles, dnChartTop, dnChartBot);
  const dnColW = panelW / downCandles.length;
  const dnCx = (i: number) => dnX + (i + 0.5) * dnColW;

  const lhIdxs = [3, 9, 16];
  const llIdxs = [5, 12, 18];
  const dnTLY = lhIdxs.map(i => dnPm.toY(downCandles[i].high));
  const dnTLX = lhIdxs.map(i => dnCx(i));

  // ── Range helpers ────────────────────────────────────────────────────────────
  const rngX = 10 + panelW + 10 + panelW + 10;
  const rngChartTop = panelY + 36;
  const rngChartBot = panelY + panelH - 40 - 20;
  const rngPm = makePriceMapper(rangeCandles, rngChartTop, rngChartBot);
  const rngColW = panelW / rangeCandles.length;
  const rngCx = (i: number) => rngX + (i + 0.5) * rngColW;

  const rngResistance = rngPm.maxP - rngPm.range * 0.12;
  const rngSupport    = rngPm.minP + rngPm.range * 0.12;
  const rngResY = rngPm.toY(rngResistance);
  const rngSupY = rngPm.toY(rngSupport);

  // Bounces
  const resIdxs = [2, 8, 15];
  const supIdxs = [4, 11, 17];

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={tv.bgOuter} />

      {/* ── Uptrend panel ── */}
      <MiniChart candles={upCandles} symbol="EUR/USD" timeframe="1H"
        x={10} y={panelY} width={panelW} height={panelH}
        title="Uptrend" titleColor={tv.lineGreen}>
        {/* Trendline */}
        <line x1={upTLX[0]} y1={upTLY[0]} x2={upTLX[2]} y2={upTLY[2]}
          stroke={tv.lineGreen} strokeWidth={2} />
        {/* HH dots */}
        {hhIdxs.map((i, k) => (
          <g key={k}>
            <circle cx={upCx(i)} cy={upPm.toY(upCandles[i].high) - 8} r={5}
              fill="none" stroke={tv.lineGreen} strokeWidth={2} />
            <text x={upCx(i)} y={upPm.toY(upCandles[i].high) - 16}
              textAnchor="middle" fontFamily={tv.font} fontSize={9} fontWeight={700} fill={tv.lineGreen}>HH</text>
          </g>
        ))}
        {/* HL dots */}
        {hlIdxs.map((i, k) => (
          <g key={k}>
            <circle cx={upCx(i)} cy={upPm.toY(upCandles[i].low) + 8} r={5}
              fill="none" stroke="#26c6b0" strokeWidth={2} />
            <text x={upCx(i)} y={upPm.toY(upCandles[i].low) + 20}
              textAnchor="middle" fontFamily={tv.font} fontSize={9} fontWeight={700} fill="#26c6b0">HL</text>
          </g>
        ))}
      </MiniChart>

      {/* ── Downtrend panel ── */}
      <MiniChart candles={downCandles} symbol="GBP/USD" timeframe="1H"
        x={dnX} y={panelY} width={panelW} height={panelH}
        title="Downtrend" titleColor={tv.lineRed}>
        {/* Trendline */}
        <line x1={dnTLX[0]} y1={dnTLY[0]} x2={dnTLX[2]} y2={dnTLY[2]}
          stroke={tv.lineRed} strokeWidth={2} />
        {/* LH dots */}
        {lhIdxs.map((i, k) => (
          <g key={k}>
            <circle cx={dnCx(i)} cy={dnPm.toY(downCandles[i].high) - 8} r={5}
              fill="none" stroke={tv.lineRed} strokeWidth={2} />
            <text x={dnCx(i)} y={dnPm.toY(downCandles[i].high) - 16}
              textAnchor="middle" fontFamily={tv.font} fontSize={9} fontWeight={700} fill={tv.lineRed}>LH</text>
          </g>
        ))}
        {/* LL dots */}
        {llIdxs.map((i, k) => (
          <g key={k}>
            <circle cx={dnCx(i)} cy={dnPm.toY(downCandles[i].low) + 8} r={5}
              fill="none" stroke="#ff8a65" strokeWidth={2} />
            <text x={dnCx(i)} y={dnPm.toY(downCandles[i].low) + 20}
              textAnchor="middle" fontFamily={tv.font} fontSize={9} fontWeight={700} fill="#ff8a65">LL</text>
          </g>
        ))}
      </MiniChart>

      {/* ── Ranging panel ── */}
      <MiniChart candles={rangeCandles} symbol="USD/JPY" timeframe="4H"
        x={rngX} y={panelY} width={panelW} height={panelH}
        title="Ranging" titleColor={tv.lineAmber}>
        {/* Resistance line */}
        <line x1={rngX} y1={rngResY} x2={rngX + panelW} y2={rngResY}
          stroke={tv.lineRed} strokeWidth={2} strokeDasharray="6 3" />
        <rect x={rngX + panelW - 90} y={rngResY - 14} width={84} height={18} rx={3} fill={tv.pillRed} />
        <text x={rngX + panelW - 48} y={rngResY - 2}
          textAnchor="middle" fontFamily={tv.font} fontSize={10} fontWeight={600} fill={tv.textRed}>
          Resistance
        </text>

        {/* Support line */}
        <line x1={rngX} y1={rngSupY} x2={rngX + panelW} y2={rngSupY}
          stroke={tv.lineGreen} strokeWidth={2} strokeDasharray="6 3" />
        <rect x={rngX + panelW - 76} y={rngSupY + 2} width={70} height={18} rx={3} fill={tv.pillGreen} />
        <text x={rngX + panelW - 41} y={rngSupY + 14}
          textAnchor="middle" fontFamily={tv.font} fontSize={10} fontWeight={600} fill={tv.textGreen}>
          Support
        </text>

        {/* Rejection arrows at resistance */}
        {resIdxs.map((i, k) => (
          <text key={k} x={rngCx(i)} y={rngResY - 4}
            textAnchor="middle" fontFamily={tv.font} fontSize={14} fill={tv.lineRed}>↓</text>
        ))}

        {/* Bounce arrows at support */}
        {supIdxs.map((i, k) => (
          <text key={k} x={rngCx(i)} y={rngSupY + 16}
            textAnchor="middle" fontFamily={tv.font} fontSize={14} fill={tv.lineGreen}>↑</text>
        ))}
      </MiniChart>
    </svg>
  );
};
