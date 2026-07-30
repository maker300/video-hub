'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  MessageCircle, X, Send, Loader2, ChevronDown,
  Bot, User, SquarePen, Clock, ArrowLeft,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant'
  content: string
  isAdminReply?: boolean
}

interface Conversation {
  id:        string
  messages:  Message[]
  ticketId:  string | null
  createdAt: number
  hiddenAt:  number | null
  isGuest:   boolean         // was this conversation started as a guest?
  // Bumped on every message exchange (user, bot, or admin reply). Conversation
  // is auto-purged 24h after this timestamp — gives the user a fresh start the
  // next time they open Aria after a day of inactivity.
  lastActiveAt: number
}

interface StoredChats {
  conversations: Conversation[]
  activeId:      string | null  // id of the current (non-hidden) conversation
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ONE_DAY = 24 * 60 * 60 * 1000

// Messages that should never be persisted to localStorage
const ERROR_MESSAGES = [
  "I'm having a connection issue. Please try again.",
  'Sorry, something went wrong.',
]

function storageKey(email?: string | null) {
  return email ? `aria_chats_${email}` : 'aria_chats_guest'
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function loadStore(key: string): StoredChats {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return { conversations: [], activeId: null }
    const stored: StoredChats = JSON.parse(raw)
    // Purge any conversation (active or hidden) that's been idle > 24h.
    // Fallbacks handle pre-existing localStorage entries from before lastActiveAt.
    const cutoff = Date.now() - ONE_DAY
    stored.conversations = stored.conversations.filter(c =>
      (c.lastActiveAt ?? c.hiddenAt ?? c.createdAt) >= cutoff
    )
    // If the active conversation was purged, drop the pointer so hydrate makes a fresh one.
    if (stored.activeId && !stored.conversations.some(c => c.id === stored.activeId)) {
      stored.activeId = null
    }
    return stored
  } catch {
    return { conversations: [], activeId: null }
  }
}

function cleanMessages(messages: Message[]): Message[] {
  // Never persist temporary error messages — they're transient UI state only
  return messages.filter(m => !ERROR_MESSAGES.includes(m.content))
}

function saveStore(key: string, store: StoredChats) {
  try {
    // Clean error messages from all conversations before saving
    const clean: StoredChats = {
      ...store,
      conversations: store.conversations.map(c => ({
        ...c,
        messages: cleanMessages(c.messages),
      })),
    }
    localStorage.setItem(key, JSON.stringify(clean))
  } catch {}
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-white/10 px-1 rounded text-xs font-mono">$1</code>')
    .replace(/^- (.+)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n/g, '<br/>')
}

function makeWelcomeMsg(session: ReturnType<typeof useSession>['data']): Message {
  if (session?.user) {
    const name = session.user.name ?? 'there'
    return {
      role: 'assistant',
      content: `Hi **${name}**! 👋 I'm **Aria**, your ForexMastery support assistant — and I'm here to make sure your question gets to exactly the right person.\n\nPlease go ahead and describe what's going on. Don't hold back — the more detail you give, the better our team can help you! 😊`,
    }
  }
  return {
    role: 'assistant',
    content: "Hi there! 👋 I'm **Aria**, your ForexMastery support assistant — lovely to have you here!\n\nI'll make sure your question gets to our customer service team right away. First though, what's your **name**? 😊",
  }
}

function friendlyDate(ts: number) {
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function hoursUntilDelete(lastActiveAt: number) {
  const remaining = ONE_DAY - (Date.now() - lastActiveAt)
  const hours = Math.ceil(remaining / (60 * 60 * 1000))
  return Math.max(1, hours)
}

// ── Component ─────────────────────────────────────────────────────────────────

type View = 'chat' | 'history'

export default function SupportWidget() {
  const { data: session, status } = useSession()
  const email = session?.user?.email

  const [open,       setOpen]       = useState(false)
  const [view,       setView]       = useState<View>('chat')
  const [store,      setStore]      = useState<StoredChats>({ conversations: [], activeId: null })
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [historyConv,setHistoryConv]= useState<Conversation | null>(null) // which past conv is being viewed
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [unread,     setUnread]     = useState(0)
  const [ready,      setReady]      = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  // ── Hydrate ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'loading') return
    const key   = storageKey(email)
    const loaded = loadStore(key)

    // Find or create active conversation
    let active = loaded.activeId
      ? loaded.conversations.find(c => c.id === loaded.activeId && !c.hiddenAt) ?? null
      : null

    if (!active) {
      // No active conversation — create one
      active = { id: uid(), messages: [makeWelcomeMsg(session)], ticketId: null, createdAt: Date.now(), hiddenAt: null, isGuest: !session?.user, lastActiveAt: Date.now() }
      loaded.conversations.unshift(active)
      loaded.activeId = active.id
      saveStore(key, loaded)
    }

    setStore(loaded)
    setActiveConv(active)
    setReady(true)
  }, [status, email]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist whenever activeConv changes ──────────────────────────────────────
  useEffect(() => {
    if (!ready || !activeConv) return
    const key = storageKey(email)
    setStore(prev => {
      const updated: StoredChats = {
        activeId: activeConv.id,
        conversations: prev.conversations.map(c => c.id === activeConv.id ? activeConv : c),
      }
      saveStore(key, updated)
      return updated
    })
  }, [activeConv, ready, email])

  // ── Check for admin reply — fires when widget opens OR hydration completes ───
  // Both conditions needed: if widget opens before hydration ticketId won't exist yet.
  // If ticketId arrives after widget is already open, ready change re-triggers this.
  useEffect(() => {
    if (!open || !ready || !activeConv?.ticketId) return
    const tid = activeConv.ticketId
    fetch(`/api/support/replies?ticketId=${tid}`)
      .then(r => r.json())
      .then(data => {
        if (!data.reply) return
        setActiveConv(prev => {
          if (!prev) return prev
          if (prev.messages.some(m => m.isAdminReply && m.content === data.reply)) return prev
          return {
            ...prev,
            messages: [...prev.messages, { role: 'assistant', content: data.reply, isAdminReply: true }],
            lastActiveAt: Date.now(),
          }
        })
      })
      .catch(() => {})
  }, [open, ready, activeConv?.ticketId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv?.messages, historyConv, loading])

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // ── New conversation ──────────────────────────────────────────────────────
  function startNewConversation() {
    if (!activeConv) return
    const key = storageKey(email)

    // Hide the current conversation — lastActiveAt = now so the 24h purge timer
    // starts ticking from the end-of-conversation moment.
    const hiddenNow: Conversation = { ...activeConv, hiddenAt: Date.now(), lastActiveAt: Date.now() }
    // Create a fresh one
    const fresh: Conversation = {
      id: uid(), messages: [makeWelcomeMsg(session)],
      ticketId: null, createdAt: Date.now(), hiddenAt: null, isGuest: !session?.user,
      lastActiveAt: Date.now(),
    }

    const updated: StoredChats = {
      activeId: fresh.id,
      conversations: [fresh, ...store.conversations.map(c => c.id === activeConv.id ? hiddenNow : c)],
    }
    saveStore(key, updated)
    setStore(updated)
    setActiveConv(fresh)
    setView('chat')
    setHistoryConv(null)
    setInput('')
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading || !activeConv) return

    const userMsg: Message = { role: 'user', content: text.trim() }
    const updated = [...activeConv.messages, userMsg]
    setActiveConv(prev => prev ? { ...prev, messages: updated, lastActiveAt: Date.now() } : prev)
    setInput('')
    setLoading(true)

    // step = how many user messages are being sent (1-based, counting the current one)
    // Exclude admin-reply messages from the thread sent to the API
    const threadForApi = updated.filter(m => !m.isAdminReply)
    const step = threadForApi.filter(m => m.role === 'user').length

    try {
      const res = await fetch('/api/support/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          messages: threadForApi.map(m => ({ role: m.role, content: m.content })),
          ticketId: activeConv.ticketId ?? undefined,
          step,
          isGuest: activeConv.isGuest ?? !session?.user,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setActiveConv(prev => prev
          ? { ...prev, messages: [...prev.messages, { role: 'assistant', content: data.error ?? 'Something went wrong. Please try again.' }], lastActiveAt: Date.now() }
          : prev)
      } else {
        const reply: Message = { role: 'assistant', content: data.reply }
        setActiveConv(prev => {
          if (!prev) return prev
          return { ...prev, messages: [...prev.messages, reply], ticketId: data.ticketId ?? prev.ticketId, lastActiveAt: Date.now() }
        })
        if (!open) setUnread(u => u + 1)
      }
    } catch {
      setActiveConv(prev => prev
        ? { ...prev, messages: [...prev.messages, { role: 'assistant', content: "I'm having a connection issue. Please try again." }], lastActiveAt: Date.now() }
        : prev
      )
    } finally {
      setLoading(false)
    }
  }, [activeConv, loading, open, session])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const hiddenConvs = store.conversations.filter(c => c.hiddenAt !== null)
  const viewingMessages = view === 'history' && historyConv ? historyConv.messages : (activeConv?.messages ?? [])
  const isHistoryView   = view === 'history' && !!historyConv

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating button ──────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Open support chat"
        className="fixed bottom-5 right-5 z-[9998] w-14 h-14 rounded-full bg-gradient-to-br from-[#1D9E75] to-[#0f7a58] text-white shadow-2xl shadow-[#1D9E75]/40 flex items-center justify-center hover:scale-110 transition-transform"
      >
        {open ? <X className="w-6 h-6" /> : (
          <>
            <MessageCircle className="w-6 h-6" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-[10px] font-black flex items-center justify-center border-2 border-[#080e1a]">
                {unread}
              </span>
            )}
          </>
        )}
      </button>

      {/* ── Chat window ──────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed bottom-24 right-5 z-[9997] w-[360px] max-w-[calc(100vw-2.5rem)] h-[520px] max-h-[calc(100dvh-8rem)] flex flex-col bg-[#0b1120] border border-white/15 rounded-2xl shadow-2xl overflow-hidden">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#0d1a2e] to-[#0b1120] border-b border-white/10 shrink-0">
            {isHistoryView ? (
              <button
                onClick={() => { setHistoryConv(null); setView('chat') }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1D9E75] to-[#0f7a58] flex items-center justify-center shadow-lg shadow-[#1D9E75]/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-none">
                {isHistoryView ? 'Previous conversation' : view === 'history' ? 'Previous chats' : 'Aria'}
              </p>
              <p className="text-[10px] text-emerald-400 mt-0.5">
                {isHistoryView
                  ? `Started ${friendlyDate(historyConv!.createdAt)} · deletes in ${hoursUntilDelete(historyConv!.lastActiveAt ?? historyConv!.hiddenAt!)}h`
                  : view === 'history'
                  ? `${hiddenConvs.length} previous chat${hiddenConvs.length !== 1 ? 's' : ''}`
                  : 'ForexMastery Support · Online'}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {/* New conversation button */}
              {view === 'chat' && (
                <button
                  onClick={startNewConversation}
                  title="Start new conversation"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition"
                >
                  <SquarePen className="w-4 h-4" />
                </button>
              )}
              {/* History toggle */}
              {hiddenConvs.length > 0 && (
                <button
                  onClick={() => { setView(v => v === 'history' ? 'chat' : 'history'); setHistoryConv(null) }}
                  title={view === 'history' ? 'Back to chat' : 'Previous chats'}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition ${view === 'history' ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
                >
                  <Clock className="w-4 h-4" />
                </button>
              )}
              {/* Close */}
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── History list ────────────────────────────────────────────── */}
          {view === 'history' && !historyConv && (
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {hiddenConvs.length === 0 ? (
                <p className="text-center text-gray-600 text-sm mt-10">No previous conversations.</p>
              ) : hiddenConvs.map(conv => {
                const preview = conv.messages.find(m => m.role === 'user')?.content ?? 'No messages'
                const hoursLeft = hoursUntilDelete(conv.lastActiveAt ?? conv.hiddenAt!)
                return (
                  <button
                    key={conv.id}
                    onClick={() => setHistoryConv(conv)}
                    className="w-full text-left bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-4 py-3 transition"
                  >
                    <p className="text-xs text-white font-medium truncate">{preview}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {friendlyDate(conv.createdAt)} · deletes in {hoursLeft} hour{hoursLeft !== 1 ? 's' : ''}
                    </p>
                  </button>
                )
              })}
            </div>
          )}

          {/* ── Messages (active chat OR history detail) ────────────────── */}
          {(view === 'chat' || (view === 'history' && historyConv)) && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {!ready ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                  </div>
                ) : viewingMessages.map((m, i) => (
                  <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.role === 'assistant' && (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        m.isAdminReply
                          ? 'bg-blue-500/20 border border-blue-500/40'
                          : 'bg-[#1D9E75]/20 border border-[#1D9E75]/30'
                      }`}>
                        {m.isAdminReply
                          ? <User className="w-3.5 h-3.5 text-blue-400" />
                          : <Bot className="w-3.5 h-3.5 text-[#1D9E75]" />}
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[#1D9E75] text-white rounded-tr-sm'
                        : m.isAdminReply
                        ? 'bg-blue-500/10 border border-blue-500/25 text-blue-100 rounded-tl-sm'
                        : 'bg-white/8 border border-white/10 text-gray-200 rounded-tl-sm'
                    }`}>
                      {m.isAdminReply && (
                        <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1.5">Customer Service Agent</p>
                      )}
                      {m.role === 'assistant'
                        ? <span dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                        : m.content}
                    </div>
                    {m.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                    )}
                  </div>
                ))}

                {loading && view === 'chat' && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-7 h-7 rounded-full bg-[#1D9E75]/20 border border-[#1D9E75]/30 flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5 text-[#1D9E75]" />
                    </div>
                    <div className="bg-white/8 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-[#1D9E75] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-[#1D9E75] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-[#1D9E75] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Read-only notice for history view */}
                {isHistoryView && (
                  <div className="text-center py-2">
                    <p className="text-[10px] text-gray-600">This is a read-only past conversation.</p>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* ── Input (only in active chat) ─────────────────────────── */}
              {view === 'chat' && (
                <div className="px-3 py-3 border-t border-white/10 bg-[#080e1a] shrink-0">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your message…"
                      rows={1}
                      disabled={loading || !ready}
                      className="flex-1 bg-white/6 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-[#1D9E75]/60 focus:bg-white/8 transition max-h-28 disabled:opacity-50"
                      style={{ fieldSizing: 'content' } as React.CSSProperties}
                    />
                    <button
                      onClick={() => sendMessage(input)}
                      disabled={!input.trim() || loading || !ready}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#1D9E75] hover:bg-[#22b886] text-white transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-700 text-center mt-1.5">
                    Messages go to our customer service team · Replies appear here
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
