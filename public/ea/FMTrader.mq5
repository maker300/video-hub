//+------------------------------------------------------------------+
//| FM Trader EA v1.0 (MT5)                                           |
//| Polls for admin-approved trades and executes them via OrderSend   |
//|                                                                    |
//| SETUP:                                                             |
//| 1. Tools → Options → Expert Advisors → Allow WebRequests          |
//|    Add your Vercel URL (e.g. https://yoursite.vercel.app)          |
//| 2. Attach to any chart (currency pair doesn't matter)              |
//| 3. Set ApiBaseUrl and EaApiKey in the EA inputs                    |
//| 4. Enable AutoTrading (green button in toolbar)                    |
//+------------------------------------------------------------------+
#property copyright "FM Trader"
#property version   "1.00"

input string ApiBaseUrl  = "https://your-site.vercel.app"; // Your Vercel URL — no trailing slash
input string EaApiKey    = "";                              // EA_API_KEY from Vercel env vars
input int    PollSeconds = 5;                               // How often to check for trades
input ulong  MagicNumber = 20250101;                        // Unique identifier for EA orders
input int    Slippage    = 10;                              // Max slippage in points

datetime g_lastPoll  = 0;
bool     g_executing = false;

//——————————————————————————————————————————————————————————————————
int OnInit() {
   if (ApiBaseUrl == "https://your-site.vercel.app") {
      Alert("FM Trader EA: Please set ApiBaseUrl to your Vercel site URL.");
      return INIT_FAILED;
   }
   if (EaApiKey == "") {
      Alert("FM Trader EA: Please set EaApiKey from your Vercel environment variables.");
      return INIT_FAILED;
   }
   EventSetTimer(1);
   Print("FM Trader EA started | Polling: ", ApiBaseUrl, " every ", PollSeconds, "s");
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {
   EventKillTimer();
   Print("FM Trader EA stopped (reason=", reason, ")");
}

void OnTick() {} // Required but unused — we use OnTimer for polling

//——————————————————————————————————————————————————————————————————
void OnTimer() {
   if (g_executing) return;
   if (TimeCurrent() - g_lastPoll < PollSeconds) return;
   g_lastPoll = TimeCurrent();
   CheckAndExecute();
}

//——————————————————————————————————————————————————————————————————
void CheckAndExecute() {
   string url     = ApiBaseUrl + "/api/broker/pending";
   string headers = "x-ea-key: " + EaApiKey + "\r\n";
   char   post[];
   char   resp[];
   string respHeaders;

   ResetLastError();
   int code = WebRequest("GET", url, headers, 5000, post, resp, respHeaders);

   if (code == 204) return; // Nothing pending — normal
   if (code != 200) {
      int err = GetLastError();
      if (err == 5203)
         Print("FM Trader: URL not whitelisted — add ", ApiBaseUrl, " in Tools → Options → Expert Advisors");
      else if (err != 0)
         Print("FM Trader: WebRequest error ", err);
      return;
   }

   string body = CharArrayToString(resp);
   if (StringFind(body, "\"id\"") < 0) return;

   // Parse trade fields from JSON response
   string tradeId = JStr(body, "id");
   string symbol  = JStr(body, "symbol");
   string type    = JStr(body, "type");
   double lots    = StringToDouble(JNum(body, "lots"));
   double sl      = StringToDouble(JNum(body, "sl"));
   double tp      = StringToDouble(JNum(body, "tp"));

   if (tradeId == "" || symbol == "" || lots <= 0) {
      Print("FM Trader: malformed trade payload — ", body);
      return;
   }

   g_executing = true;
   Print("FM Trader: executing ", type, " ", symbol,
         " lots=", DoubleToString(lots, 2),
         " sl=", DoubleToString(sl, 5),
         " tp=", DoubleToString(tp, 5));

   // Select order type
   ENUM_ORDER_TYPE orderType = (type == "BUY") ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;

   // Get current price
   MqlTick tick;
   if (!SymbolInfoTick(symbol, tick)) {
      Print("FM Trader: SymbolInfoTick failed for ", symbol);
      Confirm(tradeId, "-1", 0);
      g_executing = false;
      return;
   }
   double price  = (orderType == ORDER_TYPE_BUY) ? tick.ask : tick.bid;
   int    digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);

   // Fill the trade request
   MqlTradeRequest request = {};
   MqlTradeResult  result  = {};

   request.action    = TRADE_ACTION_DEAL;
   request.symbol    = symbol;
   request.volume    = lots;
   request.type      = orderType;
   request.price     = NormalizeDouble(price, digits);
   request.sl        = NormalizeDouble(sl, digits);
   request.tp        = NormalizeDouble(tp, digits);
   request.deviation = Slippage;
   request.magic     = MagicNumber;
   request.comment   = "FM Trader";
   request.type_filling = ORDER_FILLING_FOK;

   bool sent = OrderSend(request, result);

   if (!sent || result.retcode != TRADE_RETCODE_DONE) {
      Print("FM Trader: OrderSend failed, retcode=", result.retcode,
            " comment=", result.comment, " trade=", tradeId);
      Confirm(tradeId, "-1", 0);
   } else {
      Print("FM Trader: OrderSend success, order=", result.order,
            " deal=", result.deal,
            " fill=", DoubleToString(result.price, digits));
      Confirm(tradeId, IntegerToString((int)result.order), result.price);
   }

   g_executing = false;
}

//——————————————————————————————————————————————————————————————————
void Confirm(string tradeId, string orderId, double fillPrice) {
   string url  = ApiBaseUrl + "/api/broker/confirm";
   string body = "{\"tradeId\":\"" + tradeId + "\","
               + "\"orderId\":\""  + orderId + "\","
               + "\"fillPrice\":"  + DoubleToString(fillPrice, 5) + "}";
   char   post[];
   char   resp[];
   StringToCharArray(body, post, 0, StringLen(body));
   string reqHeaders = "Content-Type: application/json\r\nx-ea-key: " + EaApiKey + "\r\n";
   string respHeaders;

   int code = WebRequest("POST", url, reqHeaders, 5000, post, resp, respHeaders);
   if (code != 200)
      Print("FM Trader: confirm request failed, code=", code);
}

//——————————————————————————————————————————————————————————————————
// Extracts "key":"VALUE" string from JSON
string JStr(string src, string key) {
   string needle = "\"" + key + "\":\"";
   int p1 = StringFind(src, needle);
   if (p1 < 0) return "";
   p1 += StringLen(needle);
   int p2 = StringFind(src, "\"", p1);
   if (p2 < 0) return "";
   return StringSubstr(src, p1, p2 - p1);
}

// Extracts "key":NUMBER from JSON
string JNum(string src, string key) {
   string needle = "\"" + key + "\":";
   int p1 = StringFind(src, needle);
   if (p1 < 0) return "0";
   p1 += StringLen(needle);
   string rem = StringSubstr(src, p1);
   int end = StringLen(rem);
   for (int i = 0; i < StringLen(rem); i++) {
      ushort ch = StringGetCharacter(rem, i);
      if (ch == ',' || ch == '}' || ch == ' ' || ch == '\n') { end = i; break; }
   }
   return StringSubstr(rem, 0, end);
}
