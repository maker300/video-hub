import React from "react";
import { tv } from "../shared/tvTheme";

const W = tv.W;
const H = tv.H;

export const BidAskSpread: React.FC = () => {
  const font = tv.font;
  const mono = tv.fontMono;

  return (
    <svg width={W} height={H} xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={tv.bgOuter} />

      {/* Header */}
      <rect x={0} y={0} width={W} height={52} fill={tv.bgPanel} />
      <text x={W / 2} y={34} textAnchor="middle" fontFamily={font} fontSize={22}
        fontWeight={800} fill="#fff">Bid, Ask &amp; Spread — The Cost of Every Trade</text>

      {/* ===== BIG BROKER PRICE DISPLAY ===== */}
      <rect x={60} y={70} width={1080} height={180} rx={10}
        fill={tv.bgChart} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

      {/* EUR/USD label */}
      <text x={100} y={108} fontFamily={font} fontSize={20} fontWeight={800} fill="#fff">EUR/USD</text>
      <text x={100} y={128} fontFamily={font} fontSize={11} fill={tv.textMuted}>FOREX · 1H</text>

      {/* BID */}
      <rect x={240} y={78} width={280} height={160} rx={8} fill="rgba(239,83,80,0.12)" stroke={tv.lineRed} strokeWidth={2} />
      <text x={380} y={108} textAnchor="middle" fontFamily={font} fontSize={13} fontWeight={700} fill={tv.textRed}>SELL / BID</text>
      <text x={380} y={160} textAnchor="middle" fontFamily={mono} fontSize={44} fontWeight={900} fill={tv.lineRed}>1.0845</text>
      <text x={380} y={185} textAnchor="middle" fontFamily={font} fontSize={11} fill={tv.textRed}>
        You sell at this price
      </text>
      <text x={380} y={200} textAnchor="middle" fontFamily={font} fontSize={10} fill={tv.textMuted}>
        Broker buys from you
      </text>
      <text x={380} y={218} textAnchor="middle" fontFamily={font} fontSize={10} fill={tv.textMuted}>
        (Always the LOWER price)
      </text>

      {/* SPREAD in middle */}
      <rect x={540} y={100} width={120} height={120} rx={8}
        fill="rgba(245,197,24,0.15)" stroke={tv.lineAmber} strokeWidth={2} />
      <text x={600} y={130} textAnchor="middle" fontFamily={font} fontSize={11} fontWeight={700} fill={tv.lineAmber}>SPREAD</text>
      <text x={600} y={168} textAnchor="middle" fontFamily={mono} fontSize={34} fontWeight={900} fill={tv.lineAmber}>2</text>
      <text x={600} y={190} textAnchor="middle" fontFamily={font} fontSize={13} fontWeight={700} fill={tv.lineAmber}>pips</text>
      <text x={600} y={208} textAnchor="middle" fontFamily={font} fontSize={9} fill={tv.textMuted}>{"broker's fee"}</text>

      {/* ASK */}
      <rect x={680} y={78} width={280} height={160} rx={8} fill="rgba(38,166,154,0.12)" stroke={tv.lineGreen} strokeWidth={2} />
      <text x={820} y={108} textAnchor="middle" fontFamily={font} fontSize={13} fontWeight={700} fill={tv.textGreen}>BUY / ASK</text>
      <text x={820} y={160} textAnchor="middle" fontFamily={mono} fontSize={44} fontWeight={900} fill={tv.lineGreen}>1.0847</text>
      <text x={820} y={185} textAnchor="middle" fontFamily={font} fontSize={11} fill={tv.textGreen}>
        You buy at this price
      </text>
      <text x={820} y={200} textAnchor="middle" fontFamily={font} fontSize={10} fill={tv.textMuted}>
        Broker sells to you
      </text>
      <text x={820} y={218} textAnchor="middle" fontFamily={font} fontSize={10} fill={tv.textMuted}>
        (Always the HIGHER price)
      </text>

      {/* ===== THREE RULE BOXES ===== */}
      {[
        {
          x: 60, color: tv.lineRed, bg: "rgba(239,83,80,0.08)",
          rule: "Rule 1 — When you BUY",
          text: "You pay the ASK price (1.0847). The moment you click buy, you start 2 pips in the hole because the market price is only 1.0845.",
        },
        {
          x: 460, color: tv.lineAmber, bg: "rgba(245,197,24,0.08)",
          rule: "Rule 2 — The Spread is the Fee",
          text: "The spread is how your broker earns money. A 2-pip spread on a £10,000 trade = £2. It happens on every single trade automatically.",
        },
        {
          x: 860, color: tv.lineGreen, bg: "rgba(38,166,154,0.08)",
          rule: "Rule 3 — When you SELL",
          text: "You receive the BID price (1.0845). To profit, price must move more than the spread in your favour first.",
        },
      ].map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={265} width={320} height={120} rx={8} fill={b.bg}
            stroke={b.color} strokeWidth={1.5} />
          <rect x={b.x} y={265} width={6} height={120} rx={3} fill={b.color} />
          <text x={b.x + 20} y={288} fontFamily={font} fontSize={12} fontWeight={700} fill={b.color}>{b.rule}</text>
          <foreignObject x={b.x + 16} y={296} width={294} height={80}>
            <div style={{ fontFamily: font, fontSize: '11px', color: '#d1d4dc', lineHeight: '1.6' }}>
              {b.text}
            </div>
          </foreignObject>
        </g>
      ))}

      {/* ===== CAR DEALER ANALOGY ===== */}
      <rect x={60} y={400} width={1080} height={80} rx={8}
        fill="rgba(245,197,24,0.08)" stroke="rgba(245,197,24,0.2)" strokeWidth={1} />
      <text x={100} y={424} fontFamily={font} fontSize={12} fontWeight={700} fill={tv.lineAmber}>
        🚗  REAL WORLD ANALOGY — Think of a Car Dealer:
      </text>
      <text x={100} y={446} fontFamily={font} fontSize={11} fill={tv.textWhite}>
        They buy your old car for £8,000 (BID) and sell you a car for £8,500 (ASK). The £500 gap is their profit (SPREAD).
      </text>
      <text x={100} y={466} fontFamily={font} fontSize={11} fill={tv.textWhite}>
        In forex, that gap is just 2–3 pips — but it happens on millions of trades every day. Choose a broker with low spreads!
      </text>

      {/* ===== SPREAD COMPARISON ===== */}
      <text x={60} y={512} fontFamily={font} fontSize={13} fontWeight={700} fill={tv.textWhite}>TYPICAL SPREADS BY PAIR</text>
      {[
        { pair: "EUR/USD", spread: "0.5–2 pips", quality: "Excellent", color: tv.lineGreen },
        { pair: "GBP/USD", spread: "1–3 pips",   quality: "Very good",  color: tv.lineGreen },
        { pair: "USD/JPY", spread: "0.5–2 pips", quality: "Excellent", color: tv.lineGreen },
        { pair: "EUR/TRY", spread: "40–80 pips", quality: "Expensive",  color: tv.lineRed },
      ].map((r, i) => (
        <g key={i}>
          <rect x={60 + i * 290} y={522} width={270} height={50} rx={5}
            fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <text x={80 + i * 290} y={543} fontFamily={mono} fontSize={14} fontWeight={700} fill={tv.textWhite}>{r.pair}</text>
          <text x={80 + i * 290} y={560} fontFamily={font} fontSize={11} fill={r.color}>{r.spread}  ·  {r.quality}</text>
        </g>
      ))}

      {/* Bottom tip */}
      <rect x={60} y={590} width={1080} height={32} rx={6}
        fill="rgba(38,166,154,0.12)" stroke="rgba(38,166,154,0.25)" strokeWidth={1} />
      <text x={W / 2} y={611} textAnchor="middle" fontFamily={font} fontSize={11} fontWeight={700} fill={tv.lineGreen}>
        BEGINNER RULE: Always check the spread before entering a trade. It must be less than 10% of your planned profit target.
      </text>
    </svg>
  );
};
