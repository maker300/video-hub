//+------------------------------------------------------------------+
//|                                                    FMTrader.mq5  |
//|            Forex Mastery — signal executor for MetaTrader 5       |
//+------------------------------------------------------------------+
//
//  WHAT THIS DOES
//  --------------
//  Polls your Forex Mastery account for new signals and places the
//  corresponding order on YOUR broker account, in YOUR terminal, using
//  YOUR risk settings. Forex Mastery publishes the signal; this EA (running
//  on your machine, under your control) is what executes it.
//
//  SETUP
//  -----
//  1. In MetaTrader 5:  Tools → Options → Expert Advisors
//       ✓ Allow WebRequest for listed URL
//       add:  https://forexmastery.org
//  2. Copy this file to:  MQL5/Experts/FMTrader.mq5
//  3. Open MetaEditor (F4), press F7 to compile.
//  4. Drag FMTrader onto ANY ONE chart. It handles all pairs internally —
//     you do NOT need one chart per pair.
//  5. Paste your API key (Profile → Auto-Execute → Generate key).
//  6. Make sure the "Algo Trading" button in the toolbar is green.
//
//  RISK
//  ----
//  This places real orders with real money. Start on a DEMO account.
//  Trading forex carries substantial risk of loss. Signals are educational
//  and are not financial advice. You are responsible for your account.
//+------------------------------------------------------------------+
#property copyright "Forex Mastery"
#property link      "https://forexmastery.org"
#property version   "1.00"
#property strict

#include <Trade\Trade.mqh>

//--- Inputs -------------------------------------------------------------
input string   InpApiKey            = "";                        // API key (fmk_...)
input string   InpApiHost           = "https://forexmastery.org";// Site URL
input int      InpPollSeconds       = 10;                        // Poll interval (seconds)
input bool     InpEnableTrading     = false;                     // Place real orders (off = log only)
input double   InpRiskPercent       = 0.0;                       // Risk % override (0 = use site setting)
input double   InpMaxSpreadPips     = 3.0;                       // Skip if spread wider than this
input int      InpSlippagePoints    = 20;                        // Max deviation (points)
input long     InpMagicNumber       = 770420;                    // Magic number for this EA
input string   InpSymbolSuffix      = "";                        // Broker suffix e.g. ".m" / "pro" (blank = auto)
input bool     InpBlockFridayLate   = true;                      // No new trades Fri after 20:00 server time

//--- Globals ------------------------------------------------------------
CTrade   trade;
datetime g_lastPoll     = 0;
string   g_status       = "starting";
int      g_filledCount  = 0;
int      g_skipCount    = 0;

//+------------------------------------------------------------------+
//| Minimal JSON field readers.                                      |
//| MQL5 has no JSON library. The API response shape is fixed and    |
//| flat, so targeted string extraction is sufficient and avoids     |
//| shipping a 2000-line parser with the EA.                         |
//+------------------------------------------------------------------+
string JsonStr(const string src, const string key)
  {
   string pat = "\"" + key + "\":\"";
   int p = StringFind(src, pat);
   if(p < 0) return "";
   p += StringLen(pat);
   int e = StringFind(src, "\"", p);
   if(e < 0) return "";
   return StringSubstr(src, p, e - p);
  }

double JsonNum(const string src, const string key, double fallback = 0.0)
  {
   string pat = "\"" + key + "\":";
   int p = StringFind(src, pat);
   if(p < 0) return fallback;
   p += StringLen(pat);
   // Read until the next delimiter.
   int e = p;
   while(e < StringLen(src))
     {
      ushort c = StringGetCharacter(src, e);
      if(c == ',' || c == '}' || c == ']') break;
      e++;
     }
   string raw = StringSubstr(src, p, e - p);
   StringTrimLeft(raw); StringTrimRight(raw);
   if(raw == "" || raw == "null") return fallback;
   return StringToDouble(raw);
  }

//+------------------------------------------------------------------+
//| Split the "signals":[ {...},{...} ] array into object strings.   |
//+------------------------------------------------------------------+
int SplitSignals(const string body, string &out[])
  {
   ArrayResize(out, 0);
   int arrStart = StringFind(body, "\"signals\":[");
   if(arrStart < 0) return 0;
   arrStart += StringLen("\"signals\":[");

   int depth = 0, objStart = -1, count = 0;
   for(int i = arrStart; i < StringLen(body); i++)
     {
      ushort c = StringGetCharacter(body, i);
      if(c == '{')
        {
         if(depth == 0) objStart = i;
         depth++;
        }
      else if(c == '}')
        {
         depth--;
         if(depth == 0 && objStart >= 0)
           {
            count++;
            ArrayResize(out, count);
            out[count - 1] = StringSubstr(body, objStart, i - objStart + 1);
            objStart = -1;
           }
        }
      else if(c == ']' && depth == 0) break;
     }
   return count;
  }

//+------------------------------------------------------------------+
//| HTTP helper. Returns status code, fills `response`.              |
//+------------------------------------------------------------------+
int HttpCall(const string method, const string url, const string payload, string &response)
  {
   char post[], result[];
   string resultHeaders;
   string headers = "Authorization: Bearer " + InpApiKey + "\r\n"
                    "Content-Type: application/json\r\n";

   if(payload != "")
      StringToCharArray(payload, post, 0, StringLen(payload), CP_UTF8);
   else
      ArrayResize(post, 0);

   ResetLastError();
   int code = WebRequest(method, url, headers, 8000, post, result, resultHeaders);

   if(code == -1)
     {
      int err = GetLastError();
      if(err == 4014)
         Print("FMTrader: WebRequest not allowed. Add ", InpApiHost,
               " under Tools > Options > Expert Advisors > Allow WebRequest.");
      else
         Print("FMTrader: WebRequest failed, error ", err);
      response = "";
      return -1;
     }

   response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
   return code;
  }

//+------------------------------------------------------------------+
//| Resolve a Forex Mastery slug (e.g. "eur-usd") to this broker's   |
//| symbol name. Brokers differ: EURUSD, EURUSD.m, EURUSDpro, etc.   |
//+------------------------------------------------------------------+
string BaseSymbolFromSlug(const string slug)
  {
   string s = slug;
   StringToUpper(s);
   StringReplace(s, "-", "");
   // Metals / energy / indices commonly use these tickers.
   if(s == "XAUUSD") return "XAUUSD";
   if(s == "XAGUSD") return "XAGUSD";
   if(s == "WTIUSD") return "USOIL";
   if(s == "BRENTUSD") return "UKOIL";
   if(s == "NAS100")  return "NAS100";
   if(s == "SP500")   return "US500";
   if(s == "DJ30")    return "US30";
   if(s == "GER40")   return "GER40";
   return s;
  }

bool ResolveSymbol(const string slug, string &resolved)
  {
   string base = BaseSymbolFromSlug(slug);

   // 1. Explicit user suffix wins.
   if(InpSymbolSuffix != "")
     {
      string withSuffix = base + InpSymbolSuffix;
      if(SymbolSelect(withSuffix, true)) { resolved = withSuffix; return true; }
     }

   // 2. Exact match.
   if(SymbolSelect(base, true)) { resolved = base; return true; }

   // 3. Common broker suffixes.
   string suffixes[] = {".m", ".a", ".raw", ".pro", ".ecn", "m", "pro", "_SB", ".cash", ".spot"};
   for(int i = 0; i < ArraySize(suffixes); i++)
     {
      string cand = base + suffixes[i];
      if(SymbolSelect(cand, true)) { resolved = cand; return true; }
     }

   // 4. Last resort: scan Market Watch for anything starting with base.
   int total = SymbolsTotal(false);
   for(int i = 0; i < total; i++)
     {
      string name = SymbolName(i, false);
      if(StringFind(name, base) == 0)
        {
         if(SymbolSelect(name, true)) { resolved = name; return true; }
        }
     }

   resolved = "";
   return false;
  }

//+------------------------------------------------------------------+
//| Position size from risk % and stop distance.                     |
//+------------------------------------------------------------------+
double CalcLots(const string sym, double entry, double sl, double riskPct)
  {
   double slDist = MathAbs(entry - sl);
   if(slDist <= 0) return 0.0;

   double tickValue = SymbolInfoDouble(sym, SYMBOL_TRADE_TICK_VALUE);
   double tickSize  = SymbolInfoDouble(sym, SYMBOL_TRADE_TICK_SIZE);
   if(tickValue <= 0 || tickSize <= 0) return 0.0;

   double equity     = AccountInfoDouble(ACCOUNT_EQUITY);
   double riskAmount = equity * (riskPct / 100.0);

   double lossPerLot = (slDist / tickSize) * tickValue;
   if(lossPerLot <= 0) return 0.0;

   double lots = riskAmount / lossPerLot;

   // Clamp to the broker's lot constraints.
   double minLot  = SymbolInfoDouble(sym, SYMBOL_VOLUME_MIN);
   double maxLot  = SymbolInfoDouble(sym, SYMBOL_VOLUME_MAX);
   double lotStep = SymbolInfoDouble(sym, SYMBOL_VOLUME_STEP);
   if(lotStep > 0) lots = MathFloor(lots / lotStep) * lotStep;
   if(lots < minLot) lots = 0.0;          // too small to place safely — skip
   if(lots > maxLot) lots = maxLot;

   return NormalizeDouble(lots, 2);
  }

//+------------------------------------------------------------------+
//| Report the outcome of a dispatch back to the site.               |
//+------------------------------------------------------------------+
void SendAck(const string dispatchId, const string status,
             const string ticket, double filledPrice, const string note)
  {
   string payload = StringFormat(
      "{\"dispatchId\":\"%s\",\"status\":\"%s\",\"brokerTicket\":\"%s\",\"filledPrice\":%s,\"note\":\"%s\"}",
      dispatchId, status, ticket,
      (filledPrice > 0 ? DoubleToString(filledPrice, 5) : "null"),
      note);

   string resp;
   HttpCall("POST", InpApiHost + "/api/fm-script/ack", payload, resp);
  }

//+------------------------------------------------------------------+
//| How many positions this EA currently holds.                      |
//+------------------------------------------------------------------+
int OpenPositionsByEA()
  {
   int n = 0;
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      ulong tk = PositionGetTicket(i);
      if(tk == 0) continue;
      if(PositionGetInteger(POSITION_MAGIC) == InpMagicNumber) n++;
     }
   return n;
  }

//+------------------------------------------------------------------+
//| Act on one signal object.                                        |
//+------------------------------------------------------------------+
void HandleSignal(const string obj, double siteRiskPct, int maxConcurrent)
  {
   string dispatchId = JsonStr(obj, "dispatchId");
   string slug       = JsonStr(obj, "slug");
   string display    = JsonStr(obj, "display");
   string decision   = JsonStr(obj, "decision");
   double entryLow   = JsonNum(obj, "entryLow");
   double entryHigh  = JsonNum(obj, "entryHigh");
   double stopLoss   = JsonNum(obj, "stopLoss");
   double tp1        = JsonNum(obj, "tp1");

   if(dispatchId == "" || slug == "" || (decision != "BUY" && decision != "SELL"))
     {
      Print("FMTrader: malformed signal, skipping.");
      return;
     }

   Print("FMTrader: signal ", decision, " ", display,
         "  entry ", entryLow, "-", entryHigh, "  SL ", stopLoss, "  TP1 ", tp1);

   // --- Guard rails ----------------------------------------------------
   if(OpenPositionsByEA() >= maxConcurrent)
     {
      g_skipCount++;
      SendAck(dispatchId, "skipped", "", 0, "max concurrent positions reached");
      return;
     }

   if(InpBlockFridayLate)
     {
      MqlDateTime dt; TimeToStruct(TimeCurrent(), dt);
      if(dt.day_of_week == 5 && dt.hour >= 20)
        {
         g_skipCount++;
         SendAck(dispatchId, "skipped", "", 0, "friday late session blocked");
         return;
        }
     }

   string sym;
   if(!ResolveSymbol(slug, sym))
     {
      g_skipCount++;
      Print("FMTrader: could not map ", slug, " to a broker symbol.");
      SendAck(dispatchId, "skipped", "", 0, "symbol not available at broker");
      return;
     }

   // Spread check — a signal is not worth taking through a 9-pip spread.
   double point  = SymbolInfoDouble(sym, SYMBOL_POINT);
   long   digits = SymbolInfoInteger(sym, SYMBOL_DIGITS);
   double pip    = (digits == 3 || digits == 5) ? point * 10 : point;
   double spread = (SymbolInfoDouble(sym, SYMBOL_ASK) - SymbolInfoDouble(sym, SYMBOL_BID));
   if(pip > 0 && (spread / pip) > InpMaxSpreadPips)
     {
      g_skipCount++;
      SendAck(dispatchId, "skipped", "", 0,
              StringFormat("spread %.1f pips exceeds limit", spread / pip));
      return;
     }

   bool   isBuy = (decision == "BUY");
   double price = isBuy ? SymbolInfoDouble(sym, SYMBOL_ASK)
                        : SymbolInfoDouble(sym, SYMBOL_BID);

   // Only enter while price is still at or inside the published zone. Chasing
   // a signal that has already run is how paper edge turns into real losses.
   double zoneLow  = MathMin(entryLow, entryHigh);
   double zoneHigh = MathMax(entryLow, entryHigh);
   double tolerance = pip * 2;                    // small grace for spread
   bool inZone = (price >= zoneLow - tolerance && price <= zoneHigh + tolerance);
   if(!inZone)
     {
      g_skipCount++;
      SendAck(dispatchId, "skipped", "", 0, "price outside entry zone");
      return;
     }

   // Sanity: stop must be on the correct side.
   if((isBuy && stopLoss >= price) || (!isBuy && stopLoss <= price))
     {
      g_skipCount++;
      SendAck(dispatchId, "skipped", "", 0, "stop loss on wrong side of price");
      return;
     }

   double riskPct = (InpRiskPercent > 0 ? InpRiskPercent : siteRiskPct);
   double lots    = CalcLots(sym, price, stopLoss, riskPct);
   if(lots <= 0)
     {
      g_skipCount++;
      SendAck(dispatchId, "skipped", "", 0, "calculated lot size below broker minimum");
      return;
     }

   if(!InpEnableTrading)
     {
      Print("FMTrader: DRY RUN — would ", decision, " ", lots, " ", sym,
            " SL ", stopLoss, " TP ", tp1);
      SendAck(dispatchId, "skipped", "", 0, "dry run (InpEnableTrading = false)");
      return;
     }

   // --- Place the order ------------------------------------------------
   trade.SetExpertMagicNumber(InpMagicNumber);
   trade.SetDeviationInPoints(InpSlippagePoints);
   trade.SetTypeFillingBySymbol(sym);

   double sl = NormalizeDouble(stopLoss, (int)digits);
   double tp = NormalizeDouble(tp1,      (int)digits);

   bool ok = isBuy ? trade.Buy(lots, sym, 0.0, sl, tp, "FM Trader")
                   : trade.Sell(lots, sym, 0.0, sl, tp, "FM Trader");

   if(ok && trade.ResultRetcode() == TRADE_RETCODE_DONE)
     {
      g_filledCount++;
      string ticket = IntegerToString((long)trade.ResultOrder());
      Print("FMTrader: FILLED ", decision, " ", lots, " ", sym,
            " @ ", trade.ResultPrice(), " ticket ", ticket);
      SendAck(dispatchId, "filled", ticket, trade.ResultPrice(), "");
     }
   else
     {
      string why = StringFormat("retcode %d: %s", trade.ResultRetcode(), trade.ResultRetcodeDescription());
      Print("FMTrader: order REJECTED — ", why);
      SendAck(dispatchId, "rejected", "", 0, why);
     }
  }

//+------------------------------------------------------------------+
//| Report account equity so a funded-account evaluation can track    |
//| progress. Harmless if you have no evaluation running — the server |
//| replies "not tracked" and nothing happens.                        |
//+------------------------------------------------------------------+
void ReportEquity()
  {
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   string payload = StringFormat("{\"equity\":%s,\"balance\":%s}",
                                 DoubleToString(equity, 2),
                                 DoubleToString(balance, 2));
   string resp;
   HttpCall("POST", InpApiHost + "/api/fm-script/equity", payload, resp);
  }

//+------------------------------------------------------------------+
//| Poll the site for new signals.                                   |
//+------------------------------------------------------------------+
void Poll()
  {
   string resp;
   int code = HttpCall("GET", InpApiHost + "/api/fm-script/signals", "", resp);

   if(code == 401) { g_status = "bad API key";            return; }
   if(code == -1)  { g_status = "connection blocked";     return; }
   if(code != 200) { g_status = "HTTP " + IntegerToString(code); return; }

   string paused = JsonStr(resp, "paused");
   if(paused != "")
     {
      g_status = "paused: " + paused;
      return;
     }

   double siteRisk   = JsonNum(resp, "maxRiskPct", 1.0);
   int    maxConc    = (int)JsonNum(resp, "maxConcurrent", 3);

   string objs[];
   int n = SplitSignals(resp, objs);
   g_status = (n > 0) ? StringFormat("processing %d signal(s)", n) : "live — waiting for signals";

   for(int i = 0; i < n; i++)
      HandleSignal(objs[i], siteRisk, maxConc);
  }

//+------------------------------------------------------------------+
//| Chart status readout.                                            |
//+------------------------------------------------------------------+
void DrawStatus()
  {
   string txt = StringFormat(
      "Forex Mastery — Auto Execute\n"
      "Status: %s\n"
      "Mode: %s\n"
      "Filled: %d   Skipped: %d   Open: %d\n"
      "Last poll: %s",
      g_status,
      (InpEnableTrading ? "LIVE TRADING" : "DRY RUN (no orders)"),
      g_filledCount, g_skipCount, OpenPositionsByEA(),
      (g_lastPoll > 0 ? TimeToString(g_lastPoll, TIME_SECONDS) : "-"));
   Comment(txt);
  }

//+------------------------------------------------------------------+
int OnInit()
  {
   if(StringLen(InpApiKey) < 8 || StringFind(InpApiKey, "fmk_") != 0)
     {
      Print("FMTrader: set InpApiKey to your key from Profile > Auto-Execute. It starts with fmk_");
      Comment("Forex Mastery — missing/invalid API key");
      return INIT_FAILED;
     }

   int secs = MathMax(5, InpPollSeconds);
   EventSetTimer(secs);

   Print("FMTrader initialised. Polling ", InpApiHost, " every ", secs, "s. ",
         (InpEnableTrading ? "LIVE TRADING ENABLED." : "DRY RUN — no orders will be placed."));
   g_status = "initialised";
   DrawStatus();
   return INIT_SUCCEEDED;
  }

void OnDeinit(const int reason)
  {
   EventKillTimer();
   Comment("");
  }

void OnTimer()
  {
   g_lastPoll = TimeCurrent();
   Poll();

   // Equity heartbeat once a minute — enough resolution for drawdown
   // rules without adding a request to every signal poll.
   static datetime lastEquity = 0;
   if(TimeCurrent() - lastEquity >= 60)
     {
      lastEquity = TimeCurrent();
      ReportEquity();
     }

   DrawStatus();
  }

void OnTick()
  {
   // Execution is timer-driven; OnTick only refreshes the readout so the
   // panel stays current on active charts.
   static datetime lastDraw = 0;
   if(TimeCurrent() != lastDraw) { lastDraw = TimeCurrent(); DrawStatus(); }
  }
//+------------------------------------------------------------------+
