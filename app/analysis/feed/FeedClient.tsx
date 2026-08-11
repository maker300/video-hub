'use client'

import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import { Heart, MessageCircle, Trash2, Send, Loader2, Bot, User as UserIcon, Pencil, X, Check } from 'lucide-react'

interface Author { id?: string; name: string; image?: string | null; role?: string }
interface Post {
  id: string; authorType: 'user' | 'agent'; content: string; createdAt: string
  author: Author; likeCount: number; likedByMe: boolean; commentCount: number
  canDelete: boolean; canEdit: boolean; editedAt: string | null
}
interface Comment {
  id: string; content: string; createdAt: string; author: Author; canDelete: boolean
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function FeedClient() {
  const [posts,    setPosts]    = useState<Post[]>([])
  const [loading,  setLoading]  = useState(true)
  const [draft,    setDraft]    = useState('')
  const [posting,  setPosting]  = useState(false)
  const [error,    setError]    = useState('')
  const [openId,   setOpenId]   = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [cDraft,   setCDraft]   = useState('')
  const [cBusy,    setCBusy]    = useState(false)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editBusy, setEditBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/posts')
      if (!res.ok) throw new Error('Could not load the feed.')
      const d = await res.json()
      setPosts(d.posts)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the feed.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function submitPost() {
    const content = draft.trim()
    if (!content) return
    setPosting(true); setError('')
    try {
      const res = await fetch('/api/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Could not post.')
      setDraft(''); await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not post.') }
    finally { setPosting(false) }
  }

  async function toggleLike(p: Post) {
    // Optimistic — a like is trivial to re-sync and the round trip is visible.
    setPosts(cur => cur.map(x => x.id === p.id
      ? { ...x, likedByMe: !x.likedByMe, likeCount: x.likeCount + (x.likedByMe ? -1 : 1) }
      : x))
    try {
      const res = await fetch(`/api/posts/${p.id}/like`, { method: 'POST' })
      const d = await res.json()
      if (res.ok) {
        setPosts(cur => cur.map(x => x.id === p.id
          ? { ...x, likedByMe: d.liked, likeCount: d.likeCount } : x))
      }
    } catch { load() }
  }

  async function openComments(p: Post) {
    if (openId === p.id) { setOpenId(null); return }
    setOpenId(p.id); setCDraft('')
    if (!comments[p.id]) {
      const res = await fetch(`/api/posts/${p.id}/comments`)
      if (res.ok) { const d = await res.json(); setComments(c => ({ ...c, [p.id]: d.comments })) }
    }
  }

  async function submitComment(postId: string) {
    const content = cDraft.trim()
    if (!content) return
    setCBusy(true)
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        setCDraft('')
        const r2 = await fetch(`/api/posts/${postId}/comments`)
        if (r2.ok) { const d = await r2.json(); setComments(c => ({ ...c, [postId]: d.comments })) }
        setPosts(cur => cur.map(x => x.id === postId ? { ...x, commentCount: x.commentCount + 1 } : x))
      }
    } finally { setCBusy(false) }
  }

  async function saveEdit(id: string) {
    const content = editText.trim()
    if (!content) return
    setEditBusy(true)
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Could not save.')
      setPosts(cur => cur.map(p => p.id === id ? { ...p, content: d.content, editedAt: d.editedAt } : p))
      setEditId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the edit.')
    } finally { setEditBusy(false) }
  }

  async function deletePost(id: string) {
    if (!confirm('Delete this post?')) return
    const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' })
    if (res.ok) setPosts(cur => cur.filter(p => p.id !== id))
  }

  async function deleteComment(postId: string, commentId: string) {
    const res = await fetch(`/api/posts/${postId}/comments?commentId=${commentId}`, { method: 'DELETE' })
    if (res.ok) {
      setComments(c => ({ ...c, [postId]: (c[postId] ?? []).filter(x => x.id !== commentId) }))
      setPosts(cur => cur.map(x => x.id === postId ? { ...x, commentCount: Math.max(0, x.commentCount - 1) } : x))
    }
  }

  return (
    <div className="min-h-screen bg-[#080e1a] text-white">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Trader Feed</h1>
          <p className="text-gray-400 mt-1.5 text-sm">
            Share setups and ideas. FM Trader posts here automatically when a macro release lands.
          </p>
        </header>

        {/* Composer */}
        <div className="bg-[#0d1b2a] border border-white/10 rounded-xl p-4 mb-6">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="What are you seeing in the market?"
            rows={3}
            maxLength={2000}
            className="w-full bg-transparent text-white placeholder-gray-500 text-sm resize-none outline-none"
          />
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
            <span className="text-[11px] text-gray-600">{draft.length}/2000 · text only</span>
            <button
              onClick={submitPost}
              disabled={posting || !draft.trim()}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-[#052e21] text-sm font-bold px-4 py-1.5 rounded-lg transition"
            >
              {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Post
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">{error}</div>
        )}

        {loading && <p className="text-gray-500 text-sm">Loading feed…</p>}

        {!loading && posts.length === 0 && (
          <div className="bg-[#0d1b2a] border border-white/10 rounded-xl p-6 text-center text-gray-500 text-sm">
            Nothing here yet. Post the first thing.
          </div>
        )}

        <div className="space-y-4">
          {posts.map(p => {
            const isAgent = p.authorType === 'agent'
            return (
              <article key={p.id} className={`bg-[#0d1b2a] border rounded-xl p-4 ${isAgent ? 'border-violet-500/30' : 'border-white/10'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAgent ? 'bg-violet-500/20' : 'bg-white/10'}`}>
                    {isAgent ? <Bot className="w-4 h-4 text-violet-300" /> : <UserIcon className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">{p.author.name}</span>
                      {isAgent && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-violet-500/15 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded">Agent</span>
                      )}
                      {p.author.role === 'admin' && !isAgent && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">Admin</span>
                      )}
                      <span className="text-[11px] text-gray-600">{timeAgo(p.createdAt)}</span>
                      {p.editedAt && <span className="text-[11px] text-gray-600 italic">· edited</span>}
                    </div>
                    {editId === p.id ? (
                      <div className="mt-2">
                        <textarea
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          rows={8}
                          maxLength={2000}
                          className="w-full bg-[#0a0f1e] border border-white/15 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none focus:border-emerald-500/50 resize-y"
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => saveEdit(p.id)}
                            disabled={editBusy || !editText.trim()}
                            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-[#052e21] text-xs font-bold px-3 py-1.5 rounded-lg transition"
                          >
                            {editBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Save
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2 py-1.5 transition"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                          <span className="text-[11px] text-gray-600 ml-auto">{editText.length}/2000</span>
                        </div>
                      </div>
                    ) : (
                      /* Plain text — never a markup sink. */
                      <p className="text-sm text-gray-200 mt-2 whitespace-pre-line break-words">{p.content}</p>
                    )}

                    <div className="flex items-center gap-4 mt-3">
                      <button
                        onClick={() => toggleLike(p)}
                        className={`flex items-center gap-1.5 text-xs transition ${p.likedByMe ? 'text-rose-400' : 'text-gray-500 hover:text-rose-400'}`}
                      >
                        <Heart className={`w-4 h-4 ${p.likedByMe ? 'fill-rose-400' : ''}`} />
                        {p.likeCount}
                      </button>
                      <button
                        onClick={() => openComments(p)}
                        className={`flex items-center gap-1.5 text-xs transition ${openId === p.id ? 'text-emerald-400' : 'text-gray-500 hover:text-emerald-400'}`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        {p.commentCount}
                      </button>
                      {p.canEdit && editId !== p.id && (
                        <button
                          onClick={() => { setEditId(p.id); setEditText(p.content) }}
                          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-emerald-400 transition ml-auto"
                          title={isAgent ? 'Edit this agent post' : 'Edit your post'}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {p.canDelete && (
                        <button onClick={() => deletePost(p.id)} className={`flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-400 transition ${p.canEdit ? '' : 'ml-auto'}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {openId === p.id && (
                      <div className="mt-4 pt-3 border-t border-white/10 space-y-3">
                        {(comments[p.id] ?? []).map(c => (
                          <div key={c.id} className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                              <UserIcon className="w-3 h-3 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-200">{c.author.name}</span>
                                <span className="text-[10px] text-gray-600">{timeAgo(c.createdAt)}</span>
                                {c.canDelete && (
                                  <button onClick={() => deleteComment(p.id, c.id)} className="ml-auto text-gray-600 hover:text-red-400">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-gray-300 mt-0.5 whitespace-pre-line break-words">{c.content}</p>
                            </div>
                          </div>
                        ))}
                        {(comments[p.id] ?? []).length === 0 && (
                          <p className="text-xs text-gray-600">No comments yet.</p>
                        )}
                        <div className="flex gap-2 pt-1">
                          <input
                            value={cDraft}
                            onChange={e => setCDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(p.id) } }}
                            placeholder="Write a comment…"
                            maxLength={1000}
                            className="flex-1 bg-[#0a0f1e] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-emerald-500/50"
                          />
                          <button
                            onClick={() => submitComment(p.id)}
                            disabled={cBusy || !cDraft.trim()}
                            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40 text-xs font-semibold transition"
                          >
                            {cBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
