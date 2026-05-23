import type { Module, Lesson } from '@/types'

export const courseModules: Module[] = [
  {
    id: 'module-1',
    moduleNumber: 1,
    title: 'Foundations of Forex Trading',
    description: 'Understand what forex is, how the market works, and who the key players are.',
    lessons: [
      {
        id: 'lesson-1-1',
        moduleId: 'module-1',
        lessonNumber: 1,
        title: 'What is the Forex Market?',
        description: 'An introduction to the world\'s largest financial market.',
        duration: 12,
        videoTitle: 'Introduction to Forex',
        content: `<img src="/images/lessons/what-is-forex.png" alt="The Forex Market — world map showing trading sessions" style="width:100%;border-radius:8px;margin-bottom:20px;" />
<h2>What is the Forex Market?</h2>
<p>Imagine you're going on holiday to America. You take your British pounds to the airport and swap them for US dollars. That swap is forex! <strong>Forex (foreign exchange)</strong> just means exchanging one country's money for another country's money.</p>
<p>Now imagine millions of people, banks, and companies doing that every single second, 24 hours a day. That's the forex market — and it's the <strong>biggest financial market in the entire world</strong>, with <strong>$7.5 trillion traded every single day</strong>.</p>

<div style="background:rgba(245,197,24,0.1);border-left:4px solid #f5c518;padding:14px 18px;border-radius:6px;margin:18px 0;">
  <strong style="color:#f5c518;">🚗 Real World Analogy</strong><br/>
  Think of forex like a giant global car boot sale, except instead of swapping old toys, countries are swapping currencies. When Britain needs euros to pay a French company, that's a forex trade. When a hedge fund bets the pound will fall, that's a forex trade too.
</div>

<h3>3 Things That Make Forex Special</h3>
<ul>
  <li><strong>Open 24 hours, 5 days a week</strong> — There's always a market open somewhere in the world (London, New York, Tokyo, Sydney). You can trade at 3am if you want!</li>
  <li><strong>No central building or exchange</strong> — Unlike the London Stock Exchange, forex has no headquarters. It's all done electronically between banks and brokers around the globe.</li>
  <li><strong>You can profit when prices go UP or DOWN</strong> — Unlike buying shares (where you only win if the price rises), in forex you can "go short" and profit when a currency falls.</li>
</ul>

<h3>Who Actually Trades Forex?</h3>
<ul>
  <li><strong>Big banks</strong> (like Barclays, JPMorgan) — trade billions per day for clients and themselves</li>
  <li><strong>Governments & central banks</strong> — control their country's currency value</li>
  <li><strong>Hedge funds</strong> — speculate for huge profits</li>
  <li><strong>Businesses</strong> — a UK company buying products from Japan needs to buy yen</li>
  <li><strong>You!</strong> — retail traders (everyday people) now have access through online brokers</li>
</ul>

<div style="background:rgba(239,83,80,0.1);border-left:4px solid #ef5350;padding:14px 18px;border-radius:6px;margin:18px 0;">
  <strong style="color:#ef5350;">⚠ Caution</strong><br/>
  Forex is a real business, not a get-rich-quick scheme. The majority of new traders lose money because they skip education and risk management. Finish this entire course before risking real money.
</div>

<h3>Key Terms to Remember</h3>
<ul>
  <li><strong>Forex / FX</strong> — Foreign Exchange (swapping currencies)</li>
  <li><strong>OTC (Over-The-Counter)</strong> — trades happen directly between parties, not on a central exchange</li>
  <li><strong>Liquidity</strong> — how easy it is to buy or sell. Forex is extremely liquid — you can always find a buyer or seller</li>
  <li><strong>Volatility</strong> — how much the price moves. More movement = more opportunity AND more risk</li>
</ul>`,
        quiz: {
          questions: [
            {
              id: 'q1-1-1',
              question: 'What is the approximate daily trading volume of the forex market?',
              options: ['$1 trillion', '$3.5 trillion', '$7.5 trillion', '$15 trillion'],
              correctAnswer: 2,
              explanation: 'The forex market has a daily trading volume exceeding $7.5 trillion, making it the world\'s largest financial market.',
            },
            {
              id: 'q1-1-2',
              question: 'How many days per week is the forex market open?',
              options: ['3 days', '5 days', '6 days', '7 days'],
              correctAnswer: 1,
              explanation: 'The forex market operates 24 hours a day, 5 days a week (Monday to Friday), covering trading sessions in Asia, Europe, and North America.',
            },
            {
              id: 'q1-1-3',
              question: 'Which of the following is NOT a participant in the forex market?',
              options: ['Central banks', 'Hedge funds', 'Stock exchanges', 'Commercial banks'],
              correctAnswer: 2,
              explanation: 'Stock exchanges are not direct participants in the forex market. Forex is an OTC market with no centralized exchange.',
            },
          ],
        },
      },
      {
        id: 'lesson-1-2',
        moduleId: 'module-1',
        lessonNumber: 2,
        title: 'Forex Market Sessions',
        description: 'Learn about the four major trading sessions and their characteristics.',
        duration: 15,
        videoTitle: 'Trading Sessions Explained',
        content: `<img src="/images/lessons/trading-sessions.png" alt="Forex Trading Sessions — 24-hour world clock" style="width:100%;border-radius:8px;margin-bottom:20px;" />
<h2>Forex Market Sessions — When to Trade</h2>
<p>Because the earth is round and the sun is always shining somewhere, forex is open around the clock. As one country goes to sleep, another wakes up and opens for business. This creates four main trading sessions.</p>

<div style="background:rgba(245,197,24,0.1);border-left:4px solid #f5c518;padding:14px 18px;border-radius:6px;margin:18px 0;">
  <strong style="color:#f5c518;">🌍 Think of it like a relay race</strong><br/>
  Sydney passes the baton to Tokyo, Tokyo passes to London, London passes to New York — and then it starts again. The forex market never stops Mon–Fri.
</div>

<h3>The Four Sessions (all times in GMT)</h3>
<ul>
  <li><strong>🇦🇺 Sydney Session — 22:00 to 07:00</strong><br/>Quiet start to the week. Low volume. Good for AUD/USD and NZD/USD pairs.</li>
  <li><strong>🇯🇵 Tokyo Session — 00:00 to 09:00</strong><br/>Asian markets come alive. USD/JPY and EUR/JPY move most here. Moderate volume.</li>
  <li><strong>🇬🇧 London Session — 08:00 to 17:00</strong><br/>The busiest session — London is the world's biggest forex centre. EUR/USD and GBP/USD are most active. Tightest spreads.</li>
  <li><strong>🇺🇸 New York Session — 13:00 to 22:00</strong><br/>Second busiest. All USD pairs move aggressively especially when US economic data is released.</li>
</ul>

<h3>The Magic Hours — Session Overlaps</h3>
<p>When two sessions are open at the same time, volume doubles and price moves become bigger. These are the best times for most traders:</p>
<ul>
  <li><strong>08:00–09:00 GMT (Tokyo + London open)</strong> — EUR/JPY often spikes. Watch for news.</li>
  <li><strong>13:00–17:00 GMT (London + New York overlap)</strong> — 🏆 <strong>The best time to trade.</strong> Highest volume. Tightest spreads. Most predictable moves.</li>
</ul>

<h3>When NOT to Trade</h3>
<ul>
  <li><strong>22:00–07:00 GMT</strong> — Low volume, wide spreads, unpredictable moves. Beginners should avoid this window.</li>
  <li><strong>Friday afternoon after 18:00 GMT</strong> — Traders close positions before the weekend. Spreads widen.</li>
  <li><strong>Major public holidays</strong> — Christmas Day, New Year's Day etc. Markets are almost dead.</li>
</ul>

<div style="background:rgba(38,166,154,0.1);border-left:4px solid #26a69a;padding:14px 18px;border-radius:6px;margin:18px 0;">
  <strong style="color:#26a69a;">✅ Beginner Rule</strong><br/>
  Trade only during the London session (08:00–17:00 GMT) or the London/New York overlap (13:00–17:00 GMT). This is when EUR/USD has the tightest spreads and cleanest moves.
</div>`,
        quiz: {
          questions: [
            {
              id: 'q1-2-1',
              question: 'Which trading session accounts for the highest daily volume?',
              options: ['Sydney', 'Tokyo', 'London', 'New York'],
              correctAnswer: 2,
              explanation: 'The London session accounts for approximately 34% of daily forex trading volume, making it the most active session.',
            },
            {
              id: 'q1-2-2',
              question: 'When does the London-New York overlap occur (GMT)?',
              options: ['8 AM – 9 AM', '1 PM – 5 PM', '5 PM – 8 PM', '10 PM – 12 AM'],
              correctAnswer: 1,
              explanation: 'The London-New York overlap occurs from 1 PM to 5 PM GMT and represents the highest volume period of the trading day.',
            },
            {
              id: 'q1-2-3',
              question: 'Which currency pair is most influenced by the Asian trading session?',
              options: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/NZD'],
              correctAnswer: 2,
              explanation: 'USD/JPY sees significant movement during Asian hours, particularly the Tokyo session, due to Japanese economic news and institutional activity.',
            },
          ],
        },
      },
      {
        id: 'lesson-1-3',
        moduleId: 'module-1',
        lessonNumber: 3,
        title: 'How Forex Trading Works',
        description: 'Understand pips, lots, spreads, and the mechanics of placing trades.',
        duration: 18,
        videoTitle: 'Forex Trading Mechanics',
        content: `<img src="/images/lessons/pips-and-lots.png" alt="Pips and Lots — units of forex trading" style="width:100%;border-radius:8px;margin-bottom:20px;" />
<h2>How Forex Trading Works</h2>
<p>To trade forex you need to understand three things: <strong>pips</strong> (how price moves are measured), <strong>lots</strong> (how much you're buying), and <strong>spread</strong> (the cost of every trade). Let's break each one down in plain English.</p>

<h3>What is a Pip?</h3>
<p>A <strong>pip</strong> is the smallest normal price movement in a currency pair. Look at EUR/USD moving from 1.0847 to 1.0848 — that tiny jump of 0.0001 is exactly <strong>1 pip</strong>.</p>
<ul>
  <li>Most pairs: 1 pip = 0.0001 (4th decimal place)</li>
  <li>JPY pairs (e.g. USD/JPY): 1 pip = 0.01 (2nd decimal place)</li>
</ul>

<div style="background:rgba(245,197,24,0.1);border-left:4px solid #f5c518;padding:14px 18px;border-radius:6px;margin:18px 0;">
  <strong style="color:#f5c518;">📏 Think of a pip like a centimetre on a ruler</strong><br/>
  It's the standard unit of measurement. When someone says "the pound moved 80 pips today" they mean GBP/USD changed by 0.0080.
</div>

<h3>What is a Lot?</h3>
<p>A <strong>lot</strong> is the size of your trade — how many currency units you're buying or selling. Bigger lot = bigger profit AND bigger loss per pip.</p>
<ul>
  <li><strong>Standard Lot</strong> — 100,000 units — each pip = $10 — for professionals only</li>
  <li><strong>Mini Lot</strong> — 10,000 units — each pip = $1 — for intermediate traders</li>
  <li><strong>Micro Lot (0.01)</strong> — 1,000 units — each pip = $0.10 — <strong>perfect for beginners</strong></li>
</ul>

<h3>Worked Example</h3>
<p>EUR/USD moves 30 pips in your favour. You traded a micro lot (0.01):</p>
<p style="background:rgba(38,166,154,0.1);padding:10px 16px;border-radius:6px;font-family:monospace;"><strong style="color:#26a69a;">Profit = 30 pips × $0.10 = $3.00</strong></p>
<p>That might sound small — but on a £500 practice account it's the right size to learn with real-feeling risk.</p>

<div style="background:rgba(38,166,154,0.1);border-left:4px solid #26a69a;padding:14px 18px;border-radius:6px;margin:18px 0;">
  <strong style="color:#26a69a;">✅ Beginner Rule</strong><br/>
  Always start with micro lots (0.01) on demo and your first live account. Never trade standard lots until you have at least 6 months of consistent profitability.
</div>`,
        quiz: {
          questions: [
            {
              id: 'q1-3-1',
              question: 'How many units does a standard lot represent?',
              options: ['1,000', '10,000', '100,000', '1,000,000'],
              correctAnswer: 2,
              explanation: 'A standard lot represents 100,000 units of the base currency.',
            },
            {
              id: 'q1-3-2',
              question: 'What does "spread" refer to in forex trading?',
              options: [
                'The total profit on a trade',
                'The difference between bid and ask price',
                'The leverage ratio used',
                'The number of pips moved',
              ],
              correctAnswer: 1,
              explanation: 'The spread is the difference between the bid (sell) and ask (buy) price — it represents the broker\'s transaction cost.',
            },
            {
              id: 'q1-3-3',
              question: 'For EUR/USD, which decimal place does a pip represent?',
              options: ['Second (0.01)', 'Third (0.001)', 'Fourth (0.0001)', 'Fifth (0.00001)'],
              correctAnswer: 2,
              explanation: 'For most currency pairs like EUR/USD, a pip is represented by the fourth decimal place (0.0001).',
            },
          ],
        },
      },
      {
        id: 'lesson-1-4',
        moduleId: 'module-1',
        lessonNumber: 4,
        title: 'Choosing a Forex Broker',
        description: 'Learn what to look for when selecting a regulated and reliable broker.',
        duration: 14,
        videoTitle: 'Broker Selection Guide',
        content: `<h2>Choosing a Forex Broker</h2>
<p>Selecting the right broker is one of the most important decisions you'll make as a forex trader. A reliable broker provides the infrastructure for all your trades.</p>
<h3>Key Factors to Consider</h3>
<h4>Regulation</h4>
<p>Always choose a regulated broker. Top regulatory bodies include:</p>
<ul>
  <li>FCA (UK Financial Conduct Authority)</li>
  <li>CFTC/NFA (United States)</li>
  <li>ASIC (Australia)</li>
  <li>CySEC (Cyprus/EU)</li>
</ul>
<h4>Trading Costs</h4>
<p>Compare spreads and commissions across brokers. Low spreads on major pairs can save significant money over time.</p>
<h4>Platform</h4>
<p>MetaTrader 4 (MT4) and MetaTrader 5 (MT5) are industry standards. Ensure the platform supports your trading style and tools.</p>
<h4>Execution Speed</h4>
<p>Fast execution is critical, especially for scalping strategies. Look for brokers offering ECN/STP execution models.</p>
<h3>Red Flags to Avoid</h3>
<ul>
  <li>Unregulated or offshore brokers with no oversight</li>
  <li>Guaranteed profit claims</li>
  <li>Withdrawal difficulties or hidden fees</li>
</ul>`,
        quiz: {
          questions: [
            {
              id: 'q1-4-1',
              question: 'Which regulatory body oversees forex brokers in the United Kingdom?',
              options: ['CFTC', 'ASIC', 'FCA', 'CySEC'],
              correctAnswer: 2,
              explanation: 'The FCA (Financial Conduct Authority) regulates financial services firms operating in the United Kingdom.',
            },
            {
              id: 'q1-4-2',
              question: 'What is the most widely used trading platform in forex?',
              options: ['TradingView', 'MetaTrader 4/5', 'cTrader', 'NinjaTrader'],
              correctAnswer: 1,
              explanation: 'MetaTrader 4 and MetaTrader 5 are the industry standard platforms used by the majority of forex brokers and traders worldwide.',
            },
            {
              id: 'q1-4-3',
              question: 'Which of the following is a red flag when choosing a broker?',
              options: [
                'FCA regulation',
                'Tight spreads on major pairs',
                'Guaranteed profit promises',
                'Fast order execution',
              ],
              correctAnswer: 2,
              explanation: 'No legitimate broker can guarantee profits. Such claims are a major red flag indicating a potentially fraudulent operation.',
            },
          ],
        },
      },
      {
        id: 'lesson-1-5',
        moduleId: 'module-1',
        lessonNumber: 5,
        title: 'Setting Up Your Trading Account',
        description: 'A practical walkthrough of account types, deposit methods, and demo trading.',
        duration: 11,
        videoTitle: 'Account Setup Walkthrough',
        content: `<h2>Setting Up Your Trading Account</h2>
<p>Before risking real money, it's essential to understand the different account types and start with a demo account to practice your skills.</p>
<h3>Account Types</h3>
<ul>
  <li><strong>Demo Account:</strong> Virtual money, real market conditions. Perfect for learning without risk.</li>
  <li><strong>Standard Account:</strong> Full-size trading with standard lots. Requires larger capital.</li>
  <li><strong>Mini Account:</strong> Trades mini lots; lower minimum deposit requirements.</li>
  <li><strong>Micro Account:</strong> Ideal for beginners; trades micro lots with minimal capital.</li>
  <li><strong>ECN Account:</strong> Direct market access, tighter spreads, commission-based.</li>
</ul>
<h3>Starting with Demo Trading</h3>
<p>Demo trading is critical for beginners. Use it to:</p>
<ul>
  <li>Learn the trading platform without financial risk</li>
  <li>Test trading strategies before using real money</li>
  <li>Understand order types and position management</li>
  <li>Build discipline and emotional control</li>
</ul>
<h3>When to Go Live</h3>
<p>Transition to a live account only when you've been consistently profitable on demo for at least 3 months. Start small — a micro account with $100–$500 is a sensible starting point.</p>`,
        quiz: {
          questions: [
            {
              id: 'q1-5-1',
              question: 'What is the primary advantage of a demo account?',
              options: [
                'Higher leverage than live accounts',
                'Practice with virtual money in real market conditions',
                'Lower spreads than live accounts',
                'Access to exclusive trading signals',
              ],
              correctAnswer: 1,
              explanation: 'Demo accounts allow you to practice trading with virtual money while experiencing real market conditions, eliminating financial risk while learning.',
            },
            {
              id: 'q1-5-2',
              question: 'Which account type offers direct market access with tighter spreads but charges commissions?',
              options: ['Standard', 'Mini', 'Micro', 'ECN'],
              correctAnswer: 3,
              explanation: 'ECN (Electronic Communications Network) accounts provide direct market access, tighter spreads, but charge a commission per trade.',
            },
            {
              id: 'q1-5-3',
              question: 'How long should you practice on demo before going live?',
              options: [
                '1 week of profitable trading',
                '1 month regardless of results',
                'At least 3 months of consistent profitability',
                'Demo trading is not necessary',
              ],
              correctAnswer: 2,
              explanation: 'You should aim for at least 3 months of consistent profitability on demo before transitioning to a live account.',
            },
          ],
        },
      },
      {
        id: 'lesson-1-6',
        moduleId: 'module-1',
        lessonNumber: 6,
        title: 'Order Types & Trade Execution',
        description: 'Master market orders, limit orders, stop orders, and how to manage open positions.',
        duration: 16,
        videoTitle: 'Order Types Masterclass',
        content: `<h2>Order Types & Trade Execution</h2>
<p>Understanding the different order types is fundamental to executing your trading strategy effectively and managing risk.</p>
<h3>Market Orders</h3>
<p>A market order executes immediately at the best available current price. Use when you want to enter or exit a position right now, accepting the current market price.</p>
<h3>Limit Orders</h3>
<p>A limit order executes only at a specified price or better.</p>
<ul>
  <li><strong>Buy Limit:</strong> Buy at a price lower than current market price</li>
  <li><strong>Sell Limit:</strong> Sell at a price higher than current market price</li>
</ul>
<h3>Stop Orders</h3>
<p>A stop order becomes a market order once a specified price is reached.</p>
<ul>
  <li><strong>Buy Stop:</strong> Buy at a price above current market (breakout trading)</li>
  <li><strong>Sell Stop:</strong> Sell at a price below current market (breakout trading)</li>
  <li><strong>Stop Loss:</strong> Automatically closes a losing position at a specified level</li>
  <li><strong>Take Profit:</strong> Automatically closes a winning position at a specified level</li>
</ul>
<h3>OCO Orders</h3>
<p>One-Cancels-the-Other (OCO) combines two orders — when one executes, the other is automatically cancelled. Useful for trading breakouts.</p>`,
        quiz: {
          questions: [
            {
              id: 'q1-6-1',
              question: 'Which order type executes immediately at the best available price?',
              options: ['Limit order', 'Stop order', 'Market order', 'OCO order'],
              correctAnswer: 2,
              explanation: 'A market order executes immediately at the best available current price in the market.',
            },
            {
              id: 'q1-6-2',
              question: 'A buy limit order is placed:',
              options: [
                'Above the current market price',
                'Below the current market price',
                'At exactly the current market price',
                'At any price the broker chooses',
              ],
              correctAnswer: 1,
              explanation: 'A buy limit order is placed below the current market price, activating when the price falls to that level or lower.',
            },
            {
              id: 'q1-6-3',
              question: 'What happens when one leg of an OCO order is filled?',
              options: [
                'Both orders execute simultaneously',
                'The other order is automatically cancelled',
                'Both orders remain active',
                'The trader must manually cancel the other',
              ],
              correctAnswer: 1,
              explanation: 'In an OCO (One-Cancels-the-Other) order, when one order is executed, the other is automatically cancelled.',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'module-2',
    moduleNumber: 2,
    title: 'Currency Pairs & Market Structure',
    description: 'Deep dive into currency pairs, their classifications, and how forex markets are structured.',
    lessons: [
      {
        id: 'lesson-2-1',
        moduleId: 'module-2',
        lessonNumber: 1,
        title: 'Major, Minor & Exotic Pairs',
        description: 'Understand the three categories of currency pairs and their trading characteristics.',
        duration: 14,
        videoTitle: 'Currency Pair Categories',
        content: `<img src="/images/lessons/currency-pairs.png" alt="Currency Pairs — base, quote and the three types" style="width:100%;border-radius:8px;margin-bottom:20px;" />
<h2>Currency Pairs — The Building Blocks of Forex</h2>
<p>You never trade a single currency in forex — you always trade a <strong>pair</strong>. Think of it like this: you can't just sell your pounds. You have to sell pounds and buy something else — dollars, euros, yen. That "something else" is the other currency in the pair.</p>

<div style="background:rgba(245,197,24,0.1);border-left:4px solid #f5c518;padding:14px 18px;border-radius:6px;margin:18px 0;">
  <strong style="color:#f5c518;">🍎 Real Life Analogy</strong><br/>
  EUR/USD = "How many US dollars does 1 Euro buy?" If EUR/USD = 1.0850, then 1 Euro buys $1.0850. Simple!
</div>

<h3>The Three Types of Pairs</h3>

<p><strong style="color:#26a69a;">✅ MAJOR Pairs</strong> — always include the US Dollar (USD)</p>
<ul>
  <li>EUR/USD — Euro vs Dollar — most traded pair in the world</li>
  <li>GBP/USD — Pound vs Dollar — called "Cable"</li>
  <li>USD/JPY — Dollar vs Yen — very popular in Asian hours</li>
  <li>USD/CHF — Dollar vs Swiss Franc — the "safe haven" pair</li>
  <li>AUD/USD, USD/CAD, NZD/USD — commodity-linked pairs</li>
</ul>
<p><em>Why trade majors? Tightest spreads, highest liquidity, most predictable. Start here!</em></p>

<p><strong style="color:#f5c518;">⚡ MINOR Pairs (also called Crosses)</strong> — no USD involved</p>
<ul>
  <li>EUR/GBP — Euro vs Pound</li>
  <li>GBP/JPY — Pound vs Yen — very volatile, nicknamed "the dragon"</li>
  <li>EUR/JPY — Euro vs Yen</li>
</ul>
<p><em>Why trade minors? Can offer great trends, but slightly wider spreads than majors.</em></p>

<p><strong style="color:#ef5350;">⚠ EXOTIC Pairs</strong> — a major currency vs an emerging market currency</p>
<ul>
  <li>USD/TRY — Dollar vs Turkish Lira</li>
  <li>EUR/ZAR — Euro vs South African Rand</li>
  <li>USD/MXN — Dollar vs Mexican Peso</li>
</ul>
<p><em>Why avoid exotic pairs as a beginner? Huge spreads, unpredictable moves, political risk. Stay away until you're experienced.</em></p>

<div style="background:rgba(38,166,154,0.1);border-left:4px solid #26a69a;padding:14px 18px;border-radius:6px;margin:18px 0;">
  <strong style="color:#26a69a;">✅ Beginner Rule</strong><br/>
  Start with EUR/USD only. It has the world's tightest spread, the most written analysis, and the most predictable behaviour. Master one pair before adding others.
</div>`,
        quiz: {
          questions: [
            {
              id: 'q2-1-1',
              question: 'Which of the following is a major currency pair?',
              options: ['EUR/GBP', 'GBP/JPY', 'EUR/USD', 'AUD/NZD'],
              correctAnswer: 2,
              explanation: 'EUR/USD is a major pair because it includes the US Dollar. Major pairs always include the USD.',
            },
            {
              id: 'q2-1-2',
              question: 'What defines a "cross" or minor pair?',
              options: [
                'It includes the US Dollar',
                'It includes emerging market currencies',
                'It does not include the US Dollar but includes major currencies',
                'It has very low trading volume',
              ],
              correctAnswer: 2,
              explanation: 'Minor pairs (crosses) do not include the US Dollar but are formed from other major currencies like EUR, GBP, JPY, etc.',
            },
            {
              id: 'q2-1-3',
              question: 'Why do exotic pairs typically have wider spreads?',
              options: [
                'Higher trading volume',
                'Lower liquidity',
                'Government regulations',
                'Better market access',
              ],
              correctAnswer: 1,
              explanation: 'Exotic pairs have lower liquidity due to less trading volume, resulting in wider bid-ask spreads.',
            },
          ],
        },
      },
      {
        id: 'lesson-2-2',
        moduleId: 'module-2',
        lessonNumber: 2,
        title: 'Base & Quote Currency',
        description: 'Master the concept of base and quote currencies and how exchange rates work.',
        duration: 12,
        videoTitle: 'Base vs Quote Currency',
        content: `<h2>Base & Quote Currency</h2>
<p>Every currency pair consists of two currencies: the base currency and the quote currency. Understanding this relationship is fundamental to forex trading.</p>
<h3>Base Currency</h3>
<p>The base currency is the first currency in the pair. When you buy a currency pair, you are buying the base currency. For EUR/USD, EUR is the base currency.</p>
<h3>Quote Currency</h3>
<p>The quote currency (counter currency) is the second currency in the pair. The exchange rate tells you how much quote currency is needed to buy one unit of the base currency.</p>
<h3>Reading an Exchange Rate</h3>
<p>If EUR/USD = 1.0850, it means:</p>
<ul>
  <li>1 Euro costs 1.0850 US Dollars</li>
  <li>Buying EUR/USD means buying Euros and selling Dollars</li>
  <li>Selling EUR/USD means selling Euros and buying Dollars</li>
</ul>
<h3>Calculating Profit/Loss</h3>
<p>For EUR/USD with a standard lot (100,000 EUR), each pip (0.0001) = $10. If you buy at 1.0850 and sell at 1.0870, that's 20 pips × $10 = $200 profit.</p>`,
        quiz: {
          questions: [
            {
              id: 'q2-2-1',
              question: 'In the pair GBP/USD, which is the base currency?',
              options: ['USD', 'GBP', 'Both equally', 'Neither'],
              correctAnswer: 1,
              explanation: 'GBP is the base currency (first in the pair). The exchange rate shows how many USD are needed to buy 1 GBP.',
            },
            {
              id: 'q2-2-2',
              question: 'If EUR/USD = 1.0850, what does this mean?',
              options: [
                '1 USD = 1.0850 EUR',
                '1 EUR = 1.0850 USD',
                '0.0850 EUR = 1 USD',
                'The pair is trending upward',
              ],
              correctAnswer: 1,
              explanation: 'EUR/USD = 1.0850 means 1 Euro is worth 1.0850 US Dollars. EUR is the base currency.',
            },
            {
              id: 'q2-2-3',
              question: 'For EUR/USD standard lot, how much is each pip worth in USD?',
              options: ['$1', '$5', '$10', '$100'],
              correctAnswer: 2,
              explanation: 'For a standard lot (100,000 units) of EUR/USD, each pip (0.0001) is worth $10.',
            },
          ],
        },
      },
      {
        id: 'lesson-2-3',
        moduleId: 'module-2',
        lessonNumber: 3,
        title: 'Bid, Ask & Spread',
        description: 'Learn how brokers price currency pairs and how spreads affect your trading costs.',
        duration: 10,
        videoTitle: 'Bid Ask Spread Explained',
        content: `<img src="/images/lessons/bid-ask-spread.png" alt="Bid, Ask and Spread explained" style="width:100%;border-radius:8px;margin-bottom:20px;" />
<h2>Bid, Ask &amp; Spread — The Hidden Cost of Every Trade</h2>
<p>Open any forex broker platform and you'll see two prices for EUR/USD — something like <strong>1.0845 / 1.0847</strong>. Why two prices? This is the bid and the ask, and the tiny gap between them is the spread — your broker's fee for every trade.</p>

<div style="background:rgba(245,197,24,0.1);border-left:4px solid #f5c518;padding:14px 18px;border-radius:6px;margin:18px 0;">
  <strong style="color:#f5c518;">🚗 Car Dealer Analogy</strong><br/>
  A car dealer buys your old car for £8,000 (BID — what they pay you) and sells you a replacement for £8,500 (ASK — what you pay them). The £500 difference is their profit. In forex, that gap is just 1–3 pips, but it happens on every single trade.
</div>

<h3>The Three Prices Explained</h3>
<ul>
  <li><strong>BID (1.0845)</strong> — The price YOU sell at. The broker buys from you at this price. Always the <em>lower</em> number.</li>
  <li><strong>ASK (1.0847)</strong> — The price YOU buy at. The broker sells to you at this price. Always the <em>higher</em> number.</li>
  <li><strong>SPREAD (2 pips)</strong> — The difference: 1.0847 − 1.0845 = 0.0002 = 2 pips. This is the broker's automatic fee.</li>
</ul>

<h3>The 3 Golden Rules</h3>
<ul>
  <li><strong>Rule 1 — When you BUY:</strong> You pay the ASK price (1.0847). You're instantly 2 pips "in the hole" because the market value is only 1.0845. Price must move 2 pips in your favour before you break even.</li>
  <li><strong>Rule 2 — When you SELL:</strong> You receive the BID price (1.0845). To profit, price must move more than the spread against the position you're closing.</li>
  <li><strong>Rule 3 — The spread is always the fee:</strong> There are no "free" trades. Every entry and exit costs at least the spread.</li>
</ul>

<h3>Typical Spreads by Pair</h3>
<ul>
  <li>EUR/USD — 0.5–2 pips — Excellent</li>
  <li>GBP/USD — 1–3 pips — Very Good</li>
  <li>USD/JPY — 0.5–2 pips — Excellent</li>
  <li>EUR/TRY — 40–80 pips — Very Expensive, avoid!</li>
</ul>

<div style="background:rgba(38,166,154,0.1);border-left:4px solid #26a69a;padding:14px 18px;border-radius:6px;margin:18px 0;">
  <strong style="color:#26a69a;">✅ Beginner Rule</strong><br/>
  Always check the spread before entering a trade. As a beginner, the spread should be less than 10% of your planned profit target. On a 30-pip target, a 3-pip spread is acceptable.
</div>`,
        quiz: {
          questions: [
            {
              id: 'q2-3-1',
              question: 'At which price do you BUY a currency pair as a retail trader?',
              options: ['Bid price', 'Ask price', 'Mid price', 'Closing price'],
              correctAnswer: 1,
              explanation: 'As a retail trader, you buy at the ask price (the price the broker will sell to you).',
            },
            {
              id: 'q2-3-2',
              question: 'If EUR/USD Bid = 1.0849 and Ask = 1.0851, what is the spread?',
              options: ['0.5 pips', '1 pip', '2 pips', '2.0 pips'],
              correctAnswer: 2,
              explanation: 'Spread = Ask − Bid = 1.0851 − 1.0849 = 0.0002 = 2 pips.',
            },
            {
              id: 'q2-3-3',
              question: 'When might a variable spread widen significantly?',
              options: [
                'During low volatility periods',
                'When the London session opens',
                'During major news events',
                'When trading micro lots',
              ],
              correctAnswer: 2,
              explanation: 'Variable spreads widen during major news events due to reduced liquidity and increased market uncertainty.',
            },
          ],
        },
      },
      {
        id: 'lesson-2-4',
        moduleId: 'module-2',
        lessonNumber: 4,
        title: 'Currency Correlations',
        description: 'Discover how currency pairs move in relation to each other and why this matters.',
        duration: 16,
        videoTitle: 'Understanding Currency Correlations',
        content: `<h2>Currency Correlations</h2>
<p>Currency correlation measures how two currency pairs move in relation to each other. Understanding correlations helps you diversify risk and avoid doubling up on the same trade.</p>
<h3>Positive Correlation</h3>
<p>Two pairs move in the same direction. For example, EUR/USD and GBP/USD typically have a strong positive correlation (both move up or down together) because both use the USD as the quote currency.</p>
<h3>Negative Correlation</h3>
<p>Two pairs move in opposite directions. EUR/USD and USD/CHF typically move in opposite directions because USD is the base in one and quote in another.</p>
<h3>Correlation Coefficient</h3>
<p>Correlation is measured from -1 to +1:</p>
<ul>
  <li>+1: Perfect positive correlation (move identically)</li>
  <li>0: No correlation (move independently)</li>
  <li>-1: Perfect negative correlation (move opposite)</li>
</ul>
<h3>Practical Applications</h3>
<ul>
  <li>If you're long EUR/USD and long GBP/USD, you're effectively doubling your USD exposure</li>
  <li>Knowing correlations helps manage overall portfolio risk</li>
  <li>Correlations can change over time and during different market conditions</li>
</ul>`,
        quiz: {
          questions: [
            {
              id: 'q2-4-1',
              question: 'What does a correlation coefficient of -1 mean?',
              options: [
                'No relationship between pairs',
                'Pairs move identically',
                'Pairs move in perfectly opposite directions',
                'One pair leads the other by one day',
              ],
              correctAnswer: 2,
              explanation: 'A correlation of -1 means perfect negative correlation — when one pair moves up, the other moves down by the same amount.',
            },
            {
              id: 'q2-4-2',
              question: 'Why do EUR/USD and GBP/USD typically have positive correlation?',
              options: [
                'Both are European currencies',
                'Both use USD as the quote currency',
                'Both have similar trading volumes',
                'They share the same base currency',
              ],
              correctAnswer: 1,
              explanation: 'EUR/USD and GBP/USD both use USD as the quote currency, so when USD strengthens or weakens, it affects both pairs similarly.',
            },
            {
              id: 'q2-4-3',
              question: 'If you are long EUR/USD and also long GBP/USD, what risk are you taking?',
              options: [
                'Zero risk since they\'re different pairs',
                'Doubled USD exposure risk',
                'Reduced overall risk through diversification',
                'Only EUR exposure risk',
              ],
              correctAnswer: 1,
              explanation: 'Being long both EUR/USD and GBP/USD doubles your USD exposure since both pairs involve selling USD.',
            },
          ],
        },
      },
      {
        id: 'lesson-2-5',
        moduleId: 'module-2',
        lessonNumber: 5,
        title: 'Market Participants & Their Impact',
        description: 'How central banks, institutions, and retail traders shape forex market movements.',
        duration: 13,
        videoTitle: 'Who Moves the Forex Market',
        content: `<h2>Market Participants & Their Impact</h2>
<p>Different types of market participants influence forex prices in different ways. Understanding who moves the market helps you trade with the trend rather than against it.</p>
<h3>Central Banks</h3>
<p>The most powerful participants. Central banks control monetary policy, set interest rates, and can intervene directly in currency markets. Key central banks: Fed (USD), ECB (EUR), BOE (GBP), BOJ (JPY).</p>
<h3>Commercial Banks</h3>
<p>Process billions in daily foreign exchange for clients and for proprietary trading. JP Morgan, Citibank, Deutsche Bank, and Barclays are among the largest forex dealers.</p>
<h3>Hedge Funds</h3>
<p>Speculative traders managing billions. Famous for making large, directional bets — George Soros famously broke the Bank of England in 1992 by shorting GBP.</p>
<h3>Corporations</h3>
<p>Multinational companies exchange currencies for international business operations. These flows are generally predictable and related to trade cycles.</p>
<h3>Retail Traders</h3>
<p>Individual traders like you and me represent a small portion of total volume (~6%) but have grown significantly with online trading platforms. We are "price takers" — we cannot move the market.</p>`,
        quiz: {
          questions: [
            {
              id: 'q2-5-1',
              question: 'Which type of participant has the greatest influence on forex markets?',
              options: ['Retail traders', 'Corporations', 'Central banks', 'Hedge funds'],
              correctAnswer: 2,
              explanation: 'Central banks have the greatest influence as they control monetary policy, interest rates, and can directly intervene in currency markets.',
            },
            {
              id: 'q2-5-2',
              question: 'Approximately what percentage of forex volume do retail traders represent?',
              options: ['1%', '6%', '25%', '50%'],
              correctAnswer: 1,
              explanation: 'Retail traders represent approximately 6% of total forex trading volume, making us "price takers" who cannot move the market.',
            },
            {
              id: 'q2-5-3',
              question: 'George Soros famously made $1 billion by shorting which currency in 1992?',
              options: ['USD', 'EUR', 'GBP', 'JPY'],
              correctAnswer: 2,
              explanation: 'George Soros made approximately $1 billion by short selling the British Pound (GBP) in 1992, forcing the UK to withdraw from the European Exchange Rate Mechanism.',
            },
          ],
        },
      },
      {
        id: 'lesson-2-6',
        moduleId: 'module-2',
        lessonNumber: 6,
        title: 'Understanding Leverage & Margin',
        description: 'Learn how leverage works, margin requirements, and how to use them responsibly.',
        duration: 17,
        videoTitle: 'Leverage and Margin Explained',
        content: `<img src="/images/lessons/leverage-explained.png" alt="Leverage Explained — controlling more with less" style="width:100%;border-radius:8px;margin-bottom:20px;" />
<h2>Leverage &amp; Margin — The Double-Edged Sword</h2>
<p>Leverage is like borrowing money from your broker to open a bigger trade than your account balance allows. It makes wins bigger — but it also makes losses bigger. This is the most important concept to understand before risking real money.</p>

<div style="background:rgba(245,197,24,0.1);border-left:4px solid #f5c518;padding:14px 18px;border-radius:6px;margin:18px 0;">
  <strong style="color:#f5c518;">🏗️ Building Analogy</strong><br/>
  You want to buy a £100,000 house but only have £10,000. A mortgage lets you control the full £100,000 with just £10,000 deposit (10:1 leverage). If the house rises to £110,000 — great, you doubled your money! But if it falls to £90,000 — you've lost your entire deposit.
</div>

<h3>How Leverage Works — Three Scenarios</h3>
<ul>
  <li><strong>No Leverage (1:1)</strong> — £100 controls £100. Low risk, small profits.</li>
  <li><strong>10:1 Leverage</strong> — £100 controls £1,000. Moderate risk. 1% move = 10% gain or loss on your deposit.</li>
  <li><strong>100:1 Leverage</strong> — £100 controls £10,000. Very high risk. 1% move AGAINST you wipes your entire £100 (margin call!).</li>
</ul>

<h3>What is Margin?</h3>
<p><strong>Margin</strong> is the deposit your broker holds while your trade is open. It's not a fee — you get it back when you close the trade (minus any losses).</p>
<ul>
  <li><strong>Required Margin</strong> — the amount locked as deposit for the trade</li>
  <li><strong>Free Margin</strong> — money available to open new trades</li>
  <li><strong>Margin Call</strong> — your broker warns you that your account is running low. Add funds or they'll close your trades.</li>
  <li><strong>Stop Out</strong> — if you ignore the margin call, the broker automatically closes your losing trades to protect themselves</li>
</ul>

<h3>Worked Example</h3>
<p>You open EUR/USD with 1:100 leverage and a micro lot (£100 margin):</p>
<ul>
  <li>Position size = £10,000</li>
  <li>Price moves 50 pips for you → <strong style="color:#26a69a;">+£5 profit</strong> (50 × $0.10)</li>
  <li>Price moves 100 pips against you → <strong style="color:#ef5350;">−£10 loss</strong> — 10% of your £100 deposit</li>
</ul>

<div style="background:rgba(239,83,80,0.1);border-left:4px solid #ef5350;padding:14px 18px;border-radius:6px;margin:18px 0;">
  <strong style="color:#ef5350;">⚠ Caution — The Leverage Trap</strong><br/>
  Beginners often use maximum leverage (100:1 or more) thinking it maximises profits. It does — but it also means a single bad trade can wipe out your entire account. Professional traders use 5:1 to 10:1 leverage at most. <strong>Use maximum 1:10 leverage until you have a proven track record.</strong>
</div>`,
        quiz: {
          questions: [
            {
              id: 'q2-6-1',
              question: 'With 50:1 leverage, how much capital is needed to control a $50,000 position?',
              options: ['$100', '$500', '$1,000', '$5,000'],
              correctAnswer: 2,
              explanation: '50:1 leverage means $1 controls $50. For a $50,000 position: $50,000 ÷ 50 = $1,000 required margin.',
            },
            {
              id: 'q2-6-2',
              question: 'What is a "margin call"?',
              options: [
                'A call from your broker to discuss strategy',
                'A warning that margin level is too low',
                'An order to increase position size',
                'A request to add funds for profit withdrawal',
              ],
              correctAnswer: 1,
              explanation: 'A margin call is a warning from your broker that your margin level has fallen below a specified threshold and you need to add funds or close positions.',
            },
            {
              id: 'q2-6-3',
              question: 'What effective leverage do professional traders typically use?',
              options: ['50:1 to 100:1', '20:1 to 50:1', '5:1 to 10:1', 'They use maximum available'],
              correctAnswer: 2,
              explanation: 'Professional traders typically use effective leverage of 5:1 to 10:1 — much lower than the maximum available — to manage risk properly.',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'module-3',
    moduleNumber: 3,
    title: 'Fundamental Analysis',
    description: 'Learn how economic data, central bank policy, and geopolitical events drive currency values.',
    lessons: [
      {
        id: 'lesson-3-1',
        moduleId: 'module-3',
        lessonNumber: 1,
        title: 'Introduction to Fundamental Analysis',
        description: 'Understand how macroeconomic factors drive long-term currency trends.',
        duration: 15,
        videoTitle: 'Fundamental Analysis Intro',
        content: `<h2>Introduction to Fundamental Analysis</h2>
<p>Fundamental analysis examines the economic, social, and political forces that drive currency supply and demand. While technical analysis focuses on price charts, fundamental analysis looks at the underlying reasons why currencies move.</p>
<h3>Why Fundamentals Matter</h3>
<p>In the long run, currencies reflect the economic health of their respective countries. Strong economies attract investment, increasing demand for their currency. Weak economies see capital flight and currency depreciation.</p>
<h3>Key Fundamental Drivers</h3>
<ul>
  <li><strong>Interest Rates:</strong> Higher rates attract foreign capital, strengthening the currency</li>
  <li><strong>Inflation:</strong> High inflation erodes purchasing power and weakens a currency</li>
  <li><strong>GDP Growth:</strong> Strong economic growth signals a healthy economy</li>
  <li><strong>Employment:</strong> Low unemployment indicates economic strength</li>
  <li><strong>Trade Balance:</strong> Surplus countries see stronger currencies</li>
</ul>
<h3>Fundamental vs Technical Analysis</h3>
<p>Many successful traders combine both approaches: fundamentals determine the direction (trend), while technical analysis provides precise entry and exit points. This hybrid approach is often called "top-down analysis."</p>`,
        quiz: {
          questions: [
            {
              id: 'q3-1-1',
              question: 'What does fundamental analysis primarily focus on?',
              options: [
                'Price chart patterns',
                'Moving average crossovers',
                'Economic and political forces driving currency values',
                'Historical volatility data',
              ],
              correctAnswer: 2,
              explanation: 'Fundamental analysis examines economic, social, and political forces that influence currency supply and demand.',
            },
            {
              id: 'q3-1-2',
              question: 'How do higher interest rates generally affect a currency?',
              options: [
                'Weaken it by increasing inflation',
                'Strengthen it by attracting foreign capital',
                'Have no effect on currency value',
                'Weaken it by increasing government debt',
              ],
              correctAnswer: 1,
              explanation: 'Higher interest rates attract foreign capital seeking better returns, increasing demand for the currency and strengthening it.',
            },
            {
              id: 'q3-1-3',
              question: 'In a "top-down" analytical approach, what role does fundamental analysis play?',
              options: [
                'It provides precise entry and exit points',
                'It determines the overall trend direction',
                'It replaces technical analysis entirely',
                'It only applies to stock markets',
              ],
              correctAnswer: 1,
              explanation: 'In top-down analysis, fundamentals determine the overall trend direction while technical analysis provides precise entry and exit timing.',
            },
          ],
        },
      },
      {
        id: 'lesson-3-2',
        moduleId: 'module-3',
        lessonNumber: 2,
        title: 'Central Banks & Interest Rates',
        description: 'How central bank decisions and interest rate differentials move currency markets.',
        duration: 20,
        videoTitle: 'Central Banks & Rate Decisions',
        content: `<h2>Central Banks & Interest Rates</h2>
<p>Central bank monetary policy is arguably the single most important driver of currency markets. Traders worldwide watch central bank communications for clues about future rate decisions.</p>
<h3>The Interest Rate Mechanism</h3>
<p>When a central bank raises interest rates, domestic assets become more attractive to foreign investors seeking higher yields. This capital inflow increases demand for the currency, pushing it higher.</p>
<h3>Key Central Banks</h3>
<ul>
  <li><strong>Federal Reserve (Fed):</strong> Controls USD; holds FOMC meetings 8 times/year</li>
  <li><strong>European Central Bank (ECB):</strong> Controls EUR; based in Frankfurt</li>
  <li><strong>Bank of England (BOE):</strong> Controls GBP; MPC meets monthly</li>
  <li><strong>Bank of Japan (BOJ):</strong> Controls JPY; known for ultra-loose policy</li>
</ul>
<h3>Interest Rate Differentials & Carry Trade</h3>
<p>The "carry trade" exploits interest rate differentials between countries. Traders borrow in low-interest-rate currencies (JPY) and invest in high-interest-rate currencies (AUD), profiting from the differential.</p>
<h3>Forward Guidance</h3>
<p>Central banks communicate future policy intentions through "forward guidance." Hawkish guidance (suggesting rate hikes) strengthens a currency; dovish guidance (suggesting cuts) weakens it.</p>`,
        quiz: {
          questions: [
            {
              id: 'q3-2-1',
              question: 'How many times per year does the Federal Reserve hold FOMC meetings?',
              options: ['4', '6', '8', '12'],
              correctAnswer: 2,
              explanation: 'The Federal Reserve holds 8 Federal Open Market Committee (FOMC) meetings per year to review and set monetary policy.',
            },
            {
              id: 'q3-2-2',
              question: 'What is "hawkish" central bank language?',
              options: [
                'Language suggesting future rate cuts',
                'Language suggesting rate hikes or tighter policy',
                'Neutral commentary about economic conditions',
                'Concerns about deflation',
              ],
              correctAnswer: 1,
              explanation: '"Hawkish" language suggests the central bank is leaning toward raising rates or tightening monetary policy, which typically strengthens the currency.',
            },
            {
              id: 'q3-2-3',
              question: 'In a carry trade, what do traders typically do with a low-interest-rate currency like JPY?',
              options: [
                'Buy it and hold it long-term',
                'Borrow it to fund investments in higher-yielding currencies',
                'Sell it immediately',
                'Use it as a safe haven during crises',
              ],
              correctAnswer: 1,
              explanation: 'In carry trades, traders borrow low-interest-rate currencies (like JPY) cheaply and invest in higher-yielding currencies, profiting from the interest rate differential.',
            },
          ],
        },
      },
      {
        id: 'lesson-3-3',
        moduleId: 'module-3',
        lessonNumber: 3,
        title: 'Key Economic Indicators',
        description: 'Master the most market-moving economic reports: NFP, CPI, GDP, and more.',
        duration: 22,
        videoTitle: 'Economic Indicators Guide',
        content: `<h2>Key Economic Indicators</h2>
<p>Economic data releases can cause significant market volatility. Knowing which reports matter and how to interpret them is critical for fundamental traders.</p>
<h3>Non-Farm Payrolls (NFP)</h3>
<p>Released the first Friday of each month by the U.S. Bureau of Labor Statistics. Shows employment changes excluding farming. One of the most market-moving reports for USD pairs — can move EUR/USD 50-100+ pips.</p>
<h3>Consumer Price Index (CPI)</h3>
<p>Measures inflation by tracking prices of a basket of goods. High CPI may prompt central banks to raise rates. Released monthly by most major economies.</p>
<h3>Gross Domestic Product (GDP)</h3>
<p>The broadest measure of economic output. Strong GDP growth signals economic health. GDP is released quarterly.</p>
<h3>Purchasing Managers Index (PMI)</h3>
<p>Survey-based leading indicator of economic activity. Above 50 = expansion; below 50 = contraction. Released monthly. Comes in Manufacturing and Services versions.</p>
<h3>Retail Sales</h3>
<p>Measures consumer spending, which drives ~70% of U.S. GDP. Strong retail sales signal economic health and potential rate hikes.</p>
<h3>Economic Calendar Strategy</h3>
<p>Use an economic calendar (Forex Factory, DailyFX) to track upcoming releases. Avoid trading during high-impact events unless you have a news-trading strategy.</p>`,
        quiz: {
          questions: [
            {
              id: 'q3-3-1',
              question: 'When is the Non-Farm Payrolls (NFP) report typically released?',
              options: [
                'Last Friday of each month',
                'First Friday of each month',
                'First Monday of each month',
                'Every Tuesday at 8:30 AM EST',
              ],
              correctAnswer: 1,
              explanation: 'The NFP report is released on the first Friday of each month by the U.S. Bureau of Labor Statistics at 8:30 AM ET.',
            },
            {
              id: 'q3-3-2',
              question: 'A PMI reading of 48 indicates:',
              options: [
                'Strong expansion in the sector',
                'Neutral economic conditions',
                'Contraction in the sector',
                'Hyperinflation risk',
              ],
              correctAnswer: 2,
              explanation: 'PMI readings below 50 indicate contraction in the sector, while readings above 50 indicate expansion.',
            },
            {
              id: 'q3-3-3',
              question: 'What does a high CPI reading typically signal for central bank policy?',
              options: [
                'Rate cuts are likely',
                'Quantitative easing',
                'Rate hikes may be necessary',
                'Currency devaluation',
              ],
              correctAnswer: 2,
              explanation: 'High CPI (inflation) may prompt central banks to raise interest rates to cool the economy and bring inflation back to target levels.',
            },
          ],
        },
      },
      {
        id: 'lesson-3-4',
        moduleId: 'module-3',
        lessonNumber: 4,
        title: 'Geopolitical Events & Risk Sentiment',
        description: 'How political events, elections, and global crises affect currency markets.',
        duration: 14,
        videoTitle: 'Geopolitics & Forex',
        content: `<h2>Geopolitical Events & Risk Sentiment</h2>
<p>Geopolitical events can cause sudden, dramatic moves in currency markets. Understanding risk sentiment helps you anticipate how currencies will respond to global events.</p>
<h3>Risk-On vs Risk-Off</h3>
<p>The forex market operates in two primary modes:</p>
<ul>
  <li><strong>Risk-On:</strong> Investors are optimistic; they buy higher-yielding, riskier assets. AUD, NZD, and emerging market currencies strengthen.</li>
  <li><strong>Risk-Off:</strong> Uncertainty and fear dominate; investors flee to safe havens. JPY, CHF, and USD typically strengthen.</li>
</ul>
<h3>Safe Haven Currencies</h3>
<p>During crises, capital flows into perceived safe havens:</p>
<ul>
  <li><strong>Japanese Yen (JPY):</strong> Japan's large current account surplus and creditor status</li>
  <li><strong>Swiss Franc (CHF):</strong> Switzerland's political neutrality and stable banking sector</li>
  <li><strong>US Dollar (USD):</strong> World's reserve currency; demand spikes during global crises</li>
</ul>
<h3>Political Risk Events</h3>
<p>Elections, referendums (Brexit), trade wars, and military conflicts can all cause significant volatility. The Brexit vote in 2016 caused GBP/USD to crash over 1,000 pips in a single day.</p>`,
        quiz: {
          questions: [
            {
              id: 'q3-4-1',
              question: 'In a "risk-off" environment, which currency is most likely to strengthen?',
              options: ['AUD (Australian Dollar)', 'NZD (New Zealand Dollar)', 'JPY (Japanese Yen)', 'CAD (Canadian Dollar)'],
              correctAnswer: 2,
              explanation: 'JPY is a safe haven currency that typically strengthens during risk-off periods as investors seek safety.',
            },
            {
              id: 'q3-4-2',
              question: 'What defines a "risk-on" market environment?',
              options: [
                'High volatility and fear',
                'Investors buying safe haven assets',
                'Investor optimism and buying of riskier assets',
                'Central bank intervention',
              ],
              correctAnswer: 2,
              explanation: 'In risk-on environments, investor optimism drives capital into higher-yielding, riskier assets like commodity currencies (AUD, NZD).',
            },
            {
              id: 'q3-4-3',
              question: 'Why is the Swiss Franc considered a safe haven currency?',
              options: [
                'Switzerland has the highest interest rates',
                'It\'s pegged to the Euro',
                'Switzerland\'s political neutrality and stable banking sector',
                'High gold reserves relative to GDP',
              ],
              correctAnswer: 2,
              explanation: 'The Swiss Franc is a safe haven due to Switzerland\'s long history of political neutrality, stable government, and reliable banking sector.',
            },
          ],
        },
      },
      {
        id: 'lesson-3-5',
        moduleId: 'module-3',
        lessonNumber: 5,
        title: 'Inflation & Its Market Impact',
        description: 'Understand inflation dynamics and how they shape central bank decisions and currency trends.',
        duration: 16,
        videoTitle: 'Inflation and Currency Markets',
        content: `<h2>Inflation & Its Market Impact</h2>
<p>Inflation is the rate at which the general level of prices for goods and services rises over time. It has profound effects on currency values and central bank policy.</p>
<h3>Types of Inflation</h3>
<ul>
  <li><strong>Demand-Pull:</strong> Too much money chasing too few goods; often in growing economies</li>
  <li><strong>Cost-Push:</strong> Rising production costs passed to consumers (e.g., oil price shocks)</li>
  <li><strong>Built-in (Wage-Price Spiral):</strong> Workers demand higher wages, leading to higher prices</li>
</ul>
<h3>How Inflation Affects Currencies</h3>
<p>Moderate inflation (2% target for most central banks) is healthy. But when inflation rises above target:</p>
<ol>
  <li>Central bank raises interest rates</li>
  <li>Higher rates attract foreign capital</li>
  <li>Currency strengthens in the short term</li>
  <li>But persistently high inflation erodes purchasing power long-term</li>
</ol>
<h3>Inflation Measures to Watch</h3>
<ul>
  <li><strong>CPI:</strong> Consumer Price Index — most widely followed</li>
  <li><strong>PCE:</strong> Personal Consumption Expenditures — the Fed's preferred measure</li>
  <li><strong>PPI:</strong> Producer Price Index — leads CPI by a few months</li>
</ul>`,
        quiz: {
          questions: [
            {
              id: 'q3-5-1',
              question: 'What inflation measure does the Federal Reserve prefer?',
              options: ['CPI', 'PPI', 'PCE', 'RPI'],
              correctAnswer: 2,
              explanation: 'The Federal Reserve prefers the Personal Consumption Expenditures (PCE) index as its primary inflation measure.',
            },
            {
              id: 'q3-5-2',
              question: 'What is the typical inflation target for most major central banks?',
              options: ['0%', '2%', '5%', '10%'],
              correctAnswer: 1,
              explanation: 'Most major central banks, including the Fed and ECB, have an inflation target of approximately 2%.',
            },
            {
              id: 'q3-5-3',
              question: 'Which inflation type is caused by rising production costs?',
              options: ['Demand-pull inflation', 'Cost-push inflation', 'Built-in inflation', 'Hyperinflation'],
              correctAnswer: 1,
              explanation: 'Cost-push inflation occurs when rising production costs (like oil prices) are passed on to consumers, pushing prices higher.',
            },
          ],
        },
      },
      {
        id: 'lesson-3-6',
        moduleId: 'module-3',
        lessonNumber: 6,
        title: 'Trade Balance & Capital Flows',
        description: 'How trade deficits, surpluses, and international capital flows influence exchange rates.',
        duration: 13,
        videoTitle: 'Trade Balance and FX',
        content: `<h2>Trade Balance & Capital Flows</h2>
<p>A country's trade balance and international capital flows are fundamental drivers of long-term exchange rate trends.</p>
<h3>Trade Balance</h3>
<p>The trade balance is the difference between a country's exports and imports:</p>
<ul>
  <li><strong>Trade Surplus:</strong> Exports > Imports. Foreign buyers need the domestic currency to purchase goods, increasing demand and strengthening the currency.</li>
  <li><strong>Trade Deficit:</strong> Imports > Exports. The country sells its currency to buy foreign goods, increasing supply and weakening the currency.</li>
</ul>
<h3>Current Account</h3>
<p>The current account includes the trade balance plus income from investments and transfers. Countries with persistent current account deficits (like the US) often see long-term currency pressure.</p>
<h3>Capital Flows</h3>
<p>Foreign Direct Investment (FDI) and portfolio investment flows can dominate trade flows in the short to medium term:</p>
<ul>
  <li>Countries with high returns attract foreign investment, strengthening the currency</li>
  <li>Capital flight during political/economic crises weakens currencies rapidly</li>
</ul>
<h3>Purchasing Power Parity (PPP)</h3>
<p>PPP theory suggests exchange rates should adjust to equalize the price of identical goods across countries. While not a short-term trading tool, PPP helps identify fundamentally undervalued or overvalued currencies.</p>`,
        quiz: {
          questions: [
            {
              id: 'q3-6-1',
              question: 'How does a trade surplus typically affect a country\'s currency?',
              options: [
                'Weakens it over time',
                'Has no effect on currency',
                'Strengthens it as foreigners buy the currency',
                'Causes immediate devaluation',
              ],
              correctAnswer: 2,
              explanation: 'A trade surplus means more foreigners are buying the country\'s goods, needing to buy its currency first, which increases demand and strengthens the currency.',
            },
            {
              id: 'q3-6-2',
              question: 'What does PPP (Purchasing Power Parity) theory suggest?',
              options: [
                'All currencies should be equal in value',
                'Exchange rates should equalize prices of goods across countries',
                'Only inflation matters for exchange rates',
                'Trade balances determine short-term exchange rates',
              ],
              correctAnswer: 1,
              explanation: 'PPP theory states that exchange rates should adjust over time to equalize the price of identical goods and services across different countries.',
            },
            {
              id: 'q3-6-3',
              question: 'What is "capital flight"?',
              options: [
                'Central bank buying of foreign currency',
                'Rapid outflow of capital from a country during crises',
                'Foreign investment in government bonds',
                'Profits being repatriated to home country',
              ],
              correctAnswer: 1,
              explanation: 'Capital flight is the rapid movement of capital out of a country, usually triggered by political or economic instability, which sharply weakens the currency.',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'module-4',
    moduleNumber: 4,
    title: 'Technical Analysis Fundamentals',
    description: 'Master chart reading, support and resistance, trends, and essential technical tools.',
    lessons: [
      {
        id: 'lesson-4-1',
        moduleId: 'module-4',
        lessonNumber: 1,
        title: 'Reading Forex Charts',
        description: 'Master candlestick, bar, and line charts and what they tell you about price.',
        duration: 16,
        videoTitle: 'How to Read Forex Charts',
        content: `<h2>Reading Forex Charts</h2>
<p>Price charts are the primary tool of technical analysis. Learning to read them accurately is the foundation of all chart-based trading strategies.</p>
<img src="/images/lessons/candlestick-chart.png" alt="EUR/USD candlestick chart showing OHLC candles with wicks, bodies and volume" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<h3>Chart Types</h3>
<h4>Line Chart</h4>
<p>Connects closing prices with a line. Simple and clean but shows little price detail. Good for identifying overall trend direction.</p>
<h4>Bar Chart (OHLC)</h4>
<p>Shows Open, High, Low, and Close for each time period. A vertical line represents the range (high to low). Left horizontal tick = open; right horizontal tick = close.</p>
<h4>Candlestick Chart</h4>
<p>The most popular chart type in forex. Each candle shows OHLC data with a "body" (open-close range) and "wicks/shadows" (high-low range).</p>
<ul>
  <li><strong>Bullish (white/green) candle:</strong> Close > Open — buyers controlled the period</li>
  <li><strong>Bearish (black/red) candle:</strong> Close < Open — sellers controlled the period</li>
</ul>
<h3>Timeframes</h3>
<p>Charts can be set to different timeframes: M1, M5, M15, M30, H1, H4, D1, W1, MN. Higher timeframes show longer-term trends; lower timeframes show short-term movements.</p>`,
        quiz: {
          questions: [
            {
              id: 'q4-1-1',
              question: 'What does OHLC stand for in a bar chart?',
              options: [
                'Open, High, Low, Close',
                'Overall High-Low Change',
                'Order, Hold, Limit, Cancel',
                'Open, Hold, Last, Close',
              ],
              correctAnswer: 0,
              explanation: 'OHLC stands for Open, High, Low, Close — the four key price points represented in each bar of a bar chart.',
            },
            {
              id: 'q4-1-2',
              question: 'What does a green/white candlestick body indicate?',
              options: [
                'The price fell during that period',
                'The close was lower than the open',
                'The close was higher than the open',
                'The price was unchanged',
              ],
              correctAnswer: 2,
              explanation: 'A green (bullish) candlestick body indicates the closing price was higher than the opening price for that time period.',
            },
            {
              id: 'q4-1-3',
              question: 'Which timeframe chart would be most useful for identifying a long-term trend?',
              options: ['M1 (1 minute)', 'M5 (5 minute)', 'H1 (1 hour)', 'D1 (Daily)'],
              correctAnswer: 3,
              explanation: 'The D1 (daily) chart shows longer-term price action, making it ideal for identifying major trends. Higher timeframes reduce noise.',
            },
          ],
        },
      },
      {
        id: 'lesson-4-2',
        moduleId: 'module-4',
        lessonNumber: 2,
        title: 'Support & Resistance',
        description: 'Identify key price levels where buying and selling pressure concentrate.',
        duration: 19,
        videoTitle: 'Support and Resistance Levels',
        content: `<h2>Support & Resistance</h2>
<p>Support and resistance are the cornerstone concepts of technical analysis. These price levels act as barriers where the price has historically struggled to move beyond.</p>
<img src="/images/lessons/support-resistance-chart.png" alt="EUR/USD chart showing support and resistance levels, bounces, breakout and role reversal" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<h3>What is Support?</h3>
<p>Support is a price level where demand is strong enough to prevent the price from falling further. Think of it as a "floor." Price bounces up from support because buyers enter aggressively at these levels.</p>
<h3>What is Resistance?</h3>
<p>Resistance is a price level where selling pressure is strong enough to prevent the price from rising further. Think of it as a "ceiling." Price reverses down from resistance as sellers take profits or enter new shorts.</p>
<h3>Why These Levels Work</h3>
<ul>
  <li><strong>Memory:</strong> Traders remember significant past price levels</li>
  <li><strong>Psychology:</strong> Round numbers (1.1000, 1.2500) attract orders</li>
  <li><strong>Institutional levels:</strong> Banks and funds place large orders at key levels</li>
</ul>
<h3>Role Reversal</h3>
<p>One of the most powerful concepts: when price breaks through a support level, that support often becomes new resistance (and vice versa). This is called "role reversal" or "polarity change."</p>
<h3>Identifying Key Levels</h3>
<p>Look for price areas that have been tested multiple times. The more times a level has been touched and respected, the more significant it becomes.</p>`,
        quiz: {
          questions: [
            {
              id: 'q4-2-1',
              question: 'What happens at a support level?',
              options: [
                'Sellers dominate and push price down',
                'Buyers emerge strongly, preventing further decline',
                'Price always reverses immediately',
                'Volume decreases significantly',
              ],
              correctAnswer: 1,
              explanation: 'At support levels, buying pressure is strong enough to prevent further price decline, often causing a bounce or reversal.',
            },
            {
              id: 'q4-2-2',
              question: 'What is "role reversal" in technical analysis?',
              options: [
                'A trader switching from buying to selling',
                'A broken support level becoming new resistance',
                'Changing your trading strategy',
                'A price pattern that predicts reversals',
              ],
              correctAnswer: 1,
              explanation: 'Role reversal (polarity change) occurs when a broken support level subsequently acts as resistance, and a broken resistance level acts as support.',
            },
            {
              id: 'q4-2-3',
              question: 'Why are round numbers significant in forex?',
              options: [
                'They\'re easier for computers to process',
                'Central banks always intervene at round numbers',
                'Traders psychologically place orders at round levels',
                'Round numbers always hold as support/resistance',
              ],
              correctAnswer: 2,
              explanation: 'Round numbers are psychologically significant — traders, institutions, and algorithms tend to place orders at these levels, creating concentrated buying/selling pressure.',
            },
          ],
        },
      },
      {
        id: 'lesson-4-3',
        moduleId: 'module-4',
        lessonNumber: 3,
        title: 'Trend Analysis',
        description: 'Learn to identify, classify, and trade with the dominant market trend.',
        duration: 17,
        videoTitle: 'Trend Analysis in Forex',
        content: `<h2>Trend Analysis</h2>
<p>"The trend is your friend" — this classic trading wisdom reflects one of the most reliable principles in technical analysis. Trading with the trend significantly improves your probability of success.</p>
<img src="/images/lessons/trends-chart.png" alt="Three forex trend types — uptrend (higher highs/lows), downtrend (lower highs/lows), and ranging market" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<h3>Defining a Trend</h3>
<ul>
  <li><strong>Uptrend:</strong> Series of higher highs (HH) and higher lows (HL)</li>
  <li><strong>Downtrend:</strong> Series of lower highs (LH) and lower lows (LL)</li>
  <li><strong>Sideways/Range:</strong> Price oscillates between support and resistance without clear direction</li>
</ul>
<h3>Trend Strength</h3>
<p>Trends can be classified by strength and duration:</p>
<ul>
  <li><strong>Primary trend:</strong> Months to years (fundamental drivers)</li>
  <li><strong>Secondary trend:</strong> Weeks to months (corrections within primary trend)</li>
  <li><strong>Minor trend:</strong> Days to weeks (noise)</li>
</ul>
<h3>Trend Lines</h3>
<p>Draw trend lines by connecting swing lows in an uptrend and swing highs in a downtrend. A valid trend line requires at least 2-3 touches. A break of the trend line signals a potential trend change.</p>
<h3>The Trend Life Cycle</h3>
<p>Trends follow a life cycle: accumulation → markup (uptrend) → distribution → markdown (downtrend). Understanding where a trend is in its cycle helps time entries and exits.</p>`,
        quiz: {
          questions: [
            {
              id: 'q4-3-1',
              question: 'Which pattern defines an uptrend?',
              options: [
                'Lower highs and lower lows',
                'Higher highs and higher lows',
                'Equal highs and equal lows',
                'Higher highs and lower lows',
              ],
              correctAnswer: 1,
              explanation: 'An uptrend is characterized by a series of higher highs (HH) and higher lows (HL), showing consistent buying pressure.',
            },
            {
              id: 'q4-3-2',
              question: 'How many touches are needed for a valid trend line?',
              options: ['1', '2', 'At least 2-3', '5 or more'],
              correctAnswer: 2,
              explanation: 'A valid trend line requires at least 2-3 touches/bounces to confirm the level\'s significance.',
            },
            {
              id: 'q4-3-3',
              question: 'What does a break of a trend line typically signal?',
              options: [
                'The trend will continue stronger',
                'A potential trend reversal or weakening',
                'A buying opportunity in all cases',
                'Nothing significant',
              ],
              correctAnswer: 1,
              explanation: 'A break of a trend line signals a potential change in trend direction or at least a weakening of the current trend.',
            },
          ],
        },
      },
      {
        id: 'lesson-4-4',
        moduleId: 'module-4',
        lessonNumber: 4,
        title: 'Moving Averages',
        description: 'Master SMA, EMA, and how to use moving averages for trend identification and signals.',
        duration: 20,
        videoTitle: 'Moving Averages Explained',
        content: `<h2>Moving Averages</h2>
<p>Moving averages are among the most widely used technical indicators. They smooth price data to identify trends and generate trading signals.</p>
<img src="/images/lessons/moving-averages-chart.png" alt="EUR/USD 4H chart showing EMA 20 and EMA 50 with golden cross and pullback entry" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<h3>Simple Moving Average (SMA)</h3>
<p>The SMA calculates the average closing price over a specified number of periods. A 20-period SMA sums the last 20 closing prices and divides by 20. Easy to calculate but gives equal weight to all periods.</p>
<h3>Exponential Moving Average (EMA)</h3>
<p>The EMA gives more weight to recent prices, making it more responsive to current price action. The 12 EMA and 26 EMA are popular choices. EMA reacts faster than SMA to price changes.</p>
<h3>Common Moving Average Periods</h3>
<ul>
  <li><strong>9 / 10 EMA:</strong> Very short-term; used by scalpers</li>
  <li><strong>20 / 21 EMA:</strong> Short-term trend indicator</li>
  <li><strong>50 SMA/EMA:</strong> Medium-term trend; key support/resistance</li>
  <li><strong>200 SMA/EMA:</strong> Long-term trend; major support/resistance level</li>
</ul>
<h3>Moving Average Signals</h3>
<ul>
  <li><strong>Golden Cross:</strong> 50 MA crosses above 200 MA — bullish signal</li>
  <li><strong>Death Cross:</strong> 50 MA crosses below 200 MA — bearish signal</li>
  <li><strong>Price/MA crossover:</strong> Price crossing above MA = buy; below = sell</li>
</ul>`,
        quiz: {
          questions: [
            {
              id: 'q4-4-1',
              question: 'What is the key difference between SMA and EMA?',
              options: [
                'SMA is more accurate than EMA',
                'EMA gives more weight to recent prices',
                'SMA reacts faster to price changes',
                'EMA uses closing prices while SMA uses opening prices',
              ],
              correctAnswer: 1,
              explanation: 'The EMA gives more weight to recent prices, making it more responsive to current market conditions compared to the SMA.',
            },
            {
              id: 'q4-4-2',
              question: 'What is a "Golden Cross"?',
              options: [
                '50 MA crossing below 200 MA',
                '200 MA crossing above 50 MA',
                '50 MA crossing above 200 MA',
                'Price crossing above the 200 MA',
              ],
              correctAnswer: 2,
              explanation: 'A Golden Cross occurs when the 50-period moving average crosses above the 200-period moving average — considered a bullish long-term signal.',
            },
            {
              id: 'q4-4-3',
              question: 'Which moving average period is commonly called the "long-term trend indicator"?',
              options: ['9 EMA', '20 EMA', '50 SMA', '200 SMA'],
              correctAnswer: 3,
              explanation: 'The 200 SMA is widely regarded as the long-term trend indicator and serves as a major support/resistance level watched by institutional traders.',
            },
          ],
        },
      },
      {
        id: 'lesson-4-5',
        moduleId: 'module-4',
        lessonNumber: 5,
        title: 'RSI, MACD & Momentum Indicators',
        description: 'Learn to use RSI, MACD, and Stochastic to identify momentum and overbought/oversold conditions.',
        duration: 22,
        videoTitle: 'RSI MACD Indicators',
        content: `<h2>RSI, MACD & Momentum Indicators</h2>
<p>Momentum indicators measure the speed and change of price movements. They help identify overbought/oversold conditions and potential reversals.</p>
<img src="/images/lessons/rsi-macd-chart.png" alt="EUR/USD chart with RSI and MACD panels showing oversold zone and histogram crossover" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<h3>Relative Strength Index (RSI)</h3>
<p>RSI measures the speed and magnitude of price changes on a scale of 0-100:</p>
<ul>
  <li>Above 70: Overbought (potential reversal/pullback)</li>
  <li>Below 30: Oversold (potential bounce/rally)</li>
  <li>Centerline (50): Bullish/bearish bias</li>
</ul>
<p>Default period: 14. RSI divergence (price makes new high but RSI doesn't) is a powerful reversal signal.</p>
<h3>MACD (Moving Average Convergence Divergence)</h3>
<p>MACD consists of: MACD line (12 EMA - 26 EMA), Signal line (9 EMA of MACD), and Histogram (MACD - Signal).</p>
<ul>
  <li>MACD crossing above signal line: Bullish</li>
  <li>MACD crossing below signal line: Bearish</li>
  <li>Histogram growing: Momentum increasing in direction</li>
</ul>
<h3>Stochastic Oscillator</h3>
<p>Compares closing price to price range over a period (default 14). Above 80 = overbought; below 20 = oversold. %K crossing %D generates buy/sell signals.</p>`,
        quiz: {
          questions: [
            {
              id: 'q4-5-1',
              question: 'An RSI reading of 28 suggests:',
              options: [
                'The asset is overbought',
                'The asset is in a strong uptrend',
                'The asset is oversold',
                'The asset is in a consolidation phase',
              ],
              correctAnswer: 2,
              explanation: 'RSI below 30 indicates oversold conditions, suggesting the asset may be due for a bounce or reversal upward.',
            },
            {
              id: 'q4-5-2',
              question: 'What does "MACD divergence" mean?',
              options: [
                'MACD and price moving in the same direction',
                'Price makes a new high/low but MACD doesn\'t confirm it',
                'MACD crossing above the signal line',
                'MACD staying above zero for an extended period',
              ],
              correctAnswer: 1,
              explanation: 'MACD divergence occurs when price makes a new high/low but MACD doesn\'t confirm it, suggesting the trend may be losing momentum.',
            },
            {
              id: 'q4-5-3',
              question: 'In the MACD formula, what does the MACD line represent?',
              options: [
                '9-period EMA of closing prices',
                'Difference between 12 EMA and 26 EMA',
                'Sum of 12 EMA and 26 EMA',
                '14-period RSI smoothed value',
              ],
              correctAnswer: 1,
              explanation: 'The MACD line is calculated by subtracting the 26-period EMA from the 12-period EMA.',
            },
          ],
        },
      },
      {
        id: 'lesson-4-6',
        moduleId: 'module-4',
        lessonNumber: 6,
        title: 'Fibonacci Retracement & Extensions',
        description: 'Apply Fibonacci levels to identify high-probability support, resistance, and targets.',
        duration: 18,
        videoTitle: 'Fibonacci in Forex Trading',
        content: `<h2>Fibonacci Retracement & Extensions</h2>
<p>Fibonacci analysis is one of the most widely used tools in forex trading, providing objective levels for support, resistance, and profit targets.</p>
<img src="/images/lessons/fibonacci-chart.png" alt="EUR/USD chart with Fibonacci retracement levels from swing low to swing high, 61.8% golden level highlighted" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<h3>The Fibonacci Sequence</h3>
<p>The sequence: 0, 1, 1, 2, 3, 5, 8, 13, 21... where each number is the sum of the two preceding numbers. The key ratio derived from this sequence is 0.618 (the "Golden Ratio").</p>
<h3>Key Fibonacci Retracement Levels</h3>
<ul>
  <li><strong>23.6%:</strong> Shallow retracement; strong trend</li>
  <li><strong>38.2%:</strong> Common retracement in strong trends</li>
  <li><strong>50%:</strong> Not true Fibonacci but widely watched psychological level</li>
  <li><strong>61.8%:</strong> The "golden retracement" — strongest level</li>
  <li><strong>78.6%:</strong> Deep retracement; trend may be weakening</li>
</ul>
<h3>How to Draw Fibonacci</h3>
<p>For an uptrend: draw from swing low to swing high. The levels will show potential support on pullbacks. For downtrend: draw from swing high to swing low.</p>
<h3>Fibonacci Extensions</h3>
<p>Extensions project potential targets beyond the swing high/low:</p>
<ul>
  <li>127.2%: First extension target</li>
  <li>161.8%: Most common target (the Golden Ratio)</li>
  <li>261.8%: Extended move target</li>
</ul>`,
        quiz: {
          questions: [
            {
              id: 'q4-6-1',
              question: 'Which Fibonacci retracement level is known as the "Golden Retracement"?',
              options: ['23.6%', '38.2%', '50%', '61.8%'],
              correctAnswer: 3,
              explanation: 'The 61.8% level, derived from the Golden Ratio, is considered the most significant Fibonacci retracement level.',
            },
            {
              id: 'q4-6-2',
              question: 'How do you draw a Fibonacci retracement in an uptrend?',
              options: [
                'From the most recent high to the current price',
                'From the swing low to the swing high',
                'From the swing high to the swing low',
                'From the 200 MA to the current price',
              ],
              correctAnswer: 1,
              explanation: 'In an uptrend, you draw Fibonacci from the swing low to the swing high to identify potential support levels on pullbacks.',
            },
            {
              id: 'q4-6-3',
              question: 'What is the most common Fibonacci extension target?',
              options: ['100%', '127.2%', '161.8%', '200%'],
              correctAnswer: 2,
              explanation: 'The 161.8% extension (the Golden Ratio) is the most widely used Fibonacci extension target for projecting profit objectives.',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'module-5',
    moduleNumber: 5,
    title: 'Advanced Technical Analysis',
    description: 'Master candlestick patterns, chart patterns, and advanced price action strategies.',
    lessons: [
      {
        id: 'lesson-5-1',
        moduleId: 'module-5',
        lessonNumber: 1,
        title: 'Essential Candlestick Patterns',
        description: 'Master the most reliable candlestick formations and their trading implications.',
        duration: 21,
        videoTitle: 'Candlestick Patterns',
        content: `<h2>Essential Candlestick Patterns</h2>
<p>Candlestick patterns are powerful tools for identifying potential reversals and continuations. Learning to recognize these formations adds an edge to your trading.</p>
<img src="/images/lessons/candle-types-chart.png" alt="Key candlestick types — Doji, Hammer, Shooting Star, Marubozu and Spinning Top on a real EUR/USD chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<h3>Single Candle Patterns</h3>
<ul>
  <li><strong>Doji:</strong> Open = Close; signals indecision. More significant at key support/resistance levels.</li>
  <li><strong>Hammer:</strong> Small body, long lower wick. Bullish reversal at support.</li>
  <li><strong>Shooting Star:</strong> Small body, long upper wick. Bearish reversal at resistance.</li>
  <li><strong>Marubozu:</strong> No wicks; full body candle. Strong directional momentum.</li>
</ul>
<h3>Two-Candle Patterns</h3>
<ul>
  <li><strong>Engulfing Pattern:</strong> Second candle completely engulfs the first. Bullish or bearish depending on direction.</li>
  <li><strong>Tweezer Tops/Bottoms:</strong> Two candles with identical highs (resistance) or lows (support).</li>
</ul>
<h3>Three-Candle Patterns</h3>
<ul>
  <li><strong>Morning Star:</strong> Bearish candle + small indecision candle + bullish candle. Bullish reversal.</li>
  <li><strong>Evening Star:</strong> Bullish candle + small indecision candle + bearish candle. Bearish reversal.</li>
  <li><strong>Three White Soldiers:</strong> Three consecutive bullish candles. Strong uptrend continuation.</li>
</ul>`,
        quiz: {
          questions: [
            {
              id: 'q5-1-1',
              question: 'What does a Doji candlestick indicate?',
              options: [
                'Strong bullish momentum',
                'Strong bearish momentum',
                'Market indecision',
                'A confirmed trend reversal',
              ],
              correctAnswer: 2,
              explanation: 'A Doji forms when the open and close prices are equal or very close, indicating market indecision between buyers and sellers.',
            },
            {
              id: 'q5-1-2',
              question: 'A Hammer candle at a key support level suggests:',
              options: [
                'Continuation of the downtrend',
                'Potential bullish reversal',
                'Neutral market conditions',
                'Breakdown below support',
              ],
              correctAnswer: 1,
              explanation: 'A Hammer at support indicates buyers rejected lower prices (long lower wick), suggesting a potential bullish reversal.',
            },
            {
              id: 'q5-1-3',
              question: 'What makes a bearish engulfing pattern?',
              options: [
                'First candle is bearish, second is bullish',
                'First candle is bullish, second bearish candle completely engulfs it',
                'Two consecutive bearish candles of equal size',
                'A large bullish candle after a downtrend',
              ],
              correctAnswer: 1,
              explanation: 'A bearish engulfing pattern occurs after an uptrend when a large bearish candle completely engulfs the previous bullish candle.',
            },
          ],
        },
      },
      {
        id: 'lesson-5-2',
        moduleId: 'module-5',
        lessonNumber: 2,
        title: 'Chart Patterns: Reversals',
        description: 'Head & Shoulders, Double Top/Bottom, and other powerful reversal chart patterns.',
        duration: 23,
        videoTitle: 'Reversal Chart Patterns',
        content: `<h2>Chart Patterns: Reversals</h2>
<p>Reversal chart patterns signal a potential change in trend direction. These patterns form over extended periods and offer significant profit potential when traded correctly.</p>
<img src="/images/lessons/head-shoulders-chart.png" alt="Head and Shoulders pattern with left shoulder, head, right shoulder, neckline, and measured target" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<h3>Head and Shoulders</h3>
<p>One of the most reliable reversal patterns:</p>
<ul>
  <li>Left shoulder: Price rises and falls</li>
  <li>Head: Price rises above left shoulder and falls</li>
  <li>Right shoulder: Price rises to approximately left shoulder level and falls</li>
  <li>Neckline: Support connecting the two lows</li>
  <li>Entry: Short when price breaks below neckline</li>
  <li>Target: Measured from head to neckline, projected downward</li>
</ul>
<h3>Double Top</h3>
<p>Bearish reversal: Price hits resistance twice at approximately the same level, forming an "M" shape. Confirmed when price breaks the neckline (the low between the two tops).</p>
<h3>Double Bottom</h3>
<p>Bullish reversal: Price hits support twice at approximately the same level, forming a "W" shape. Confirmed when price breaks the neckline (the high between the two bottoms).</p>
<h3>Triple Top/Bottom</h3>
<p>Similar to double top/bottom but with three tests of the level. Considered a stronger signal due to three confirmations.</p>`,
        quiz: {
          questions: [
            {
              id: 'q5-2-1',
              question: 'In a Head and Shoulders pattern, where is the entry point for a short trade?',
              options: [
                'At the right shoulder peak',
                'At the head peak',
                'When price breaks below the neckline',
                'After the left shoulder',
              ],
              correctAnswer: 2,
              explanation: 'The entry for a Head and Shoulders short trade is when price breaks below the neckline, confirming the reversal.',
            },
            {
              id: 'q5-2-2',
              question: 'A Double Bottom pattern signals:',
              options: [
                'A bearish trend continuation',
                'A potential bullish reversal',
                'A trading range will continue',
                'A strong downtrend',
              ],
              correctAnswer: 1,
              explanation: 'A Double Bottom (W shape) is a bullish reversal pattern indicating the price has found support at the same level twice.',
            },
            {
              id: 'q5-2-3',
              question: 'How is the price target calculated for a Head and Shoulders pattern?',
              options: [
                'Equal to the distance of the left shoulder',
                'The distance from head to neckline, projected downward from neckline',
                'Double the height of the right shoulder',
                'Equal to the previous trend length',
              ],
              correctAnswer: 1,
              explanation: 'The Head and Shoulders target is calculated by measuring the distance from the head to the neckline and projecting that distance downward from the neckline breakout.',
            },
          ],
        },
      },
      {
        id: 'lesson-5-3',
        moduleId: 'module-5',
        lessonNumber: 3,
        title: 'Chart Patterns: Continuations',
        description: 'Flags, pennants, triangles, and wedges — trade the trend continuation patterns.',
        duration: 20,
        videoTitle: 'Continuation Chart Patterns',
        content: `<h2>Chart Patterns: Continuations</h2>
<p>Continuation patterns signal a temporary pause in the existing trend before the price resumes in the original direction. They offer low-risk entry points within an established trend.</p>
<img src="/images/lessons/chart-patterns-chart.png" alt="Bull flag, ascending triangle and continuation patterns on a real forex chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<h3>Flags & Pennants</h3>
<p>Form after a sharp, near-vertical price move (the flagpole):</p>
<ul>
  <li><strong>Bull Flag:</strong> Price consolidates in a slight downward channel after a sharp rise. Breakout to upside expected.</li>
  <li><strong>Bear Flag:</strong> Price consolidates in a slight upward channel after a sharp drop. Breakout to downside expected.</li>
  <li><strong>Pennant:</strong> Similar to flag but consolidation is triangular (converging lines).</li>
</ul>
<h3>Triangles</h3>
<ul>
  <li><strong>Symmetrical Triangle:</strong> Converging trend lines; breakout can go either way but tends to continue the prior trend.</li>
  <li><strong>Ascending Triangle:</strong> Flat resistance, rising support. Bullish; expect upside breakout.</li>
  <li><strong>Descending Triangle:</strong> Flat support, falling resistance. Bearish; expect downside breakout.</li>
</ul>
<h3>Wedges</h3>
<ul>
  <li><strong>Rising Wedge:</strong> Both lines slope upward but converge. Bearish — signals eventual downside breakout.</li>
  <li><strong>Falling Wedge:</strong> Both lines slope downward and converge. Bullish — signals eventual upside breakout.</li>
</ul>`,
        quiz: {
          questions: [
            {
              id: 'q5-3-1',
              question: 'A Bull Flag pattern is characterized by:',
              options: [
                'A sharp decline followed by upward consolidation',
                'A sharp rise followed by a slight downward consolidation',
                'A gradual rise with flat tops',
                'Two equal highs with a pullback between them',
              ],
              correctAnswer: 1,
              explanation: 'A Bull Flag forms when a sharp price rise (flagpole) is followed by a slight downward consolidation channel (flag), before resuming the uptrend.',
            },
            {
              id: 'q5-3-2',
              question: 'An Ascending Triangle pattern suggests:',
              options: [
                'A downside breakout is likely',
                'An upside breakout is likely',
                'Price will remain in the range',
                'A trend reversal is imminent',
              ],
              correctAnswer: 1,
              explanation: 'An Ascending Triangle has flat resistance and rising support — buyers are getting more aggressive over time, suggesting an upside breakout.',
            },
            {
              id: 'q5-3-3',
              question: 'A Rising Wedge is considered:',
              options: ['Bullish continuation', 'Bearish signal', 'Neutral/sideways signal', 'Only valid in uptrends'],
              correctAnswer: 1,
              explanation: 'A Rising Wedge is bearish despite appearing to trend upward — the converging lines suggest weakening momentum and typically precede a downside breakout.',
            },
          ],
        },
      },
      {
        id: 'lesson-5-4',
        moduleId: 'module-5',
        lessonNumber: 4,
        title: 'Price Action Trading',
        description: 'Trade purely from candlestick and chart patterns without relying on indicators.',
        duration: 25,
        videoTitle: 'Price Action Trading',
        content: `<h2>Price Action Trading</h2>
<p>Price action trading is the discipline of making trading decisions based solely on price movements, without relying on lagging indicators. Many professional traders consider it the purest form of technical analysis.</p>
<img src="/images/lessons/price-action-chart.png" alt="GBP/USD chart showing bullish pin bar at support, inside bar consolidation, and bearish engulfing at resistance" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<h3>Core Principles</h3>
<ul>
  <li>Price reflects all available information</li>
  <li>Historical price patterns tend to repeat</li>
  <li>Price action reveals the battle between buyers and sellers</li>
</ul>
<h3>Key Price Action Concepts</h3>
<h4>Pin Bars</h4>
<p>Long wick candles that "pin" away from a key level. Bullish pin bar at support: long lower wick, small body near top. One of the most reliable price action signals.</p>
<h4>Inside Bars</h4>
<p>A candle whose entire range is within the previous candle. Signals consolidation; breakout direction often continues the prior trend.</p>
<h4>Outside Bars</h4>
<p>A candle that engulfs the previous candle's range. Can signal reversal or continuation depending on context.</p>
<h3>The Importance of Context</h3>
<p>Price action signals are only meaningful in context:</p>
<ul>
  <li>What timeframe are you on?</li>
  <li>Where is the pattern forming (support/resistance/trend line)?</li>
  <li>What is the broader market trend?</li>
  <li>Is there confluence with other analysis?</li>
</ul>`,
        quiz: {
          questions: [
            {
              id: 'q5-4-1',
              question: 'What defines a bullish Pin Bar?',
              options: [
                'Large body with no wicks',
                'Long upper wick, small body near the bottom',
                'Long lower wick, small body near the top',
                'Equal upper and lower wicks',
              ],
              correctAnswer: 2,
              explanation: 'A bullish Pin Bar has a long lower wick (rejecting lower prices) and a small body near the top, typically at support.',
            },
            {
              id: 'q5-4-2',
              question: 'An Inside Bar pattern signals:',
              options: [
                'Immediate trend reversal',
                'Strong directional momentum',
                'Consolidation before a potential breakout',
                'Price will stay flat indefinitely',
              ],
              correctAnswer: 2,
              explanation: 'An Inside Bar indicates market consolidation and indecision, often preceding a breakout in the direction of the prior trend.',
            },
            {
              id: 'q5-4-3',
              question: 'Why is "context" important in price action trading?',
              options: [
                'Patterns work the same regardless of where they form',
                'Context is not important — patterns always have the same outcome',
                'The location and market context determines whether a pattern is valid',
                'Context only matters for fundamental analysis',
              ],
              correctAnswer: 2,
              explanation: 'Price action patterns have much higher probability when they occur at key levels (support/resistance) in the context of the broader trend.',
            },
          ],
        },
      },
      {
        id: 'lesson-5-5',
        moduleId: 'module-5',
        lessonNumber: 5,
        title: 'Bollinger Bands & Volatility',
        description: 'Use Bollinger Bands to measure volatility and identify breakout and mean-reversion opportunities.',
        duration: 17,
        videoTitle: 'Bollinger Bands Trading',
        content: `<h2>Bollinger Bands & Volatility</h2>
<p>Bollinger Bands, developed by John Bollinger, are a volatility indicator that adapts to market conditions. They consist of three bands that expand during high volatility and contract during low volatility.</p>
<img src="/images/lessons/bollinger-bands-chart.png" alt="USD/JPY chart with Bollinger Bands showing squeeze zone and explosive breakout" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<h3>Construction</h3>
<ul>
  <li><strong>Middle Band:</strong> 20-period SMA</li>
  <li><strong>Upper Band:</strong> Middle Band + 2 standard deviations</li>
  <li><strong>Lower Band:</strong> Middle Band - 2 standard deviations</li>
</ul>
<p>Statistically, ~95% of price action should fall within the bands.</p>
<h3>Key Strategies</h3>
<h4>The Squeeze</h4>
<p>When bands contract significantly (low volatility), a major breakout is imminent. The direction of the breakout determines the trade direction.</p>
<h4>Band Touch Strategy</h4>
<p>In ranging markets, price touching the upper band signals potential reversal to the downside; touching the lower band signals potential bounce upward.</p>
<h4>Riding the Bands</h4>
<p>In strong trends, price can "ride" the upper or lower band for extended periods. This is a continuation signal, not a reversal.</p>
<h3>Bollinger Band Width</h3>
<p>Measures the width of the bands as a percentage of the middle band. Low width = low volatility (potential breakout coming). High width = high volatility (potential mean reversion).</p>`,
        quiz: {
          questions: [
            {
              id: 'q5-5-1',
              question: 'How are the upper and lower Bollinger Bands calculated?',
              options: [
                '10 pips above and below the 20 SMA',
                '20 SMA ± 2 standard deviations',
                '50 SMA ± 1 standard deviation',
                'Based on the ATR (Average True Range)',
              ],
              correctAnswer: 1,
              explanation: 'Bollinger Bands are calculated as the 20-period SMA (middle band) plus or minus 2 standard deviations.',
            },
            {
              id: 'q5-5-2',
              question: 'What does a "Bollinger Band Squeeze" indicate?',
              options: [
                'The trend is strongly established',
                'Low volatility period; major breakout likely',
                'The market is ranging and will continue',
                'Overbought/oversold conditions',
              ],
              correctAnswer: 1,
              explanation: 'A Bollinger Band Squeeze (bands contracting) indicates a period of low volatility, which typically precedes a significant price breakout.',
            },
            {
              id: 'q5-5-3',
              question: 'In a strong uptrend, price repeatedly touching the upper Bollinger Band suggests:',
              options: [
                'Immediate reversal is coming',
                'The market is overbought',
                'The trend is strong; price is "riding" the band',
                'It\'s time to sell',
              ],
              correctAnswer: 2,
              explanation: 'In strong trends, price can "ride" the upper or lower band for extended periods — this is a continuation signal, not a reversal.',
            },
          ],
        },
      },
      {
        id: 'lesson-5-6',
        moduleId: 'module-5',
        lessonNumber: 6,
        title: 'Multi-Timeframe Analysis',
        description: 'Combine multiple timeframes to find high-probability trade setups with maximum confluence.',
        duration: 20,
        videoTitle: 'Multi-Timeframe Analysis',
        content: `<h2>Multi-Timeframe Analysis</h2>
<p>Multi-timeframe analysis (MTFA) is the practice of analyzing the same currency pair on different timeframes to get a complete picture of the market. It's one of the most powerful techniques in technical trading.</p>
<img src="/images/lessons/trends-chart.png" alt="Three forex charts showing uptrend, downtrend and ranging across different timeframes" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<h3>The Timeframe Hierarchy</h3>
<p>Common MTFA framework (top-down):</p>
<ol>
  <li><strong>Higher Timeframe (HTF):</strong> Monthly/Weekly — Identify the major trend</li>
  <li><strong>Mid Timeframe:</strong> Daily/4H — Find key support/resistance and trade setup</li>
  <li><strong>Lower Timeframe (LTF):</strong> 1H/15M — Fine-tune entry and exit</li>
</ol>
<h3>The Rule of Alignment</h3>
<p>Only take trades when all timeframes are aligned in the same direction. A buy signal on the 15M chart is much more powerful when the 4H and Daily charts are also bullish.</p>
<h3>Practical Application</h3>
<ul>
  <li>Start on the weekly or daily to identify the dominant trend</li>
  <li>Move to the 4H to find key levels and potential setups</li>
  <li>Use the 1H or 15M for precise entry, stop loss placement</li>
</ul>
<h3>Confluence</h3>
<p>The more factors align (MTFA + support/resistance + Fibonacci + candlestick pattern + indicator signal), the higher the probability of the trade working. Always seek maximum confluence before entering.</p>`,
        quiz: {
          questions: [
            {
              id: 'q5-6-1',
              question: 'In multi-timeframe analysis, which timeframe is used to identify the major trend?',
              options: [
                '15-minute chart',
                '1-hour chart',
                'Weekly or daily chart',
                '5-minute chart',
              ],
              correctAnswer: 2,
              explanation: 'The higher timeframes (weekly/daily) are used to identify the major trend direction before drilling down to lower timeframes for entries.',
            },
            {
              id: 'q5-6-2',
              question: 'What does "confluence" mean in trading?',
              options: [
                'Two traders agreeing on a direction',
                'Multiple analysis factors pointing to the same conclusion',
                'Using multiple indicators from the same category',
                'Following the majority of traders',
              ],
              correctAnswer: 1,
              explanation: 'Confluence refers to multiple independent analysis factors (timeframes, levels, indicators, patterns) all pointing to the same trade direction.',
            },
            {
              id: 'q5-6-3',
              question: 'What is the "Rule of Alignment" in MTFA?',
              options: [
                'Always trade in the direction of the 5-minute chart',
                'Only take trades when all timeframes point the same direction',
                'Align your trades with central bank policy',
                'Use the same indicator on all timeframes',
              ],
              correctAnswer: 1,
              explanation: 'The Rule of Alignment states that you should only take trades when the analysis on all relevant timeframes is pointing in the same direction.',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'module-6',
    moduleNumber: 6,
    title: 'Risk Management & Position Sizing',
    description: 'The most critical module: protecting your capital through proper risk management techniques.',
    lessons: [
      {
        id: 'lesson-6-1',
        moduleId: 'module-6',
        lessonNumber: 1,
        title: 'The Importance of Risk Management',
        description: 'Why risk management is more important than any trading strategy.',
        duration: 14,
        videoTitle: 'Risk Management Foundation',
        content: `<img src="/images/lessons/bull-bear-market.png" alt="Bull Market vs Bear Market — rising and falling price trends" style="width:100%;border-radius:8px;margin-bottom:20px;" />
<h2>Risk Management — The Rule That Keeps You In the Game</h2>
<p>You could have the best trading strategy in the world, but without risk management you will eventually blow up your account. This lesson is more important than any indicator or chart pattern. It's the difference between traders who last and traders who quit.</p>

<div style="background:rgba(245,197,24,0.1);border-left:4px solid #f5c518;padding:14px 18px;border-radius:6px;margin:18px 0;">
  <strong style="color:#f5c518;">🎯 The Maths of Losses</strong><br/>
  Lose 10% → need 11% to recover. Easy.<br/>
  Lose 25% → need 33% to recover. Harder.<br/>
  Lose 50% → need 100% to recover. Very hard.<br/>
  Lose 75% → need 300% to recover. Almost impossible.<br/>
  <strong>This is why protecting your account matters more than chasing wins.</strong>
</div>

<h3>Understanding Bull and Bear Markets</h3>
<p>Before managing risk, you need to know what type of market you're in:</p>
<ul>
  <li><strong>🐂 Bull Market</strong> — prices are rising over time. EUR/USD making higher highs and higher lows. Bias: buy the dips.</li>
  <li><strong>🐻 Bear Market</strong> — prices are falling over time. EUR/USD making lower highs and lower lows. Bias: sell the rallies.</li>
</ul>
<p>Trading against the trend is the most common beginner mistake. In forex, you can profit in <em>both</em> directions — but only if you trade WITH the current direction.</p>

<h3>The 1–2% Rule — Your Safety Net</h3>
<p>The golden rule of risk management: <strong>never risk more than 1–2% of your account on any single trade.</strong></p>
<ul>
  <li>Account = £1,000 → max risk per trade = £10–£20</li>
  <li>Account = £5,000 → max risk per trade = £50–£100</li>
</ul>
<p>Why? Because even the best traders have losing streaks. With 1% risk, you can lose 20 trades in a row and still have 82% of your account left. With 10% risk, 10 losses = account gone.</p>

<div style="background:rgba(38,166,154,0.1);border-left:4px solid #26a69a;padding:14px 18px;border-radius:6px;margin:18px 0;">
  <strong style="color:#26a69a;">✅ The Simple Plan</strong><br/>
  1. Decide your stop loss in pips before you enter<br/>
  2. Calculate: how many pips × pip value = your £ risk<br/>
  3. If that £ risk exceeds 2% of your account → reduce lot size<br/>
  4. Never skip this calculation. Ever.
</div>`,
        quiz: {
          questions: [
            {
              id: 'q6-1-1',
              question: 'If you lose 50% of your account, what return do you need to get back to breakeven?',
              options: ['50%', '75%', '100%', '150%'],
              correctAnswer: 2,
              explanation: 'If you lose 50% ($10,000 becomes $5,000), you need a 100% return on the remaining $5,000 to get back to $10,000.',
            },
            {
              id: 'q6-1-2',
              question: 'What is the commonly recommended maximum risk per trade?',
              options: ['5-10%', '3-5%', '1-2%', '10-20%'],
              correctAnswer: 2,
              explanation: 'Professional traders typically risk no more than 1-2% of their account per trade to ensure capital survival through losing streaks.',
            },
            {
              id: 'q6-1-3',
              question: 'What should be a trader\'s primary goal?',
              options: [
                'Maximizing profits in the shortest time',
                'Capital preservation first, profits follow',
                'Never closing a trade at a loss',
                'Trading the maximum position size',
              ],
              correctAnswer: 1,
              explanation: 'Capital preservation is the primary goal — protecting what you have ensures you remain in the game to capitalize on opportunities.',
            },
          ],
        },
      },
      {
        id: 'lesson-6-2',
        moduleId: 'module-6',
        lessonNumber: 2,
        title: 'Stop Loss Strategies',
        description: 'How to place intelligent stop losses that protect capital without being stopped out prematurely.',
        duration: 19,
        videoTitle: 'Stop Loss Placement',
        content: `<img src="/images/lessons/stop-loss-visual.png" alt="Stop Loss and Take Profit on a live chart" style="width:100%;border-radius:8px;margin-bottom:20px;" />
<h2>Stop Loss — Your Safety Net on Every Trade</h2>
<p>A <strong>stop loss</strong> is an automatic instruction to your broker: "If the price hits this level, close my trade and cap my loss." It's not a sign of weakness — it's the single most important tool in your arsenal. <strong>Never open a trade without one.</strong></p>

<div style="background:rgba(245,197,24,0.1);border-left:4px solid #f5c518;padding:14px 18px;border-radius:6px;margin:18px 0;">
  <strong style="color:#f5c518;">🛡️ Seatbelt Analogy</strong><br/>
  You don't put on a seatbelt because you plan to crash — you wear it in case something unexpected happens. A stop loss is exactly the same. Every trade is safe until it isn't.
</div>

<h3>How to Place a Stop Loss — Step by Step</h3>
<ol>
  <li><strong>Find your entry signal</strong> (e.g., EUR/USD breakout above resistance at 1.0800)</li>
  <li><strong>Identify the "invalidation level"</strong> — where does your trade idea become wrong? (e.g., if price falls back below 1.0755, the breakout failed)</li>
  <li><strong>Place your stop just past that level</strong> — stop at 1.0750, giving 5 pips of buffer</li>
  <li><strong>Calculate your risk</strong> — entry (1.0800) to stop (1.0750) = 50 pips. At micro lot = $5 risk.</li>
  <li><strong>Set your take profit</strong> — at minimum 2× the stop distance (100 pips above entry = 1.0900)</li>
</ol>

<h3>Three Ways to Place a Stop</h3>
<ul>
  <li><strong>Technical Stop</strong> — below the last swing low (for buys) or above the last swing high (for sells). The best method. Your trade is wrong if that level breaks.</li>
  <li><strong>ATR Stop</strong> — 1.5× the Average True Range. Gives the trade room to breathe based on normal daily volatility.</li>
  <li><strong>Fixed Pip Stop</strong> — e.g., always 30 pips. Simple, but ignores market conditions. Better than nothing.</li>
</ul>

<h3>Trailing Stops — Locking In Profit</h3>
<p>As your trade moves into profit, you can move the stop loss up (for buys) to lock in gains. If price moves 50 pips for you, move stop to break even. Another 50 pips → move stop to +25 pips. Now you can't lose!</p>

<div style="background:rgba(239,83,80,0.1);border-left:4px solid #ef5350;padding:14px 18px;border-radius:6px;margin:18px 0;">
  <strong style="color:#ef5350;">⚠ The Cardinal Sin</strong><br/>
  Never move your stop loss further away to "give it more room." This turns a small loss into a catastrophic one. If the stop gets hit, the trade was wrong. Accept it, learn from it, move on.
</div>`,
        quiz: {
          questions: [
            {
              id: 'q6-2-1',
              question: 'What is a "technical stop loss"?',
              options: [
                'A stop placed at a fixed percentage from entry',
                'A stop placed beyond a key technical level',
                'A stop managed by automated software',
                'A stop based on ATR calculation',
              ],
              correctAnswer: 1,
              explanation: 'A technical stop is placed beyond a key technical level (support, resistance, swing high/low) — if that level breaks, the trade thesis is invalidated.',
            },
            {
              id: 'q6-2-2',
              question: 'What does a "trailing stop" do?',
              options: [
                'Stays fixed at the original stop level',
                'Moves in your favor to lock in profits',
                'Widens as the market moves against you',
                'Closes the trade at a specific profit level',
              ],
              correctAnswer: 1,
              explanation: 'A trailing stop moves in your favor as the trade profits, locking in gains while allowing the trade to continue if the trend continues.',
            },
            {
              id: 'q6-2-3',
              question: 'What is a "stop hunt"?',
              options: [
                'Looking for trades with tight stop losses',
                'Large players driving price to retail stop clusters then reversing',
                'Using multiple stop losses on one trade',
                'Searching for a good stop loss level',
              ],
              correctAnswer: 1,
              explanation: 'A stop hunt occurs when large institutional traders drive price to obvious stop loss levels (where retail stops cluster) before reversing, filling their own orders at better prices.',
            },
          ],
        },
      },
      {
        id: 'lesson-6-3',
        moduleId: 'module-6',
        lessonNumber: 3,
        title: 'Position Sizing',
        description: 'Calculate the correct lot size for any trade based on your risk tolerance and stop distance.',
        duration: 21,
        videoTitle: 'Position Sizing Formula',
        content: `<h2>Position Sizing</h2>
<p>Position sizing determines how many lots to trade based on your account size, risk percentage, and stop loss distance. Getting this right is fundamental to long-term survival.</p>
<h3>The Position Sizing Formula</h3>
<div style="background:rgba(30,37,56,0.9);border-left:3px solid #f5c518;border-radius:6px;padding:1rem 1.25rem;margin:1rem 0;font-family:'Roboto Mono','Courier New',monospace;font-size:0.9rem;color:#d1d4dc;line-height:1.8">
  Risk Amount = Account Balance × Risk %<br/>
  Pip Value &nbsp;= Risk Amount ÷ Stop Loss (pips)<br/>
  Lot Size &nbsp;&nbsp;= Pip Value ÷ Pip value per lot
</div>
<h3>Example Calculation</h3>
<p>Account: $10,000 | Risk: 1% | Stop: 50 pips | EUR/USD standard lot pip value = $10</p>
<ul>
  <li>Risk Amount: $10,000 × 1% = $100</li>
  <li>Pip Value needed: $100 ÷ 50 = $2 per pip</li>
  <li>Lot Size: $2 ÷ $10 = 0.2 lots (2 mini lots)</li>
</ul>
<h3>Fixed Fractional Position Sizing</h3>
<p>Risk a fixed fraction (e.g., 1%) of your current account balance on every trade. As your account grows, position sizes grow. As it shrinks, positions shrink automatically — protecting your capital during losing streaks.</p>
<h3>The Kelly Criterion</h3>
<p>A mathematical formula for optimal position sizing: f = (bp - q) / b, where b = win/loss ratio, p = win probability, q = loss probability. In practice, use half-Kelly or less to reduce volatility.</p>`,
        quiz: {
          questions: [
            {
              id: 'q6-3-1',
              question: 'Account: $5,000. Risk: 2%. Stop loss: 40 pips. EUR/USD pip value = $10/lot. What lot size?',
              options: ['0.1 lots', '0.25 lots', '0.5 lots', '1 lot'],
              correctAnswer: 1,
              explanation: 'Risk Amount = $5,000 × 2% = $100. Pip value needed = $100 ÷ 40 pips = $2.50/pip. Lot size = $2.50 ÷ $10 = 0.25 lots.',
            },
            {
              id: 'q6-3-2',
              question: 'In fixed fractional position sizing, what happens as your account grows?',
              options: [
                'Position size stays the same',
                'Position size decreases',
                'Position size grows proportionally',
                'You switch to fixed lot sizing',
              ],
              correctAnswer: 2,
              explanation: 'Fixed fractional sizing means you risk a fixed % of the current balance, so as the account grows, position sizes grow proportionally.',
            },
            {
              id: 'q6-3-3',
              question: 'Why is correct position sizing more important than entry timing?',
              options: [
                'It isn\'t — entry timing is more important',
                'It determines whether you survive losing streaks',
                'It eliminates the need for stop losses',
                'It guarantees profitable trades',
              ],
              correctAnswer: 1,
              explanation: 'Correct position sizing determines whether you survive inevitable losing streaks while keeping your account intact to capitalize on winning trades.',
            },
          ],
        },
      },
      {
        id: 'lesson-6-4',
        moduleId: 'module-6',
        lessonNumber: 4,
        title: 'Risk/Reward Ratio',
        description: 'How to evaluate and only take trades with a favorable risk/reward ratio.',
        duration: 15,
        videoTitle: 'Risk Reward Ratios',
        content: `<img src="/images/lessons/risk-reward-visual.png" alt="Risk Reward Ratio — 1:2 trade setup on EUR/USD" style="width:100%;border-radius:8px;margin-bottom:20px;" />
<h2>Risk : Reward — Why You Can Lose More Than You Win and Still Make Money</h2>
<p>Here's a secret that surprises most beginners: <strong>you don't need to win most of your trades to be profitable</strong>. What matters is how big your wins are compared to your losses. This is the risk:reward ratio.</p>

<div style="background:rgba(245,197,24,0.1);border-left:4px solid #f5c518;padding:14px 18px;border-radius:6px;margin:18px 0;">
  <strong style="color:#f5c518;">🎯 Sports Analogy</strong><br/>
  Imagine a penalty shootout where you score 3 goals but miss 6. Normally you'd lose. But what if each goal you score counts as 3 points and each miss only -1? 3×3 = 9 points for goals, 6×1 = 6 points lost = you're +3! That's how good risk:reward works.
</div>

<h3>How to Calculate Risk:Reward</h3>
<p>For a trade on EUR/USD:</p>
<ul>
  <li>Entry: 1.0780</li>
  <li>Stop Loss: 1.0735 (45 pips risk)</li>
  <li>Take Profit: 1.0870 (90 pips reward)</li>
  <li>Risk:Reward = 45 : 90 = <strong>1:2</strong></li>
</ul>
<p>With 1:2 R:R, you only need to win <strong>34% of your trades</strong> to break even. Win 40% and you're profitable.</p>

<h3>Win Rate Needed to Break Even</h3>
<ul>
  <li><strong>1:1 R:R</strong> — need to win 50% of trades — very tough long-term</li>
  <li><strong>1:2 R:R</strong> — need to win only 34% — achievable for beginners</li>
  <li><strong>1:3 R:R</strong> — need to win only 25% — excellent edge</li>
</ul>

<h3>Setting Your Take Profit</h3>
<ul>
  <li>Place take profit at the next major resistance level (for buys) or support level (for sells)</li>
  <li>Minimum rule: take profit must always be at least 2× your stop loss distance</li>
  <li>If you can't find a logical target at 2:1+, <strong>skip the trade</strong></li>
</ul>

<div style="background:rgba(38,166,154,0.1);border-left:4px solid #26a69a;padding:14px 18px;border-radius:6px;margin:18px 0;">
  <strong style="color:#26a69a;">✅ The Golden Rule</strong><br/>
  Before entering any trade, ask: "If I risk £X, can I realistically target £2X or more?" If the answer is no — skip it. There is always another trade coming.
</div>`,
        quiz: {
          questions: [
            {
              id: 'q6-4-1',
              question: 'If you risk 30 pips and target 90 pips, what is your R:R ratio?',
              options: ['1:1', '2:1', '3:1', '1:3'],
              correctAnswer: 2,
              explanation: 'R:R = 90 ÷ 30 = 3:1. For every pip you risk, you target 3 pips in profit.',
            },
            {
              id: 'q6-4-2',
              question: 'With a 3:1 R:R, what minimum win rate do you need to be profitable?',
              options: ['50%', '40%', '25%', '34%'],
              correctAnswer: 2,
              explanation: 'With 3:1 R:R, you only need a 25% win rate to break even: (0.25 × 3) - (0.75 × 1) = 0.75 - 0.75 = 0.',
            },
            {
              id: 'q6-4-3',
              question: 'What does "expectancy" measure in trading?',
              options: [
                'How often you win',
                'The average profit per trade over time',
                'The maximum drawdown expected',
                'The number of trades per month',
              ],
              correctAnswer: 1,
              explanation: 'Expectancy measures the average profit (or loss) you can expect per trade over a large sample, combining win rate and win/loss sizes.',
            },
          ],
        },
      },
      {
        id: 'lesson-6-5',
        moduleId: 'module-6',
        lessonNumber: 5,
        title: 'Drawdown & Account Recovery',
        description: 'Understand drawdown, its psychological impact, and strategies for recovery.',
        duration: 16,
        videoTitle: 'Managing Drawdown',
        content: `<h2>Drawdown & Account Recovery</h2>
<p>Drawdown is the peak-to-trough decline in your account balance during a specific period. Every trader — including the best in the world — experiences drawdowns. How you handle them defines your long-term success.</p>
<h3>Types of Drawdown</h3>
<ul>
  <li><strong>Absolute Drawdown:</strong> Decline from initial capital</li>
  <li><strong>Maximum Drawdown (MDD):</strong> Largest peak-to-trough decline in account history</li>
  <li><strong>Relative Drawdown:</strong> MDD expressed as percentage of peak balance</li>
</ul>
<h3>Expected Drawdown</h3>
<p>Even a system with 60% win rate and 2:1 R:R will experience significant drawdowns. A 10-loss streak has 0.4^10 = 0.01% probability — rare but it happens. With 1% risk per trade, this is a 10% drawdown — painful but survivable.</p>
<h3>Drawdown Recovery Rules</h3>
<ul>
  <li>10% drawdown: Continue trading normally, review strategy</li>
  <li>15% drawdown: Reduce position size by 50%</li>
  <li>20% drawdown: Stop trading; take a break and review</li>
  <li>25%+ drawdown: Major strategy review required</li>
</ul>
<h3>The Psychology of Drawdown</h3>
<p>Drawdowns test your psychology more than your strategy. Revenge trading (increasing size to recover faster) is the most dangerous response. It almost always makes things worse.</p>`,
        quiz: {
          questions: [
            {
              id: 'q6-5-1',
              question: 'What is Maximum Drawdown (MDD)?',
              options: [
                'The largest single trade loss',
                'The largest peak-to-trough account decline in history',
                'The daily loss limit set by your broker',
                'The average loss per trade',
              ],
              correctAnswer: 1,
              explanation: 'Maximum Drawdown is the largest peak-to-trough decline in account balance over the measurement period.',
            },
            {
              id: 'q6-5-2',
              question: 'What should you do when experiencing a 20% account drawdown?',
              options: [
                'Double position sizes to recover faster',
                'Switch to a completely different strategy',
                'Stop trading, take a break, and review',
                'Increase trading frequency',
              ],
              correctAnswer: 2,
              explanation: 'At 20% drawdown, you should stop trading, take a break, and thoroughly review your trading to identify what went wrong.',
            },
            {
              id: 'q6-5-3',
              question: 'What is "revenge trading"?',
              options: [
                'Shorting a currency that recently rose against you',
                'Increasing position size after losses to recover faster',
                'Trading the opposite direction of your previous trade',
                'Taking trades to compensate for missed opportunities',
              ],
              correctAnswer: 1,
              explanation: 'Revenge trading is increasing position size after losses in an attempt to recover quickly — it almost always compounds losses and is driven by emotion, not logic.',
            },
          ],
        },
      },
      {
        id: 'lesson-6-6',
        moduleId: 'module-6',
        lessonNumber: 6,
        title: 'Portfolio Risk & Correlation Management',
        description: 'Manage risk across multiple open positions accounting for currency correlations.',
        duration: 14,
        videoTitle: 'Portfolio Risk Management',
        content: `<h2>Portfolio Risk & Correlation Management</h2>
<p>When you have multiple open positions, your total portfolio risk may be greater than the sum of individual position risks — especially if positions are correlated.</p>
<h3>Total Portfolio Risk</h3>
<p>Uncorrelated positions: Total Risk ≈ Sum of individual risks. Correlated positions: Total Risk > Sum of individual risks. Example: 1% risk on EUR/USD + 1% risk on GBP/USD = effectively 2% exposure to USD weakness (not 1+1 = 2% in different risks).</p>
<h3>Managing Correlated Positions</h3>
<ul>
  <li>Treat highly correlated pairs as one position for risk purposes</li>
  <li>If EUR/USD and GBP/USD correlation = 0.9, split 1% total risk between them (0.5% each)</li>
  <li>Seek uncorrelated positions to achieve true diversification</li>
</ul>
<h3>Maximum Open Risk</h3>
<p>Limit total open risk across all positions to 3-5% of account. This prevents a sequence of correlated losses from devastating your account.</p>
<h3>Daily Loss Limits</h3>
<p>Set a daily loss limit (e.g., 3% of account). If hit, stop trading for the day. Bad trading days are often clustered — stopping early prevents larger losses from cascading.</p>`,
        quiz: {
          questions: [
            {
              id: 'q6-6-1',
              question: 'Why does holding both EUR/USD long and GBP/USD long increase correlated risk?',
              options: [
                'They use the same base currency',
                'Both positions have USD exposure going in the same direction',
                'GBP and EUR are the same currency',
                'These positions never correlate',
              ],
              correctAnswer: 1,
              explanation: 'Both EUR/USD long and GBP/USD long require USD weakness to profit — they\'re correlated through USD exposure, making your effective USD risk larger than intended.',
            },
            {
              id: 'q6-6-2',
              question: 'What is the recommended maximum total open risk across all positions?',
              options: ['1-2%', '3-5%', '10-15%', '20%'],
              correctAnswer: 1,
              explanation: 'Limiting total open risk to 3-5% prevents correlated losses from causing catastrophic account damage.',
            },
            {
              id: 'q6-6-3',
              question: 'What is the purpose of a daily loss limit?',
              options: [
                'To comply with broker regulations',
                'To prevent cascading losses during bad trading days',
                'To limit your trading profits',
                'Required for all ECN accounts',
              ],
              correctAnswer: 1,
              explanation: 'Daily loss limits prevent cascading losses — bad trading days often cluster, and stopping early preserves capital for better conditions.',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'module-7',
    moduleNumber: 7,
    title: 'Trading Strategies',
    description: 'Proven forex trading strategies from scalping to swing trading and beyond.',
    lessons: [
      {
        id: 'lesson-7-1',
        moduleId: 'module-7',
        lessonNumber: 1,
        title: 'Trend Following Strategies',
        description: 'Trade with the momentum by identifying and following established market trends.',
        duration: 20,
        videoTitle: 'Trend Following in Forex',
        content: `<h2>Trend Following Strategies</h2>
<p>Trend following is arguably the most reliable approach in forex trading. The core premise: identify a strong trend and trade in its direction until clear signs of reversal.</p>
<img src="/images/lessons/moving-averages-chart.png" alt="EUR/USD chart showing EMA 20 and EMA 50 trend-following system with golden cross and pullback entry" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<h3>The Moving Average Trend System</h3>
<p>Simple but effective: Use 20 EMA and 50 EMA. When 20 EMA > 50 EMA and price is above both: uptrend, look for longs. When 20 EMA < 50 EMA and price is below both: downtrend, look for shorts.</p>
<h3>Trend Entry Techniques</h3>
<ul>
  <li><strong>Pullback Entry:</strong> Wait for price to pull back to the 20 or 50 EMA in a trend, then enter on a candlestick reversal signal.</li>
  <li><strong>Breakout Entry:</strong> Enter when price breaks a swing high (uptrend) or swing low (downtrend).</li>
  <li><strong>Moving Average Crossover:</strong> Enter when fast MA crosses above slow MA.</li>
</ul>
<h3>ADX Filter</h3>
<p>The ADX (Average Directional Index) measures trend strength:</p>
<ul>
  <li>ADX > 25: Strong trend (good for trend following)</li>
  <li>ADX < 20: Weak trend (avoid trend strategies)</li>
</ul>
<h3>Practical Rules</h3>
<ul>
  <li>Only trade in the direction of the higher timeframe trend</li>
  <li>Don't fight strong trends</li>
  <li>Use trailing stops to ride the trend</li>
  <li>Avoid trend strategies in ranging markets</li>
</ul>`,
        quiz: {
          questions: [
            {
              id: 'q7-1-1',
              question: 'In a trend following system, when does a bullish signal occur with 20/50 EMA?',
              options: [
                '50 EMA crosses above 20 EMA',
                '20 EMA crosses above 50 EMA and price is above both',
                'Price crosses above the 20 EMA',
                'Both EMAs are flat',
              ],
              correctAnswer: 1,
              explanation: 'A bullish trend signal occurs when the 20 EMA is above the 50 EMA and price is above both EMAs, confirming an uptrend.',
            },
            {
              id: 'q7-1-2',
              question: 'An ADX reading of 35 indicates:',
              options: [
                'A weak, choppy market',
                'An overbought market',
                'A strong trend present',
                'A reversal is imminent',
              ],
              correctAnswer: 2,
              explanation: 'ADX above 25 indicates a strong trend. At 35, the market is in a strong directional move suitable for trend-following strategies.',
            },
            {
              id: 'q7-1-3',
              question: 'What is a "pullback entry" in trend following?',
              options: [
                'Entering against the trend for a quick reversal',
                'Entering after price pulls back toward a moving average in a trend',
                'Waiting for price to break a new high/low',
                'A countertrend strategy',
              ],
              correctAnswer: 1,
              explanation: 'A pullback entry involves waiting for price to temporarily retrace toward a moving average or support level within the trend, providing a better risk/reward entry.',
            },
          ],
        },
      },
      {
        id: 'lesson-7-2',
        moduleId: 'module-7',
        lessonNumber: 2,
        title: 'Range Trading Strategies',
        description: 'Profit from sideways markets by buying support and selling resistance.',
        duration: 16,
        videoTitle: 'Range Trading Strategies',
        content: `<h2>Range Trading Strategies</h2>
<p>Markets spend approximately 70-80% of their time in consolidation (ranging). Range trading strategies profit from this sideways price action by repeatedly buying at support and selling at resistance.</p>
<img src="/images/lessons/support-resistance-chart.png" alt="EUR/USD chart showing price ranging between support and resistance with multiple bounces" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<h3>Identifying a Range</h3>
<ul>
  <li>Clear horizontal support and resistance levels</li>
  <li>ADX below 20 (weak trend)</li>
  <li>Price bouncing between two levels multiple times</li>
  <li>Absence of higher highs/higher lows pattern</li>
</ul>
<h3>Range Trading Execution</h3>
<ul>
  <li><strong>Buy Setup:</strong> Price approaches support; wait for bullish candlestick confirmation; buy; stop below support; target near resistance.</li>
  <li><strong>Sell Setup:</strong> Price approaches resistance; wait for bearish candlestick confirmation; sell; stop above resistance; target near support.</li>
</ul>
<h3>Range Risk Management</h3>
<p>Stop loss should be placed just beyond the range boundary. If price breaks decisively through support or resistance, the range is broken and you should exit immediately — don't hold hoping it returns.</p>
<h3>Oscillator Confirmation</h3>
<p>RSI and Stochastic are excellent range trading confirmation tools. Buy when price is at support AND RSI/Stochastic is oversold. Sell when at resistance AND indicators are overbought.</p>`,
        quiz: {
          questions: [
            {
              id: 'q7-2-1',
              question: 'Approximately what percentage of time do currency pairs spend in ranging conditions?',
              options: ['20-30%', '40-50%', '70-80%', '90-100%'],
              correctAnswer: 2,
              explanation: 'Markets spend approximately 70-80% of their time in consolidation (ranging), making range trading strategies valuable.',
            },
            {
              id: 'q7-2-2',
              question: 'In range trading, where should your stop loss be placed for a buy at support?',
              options: [
                'Just above the resistance level',
                'At the midpoint of the range',
                'Just below the support level',
                '100 pips below entry',
              ],
              correctAnswer: 2,
              explanation: 'For a buy at support in a range, the stop should be placed just below the support level — if support breaks, the trade thesis is invalid.',
            },
            {
              id: 'q7-2-3',
              question: 'Which ADX reading suggests a ranging market suitable for range trading?',
              options: ['ADX > 30', 'ADX > 25', 'ADX < 20', 'ADX = 50'],
              correctAnswer: 2,
              explanation: 'ADX below 20 indicates a weak or absent trend, suggesting a ranging market where range trading strategies are appropriate.',
            },
          ],
        },
      },
      {
        id: 'lesson-7-3',
        moduleId: 'module-7',
        lessonNumber: 3,
        title: 'Breakout Trading',
        description: 'Capture explosive moves by trading breakouts from key levels and consolidation patterns.',
        duration: 18,
        videoTitle: 'Breakout Trading Strategies',
        content: `<h2>Breakout Trading</h2>
<p>Breakout trading captures moves when price breaks decisively through key levels of support, resistance, or consolidation patterns. Breakouts can produce some of the largest moves in forex.</p>
<img src="/images/lessons/breakout-chart.png" alt="EUR/USD ascending triangle breakout with entry, stop loss and target levels annotated" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<h3>Types of Breakouts</h3>
<ul>
  <li><strong>Support/Resistance Breakout:</strong> Price breaks through a key horizontal level</li>
  <li><strong>Chart Pattern Breakout:</strong> Price breaks out of triangles, flags, wedges</li>
  <li><strong>Range Breakout:</strong> Price breaks the boundaries of a trading range</li>
  <li><strong>Volatility Breakout:</strong> Price breaks out after a squeeze/low volatility period</li>
</ul>
<h3>Confirming a True Breakout</h3>
<ul>
  <li>Strong, decisive candle closing beyond the level (not just a wick)</li>
  <li>Increased volume on the breakout candle</li>
  <li>Breakout in the direction of the higher timeframe trend</li>
  <li>News/fundamental catalyst supporting the move</li>
</ul>
<h3>Entry Strategies</h3>
<ul>
  <li><strong>Aggressive Entry:</strong> Enter on the breakout candle as it closes</li>
  <li><strong>Conservative Entry:</strong> Wait for a retest of the broken level (former resistance as new support)</li>
</ul>
<h3>False Breakouts</h3>
<p>Many breakouts fail and price returns to the range. Using a retest entry significantly reduces false breakout risk. Always have a clear stop loss.</p>`,
        quiz: {
          questions: [
            {
              id: 'q7-3-1',
              question: 'What confirms a genuine breakout vs a false breakout?',
              options: [
                'Any candle closing beyond the level',
                'A strong candle body closing beyond the level with supporting context',
                'Only fundamental news can confirm breakouts',
                'Price must stay beyond the level for 24 hours',
              ],
              correctAnswer: 1,
              explanation: 'A genuine breakout is confirmed by a strong candle body (not just wick) closing decisively beyond the level, ideally with increased volume and trend alignment.',
            },
            {
              id: 'q7-3-2',
              question: 'What is a "retest entry" in breakout trading?',
              options: [
                'Testing the same breakout level multiple times',
                'Waiting for price to return and confirm the broken level as new support/resistance',
                'Re-entering a trade that was stopped out',
                'Only entering on the second breakout attempt',
              ],
              correctAnswer: 1,
              explanation: 'A retest entry involves waiting for price to return to the broken level (now acting as new support/resistance) before entering — this reduces false breakout exposure.',
            },
            {
              id: 'q7-3-3',
              question: 'After a resistance level breaks upward, what does role reversal suggest?',
              options: [
                'The level will now act as resistance again',
                'Price will continue down',
                'The former resistance now acts as new support',
                'The level is no longer relevant',
              ],
              correctAnswer: 2,
              explanation: 'Role reversal (polarity change) means a broken resistance level becomes new support, providing a potential retest entry point.',
            },
          ],
        },
      },
      {
        id: 'lesson-7-4',
        moduleId: 'module-7',
        lessonNumber: 4,
        title: 'Scalping Strategies',
        description: 'Master high-frequency, short-term scalping techniques for quick profits.',
        duration: 19,
        videoTitle: 'Forex Scalping Strategies',
        content: `<h2>Scalping Strategies</h2>
<p>Scalping involves making many small trades throughout the day, targeting small profits (5-20 pips per trade). Scalpers hold positions for seconds to minutes and require the lowest possible spreads.</p>
<img src="/images/lessons/candlestick-chart.png" alt="EUR/USD short-timeframe chart showing candlestick patterns used for scalp entries" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<h3>Scalping Requirements</h3>
<ul>
  <li>ECN broker with 0-1 pip spreads on major pairs</li>
  <li>Fast execution (no requotes)</li>
  <li>High focus and discipline</li>
  <li>Strong understanding of the M1, M5 charts</li>
  <li>Ability to make quick decisions under pressure</li>
</ul>
<h3>Popular Scalping Methods</h3>
<h4>EMA Scalping</h4>
<p>Use 9 EMA and 21 EMA on M1/M5 chart. Enter longs when 9 EMA crosses above 21 EMA; price above both. Exit when 9 EMA crosses back below. Target 10-20 pips.</p>
<h4>Support/Resistance Scalping</h4>
<p>Identify key intraday levels on H1/H4. On M5/M1, watch for rejections at these levels and scalp bounces with tight 5-10 pip stops.</p>
<h3>Scalping Challenges</h3>
<ul>
  <li>Spread is a higher proportion of profit target</li>
  <li>Psychologically demanding; requires constant focus</li>
  <li>Slippage during volatile periods</li>
  <li>Not suitable for all personality types</li>
</ul>
<h3>Best Conditions for Scalping</h3>
<p>London-New York overlap: highest liquidity, tightest spreads, most movement. Avoid scalping during news events.</p>`,
        quiz: {
          questions: [
            {
              id: 'q7-4-1',
              question: 'What type of broker account is essential for scalping?',
              options: [
                'Standard account with fixed spreads',
                'ECN account with tight variable spreads',
                'Any account type works for scalping',
                'Dealing desk broker with guaranteed fills',
              ],
              correctAnswer: 1,
              explanation: 'Scalping requires ECN accounts with the tightest possible spreads (0-1 pip) since spread costs are proportionally higher when targeting small profit per trade.',
            },
            {
              id: 'q7-4-2',
              question: 'What timeframe charts do scalpers primarily use?',
              options: ['Daily and 4-hour', '4-hour and 1-hour', '1-minute and 5-minute', 'Weekly and daily'],
              correctAnswer: 2,
              explanation: 'Scalpers primarily work on 1-minute (M1) and 5-minute (M5) charts to identify and execute very short-term trades.',
            },
            {
              id: 'q7-4-3',
              question: 'When is the best time for scalping?',
              options: [
                'During the Asian session only',
                'During major news events',
                'London-New York overlap',
                'When the market is very quiet',
              ],
              correctAnswer: 2,
              explanation: 'The London-New York overlap offers the highest liquidity, tightest spreads, and most price movement — ideal conditions for scalping.',
            },
          ],
        },
      },
      {
        id: 'lesson-7-5',
        moduleId: 'module-7',
        lessonNumber: 5,
        title: 'Swing Trading',
        description: 'Hold trades for days to weeks, capturing significant price swings with part-time commitment.',
        duration: 20,
        videoTitle: 'Forex Swing Trading',
        content: `<h2>Swing Trading</h2>
<p>Swing trading involves holding trades for days to weeks, capitalizing on medium-term price swings. It's ideal for traders who can't watch the market constantly — you trade on the daily/4H charts and check positions once or twice a day.</p>
<img src="/images/lessons/trends-chart.png" alt="EUR/USD swing trade showing uptrend with higher highs and higher lows — ideal swing trading environment" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<h3>Why Swing Trading?</h3>
<ul>
  <li>No need to watch the screen all day</li>
  <li>Larger profit targets (50-300 pips) mean spread is less significant</li>
  <li>Less stressful than scalping or day trading</li>
  <li>Compatible with part-time trading</li>
</ul>
<h3>Swing Trading Setup</h3>
<ol>
  <li>Identify trend on Weekly/Daily chart</li>
  <li>Wait for pullback to key level on 4H chart</li>
  <li>Enter on 1H/4H confirmation signal (candlestick pattern, indicator)</li>
  <li>Stop beyond swing low/high</li>
  <li>Target next major resistance/support</li>
</ol>
<h3>Key Tools for Swing Trading</h3>
<ul>
  <li>50 and 200 EMA on daily chart for trend context</li>
  <li>Fibonacci retracement for entry levels</li>
  <li>RSI for overbought/oversold confirmation</li>
  <li>MACD for trend confirmation</li>
</ul>
<h3>Managing Swing Trades</h3>
<p>Move stop to breakeven once trade reaches 1R profit. Scale out partial profits at 2R; trail stop for remainder. Always know the fundamental backdrop — an unexpected central bank decision can rapidly reverse your trade.</p>`,
        quiz: {
          questions: [
            {
              id: 'q7-5-1',
              question: 'How long does a typical swing trade last?',
              options: [
                'Seconds to minutes',
                'Hours (same day)',
                'Days to weeks',
                'Months to years',
              ],
              correctAnswer: 2,
              explanation: 'Swing trades are held for days to weeks, capturing medium-term price swings between support and resistance levels.',
            },
            {
              id: 'q7-5-2',
              question: 'Which charts are primarily used for swing trading?',
              options: [
                'M1 and M5',
                'M5 and M15',
                'Daily and 4-Hour',
                'Weekly and Monthly',
              ],
              correctAnswer: 2,
              explanation: 'Swing traders primarily use Daily and 4-Hour charts for analysis and entry, providing the right balance of detail and noise reduction.',
            },
            {
              id: 'q7-5-3',
              question: 'When should you move your stop to breakeven in a swing trade?',
              options: [
                'Immediately after entry',
                'Once the trade reaches 1R profit',
                'After 2 days',
                'When the next news event occurs',
              ],
              correctAnswer: 1,
              explanation: 'A common rule is to move the stop to breakeven once the trade reaches 1R profit, eliminating the risk of a losing trade while allowing profits to run.',
            },
          ],
        },
      },
      {
        id: 'lesson-7-6',
        moduleId: 'module-7',
        lessonNumber: 6,
        title: 'Building & Testing Your Trading System',
        description: 'Design, backtest, and forward-test a complete trading system before risking real capital.',
        duration: 24,
        videoTitle: 'Building a Trading System',
        content: `<h2>Building & Testing Your Trading System</h2>
<p>A trading system is a complete set of rules that define every aspect of your trading: what you trade, when you enter and exit, how much you risk, and how you manage trades. Having a defined system is what separates professionals from gamblers.</p>
<img src="/images/lessons/trade-entry-chart.png" alt="EUR/USD trade setup showing the complete system — trend, level, entry signal, stop loss and target" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<h3>Components of a Trading System</h3>
<ol>
  <li><strong>Market:</strong> Which pairs? (Stick to 2-3 pairs you know well)</li>
  <li><strong>Timeframe:</strong> Which chart timeframes?</li>
  <li><strong>Entry Rules:</strong> Exact conditions required to enter</li>
  <li><strong>Exit Rules:</strong> Stop loss and take profit levels</li>
  <li><strong>Position Sizing:</strong> How much to risk per trade</li>
  <li><strong>Trade Management:</strong> Scaling, trailing stops</li>
</ol>
<h3>Backtesting</h3>
<p>Apply your system to historical data to evaluate performance:</p>
<ul>
  <li>Use at least 2-3 years of data</li>
  <li>Record every trade: entry, exit, R:R, outcome</li>
  <li>Calculate win rate, expectancy, max drawdown</li>
  <li>A system needs 100+ trades to draw statistical conclusions</li>
</ul>
<h3>Forward Testing</h3>
<p>After backtesting: forward test on demo for 3-6 months. Validate that the system performs in current market conditions. Only go live after forward testing confirms results.</p>
<h3>System Optimization (Avoid Over-Optimization)</h3>
<p>Don't curve-fit your system to historical data. A system that works perfectly in backtesting but has too many specific parameters is "over-optimized" and will fail in live trading.</p>`,
        quiz: {
          questions: [
            {
              id: 'q7-6-1',
              question: 'How many trades are typically needed to draw statistical conclusions from backtesting?',
              options: ['10-20', '30-50', '100+', '500+'],
              correctAnswer: 2,
              explanation: 'You need at least 100 trades to draw statistically meaningful conclusions about a trading system\'s performance characteristics.',
            },
            {
              id: 'q7-6-2',
              question: 'What is "over-optimization" or "curve-fitting" in trading system development?',
              options: [
                'Making a system too complex with many rules',
                'Optimizing parameters to fit historical data too precisely, failing in live trading',
                'Using too many technical indicators',
                'Testing a system on too much historical data',
              ],
              correctAnswer: 1,
              explanation: 'Over-optimization (curve-fitting) means tweaking system parameters to perfectly match past data, creating a system that\'s too specific to work in different future conditions.',
            },
            {
              id: 'q7-6-3',
              question: 'How long should you forward test before going live?',
              options: ['1 week', '1 month', '3-6 months', 'Only backtesting is needed'],
              correctAnswer: 2,
              explanation: 'Forward testing on demo for 3-6 months validates that the system works in current, live market conditions before risking real capital.',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'module-8',
    moduleNumber: 8,
    title: 'Trading Psychology & Professional Development',
    description: 'Master the mental game of trading — the final frontier separating consistently profitable traders from the rest.',
    lessons: [
      {
        id: 'lesson-8-1',
        moduleId: 'module-8',
        lessonNumber: 1,
        title: 'The Psychology of Trading',
        description: 'Understand the emotional challenges of trading and why most traders fail.',
        duration: 18,
        videoTitle: 'Trading Psychology',
        content: `<img src="/images/lessons/trader-mindset.png" alt="The Trader Mindset — 6 rules every beginner must follow" style="width:100%;border-radius:8px;margin-bottom:20px;" />
<h2>The Trader Mindset — Why Most People Fail (and How Not To)</h2>
<p>Here's a hard truth: <strong>most people who lose at trading don't lose because of bad strategy — they lose because of bad psychology.</strong> Emotions like greed, fear, and revenge destroy accounts faster than any bad trade setup.</p>

<div style="background:rgba(245,197,24,0.1);border-left:4px solid #f5c518;padding:14px 18px;border-radius:6px;margin:18px 0;">
  <strong style="color:#f5c518;">🎮 The Emotional Trap</strong><br/>
  Win 2 trades → feel invincible → risk too much next trade → lose big → panic → revenge trade → lose more → give up. Sound familiar? This cycle destroys 80% of new traders within 6 months. Knowing about it is the first step to avoiding it.
</div>

<h3>The 6 Rules of the Trader Mindset</h3>
<ol>
  <li><strong>Trade your plan, not your feelings</strong> — Write your entry rules before you open the chart. If the setup isn't there, you don't trade. Period.</li>
  <li><strong>Risk only 1–2% per trade</strong> — Small risk means emotions stay calm. When your whole week's rent is on the line, you make bad decisions.</li>
  <li><strong>Accept that losses are normal</strong> — The world's best traders lose 40–50% of trades. A loss following your rules is NOT a failure. A loss ignoring your rules IS.</li>
  <li><strong>Never chase the market</strong> — Missed a big move? Wait for the next setup. The market opens every weekday. There is always another opportunity.</li>
  <li><strong>Keep a trading journal</strong> — After every trade: record the pair, entry, exit, your reasoning, what happened. In 3 months, your journal will show you exactly where you're losing money.</li>
  <li><strong>Treat trading like a business</strong> — A business has rules, KPIs, and quarterly reviews. It doesn't make emotional decisions. Neither should you.</li>
</ol>

<h3>The Three Emotions to Watch</h3>
<ul>
  <li><strong>Fear</strong> — makes you exit early (cutting winners short) or not enter valid setups</li>
  <li><strong>Greed</strong> — makes you hold too long, add to losing trades, and overtrade</li>
  <li><strong>Revenge</strong> — after a loss, you double your size to "make it back fast" — almost always leads to a larger loss</li>
</ul>

<div style="background:rgba(38,166,154,0.1);border-left:4px solid #26a69a;padding:14px 18px;border-radius:6px;margin:18px 0;">
  <strong style="color:#26a69a;">✅ The One Practice That Changes Everything</strong><br/>
  After every losing trade, before opening another, walk away for 30 minutes. Make a coffee. Go for a walk. Then return and ask: "Is this next trade based on my strategy or my emotions?" Only trade if the honest answer is strategy.
</div>`,
        quiz: {
          questions: [
            {
              id: 'q8-1-1',
              question: 'What percentage of trading success is attributed to trading psychology?',
              options: ['20%', '40%', '60%', '80%'],
              correctAnswer: 3,
              explanation: 'Studies suggest trading psychology accounts for approximately 80% of trading success — mindset matters more than strategy.',
            },
            {
              id: 'q8-1-2',
              question: 'What is "loss aversion" in trading psychology?',
              options: [
                'Avoiding trades with potential losses',
                'Losses feeling 2x more painful than equivalent gains feel good',
                'Refusing to cut losing trades',
                'Trading only in declining markets',
              ],
              correctAnswer: 1,
              explanation: 'Loss aversion is a cognitive bias where losses feel approximately 2x more psychologically painful than equivalent gains feel pleasurable, leading to poor decision-making.',
            },
            {
              id: 'q8-1-3',
              question: 'In professional trading, what defines a "successful" trade?',
              options: [
                'Any trade that results in profit',
                'A trade where you followed your rules perfectly',
                'A trade with 3:1 R:R or better',
                'Any trade you close manually',
              ],
              correctAnswer: 1,
              explanation: 'Professional traders define success by process adherence — a losing trade that followed all rules is a success; a winning trade that violated rules is a failure.',
            },
          ],
        },
      },
      {
        id: 'lesson-8-2',
        moduleId: 'module-8',
        lessonNumber: 2,
        title: 'Developing a Trading Routine',
        description: 'Build daily pre-market and post-market routines that set you up for consistent performance.',
        duration: 15,
        videoTitle: 'Professional Trading Routine',
        content: `<h2>Developing a Trading Routine</h2>
<p>Professional traders don't just show up and trade — they follow structured routines that prepare their mind, review the market, and evaluate performance consistently.</p>
<h3>Pre-Market Routine</h3>
<ol>
  <li><strong>Economic Calendar Review:</strong> What high-impact news is scheduled? Avoid trading 30 minutes before/after major releases unless it's your strategy.</li>
  <li><strong>Higher Timeframe Analysis:</strong> What's the trend on Weekly/Daily? Where are key levels?</li>
  <li><strong>Session Bias:</strong> What happened overnight? What are European/Asian traders doing?</li>
  <li><strong>Watchlist Preparation:</strong> Which pairs have the best setups today?</li>
  <li><strong>Mental Preparation:</strong> 5 minutes of visualization or meditation</li>
</ol>
<h3>During Market Hours</h3>
<ul>
  <li>Stick to your plan — don't deviate based on "feelings"</li>
  <li>Set alerts rather than watching charts constantly</li>
  <li>Maximum screen time if day trading; minimal if swing trading</li>
</ul>
<h3>Post-Market Review</h3>
<ol>
  <li>Record all trades in your trading journal</li>
  <li>Note what went right and what went wrong (process, not outcome)</li>
  <li>Review chart screenshots with annotations</li>
  <li>Calculate daily P&L and running statistics</li>
</ol>`,
        quiz: {
          questions: [
            {
              id: 'q8-2-1',
              question: 'When should you avoid trading relative to high-impact news releases?',
              options: [
                'Only during the release itself',
                '30 minutes before and after major releases',
                'All day when any news is scheduled',
                'News has no impact on forex',
              ],
              correctAnswer: 1,
              explanation: 'Unless you have a specific news-trading strategy, avoid trading 30 minutes before and after major high-impact news releases due to unpredictable volatility and widened spreads.',
            },
            {
              id: 'q8-2-2',
              question: 'What should be recorded in a trading journal?',
              options: [
                'Only profitable trades',
                'Only the entry and exit prices',
                'All trades with process notes, charts, and statistics',
                'Just the total daily P&L',
              ],
              correctAnswer: 2,
              explanation: 'A comprehensive trading journal records all trades with entry/exit, reasoning, screenshots, what went right/wrong, and running statistics for systematic improvement.',
            },
            {
              id: 'q8-2-3',
              question: 'What is the purpose of reviewing higher timeframes in pre-market routine?',
              options: [
                'To find scalping opportunities',
                'To identify the dominant trend and key levels for the session',
                'To check overnight news only',
                'Required by brokers',
              ],
              correctAnswer: 1,
              explanation: 'Higher timeframe analysis reveals the dominant trend and key support/resistance levels, providing the context for all lower timeframe trading decisions.',
            },
          ],
        },
      },
      {
        id: 'lesson-8-3',
        moduleId: 'module-8',
        lessonNumber: 3,
        title: 'The Trading Journal',
        description: 'How to keep and use a trading journal to identify patterns and accelerate improvement.',
        duration: 14,
        videoTitle: 'Trading Journal Masterclass',
        content: `<h2>The Trading Journal</h2>
<p>A trading journal is the single most important tool for improving your trading. Without it, you're flying blind — repeating mistakes without knowing it. With it, you have a roadmap to systematic improvement.</p>
<h3>What to Record</h3>
<ul>
  <li>Date, time, currency pair, timeframe</li>
  <li>Entry price, stop loss, take profit</li>
  <li>Trade direction and reason (technical/fundamental)</li>
  <li>Setup type (trend pullback, breakout, range, etc.)</li>
  <li>Exit price, result in pips and R</li>
  <li>Emotions during the trade</li>
  <li>Was the process followed correctly?</li>
  <li>Chart screenshot with annotations</li>
</ul>
<h3>Weekly/Monthly Review Questions</h3>
<ul>
  <li>Which setups have the best win rate?</li>
  <li>Which pairs perform best/worst?</li>
  <li>What times of day are most profitable?</li>
  <li>Are my emotions affecting my decisions?</li>
  <li>Am I following my rules consistently?</li>
</ul>
<h3>Tools for Journaling</h3>
<ul>
  <li><strong>Digital:</strong> Edgewonk, Tradervue, Excel spreadsheet</li>
  <li><strong>Physical:</strong> Dedicated notebook with printed chart screenshots</li>
</ul>
<h3>The Edge Identifier</h3>
<p>After 50+ trades, your journal will reveal where your true edge lies. Double down on what works; eliminate what doesn't. This is the path to a profitable, personalized trading system.</p>`,
        quiz: {
          questions: [
            {
              id: 'q8-3-1',
              question: 'What is the primary purpose of keeping a trading journal?',
              options: [
                'To track daily profits for tax purposes',
                'To systematically identify patterns and improve performance',
                'Required by most brokers',
                'To share trades with other traders',
              ],
              correctAnswer: 1,
              explanation: 'A trading journal helps you systematically identify what works and what doesn\'t, enabling data-driven improvement of your trading.',
            },
            {
              id: 'q8-3-2',
              question: 'After how many trades can you begin to identify meaningful patterns?',
              options: ['5-10 trades', '20-30 trades', '50+ trades', '500+ trades'],
              correctAnswer: 2,
              explanation: 'After 50+ trades, your journal provides enough data to identify meaningful patterns in your performance — which setups, pairs, and times work best.',
            },
            {
              id: 'q8-3-3',
              question: 'Why should you record emotions during trades in your journal?',
              options: [
                'Emotions don\'t affect trading performance',
                'To identify when emotions are leading to poor decisions',
                'For psychological health only, not trading improvement',
                'Brokers require emotional logs',
              ],
              correctAnswer: 1,
              explanation: 'Recording emotions helps identify when fear, greed, or other emotions cause you to deviate from your rules — the foundation of psychological improvement.',
            },
          ],
        },
      },
      {
        id: 'lesson-8-4',
        moduleId: 'module-8',
        lessonNumber: 4,
        title: 'Overcoming Fear & Greed',
        description: 'Practical techniques for managing the two primary emotional challenges in trading.',
        duration: 17,
        videoTitle: 'Conquering Fear and Greed',
        content: `<h2>Overcoming Fear & Greed</h2>
<p>Fear and greed are the two primary emotional forces that destroy trading accounts. Learning to recognize and manage them is a lifelong practice for every trader.</p>
<h3>Trading Fear</h3>
<p>Manifestations of trading fear:</p>
<ul>
  <li>Hesitating or missing valid setups</li>
  <li>Closing profitable trades too early</li>
  <li>Not taking trades after a losing streak</li>
  <li>Reducing position size so much that winners don't cover losses</li>
</ul>
<h3>Trading Greed</h3>
<p>Manifestations of greed:</p>
<ul>
  <li>Overtrading — taking every possible setup</li>
  <li>Moving take profit further when already in profit</li>
  <li>Increasing position size when on a winning streak</li>
  <li>Refusing to close a losing trade</li>
</ul>
<h3>Practical Solutions</h3>
<h4>For Fear:</h4>
<ul>
  <li>Use very small size to build confidence (0.01 lots)</li>
  <li>Focus on process: "Did I follow my rules?" not "Did I profit?"</li>
  <li>Accept that losses are a normal cost of doing business</li>
</ul>
<h4>For Greed:</h4>
<ul>
  <li>Set fixed rules that remove discretion (automatic TP/SL)</li>
  <li>Take profits at predetermined levels — don't move the goalposts</li>
  <li>Use a position sizing calculator — never "just this once" increase size</li>
</ul>`,
        quiz: {
          questions: [
            {
              id: 'q8-4-1',
              question: 'Which of the following is a manifestation of FEAR in trading?',
              options: [
                'Increasing position size after wins',
                'Moving take profit further when already profitable',
                'Closing profitable trades too early out of anxiety',
                'Overtrading to maximize opportunities',
              ],
              correctAnswer: 2,
              explanation: 'Closing profitable trades too early is driven by fear of giving back gains — it prevents traders from achieving their planned risk/reward ratio.',
            },
            {
              id: 'q8-4-2',
              question: 'How can automation help overcome greed in trading?',
              options: [
                'Automation cannot help with psychological issues',
                'Fixed TP/SL rules remove discretionary decisions driven by greed',
                'It trades for you so you don\'t have to think',
                'Automated systems are always more profitable',
              ],
              correctAnswer: 1,
              explanation: 'Setting automatic take profit and stop loss levels removes the temptation to deviate from the plan when greed says "hold for more" or fear says "close early."',
            },
            {
              id: 'q8-4-3',
              question: 'What technique helps build confidence for fearful traders?',
              options: [
                'Taking larger positions to force commitment',
                'Avoiding trading until the fear passes',
                'Starting with very small position sizes (0.01 lots)',
                'Only trading during news events',
              ],
              correctAnswer: 2,
              explanation: 'Starting with very small position sizes (0.01 lots) reduces the emotional stakes, allowing fearful traders to build confidence by executing trades without significant financial pressure.',
            },
          ],
        },
      },
      {
        id: 'lesson-8-5',
        moduleId: 'module-8',
        lessonNumber: 5,
        title: 'Developing a Trading Edge',
        description: 'How to identify, quantify, and protect your statistical trading edge over time.',
        duration: 19,
        videoTitle: 'Finding Your Trading Edge',
        content: `<h2>Developing a Trading Edge</h2>
<p>A trading "edge" is a statistical advantage that, if exploited consistently over many trades, produces a positive expected return. Without an edge, you're gambling. Finding and protecting your edge is the holy grail of trading.</p>
<h3>What Constitutes an Edge?</h3>
<ul>
  <li>A pattern that occurs with a frequency greater than random chance</li>
  <li>A strategy with positive expectancy over 100+ trades</li>
  <li>An information advantage (faster news access, better analysis)</li>
  <li>A psychological edge (superior discipline and emotion management)</li>
</ul>
<h3>Quantifying Your Edge</h3>
<p>Key metrics from your trading journal:</p>
<ul>
  <li><strong>Win Rate:</strong> % of profitable trades</li>
  <li><strong>Average Win:</strong> Average profit per winning trade (in R)</li>
  <li><strong>Average Loss:</strong> Average loss per losing trade (in R)</li>
  <li><strong>Expectancy:</strong> (Win Rate × Avg Win) - (Loss Rate × Avg Loss)</li>
  <li><strong>Profit Factor:</strong> Gross Profit ÷ Gross Loss (>1.5 is good)</li>
</ul>
<h3>Protecting Your Edge</h3>
<p>Edges erode over time as markets change and as more traders discover the same patterns. Continuously review and adapt your edge. Keep detailed statistics. If an edge stops working, identify if it's market change or execution degradation.</p>`,
        quiz: {
          questions: [
            {
              id: 'q8-5-1',
              question: 'What defines a trading "edge"?',
              options: [
                'Winning more than 50% of trades',
                'A statistical advantage producing positive expected return over many trades',
                'Using the best trading platform',
                'Having access to the best signals',
              ],
              correctAnswer: 1,
              explanation: 'A trading edge is a statistical advantage that, when applied consistently over many trades, produces a positive expected return.',
            },
            {
              id: 'q8-5-2',
              question: 'What does a Profit Factor greater than 1.5 indicate?',
              options: [
                'You win 50% more trades than you lose',
                'Gross profits are 1.5x greater than gross losses',
                'Your average win is 1.5x your average loss',
                'You make 1.5% return per trade',
              ],
              correctAnswer: 1,
              explanation: 'Profit Factor = Gross Profit ÷ Gross Loss. A value >1.5 means you\'re making 1.5x more than you lose — a healthy, profitable system.',
            },
            {
              id: 'q8-5-3',
              question: 'Why do trading edges erode over time?',
              options: [
                'Brokers eliminate profitable patterns',
                'Markets change and more traders discover the same patterns',
                'Edges are temporary by definition',
                'Central banks intervene against profitable strategies',
              ],
              correctAnswer: 1,
              explanation: 'As markets evolve and more traders discover the same patterns, the edge diminishes — requiring continuous adaptation and evolution of strategies.',
            },
          ],
        },
      },
      {
        id: 'lesson-8-6',
        moduleId: 'module-8',
        lessonNumber: 6,
        title: 'Path to Professional Trading',
        description: 'The realistic roadmap from beginner to consistently profitable professional trader.',
        duration: 22,
        videoTitle: 'Path to Professional Trading',
        content: `<h2>Path to Professional Trading</h2>
<p>The path from beginner to professional trader is long, difficult, and requires genuine commitment. Understanding what the journey looks like prevents early disillusionment and sets realistic expectations.</p>
<h3>The Realistic Timeline</h3>
<ul>
  <li><strong>Month 1-3:</strong> Learning phase — demo account, studying, losing money (normal)</li>
  <li><strong>Month 3-12:</strong> Developing phase — finding your edge, developing discipline</li>
  <li><strong>Year 1-2:</strong> Consistency phase — small live account, learning to trade real money</li>
  <li><strong>Year 2-5:</strong> Growth phase — scaling a proven system</li>
</ul>
<h3>Stages of a Trader</h3>
<ol>
  <li><strong>Unconscious Incompetence:</strong> "Trading looks easy" (before experiencing losses)</li>
  <li><strong>Conscious Incompetence:</strong> "This is harder than I thought" (after losses)</li>
  <li><strong>Conscious Competence:</strong> "I can do this with effort" (after learning)</li>
  <li><strong>Unconscious Competence:</strong> "Trading feels natural" (mastery)</li>
</ol>
<h3>Non-Negotiables for Success</h3>
<ul>
  <li>Treat trading as a business, not gambling</li>
  <li>Never stop learning — markets change</li>
  <li>Maintain a detailed trading journal</li>
  <li>Start small, scale slowly, protect capital first</li>
  <li>Build a trading community for accountability</li>
</ul>
<h3>The Final Word</h3>
<p>Forex trading is one of the few businesses where you can start with very little capital and scale to significant wealth. But it requires patience, discipline, continuous learning, and a long-term perspective. The traders who succeed are the ones who never quit improving.</p>`,
        quiz: {
          questions: [
            {
              id: 'q8-6-1',
              question: 'What is the stage called when a trader thinks "trading looks easy" before experiencing real losses?',
              options: [
                'Conscious Competence',
                'Unconscious Competence',
                'Unconscious Incompetence',
                'Conscious Incompetence',
              ],
              correctAnswer: 2,
              explanation: 'Unconscious Incompetence is when traders don\'t know what they don\'t know — they think trading is easy because they haven\'t yet experienced the true difficulty.',
            },
            {
              id: 'q8-6-2',
              question: 'What is a realistic timeline to reach the "consistency phase" in trading?',
              options: [
                '1-3 months',
                '3-6 months',
                '1-2 years',
                'Depends only on intelligence',
              ],
              correctAnswer: 2,
              explanation: 'Reaching trading consistency typically takes 1-2 years of dedicated study, demo trading, and careful live trading with a small account.',
            },
            {
              id: 'q8-6-3',
              question: 'What does "treating trading as a business" primarily mean?',
              options: [
                'Registering a company to trade',
                'Applying professional discipline, systematic processes, and risk management',
                'Only trading with large capital',
                'Hiring employees to help trade',
              ],
              correctAnswer: 1,
              explanation: 'Treating trading as a business means applying professional discipline, maintaining records, managing risk systematically, and approaching it with the seriousness of a real business operation.',
            },
          ],
        },
      },
    ],
  },
  // ════════════════════════════════════════════════════════════════
  // PART 2 — READING THE MARKET: CANDLES, TRENDS & PATTERNS
  // ════════════════════════════════════════════════════════════════

  {
    id: 'module-9',
    moduleNumber: 9,
    title: 'Candlestick Mastery',
    description: 'Learn to read price action through candlesticks — the language every price chart speaks.',
    lessons: [
      {
        id: 'lesson-9-1',
        moduleId: 'module-9',
        lessonNumber: 1,
        title: 'What is a Candlestick?',
        description: 'Understand the anatomy of a candlestick and what each part tells you about market sentiment.',
        duration: 14,
        videoTitle: 'Candlestick Anatomy',
        content: `<h2>What is a Candlestick?</h2>
<p>A <strong>candlestick</strong> is a visual representation of price movement within a specific time period. Each candle tells a complete story: where price started (open), where it went (high and low), and where it ended (close). A single candle on a 1-hour chart represents one hour of market activity.</p>

<h3>Anatomy of a Candlestick</h3>
<p>Every candlestick has the same four components — Open, High, Low, and Close (OHLC).</p>
<img src="/images/lessons/candlestick-chart.png" alt="Candlestick anatomy — real EUR/USD chart with labelled candle parts" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<p><strong>The Body:</strong> The thick rectangular part. It shows the distance between the open and close price.</p>
<p><strong>The Wicks (Shadows):</strong> The thin lines above and below the body. They show the highest and lowest prices reached during the period.</p>

<h3>Bullish vs Bearish Candles</h3>
<p>A <strong>green (bullish) candle</strong> means price closed higher than it opened — buyers were in control. A <strong>red (bearish) candle</strong> means price closed lower than it opened — sellers were in control.</p>

<h3>Reading Candle Psychology</h3>
<p>The <strong>size of the body</strong> shows conviction. A large body means a strong move with clear direction. A small body (called a <em>doji</em>) shows indecision — buyers and sellers were roughly equal.</p>
<p>The <strong>length of the wick</strong> shows rejection. A long upper wick means buyers pushed price up but sellers pushed it back down — bearish rejection. A long lower wick means sellers drove price down but buyers reclaimed it — bullish rejection.</p>

<h3>Why Candlesticks Matter</h3>
<p>Candlestick charts were invented in 18th-century Japan by rice traders. They became popular in Western finance because they reveal <em>sentiment</em>, not just price levels. A bar chart shows the same OHLC data, but a candlestick makes the story immediately visible to the trained eye.</p>`,
        quiz: {
          questions: [
            {
              id: 'q9-1-1',
              question: 'What does a long upper wick on a candlestick indicate?',
              options: [
                'Strong bullish momentum',
                'Buyers pushed price up but sellers rejected it',
                'The market was closed during that period',
                'Price opened at the high'
              ],
              correctAnswer: 1,
              explanation: 'A long upper wick shows that buyers drove price up during the period, but sellers came in and pushed it back down before the candle closed — bearish rejection of the highs.',
            },
            {
              id: 'q9-1-2',
              question: 'On a bullish candlestick, which price is at the top of the body?',
              options: ['Open', 'High', 'Close', 'Low'],
              correctAnswer: 2,
              explanation: 'On a bullish (green) candle, price rose during the period, so the Close is higher than the Open. The Close forms the top of the body and the Open forms the bottom.',
            },
            {
              id: 'q9-1-3',
              question: 'What does a very small candle body (doji) typically signal?',
              options: [
                'Strong trending market',
                'Market indecision — buyers and sellers are equal',
                'A guaranteed reversal',
                'Low trading volume'
              ],
              correctAnswer: 1,
              explanation: 'A doji (tiny body) forms when open and close are nearly equal, indicating indecision. Neither buyers nor sellers dominated — often signals a potential turning point.',
            },
          ],
        },
      },
      {
        id: 'lesson-9-2',
        moduleId: 'module-9',
        lessonNumber: 2,
        title: 'Single Candlestick Patterns',
        description: 'Master the most powerful single-candle signals: Doji, Hammer, Shooting Star, and Marubozu.',
        duration: 16,
        videoTitle: 'Single Candle Patterns',
        content: `<h2>Single Candlestick Patterns</h2>
<p>Certain candlestick shapes, appearing alone, carry strong predictive meaning. These are the single-candle patterns every trader must recognise instantly.</p>

<img src="/images/lessons/candle-types-chart.png" alt="Key candlestick types — Doji, Hammer, Shooting Star, Marubozu, Spinning Top on a real EUR/USD chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />

<h3>The Doji</h3>
<p>The <strong>Doji</strong> has virtually no body — open and close are nearly identical. It represents a battle between buyers and sellers that ended in a draw. After a strong trend, a Doji is a powerful warning that momentum is fading.</p>
<p><strong>Types of Doji:</strong></p>
<p>• <em>Standard Doji</em> — equal wicks, pure indecision</p>
<p>• <em>Long-Legged Doji</em> — very long wicks, extreme indecision (high volatility)</p>
<p>• <em>Gravestone Doji</em> — long upper wick, no lower wick — bearish warning at highs</p>
<p>• <em>Dragonfly Doji</em> — long lower wick, no upper wick — bullish signal at lows</p>

<h3>The Hammer</h3>
<p>The <strong>Hammer</strong> appears after a downtrend. Sellers drove price sharply lower during the period, but buyers stepped in forcefully and pushed it back up near the open. The long lower wick is the "hammer" — buyers hammered out a bottom. <strong>Signal: potential bullish reversal.</strong></p>

<h3>The Shooting Star</h3>
<p>The <strong>Shooting Star</strong> is the Hammer flipped upside down — it appears after an uptrend. Buyers pushed price sharply higher but sellers came in hard and rejected those gains. <strong>Signal: potential bearish reversal.</strong> The long upper wick is a shooting star falling from the sky.</p>

<h3>The Marubozu</h3>
<p>The <strong>Marubozu</strong> (Japanese for "close-cropped") has no wicks at all. Price moved from open to close in one direction with zero hesitation. A bullish Marubozu opened at the low and closed at the high — pure buying strength. A bearish Marubozu opened at the high and closed at the low — pure selling pressure. <strong>Signal: strong continuation of the current move.</strong></p>

<h3>The Spinning Top</h3>
<p>The <strong>Spinning Top</strong> has a small body with roughly equal wicks on both sides. Similar to a Doji but with a slightly larger body. It represents indecision and often precedes consolidation or a trend change.</p>`,
        quiz: {
          questions: [
            {
              id: 'q9-2-1',
              question: 'A Hammer candlestick appears at the bottom of a downtrend. What does it signal?',
              options: [
                'Continuation of the downtrend',
                'Potential bullish reversal',
                'Market is about to crash',
                'No significant signal'
              ],
              correctAnswer: 1,
              explanation: 'A Hammer after a downtrend signals potential bullish reversal. The long lower wick shows sellers pushed price down hard, but buyers rejected those levels and drove price back up.',
            },
            {
              id: 'q9-2-2',
              question: 'What makes a Marubozu different from other candles?',
              options: [
                'It has a very small body',
                'It has no wicks at all',
                'It only forms on daily charts',
                'It has equal upper and lower wicks'
              ],
              correctAnswer: 1,
              explanation: 'A Marubozu has no wicks — price opened at one extreme and closed at the other with no reversal. This shows exceptional strength or weakness in one direction.',
            },
            {
              id: 'q9-2-3',
              question: 'Where does a Shooting Star appear to be a valid bearish signal?',
              options: [
                'After a downtrend',
                'During consolidation',
                'After an uptrend',
                'At any point on the chart'
              ],
              correctAnswer: 2,
              explanation: 'A Shooting Star is only bearish when it appears after an uptrend. It shows buyers ran out of steam and sellers rejected the new highs. Context (trend location) is everything.',
            },
          ],
        },
      },
      {
        id: 'lesson-9-3',
        moduleId: 'module-9',
        lessonNumber: 3,
        title: 'Two & Three Candle Patterns',
        description: 'Engulfing patterns, Morning Star, Evening Star, and Harami — multi-candle reversal signals.',
        duration: 18,
        videoTitle: 'Multi-Candle Patterns',
        content: `<h2>Two and Three Candle Patterns</h2>
<p>When two or three candles form a specific combination, they tell a richer story about the shift of power between buyers and sellers. These multi-candle patterns are among the most reliable signals in technical analysis.</p>

<img src="/images/lessons/multi-candle-chart.png" alt="Multi-candle patterns — Bullish Engulfing, Bearish Engulfing, Morning Star, Evening Star on real EUR/USD chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />

<h3>Bullish Engulfing</h3>
<p>The <strong>Bullish Engulfing</strong> pattern appears at the bottom of a downtrend. Day 1 is a bearish candle. Day 2 is a larger bullish candle whose body completely engulfs Day 1's body. This shows a decisive shift from selling to buying pressure. <strong>One of the most reliable reversal signals.</strong></p>

<h3>Bearish Engulfing</h3>
<p>The <strong>Bearish Engulfing</strong> is the opposite — appears at the top of an uptrend. The large red candle on Day 2 engulfs the smaller green Day 1, signalling sellers have taken control.</p>

<h3>Morning Star (3-candle bullish reversal)</h3>
<p>The <strong>Morning Star</strong> is a 3-candle pattern: a large bearish candle, followed by a small indecision candle (often a Doji), followed by a large bullish candle that closes well into Day 1's body. It signals a bottom is forming — "the morning star appears before sunrise."</p>

<h3>Evening Star (3-candle bearish reversal)</h3>
<p>The <strong>Evening Star</strong> is the bearish counterpart — signals a top. It's the "star appearing in the evening sky before darkness."</p>

<h3>Harami Pattern</h3>
<p>The <strong>Harami</strong> (Japanese for "pregnant") occurs when a small candle forms completely inside the previous larger candle's body. The large candle "gives birth" to the small one. It signals that the trend is losing momentum and a reversal may be near.</p>`,
        quiz: {
          questions: [
            {
              id: 'q9-3-1',
              question: 'In a Bullish Engulfing pattern, what must Day 2\'s candle do?',
              options: [
                'Have a longer upper wick than Day 1',
                'Completely engulf Day 1\'s body with its own body',
                'Close above Day 1\'s high wick',
                'Be exactly twice the size of Day 1'
              ],
              correctAnswer: 1,
              explanation: 'The key requirement is that Day 2\'s body completely engulfs (is larger than) Day 1\'s body. This shows buyers overwhelmed sellers decisively.',
            },
            {
              id: 'q9-3-2',
              question: 'What is the middle candle of a Morning Star pattern typically like?',
              options: [
                'A large bullish candle',
                'A large bearish candle',
                'A small indecision candle or Doji',
                'A Marubozu'
              ],
              correctAnswer: 2,
              explanation: 'The middle candle of a Morning Star is a small candle or Doji representing indecision — the pause between the downtrend and the new uptrend.',
            },
            {
              id: 'q9-3-3',
              question: 'What does "Harami" mean in Japanese?',
              options: ['Reversal', 'Pregnant', 'Strong', 'Shadow'],
              correctAnswer: 1,
              explanation: 'Harami means "pregnant" in Japanese. The large candle "contains" the smaller one inside it, like a pregnancy.',
            },
          ],
        },
      },
      {
        id: 'lesson-9-4',
        moduleId: 'module-9',
        lessonNumber: 4,
        title: 'Candlestick Colour Psychology',
        description: 'How candle colour, size and position on the chart reveal institutional intent.',
        duration: 12,
        videoTitle: 'Candle Colour and Size',
        content: `<h2>Candlestick Colour Psychology</h2>
<p>Reading candles is not just about memorising patterns — it's about understanding what the <em>market participants</em> were doing. Every candle is a snapshot of a psychological battle. Here's how to decode it.</p>

<h3>Body Size Tells You About Conviction</h3>
<img src="/images/lessons/candlestick-chart.png" alt="Candlestick anatomy on a real EUR/USD chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<p><strong>Large bodies</strong> = strong conviction. One side dominated completely. These candles often signal the start or continuation of a move.</p>
<p><strong>Small bodies</strong> = weak conviction. Neither side controlled. Often seen in ranges or before breakouts.</p>
<p><strong>No body (Doji)</strong> = pure indecision. A tipping point — whichever way the next candle breaks often becomes the new direction.</p>

<h3>Wick Length Tells You About Rejection</h3>
<p><strong>Long upper wick</strong> = price tried to go up but was rejected by sellers. <strong>Long lower wick</strong> = price tried to go down but buyers stepped in and rejected it. Both wicks equal = uncertainty in both directions.</p>
<p>Long wicks = failed attempts. The market tried to go somewhere and was rejected. Long wicks at key levels (support, resistance, round numbers) are especially significant — they show institutional money defending those levels.</p>

<h3>Position on the Chart Changes Everything</h3>
<p>The <strong>same candle</strong> has different meanings depending on where it appears:</p>
<p>• A Hammer at a major support level = very high probability reversal</p>
<p>• A Hammer in the middle of a range = much lower significance</p>
<p>• A Doji after 10 consecutive bullish candles = high-value warning</p>
<p>• A Doji after a quiet session = just noise</p>

<h3>Colour in Context</h3>
<p>Never read a candle colour in isolation. A single red candle during a strong uptrend is usually just a pause — not a reversal. Look at the last 5–20 candles to understand the "story so far" before interpreting the current candle.</p>
<p><strong>Professional traders ask:</strong> "Who was winning before this candle? Is this candle confirming or challenging that story?"</p>`,
        quiz: {
          questions: [
            {
              id: 'q9-4-1',
              question: 'What does a large candle body tell you?',
              options: [
                'High trading volume',
                'Strong conviction — one side dominated',
                'An important news event occurred',
                'Price will continue in that direction'
              ],
              correctAnswer: 1,
              explanation: 'A large body shows strong conviction — either buyers or sellers dominated the entire period with minimal pushback. It doesn\'t guarantee continuation but shows clarity of direction.',
            },
            {
              id: 'q9-4-2',
              question: 'Why does the position of a candle on the chart matter?',
              options: [
                'It determines the candle\'s colour',
                'It doesn\'t matter — candles mean the same anywhere',
                'Context changes meaning — e.g. a Hammer at support is far more powerful',
                'Lower candles are always more bearish'
              ],
              correctAnswer: 2,
              explanation: 'Context is everything. A Hammer at a major support level backed by other confluence signals is a high-probability trade. The same candle appearing randomly in the middle of a range has far less significance.',
            },
            {
              id: 'q9-4-3',
              question: 'What does a long wick at a key support or resistance level indicate?',
              options: [
                'Random price movement',
                'The market had low liquidity',
                'Institutional money defending or testing that level',
                'The candle was formed overnight'
              ],
              correctAnswer: 2,
              explanation: 'Long wicks at key levels show that large participants (institutions, banks) were actively buying or selling at those prices, pushing price back. These are high-value rejection signals.',
            },
          ],
        },
      },
      {
        id: 'lesson-9-5',
        moduleId: 'module-9',
        lessonNumber: 5,
        title: 'Candlestick Timeframes',
        description: 'How the same price action looks different across timeframes — and which to use for entries.',
        duration: 13,
        videoTitle: 'Timeframes and Candles',
        content: `<h2>Candlestick Timeframes</h2>
<p>A candlestick on a <strong>1-minute chart</strong> represents 1 minute of trading. On a <strong>daily chart</strong>, each candle represents an entire trading day. The same price movement looks completely different depending on which timeframe you're watching.</p>

<h3>Common Timeframes</h3>
<table style="width:100%;border-collapse:collapse;margin:1rem 0;font-family:monospace;font-size:13px">
<tr style="background:rgba(255,255,255,0.08)"><th style="padding:6px 12px;text-align:left">Code</th><th style="padding:6px 12px;text-align:left">Timeframe</th><th style="padding:6px 12px;text-align:left">Best For</th></tr>
<tr><td style="padding:6px 12px">M1</td><td>1-minute</td><td>Scalpers, high-noise, very short trades</td></tr>
<tr style="background:rgba(255,255,255,0.03)"><td style="padding:6px 12px">M5</td><td>5-minute</td><td>Short-term day traders</td></tr>
<tr><td style="padding:6px 12px">M15</td><td>15-minute</td><td>Intraday traders</td></tr>
<tr style="background:rgba(255,255,255,0.03)"><td style="padding:6px 12px">H1</td><td>1-hour</td><td>Most popular for day trading</td></tr>
<tr><td style="padding:6px 12px">H4</td><td>4-hour</td><td>Swing trading setup timeframe</td></tr>
<tr style="background:rgba(255,255,255,0.03)"><td style="padding:6px 12px">D1</td><td>Daily</td><td>Position trading, big picture</td></tr>
<tr><td style="padding:6px 12px">W1</td><td>Weekly</td><td>Long-term investors</td></tr>
<tr style="background:rgba(255,255,255,0.03)"><td style="padding:6px 12px">MN</td><td>Monthly</td><td>Macro trend identification</td></tr>
</table>

<h3>The Multi-Timeframe Principle</h3>
<p>Professional traders never look at just one timeframe. They use <strong>top-down analysis</strong>:</p>
<p><strong>1. Higher Timeframe (HTF)</strong> — identifies the major trend direction. If the daily chart shows an uptrend, you should only look for buys.</p>
<p><strong>2. Medium Timeframe</strong> — identifies the setup. A 4-hour chart shows the key levels to trade from.</p>
<p><strong>3. Lower Timeframe (LTF)</strong> — times the entry. A 15-minute or 1-hour chart gives the precise entry candle.</p>

<h3>Example: Top-Down Analysis</h3>
<img src="/images/lessons/trends-chart.png" alt="Forex trend types — uptrend, downtrend and ranging on real EUR/USD chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />

<h3>Timeframe Rules of Thumb</h3>
<p>• The <strong>higher the timeframe</strong>, the more reliable the signal (but fewer opportunities)</p>
<p>• The <strong>lower the timeframe</strong>, the more opportunities but also more false signals (noise)</p>
<p>• A pattern on the <strong>Daily chart</strong> outweighs the same pattern on a 5-minute chart every time</p>
<p>• For beginners, start with the <strong>H1 or H4</strong> — clear enough to see structure, fast enough to have regular trades</p>

<h3>Session-Specific Candles</h3>
<p>The <strong>London Open candle</strong> (8 AM GMT) and <strong>New York Open candle</strong> (1 PM GMT) are widely watched — they often set the direction for the session. A strong bullish candle at London open on EUR/USD often signals continuation throughout the morning.</p>`,
        quiz: {
          questions: [
            {
              id: 'q9-5-1',
              question: 'In top-down multi-timeframe analysis, what does the highest timeframe determine?',
              options: [
                'The exact entry price',
                'The stop loss level',
                'The major trend direction (only trade with it)',
                'The profit target'
              ],
              correctAnswer: 2,
              explanation: 'The highest timeframe (e.g., Daily) identifies the major trend. If it\'s bullish, you should only look for buy opportunities on lower timeframes — trading against the major trend has much lower probability.',
            },
            {
              id: 'q9-5-2',
              question: 'Which timeframe generally produces the most reliable candlestick signals?',
              options: [
                '1-minute chart',
                '5-minute chart',
                'Daily chart',
                'Tick chart'
              ],
              correctAnswer: 2,
              explanation: 'Higher timeframes contain more data and represent more market participants\' decisions. A pattern on the Daily chart reflects the decisions of thousands of traders and is far more reliable than a 1-minute pattern.',
            },
            {
              id: 'q9-5-3',
              question: 'Which timeframe combination is recommended for beginners?',
              options: [
                'M1 for analysis, M5 for entries',
                'Daily for trend, H4 for setup, H1 for entry',
                'Weekly only',
                'All timeframes simultaneously'
              ],
              correctAnswer: 1,
              explanation: 'Daily → H4 → H1 is a classic combination for beginners. Daily gives trend direction, H4 shows the setup/levels, and H1 provides the entry timing. Clear signals with manageable trade frequency.',
            },
          ],
        },
      },
      {
        id: 'lesson-9-6',
        moduleId: 'module-9',
        lessonNumber: 6,
        title: 'Building a Candlestick Reading Routine',
        description: 'A step-by-step process for analysing any chart using candle patterns professionally.',
        duration: 15,
        videoTitle: 'Candle Reading Routine',
        content: `<h2>Building a Candlestick Reading Routine</h2>
<p>Reading candles is a skill that becomes automatic with practice. Professional traders use a consistent, repeatable process every time they look at a chart. Here is that process.</p>

<h3>The 5-Step Candle Analysis Framework</h3>
<p><strong>Step 1: Identify the Trend</strong></p>
<p>Before looking at any single candle, zoom out. Is price making higher highs and higher lows (uptrend)? Lower highs and lower lows (downtrend)? Or ranging sideways? The trend determines which candle signals you act on.</p>

<p><strong>Step 2: Find Key Levels</strong></p>
<p>Mark major support and resistance levels — areas where price has reversed before. These are the zones where candle signals become most powerful.</p>
<img src="/images/lessons/trade-entry-chart.png" alt="Trade entry setup with Stop Loss and Take Profit on a real EUR/USD chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />

<p><strong>Step 3: Analyse the Last 10–20 Candles</strong></p>
<p>Read the recent story. Are candles getting larger or smaller? Are the bullish candles bigger than the bearish ones? Is there a pattern of wicks in one direction? Build the narrative before looking for a signal.</p>

<p><strong>Step 4: Identify the Signal Candle</strong></p>
<p>Now look for your pattern. A Hammer at support, a Shooting Star at resistance, a Bullish Engulfing after a pullback. The signal candle must:</p>
<p>• Appear at a meaningful location (level, trend line, moving average)</p>
<p>• Match the higher timeframe bias</p>
<p>• Be confirmed by the next candle closing in the expected direction</p>

<p><strong>Step 5: Wait for Confirmation</strong></p>
<p>The most common beginner mistake is entering on the signal candle itself. <strong>Wait for the candle to close</strong>, then wait for the next candle to confirm the move. A Bullish Engulfing is only confirmed when the next candle opens and continues higher.</p>

<h3>The Daily Candle Ritual</h3>
<p>Professional traders check charts at set times — not constantly. A healthy routine:</p>
<p>• <strong>Daily candle close</strong> (5 PM NY time) — most important analysis of the day</p>
<p>• <strong>London open</strong> (8 AM GMT) — set intraday bias</p>
<p>• <strong>New York open</strong> (1 PM GMT) — check for continuation or reversal</p>
<p>Staring at charts all day leads to over-trading. Disciplined traders look less, earn more.</p>

<h3>Quick Reference: Signal Quality Checklist</h3>
<p><strong>Signal Quality Checklist — TAKE the trade if:</strong> ✅ At a key S&R level · ✅ Aligns with higher timeframe trend · ✅ Clear, recognisable pattern · ✅ Pattern confirmed by next candle · ✅ Risk:Reward ≥ 1:2. <strong>SKIP the trade if:</strong> ❌ In the middle of nowhere · ❌ Against the HTF trend · ❌ Ambiguous pattern · ❌ Not yet confirmed · ❌ RR &lt; 1:1.5</p>`,
        quiz: {
          questions: [
            {
              id: 'q9-6-1',
              question: 'When is a Bullish Engulfing pattern confirmed?',
              options: [
                'As soon as the engulfing candle closes',
                'When the next candle after the pattern continues higher',
                'When price reaches a new high',
                'At the start of the London session'
              ],
              correctAnswer: 1,
              explanation: 'Waiting for the candle after the pattern to confirm the direction reduces false signals significantly. The Bullish Engulfing is confirmed when the following candle opens and moves higher, not on the signal candle itself.',
            },
            {
              id: 'q9-6-2',
              question: 'What is the minimum Risk:Reward ratio considered before entering a trade?',
              options: ['1:0.5', '1:1', '1:1.5 to 1:2', '1:5'],
              correctAnswer: 2,
              explanation: 'A minimum 1:2 Risk:Reward means you risk 1 unit to potentially gain 2. Over time, even with a 40% win rate, a 1:2 RR is profitable. Trades with less than 1:1.5 RR are generally not worth taking.',
            },
            {
              id: 'q9-6-3',
              question: 'What is the most common beginner mistake when trading candlestick patterns?',
              options: [
                'Using too many timeframes',
                'Entering on the signal candle without waiting for confirmation',
                'Only trading on daily charts',
                'Marking too many support levels'
              ],
              correctAnswer: 1,
              explanation: 'Entering before the signal candle has closed and been confirmed is the most common mistake. The pattern could still be forming and the candle could close differently than expected, invalidating the signal.',
            },
          ],
        },
      },
    ],
  },

  {
    id: 'module-10',
    moduleNumber: 10,
    title: 'Trend Analysis & Market Structure',
    description: 'Understand how markets move, identify trend strength, and trade in harmony with the dominant direction.',
    lessons: [
      {
        id: 'lesson-10-1',
        moduleId: 'module-10',
        lessonNumber: 1,
        title: 'What is a Trend?',
        description: 'Define uptrends, downtrends and sideways markets — and why trading with the trend is the professional approach.',
        duration: 14,
        videoTitle: 'Understanding Trends',
        content: `<h2>What is a Trend?</h2>
<p>A <strong>trend</strong> is the general direction in which price is moving over time. Markets don't move in straight lines — they zigzag. But within those zigzags, there is usually an overall direction. Identifying that direction is the single most important skill in trading.</p>

<h3>The Three Types of Trend</h3>
<img src="/images/lessons/trends-chart.png" alt="Uptrend, Downtrend and Ranging markets shown side by side on real forex charts" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<p><strong>Uptrend:</strong> Price makes <em>higher highs (HH)</em> and <em>higher lows (HL)</em>. Each rally goes higher than the last. Each pullback stops higher than the previous one.</p>
<p><strong>Downtrend:</strong> Price makes <em>lower highs (LH)</em> and <em>lower lows (LL)</em>. Each rally fails lower. Each drop goes deeper.</p>
<p><strong>Sideways (Range):</strong> Price bounces between a horizontal ceiling (resistance) and floor (support). No clear direction.</p>

<h3>Dow Theory: The Foundation of Trend Analysis</h3>
<p>Charles Dow (founder of the Wall Street Journal) defined trends in the late 1800s. His principles still hold today:</p>
<p>• <strong>Trend has three phases:</strong> Accumulation → Participation → Distribution</p>
<p>• <strong>Trends exist in three timeframes:</strong> Primary (months/years), Secondary (weeks/months), Minor (days/weeks)</p>
<p>• <strong>The trend is your friend</strong> until it shows clear signs of reversal</p>

<h3>Identifying Trend with Swing Points</h3>
<p>In an uptrend, mark Swing Highs (SH) and Swing Lows (SL). Each SH should be higher than the last (SH1 &lt; SH2 &lt; SH3 = Higher Highs ✅), and each SL should be higher than the last (SL1 &lt; SL2 &lt; SL3 = Higher Lows ✅). When both conditions hold, the uptrend is confirmed.</p>

<h3>When is a Trend Broken?</h3>
<p>An uptrend is considered broken when price makes a <strong>lower low</strong> — it breaks below the most recent swing low. This is called a <strong>Break of Structure (BOS)</strong> and is the first warning that the uptrend may be ending.</p>
<p>Trend traders do not immediately reverse — they wait for confirmation: a lower high to form after the lower low. Only then is the downtrend confirmed.</p>

<h3>The Golden Rule</h3>
<p>"The trend is your friend until the end." Trading with the trend means you have the majority of market participants on your side. Fighting the trend is possible but requires exceptional skill and is not recommended for beginners.</p>`,
        quiz: {
          questions: [
            {
              id: 'q10-1-1',
              question: 'What defines an uptrend in terms of price structure?',
              options: [
                'Price is above the 200 moving average',
                'Higher Highs and Higher Lows',
                'More green candles than red candles',
                'Price rising for at least 20 days'
              ],
              correctAnswer: 1,
              explanation: 'An uptrend is defined structurally as a series of Higher Highs (HH) and Higher Lows (HL). Each rally exceeds the previous high, and each pullback holds above the previous low.',
            },
            {
              id: 'q10-1-2',
              question: 'What is a Break of Structure (BOS) in an uptrend?',
              options: [
                'A new all-time high',
                'Price breaks above a resistance level',
                'Price makes a lower low, breaking below the most recent swing low',
                'A gap in price action'
              ],
              correctAnswer: 2,
              explanation: 'In an uptrend, a BOS occurs when price breaks below the most recent higher low — making a lower low for the first time. This signals the uptrend structure is compromised.',
            },
            {
              id: 'q10-1-3',
              question: 'According to Dow Theory, how many phases does a primary trend have?',
              options: ['Two', 'Three', 'Four', 'Five'],
              correctAnswer: 1,
              explanation: 'Dow Theory identifies three phases: Accumulation (smart money buys), Participation (public buys), and Distribution (smart money sells). Recognising these phases helps time entries and exits.',
            },
          ],
        },
      },
      {
        id: 'lesson-10-2',
        moduleId: 'module-10',
        lessonNumber: 2,
        title: 'Trend Lines & Channels',
        description: 'Draw trend lines accurately, trade channel bounces, and spot breakouts before they happen.',
        duration: 16,
        videoTitle: 'Trend Lines and Channels',
        content: `<h2>Trend Lines and Channels</h2>
<p>A <strong>trend line</strong> is a straight line connecting a series of price points that shows the direction and angle of a trend. Channels extend this by drawing a parallel line — creating a "road" that price travels within.</p>

<h3>Drawing an Uptrend Line</h3>
<img src="/images/lessons/trends-chart.png" alt="Forex trend types — uptrend, downtrend and ranging on real EUR/USD chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<p>Rules for drawing trend lines:</p>
<p>• You need <strong>minimum 2 points</strong> to draw a line, but <strong>3 touches confirm</strong> it's valid</p>
<p>• Connect significant swing lows (uptrend) or swing highs (downtrend)</p>
<p>• The more times price respects the line, the stronger it is</p>
<p>• A steeper angle (>60°) is less sustainable — expect it to break sooner</p>

<h3>Drawing a Price Channel</h3>
<p>An <strong>ascending channel</strong> consists of two parallel lines — a support trend line connecting the rising lows, and a resistance line connecting the rising highs. Price travels between these two lines, offering buy opportunities at the lower line and sell (or take-profit) opportunities at the upper line.</p>
<p>To draw a channel, take your trend line and draw a <strong>parallel line</strong> connecting the corresponding highs (uptrend channel) or lows (downtrend channel).</p>

<h3>Trading the Channel</h3>
<p><strong>Bounce trades:</strong> Buy at the lower trend line, sell at the upper channel line. Risk is tight (just below the trend line), reward is the full channel width.</p>
<p><strong>Breakout trades:</strong> When price breaks OUT of the channel, it often moves by the full width of the channel. This is the breakout target.</p>
<p><strong>Breakout target:</strong> Measure the channel width (e.g. 200 pips). When price breaks out above the upper channel line, project that same distance upward as the target. Example: breakout at 1.2800, channel width 200 pips → target 1.3000.</p>

<h3>Trend Line Breaks</h3>
<p>When price breaks through a valid trend line with a large, decisive candle (especially a Marubozu), this is a significant signal. The stronger the trend line (more touches, longer duration), the more significant the break.</p>
<p>After a trend line break, price often <strong>retests</strong> the line from the other side before continuing. This retest is one of the highest-probability entry points in all of trading.</p>
<p>After a trend line break, price often <strong>retests</strong> the broken line from the other side before continuing. This retest is one of the highest-probability entry points in trading — it gives a tight stop (just beyond the retest) and full measured-move reward.</p>`,
        quiz: {
          questions: [
            {
              id: 'q10-2-1',
              question: 'How many touches are needed to confirm a valid trend line?',
              options: ['1 touch', '2 touches to draw, 3 to confirm', '4 or more', '5 minimum'],
              correctAnswer: 1,
              explanation: 'Two points allow you to draw the line, but a third touch confirms the line is genuinely respected by the market, not just a coincidence.',
            },
            {
              id: 'q10-2-2',
              question: 'What is the typical price target after a channel breakout?',
              options: [
                'The next round number',
                'The previous high',
                'The full width of the channel added to the breakout point',
                'Twice the channel width'
              ],
              correctAnswer: 2,
              explanation: 'The classic channel breakout target is the channel width projected from the breakout point. If the channel was 200 pips wide, price is expected to travel approximately 200 pips after breaking out.',
            },
            {
              id: 'q10-2-3',
              question: 'What is a "retest" after a trend line break?',
              options: [
                'Price immediately reversing back into the channel',
                'Price returning to touch the broken trend line from the other side before continuing',
                'Drawing the trend line again',
                'A second breakout candle'
              ],
              correctAnswer: 1,
              explanation: 'After a trend line breaks, price often pulls back to touch the line from the other side (what was support becomes resistance, and vice versa). This retest is a high-probability entry point.',
            },
          ],
        },
      },
      {
        id: 'lesson-10-3',
        moduleId: 'module-10',
        lessonNumber: 3,
        title: 'Support & Resistance',
        description: 'Identify the key price zones where buyers and sellers clash — the foundation of all trading decisions.',
        duration: 18,
        videoTitle: 'Support and Resistance Zones',
        content: `<h2>Support and Resistance</h2>
<p><strong>Support</strong> is a price level where buying pressure is strong enough to prevent price from falling further. <strong>Resistance</strong> is a level where selling pressure prevents price from rising further. These are the most important concepts in all of technical analysis.</p>

<h3>Why Support and Resistance Exist</h3>
<p>Support and resistance are created by <strong>human psychology</strong>:</p>
<p>• <strong>Memory:</strong> Traders remember price levels where things happened. They react the same way next time.</p>
<p>• <strong>Round numbers:</strong> 1.2000, 1.2500, 150.00 — human brains cluster orders at round numbers.</p>
<p>• <strong>Previous highs and lows:</strong> Price often stalls at levels it previously struggled to pass.</p>

<h3>Visualising Support and Resistance</h3>
<img src="/images/lessons/support-resistance-chart.png" alt="Support and resistance levels with bounces, breakout, and role reversal on a real EUR/USD chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<p>Price bounces between a horizontal ceiling (resistance) and a floor (support) multiple times. The more times price respects a level, the stronger it becomes.</p>

<h3>Support Becomes Resistance (and Vice Versa)</h3>
<p>This "flip" is one of the most powerful concepts in trading. When price breaks through a support level, that level often becomes resistance. Traders who bought at that level (hoping it would hold) now want to exit at breakeven — creating selling pressure when price returns. Look for the <strong>role reversal</strong> on the chart above — the old resistance that became new support after the breakout.</p>

<h3>Types of Support and Resistance</h3>
<p><strong>Horizontal S&R:</strong> Clear price levels where price has reacted multiple times. Draw as a zone, not a single line.</p>
<p><strong>Dynamic S&R:</strong> Moving averages (20 EMA, 50 EMA, 200 SMA) that price bounces off. They shift as price moves.</p>
<p><strong>Psychological S&R:</strong> Round numbers (1.3000, 140.00) where large clusters of orders sit.</p>
<p><strong>Structural S&R:</strong> Previous swing highs and lows — especially on higher timeframes.</p>

<h3>Drawing S&R as Zones (Not Lines)</h3>
<p>Price rarely turns at an exact price level. Instead, it turns in a <strong>zone</strong> — typically a range of 10–30 pips around a key level. Drawing zones rather than lines gives more realistic entries and avoids getting stopped out by minor penetrations. For example, a resistance zone might span from 1.2490 to 1.2520 (a 30-pip zone) rather than a single line at 1.2500.</p>`,
        quiz: {
          questions: [
            {
              id: 'q10-3-1',
              question: 'What makes a support or resistance level stronger?',
              options: [
                'It appeared on a recent chart',
                'The more times price has reacted at that level',
                'It\'s a round number only',
                'It was drawn by a professional analyst'
              ],
              correctAnswer: 1,
              explanation: 'Each time price respects a level, more traders become aware of it and place orders there. The more reactions, the stronger the level — because more participants are watching and trading it.',
            },
            {
              id: 'q10-3-2',
              question: 'When support is broken, what does it often become?',
              options: [
                'A new support level lower',
                'Resistance',
                'A trend line',
                'Irrelevant to future price action'
              ],
              correctAnswer: 1,
              explanation: 'When support breaks, traders who bought there are now in a losing position. When price returns to that level, they want to sell (exit breakeven), turning the old support into new resistance.',
            },
            {
              id: 'q10-3-3',
              question: 'Why should support and resistance be drawn as zones rather than exact lines?',
              options: [
                'It\'s easier to draw',
                'Price turns in a range of prices, not at an exact tick',
                'Zones are more accurate mathematically',
                'Regulatory requirements'
              ],
              correctAnswer: 1,
              explanation: 'Markets are driven by humans — price doesn\'t turn at an exact pip. Drawing zones of 10-30 pips reflects the realistic area where orders cluster, reducing false signals from minor penetrations.',
            },
          ],
        },
      },
      {
        id: 'lesson-10-4',
        moduleId: 'module-10',
        lessonNumber: 4,
        title: 'Trend Strength & Momentum',
        description: 'Read trend momentum using moving averages, volume and price action velocity.',
        duration: 15,
        videoTitle: 'Measuring Trend Strength',
        content: `<h2>Trend Strength and Momentum</h2>
<p>Knowing the <em>direction</em> of a trend is only half the battle. Understanding its <em>strength</em> tells you how aggressively to trade it and when it might be exhausting. Strong trends offer the best trades. Weak trends are dangerous.</p>

<h3>Signs of a Strong Trend</h3>
<img src="/images/lessons/trends-chart.png" alt="Forex trend types — uptrend, downtrend and ranging on real EUR/USD chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<p><strong>Signs of a strong trend:</strong> Candles are large and close near their highs. Pullback candles are small (low volume, low conviction). Price consistently holds above its moving averages. Higher timeframe trend aligns.</p>

<h3>Signs of a Weakening Trend</h3>
<p><strong>Signs of a weakening trend:</strong> Trend candles are getting smaller. Pullback candles are as large as trend candles. Price is struggling at previous resistance. Long upper wicks are appearing (sellers rejecting highs). Price is dipping temporarily below moving averages.</p>

<h3>Moving Averages as Trend Filters</h3>
<p>The <strong>200 Simple Moving Average (SMA)</strong> is the most-watched indicator on institutional trading desks worldwide. Rule: price above 200 SMA = bullish. Price below 200 SMA = bearish.</p>
<p>The <strong>50 EMA</strong> acts as dynamic support in an uptrend — price often bounces off it during pullbacks. Multiple bounces from the 50 EMA with increasing candle size = strong trend.</p>
<p><strong>Moving Average Alignment (Stacking):</strong></p>
<p><strong>Bullish Moving Average Stack:</strong> Price → above 20 EMA → above 50 EMA → above 200 SMA. When all three are in order with price above all of them, you have the strongest possible bullish trend signal. The 20 EMA is where price bounces; the 50 EMA is the last line of defence; the 200 SMA is the major trend filter.</p>

<h3>Trend Velocity</h3>
<p>The <strong>angle</strong> of the trend matters. A 45° uptrend is healthy and sustainable. A near-vertical move (80°+) is a parabolic advance — these look exciting but end violently. The steeper the trend, the more aggressive the eventual reversal.</p>
<p>When a vertical move pauses and forms small candles (consolidation), this is the market "catching its breath." The question is: will it continue or reverse? Look at the higher timeframe structure to decide.</p>

<h3>Momentum Divergence</h3>
<p>When price makes a new high but an oscillator (like RSI or MACD) fails to make a new high, this is called <strong>bearish divergence</strong>. It means momentum is weakening even as price rises — a warning that the trend is losing energy. This often precedes a significant pullback or reversal.</p>`,
        quiz: {
          questions: [
            {
              id: 'q10-4-1',
              question: 'What does the 200 SMA indicate about trend direction?',
              options: [
                'Price above 200 SMA is bearish; below is bullish',
                'Price above 200 SMA is bullish; below is bearish',
                'The 200 SMA has no trend significance',
                'It only works on daily charts'
              ],
              correctAnswer: 1,
              explanation: 'Price above the 200 SMA signals a bullish trend — the vast majority of institutional traders use this as their primary trend filter. Below it signals bearish trend.',
            },
            {
              id: 'q10-4-2',
              question: 'What does bearish divergence mean?',
              options: [
                'Price and indicator both make new highs',
                'Price makes a new high but the oscillator fails to — momentum is weakening',
                'The trend is accelerating',
                'Two moving averages cross downward'
              ],
              correctAnswer: 1,
              explanation: 'Bearish divergence: price reaches a new high but an oscillator like RSI makes a lower high. This gap signals that buying momentum is declining even though price appears to be rising — a warning of potential reversal.',
            },
            {
              id: 'q10-4-3',
              question: 'What is a sign of a STRONG trend?',
              options: [
                'Trend candles are smaller than pullback candles',
                'Price dipping frequently below moving averages',
                'Trend candles are larger than pullback candles, and price holds above MAs',
                'Long wicks in the trend direction'
              ],
              correctAnswer: 2,
              explanation: 'A strong trend shows large-bodied candles in the trend direction, small candles on pullbacks, and price consistently respecting moving averages as support. This is the environment where trend-following trades are most reliable.',
            },
          ],
        },
      },
      {
        id: 'lesson-10-5',
        moduleId: 'module-10',
        lessonNumber: 5,
        title: 'Trend Reversals vs Retracements',
        description: 'The critical skill of distinguishing between a trend pause and a full trend change — avoid costly mistakes.',
        duration: 16,
        videoTitle: 'Reversals vs Retracements',
        content: `<h2>Trend Reversals vs Retracements</h2>
<p>The most common and expensive mistake in trading is misidentifying a <strong>retracement</strong> (temporary pullback) as a <strong>reversal</strong> (full trend change). This causes traders to exit winning trades too early or enter against the trend.</p>

<h3>Retracement (Pullback)</h3>
<p>A <strong>retracement</strong> holds above the previous swing low — the uptrend's higher-low structure is intact. Price makes a new higher high (HH2), pulls back but stops above the previous higher low (HL1), forming a new HL2. This confirms the uptrend continues.</p>
<p>A <strong>retracement</strong> is a temporary move against the trend. It:</p>
<p>• Respects the previous swing low (in an uptrend) — doesn't break it</p>
<p>• Often retraces 38–62% of the previous swing (Fibonacci levels)</p>
<p>• Shows smaller candles and lower volume than the trend move</p>
<p>• Quickly resumes in the original trend direction</p>

<h3>Reversal (Trend Change)</h3>
<p>A <strong>reversal</strong> breaks the trend structure: price makes a lower high (LH1) — failing to reach the previous peak — and then a lower low (LL1), breaking below the last higher low. This break of structure is the first confirmation a reversal is underway.</p>
<p>A <strong>reversal</strong> breaks the trend structure. It:</p>
<p>• Breaks the previous swing low (in an uptrend) — making a lower low</p>
<p>• Followed by a lower high forming</p>
<p>• Trend candles (in the new direction) larger than counter-trend candles</p>
<p>• Volume increases on the reversal move</p>

<h3>Fibonacci Retracement Levels</h3>
<p><strong>Fibonacci Retracement Levels:</strong> The key zones are 23.6% (shallow pullback), 38.2% (common pullback zone), 50.0% (psychological level), and 61.8% (the "Golden Ratio" — deepest normal retracement). If price retraces beyond 78.6%, the original swing is likely exhausted and a reversal is probable.</p>
<p>Fibonacci levels are the standard tool for measuring retracements. The 38.2% and 61.8% levels are the most watched — they represent the normal range of healthy pullbacks in a trend.</p>

<h3>Decision Framework</h3>
<p>Ask these questions when price pulls back:</p>
<p><strong>1.</strong> Has price broken the most recent swing low (uptrend)? If NO → likely retracement.</p>
<p><strong>2.</strong> Is the pullback candle size smaller than trend candles? If YES → likely retracement.</p>
<p><strong>3.</strong> Is the pullback respecting Fibonacci 38–62% zone? If YES → likely retracement.</p>
<p><strong>4.</strong> Is the higher timeframe trend still intact? If YES → likely retracement.</p>
<p>If 3 or 4 of these say YES → trade the retracement as a buying opportunity, not a reversal.</p>`,
        quiz: {
          questions: [
            {
              id: 'q10-5-1',
              question: 'Which Fibonacci level is known as the "Golden Ratio" — the deepest normal retracement?',
              options: ['23.6%', '38.2%', '50%', '61.8%'],
              correctAnswer: 3,
              explanation: '61.8% is derived from the Fibonacci sequence and is called the Golden Ratio. It\'s the deepest level a healthy retracement typically reaches before the trend resumes. Beyond 78.6% suggests the original move may be over.',
            },
            {
              id: 'q10-5-2',
              question: 'What structural change confirms a trend REVERSAL (not just retracement) in an uptrend?',
              options: [
                'Price falls 20 pips',
                'A doji forms',
                'Price makes a lower low AND then a lower high',
                'Volume decreases'
              ],
              correctAnswer: 2,
              explanation: 'A reversal is confirmed when price makes a lower low (breaking the previous swing low) AND then forms a lower high. This two-step confirmation shows the trend structure has changed, not just paused.',
            },
            {
              id: 'q10-5-3',
              question: 'What characteristic do retracement candles typically show?',
              options: [
                'Larger bodies than trend candles',
                'High volume',
                'Smaller bodies and lower volume than the trend candles',
                'Doji formations only'
              ],
              correctAnswer: 2,
              explanation: 'Healthy retracements show smaller candles and lower volume than the trend move — indicating the countertrend move lacks conviction. Large candles and high volume on the pullback suggest it could be a reversal.',
            },
          ],
        },
      },
      {
        id: 'lesson-10-6',
        moduleId: 'module-10',
        lessonNumber: 6,
        title: 'Market Cycles & Phases',
        description: 'Understand accumulation, trending, distribution and decline — the four phases every market moves through.',
        duration: 14,
        videoTitle: 'Market Cycles',
        content: `<h2>Market Cycles and Phases</h2>
<p>All markets — forex, stocks, crypto — move through repeating cycles. Understanding which phase the market is in dramatically improves your timing and prevents trading the wrong strategy at the wrong time.</p>

<h3>The Four Market Phases (Wyckoff Model)</h3>
<img src="/images/lessons/support-resistance-chart.png" alt="Support and resistance levels on a real EUR/USD chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />

<h3>Phase 1: Accumulation</h3>
<p>Price moves sideways in a range. This looks boring — but it's where <strong>institutional money</strong> is quietly building large positions. Volume is below average. Candles are small. Retail traders ignore this phase, thinking "nothing is happening."</p>
<p><strong>How to trade it:</strong> Buy near the bottom of the range, sell near the top. Or better: wait for the breakout.</p>

<h3>Phase 2: Uptrend (Markup)</h3>
<p>Price breaks out of the accumulation range with a strong bullish candle and high volume. Now everyone notices. Retail traders pile in. The trend produces consistent higher highs and higher lows. <strong>Best phase for trend-following strategies.</strong></p>
<p><strong>How to trade it:</strong> Buy pullbacks to support, trend lines, and moving averages.</p>

<h3>Phase 3: Distribution</h3>
<p>Price reaches highs and stalls. Smart money (institutions) begin selling their accumulated positions to the public (who are buying excitedly at the top). Price chops sideways at elevated levels. Candles become smaller, often with long wicks. Volume is elevated but price doesn't advance — a warning sign.</p>
<p><strong>How to trade it:</strong> Reduce long exposure. Look for shorting opportunities on failed breakout attempts.</p>

<h3>Phase 4: Downtrend (Markdown)</h3>
<p>Price breaks down from distribution. Institutions are mostly out. Retail traders who bought the highs are now holding losses. The descent is often faster than the ascent — fear drives selling more aggressively than greed drives buying.</p>
<p><strong>How to trade it:</strong> Short sell rallies to resistance, broken support levels now acting as resistance.</p>

<h3>Identifying Your Current Phase</h3>
<p>• <strong>Ranging, low volatility:</strong> → Accumulation or Distribution</p>
<p>• <strong>Strong directional moves, expanding candles:</strong> → Markup or Markdown</p>
<p>• <strong>Ranging AFTER a rally:</strong> → Distribution (dangerous for buyers)</p>
<p>• <strong>Ranging AFTER a decline:</strong> → Accumulation (potential buying opportunity)</p>`,
        quiz: {
          questions: [
            {
              id: 'q10-6-1',
              question: 'During the Accumulation phase, what is happening beneath the surface?',
              options: [
                'Retail traders are actively buying',
                'Institutional money is quietly building large long positions',
                'Price is falling rapidly',
                'Volume is at its highest'
              ],
              correctAnswer: 1,
              explanation: 'Accumulation is when smart money (institutions, funds) builds positions while price appears boring and sideways. They accumulate over time to avoid moving price against themselves.',
            },
            {
              id: 'q10-6-2',
              question: 'In the Distribution phase, what is the warning sign in candle behaviour?',
              options: [
                'Large candles closing at highs',
                'Price making new highs daily',
                'Volume elevated but price not advancing — small candles with long wicks',
                'Moving averages in perfect alignment'
              ],
              correctAnswer: 2,
              explanation: 'High volume with no price advancement (and long wicks) in a distribution phase shows supply overwhelming demand — institutions are selling as enthusiastic buyers absorb their positions.',
            },
            {
              id: 'q10-6-3',
              question: 'Why does price often fall faster than it rises?',
              options: [
                'Maths dictates it',
                'Fewer sellers than buyers',
                'Fear (selling) is a stronger emotion than greed (buying)',
                'Lower timeframe traders dominate downtrends'
              ],
              correctAnswer: 2,
              explanation: 'Fear and panic selling drive price down more aggressively than optimism drives it up. Traders rush to cut losses simultaneously, causing sharp declines, while buying is more gradual as greed builds slowly.',
            },
          ],
        },
      },
    ],
  },

  {
    id: 'module-11',
    moduleNumber: 11,
    title: 'Chart Patterns — The Complete Playbook',
    description: 'Master the 12 most powerful chart patterns: reversal and continuation, with exact entry, stop and target rules.',
    lessons: [
      {
        id: 'lesson-11-1',
        moduleId: 'module-11',
        lessonNumber: 1,
        title: 'Head & Shoulders Pattern',
        description: 'The most famous reversal pattern in trading — how to identify and trade it with precision.',
        duration: 20,
        videoTitle: 'Head and Shoulders',
        content: `<h2>Head and Shoulders Pattern</h2>
<p>The <strong>Head and Shoulders</strong> is widely considered the most reliable reversal pattern in technical analysis. It marks the end of an uptrend and the beginning of a downtrend. Its mirror image — the Inverse Head and Shoulders — signals the end of a downtrend.</p>

<h3>Pattern Anatomy</h3>
<img src="/images/lessons/head-shoulders-chart.png" alt="Head and Shoulders pattern with Left Shoulder, Head, Right Shoulder, neckline and target on a real EUR/USD chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<p><strong>Left Shoulder:</strong> Price rallies to a high, then pulls back to the neckline. Normal trend behaviour.</p>
<p><strong>Head:</strong> Price rallies again, making a HIGHER high than the left shoulder (the head). Then pulls back to the neckline again. This is the final high of the trend.</p>
<p><strong>Right Shoulder:</strong> Price rallies LESS than the head — making a LOWER high. Then falls back to the neckline. This shows buyers are losing strength — they can no longer reach the head's level.</p>
<p><strong>Neckline:</strong> The line connecting the two lows (between left shoulder/head and head/right shoulder). This is the critical level. The pattern is complete when price BREAKS BELOW the neckline.</p>

<h3>The Entry, Stop and Target</h3>
<p>Entry: sell when price closes below the neckline. Stop loss: above the right shoulder. Target: subtract the distance from the head to the neckline from the breakout point. Example — Head at 1.3000, Neckline at 1.2700 (300 pips). Entry = 1.2700, Target = 1.2700 − 300 pips = 1.2400.</p>

<h3>Confirmation Requirements</h3>
<p>A Head and Shoulders pattern requires confirmation before entering:</p>
<p>• <strong>Volume:</strong> Volume should be highest on the left shoulder, decrease on the head, and be lowest on the right shoulder. The neckline break should occur on INCREASING volume.</p>
<p>• <strong>Neckline break:</strong> Wait for a candle to CLOSE below the neckline — not just pierce it intraday.</p>
<p>• <strong>Retest opportunity:</strong> Price often pulls back to the neckline from below after breaking it. This retest is an excellent low-risk entry for those who missed the breakout.</p>

<h3>Inverse Head and Shoulders (Bullish)</h3>
<p>Identical logic, flipped upside down. Three lows form with the middle (head) being the deepest. Signals end of downtrend. Buy when price breaks above the neckline. Target = distance from head low to neckline, projected upward from the breakout.</p>

<h3>Common Mistakes</h3>
<p>• Entering BEFORE the neckline breaks (anticipating — the pattern can fail)</p>
<p>• Not accounting for a slanted neckline (neckline may be diagonal, not flat)</p>
<p>• Ignoring volume confirmation</p>`,
        quiz: {
          questions: [
            {
              id: 'q11-1-1',
              question: 'When is a Head and Shoulders pattern officially complete?',
              options: [
                'When the right shoulder forms',
                'When price makes the head (highest high)',
                'When price closes below the neckline',
                'When volume decreases on the right shoulder'
              ],
              correctAnswer: 2,
              explanation: 'The pattern is only complete — and the trade signal generated — when price breaks and closes below the neckline. Until then, price could still rally and invalidate the pattern.',
            },
            {
              id: 'q11-1-2',
              question: 'How do you calculate the price target for a Head and Shoulders pattern?',
              options: [
                'Equal to the distance between the two shoulders',
                'The distance from the head high to the neckline, projected downward from the breakout',
                'The previous major support level',
                'Twice the distance from the right shoulder to neckline'
              ],
              correctAnswer: 1,
              explanation: 'Measure the vertical distance from the head\'s high to the neckline. Project that same distance downward from the neckline breakout point. This gives the measured target.',
            },
            {
              id: 'q11-1-3',
              question: 'What volume pattern should accompany a valid Head and Shoulders?',
              options: [
                'Increasing volume throughout all three shoulders',
                'Highest volume on left shoulder, declining volume, then high volume on neckline break',
                'Volume is irrelevant to this pattern',
                'Equal volume on all three peaks'
              ],
              correctAnswer: 1,
              explanation: 'Classic H&S volume: high on left shoulder, lower on head (warning), lowest on right shoulder (buying exhaustion), then surging volume on the neckline break (institutional selling).',
            },
          ],
        },
      },
      {
        id: 'lesson-11-2',
        moduleId: 'module-11',
        lessonNumber: 2,
        title: 'Double Top & Double Bottom',
        description: 'Two of the most common and tradeable reversal patterns — simple, reliable and high probability.',
        duration: 16,
        videoTitle: 'Double Top and Bottom',
        content: `<h2>Double Top and Double Bottom</h2>
<p>The <strong>Double Top</strong> and <strong>Double Bottom</strong> are among the most common patterns on forex charts. They're simpler than Head and Shoulders but equally powerful when traded correctly.</p>

<img src="/images/lessons/chart-patterns-chart.png" alt="Double Top, Double Bottom, Ascending Triangle, and Bull Flag chart patterns on real forex charts" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />

<h3>Double Top (Bearish Reversal)</h3>
<p>The pattern forms when price tests a resistance level, pulls back, returns to test the SAME resistance level again, and fails — forming two roughly equal peaks. This shows the level is defended and buyers cannot break through. Sell when price closes below the neckline (the trough between the two peaks).</p>

<h3>Double Bottom (Bullish Reversal)</h3>
<p>Mirror of Double Top. Price tests a support level twice and holds both times. Shows strong buying interest at that level — bulls defending the floor. Buy when price closes above the neckline.</p>

<h3>The "W" and "M" Recognition</h3>
<p>Double Bottoms look like the letter <strong>W</strong>. Double Tops look like the letter <strong>M</strong>. When you can clearly see these letters on a chart at key levels, you have a high-probability setup.</p>

<h3>Entry, Stop, Target Rules</h3>
<p><strong>Double Top:</strong> Entry at 1.2900 (neckline break, close below). Stop at 1.3120 (above both peaks). Target = 1.2900 − (1.3100 − 1.2900) = <strong>1.2700</strong> (measured move).</p>
<p><strong>Double Bottom:</strong> Entry at the neckline break (close above). Stop below both lows. Target = neckline + the height from lows to neckline.</p>

<h3>What Makes a Double Top/Bottom More Reliable</h3>
<p>• <strong>Time between peaks:</strong> Longer time between peaks = stronger pattern (weeks > days)</p>
<p>• <strong>Volume:</strong> Second peak should have LESS volume than first (buying exhaustion)</p>
<p>• <strong>Neckline retest:</strong> After breakout, price often returns to test neckline — ideal entry</p>
<p>• <strong>Higher timeframe:</strong> Patterns on daily/weekly charts are more reliable than hourly</p>

<h3>Variations: Triple Top/Bottom</h3>
<p>When price tests the same level <em>three</em> times and fails, you have a Triple Top or Triple Bottom. These are even more powerful signals because the level has been tested and rejected three times — showing extremely strong institutional interest at that price.</p>`,
        quiz: {
          questions: [
            {
              id: 'q11-2-1',
              question: 'What does the letter "W" represent in chart pattern terms?',
              options: ['Double Top', 'Head and Shoulders', 'Double Bottom', 'Ascending Triangle'],
              correctAnswer: 2,
              explanation: 'A Double Bottom visually resembles the letter W — two lows at similar levels with a peak in between. It signals a bullish reversal when price breaks above the neckline.',
            },
            {
              id: 'q11-2-2',
              question: 'What should volume do on the second peak of a Double Top?',
              options: [
                'Be higher than the first peak',
                'Be lower than the first peak (buying exhaustion)',
                'Volume is irrelevant for Double Tops',
                'Be exactly equal to the first peak'
              ],
              correctAnswer: 1,
              explanation: 'Lower volume on the second peak confirms buyers are losing conviction. They can push price back to resistance, but with less energy — signalling exhaustion and increasing probability of the pattern completing.',
            },
            {
              id: 'q11-2-3',
              question: 'Why is a Triple Top considered more powerful than a Double Top?',
              options: [
                'It takes longer to form',
                'The resistance level has been tested and rejected three times, showing even stronger institutional selling',
                'It always leads to a larger price move',
                'It is easier to draw'
              ],
              correctAnswer: 1,
              explanation: 'Three tests and three rejections at the same level demonstrate exceptionally strong supply at that price. The more times a level is tested without breaking, the more significant the eventual break (in either direction) becomes.',
            },
          ],
        },
      },
      {
        id: 'lesson-11-3',
        moduleId: 'module-11',
        lessonNumber: 3,
        title: 'Triangles: Ascending, Descending & Symmetrical',
        description: 'Triangle patterns compress price before explosive breakouts — learn to trade them professionally.',
        duration: 17,
        videoTitle: 'Triangle Patterns',
        content: `<h2>Triangle Patterns</h2>
<p>Triangle patterns form when price makes a series of highs and lows that converge — the range narrows as buyers and sellers reach a standoff. Eventually, one side wins and price breaks out explosively. Triangles are compression patterns — energy builds, then releases.</p>

<h3>Ascending Triangle (Bullish Continuation)</h3>
<img src="/images/lessons/chart-patterns-chart.png" alt="Chart patterns — double top, double bottom, triangles, bull flag on real forex charts" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<p>The flat upper resistance line shows a large seller defending a specific price. But buyers are making higher lows — getting more confident and buying closer to the resistance each time. Eventually they overwhelm the seller and break through.</p>

<h3>Descending Triangle (Bearish Continuation)</h3>
<p>The <strong>Descending Triangle</strong> has a flat lower support with descending highs — sellers are getting more aggressive, pressing down toward the floor. When that support breaks, the move is usually sharp and decisive downward.</p>

<h3>Symmetrical Triangle (Direction Unknown)</h3>
<p>The <strong>Symmetrical Triangle</strong> has both lower highs and higher lows converging toward an apex — neither buyers nor sellers have a clear edge. Trade the breakout in whichever direction price escapes, confirmed by a candle close outside the triangle boundary.</p>

<h3>How to Trade Triangles</h3>
<p><strong>Entry:</strong> Wait for price to CLOSE outside the triangle boundary with a decisive candle. Do not enter inside the triangle.</p>
<p><strong>Target:</strong> Measure the height of the triangle at its widest point. Project that distance from the breakout point.</p>
<p><strong>Target calculation:</strong> Triangle height = 150 pips. Breakout at 1.3000 (upward). Target = 1.3000 + 150 pips = 1.3150. (For downward breakout, subtract from breakout point.)</p>
<p><strong>Stop:</strong> Below the last swing low of the triangle (ascending triangle buy) or above the last swing high (descending triangle sell).</p>

<h3>False Breakouts</h3>
<p>Triangles are prone to <strong>false breakouts</strong> — price briefly breaks the boundary then snaps back inside. To avoid these:</p>
<p>• Wait for the candle to <em>close</em> outside the triangle, not just pierce it</p>
<p>• Look for increased volume on the breakout candle</p>
<p>• Consider waiting for a retest of the broken triangle boundary</p>

<h3>Timing Note</h3>
<p>Triangles typically break out before reaching the apex — usually between 50–75% of the way to the point. If price reaches the apex without breaking, the pattern loses its significance.</p>`,
        quiz: {
          questions: [
            {
              id: 'q11-3-1',
              question: 'In an Ascending Triangle, what does the flat upper resistance indicate?',
              options: [
                'The market has no direction',
                'A large seller defending a specific price level',
                'Institutional buying at that level',
                'The pattern is forming too slowly'
              ],
              correctAnswer: 1,
              explanation: 'The flat upper resistance in an Ascending Triangle represents a large seller (often institutional) placing repeated sell orders at the same price. As buyers make higher lows, they eventually overwhelm this seller and break through.',
            },
            {
              id: 'q11-3-2',
              question: 'How do you calculate the target for a triangle breakout?',
              options: [
                'The previous major high',
                'The height of the triangle projected from the breakout point',
                'Twice the distance to the apex',
                'The 61.8% Fibonacci level'
              ],
              correctAnswer: 1,
              explanation: 'Measure the vertical height of the triangle at its widest (leftmost) point. Project that distance up (for upward breakout) or down (for downward breakout) from the exact breakout point.',
            },
            {
              id: 'q11-3-3',
              question: 'When should triangles typically break out relative to the apex?',
              options: [
                'Exactly at the apex',
                'Immediately after forming',
                'Between 50–75% of the way to the apex',
                'After the apex — the longer the better'
              ],
              correctAnswer: 2,
              explanation: 'Most valid triangle breakouts occur between 50-75% of the distance to the apex. Breakouts at the very tip of the triangle or after the apex are considered less reliable.',
            },
          ],
        },
      },
      {
        id: 'lesson-11-4',
        moduleId: 'module-11',
        lessonNumber: 4,
        title: 'Flags, Pennants & Wedges',
        description: 'Continuation patterns that form during brief pauses in strong trends — high-probability trade setups.',
        duration: 15,
        videoTitle: 'Flags and Pennants',
        content: `<h2>Flags, Pennants and Wedges</h2>
<p>Flags, pennants and wedges are <strong>continuation patterns</strong> — they form during brief pauses or pullbacks in a strong trend before the trend continues. They offer high-probability entries because you're trading in the trend direction after a healthy consolidation.</p>

<h3>The Bull Flag</h3>
<img src="/images/lessons/chart-patterns-chart.png" alt="Chart patterns — double top, double bottom, triangles, bull flag on real forex charts" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<p><strong>Components:</strong></p>
<p>• Flagpole: a fast, strong move creating the "pole" — often 100+ pips</p>
<p>• Flag: a slow, orderly pullback in a narrow parallel channel (2–3% of flagpole height)</p>
<p>• Low volume during flag formation (consolidation, not reversal)</p>
<p>• Breakout: above the upper flag boundary on increasing volume</p>
<p><strong>Target:</strong> flagpole height added to the breakout point</p>

<h3>The Bear Flag</h3>
<p>The <strong>Bear Flag</strong> is the mirror: a fast downward flagpole followed by a slight upward drift (the flag — a relief rally). When price breaks below the lower flag boundary, sell. Target = bottom of flagpole minus flagpole height.</p>
<p>Mirror of bull flag. Bearish continuation pattern. The brief upward drift (flag) is a relief rally in a downtrend — not a reversal. The sell signal triggers when price breaks below the flag's lower boundary.</p>

<h3>The Pennant</h3>
<p>A <strong>Pennant</strong> is similar to a flag but the consolidation forms as a small symmetrical triangle instead of parallel lines. The logic is identical — brief compression pause before continuation in the trend direction.</p>
<p>A pennant is similar to a flag but the consolidation forms as a <strong>small symmetrical triangle</strong> instead of a parallel channel. The logic is identical — brief pause before continuation.</p>

<h3>Rising and Falling Wedges</h3>
<p><strong>Rising Wedge (Bearish):</strong> Both trend lines slope upward and converge. Buyers are losing momentum — breaks DOWN. <strong>Falling Wedge (Bullish):</strong> Both lines slope downward and converge. Sellers are losing momentum — breaks UP. Both wedge types are high-probability reversal (or continuation) signals.</p>
<p>• <strong>Rising Wedge:</strong> Both trend lines slope upward but converge. Looks like an uptrend but buyers are losing steam. Breaks DOWN. Bearish signal (in an uptrend = reversal; in downtrend = continuation).</p>
<p>• <strong>Falling Wedge:</strong> Both lines slope down and converge. Sellers are losing steam. Breaks UP. Bullish signal.</p>

<h3>The Flag/Pennant Checklist</h3>
<p><strong>Flag/Pennant Checklist:</strong> ✅ Strong flagpole (large candles). ✅ Orderly consolidation (parallel or converging). ✅ Volume decreases during consolidation. ✅ Consolidation retraces less than 50% of flagpole. ✅ Breakout candle is large and closes outside the pattern. ✅ Volume increases on breakout.</p>`,
        quiz: {
          questions: [
            {
              id: 'q11-4-1',
              question: 'What should volume do during the flag consolidation phase?',
              options: [
                'Increase significantly',
                'Remain constant',
                'Decrease — showing the pullback lacks conviction',
                'Spike at each small candle'
              ],
              correctAnswer: 2,
              explanation: 'Decreasing volume during flag consolidation confirms it\'s a pause, not a reversal. The sellers driving the pullback are few — the trend\'s buyers are simply resting. When buyers return, volume surges with the breakout.',
            },
            {
              id: 'q11-4-2',
              question: 'A Rising Wedge forming in an existing uptrend signals what?',
              options: [
                'Strong bullish continuation',
                'No tradeable signal',
                'Potential bearish reversal — breaks downward',
                'A parabolic advance forming'
              ],
              correctAnswer: 2,
              explanation: 'A Rising Wedge in an uptrend is a bearish reversal signal. The converging lines show buyers running out of space and momentum. The eventual breakdown is often sharp.',
            },
            {
              id: 'q11-4-3',
              question: 'What is the typical price target for a bull flag breakout?',
              options: [
                'The top of the flag',
                'The flagpole height added to the breakout point',
                'The previous swing high',
                '50% of the flagpole height'
              ],
              correctAnswer: 1,
              explanation: 'The bull flag target = breakout point + flagpole height. If the flagpole was 150 pips and the breakout is at 1.3000, the target is 1.3150.',
            },
          ],
        },
      },
      {
        id: 'lesson-11-5',
        moduleId: 'module-11',
        lessonNumber: 5,
        title: 'Cup & Handle, Rounding Patterns',
        description: 'Long-duration patterns that signal major trend resumptions — preferred by swing and position traders.',
        duration: 14,
        videoTitle: 'Cup and Handle Pattern',
        content: `<h2>Cup and Handle, Rounding Patterns</h2>
<p>Some patterns develop over weeks or months. They're larger, more reliable, and produce bigger moves. These are favoured by swing traders and position traders who hold trades for days to weeks.</p>

<h3>Cup and Handle (Bullish)</h3>
<img src="/images/lessons/chart-patterns-chart.png" alt="Chart patterns on real forex charts" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<p>The <strong>Cup and Handle</strong> forms over weeks to months. The cup is a rounded U-shaped base (gradual accumulation). The handle is a brief bear flag or descending channel after price returns to the cup rim. Buy when price closes above the cup rim with volume. Target = cup depth added to breakout level.</p>
<p><strong>The Cup:</strong> A rounded, U-shaped base that forms over weeks or months. It looks like a cup or bowl. It represents gradual accumulation — sellers giving up slowly, buyers gradually taking control.</p>
<p><strong>The Handle:</strong> After price returns to the previous high (cup rim), it pulls back in a brief bear flag or descending channel — this is the handle. Volume decreases during the handle.</p>
<p><strong>Entry:</strong> Buy when price breaks above the cup rim (handle high) with volume.</p>
<p><strong>Target:</strong> The depth of the cup added to the breakout level.</p>

<h3>Why the Cup Shape Matters</h3>
<p>A V-shaped recovery is less reliable than a U-shaped one. The gradual rounding shows steady accumulation without panic buying. The longer the cup forms, the more powerful the eventual breakout.</p>

<h3>Rounding Top (Bearish)</h3>
<p>The <strong>Rounding Top</strong> (bearish) is the mirror: price gradually transitions from uptrend to downtrend in a dome/arc shape. It represents slow institutional selling over an extended period. Harder to spot than sharp tops but produces significant declines.</p>
<p>The <strong>Rounding Top</strong> is the bearish mirror of the cup bottom. Price gradually transitions from an uptrend to a downtrend over a curved, dome-shaped top. It's harder to spot than sharp tops but represents a deep shift in institutional positioning.</p>

<h3>Bump and Run Reversal</h3>
<p>The <strong>Bump and Run Reversal</strong> forms when price accelerates in a steep parabolic "bump" then collapses back through the original trend line. The "run" follows — a sharp decline. Typically triggered by news-driven euphoria that then fades rapidly.</p>
<p>The Bump and Run Reversal forms when price breaks out of a moderate trend in a parabolic "bump" then collapses back through the original trend line. The "run" follows as price falls sharply. Usually triggered by news-driven euphoria.</p>

<h3>Pattern Duration and Reliability</h3>
<p><strong>Pattern Duration and Reliability:</strong> Short-term patterns (hours–days) are more common but less reliable. Medium-term (days–weeks) offer balanced reliability and move size. Long-term patterns (weeks–months) — including Cup and Handle and Rounding patterns — are rarest, most reliable, and produce the largest moves.</p>`,
        quiz: {
          questions: [
            {
              id: 'q11-5-1',
              question: 'Why is a U-shaped cup more reliable than a V-shaped recovery?',
              options: [
                'U-shapes are easier to identify',
                'Gradual rounding shows steady accumulation, not panic buying — more institutional',
                'V-shapes always fail',
                'Time frame differences'
              ],
              correctAnswer: 1,
              explanation: 'A U-shaped base shows patient, gradual accumulation by institutions over time. V-shapes suggest emotional, panic-driven buying that often reverses. The rounder the base, the more solid the foundation.',
            },
            {
              id: 'q11-5-2',
              question: 'In a Cup and Handle pattern, where is the entry point?',
              options: [
                'At the bottom of the cup',
                'At the start of the handle',
                'When price breaks above the cup rim on volume',
                'After the handle completes 50% retracement'
              ],
              correctAnswer: 2,
              explanation: 'The entry is when price breaks above the cup rim (the resistance at the top of the cup, also the high before the cup formed). This breakout should be accompanied by increased volume.',
            },
            {
              id: 'q11-5-3',
              question: 'What triggers a Bump and Run Reversal pattern?',
              options: [
                'A Head and Shoulders forming',
                'Normal trend continuation',
                'A parabolic "bump" breakout from a moderate trend, usually news-driven, followed by collapse',
                'A cup and handle breaking down'
              ],
              correctAnswer: 2,
              explanation: 'Bump and Run Reversals are often triggered by euphoric news causing a parabolic spike. The unsustainable angle of the bump cannot be maintained, and price collapses back through the original trend line.',
            },
          ],
        },
      },
      {
        id: 'lesson-11-6',
        moduleId: 'module-11',
        lessonNumber: 6,
        title: 'Pattern Confluence: Stacking Your Edge',
        description: 'Combine multiple patterns and indicators for the highest-probability trade setups in professional trading.',
        duration: 18,
        videoTitle: 'Pattern Confluence',
        content: `<h2>Pattern Confluence — Stacking Your Edge</h2>
<p><strong>Confluence</strong> means multiple independent signals pointing in the same direction at the same time. A single pattern might be 60% reliable. Three patterns aligning at the same level can push that to 80%+. Professional traders never trade a single signal — they look for confluence.</p>

<h3>The Confluence Ladder</h3>
<img src="/images/lessons/trade-entry-chart.png" alt="Trade entry with Stop Loss and Take Profit on a real EUR/USD chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<p><strong>Pattern Confluence Tiers:</strong> Tier 1 (single signal, 60–65% reliability) — needs at least 2:1 RR. Tier 2 (2 signals, 65–72%) — standard trades. Tier 3 (3 signals, 72–80%) — high conviction. Tier 4 (4+ signals, 80%+) — maximum size. More confluences = higher probability and tighter stops.</p>

<h3>Example: A Triple Confluence Buy Setup</h3>
<img src="/images/lessons/support-resistance-chart.png" alt="Support and resistance levels on a real EUR/USD chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<p><strong>Example trade analysis:</strong> EUR/USD H4 — resistance at 1.0850 becomes support after breakout. Bullish Hammer at that level. 50 EMA holding above price as support. H4 trend = bullish. All confluence factors align. Score: 5+ → high-probability buy setup.</p>

<h3>Session Timing as Confluence</h3>
<p>The time of day adds a layer of confluence:</p>
<p>• <strong>London Open</strong> (8 AM GMT): Highest volume, highest reliability for EUR pairs</p>
<p>• <strong>NY Open</strong> (1 PM GMT): Second highest volume, USD pairs in focus</p>
<p>• <strong>London/NY Overlap</strong> (1–5 PM GMT): Maximum volume, most reliable setups</p>
<p>• <strong>Asian session</strong>: Lower volume, ranging behaviour — lower reliability for breakouts</p>

<h3>Building Your Own Confluence Checklist</h3>
<p>Before entering any trade, score it:</p>
<ul>
  <li>☐ Higher timeframe trend aligned? <strong>(+1)</strong></li>
  <li>☐ At a key S&amp;R level? <strong>(+1)</strong></li>
  <li>☐ Candlestick pattern confirms? <strong>(+1)</strong></li>
  <li>☐ Chart pattern (flag, triangle, etc.)? <strong>(+1)</strong></li>
  <li>☐ Moving average in confluence? <strong>(+1)</strong></li>
  <li>☐ Volume confirming? <strong>(+1)</strong></li>
  <li>☐ Session timing appropriate? <strong>(+1)</strong></li>
  <li>☐ Risk:Reward minimum 1:2? <strong>(+1)</strong></li>
</ul>
<p><strong>Score 5+</strong> → Trade it &nbsp;|&nbsp; <strong>Score 3–4</strong> → Consider carefully &nbsp;|&nbsp; <strong>Score 1–2</strong> → Skip it</p>

<h3>The Patience Principle</h3>
<p>Most beginners trade every pattern they see. Professionals wait for 4–5 point confluence setups and pass on everything else. This patience — declining 90% of possible trades — is what separates profitable traders from losing ones. Fewer, better trades is always superior to more, mediocre trades.</p>`,
        quiz: {
          questions: [
            {
              id: 'q11-6-1',
              question: 'What is confluence in trading?',
              options: [
                'Multiple charts showing the same currency pair',
                'Multiple independent signals pointing in the same direction simultaneously',
                'Using two different brokers',
                'Trading during two sessions at once'
              ],
              correctAnswer: 1,
              explanation: 'Confluence means multiple independent factors aligning simultaneously. The more unrelated signals that agree, the higher the probability of the trade working — each signal is a separate "vote."',
            },
            {
              id: 'q11-6-2',
              question: 'What is the minimum score recommended before entering a trade on the confluence checklist?',
              options: ['2 points', '3 points', '5 points', '7 points'],
              correctAnswer: 2,
              explanation: 'A score of 5+ means at least 5 independent factors align. This represents a genuinely high-probability setup, not just one or two marginal signals that could easily be noise.',
            },
            {
              id: 'q11-6-3',
              question: 'Which forex trading session produces the most reliable breakout setups?',
              options: [
                'Asian session (low volume)',
                'Sunday opening',
                'London/New York overlap (1–5 PM GMT)',
                'Late NY session (after 7 PM GMT)'
              ],
              correctAnswer: 2,
              explanation: 'The London/New York overlap (1–5 PM GMT) has the highest volume of any trading period — both major centres are active simultaneously. This volume validates breakouts and reduces false signals.',
            },
          ],
        },
      },
    ],
  },

  {
    id: 'module-12',
    moduleNumber: 12,
    title: 'Trade Execution & Demo Practice',
    description: 'Learn exactly how to enter, manage and exit trades — then practice on a simulated demo account with real market scenarios.',
    lessons: [
      {
        id: 'lesson-12-1',
        moduleId: 'module-12',
        lessonNumber: 1,
        title: 'How to Enter a Trade',
        description: 'Market orders, limit orders, stop orders — which to use when, and why entry type affects your profitability.',
        duration: 16,
        videoTitle: 'Trade Entry Types',
        content: `<h2>How to Enter a Trade</h2>
<p>Entry execution is often overlooked by beginners who focus on <em>what</em> to trade but not <em>how</em> to enter. A good analysis with a bad entry is still a bad trade. Mastering entries dramatically improves your average reward and reduces your average risk.</p>
<img src="/images/lessons/trade-entry-chart.png" alt="Trade entry setup showing Entry, Stop Loss, Take Profit levels with 1:3 risk-reward on a real EUR/USD chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />

<h3>The Three Entry Types</h3>
<p><strong>1. Market Order</strong></p>
<p><strong>Market Order:</strong> Filled immediately at the current price (~1.2500). ✅ Guaranteed fill, never miss a move. ❌ Slippage possible on news. Best for: breakout entries after confirmation.</p>
<p><strong>2. Limit Order (Pending Order)</strong></p>
<p><strong>Limit Order:</strong> BUY LIMIT set at 1.2450. Order fills automatically if price drops to that level. ✅ Better price than market order. ✅ Disciplined, removes emotion. ❌ May not fill if price reverses early. Best for: retracement entries, bounces off S&R.</p>
<p><strong>3. Stop Order (Buy Stop / Sell Stop)</strong></p>
<p><strong>Stop Order:</strong> BUY STOP set at 1.2555 (just above resistance). Triggers automatically if price breaks through. ✅ Catches breakouts while you sleep. ❌ Can trigger on false breakouts. Best for: breakout strategies, pattern breakouts.</p>

<h3>The Three Entry Strategies</h3>
<p><strong>Strategy 1: The Breakout Entry</strong></p>
<p><strong>Strategy 1 — Breakout Entry:</strong> Wait for price to close above resistance with a decisive candle. Use a market order immediately on the close, or a buy stop set 2–3 pips above resistance. Stop: below the breakout candle body.</p>

<p><strong>Strategy 2: The Retest Entry (Best Risk:Reward)</strong></p>
<p><strong>Strategy 2 — Retest Entry (Best Risk:Reward):</strong> After price breaks above resistance, wait for it to pull back and retest the old resistance level (now acting as support). Look for a bullish candle (Hammer, engulfing) on the retest. Stop: below the wick. This gives the tightest stop and best reward.</p>

<p><strong>Strategy 3: The Pullback Entry (Trend Following)</strong></p>
<p><strong>Strategy 3 — Pullback Entry (Trend Following):</strong> In an uptrend, wait for a pullback to the 38–50% Fibonacci zone or a moving average (20 EMA / 50 EMA). Enter when a bullish reversal candle forms. Stop: below the swing low of the pullback. This is the safest entry — trend is confirmed and you enter at discount.</p>

<h3>Entry Timing Within the Candle</h3>
<p>For candle-based entries, always wait for the candle to <strong>close</strong> first — never enter partway through a candle. A candle that looks bullish at 3:45 PM might close as a shooting star at 4:00 PM (end of the hour).</p>

<h3>Calculating Entry Size (Position Sizing)</h3>
<p><strong>Position Size Calculation:</strong> Account $10,000 × 1% risk = $100 risk per trade. Stop loss = 50 pips. Pip value (standard lot EUR/USD) = $10/pip. Lot size = $100 ÷ (50 pips × $10) = <strong>0.2 lots</strong>. This ensures one trade can only cost 1% of your account.</p>`,
        quiz: {
          questions: [
            {
              id: 'q12-1-1',
              question: 'Which entry type offers the best potential entry price in a pullback strategy?',
              options: [
                'Market order',
                'Buy stop',
                'Buy limit at the expected support level',
                'All are equal'
              ],
              correctAnswer: 2,
              explanation: 'A buy limit placed at a support zone gets you in at a better price than a market order. You preset the level you want to buy, and if price reaches it, you\'re filled automatically — often at the lowest point of the pullback.',
            },
            {
              id: 'q12-1-2',
              question: 'What is the main disadvantage of a buy stop order for breakout entries?',
              options: [
                'It fills too slowly',
                'It can trigger on false breakouts where price immediately reverses',
                'It requires more margin',
                'It only works on daily charts'
              ],
              correctAnswer: 1,
              explanation: 'Buy stops trigger automatically when price reaches the level — including false breakouts that immediately reverse. Waiting for a candle close before entering reduces this risk significantly.',
            },
            {
              id: 'q12-1-3',
              question: 'Using 1% account risk, a $10,000 account, 50-pip stop, and $10/pip value, what lot size should you trade?',
              options: ['0.1 lots', '0.2 lots', '0.5 lots', '1 lot'],
              correctAnswer: 1,
              explanation: '$100 risk ÷ (50 pips × $10/pip) = $100 ÷ $500 = 0.2 lots. This ensures one trade can only lose 1% ($100) of your account, preserving capital for the long run.',
            },
          ],
        },
      },
      {
        id: 'lesson-12-2',
        moduleId: 'module-12',
        lessonNumber: 2,
        title: 'Stop Loss & Take Profit Mastery',
        description: 'Place stops scientifically (not randomly), set realistic targets, and use trailing stops to protect profits.',
        duration: 17,
        videoTitle: 'Stop Loss and Take Profit',
        content: `<h2>Stop Loss and Take Profit Mastery</h2>
<p>Your stop loss and take profit levels are as important as your entry. A perfect entry with a bad stop can destroy an otherwise profitable strategy. Professional traders set their stop loss <em>before</em> their entry — the stop defines the trade, not the entry.</p>

<h3>Where to Place a Stop Loss</h3>
<p><strong>The Golden Rule:</strong> Place your stop where the trade is PROVEN WRONG — not at an arbitrary pip distance.</p>

<p><strong>For a Bullish Trade:</strong></p>
<img src="/images/lessons/support-resistance-chart.png" alt="Support and resistance on a real EUR/USD chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<p>Place stop loss <strong>below the bottom of the support zone</strong> plus a 5–10 pip buffer to avoid stop hunting. If price breaks below the zone, the trade thesis is wrong — the stop fires and protects your capital.</p>

<p><strong>For a Bearish Trade:</strong></p>
<p>For a <strong>bearish trade</strong>: stop goes above the resistance zone plus a buffer. Entry is a short at the resistance zone. If price breaks above the zone convincingly, the bearish thesis is invalid.</p>

<h3>Stop Loss Sizing Approaches</h3>
<p><strong>Structure-based stops (best):</strong> Behind the nearest significant swing high/low or S&R zone. Adapts to market structure.</p>
<p><strong>ATR-based stops:</strong> Use Average True Range (ATR) to size stops based on recent volatility. E.g., stop = 1.5× ATR(14). Adapts to current market conditions.</p>
<p><strong>Fixed pip stops (avoid):</strong> "Always use 50 pips." Ignores market structure — too tight in volatile markets, too wide in quiet ones.</p>

<h3>Take Profit Strategies</h3>
<p><strong>Fixed Target (measured move):</strong></p>
<p><strong>Fixed Target (measured move):</strong> If stop = 40 pips and the chart pattern's measured move = 120 pips, the Risk:Reward = 1:3. ✅ Only take trades where reward is at least 2× risk.</p>

<p><strong>Structure-based target:</strong></p>
<p><strong>Structure-based Target:</strong> Entry at 1.2500 (buy), stop at 1.2460. Next major resistance is at 1.2620. Target: 1.2610 (10 pips before resistance). RR = 110 pips ÷ 40 pips = <strong>2.75:1</strong>. ✅</p>

<h3>Trailing Stop Loss</h3>
<p><strong>Trailing Stop:</strong> Entry 1.2500. Initial stop: 1.2460. As price rises → move stop to breakeven (1.2500) → then lock profit (1.2560) → continue trailing. Stop only moves in the profit direction, never backward. When price reverses and hits the trailing stop, you exit with locked-in profit.</p>

<h3>Partial Closes — The Professional Approach</h3>
<p>Close <strong>50% of the position</strong> at 1:1 risk:reward (the "safe profit" level), then move stop to breakeven and let the remaining 50% run to the full target. This ensures the trade can never be a full loss once the first target is hit.</p>`,
        quiz: {
          questions: [
            {
              id: 'q12-2-1',
              question: 'Where should a stop loss ideally be placed on a bullish trade?',
              options: [
                'Exactly at the support level',
                'Below the support zone with a small buffer',
                '50 pips below entry, always',
                'At the previous day\'s low'
              ],
              correctAnswer: 1,
              explanation: 'Placing the stop below the support zone (not exactly at it) gives some room for normal market noise and prevents being stopped out by a wick that momentarily pierces the zone before price reverses.',
            },
            {
              id: 'q12-2-2',
              question: 'What is a trailing stop loss?',
              options: [
                'A stop that moves in the direction of profit as price moves favourably',
                'A stop placed after the entry',
                'A stop used only for short trades',
                'Setting the stop 50 pips behind entry'
              ],
              correctAnswer: 0,
              explanation: 'A trailing stop moves in the direction of the trade as price moves in your favour, but never backward. It locks in progressively more profit while still allowing the trade to run if the trend continues.',
            },
            {
              id: 'q12-2-3',
              question: 'What is the benefit of the "partial close" strategy at 1:1 R:R?',
              options: [
                'Doubles your profit',
                'Eliminates all risk and lets you run the rest of the position to full target risk-free',
                'Reduces broker commissions',
                'Applies only to breakout trades'
              ],
              correctAnswer: 1,
              explanation: 'Closing 50% at 1:1 means the profit from the closed portion covers the potential loss on the remaining portion. Move stop to breakeven — now the worst case on the whole trade is zero. Pure upside from there.',
            },
          ],
        },
      },
      {
        id: 'lesson-12-3',
        moduleId: 'module-12',
        lessonNumber: 3,
        title: 'Reading a Live Chart: Full Trade Walkthrough',
        description: 'Watch a complete trade from chart analysis to execution to exit — applied on a real EUR/USD setup.',
        duration: 20,
        videoTitle: 'Full Trade Walkthrough',
        content: `<h2>Reading a Live Chart: Full Trade Walkthrough</h2>
<p>Theory is essential, but the real skill comes from applying it to a live chart. In this lesson, we walk through a complete trade from start to finish on EUR/USD — the world's most traded currency pair.</p>

<h3>The Setup: EUR/USD Bullish Retest Trade</h3>
<img src="/images/lessons/trade-entry-chart.png" alt="Trade entry with Stop Loss and Take Profit on a real EUR/USD chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<p><strong>Setup:</strong> H4 uptrend confirmed (HH and HL structure). Price above 200 SMA (bullish bias). Previous resistance at 1.0850 broken — now acts as support. Price pulls back to 1.0845–1.0855 support zone.</p>

<h3>Confluence Scorecard for This Trade</h3>
<p><strong>Confluence Scorecard:</strong> ✅ H4 uptrend (+1) · ✅ Key support — old resistance (+1) · ✅ Bullish Hammer (+1) · ✅ Near 50 EMA H4 (+1) · ✅ London session timing (+1) = <strong>5/8 → TRADE IT</strong></p>

<h3>Trade Parameters</h3>
<p><strong>Trade parameters:</strong> Entry 1.0858 (market order after Hammer close). Stop 1.0838 (below Hammer wick + 5 pip buffer) = 20 pip stop. Target 1: 1.0898 (+40 pips, 1:1 — take 50% profit). Target 2: 1.0938 (+80 pips, 1:4 — trail remainder). RR = 1:4. Account $10,000, 1% risk = $100. Lot size = 0.5 lots.</p>

<h3>Managing the Trade</h3>
<p><strong>Trade management:</strong> Hour 1: price +20 pips → close 50% at 1.0878 (+$50), move stop to breakeven. Trade is now risk-free. Hour 4: price +52 pips → trail stop to 1.0880. Hour 7: price reaches 1.0940 near Target 2 → close remainder at 1.0938 (+80 pips, +$200). <strong>Total result: +$250 on $100 risk.</strong></p>

<h3>What Would Invalidate This Trade?</h3>
<p>• Price breaks below 1.0838 with a large bearish close → stop fires (−$100 loss)</p>
<p>• Price reaches entry zone but no bullish candle forms → do not enter</p>
<p>• High-impact news scheduled within 1 hour → reduce size or wait for news</p>
<p>• Score below 4 on confluence checklist → skip the trade</p>`,
        quiz: {
          questions: [
            {
              id: 'q12-3-1',
              question: 'In the EUR/USD trade walkthrough, why was the stop placed 5 pips below the Hammer wick?',
              options: [
                'Random pip distance',
                'To protect against stop hunting and normal market noise while being clearly wrong below the structure',
                'Required by the broker',
                '5 pips is always the correct buffer'
              ],
              correctAnswer: 1,
              explanation: 'The 5-pip buffer below the wick serves two purposes: it protects against stop hunting (where price briefly spikes through a level then reverses) while still being close enough that if price genuinely breaks that level, you know the trade thesis is wrong.',
            },
            {
              id: 'q12-3-2',
              question: 'What happened to the stop loss after Target 1 was reached?',
              options: [
                'It was cancelled',
                'It was tightened to 10 pips',
                'It was moved to breakeven (entry price)',
                'It remained at the original stop'
              ],
              correctAnswer: 2,
              explanation: 'After taking 50% profit at Target 1, the stop is moved to breakeven. This makes the overall trade risk-free — the worst outcome is now zero loss, while the remaining position can still hit Target 2.',
            },
            {
              id: 'q12-3-3',
              question: 'What was the final return on the $10,000 account in the walkthrough trade?',
              options: ['1%', '2.5%', '5%', '10%'],
              correctAnswer: 1,
              explanation: '$250 profit on a $10,000 account = 2.5%. This came from risking only 1% ($100) with a 1:4 Risk:Reward ratio, showing how compound growth builds significantly over many such trades.',
            },
          ],
        },
      },
      {
        id: 'lesson-12-4',
        moduleId: 'module-12',
        lessonNumber: 4,
        title: 'Demo Trading: 10 Practice Scenarios',
        description: 'Apply everything you have learned across 10 real-market chart scenarios — identify the setup, plan the trade, then check the answer.',
        duration: 25,
        videoTitle: 'Demo Trading Scenarios',
        content: `<h2>Demo Trading: 10 Practice Scenarios</h2>
<p>The following scenarios are based on real market conditions. For each one, read the description and chart, <strong>decide your trade before reading the answer</strong>, then compare your thinking to the professional analysis. This is how trading skill is built.</p>
<p><strong>Remember:</strong> Open your demo account at any major broker (see below) and re-create these scenarios on real charts.</p>

<h3>Scenario 1: The Classic Retest</h3>
<img src="/images/lessons/trade-entry-chart.png" alt="Trade entry with Stop Loss and Take Profit on a real EUR/USD chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<p><strong>Scenario 1 — The Classic Retest:</strong> EUR/USD H1. Bullish H4 trend. 1.0900 was resistance, now broken and pulled back as support. Bullish Engulfing forms at 1.0900. <strong>BUY.</strong> Entry 1.0905, Stop 1.0882 (below engulfing), Target 1.0951 (2:1 RR).</p>
<p>✅ <strong>Answer: BUY</strong> — Old resistance becomes support (flip). Bullish Engulfing confirms buyers. H4 uptrend aligns. Score: 5+. Entry: 1.0905, Stop: 1.0882 (below engulfing), Target: 1.0951 (2:1 RR).</p>

<h3>Scenario 2: The False Breakout Trap</h3>
<img src="/images/lessons/candlestick-chart.png" alt="Candlestick patterns on a real EUR/USD chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<p><strong>Scenario 2 — The False Breakout Trap:</strong> GBP/USD H4 ranging. Price spikes to 1.2665, closes at 1.2638 — Shooting Star above resistance on low volume. <strong>SELL.</strong> Close below 1.2640. Stop 1.2668 (above wick). Target 1.2580.</p>
<p>✅ <strong>Answer: SELL</strong> — Classic false breakout + shooting star at resistance. Price rejected resistance with low volume. Sell on close below 1.2640. Stop: 1.2668 (above the wick). Target: 1.2580. This is the "fakeout before the breakdown."</p>

<h3>Scenario 3: Head and Shoulders at Major High</h3>
<img src="/images/lessons/head-shoulders-chart.png" alt="Head and Shoulders pattern on a real EUR/USD chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<p><strong>Scenario 3 — H&S at Major High:</strong> USD/JPY Daily. H&S at 145.00 resistance. Left Shoulder 144.50, Head 145.20, Right Shoulder 144.30. Neckline 143.50. <strong>SELL on neckline break.</strong> Entry 143.45, Stop 144.50, Target 141.80.</p>
<p>✅ <strong>Answer: SELL</strong> — Complete Head & Shoulders. Right shoulder lower than left (buying exhaustion). Wait for H&S candle to CLOSE below 143.50 neckline. Entry: 143.45, Stop: 144.50 (above right shoulder). Target: 141.80 (neckline − head height).</p>

<h3>Scenario 4: Flag in Strong Uptrend</h3>
<img src="/images/lessons/chart-patterns-chart.png" alt="Chart patterns on real forex charts" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<p><strong>Scenario 4 — Flag in Strong Uptrend:</strong> AUD/USD H4. 180-pip flagpole, then bear flag consolidation with small candles and decreasing volume. <strong>BUY breakout above 0.6620.</strong> Stop 0.6598, Target 0.6800 (flagpole height added).</p>
<p>✅ <strong>Answer: BUY on breakout</strong> — Textbook bull flag. Strong flagpole + shallow orderly pullback + decreasing volume. Buy when price closes above 0.6620. Stop: 0.6598 (below channel). Target: 0.6620 + 180 pips = 0.6800.</p>

<h3>Scenario 5: Double Bottom at Major Support</h3>
<img src="/images/lessons/support-resistance-chart.png" alt="Support and resistance levels on a real EUR/USD chart" style="width:100%;border-radius:8px;display:block;margin:1.5rem 0" />
<p><strong>Scenario 5 — Double Bottom at Support:</strong> EUR/GBP H4. 0.8500 major support tested twice. Neckline at 0.8560. Doji at second bottom. <strong>BUY ON NECKLINE BREAK above 0.8560.</strong> Entry 0.8562, Stop 0.8498, Target 0.8622.</p>
<p>✅ <strong>Answer: BUY ON NECKLINE BREAK</strong> — Wait for close above 0.8560 to confirm the Double Bottom. Buying early at support is tempting but adds risk. Entry: 0.8562, Stop: 0.8498 (below both lows). Target: 0.8622 (neckline + depth of pattern = 0.8560 + 0.0060 = 0.8620).</p>

<h3>Scenarios 6–10: Quick Decisions</h3>
<p><strong>Scenarios 6–10 Quick Decisions:</strong><br>6. EUR/USD M15 — RSI divergence + Shooting Star at resistance → <strong>SELL</strong><br>7. GBP/JPY H1 — Ascending triangle, 4 resistance touches, strong breakout close + volume → <strong>BUY</strong><br>8. USD/CAD H4 — Distribution phase, small candles, long upper wicks, 50 SMA flattening → <strong>WAIT</strong> (no clear signal)<br>9. AUD/JPY H1 — Falling Wedge, price breaks upper line with strong bull candle → <strong>BUY</strong> (bullish reversal)<br>10. EUR/USD Daily — Touches 200 SMA, large Hammer, H4 uptrend confirmed, London session → <strong>BUY</strong></p>

<h3>Setting Up Your Demo Account</h3>
<p>Practice all these scenarios on a demo account. Recommended platforms:</p>
<p>• <strong>MetaTrader 4/5</strong> — industry standard, free, most brokers offer demo</p>
<p>• <strong>TradingView</strong> — best charts, free tier available, paper trading built in</p>
<p>• <strong>OANDA Demo</strong> — reliable broker, demo tracks real market prices</p>
<p>• <strong>IG Demo</strong> — $10,000 virtual funds, full platform access</p>
<p>Target: <strong>3 months of demo trading</strong> before risking real money. Aim for 60%+ win rate and consistent 1:2 RR on at least 50 trades before going live.</p>`,
        quiz: {
          questions: [
            {
              id: 'q12-4-1',
              question: 'In Scenario 2 (False Breakout), what clues told you NOT to buy the breakout?',
              options: [
                'The price was too high',
                'Long upper wick (rejection candle) + low volume on the breakout',
                'The trend was bullish',
                'It was during the Asian session'
              ],
              correctAnswer: 1,
              explanation: 'Two key signals: the Shooting Star pattern (long upper wick = price rejected the new highs) and the absence of volume confirmation. Real breakouts have high volume. Low-volume breakouts above resistance are frequently false.',
            },
            {
              id: 'q12-4-2',
              question: 'How long should you demo trade before considering live trading?',
              options: [
                '1 week',
                '2 weeks',
                'At least 3 months with 50+ trades and consistent profitability',
                'One day is enough if you understand the theory'
              ],
              correctAnswer: 2,
              explanation: '3 months and 50+ trades gives statistically meaningful data. Short-term demo results can be luck. You need enough trades to see if your strategy has genuine edge, and enough time to encounter different market conditions.',
            },
            {
              id: 'q12-4-3',
              question: 'In Scenario 10, what made it a "maximum confluence" setup?',
              options: [
                'Just the Hammer candle',
                'Just the 200 SMA',
                'Trend + 200 SMA + Hammer candle + London session timing all aligning',
                'Trading EUR/USD'
              ],
              correctAnswer: 2,
              explanation: 'Scenario 10 had four independent signals: the established uptrend, the 200 SMA dynamic support, the Hammer reversal candle, and the high-volume London session timing. This is the kind of setup serious traders wait for.',
            },
          ],
        },
      },
      {
        id: 'lesson-12-5',
        moduleId: 'module-12',
        lessonNumber: 5,
        title: 'Building Your Trading Plan',
        description: 'Create a written trading plan that defines every rule — the professional document that separates traders who last from those who blow accounts.',
        duration: 18,
        videoTitle: 'Your Trading Plan',
        content: `<h2>Building Your Trading Plan</h2>
<p>A trading plan is a written document that defines <em>every aspect</em> of how you trade. Without a plan, you make decisions emotionally in the heat of the moment — and emotional decisions lose money. With a plan, you follow rules. Rules make money over time.</p>

<h3>The Six Pillars of a Trading Plan</h3>
<p><strong>Pillar 1: Markets and Instruments</strong></p>
<p>Which currency pairs will you trade? Focus on 2–4 pairs maximum. Recommended for beginners:</p>
<ul>
  <li><strong>EUR/USD</strong> — Most liquid pair in the world</li>
  <li><strong>GBP/USD</strong> — High volatility, clear structure</li>
  <li><strong>USD/JPY</strong> — Trend-following pair, Asia/US crossover</li>
  <li><strong>USD/CHF</strong> — Safe haven correlation</li>
</ul>

<p><strong>Pillar 2: Timeframes</strong></p>
<p>Define your primary analysis and entry timeframes:</p>
<ul>
  <li><strong>Swing trader:</strong> D1 trend → H4 setup → H1 entry</li>
  <li><strong>Day trader:</strong> H4 trend → H1 setup → M15 entry</li>
  <li><strong>Scalper:</strong> H1 trend → M15 setup → M5 entry</li>
</ul>
<p>Rule: Never trade against the primary trend timeframe.</p>

<p><strong>Pillar 3: Strategy Rules</strong></p>
<p>Entry conditions — ALL must be true:</p>
<ul>
  <li>☐ Higher timeframe trend = defined direction</li>
  <li>☐ Price at S&amp;R level (support or resistance)</li>
  <li>☐ Confirming candlestick pattern</li>
  <li>☐ Confluence score 5+</li>
  <li>☐ No major news within 1 hour</li>
  <li>☐ Session: London or NY only</li>
</ul>
<p><strong>If any box is unchecked → NO TRADE.</strong></p>

<p><strong>Pillar 4: Risk Management Rules</strong></p>
<ul>
  <li>Maximum risk per trade: <strong>1% of account</strong></li>
  <li>Maximum open trades: <strong>3 simultaneously</strong></li>
  <li>Maximum daily loss: <strong>3%</strong> → stop for the day</li>
  <li>Maximum weekly loss: <strong>5%</strong> → stop for the week</li>
  <li>Minimum Risk:Reward: <strong>1:2</strong></li>
  <li>Review process after 3 consecutive losses</li>
</ul>

<p><strong>Pillar 5: Trading Schedule</strong></p>
<ul>
  <li><strong>Trade hours:</strong> 8 AM–5 PM GMT (London) · 1 PM–8 PM GMT (New York)</li>
  <li><strong>Avoid:</strong> Sunday open · Friday after 5 PM · Major news events</li>
  <li><strong>Chart review times:</strong> London open · NY open · 5 PM close</li>
</ul>

<p><strong>Pillar 6: Journal and Review</strong></p>
<p>Log every trade: Date · Pair · Direction · Entry · Stop · Target · Outcome · Lessons learned</p>
<p>Weekly review: Win rate · Average R:R achieved · Rule adherence · Emotional trades · Improvement areas</p>

<h3>The Mental Side of the Plan</h3>
<p>Add a section to your plan for <strong>psychological rules</strong>:</p>
<p>• "I will not trade when angry, stressed or sleep-deprived"</p>
<p>• "I will not increase position size after a loss to 'make it back'"</p>
<p>• "After 3 consecutive losses, I review my process before next trade"</p>
<p>• "I accept that losses are part of the business — each loss pays for information"</p>

<h3>The Plan is Only Valuable if You Follow It</h3>
<p>Writing the plan is 10% of the work. <strong>Following it when you're excited, scared or bored is 90%.</strong> Most losing traders have a plan — they just don't follow it. Discipline is the ultimate trading edge.</p>`,
        quiz: {
          questions: [
            {
              id: 'q12-5-1',
              question: 'What is the recommended maximum risk per trade in a professional trading plan?',
              options: ['5% of account', '10% of account', '1% of account', '0.1% of account'],
              correctAnswer: 2,
              explanation: '1% risk per trade means you need to lose 100 consecutive trades to lose your entire account — practically impossible with a good strategy. It allows you to survive long losing streaks and trade calmly without emotional pressure.',
            },
            {
              id: 'q12-5-2',
              question: 'For a swing trader, what is the recommended timeframe stack?',
              options: [
                'M1 trend | M5 setup | M15 entry',
                'H4 trend | H1 setup | M15 entry',
                'D1 trend | H4 setup | H1 entry',
                'W1 trend | D1 setup | H4 entry'
              ],
              correctAnswer: 2,
              explanation: 'Swing trading uses D1 (daily) for trend direction, H4 for identifying setups and key levels, and H1 for precise entry timing. This balance provides clear signals without excessive screen time.',
            },
            {
              id: 'q12-5-3',
              question: 'What should a trader do after reaching the maximum daily loss limit (3%)?',
              options: [
                'Continue trading but reduce size',
                'Stop trading for the rest of the day',
                'Increase size to recover losses faster',
                'Switch to a different currency pair'
              ],
              correctAnswer: 1,
              explanation: 'After hitting the daily loss limit, stop immediately — no exceptions. Trying to recover losses on a bad day usually leads to more losses. The market will be there tomorrow. Protecting capital is always the priority.',
            },
          ],
        },
      },
      {
        id: 'lesson-12-6',
        moduleId: 'module-12',
        lessonNumber: 6,
        title: 'From Demo to Live: Your 90-Day Launch Plan',
        description: 'A structured 90-day programme to bridge the gap from demo proficiency to live account confidence.',
        duration: 16,
        videoTitle: '90-Day Launch Plan',
        content: `<h2>From Demo to Live: Your 90-Day Launch Plan</h2>
<p>The transition from demo to live trading is where most traders fail — not because of lack of knowledge but because of psychology. Real money changes everything. This 90-day plan bridges that gap systematically.</p>

<h3>Month 1: Foundation (Demo Account)</h3>
<p><strong>Week 1–2: Setup and Familiarisation</strong></p>
<ul>
  <li>☐ Open demo account (MetaTrader or TradingView)</li>
  <li>☐ Set virtual balance to $10,000</li>
  <li>☐ Configure 1% risk per trade (position calculator)</li>
  <li>☐ Mark H4 and D1 support/resistance levels on EUR/USD, GBP/USD, USD/JPY</li>
  <li>☐ Identify the current trend on each pair</li>
  <li>☐ Place 5 practice trades to feel the platform</li>
</ul>
<p><strong>Week 3–4: First Real Strategy Trades</strong></p>
<ul>
  <li>☐ Trade only with the strategy rules from Lesson 12-5</li>
  <li>☐ Journal every trade</li>
  <li>☐ Target: 20 trades minimum</li>
  <li>☐ Review at week end: win rate, average R:R, rule adherence</li>
</ul>

<h3>Month 2: Consistency (Demo)</h3>
<p><strong>Week 5–8: Building the Data Set</strong></p>
<ul>
  <li>☐ Continue journaling every trade</li>
  <li>☐ Target: 50 total trades on demo</li>
  <li>☐ Track: Win rate · Avg R:R · Largest win · Largest loss</li>
</ul>
<p>Success criteria to proceed to Month 3:</p>
<ul>
  <li>☐ Win rate &gt; 50%</li>
  <li>☐ Average achieved R:R &gt; 1.5:1</li>
  <li>☐ Less than 10% of trades break the rules</li>
  <li>☐ No losing weeks greater than 3%</li>
</ul>

<h3>Month 3: Micro Live Account</h3>
<p><strong>Week 9–12:</strong> Deposit $200–$500. Risk per trade: 0.5% ($1–$2.50). Goal is NOT to profit — goal is to trade identically to demo.</p>
<p>The test — are your emotions affecting decisions?</p>
<ul>
  <li>Are you holding winners longer than planned? (greed)</li>
  <li>Are you cutting losses earlier than the stop? (fear)</li>
  <li>Are you taking trades not in the plan? (FOMO)</li>
</ul>
<p>If YES to any → stay at micro level. If NO → ready to scale gradually.</p>

<h3>The Scaling Schedule</h3>
<ul>
  <li><strong>Start:</strong> $500 account, 0.5% risk</li>
  <li><strong>After 3 months profitable:</strong> $1,000, 0.75% risk</li>
  <li><strong>After 6 months profitable:</strong> $2,500, 1% risk</li>
  <li><strong>After 12 months profitable:</strong> $5,000–$10,000, 1% risk</li>
</ul>
<p><strong>Never increase size after a losing streak. Always increase size only after consistent profitability.</strong></p>

<h3>The Professional Mindset Checklist</h3>
<ul>
  <li>✅ I trade my plan, not my emotions</li>
  <li>✅ I accept every losing trade as a cost of doing business</li>
  <li>✅ I measure success in months and years, not trades</li>
  <li>✅ I never risk money I cannot afford to lose</li>
  <li>✅ I review my performance weekly and improve continuously</li>
  <li>✅ 90% of retail traders lose — I will be the 10% by following the rules, always</li>
</ul>

<h3>Recommended Resources for Continued Learning</h3>
<p>• <strong>Books:</strong> "Trading in the Zone" (Mark Douglas), "The New Trading for a Living" (Alexander Elder)</p>
<p>• <strong>Tools:</strong> TradingView (charting), ForexFactory (economic calendar), Myfxbook (journal)</p>
<p>• <strong>Practice:</strong> Use TradingView replay feature to practice setups on historical data — thousands of hours of free practice</p>
<p>• <strong>Community:</strong> Join trading communities to share setups, get feedback, stay accountable</p>

<h3>Final Words</h3>
<p>You now have more education than most retail traders ever acquire. The difference between knowing and doing is practice and discipline. Open your demo account today. Journal your first trade today. Review it this weekend.</p>
<p><strong>The market is open every weekday. Your journey begins now.</strong></p>`,
        quiz: {
          questions: [
            {
              id: 'q12-6-1',
              question: 'What is the PRIMARY goal of the Month 3 micro live account phase?',
              options: [
                'Make as much profit as possible',
                'Test the broker platform',
                'Trade identically to demo — proving emotions don\'t affect decisions with real money',
                'Build confidence by taking large positions'
              ],
              correctAnswer: 2,
              explanation: 'The micro live phase is a psychological test, not a profit mission. If you trade the same way with $1 at risk as with virtual $100, you\'re mentally ready to scale. If emotions change your behaviour, stay micro until they don\'t.',
            },
            {
              id: 'q12-6-2',
              question: 'When should you increase your position size?',
              options: [
                'After a big loss, to recover faster',
                'Whenever you feel confident',
                'Only after consistent profitability over multiple months',
                'After reading more books'
              ],
              correctAnswer: 2,
              explanation: 'Size should only increase after proven, consistent profitability over meaningful time. Increasing after losses is revenge trading. Increasing based on feeling is emotional trading. Data and consistency are the only valid reasons.',
            },
            {
              id: 'q12-6-3',
              question: 'Which book is recommended for trading psychology?',
              options: [
                'The Intelligent Investor',
                'Trading in the Zone by Mark Douglas',
                'Rich Dad Poor Dad',
                'Flash Boys'
              ],
              correctAnswer: 1,
              explanation: '"Trading in the Zone" by Mark Douglas is the most widely recommended trading psychology book. It addresses the mental framework required to execute a strategy consistently — the main reason most traders fail despite having good strategies.',
            },
          ],
        },
      },
    ],
  },
]

export function getModuleById(id: string): Module | undefined {
  return courseModules.find(m => m.id === id)
}

export function getLessonById(moduleId: string, lessonId: string): { lesson: Lesson; module: Module } | undefined {
  const mod = getModuleById(moduleId)
  if (!mod) return undefined
  const lesson = mod.lessons.find(l => l.id === lessonId)
  if (!lesson) return undefined
  return { lesson, module: mod }
}

export function getAdjacentLessons(moduleId: string, lessonId: string): {
  prev: { moduleId: string; lessonId: string } | null
  next: { moduleId: string; lessonId: string } | null
} {
  const allLessons: Array<{ moduleId: string; lessonId: string }> = []
  for (const mod of courseModules) {
    for (const lesson of mod.lessons) {
      allLessons.push({ moduleId: mod.id, lessonId: lesson.id })
    }
  }
  const idx = allLessons.findIndex(l => l.moduleId === moduleId && l.lessonId === lessonId)
  return {
    prev: idx > 0 ? allLessons[idx - 1] : null,
    next: idx < allLessons.length - 1 ? allLessons[idx + 1] : null,
  }
}

export const totalLessons = courseModules.reduce((acc, m) => acc + m.lessons.length, 0)
