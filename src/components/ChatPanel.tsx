"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowUp, Bot, ChevronDown, CircleCheck, CircleX, ExternalLink, Loader2, Paperclip, Sparkles, Workflow, X } from "lucide-react"
import { api, mediaUrl, missingProviderKeys, type ChatAttachment, type ChatMessage, type ChatStep, type MissingProviderKeys } from "@/lib/api"
import { MissingKeysPanel } from "@/components/MissingKeysPanel"
import { useChat, useCreateChat, useMe, useSendChatMessage } from "@/lib/hooks"
import { cn } from "@/lib/utils"

// Reusable conversation view: message list + composer. It owns the polling
// (through useChat) and can create the conversation lazily on first send,
// so it works both as a full page and as a floating dock.
export function ChatPanel({
  chatId,
  onChatCreated,
  compact,
  suggestions,
  className,
}: {
  chatId: string | null
  onChatCreated?: (id: string) => void
  compact?: boolean
  suggestions?: string[]
  className?: string
}) {
  const { data: me } = useMe()
  const { data, isLoading } = useChat(chatId)
  const createChat = useCreateChat()
  const send = useSendChatMessage()
  const [draft, setDraft] = useState("")
  // Images already uploaded and waiting to go with the next message. The URL is
  // the server's own: this never holds a path of its own devising, because the
  // server only accepts addresses it handed out.
  const [pending, setPending] = useState<ChatAttachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [dropping, setDropping] = useState(false)
  const [error, setError] = useState("")
  // The assistant is itself a workflow, so it runs on the user's own provider
  // account and can be refused for a missing key like any other run.
  const [missingKeys, setMissingKeys] = useState<MissingProviderKeys | null>(null)
  const lastAttemptRef = useRef("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const messages = useMemo(() => data?.messages || [], [data])
  const busy = messages.some((m) => m.status === "running") || send.isPending || createChat.isPending

  // Stick to the bottom as messages stream in.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, busy])

  async function submit(text?: string) {
    const content = (text ?? draft).trim()
    if (!content || busy) return
    setError("")
    setMissingKeys(null)
    // Kept so the message can be sent again once the key is in place, rather
    // than asking the user to retype it.
    lastAttemptRef.current = content
    try {
      let id = chatId
      if (!id) {
        const chat = await createChat.mutateAsync(undefined)
        id = chat.id
        onChatCreated?.(id)
      }
      setDraft("")
      const images = pending
      // The chips clear with the message they went with: they belong to what
      // was just sent, not to whatever gets typed next.
      setPending([])
      await send.mutateAsync({ id, content, attachments: images })
    } catch (e) {
      const missing = missingProviderKeys(e)
      if (missing) {
        setMissingKeys(missing)
        return
      }
      setError(e instanceof Error ? e.message : "Failed to send")
    }
  }

  // Three ways in, the same three every chat that takes images offers: paste,
  // drop, and a button. Paste is the one that matters — a screenshot is usually
  // the shortest way to say what is wrong — and it is also the one that has to
  // tell an image on the clipboard from the text beside it.
  const take = async (files: File[]): Promise<void> => {
    const images = files.filter((file) => file.type.startsWith("image/"))
    if (images.length === 0) return
    setError("")
    setUploading(true)
    try {
      for (const file of images) {
        const kept = await api.uploadImage(file)
        setPending((current) => [...current, { type: "image", url: kept.url, name: kept.name }])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload")
    } finally {
      setUploading(false)
    }
  }

  const pick = (): void => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/png,image/jpeg,image/gif,image/webp"
    input.multiple = true
    input.onchange = () => void take([...(input.files ?? [])])
    input.click()
  }

  const defaultSuggestions = suggestions || [
    "Which workflows do I have?",
    "Generate a carrot golf club",
    "Explain what the golf club workflow needs as inputs",
  ]

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {!chatId || (messages.length === 0 && !isLoading) ? (
          <EmptyState compact={compact} suggestions={defaultSuggestions} onPick={(s) => void submit(s)} />
        ) : (
          <div className={cn("mx-auto flex w-full flex-col gap-5", compact ? "px-3 py-4" : "max-w-3xl px-6 py-8")}>
            {messages.map((m) => (
              <MessageRow key={m.id} message={m} compact={compact} initial={(me?.name || me?.email || "?").charAt(0).toUpperCase()} />
            ))}
          </div>
        )}
      </div>

      <div className={cn("shrink-0", compact ? "p-3" : "px-6 pb-6 pt-2")}>
        <div className={cn("mx-auto w-full", !compact && "max-w-3xl")}>
          {missingKeys && (
            <MissingKeysPanel
              missing={missingKeys}
              className="mb-2"
              onDismiss={() => setMissingKeys(null)}
              onResolved={() => {
                const retry = lastAttemptRef.current
                setMissingKeys(null)
                if (retry) void submit(retry)
              }}
            />
          )}
          {error && <div className="mb-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>}
          {pending.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {pending.map((image) => (
                <span
                  key={image.url}
                  className="group flex max-w-[16rem] items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] py-1 pl-1 pr-2 text-xs text-muted-foreground"
                  title={image.name}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />
                  <span className="truncate">{image.name}</span>
                  <button
                    type="button"
                    title="Remove"
                    className="shrink-0 rounded p-0.5 hover:bg-white/[0.1] hover:text-foreground"
                    onClick={() => setPending((current) => current.filter((i) => i.url !== image.url))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div
            className={cn(
              "panel flex items-end gap-2 rounded-2xl p-2 pl-2 focus-within:border-primary/60",
              dropping && "border-primary/60 bg-primary/[0.06]"
            )}
            onDragOver={(e) => {
              if (![...e.dataTransfer.types].includes("Files")) return
              e.preventDefault()
              setDropping(true)
            }}
            onDragLeave={() => setDropping(false)}
            onDrop={(e) => {
              if (![...e.dataTransfer.types].includes("Files")) return
              e.preventDefault()
              setDropping(false)
              void take([...e.dataTransfer.files])
            }}
          >
            <button
              type="button"
              title="Attach an image"
              onClick={pick}
              disabled={uploading}
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-white/[0.06] hover:text-foreground disabled:opacity-40"
            >
              {uploading ? <Loader2 className="h-4 w-4 zy-spin" /> : <Paperclip className="h-4 w-4" />}
            </button>
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              placeholder={busy ? "The assistant is working…" : "Ask for a workflow run, e.g. “generate a carrot golf club”"}
              onChange={(e) => {
                setDraft(e.target.value)
                e.target.style.height = "auto"
                e.target.style.height = `${Math.min(160, e.target.scrollHeight)}px`
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void submit()
                }
              }}
              onPaste={(e) => {
                const files = [...e.clipboardData.files]
                // Only when there really is an image: a paste of ordinary text
                // also carries an empty file list, and swallowing the event
                // would stop text pasting.
                if (!files.some((file) => file.type.startsWith("image/"))) return
                e.preventDefault()
                void take(files)
              }}
              className="max-h-40 min-h-[24px] flex-1 resize-none bg-transparent py-1.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70"
            />
            <button
              onClick={() => void submit()}
              disabled={busy || uploading || (!draft.trim() && pending.length === 0)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_4px_16px_hsl(var(--primary)/0.35)] transition-opacity disabled:opacity-40"
              title="Send"
            >
              {busy ? <Loader2 className="h-4 w-4 zy-spin" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          </div>
          {!compact && (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              The assistant runs your workflows through the same MCP tools external clients use.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ compact, suggestions, onPick }: { compact?: boolean; suggestions: string[]; onPick: (s: string) => void }) {
  return (
    <div className={cn("flex h-full flex-col items-center justify-center text-center", compact ? "px-4 py-8" : "px-6 py-16")}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-[0_8px_24px_hsl(var(--primary)/0.4)]">
        <Sparkles className="h-6 w-6" />
      </div>
      <h2 className={cn("mt-4 font-semibold tracking-tight", compact ? "text-base" : "text-2xl")}>What should we run?</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        The assistant knows your workflows and can run them with the right inputs.
      </p>
      <div className={cn("mt-6 grid w-full gap-2", compact ? "grid-cols-1" : "max-w-xl grid-cols-1 sm:grid-cols-3")}>
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border border-white/[0.08] bg-card px-3 py-2.5 text-left text-xs text-foreground/85 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function MessageRow({ message, compact, initial }: { message: ChatMessage; compact?: boolean; initial: string }) {
  const isUser = message.role === "user"
  if (isUser) {
    const sent = message.attachments || []
    return (
      <div className="flex justify-end gap-3">
        <div className={cn("max-w-[85%] space-y-2 rounded-2xl rounded-br-md bg-white/[0.07] px-4 py-2.5 text-sm leading-relaxed", compact && "text-[13px]")}>
          {/* What was sent, shown as it was sent. A message that says "what is
              wrong with this?" and shows nothing is a message nobody can read
              back later. */}
          {sent.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sent.map((att) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={att.url}
                  src={mediaUrl(att.url)}
                  alt={att.name || "attached image"}
                  className="max-h-40 rounded-lg border border-white/[0.08] object-contain"
                />
              ))}
            </div>
          )}
          {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
        </div>
        {!compact && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-semibold text-muted-foreground">
            {initial}
          </span>
        )}
      </div>
    )
  }

  const steps = message.steps || []
  const atts = message.attachments || []
  const running = message.status === "running"

  return (
    <div className="flex gap-3">
      {!compact && (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-500 text-white">
          <Bot className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-2">
        {steps.length > 0 && (
          <div className="space-y-1">
            {steps.map((s, i) => (
              <StepChip key={i} step={s} />
            ))}
          </div>
        )}

        {running && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 zy-spin" />
            {steps.length > 0 ? "Working…" : "Thinking…"}
            {message.execution_id && (
              <span className="text-[11px]">
                · run <code className="font-mono">{message.execution_id.slice(-6)}</code>
              </span>
            )}
          </div>
        )}

        {message.content && (
          <div className={cn("whitespace-pre-wrap text-sm leading-relaxed", compact && "text-[13px]", message.status === "failed" && "text-red-200")}>
            {message.content}
          </div>
        )}

        {atts.length > 0 && (
          <div className={cn("grid gap-2", atts.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
            {atts.map((a, i) => {
              const src = mediaUrl(a.url)
              return (
                <a
                  key={i}
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="checker group relative block overflow-hidden rounded-xl border border-white/[0.08]"
                  title="Open full size"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="result" className={cn("block w-full object-contain", compact ? "max-h-56" : "max-h-96")} />
                  <span className="absolute right-2 top-2 rounded-md bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </span>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StepChip({ step }: { step: ChatStep }) {
  const [open, setOpen] = useState(false)
  const Icon = step.status === "error" ? CircleX : step.status === "success" ? CircleCheck : Loader2
  const tone = step.status === "error" ? "text-red-300" : step.status === "success" ? "text-emerald-300" : "text-sky-300"
  const label = step.tool.replace(/^zyvro_/, "").replace(/_/g, " ")
  const wfId = step.workflow_id || (step.args ? safeWorkflowId(step.args) : "")
  return (
    <div className="rounded-lg border border-white/[0.06] bg-card/60 text-[11px]">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", tone, step.status === "running" && "zy-spin")} />
        <Workflow className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="font-medium">{label}</span>
        {step.duration_ms ? <span className="text-muted-foreground">· {(step.duration_ms / 1000).toFixed(1)}s</span> : null}
        <span className="flex-1" />
        {step.execution_id && wfId && (
          <Link
            href={`/builder/${wfId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground"
            title="Open the workflow"
          >
            open
          </Link>
        )}
        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-1.5 border-t border-white/[0.06] px-2.5 py-2 font-mono text-[10px] leading-relaxed text-foreground/70">
          {step.args && (
            <div>
              <span className="text-muted-foreground">args </span>
              <span className="break-all">{step.args}</span>
            </div>
          )}
          {step.result && (
            <div className="whitespace-pre-wrap break-words">
              <span className="text-muted-foreground">result </span>
              {step.result}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function safeWorkflowId(args: string): string {
  try {
    const v = JSON.parse(args)
    return typeof v?.workflow_id === "string" ? v.workflow_id : ""
  } catch {
    return ""
  }
}
