import React from "react";
import { tv } from "../shared/tvTheme";
import { generateCandles, makePriceMapper } from "../shared/candleData";

const W = tv.W;
const H = tv.H;

export const StopLossVisual: React.FC = () => {
  const font = tv.font;
  const mono = tv.fontMono;

  const candles = generateCandles(28, 1.0780, "up", 42);
  const CHART_LEFT = 40, CHART_RIGHT = 680;
  const CHART_TOP = 90, CHART_BOTTOM = 490, VOL_BOT = 540;
  const pm = makePriceMapper(candles, CHART_TOP, CHART_BOTTOM);
  const colW = (CHART_RIGHT - CHART_LEFT) / candles.length;
  const cx = (i: number) => CHART_LEFT + (i + 0.5) * colW;
  const maxVol = Math.max(...candles.map(c => c.volume));
  const volH = VOL_BOT - CHART_BOTTOM;

  // Entry and stop levels
  const entryPrice = 1.0800;
  const stopPrice = 1.0755;
  const targetPrice = 1.0870;
  const entryY = pm.toY(entryPrice);
  const stopY = pm.toY(stopPrice);
  const targetY = pm.toY(targetPrice);

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={tv.bgOuter} />

      {/* Header */}
      <rect x={0} y={0} width={W} height={52} fill={tv.bgPanel} />
      <text x={W / 2} y={34} textAnchor="middle" fontFamily={font} fontSize={22}
        fontWeight={800} fill="#fff">Stop Loss &amp; Take Profit — Protecting Your Money</text>

      {/* Chart canvas */}
      <rect x={CHART_LEFT} y={CHART_TOP} width={CHART_RIGHT - CHART_LEFT}
        height={VOL_BOT - CHART_TOP} fill={tv.bgChart} />

      {/* Grid */}
      {[0.25, 0.5, 0.75].map((f, i) => {
        const y = CHART_TOP + f * (CHART_BOTTOM - CHART_TOP);
        return <line key={i} x1={CHART_LEFT} y1={y} x2={CHART_RIGHT} y2={y}
          stroke={tv.gridLine} strokeWidth={1} />;
      })}

      {/* GREEN PROFIT ZONE */}
      <rect x={CHART_LEFT} y={CHART_TOP} width={CHART_RIGHT - CHART_LEFT} height={entryY - CHART_TOP}
        fill="rgba(38,166,154,0.05)" />

      {/* RED LOSS ZONE */}
      <rect x={CHART_LEFT} y={entryY} width={CHART_RIGHT - CHART_LEFT} height={stopY - entryY}
        fill="rgba(239,83,80,0.07)" />

      {/* Volume bars */}
      {candles.map((c, i) => {
        const barH = (c.volume / maxVol) * (volH - 4);
        return <rect key={i} x={cx(i) - colW * 0.4} y={VOL_BOT - barH}
          width={colW * 0.8} height={barH}
          fill={c.close >= c.open ? tv.bullVol : tv.bearVol} />;
      })}

      {/* Candles */}
      {candles.map((c, i) => {
        const isBull = c.close >= c.open;
        const col = isBull ? tv.bullBody : tv.bearBody;
        const top = pm.toY(Math.max(c.open, c.close));
        const bh = Math.max(pm.toY(Math.min(c.open, c.close)) - top, 2);
        return (
          <g key={i}>
            <line x1={cx(i)} y1={pm.toY(c.high)} x2={cx(i)} y2={pm.toY(c.low)} stroke={col} strokeWidth={1.5} />
            <rect x={cx(i) - Math.max(colW * 0.6, 4) / 2} y={top}
              width={Math.max(colW * 0.6, 4)} height={bh} fill={col} />
          </g>
        );
      })}

      {/* TARGET line */}
      <line x1={CHART_LEFT} y1={targetY} x2={CHART_RIGHT} y2={targetY}
        stroke={tv.lineGreen} strokeWidth={2} strokeDasharray="8 4" />
      <rect x={CHART_RIGHT - 200} y={targetY - 18} width={196} height={16} rx={3} fill={tv.lineGreen} />
      <text x={CHART_RIGHT - 102} y={targetY - 6} textAnchor="middle" fontFamily={mono}
        fontSize={10} fontWeight={700} fill="#000">✓ TAKE PROFIT  1.0870</text>

      {/* ENTRY line */}
      <line x1={CHART_LEFT} y1={entryY} x2={CHART_RIGHT} y2={entryY}
        stroke={tv.lineAmber} strokeWidth={2.5} />
      <rect x={CHART_RIGHT - 200} y={entryY - 9} width={196} height={16} rx={3} fill={tv.lineAmber} />
      <text x={CHART_RIGHT - 102} y={entryY + 3} textAnchor="middle" fontFamily={mono}
        fontSize={10} fontWeight={700} fill="#000">→ ENTRY  1.0800</text>

      {/* STOP line */}
      <line x1={CHART_LEFT} y1={stopY} x2={CHART_RIGHT} y2={stopY}
        stroke={tv.lineRed} strokeWidth={2} strokeDasharray="8 4" />
      <rect x={CHART_RIGHT - 200} y={stopY - 9} width={196} height={16} rx={3} fill={tv.lineRed} />
      <text x={CHART_RIGHT - 102} y={stopY + 3} textAnchor="middle" fontFamily={mono}
        fontSize={10} fontWeight={700} fill="#fff">✗ STOP LOSS  1.0755</text>

      {/* Price axis */}
      <rect x={CHART_RIGHT} y={CHART_TOP} width={60} height={VOL_BOT - CHART_TOP} fill={tv.axisBg} />
      {[0, 1, 2, 3, 4].map(i => {
        const p = pm.minP + (pm.range * i) / 4;
        const y = pm.toY(p);
        if (y < CHART_TOP || y > CHART_BOTTOM) return null;
        return (
          <g key={i}>
            <line x1={CHART_RIGHT} y1={y} x2={CHART_RIGHT + 5} y2={y} stroke={tv.axisText} strokeWidth={1} />
            <text x={CHART_RIGHT + 8} y={y + 4} fontFamily={mono} fontSize={9} fill={tv.axisText}>{p.toFixed(4)}</text>
          </g>
        );
      })}

      {/* ===== RIGHT PANEL ===== */}
      <rect x={700} y={60} width={470} height={H - 70} rx={8}
        fill={tv.bgPanel} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

      <text x={935} y={96} textAnchor="middle" fontFamily={font} fontSize={15} fontWeight={800} fill={tv.textWhite}>
        STOP LOSS EXPLAINED
      </text>

      {/* What is stop loss */}
      <rect x={716} y={104} width={438} height={64} rx={6} fill="rgba(239,83,80,0.1)" stroke="rgba(239,83,80,0.25)" strokeWidth={1} />
      <text x={730} y={122} fontFamily={font} fontSize={11} fontWeight={700} fill={tv.lineRed}>WHAT IS A STOP LOSS?</text>
      <text x={730} y={140} fontFamily={font} fontSize={10} fill={tv.textWhite}>An automatic order that closes your trade if</text>
      <text x={730} y={155} fontFamily={font} fontSize={10} fill={tv.textWhite}>price moves AGAINST you by a set amount.</text>
      <text x={730} y={163} fontFamily={font} fontSize={10} fill={tv.textMuted}>= Your maximum loss per trade, pre-defined.</text>

      {/* Worked example */}
      <text x={730} y={192} fontFamily={font} fontSize={11} fontWeight={700} fill={tv.textWhite}>THIS TRADE AT A GLANCE</text>
      {[
        { label: "Entry",       val: "1.0800",  note: "Bought here",         color: tv.lineAmber },
        { label: "Stop Loss",   val: "1.0755",  note: "−45 pips → −$4.50",  color: tv.lineRed },
        { label: "Take Profit", val: "1.0870",  note: "+70 pips → +$7.00",  color: tv.lineGreen },
        { label: "R:R Ratio",   val: "1 : 1.6", note: "Acceptable minimum", color: tv.lineGreen },
      ].map((r, i) => (
        <g key={i}>
          <rect x={716} y={200 + i * 46} width={438} height={38} rx={5}
            fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          <rect x={716} y={200 + i * 46} width={5} height={38} rx={2} fill={r.color} />
          <text x={730} y={222 + i * 46} fontFamily={font} fontSize={11} fill={tv.axisText}>{r.label}</text>
          <text x={860} y={222 + i * 46} fontFamily={mono} fontSize={13} fontWeight={700} fill={r.color}>{r.val}</text>
          <text x={960} y={222 + i * 46} fontFamily={font} fontSize={10} fill={tv.textMuted}>{r.note}</text>
        </g>
      ))}

      {/* Where to put stop loss */}
      <text x={730} y={400} fontFamily={font} fontSize={11} fontWeight={700} fill={tv.textWhite}>WHERE TO PLACE YOUR STOP LOSS</text>
      {[
        { rule: "Below support level",    tip: "Buy trades: stop below last swing low" },
        { rule: "Above resistance level", tip: "Sell trades: stop above last swing high" },
        { rule: "ATR-based (pro method)", tip: "1.5–2× the Average True Range" },
      ].map((r, i) => (
        <g key={i}>
          <text x={730} y={418 + i * 32} fontFamily={font} fontSize={10} fontWeight={700} fill={tv.lineAmber}>• {r.rule}</text>
          <text x={748} y={432 + i * 32} fontFamily={font} fontSize={9} fill={tv.textMuted}>{r.tip}</text>
        </g>
      ))}

      {/* The cardinal sin */}
      <rect x={716} y={512} width={438} height={50} rx={6}
        fill="rgba(239,83,80,0.12)" stroke={tv.lineRed} strokeWidth={1.5} />
      <text x={730} y={530} fontFamily={font} fontSize={11} fontWeight={800} fill={tv.lineRed}>
        ⚠  NEVER MOVE YOUR STOP LOSS FURTHER AWAY
      </text>
      <text x={730} y={548} fontFamily={font} fontSize={10} fill={tv.textWhite}>
        {`"Giving it more room" almost always makes losses larger. Set it and respect it.`}
      </text>

      {/* Bottom tip */}
      <rect x={40} y={H - 30} width={CHART_RIGHT - CHART_LEFT} height={22} rx={4}
        fill="rgba(38,166,154,0.12)" stroke="rgba(38,166,154,0.25)" strokeWidth={1} />
      <text x={(CHART_LEFT + CHART_RIGHT) / 2} y={H - 15} textAnchor="middle"
        fontFamily={font} fontSize={9} fontWeight={700} fill={tv.lineGreen}>
        RULE: Place stop BEFORE entering. No stop = no trade.
      </text>
    </svg>
  );
};
