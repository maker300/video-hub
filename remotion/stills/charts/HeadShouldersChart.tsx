import React from "react";
import { tv } from "../shared/tvTheme";
import { generateCandles, makePriceMapper } from "../shared/candleData";
import { ChartFrame } from "../shared/ChartFrame";

const CHART_LEFT   = 10;
const CHART_RIGHT  = 1110;
const CHART_TOP    = 52;
const CHART_BOTTOM = 570;
const VOL_BOTTOM   = 635;

export const HeadShouldersChart: React.FC = () => {
  const candles = generateCandles(36, 1.0900, "hs", 23);
  const pm = makePriceMapper(candles, CHART_TOP, CHART_BOTTOM);
  const colW = (CHART_RIGHT - CHART_LEFT) / candles.length;
  const cx = (i: number) => CHART_LEFT + (i + 0.5) * colW;

  // Identify peaks in each third
  const third = Math.floor(candles.length / 3);

  let lsIdx = 0, headIdx = 0, rsIdx = 0;
  let lsH = -Infinity, headH = -Infinity, rsH = -Infinity;

  for (let i = 0; i < third; i++) {
    if (candles[i].high > lsH) { lsH = candles[i].high; lsIdx = i; }
  }
  for (let i = third; i < third * 2; i++) {
    if (candles[i].high > headH) { headH = candles[i].high; headIdx = i; }
  }
  for (let i = third * 2; i < candles.length; i++) {
    if (candles[i].high > rsH) { rsH = candles[i].high; rsIdx = i; }
  }

  // Troughs between peaks
  let t1Idx = lsIdx, t1L = Infinity;
  for (let i = lsIdx; i < headIdx; i++) {
    if (candles[i].low < t1L) { t1L = candles[i].low; t1Idx = i; }
  }
  let t2Idx = headIdx, t2L = Infinity;
  for (let i = headIdx; i < rsIdx; i++) {
    if (candles[i].low < t2L) { t2L = candles[i].low; t2Idx = i; }
  }

  const necklineY1 = pm.toY(t1L);
  const necklineY2 = pm.toY(t2L);

  // Extrapolate neckline to entry point (after rsIdx)
  const necklineSlope = (necklineY2 - necklineY1) / (cx(t2Idx) - cx(t1Idx));
  const necklineAtRS = necklineY2 + necklineSlope * (cx(rsIdx + 3) - cx(t2Idx));

  // Head height above neckline
  const headPeakY = pm.toY(headH);
  const neckAtHead = necklineY1 + necklineSlope * (cx(headIdx) - cx(t1Idx));
  const headHeight = neckAtHead - headPeakY;
  const targetY = necklineAtRS + headHeight;

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
      {/* Neckline */}
      <line
        x1={cx(t1Idx)} y1={necklineY1}
        x2={cx(rsIdx + 4)} y2={necklineY1 + necklineSlope * (cx(rsIdx + 4) - cx(t1Idx))}
        stroke={tv.lineAmber} strokeWidth={2} strokeDasharray="8 4"
      />
      {/* Neckline label */}
      <rect x={cx(rsIdx + 4) + 4} y={necklineAtRS - 11} width={72} height={18} rx={3} fill={tv.pillAmber} />
      <text x={cx(rsIdx + 4) + 40} y={necklineAtRS + 2}
        textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={600} fill={tv.lineAmber}>
        Neckline
      </text>

      {/* Peak labels */}
      {[
        { idx: lsIdx, h: lsH, label: "Left Shoulder" },
        { idx: headIdx, h: headH, label: "Head" },
        { idx: rsIdx, h: rsH, label: "Right Shoulder" },
      ].map(({ idx, h, label }, k) => (
        <g key={k}>
          <line x1={cx(idx)} y1={pm.toY(h) - 18} x2={cx(idx)} y2={pm.toY(h) - 4}
            stroke={tv.textWhite} strokeWidth={1.5} />
          <rect x={cx(idx) - label.length * 3.3 - 2} y={pm.toY(h) - 36}
            width={label.length * 6.6 + 4} height={18} rx={3} fill="rgba(255,255,255,0.12)" />
          <text x={cx(idx)} y={pm.toY(h) - 23}
            textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={600} fill={tv.textWhite}>
            {label}
          </text>
        </g>
      ))}

      {/* Entry arrow */}
      <defs>
        <marker id="arrDown" markerWidth="7" markerHeight="7" refX="3.5" refY="0" orient="auto">
          <polygon points="0 0, 7 0, 3.5 7" fill={tv.lineRed} />
        </marker>
      </defs>
      <line x1={cx(rsIdx + 2)} y1={necklineAtRS - 6} x2={cx(rsIdx + 2)} y2={necklineAtRS + 20}
        stroke={tv.lineRed} strokeWidth={2.5} markerEnd="url(#arrDown)" />
      <rect x={cx(rsIdx + 2) - 24} y={necklineAtRS - 24} width={48} height={18} rx={3} fill={tv.pillRed} />
      <text x={cx(rsIdx + 2)} y={necklineAtRS - 11}
        textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={700} fill={tv.textRed}>
        Entry
      </text>

      {/* Target line */}
      {targetY < CHART_BOTTOM && (
        <>
          <line x1={cx(rsIdx + 2)} y1={targetY} x2={CHART_RIGHT - 10} y2={targetY}
            stroke={tv.lineRed} strokeWidth={1.5} strokeDasharray="6 3" />
          <rect x={cx(rsIdx + 2)} y={targetY - 11} width={54} height={18} rx={3} fill={tv.pillRed} />
          <text x={cx(rsIdx + 2) + 27} y={targetY + 2}
            textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={600} fill={tv.textRed}>
            Target
          </text>
        </>
      )}

      {/* Measured move dotted vertical */}
      <line x1={cx(headIdx)} y1={headPeakY} x2={cx(headIdx)} y2={neckAtHead}
        stroke="rgba(255,255,255,0.25)" strokeWidth={1} strokeDasharray="4 4" />

      {/* Info box */}
      <rect x={CHART_RIGHT - 230} y={CHART_BOTTOM - 108} width={220} height={100}
        rx={8} fill="rgba(0,0,0,0.65)" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
      {[
        { label: "Pattern:",  val: "Head & Shoulders" },
        { label: "Signal:",   val: "Bearish reversal" },
        { label: "Entry:",    val: "Break below neckline" },
        { label: "Target:",   val: "Measured move" },
      ].map(({ label, val }, k) => (
        <g key={k}>
          <text x={CHART_RIGHT - 220} y={CHART_BOTTOM - 86 + k * 22}
            fontFamily={tv.font} fontSize={11} fill={tv.axisText}>{label}</text>
          <text x={CHART_RIGHT - 158} y={CHART_BOTTOM - 86 + k * 22}
            fontFamily={tv.font} fontSize={11} fill={tv.textWhite}>{val}</text>
        </g>
      ))}
    </ChartFrame>
  );
};
