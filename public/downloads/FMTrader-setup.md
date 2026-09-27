# FM Trader Auto-Execute — MetaTrader 5 setup

**Read this first.** This Expert Advisor places **real orders with real money** on your
own broker account. Forex Mastery publishes signals; your MetaTrader terminal, running
on your machine under your control, is what executes them. You are responsible for every
trade your terminal places. Signals are educational and are not financial advice.

**Start on a demo account.** Run it for at least a week before considering live money.

---

## What you need

- MetaTrader 5 (MT4 support is coming — this guide is MT5)
- A broker account (demo or live)
- Your Forex Mastery API key — Profile → Auto-Execute → **Generate key**
- Tokens in your account — each signal delivered to your EA costs 1 token

---

## Step 1 — Allow the EA to reach our server

MetaTrader blocks all outbound web requests by default.

1. In MT5: **Tools → Options → Expert Advisors**
2. Tick **Allow WebRequest for listed URL**
3. Add this exact URL:
   ```
   https://forexmastery.org
   ```
4. Click **OK**

If you skip this, the EA logs `WebRequest not allowed` and never trades.

---

## Step 2 — Install the EA

1. In MT5: **File → Open Data Folder**
2. Navigate to `MQL5` → `Experts`
3. Copy `FMTrader.mq5` into that folder
4. Back in MT5, press **F4** to open MetaEditor
5. Find `FMTrader.mq5` in the Navigator, open it, press **F7** to compile
6. You should see `0 errors, 0 warnings`

---

## Step 3 — Attach it to a chart

1. In MT5, open **any single chart** (EUR/USD is fine)
2. In the Navigator panel (Ctrl+N) → **Expert Advisors** → drag **FMTrader** onto that chart

> **You do not need one chart per pair.** The EA handles every instrument from
> that one chart. Adding it to several charts will cause duplicate orders.

3. In the dialog that opens, go to the **Inputs** tab and set:

| Input | Set it to |
|---|---|
| `InpApiKey` | Your key from Profile (starts with `fmk_`) |
| `InpApiHost` | `https://forexmastery.org` |
| `InpEnableTrading` | **`false`** for your first run — see Step 4 |
| `InpRiskPercent` | `0` to use the risk % from your profile |
| `InpMaxSpreadPips` | `3.0` is a sensible default |
| `InpSymbolSuffix` | Usually blank — see *Symbol names* below |

4. Click **OK**
5. Make sure the **Algo Trading** button in the toolbar is **green**

You should see a status panel in the top-left of the chart.

---

## Step 4 — Dry run first

Leave `InpEnableTrading = false` for the first day.

In this mode the EA does everything except place the order — it polls for signals,
resolves your broker's symbol names, calculates the lot size, and logs exactly what it
*would* have done. Check the **Experts** tab at the bottom of MT5 to read the log.

Once you can see it correctly finding signals and sizing trades, change
`InpEnableTrading` to `true` (right-click chart → Expert Advisors → Properties).

---

## Symbol names

Brokers name the same instrument differently — `EURUSD`, `EURUSD.m`, `EURUSDpro`,
`EURUSD_SB`. The EA tries the plain name first, then a list of common suffixes, then
scans your Market Watch for a match.

If the log says `could not map eur-usd to a broker symbol`:

1. Open **Market Watch** (Ctrl+M), right-click → **Show All**
2. Find how your broker writes EUR/USD
3. Put the suffix (the part after `EURUSD`) into `InpSymbolSuffix`

---

## Settings that matter

Set these in **Profile → Auto-Execute** on the website — the EA reads them each poll:

- **Risk per trade (%)** — percentage of account equity risked per position. Capped at 5%.
  1% is a normal starting point. The EA sizes the lot from this and the stop distance.
- **Max open trades** — the EA will not open more than this many positions at once.
- **Min confidence** — signals below this score are ignored. 70+ is a reasonable filter.
- **Kill switch** — stops signal delivery immediately without deleting your key.

---

## When the EA will skip a signal

All of these are logged and reported back to your profile page:

| Reason | What it means |
|---|---|
| `price outside entry zone` | The move already ran; chasing it is worse than missing it |
| `spread X pips exceeds limit` | Spread too wide to take the trade profitably |
| `max concurrent positions reached` | Your own cap was hit |
| `friday late session blocked` | Weekend gap protection (disable with `InpBlockFridayLate`) |
| `symbol not available at broker` | Your broker doesn't offer that instrument |
| `calculated lot size below broker minimum` | Your account is too small for that stop distance at your risk % |
| `no tokens` | Top up your token balance |

---

## Run it on a VPS

MetaTrader has to stay running and connected to catch signals. A home laptop sleeps,
restarts for updates, and drops wifi — every one of those is a missed trade or an
order that never got its stop attached.

A forex VPS is an always-on cloud machine, typically **£5–15/month**, usually located
close to broker servers so execution is faster too. Common options: Beeks Financial
Cloud, ForexVPS.net, Contabo, Vultr.

This is strongly recommended if you're running live.

---

## Troubleshooting

**"WebRequest not allowed"** — Step 1 wasn't done, or the URL doesn't match exactly.

**"bad API key"** — The key was rotated or revoked. Generate a new one and update the input.

**Panel says "paused: auto_trade_disabled"** — Turn on the Auto-execute toggle in your profile.

**Panel says "paused: no_tokens"** — Your balance is empty.

**Nothing happens for hours** — Normal. Signals only fire when the scanner finds a
qualifying setup. Check your Min confidence isn't set too high.

**Orders rejected with retcode 10027** — Algo Trading button isn't green.

---

## Disclaimer

Forex Mastery is an educational platform. Signals, analysis, and this software are
provided for learning purposes and do not constitute financial, investment, or trading
advice. Trading foreign exchange carries substantial risk of loss and is not suitable
for all investors. Past performance does not indicate future results. You execute all
trades on your own account, at your own risk, under your own control.
