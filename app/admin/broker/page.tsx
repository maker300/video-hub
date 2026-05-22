'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle,
  RefreshCw, TrendingUp, TrendingDown, Clock,
  DollarSign, Activity, Shield, Copy, Check,
  Send, Download, Terminal, AlertTriangle, AlertCircle,
} from 'lucide-react'

interface BotStatus {
  connected:   boolean
  botName?:    string
  botUsername?: string
  chatIdSet:   boolean
  eaKeySet:    boolean
  balanceSet:  boolean
  balance?:    number | null
  error?:      string
}

interface BrokerTrade {
  id:            string
  slug:          string
  display:       string
  decision:      string
  confidence:    number
  entryLow:      number
  entryHigh:     number
  stopLoss:      number
  tp1:           number
  tp2:           number
  tp3:           number
  rrRatio:       string
  lotSize:       number
  priceAtSignal: number
  status:        string
  expiresAt:     string
  approvedAt?:   string
  executedPrice?: number
  brokerOrderId?: string
  closedAt?:     string
  outcome?:      string
  pnlPips?:      number
  createdAt:     string
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'text-amber-400 bg-amber-500/10 border-amber-500/30',
  approved:  'text-blue-400 bg-blue-500/10 border-blue-500/30',
  executing: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
  executed:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  rejected:  'text-red-400 bg-red-500/10 border-red-500/30',
  failed:    'text-orange-400 bg-orange-500/10 border-orange-500/30',
  expired:   'text-gray-500 bg-white/5 border-white/10',
  closed:    'text-violet-400 bg-violet-500/10 border-violet-500/30',
}

export default function BrokerPage() {
  const [bot,          setBot]          = useState<BotStatus | null>(null)
  const [trades,       setTrades]       = useState<BrokerTrade[]>([])
  const [loadingBot,   setLoadingBot]   = useState(true)
  const [loadingTrades,setLoadingTrades]= useState(true)
  const [gettingChatId,setGettingChatId]= useState(false)
  const [chatIdResult,  setChatIdResult]  = useState<{ ok: boolean; msg: string } | null>(null)
  const [copied,        setCopied]        = useState('')
  const [testingSend,   setTestingSend]   = useState(false)
  const [testSendResult,setTestSendResult]= useState<{ ok: boolean; msg: string } | null>(null)
  const [scanning,      setScanning]      = useState(false)
  const [scanResult,    setScanResult]    = useState<{ ok: boolean; msg: string } | null>(null)

  const loadBot = useCallback(async () => {
    setLoadingBot(true)
    try {
      const r = await fetch('/api/broker/connect')
      setBot(await r.json())
    } finally {
      setLoadingBot(false)
    }
  }, [])

  const loadTrades = useCallback(async () => {
    setLoadingTrades(true)
    try {
      const r = await fetch('/api/broker/signal')
      setTrades(await r.json())
    } finally {
      setLoadingTrades(false)
    }
  }, [])

  useEffect(() => { loadBot(); loadTrades() }, [loadBot, loadTrades])

  async function sendTestAlert() {
    setTestingSend(true); setTestSendResult(null)
    try {
      const r    = await fetch('/api/broker/telegram-test', { method: 'POST' })
      const data = await r.json()
      if (!r.ok) {
        setTestSendResult({ ok: false, msg: data.error ?? 'Failed' })
      } else {
        setTestSendResult({ ok: true, msg: data.instructions ?? 'Test alert sent! Check your Telegram.' })
        loadBot()
      }
    } catch {
      setTestSendResult({ ok: false, msg: 'Request failed' })
    } finally {
      setTestingSend(false)
    }
  }

  async function getChatId() {
    setGettingChatId(true); setChatIdResult(null)
    try {
      const r    = await fetch('/api/broker/connect', { method: 'POST' })
      const data = await r.json()
      if (!r.ok) {
        setChatIdResult({ ok: false, msg: data.error ?? 'Failed' })
      } else {
        setChatIdResult({ ok: true, msg: data.instructions ?? `Chat ID: ${data.chatId}` })
      }
    } catch {
      setChatIdResult({ ok: false, msg: 'Request failed' })
    } finally {
      setGettingChatId(false)
    }
  }

  async function scanNow() {
    setScanning(true); setScanResult(null)
    try {
      const r    = await fetch('/api/cron/scan')
      const data = await r.json()
      if (!r.ok) {
        setScanResult({ ok: false, msg: data.error ?? 'Scan failed' })
      } else if (data.skipped) {
        setScanResult({ ok: true, msg: `Skipped: ${data.skipped}` })
      } else {
        setScanResult({ ok: true, msg: data.alerts > 0 ? `${data.alerts} signal${data.alerts > 1 ? 's' : ''} found from ${data.scanned} instruments — check Telegram!` : `Scanned ${data.scanned} instruments — no signals met the threshold right now.` })
        if (data.alerts > 0) loadTrades()
      }
    } catch {
      setScanResult({ ok: false, msg: 'Request failed' })
    } finally {
      setScanning(false)
    }
  }

  async function executeAction(tradeId: string, action: 'approve' | 'reject' | 'retry' | 'cancel') {
    try {
      const r    = await fetch('/api/broker/execute', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tradeId, action }),
      })
      const data = await r.json()
      if (!r.ok) { alert(data.error ?? 'Action failed'); return }
      loadTrades()
    } catch {
      alert('Request failed')
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const pending  = trades.filter(t => t.status === 'pending')
  const running  = trades.filter(t => ['approved', 'executing'].includes(t.status))
  const failed   = trades.filter(t => t.status === 'failed')
  const recent   = trades.filter(t => !['pending', 'approved', 'executing', 'failed'].includes(t.status))

  return (
    <div className="min-h-screen bg-[#080e1a] text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-gray-500 hover:text-gray-300 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <Shield className="w-6 h-6 text-emerald-400" />
              Broker Integration
            </h1>
            <p className="text-sm text-gray-500">Admin-only · Vantage MT4/MT5 via EA + Telegram</p>
          </div>
        </div>

        {/* ── Telegram Status ─────────────────────────────────────────────────── */}
        <div className="bg-[#131722] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-400" />
              Telegram Notifications
            </h2>
            <button onClick={loadBot} className="text-gray-500 hover:text-gray-300 transition">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loadingBot ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking…
            </div>
          ) : (
            <div className="space-y-4">
              {/* Status grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Bot Token',
                    ok: bot?.connected,
                    val: bot?.connected ? `@${bot.botUsername}` : 'Not set',
                    err: bot?.error,
                  },
                  { label: 'Chat ID',       ok: bot?.chatIdSet,  val: bot?.chatIdSet  ? 'Set ✓' : 'Not set' },
                  { label: 'EA API Key',    ok: bot?.eaKeySet,   val: bot?.eaKeySet   ? 'Set ✓' : 'Not set' },
                  { label: 'Account Bal',  ok: bot?.balanceSet, val: bot?.balanceSet && bot.balance ? `$${bot.balance.toLocaleString()}` : 'Not set' },
                ].map(({ label, ok, val, err }) => (
                  <div key={label} className="bg-[#0d1420] rounded-xl p-3">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
                    <p className={`text-sm font-bold ${ok ? 'text-emerald-400' : 'text-amber-400'}`}>{val}</p>
                    {err && <p className="text-[10px] text-red-400 mt-0.5 truncate">{err}</p>}
                  </div>
                ))}
              </div>

              {/* Get chat ID helper */}
              {!bot?.chatIdSet && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-3">
                  <p className="text-xs text-blue-300 font-semibold">Get your Telegram Chat ID</p>
                  <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Open Telegram and send any message to your bot</li>
                    <li>Click the button below to detect your chat ID</li>
                    <li>Copy it and add <code className="text-amber-400">TELEGRAM_CHAT_ID</code> to Vercel env vars</li>
                  </ol>
                  <button
                    onClick={getChatId}
                    disabled={gettingChatId}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm font-semibold rounded-xl hover:bg-blue-600/35 disabled:opacity-50 transition"
                  >
                    {gettingChatId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                    {gettingChatId ? 'Detecting…' : 'Get My Chat ID'}
                  </button>
                  {chatIdResult && (
                    <div className={`flex items-start gap-2 text-xs rounded-xl px-3 py-2.5 border ${
                      chatIdResult.ok
                        ? 'text-emerald-300 bg-emerald-500/8 border-emerald-500/20'
                        : 'text-red-300 bg-red-500/8 border-red-500/20'
                    }`}>
                      {chatIdResult.ok
                        ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        : <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                      {chatIdResult.msg}
                    </div>
                  )}
                </div>
              )}

              {/* Send test alert */}
              <div className="pt-1">
                <button
                  onClick={sendTestAlert}
                  disabled={testingSend}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-sm font-bold rounded-xl hover:bg-emerald-600/35 disabled:opacity-50 transition"
                >
                  {testingSend ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {testingSend ? 'Sending…' : 'Send Test Alert'}
                </button>
                {testSendResult && (
                  <div className={`mt-2 flex items-start gap-2 text-xs rounded-xl px-3 py-2.5 border ${
                    testSendResult.ok
                      ? 'text-emerald-300 bg-emerald-500/8 border-emerald-500/20'
                      : 'text-red-300 bg-red-500/8 border-red-500/20'
                  }`}>
                    {testSendResult.ok
                      ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      : <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                    {testSendResult.msg}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Vercel Environment Variables ────────────────────────────────────── */}
        <div className="bg-[#131722] border border-white/10 rounded-2xl p-6">
          <h2 className="font-bold text-white mb-1 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            Required Vercel Environment Variables
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Add these in Vercel → Project → Settings → Environment Variables, then redeploy.
          </p>
          <div className="space-y-2">
            {[
              { key: 'TELEGRAM_BOT_TOKEN',  hint: 'Your Telegram bot token from @BotFather' },
              { key: 'TELEGRAM_CHAT_ID',    hint: 'Your personal Telegram chat ID (use "Get My Chat ID" above)' },
              { key: 'EA_API_KEY',          hint: 'Any strong random secret — paste the same value into the EA input' },
              { key: 'BROKER_BALANCE_USD',  hint: 'Your account balance in USD — used for automatic lot size calculation' },
            ].map(({ key, hint }) => (
              <div key={key} className="flex items-start gap-3 bg-[#0d1420] rounded-xl px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-amber-400 text-xs font-bold">{key}</code>
                    <button
                      onClick={() => copy(key, key)}
                      className="text-gray-600 hover:text-gray-400 transition"
                    >
                      {copied === key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-0.5">{hint}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── EA Setup ──────────────────────────────────────────────────────────── */}
        <div className="bg-[#131722] border border-white/10 rounded-2xl p-6">
          <h2 className="font-bold text-white mb-1 flex items-center gap-2">
            <Download className="w-4 h-4 text-violet-400" />
            Expert Advisor Setup
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            The EA runs inside your MT4 or MT5 terminal, polls this server every 5 seconds for approved trades, and executes them automatically.
          </p>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <a
                href="/ea/FMTrader.mq5"
                download="FMTrader.mq5"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600/20 border border-violet-500/30 text-violet-300 text-sm font-bold rounded-xl hover:bg-violet-600/35 transition"
              >
                <Download className="w-4 h-4" />
                Download FMTrader.mq5 (MT5)
              </a>
              <a
                href="/ea/FMTrader.mq4"
                download="FMTrader.mq4"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 text-gray-400 text-sm font-medium rounded-xl hover:bg-white/10 transition"
              >
                <Download className="w-4 h-4" />
                Download FMTrader.mq4 (MT4)
              </a>
            </div>

            <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside leading-relaxed">
              <li><strong className="text-white">MT5:</strong> File → Open Data Folder → MQL5 → Experts → paste <code className="text-amber-300">FMTrader.mq5</code></li>
              <li><strong className="text-white">MT4:</strong> File → Open Data Folder → MQL4 → Experts → paste <code className="text-amber-300">FMTrader.mq4</code></li>
              <li>Press F4 (MetaEditor) → compile → close MetaEditor</li>
              <li>Drag the EA onto any chart (pair doesn't matter — EUR/USD recommended)</li>
              <li>In EA inputs: set <code className="text-amber-300">ApiBaseUrl</code> to your Vercel URL and <code className="text-amber-300">EaApiKey</code> to your <code className="text-amber-300">EA_API_KEY</code> value</li>
              <li>Tools → Options → Expert Advisors → tick <strong className="text-white">Allow WebRequests</strong>, add your Vercel URL to the list</li>
              <li>Enable AutoTrading (green button in toolbar)</li>
            </ol>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-400/80 leading-relaxed">
                  MetaTrader must be running and connected to Vantage for trades to execute. Leave it open in the background or on a VPS.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Manual scan ───────────────────────────────────────────────────────── */}
        <div className="bg-[#131722] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Scan Markets Now
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Manually trigger a scan across all instruments — crypto runs 24/7, forex/stocks on weekdays only.</p>
            </div>
            <button
              onClick={scanNow}
              disabled={scanning}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-bold rounded-xl hover:bg-emerald-500/25 transition disabled:opacity-50"
            >
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {scanning ? 'Scanning…' : 'Scan Now'}
            </button>
          </div>
          {scanResult && (
            <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-xs ${scanResult.ok ? 'bg-emerald-500/5 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/5 border border-red-500/20 text-red-400'}`}>
              {scanResult.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
              {scanResult.msg}
            </div>
          )}
        </div>

        {/* ── Pending approvals ─────────────────────────────────────────────────── */}
        <div className="bg-[#131722] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Pending Approvals
              {pending.length > 0 && (
                <span className="ml-1 bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                  {pending.length}
                </span>
              )}
            </h2>
            <button onClick={loadTrades} className="text-gray-500 hover:text-gray-300 transition">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loadingTrades ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : pending.length === 0 ? (
            <p className="text-sm text-gray-600">No pending trade approvals.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] text-blue-400/80 flex items-center gap-1.5">
                <Send className="w-3 h-3" />
                Approving sends a Telegram notification and queues the trade for your MT4 EA
              </p>
              {pending.map(t => (
                <PendingTradeCard key={t.id} trade={t} onAction={executeAction} />
              ))}
            </div>
          )}
        </div>

        {/* ── In-flight (approved/executing) ───────────────────────────────────── */}
        {running.length > 0 && (
          <div className="bg-[#131722] border border-blue-500/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
                In-Flight Trades
              </h2>
              <button onClick={loadTrades} className="text-gray-500 hover:text-gray-300 transition">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {running.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    {t.decision === 'BUY'
                      ? <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                      : <TrendingDown className="w-4 h-4 text-red-400 shrink-0" />}
                    <div className="min-w-0">
                      <span className={`font-bold ${t.decision === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>{t.decision}</span>
                      <span className="text-sm text-white ml-2">{t.display}</span>
                      <span className={`ml-2 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${STATUS_COLORS[t.status] ?? STATUS_COLORS.expired}`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => executeAction(t.id, 'cancel')}
                    className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold hover:bg-red-500/25 transition shrink-0"
                  >
                    ✕ Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Failed trades ─────────────────────────────────────────────────────── */}
        {failed.length > 0 && (
          <div className="bg-[#131722] border border-orange-500/30 rounded-2xl p-6">
            <h2 className="font-bold text-orange-400 flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-orange-400" />
              Execution Failed — Retry Required
            </h2>
            <div className="space-y-3">
              {failed.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0 flex-wrap">
                  <div className="flex items-center gap-3">
                    {t.decision === 'BUY'
                      ? <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                      : <TrendingDown className="w-4 h-4 text-red-400 shrink-0" />}
                    <div>
                      <span className={`font-bold ${t.decision === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>{t.decision}</span>
                      <span className="text-sm text-white ml-2">{t.display}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => executeAction(t.id, 'retry')}
                    className="px-3 py-1.5 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-300 text-xs font-bold hover:bg-orange-500/25 transition"
                  >
                    ↺ Retry
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Trade history ─────────────────────────────────────────────────────── */}
        {recent.length > 0 && (
          <div className="bg-[#131722] border border-white/10 rounded-2xl p-6">
            <h2 className="font-bold text-white flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-violet-400" />
              Trade History
            </h2>
            <div className="space-y-2">
              {recent.map(t => <TradeHistoryRow key={t.id} trade={t} />)}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Pending approval card with countdown ──────────────────────────────────────
function PendingTradeCard({
  trade, onAction,
}: {
  trade:    BrokerTrade
  onAction: (id: string, action: 'approve' | 'reject') => void
}) {
  const [secsLeft, setSecsLeft] = useState(0)
  const [acting,   setActing]   = useState<'approve' | 'reject' | null>(null)

  useEffect(() => {
    const tick = () => {
      const s = Math.max(0, Math.floor((new Date(trade.expiresAt).getTime() - Date.now()) / 1000))
      setSecsLeft(s)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [trade.expiresAt])

  async function handle(action: 'approve' | 'reject') {
    setActing(action)
    await onAction(trade.id, action)
    setActing(null)
  }

  const isBuy   = trade.decision === 'BUY'
  const expired = secsLeft === 0
  const mins    = Math.floor(secsLeft / 60)
  const secs    = secsLeft % 60
  const urgentColor = secsLeft < 60 ? 'text-red-400' : secsLeft < 120 ? 'text-amber-400' : 'text-gray-400'

  return (
    <div className={`rounded-xl border p-4 ${isBuy ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-red-500/25 bg-red-500/5'}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {isBuy
            ? <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
            : <TrendingDown className="w-5 h-5 text-red-400 shrink-0" />}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-black text-lg ${isBuy ? 'text-emerald-400' : 'text-red-400'}`}>
                {trade.decision} {trade.display}
              </span>
              <span className="text-xs text-gray-500 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
                {trade.confidence}% conf
              </span>
            </div>
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
              <span>Entry ~{((trade.entryLow + trade.entryHigh) / 2).toFixed(5)}</span>
              <span>SL {trade.stopLoss.toFixed(5)}</span>
              <span>TP1 {trade.tp1.toFixed(5)}</span>
              <span>R:R {trade.rrRatio}</span>
              <span>Lots <strong className="text-white">{trade.lotSize}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-sm font-mono ${urgentColor}`}>
            {expired ? 'Expired' : `${mins}:${secs.toString().padStart(2, '0')}`}
          </span>
          {!expired && (
            <>
              <button
                onClick={() => handle('approve')}
                disabled={!!acting}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition"
              >
                {acting === 'approve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Approve
              </button>
              <button
                onClick={() => handle('reject')}
                disabled={!!acting}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600/30 hover:bg-red-600/50 border border-red-500/30 disabled:opacity-50 text-red-300 text-sm font-bold rounded-xl transition"
              >
                {acting === 'reject' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Reject
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Trade history row ─────────────────────────────────────────────────────────
function TradeHistoryRow({ trade }: { trade: BrokerTrade }) {
  const color = STATUS_COLORS[trade.status] ?? STATUS_COLORS.expired
  const isBuy = trade.decision === 'BUY'

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        {isBuy
          ? <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
          : <TrendingDown className="w-4 h-4 text-red-400 shrink-0" />}
        <div className="min-w-0">
          <span className={`font-bold ${isBuy ? 'text-emerald-400' : 'text-red-400'}`}>{trade.decision}</span>
          <span className="text-sm text-white ml-2">{trade.display}</span>
          {trade.brokerOrderId && (
            <span className="ml-2 text-xs text-gray-600">#{trade.brokerOrderId}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
        {trade.executedPrice && <span>@ {trade.executedPrice.toFixed(5)}</span>}
        {trade.pnlPips != null && (
          <span className={trade.pnlPips >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            {trade.pnlPips >= 0 ? '+' : ''}{trade.pnlPips.toFixed(1)} pips
          </span>
        )}
        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${color}`}>
          {trade.outcome ?? trade.status}
        </span>
        <span>{new Date(trade.createdAt).toLocaleString()}</span>
      </div>
    </div>
  )
}
