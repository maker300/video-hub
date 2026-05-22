import React from "react";
import { tv } from "../shared/tvTheme";
import { generateCandles, makePriceMapper, OHLCV } from "../shared/candleData";

const W = tv.W;
const H = tv.H;

interface MiniPanelProps {
  candles: OHLCV[];
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  labelColor: string;
  pillColor: string;
  children?: React.ReactNode;
}

const MiniPanel: React.FC<MiniPanelProps> = ({
  candles, x, y, w, h, label, labelColor, pillColor, children
}) => {
  const volH = 35;
  const chartTop = y + 30;
  const chartBot = y + h - volH - 14;
  const volBot = y + h - 10;
  const pm = makePriceMapper(candles, chartTop, chartBot);
  const colW = w / candles.length;
  const cx = (i: number) => x + (i + 0.5) * colW;
  const maxVol = Math.max(...candles.map(c => c.volume));

  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={tv.bgChart} rx={4} />
      {/* Grid */}
      {[0.25, 0.5, 0.75].map((r, i) => {
        const gy = chartTop + r * (chartBot - chartTop);
        return <line key={i} x1={x} y1={gy} x2={x + w} y2={gy} stroke={tv.gridLine} strokeWidth={0.5} />;
      })}
      {/* Volume */}
      {candles.map((c, i) => {
        const isBull = c.close >= c.open;
        const bh = (c.volume / maxVol) * (volH - 4);
        return <rect key={i} x={cx(i) - colW * 0.4} y={volBot - bh} width={colW * 0.8} height={bh}
          fill={isBull ? tv.bullVol : tv.bearVol} />;
      })}
      {/* Candles */}
      {candles.map((c, i) => {
        const isBull = c.close >= c.open;
        const color = isBull ? tv.bullBody : tv.bearBody;
        const top = pm.toY(Math.max(c.open, c.close));
        const bot = pm.toY(Math.min(c.open, c.close));
        const bh = Math.max(bot - top, 2);
        const bw = Math.max(colW * 0.6, 3);
        return (
          <g key={i}>
            <line x1={cx(i)} y1={pm.toY(c.high)} x2={cx(i)} y2={pm.toY(c.low)} stroke={color} strokeWidth={1} />
            <rect x={cx(i) - bw / 2} y={top} width={bw} height={bh} fill={color} />
          </g>
        );
      })}
      {/* Border */}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} rx={4} />
      {/* Label pill top-right */}
      <rect x={x + w - label.length * 6 - 12} y={y + 6} width={label.length * 6 + 10} height={18} rx={9} fill={pillColor} />
      <text x={x + w - label.length * 3 - 7} y={y + 18}
        textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={700} fill={labelColor}>
        {label}
      </text>
      {children}
    </g>
  );
};

export const ChartPatternsChart: React.FC = () => {
  const gap = 8;
  const pw = Math.floor((W - gap * 3) / 2);
  const ph = Math.floor((H - gap * 3) / 2);

  const dtCandles  = generateCandles(22, 1.0880, "double_top", 5);
  // Double bottom: invert double_top prices
  const dbRaw      = generateCandles(22, 1.0880, "double_top", 5);
  const dbMid = (Math.max(...dbRaw.map(c => c.high)) + Math.min(...dbRaw.map(c => c.low))) / 2;
  const dbCandles: OHLCV[] = dbRaw.map(c => ({
    ...c,
    open:  dbMid + (dbMid - c.open),
    close: dbMid + (dbMid - c.close),
    high:  dbMid + (dbMid - c.low),
    low:   dbMid + (dbMid - c.high),
  }));
  const triCandles = generateCandles(22, 1.0860, "range", 31);
  const bfCandles  = generateCandles(22, 1.0800, "bull_flag", 41);

  // Positions
  const tlX = gap, tlY = gap;
  const trX = gap + pw + gap, trY = gap;
  const blX = gap, blY = gap + ph + gap;
  const brX = gap + pw + gap, brY = gap + ph + gap;

  // ── Double Top helpers ──────────────────────────────────────────────────────
  const dtChartTop = tlY + 30;
  const dtChartBot = tlY + ph - 45 - 14;
  const dtPm = makePriceMapper(dtCandles, dtChartTop, dtChartBot);
  const dtColW = pw / dtCandles.length;
  const dtCx = (i: number) => tlX + (i + 0.5) * dtColW;

  // Find two tops
  let top1Idx = 0, top2Idx = 0;
  let top1H = -Infinity, top2H = -Infinity;
  for (let i = 0; i < 11; i++) if (dtCandles[i].high > top1H) { top1H = dtCandles[i].high; top1Idx = i; }
  for (let i = 11; i < 22; i++) if (dtCandles[i].high > top2H) { top2H = dtCandles[i].high; top2Idx = i; }
  const dtResY = dtPm.toY((top1H + top2H) / 2);
  let dtNeckIdx = top1Idx; let dtNeckL = Infinity;
  for (let i = top1Idx; i < top2Idx; i++) if (dtCandles[i].low < dtNeckL) { dtNeckL = dtCandles[i].low; dtNeckIdx = i; }
  const dtNeckY = dtPm.toY(dtNeckL);

  // ── Double Bottom helpers ───────────────────────────────────────────────────
  const dbChartTop = trY + 30;
  const dbChartBot = trY + ph - 45 - 14;
  const dbPm = makePriceMapper(dbCandles, dbChartTop, dbChartBot);
  const dbColW = pw / dbCandles.length;
  const dbCx = (i: number) => trX + (i + 0.5) * dbColW;

  let bot1Idx = 0, bot2Idx = 0;
  let bot1L = Infinity, bot2L = Infinity;
  for (let i = 0; i < 11; i++) if (dbCandles[i].low < bot1L) { bot1L = dbCandles[i].low; bot1Idx = i; }
  for (let i = 11; i < 22; i++) if (dbCandles[i].low < bot2L) { bot2L = dbCandles[i].low; bot2Idx = i; }
  const dbSupY = dbPm.toY((bot1L + bot2L) / 2);
  let dbNeckIdx = bot1Idx; let dbNeckH = -Infinity;
  for (let i = bot1Idx; i < bot2Idx; i++) if (dbCandles[i].high > dbNeckH) { dbNeckH = dbCandles[i].high; dbNeckIdx = i; }
  const dbNeckY = dbPm.toY(dbNeckH);

  // ── Ascending Triangle helpers ──────────────────────────────────────────────
  const triChartTop = blY + 30;
  const triChartBot = blY + ph - 45 - 14;
  const triPm = makePriceMapper(triCandles, triChartTop, triChartBot);
  // Override: flat resistance at 75% of range, rising lows
  const triResP = triPm.minP + triPm.range * 0.75;
  const triResY = triPm.toY(triResP);
  const triLow1P = triPm.minP + triPm.range * 0.2;
  const triLow2P = triPm.minP + triPm.range * 0.55;
  const triColW = pw / triCandles.length;
  const triCx = (i: number) => blX + (i + 0.5) * triColW;

  // ── Bull Flag helpers ────────────────────────────────────────────────────────
  const bfChartTop = brY + 30;
  const bfChartBot = brY + ph - 45 - 14;
  const bfPm = makePriceMapper(bfCandles, bfChartTop, bfChartBot);
  const bfColW = pw / bfCandles.length;
  const bfCx = (i: number) => brX + (i + 0.5) * bfColW;
  const flagpoleEnd = Math.floor(bfCandles.length * 0.35);
  const flagEnd     = Math.floor(bfCandles.length * 0.65);

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={tv.bgOuter} />

      {/* Double Top */}
      <MiniPanel candles={dtCandles} x={tlX} y={tlY} w={pw} h={ph}
        label="Double Top" labelColor={tv.textRed} pillColor={tv.pillRed}>
        {/* Resistance line */}
        <line x1={dtCx(top1Idx)} y1={dtResY} x2={dtCx(top2Idx)} y2={dtResY}
          stroke={tv.lineRed} strokeWidth={2} />
        {/* Neckline */}
        <line x1={dtCx(top1Idx)} y1={dtNeckY} x2={dtCx(21)} y2={dtNeckY}
          stroke={tv.lineAmber} strokeWidth={1.5} strokeDasharray="5 3" />
        {/* Breakdown arrow */}
        <text x={dtCx(top2Idx + 2)} y={dtNeckY + 20}
          textAnchor="middle" fontFamily={tv.font} fontSize={18} fill={tv.lineRed}>↓</text>
      </MiniPanel>

      {/* Double Bottom */}
      <MiniPanel candles={dbCandles} x={trX} y={trY} w={pw} h={ph}
        label="Double Bottom" labelColor={tv.textGreen} pillColor={tv.pillGreen}>
        {/* Support line */}
        <line x1={dbCx(bot1Idx)} y1={dbSupY} x2={dbCx(bot2Idx)} y2={dbSupY}
          stroke={tv.lineGreen} strokeWidth={2} />
        {/* Neckline */}
        <line x1={dbCx(bot1Idx)} y1={dbNeckY} x2={dbCx(21)} y2={dbNeckY}
          stroke={tv.lineAmber} strokeWidth={1.5} strokeDasharray="5 3" />
        {/* Breakout arrow */}
        <text x={dbCx(bot2Idx + 2)} y={dbNeckY - 10}
          textAnchor="middle" fontFamily={tv.font} fontSize={18} fill={tv.lineGreen}>↑</text>
      </MiniPanel>

      {/* Ascending Triangle */}
      <MiniPanel candles={triCandles} x={blX} y={blY} w={pw} h={ph}
        label="Ascending Triangle" labelColor={tv.textGreen} pillColor={tv.pillGreen}>
        {/* Flat resistance */}
        <line x1={blX + 4} y1={triResY} x2={blX + pw - 4} y2={triResY}
          stroke={tv.lineRed} strokeWidth={2} />
        {/* Rising support trendline */}
        <line x1={triCx(1)} y1={triPm.toY(triLow1P)}
              x2={triCx(18)} y2={triPm.toY(triLow2P)}
          stroke={tv.lineGreen} strokeWidth={2} />
        {/* Breakout arrow */}
        <text x={triCx(20)} y={triResY - 10}
          textAnchor="middle" fontFamily={tv.font} fontSize={18} fill={tv.lineGreen}>↑</text>
      </MiniPanel>

      {/* Bull Flag */}
      <MiniPanel candles={bfCandles} x={brX} y={brY} w={pw} h={ph}
        label="Bull Flag" labelColor={tv.textGreen} pillColor={tv.pillGreen}>
        {/* Flagpole bracket */}
        <rect x={bfCx(0) - bfColW * 0.6} y={bfPm.toY(bfCandles[flagpoleEnd].high) - 4}
          width={(flagpoleEnd + 1) * bfColW} height={bfPm.toY(bfCandles[0].low) - bfPm.toY(bfCandles[flagpoleEnd].high) + 8}
          fill="none" stroke={tv.lineGreen} strokeWidth={1.5} strokeDasharray="4 3" rx={3} />
        <text x={bfCx(flagpoleEnd / 2)} y={bfPm.toY(bfCandles[flagpoleEnd].high) - 8}
          textAnchor="middle" fontFamily={tv.font} fontSize={10} fontWeight={600} fill={tv.lineGreen}>
          Flagpole
        </text>
        {/* Consolidation bracket */}
        {(() => {
          const consX1 = bfCx(flagpoleEnd) - bfColW * 0.5;
          const consX2 = bfCx(flagEnd) + bfColW * 0.5;
          const consTop = bfPm.toY(Math.max(...bfCandles.slice(flagpoleEnd, flagEnd + 1).map(c => c.high))) - 4;
          const consBot = bfPm.toY(Math.min(...bfCandles.slice(flagpoleEnd, flagEnd + 1).map(c => c.low))) + 4;
          return (
            <>
              <rect x={consX1} y={consTop} width={consX2 - consX1} height={consBot - consTop}
                fill="none" stroke={tv.axisText} strokeWidth={1.5} strokeDasharray="4 3" rx={3} />
              <text x={(consX1 + consX2) / 2} y={consBot + 12}
                textAnchor="middle" fontFamily={tv.font} fontSize={9} fill={tv.axisText}>
                Flag (consolidation)
              </text>
            </>
          );
        })()}
        {/* Continuation arrow */}
        <text x={bfCx(flagEnd + 2)} y={bfPm.toY(bfCandles[flagEnd].high) - 10}
          textAnchor="middle" fontFamily={tv.font} fontSize={18} fill={tv.lineGreen}>↑</text>
      </MiniPanel>
    </svg>
  );
};
