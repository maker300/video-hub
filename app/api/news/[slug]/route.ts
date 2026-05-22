import { NextResponse } from 'next/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NewsItem {
  title:           string
  link:            string
  source:          string
  publishedAt:     number
  impact?:         'high' | 'medium' | 'low'
  isCalendarEvent: boolean
}

// ── Pair configuration ────────────────────────────────────────────────────────
// ffCurrencies: ForexFactory currency codes to match in calendar
// keywords: phrase matches for news article filtering (any match = include)

interface PairConfig {
  ffCurrencies: string[]
  keywords:     string[]
  yQuery:       string   // Yahoo Finance fallback search query
}

const PAIR_CONFIG: Record<string, PairConfig> = {
  // ── Forex ──
  'eur-usd': { ffCurrencies: ['EUR','USD'], keywords: ['EUR/USD','EURUSD','euro','ECB','eurozone','European Central Bank','Federal Reserve','Fed rate','dollar index','DXY'], yQuery: 'EUR USD euro dollar forex' },
  'gbp-usd': { ffCurrencies: ['GBP','USD'], keywords: ['GBP/USD','GBPUSD','sterling','pound','cable','Bank of England','BoE','Federal Reserve','dollar'], yQuery: 'GBP USD pound dollar forex' },
  'usd-jpy': { ffCurrencies: ['USD','JPY'], keywords: ['USD/JPY','USDJPY','yen','Bank of Japan','BoJ','BOJ','Federal Reserve','dollar yen'], yQuery: 'USD JPY dollar yen forex' },
  'aud-usd': { ffCurrencies: ['AUD','USD'], keywords: ['AUD/USD','AUDUSD','aussie','Australian dollar','RBA','Reserve Bank of Australia','Federal Reserve'], yQuery: 'AUD USD Australian dollar forex' },
  'usd-cad': { ffCurrencies: ['USD','CAD'], keywords: ['USD/CAD','USDCAD','loonie','Canadian dollar','Bank of Canada','BoC','oil prices','Federal Reserve'], yQuery: 'USD CAD Canadian dollar forex' },
  'usd-chf': { ffCurrencies: ['USD','CHF'], keywords: ['USD/CHF','USDCHF','Swiss franc','SNB','Swiss National Bank','Federal Reserve'], yQuery: 'USD CHF Swiss franc forex' },
  'nzd-usd': { ffCurrencies: ['NZD','USD'], keywords: ['NZD/USD','NZDUSD','kiwi','New Zealand dollar','RBNZ','Reserve Bank of New Zealand'], yQuery: 'NZD USD New Zealand dollar forex' },
  'eur-gbp': { ffCurrencies: ['EUR','GBP'], keywords: ['EUR/GBP','EURGBP','euro pound','ECB','Bank of England','BoE','eurozone','sterling'], yQuery: 'EUR GBP euro pound forex' },
  'gbp-jpy': { ffCurrencies: ['GBP','JPY'], keywords: ['GBP/JPY','GBPJPY','pound yen','sterling yen','Bank of England','Bank of Japan'], yQuery: 'GBP JPY pound yen forex' },
  'eur-jpy': { ffCurrencies: ['EUR','JPY'], keywords: ['EUR/JPY','EURJPY','euro yen','ECB','Bank of Japan','BoJ'], yQuery: 'EUR JPY euro yen forex' },
  // ── Commodities ──
  'xau-usd': { ffCurrencies: ['USD'], keywords: ['gold','XAU','bullion','precious metals','Federal Reserve','inflation','safe haven','gold price'], yQuery: 'gold price XAU USD commodities' },
  'xag-usd': { ffCurrencies: ['USD'], keywords: ['silver','XAG','precious metals','gold silver','inflation','industrial metals'], yQuery: 'silver price XAG USD commodities' },
  'wti-usd': { ffCurrencies: ['USD'], keywords: ['crude oil','WTI','oil price','OPEC','petroleum','barrel','energy'], yQuery: 'WTI crude oil price energy' },
  'copper':  { ffCurrencies: ['USD'], keywords: ['copper','base metals','industrial metals','China demand','copper price'], yQuery: 'copper price commodities metals' },
  // ── Indices ──
  'sp-500':  { ffCurrencies: ['USD'], keywords: ['S&P 500','SP500','S&P500','stock market','Wall Street','Fed','equities','US stocks'], yQuery: 'S&P 500 stock market US equities' },
  'dj-30':   { ffCurrencies: ['USD'], keywords: ['Dow Jones','DJIA','Dow 30','Wall Street','US stocks','equity'], yQuery: 'Dow Jones stock market US equities' },
  'nas-100': { ffCurrencies: ['USD'], keywords: ['Nasdaq','NQ','tech stocks','QQQ','technology','FAANG','US equities'], yQuery: 'Nasdaq 100 tech stocks US' },
  // ── Stocks ──
  'apple':     { ffCurrencies: ['USD'], keywords: ['Apple','AAPL','iPhone','Tim Cook','App Store','iOS','MacBook'], yQuery: 'Apple AAPL stock earnings' },
  'microsoft': { ffCurrencies: ['USD'], keywords: ['Microsoft','MSFT','Azure','Windows','Satya Nadella','OpenAI','Teams'], yQuery: 'Microsoft MSFT stock earnings' },
  'google':    { ffCurrencies: ['USD'], keywords: ['Google','GOOGL','Alphabet','Search','YouTube','Android','AI Gemini'], yQuery: 'Google Alphabet GOOGL stock earnings' },
  'tesla':     { ffCurrencies: ['USD'], keywords: ['Tesla','TSLA','Elon Musk','EV','electric vehicle','Cybertruck','Powerwall'], yQuery: 'Tesla TSLA stock EV earnings' },
  // ── Crypto ──
  'btc-usd':  { ffCurrencies: ['USD'], keywords: ['Bitcoin','BTC','crypto','cryptocurrency','digital asset','blockchain','ETF','halving'], yQuery: 'Bitcoin BTC crypto price' },
  'eth-usd':  { ffCurrencies: ['USD'], keywords: ['Ethereum','ETH','crypto','DeFi','smart contract','Layer 2','staking'], yQuery: 'Ethereum ETH crypto price' },
  'sol-usd':  { ffCurrencies: ['USD'], keywords: ['Solana','SOL','crypto','blockchain','DeFi','NFT'], yQuery: 'Solana SOL crypto price' },
  'xrp-usd':  { ffCurrencies: ['USD'], keywords: ['XRP','Ripple','crypto','SEC','SWIFT','payment'], yQuery: 'XRP Ripple crypto price SEC' },
  'bnb-usd':  { ffCurrencies: ['USD'], keywords: ['BNB','Binance','crypto','exchange token'], yQuery: 'BNB Binance crypto price' },
  'doge-usd': { ffCurrencies: ['USD'], keywords: ['Dogecoin','DOGE','crypto','meme coin','Elon Musk'], yQuery: 'Dogecoin DOGE crypto price' },
}

// ── Cache ─────────────────────────────────────────────────────────────────────

interface CacheEntry { items: NewsItem[]; ts: number }
const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 15 * 60 * 1000  // 15 minutes

// ── XML helpers ───────────────────────────────────────────────────────────────

function extractTag(xml: string, tag: string): string {
  const patterns = [
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i'),
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'),
  ]
  for (const re of patterns) {
    const m = xml.match(re)
    if (m?.[1]) return m[1].trim()
  }
  return ''
}

function extractAllBlocks(xml: string, tag: string): string[] {
  const blocks: string[] = []
  const re = new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) blocks.push(m[0])
  return blocks
}

function parseRSSDate(str: string): number {
  if (!str) return 0
  try { return new Date(str).getTime() } catch { return 0 }
}

// ── Browser-like headers to avoid blocks ─────────────────────────────────────

const HEADERS = {
  'User-Agent':      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Accept':          'application/rss+xml, application/xml, text/xml, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control':   'no-cache',
}

// ── ForexFactory Calendar ─────────────────────────────────────────────────────
// Fetches the weekly economic calendar XML, filters by currency + impact + 2-day window

async function fetchForexFactory(currencies: string[]): Promise<NewsItem[]> {
  const TWO_DAYS = 2 * 24 * 60 * 60 * 1000
  const now = Date.now()

  try {
    const res = await fetch('https://www.forexfactory.com/calendar.xml', {
      headers: HEADERS,
      signal:  AbortSignal.timeout(8_000),
    })
    if (!res.ok) return []
    const xml = await res.text()

    const events = extractAllBlocks(xml, 'event')
    const items: NewsItem[] = []

    for (const ev of events) {
      const currency = extractTag(ev, 'country') || extractTag(ev, 'currency')
      if (!currencies.includes(currency.toUpperCase())) continue

      const impact  = extractTag(ev, 'impact').toLowerCase() as 'high' | 'medium' | 'low'
      if (!['high', 'medium'].includes(impact)) continue  // skip low impact

      // Parse date + time  e.g. "Apr 18, 2025" "8:30am"
      const dateStr = extractTag(ev, 'date')
      const timeStr = extractTag(ev, 'time')
      const ts      = parseRSSDate(`${dateStr} ${timeStr}`)
      if (!ts) continue

      // Include events within the past 2 days OR today upcoming
      const diff = now - ts
      if (diff < 0 || diff > TWO_DAYS) continue

      const title    = extractTag(ev, 'title')
      const actual   = extractTag(ev, 'actual')
      const forecast = extractTag(ev, 'forecast')
      const previous = extractTag(ev, 'previous')

      // Build descriptive title
      let desc = `[${currency}] ${title}`
      if (actual)   desc += ` — Actual: ${actual}`
      if (forecast) desc += ` | Forecast: ${forecast}`
      if (previous) desc += ` | Prev: ${previous}`

      items.push({
        title:           desc,
        link:            'https://www.forexfactory.com/calendar',
        source:          'ForexFactory',
        publishedAt:     ts,
        impact:          impact,
        isCalendarEvent: true,
      })
    }

    return items
  } catch {
    return []
  }
}

// ── RSS feed parser ────────────────────────────────────────────────────────────

async function fetchRSS(url: string, sourceName: string, keywords: string[]): Promise<NewsItem[]> {
  const TWO_DAYS = 2 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const kwLower = keywords.map(k => k.toLowerCase())

  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal:  AbortSignal.timeout(8_000),
    })
    if (!res.ok) return []
    const xml = await res.text()

    const items  = extractAllBlocks(xml, 'item')
    const result: NewsItem[] = []

    for (const item of items) {
      const title   = extractTag(item, 'title')
      const link    = extractTag(item, 'link') || extractTag(item, 'guid')
      const pubDate = extractTag(item, 'pubDate') || extractTag(item, 'dc:date') || extractTag(item, 'published')
      const desc    = extractTag(item, 'description') || extractTag(item, 'summary') || ''

      if (!title || !link) continue

      const ts = parseRSSDate(pubDate)
      if (!ts || (now - ts) > TWO_DAYS) continue

      // Keyword filter — must match at least one keyword in title or description
      const haystack = (title + ' ' + desc).toLowerCase()
      const relevant  = kwLower.some(kw => haystack.includes(kw))
      if (!relevant) continue

      result.push({
        title:           title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
        link:            link.trim(),
        source:          sourceName,
        publishedAt:     ts,
        isCalendarEvent: false,
      })
    }

    return result
  } catch {
    return []
  }
}

// ── Yahoo Finance fallback ────────────────────────────────────────────────────

async function fetchYahooNews(query: string, keywords: string[]): Promise<NewsItem[]> {
  const TWO_DAYS = 2 * 24 * 60 * 60 * 1000
  const now = Date.now()
  const kwLower = keywords.map(k => k.toLowerCase())

  try {
    // Dynamic import to avoid SSR issues with yahoo-finance2
    const { default: YahooFinance } = await import('yahoo-finance2')
    const yf  = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] })
    type N = { title?: string; link?: string; publisher?: string; providerPublishTime?: Date | number }
    const res = await (yf.search as (q: string, opts?: object, extra?: object) => Promise<{ news?: N[] }>)(
      query, { newsCount: 10 }, { validateResult: false }
    )

    return (res.news ?? [])
      .map(n => {
        const ts = n.providerPublishTime instanceof Date
          ? n.providerPublishTime.getTime()
          : typeof n.providerPublishTime === 'number' ? n.providerPublishTime * 1000 : 0
        return { n, ts }
      })
      .filter(({ n, ts }) => {
        if (!ts || !n.title || !n.link) return false
        if ((now - ts) > TWO_DAYS) return false
        const haystack = String(n.title).toLowerCase()
        return kwLower.some(kw => haystack.includes(kw))
      })
      .map(({ n, ts }) => ({
        title:           String(n.title ?? ''),
        link:            String(n.link ?? ''),
        source:          String(n.publisher ?? 'Yahoo Finance'),
        publishedAt:     ts,
        isCalendarEvent: false,
      }))
  } catch {
    return []
  }
}

// ── Deduplicate by title similarity ───────────────────────────────────────────

function deduplicate(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>()
  return items.filter(item => {
    // Normalise: lowercase, strip punctuation, take first 60 chars
    const key = item.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').slice(0, 60).trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const cached = cache.get(slug)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.items)
  }

  const config = PAIR_CONFIG[slug]
  if (!config) {
    return NextResponse.json([])
  }

  // Fetch all sources in parallel
  const [ffItems, forexLiveItems, fxStreetItems, yahooItems] = await Promise.all([
    fetchForexFactory(config.ffCurrencies),
    fetchRSS('https://www.forexlive.com/feed/', 'ForexLive', config.keywords),
    fetchRSS('https://www.fxstreet.com/rss/news', 'FXStreet', config.keywords),
    fetchYahooNews(config.yQuery, config.keywords),
  ])

  // Combine: FF calendar first (high/medium impact), then articles sorted by time
  const ffHigh   = ffItems.filter(i => i.impact === 'high')
  const ffMedium = ffItems.filter(i => i.impact === 'medium')
  const articles = [...forexLiveItems, ...fxStreetItems, ...yahooItems]
    .sort((a, b) => b.publishedAt - a.publishedAt)

  const combined = deduplicate([...ffHigh, ...ffMedium, ...articles])
  const top8     = combined.slice(0, 8)

  cache.set(slug, { items: top8, ts: Date.now() })

  return NextResponse.json(top8, {
    headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300' },
  })
}
