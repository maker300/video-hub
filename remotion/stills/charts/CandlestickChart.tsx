import React from "react";
import { tv } from "../shared/tvTheme";
import { generateCandles, makePriceMapper } from "../shared/candleData";
import { ChartFrame } from "../shared/ChartFrame";

const CHART_LEFT   = 10;
const CHART_RIGHT  = 1110;
const CHART_TOP    = 52;
const CHART_BOTTOM = 570;
const VOL_BOTTOM   = 635;

const Label: React.FC<{
  x: number; y: number; text: string; color: string; bg: string; anchor?: string;
}> = ({ x, y, text, color, bg, anchor = "start" }) => (
  <g>
    <rect x={anchor === "end" ? x - text.length * 5.5 - 8 : x - 4} y={y - 11}
      width={text.length * 5.5 + 12} height={18} rx={3} fill={bg} />
    <text x={anchor === "end" ? x - text.length * 5.5 - 2 : x + 2} y={y + 2}
      fontFamily={tv.font} fontSize={11} fontWeight={600} fill={color}>
      {text}
    </text>
  </g>
);

export const CandlestickChart: React.FC = () => {
  const candles = generateCandles(28, 1.0820, "up", 7);
  const pm = makePriceMapper(candles, CHART_TOP, CHART_BOTTOM);
  const colW = (CHART_RIGHT - CHART_LEFT) / candles.length;
  const cx = (i: number) => CHART_LEFT + (i + 0.5) * colW;

  // Pick annotation candles
  const bullIdx = 8;   // tall bullish
  const bearIdx = 14;  // bearish
  const dojiIdx = 20;  // near-doji

  const bc = candles[bullIdx];
  const beC = candles[bearIdx];
  const dc = candles[dojiIdx];

  const bx = cx(bullIdx);
  const bex = cx(bearIdx);
  const dx = cx(dojiIdx);

  // Leader line helper
  const leaderX = bx + colW * 0.5 + 30;
  const leaderXBear = bex - colW * 0.5 - 30;

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
      {/* ── Bullish candle annotations ── */}
      {/* High */}
      <line x1={bx} y1={pm.toY(bc.high)} x2={leaderX} y2={pm.toY(bc.high)}
        stroke="rgba(255,255,255,0.5)" strokeWidth={1} strokeDasharray="3 3" />
      <Label x={leaderX + 2} y={pm.toY(bc.high)} text="High" color={tv.textWhite} bg="rgba(255,255,255,0.12)" />

      {/* Close */}
      <line x1={bx + colW * 0.3} y1={pm.toY(bc.close)} x2={leaderX} y2={pm.toY(bc.close)}
        stroke="rgba(255,255,255,0.5)" strokeWidth={1} strokeDasharray="3 3" />
      <Label x={leaderX + 2} y={pm.toY(bc.close)} text="Close" color={tv.textGreen} bg={tv.pillGreen} />

      {/* Open */}
      <line x1={bx + colW * 0.3} y1={pm.toY(bc.open)} x2={leaderX} y2={pm.toY(bc.open)}
        stroke="rgba(255,255,255,0.5)" strokeWidth={1} strokeDasharray="3 3" />
      <Label x={leaderX + 2} y={pm.toY(bc.open)} text="Open" color={tv.textWhite} bg="rgba(255,255,255,0.12)" />

      {/* Low */}
      <line x1={bx} y1={pm.toY(bc.low)} x2={leaderX} y2={pm.toY(bc.low)}
        stroke="rgba(255,255,255,0.5)" strokeWidth={1} strokeDasharray="3 3" />
      <Label x={leaderX + 2} y={pm.toY(bc.low)} text="Low" color={tv.textWhite} bg="rgba(255,255,255,0.12)" />

      {/* Body bracket */}
      <line x1={bx - colW * 0.45} y1={pm.toY(bc.open)} x2={bx - colW * 0.45} y2={pm.toY(bc.close)}
        stroke={tv.lineGreen} strokeWidth={2} />
      <line x1={bx - colW * 0.45} y1={pm.toY(bc.open)} x2={bx - colW * 0.45 - 5} y2={pm.toY(bc.open)}
        stroke={tv.lineGreen} strokeWidth={2} />
      <line x1={bx - colW * 0.45} y1={pm.toY(bc.close)} x2={bx - colW * 0.45 - 5} y2={pm.toY(bc.close)}
        stroke={tv.lineGreen} strokeWidth={2} />
      <text x={bx - colW * 0.45 - 7} y={(pm.toY(bc.open) + pm.toY(bc.close)) / 2 + 4}
        textAnchor="end" fontFamily={tv.font} fontSize={10} fontWeight={600} fill={tv.lineGreen}>
        Body
      </text>

      {/* Upper wick label */}
      <text x={bx - 4} y={(pm.toY(bc.high) + pm.toY(bc.close)) / 2}
        textAnchor="end" fontFamily={tv.font} fontSize={10} fill={tv.axisText}>
        Upper wick
      </text>

      {/* Lower wick label */}
      <text x={bx - 4} y={(pm.toY(bc.open) + pm.toY(bc.low)) / 2 + 4}
        textAnchor="end" fontFamily={tv.font} fontSize={10} fill={tv.axisText}>
        Lower wick
      </text>

      {/* ── Bearish candle annotations ── */}
      <line x1={bex} y1={pm.toY(beC.high)} x2={leaderXBear} y2={pm.toY(beC.high)}
        stroke="rgba(239,83,80,0.5)" strokeWidth={1} strokeDasharray="3 3" />
      <Label x={leaderXBear - 54} y={pm.toY(beC.high)} text="High" color={tv.textRed} bg={tv.pillRed} anchor="end" />

      <line x1={bex - colW * 0.3} y1={pm.toY(beC.open)} x2={leaderXBear} y2={pm.toY(beC.open)}
        stroke="rgba(239,83,80,0.5)" strokeWidth={1} strokeDasharray="3 3" />
      <Label x={leaderXBear - 54} y={pm.toY(beC.open)} text="Open" color={tv.textRed} bg={tv.pillRed} anchor="end" />

      <line x1={bex - colW * 0.3} y1={pm.toY(beC.close)} x2={leaderXBear} y2={pm.toY(beC.close)}
        stroke="rgba(239,83,80,0.5)" strokeWidth={1} strokeDasharray="3 3" />
      <Label x={leaderXBear - 54} y={pm.toY(beC.close)} text="Close" color={tv.textRed} bg={tv.pillRed} anchor="end" />

      <line x1={bex} y1={pm.toY(beC.low)} x2={leaderXBear} y2={pm.toY(beC.low)}
        stroke="rgba(239,83,80,0.5)" strokeWidth={1} strokeDasharray="3 3" />
      <Label x={leaderXBear - 54} y={pm.toY(beC.low)} text="Low" color={tv.textRed} bg={tv.pillRed} anchor="end" />

      {/* ── Doji annotation ── */}
      <line x1={dx} y1={pm.toY(dc.high) - 16} x2={dx} y2={pm.toY(dc.high) - 4}
        stroke={tv.lineAmber} strokeWidth={2}
        markerEnd="url(#arrowAmber)"
      />
      <defs>
        <marker id="arrowAmber" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <polygon points="0 0, 6 3, 0 6" fill={tv.lineAmber} />
        </marker>
      </defs>
      <rect x={dx - 52} y={pm.toY(dc.high) - 34} width={104} height={18} rx={3} fill={tv.pillAmber} />
      <text x={dx} y={pm.toY(dc.high) - 21}
        textAnchor="middle" fontFamily={tv.font} fontSize={11} fontWeight={600} fill={tv.lineAmber}>
        Doji — indecision
      </text>

      {/* ── Legend box ── */}
      <rect x={CHART_LEFT + 8} y={CHART_BOTTOM - 60} width={210} height={52}
        rx={6} fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
      <rect x={CHART_LEFT + 20} y={CHART_BOTTOM - 46} width={12} height={12} rx={2} fill={tv.bullBody} />
      <text x={CHART_LEFT + 38} y={CHART_BOTTOM - 37}
        fontFamily={tv.font} fontSize={11} fill={tv.textWhite}>
        Green = Bullish (buyers won)
      </text>
      <rect x={CHART_LEFT + 20} y={CHART_BOTTOM - 28} width={12} height={12} rx={2} fill={tv.bearBody} />
      <text x={CHART_LEFT + 38} y={CHART_BOTTOM - 19}
        fontFamily={tv.font} fontSize={11} fill={tv.textWhite}>
        Red = Bearish (sellers won)
      </text>
    </ChartFrame>
  );
};
