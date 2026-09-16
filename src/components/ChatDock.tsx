"use client"

import { useState } from "react"
import Link from "next/link"
import { ExternalLink, MessageSquare, Plus, X } from "lucide-react"
import { ChatPanel } from "@/components/ChatPanel"
import { cn } from "@/lib/utils"

// Floating assistant: a button in the bottom-right corner that opens a
// compact chat. Reusable on any page; the conversation survives while the
// page stays mounted.
export function ChatDock({ suggestions }: { suggestions?: string[] }) {
  const [open, setOpen] = useState(false)
  const [chatId, setChatId] = useState<string | null>(null)

  return (
    <>
      {open && (
        <div className="panel fixed bottom-20 right-5 z-50 flex h-[min(640px,calc(100vh-7rem))] w-[400px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-500 text-white">
              <MessageSquare className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-semibold">Assistant</span>
            <span className="flex-1" />
            <button onClick={() => setChatId(null)} className="rounded-md p-1 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground" title="New chat">
              <Plus className="h-4 w-4" />
            </button>
            <Link
              href={chatId ? `/chat?id=${chatId}` : "/chat"}
              className="rounded-md p-1 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
              title="Open full page"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
            <button onClick={() => setOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground" title="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ChatPanel key={chatId || "new"} chatId={chatId} onChatCreated={setChatId} compact suggestions={suggestions} className="flex-1" />
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-500 text-white shadow-[0_8px_24px_hsl(var(--primary)/0.45)] transition-transform hover:scale-105",
          open && "rotate-90"
        )}
        title={open ? "Close assistant" : "Open assistant"}
      >
        {open ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </button>
    </>
  )
}
