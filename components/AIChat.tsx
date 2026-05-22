'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react'
import type { ChatMessage } from '@/types'

interface AIChatProps {
  lessonTitle: string
  moduleTitle: string
}

export default function AIChat({ lessonTitle, moduleTitle }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hi! I'm your AI trading tutor. I'm here to help you understand **${lessonTitle}** and answer any questions about ${moduleTitle}. What would you like to know?`,
      timestamp: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          lessonTitle,
          moduleTitle,
          history: messages.slice(-6),
        }),
      })

      if (!res.ok) throw new Error('API error')
      const data = await res.json() as { reply: string }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I couldn't process that right now. Please try again.",
        timestamp: Date.now(),
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  function formatContent(content: string) {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-white/10 px-1 rounded text-emerald-300 text-xs">$1</code>')
      .replace(/\n/g, '<br/>')
  }

  const suggestedQuestions = [
    'Explain this concept simply',
    'Give me a real example',
    'How does this apply in practice?',
    'What are common mistakes here?',
  ]

  return (
    <div className="bg-[#0d1b2a] rounded-xl border border-white/10 flex flex-col h-[500px] w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">AI Tutor</h3>
          <p className="text-gray-500 text-xs">Ask anything about this lesson</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
              msg.role === 'assistant' ? 'bg-emerald-500/20' : 'bg-blue-500/20'
            }`}>
              {msg.role === 'assistant'
                ? <Bot className="w-3.5 h-3.5 text-emerald-400" />
                : <User className="w-3.5 h-3.5 text-blue-400" />
              }
            </div>

            {/* Bubble */}
            <div className={`max-w-[78%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
              msg.role === 'assistant'
                ? 'bg-white/5 text-gray-200'
                : 'bg-blue-600/30 text-white'
            }`}>
              <div dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} />
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="bg-white/5 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span className="text-gray-400 text-sm">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {suggestedQuestions.map(q => (
            <button
              key={q}
              onClick={() => { setInput(q); inputRef.current?.focus() }}
              className="text-xs bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 px-2.5 py-1 rounded-full transition-all"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-white/10">
        <div className="flex items-end gap-2 bg-white/5 rounded-xl border border-white/10 p-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this lesson..."
            rows={1}
            className="flex-1 min-w-0 bg-transparent text-white placeholder-gray-500 text-sm resize-none outline-none leading-relaxed max-h-24"
            style={{ scrollbarWidth: 'none' }}
          />
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/10 disabled:text-gray-600 text-white flex items-center justify-center transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
