"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, MessageSquare, Plus, Trash2 } from "lucide-react"
import { ChatPanel } from "@/components/ChatPanel"
import { useChats, useDeleteChat, useMe } from "@/lib/hooks"
import { cn } from "@/lib/utils"

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

function ChatPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { data: me, isLoading: meLoading } = useMe()
  const { data: chats } = useChats()
  const deleteChat = useDeleteChat()
  const [chatId, setChatId] = useState<string | null>(params.get("id"))
  const [confirm, setConfirm] = useState<string | null>(null)

  useEffect(() => {
    if (!meLoading && !me) router.push("/login")
  }, [meLoading, me, router])

  function select(id: string | null) {
    setChatId(id)
    router.replace(id ? `/chat?id=${id}` : "/chat")
  }

  if (meLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="flex w-72 shrink-0 flex-col border-r border-white/[0.06]">
        <div className="flex items-center gap-2 px-3 pt-3">
          <Link href="/dashboard" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:text-foreground" title="Back">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link href="/dashboard" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-icon.png" alt="Zyvro" className="h-8 w-8 rounded-lg" />
            <span className="text-sm font-semibold">Chat</span>
          </Link>
        </div>
        <button
          onClick={() => select(null)}
          className="mx-3 mt-4 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm hover:bg-white/[0.07]"
        >
          <Plus className="h-4 w-4" /> New chat
        </button>
        <div className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {chats?.length === 0 && <p className="px-2 py-6 text-center text-xs text-muted-foreground">No conversations yet.</p>}
          {chats?.map((c) => (
            <div
              key={c.id}
              className={cn(
                "group flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
                c.id === chatId ? "bg-white/[0.07] text-foreground" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
              )}
            >
              <button onClick={() => select(c.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{c.title || "Untitled"}</span>
                <span className="ml-auto shrink-0 text-[10px]">{timeAgo(c.updated_at)}</span>
              </button>
              {confirm === c.id ? (
                <button
                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-red-500/10"
                  onClick={() => {
                    deleteChat.mutate(c.id)
                    setConfirm(null)
                    if (chatId === c.id) select(null)
                  }}
                >
                  Confirm
                </button>
              ) : (
                <button className="shrink-0 rounded p-1 opacity-0 hover:text-red-300 group-hover:opacity-100" onClick={() => setConfirm(c.id)} title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <ChatPanel key={chatId || "new"} chatId={chatId} onChatCreated={(id) => select(id)} />
      </main>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>}>
      <ChatPageInner />
    </Suspense>
  )
}
