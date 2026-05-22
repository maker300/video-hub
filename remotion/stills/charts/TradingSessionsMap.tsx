import React from "react";
import { tv } from "../shared/tvTheme";

const W = tv.W;
const H = tv.H;

const SESSIONS = [
  { name: "Sydney",   start: 22, end: 7,  color: "#f5c518", tz: "AEDT UTC+11", pairs: "AUD/USD · NZD/USD",  vol: 30  },
  { name: "Tokyo",    start: 0,  end: 9,  color: "#ef5350", tz: "JST UTC+9",   pairs: "USD/JPY · EUR/JPY",  vol: 55  },
  { name: "London",   start: 8,  end: 17, color: "#2196f3", tz: "GMT/BST",     pairs: "EUR/USD · GBP/USD",  vol: 100 },
  { name: "New York", start: 13, end: 22, color: "#26a69a", tz: "EST UTC-5",   pairs: "USD/JPY · GBP/USD",  vol: 90  },
];

// Overlaps
const OVERLAPS = [
  { start: 8, end: 9,  label: "Tokyo/London", color: "#9c27b0", vol: 75 },
  { start: 13, end: 17, label: "London/NY",   color: "#ff9800", vol: 140 },
];

export const TradingSessionsMap: React.FC = () => {
  const font = tv.font;
  const mono = tv.fontMono;

  const CLOCK_LEFT = 40;
  const CLOCK_RIGHT = W - 40;
  const CLOCK_W = CLOCK_RIGHT - CLOCK_LEFT;

  // Each hour maps to x position
  const hx = (h: number) => CLOCK_LEFT + ((h % 24) / 24) * CLOCK_W;

  // Session bar heights (proportional to volume)
  const MAX_VOL = 140;
  const BAR_MAX_H = 70;
  const BAR_BASE_Y = 390;

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={tv.bgOuter} />

      {/* Header */}
      <rect x={0} y={0} width={W} height={52} fill={tv.bgPanel} />
      <text x={W / 2} y={34} textAnchor="middle" fontFamily={font} fontSize={22}
        fontWeight={800} fill="#fff">Trading Sessions — When to Trade &amp; Why It Matters</text>

      {/* Subtitle */}
      <text x={W / 2} y={70} textAnchor="middle" fontFamily={font} fontSize={12} fill={tv.textMuted}>
        Forex is open 24 hours Mon–Fri. Each session has different volume, volatility, and best pairs.
      </text>

      {/* ===== SESSION CARDS ===== */}
      {SESSIONS.map((s, i) => (
        <g key={i}>
          <rect x={40 + i * 290} y={84} width={270} height={100} rx={8}
            fill={`${s.color}12`} stroke={`${s.color}50`} strokeWidth={1.5} />
          <rect x={40 + i * 290} y={84} width={6} height={100} rx={3} fill={s.color} />
          <text x={58 + i * 290} y={106} fontFamily={font} fontSize={14} fontWeight={800} fill={s.color}>{s.name}</text>
          <text x={58 + i * 290} y={122} fontFamily={mono} fontSize={11} fill={tv.textWhite}>{s.tz}</text>
          <text x={58 + i * 290} y={138} fontFamily={mono} fontSize={11} fill={tv.textWhite}>
            {String(s.start).padStart(2,'0')}:00 – {String(s.end % 24).padStart(2,'0')}:00 GMT
          </text>
          <text x={58 + i * 290} y={154} fontFamily={font} fontSize={10} fill={tv.axisText}>{s.pairs}</text>
          {/* Volume pill */}
          <rect x={58 + i * 290} y={162} width={60} height={16} rx={8}
            fill={`${s.color}30`} stroke={s.color} strokeWidth={1} />
          <text x={88 + i * 290} y={173} textAnchor="middle" fontFamily={font} fontSize={9} fontWeight={700} fill={s.color}>
            Vol: {s.vol}%
          </text>
        </g>
      ))}

      {/* ===== 24-HOUR CLOCK STRIP ===== */}
      <text x={CLOCK_LEFT} y={208} fontFamily={font} fontSize={12} fontWeight={700} fill={tv.textWhite}>
        24-HOUR TRADING CLOCK (GMT)
      </text>

      {/* Clock background */}
      <rect x={CLOCK_LEFT} y={214} width={CLOCK_W} height={26} rx={4}
        fill={tv.bgChart} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

      {/* Hour ticks */}
      {Array.from({ length: 25 }, (_, h) => {
        const x = hx(h);
        const isMain = h % 6 === 0;
        return (
          <g key={h}>
            <line x1={x} y1={214} x2={x} y2={240} stroke="rgba(255,255,255,0.15)" strokeWidth={isMain ? 1.5 : 0.5} />
            {isMain && <text x={x} y={252} textAnchor="middle" fontFamily={mono} fontSize={9} fill={tv.axisText}>
              {String(h).padStart(2,'0')}:00
            </text>}
          </g>
        );
      })}

      {/* Session bars on clock */}
      {SESSIONS.map((s, i) => {
        const x1 = hx(s.start);
        const endH = s.end <= s.start ? s.end + 24 : s.end;
        const rawW = ((endH - s.start) / 24) * CLOCK_W;
        // Clamp to clock width
        const w = Math.min(rawW, CLOCK_RIGHT - x1);
        return (
          <rect key={i} x={x1} y={216} width={Math.max(w, 0)} height={22}
            fill={s.color} opacity={0.45} rx={2} />
        );
      })}

      {/* Sydney wraps midnight — render second part */}
      {(() => {
        const s = SESSIONS[0]; // Sydney
        const w2 = (s.end / 24) * CLOCK_W;
        return <rect x={CLOCK_LEFT} y={216} width={w2} height={22}
          fill={s.color} opacity={0.45} rx={2} />;
      })()}

      {/* ===== VOLUME BAR CHART ===== */}
      <text x={CLOCK_LEFT} y={278} fontFamily={font} fontSize={12} fontWeight={700} fill={tv.textWhite}>
        MARKET VOLATILITY BY HOUR
      </text>

      {/* Volume chart background */}
      <rect x={CLOCK_LEFT} y={284} width={CLOCK_W} height={BAR_MAX_H + 16} rx={4}
        fill={tv.bgChart} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

      {/* Hourly volume bars */}
      {Array.from({ length: 24 }, (_, h) => {
        // Build volume from sessions active at this hour
        let vol = 10; // base
        SESSIONS.forEach(s => {
          const endH = s.end <= s.start ? s.end + 24 : s.end;
          const active = h >= s.start && h < endH;
          const wraps = s.end < s.start && h < s.end;
          if (active || wraps) vol += s.vol;
        });

        // Overlap bonus
        let color = "rgba(255,255,255,0.15)";
        SESSIONS.forEach(s => {
          const endH = s.end <= s.start ? s.end + 24 : s.end;
          const active = h >= s.start && h < endH;
          const wraps = s.end < s.start && h < s.end;
          if (active || wraps) color = s.color;
        });

        // London/NY overlap
        if (h >= 13 && h < 17) color = "#ff9800";

        const barH = Math.min((vol / 250) * BAR_MAX_H, BAR_MAX_H);
        const x = CLOCK_LEFT + (h / 24) * CLOCK_W;
        const barWidth = CLOCK_W / 24 - 2;

        return (
          <rect key={h} x={x + 1} y={284 + BAR_MAX_H - barH + 8} width={barWidth} height={barH}
            fill={color} opacity={0.7} rx={1} />
        );
      })}

      {/* Overlap annotations */}
      <rect x={hx(13)} y={370} width={hx(17) - hx(13)} height={16} rx={3}
        fill="rgba(255,152,0,0.3)" stroke="#ff9800" strokeWidth={1} />
      <text x={(hx(13) + hx(17)) / 2} y={381} textAnchor="middle" fontFamily={font} fontSize={9} fontWeight={700} fill="#ff9800">
        PEAK — London/NY overlap
      </text>

      {/* ===== BEST TIMES TABLE ===== */}
      <text x={CLOCK_LEFT} y={408} fontFamily={font} fontSize={12} fontWeight={700} fill={tv.textWhite}>
        BEST TIMES TO TRADE
      </text>

      {[
        { time: "08:00 – 09:00 GMT", label: "Tokyo/London open",  tip: "EUR/JPY volatility spike",        color: "#9c27b0" },
        { time: "13:00 – 17:00 GMT", label: "London/NY overlap",  tip: "Highest volume — best spreads",   color: "#ff9800" },
        { time: "22:00 – 02:00 GMT", label: "Quiet hours",        tip: "Low volume — wider spreads, avoid", color: tv.lineRed },
      ].map((r, i) => (
        <g key={i}>
          <rect x={CLOCK_LEFT + i * 390} y={416} width={370} height={56} rx={6}
            fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <rect x={CLOCK_LEFT + i * 390} y={416} width={6} height={56} rx={3} fill={r.color} />
          <text x={CLOCK_LEFT + i * 390 + 18} y={436} fontFamily={mono} fontSize={12} fontWeight={700} fill={r.color}>{r.time}</text>
          <text x={CLOCK_LEFT + i * 390 + 18} y={452} fontFamily={font} fontSize={11} fill={tv.textWhite}>{r.label}</text>
          <text x={CLOCK_LEFT + i * 390 + 18} y={466} fontFamily={font} fontSize={10} fill={tv.axisText}>{r.tip}</text>
        </g>
      ))}

      {/* Bottom tip */}
      <rect x={CLOCK_LEFT} y={H - 60} width={CLOCK_W} height={50} rx={8}
        fill="rgba(38,166,154,0.1)" stroke="rgba(38,166,154,0.25)" strokeWidth={1} />
      <text x={W / 2} y={H - 42} textAnchor="middle" fontFamily={font} fontSize={12} fontWeight={700} fill={tv.lineGreen}>
        BEGINNER RULE: Trade only during London session (08:00–17:00 GMT) or London/NY overlap.
      </text>
      <text x={W / 2} y={H - 24} textAnchor="middle" fontFamily={font} fontSize={11} fill={tv.textWhite}>
        This is when EUR/USD, GBP/USD spreads are tightest and price moves are most predictable.
      </text>
    </svg>
  );
};
