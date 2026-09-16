"use client"

import { useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { AlertTriangle, Check, Copy, Globe, Link2, Lock, Sparkles, Wand2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAiQuota, useDescribeWorkflow, useUpdateWorkflow } from "@/lib/hooks"
import type { Workflow } from "@/lib/api"
import { cn } from "@/lib/utils"
import { WorkflowThumb, hasPreview } from "@/components/WorkflowThumb"

type Tab = "share" | "publish"

// Origin is only meaningful on the client; SSR (and the brief pre-hydration
// window) falls back to a relative path so the field never throws.
function origin(): string {
  if (typeof window === "undefined") return ""
  return window.location.origin
}

export function ShareDialog({
  workflow,
  open,
  onOpenChange,
  initialTab = "share",
}: {
  workflow: Workflow
  open: boolean
  onOpenChange: (v: boolean) => void
  initialTab?: Tab
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-white/[0.08] bg-card shadow-2xl focus:outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogBody workflow={workflow} initialTab={initialTab} onOpenChange={onOpenChange} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// Split out so its internal state (tab, drafts) remounts fresh every time the
// dialog opens, instead of needing an effect to re-seed it.
function DialogBody({
  workflow,
  initialTab,
  onOpenChange,
}: {
  workflow: Workflow
  initialTab: Tab
  onOpenChange: (v: boolean) => void
}) {
  const [tab, setTab] = useState<Tab>(initialTab)

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <Dialog.Title className="text-sm font-semibold">Share &amp; Publish</Dialog.Title>
        <Dialog.Close asChild>
          <button className="rounded-md p-1 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </Dialog.Close>
      </div>
      <Dialog.Description className="sr-only">
        Share this workflow via a link, or publish it to Explore.
      </Dialog.Description>

      <div className="flex gap-1 border-b border-white/[0.06] px-3 pt-3">
        <TabButton active={tab === "share"} onClick={() => setTab("share")}>
          Share
        </TabButton>
        <TabButton active={tab === "publish"} onClick={() => setTab("publish")}>
          Publish
        </TabButton>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-4">
        {tab === "share" ? (
          <ShareTab workflow={workflow} />
        ) : (
          <PublishTab workflow={workflow} onDone={() => onOpenChange(false)} />
        )}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "-mb-px rounded-t-md border-b-2 px-3 py-2 text-xs font-medium transition-colors",
        active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

function ShareTab({ workflow }: { workflow: Workflow }) {
  const update = useUpdateWorkflow()
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const link = `${origin()}/w/${workflow.id}`
  const isShared = workflow.visibility === "unlisted" || workflow.visibility === "public"

  function copyLink() {
    navigator.clipboard
      .writeText(link)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => setError("Could not copy the link"))
  }

  function toggleSharing() {
    setError(null)
    update.mutate(
      { id: workflow.id, visibility: isShared ? "private" : "unlisted" },
      { onError: (err) => setError(err instanceof Error ? err.message : "Failed to update sharing") }
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Anyone with this link can open an <b>unlisted</b> workflow, but it never shows up in Explore. Use this to send
        a work-in-progress to a friend without listing it publicly.
      </p>

      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Share link</label>
        <div className="flex gap-2">
          <Input readOnly value={link} className="h-9 text-xs" onFocus={(e) => e.currentTarget.select()} />
          <Button size="sm" variant="outline" onClick={copyLink} className="shrink-0">
            {copied ? <Check className="text-emerald-400" /> : <Copy />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        {!isShared && (
          <p className="flex items-center gap-1.5 text-[11px] text-amber-300">
            <Lock className="h-3 w-3 shrink-0" /> This link will not work until link sharing is enabled below.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="min-w-0 pr-3">
          <div className="text-sm">{isShared ? "Link sharing is on" : "Link sharing is off"}</div>
          <p className="text-[11px] text-muted-foreground">
            {isShared
              ? "Anyone with the link can view this workflow."
              : "Turn this on to make the link above work."}
          </p>
        </div>
        <Button size="sm" variant={isShared ? "outline" : "default"} onClick={toggleSharing} disabled={update.isPending}>
          {isShared ? "Stop sharing" : "Enable link sharing"}
        </Button>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <Link2 className="mt-0.5 h-3 w-3 shrink-0" />
        Opening the link is free to view, but making a copy of the workflow requires a free account.
      </p>

      {error && <p className="text-[11px] text-red-300">{error}</p>}
    </div>
  )
}

function PublishTab({ workflow, onDone }: { workflow: Workflow; onDone: () => void }) {
  const update = useUpdateWorkflow()
  const [draft, setDraft] = useState<{ title?: string; description?: string }>({})
  const [error, setError] = useState<string | null>(null)

  // The server refuses to publish without a captured run, so the button
  // reflects that rather than letting the click fail.
  const { data: quota } = useAiQuota()
  const describe = useDescribeWorkflow()
  // The helper runs on the platform's own key, so it is rate limited. The
  // buttons reflect that instead of letting the click fail.
  const helperAvailable = quota?.allowed !== false
  const cooldownLabel = formatCooldown(quota?.retry_after_seconds ?? 0)
  const helperTitle = helperAvailable
    ? "Free: once every 10 minutes"
    : `Available again in ${cooldownLabel}`

  function runHelper(mode: "generate" | "synthesize") {
    setError("")
    describe.mutate(
      { id: workflow.id, mode, text: mode === "synthesize" ? description : "" },
      {
        onSuccess: (res) => setDraft((d) => ({ ...d, description: res.description })),
        onError: (err) => setError(err instanceof Error ? err.message : "The writing helper failed"),
      }
    )
  }

  const ready = hasPreview(workflow.preview)
  const title = draft.title ?? workflow.name
  const description = draft.description ?? workflow.description ?? ""
  const isPublic = workflow.visibility === "public"
  const link = `${origin()}/w/${workflow.id}`

  function publish() {
    setError(null)
    update.mutate(
      { id: workflow.id, name: title, description, visibility: "public" },
      { onError: (err) => setError(err instanceof Error ? err.message : "Failed to publish") }
    )
  }

  function unpublish() {
    setError(null)
    update.mutate(
      { id: workflow.id, visibility: "private" },
      {
        onSuccess: () => onDone(),
        onError: (err) => setError(err instanceof Error ? err.message : "Failed to unpublish"),
      }
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Publishing lists this workflow on <b>Explore</b> for everyone to find and duplicate.
      </p>

      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Card preview
        </label>
        {ready ? (
          <div className="overflow-hidden rounded-lg border border-white/10">
            <WorkflowThumb preview={workflow.preview} />
            <div className="border-t border-white/[0.06] bg-card px-3 py-2">
              <div className="truncate text-sm font-semibold">{title || "Untitled workflow"}</div>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                {description || "No description yet."}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200/90">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>
              Run the whole workflow once first. The card shows a real input and the result it produced, so there is
              nothing to list until this workflow has finished a full run.
            </span>
          </div>
        )}
      </div>

      {isPublic && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] text-foreground/80">
          <Globe className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">
            Live at <span className="font-mono">{link}</span>
          </span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Title</label>
        <Input
          className="h-9 text-sm"
          value={title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder="Untitled workflow"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Description</label>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              disabled={!helperAvailable || describe.isPending}
              title={helperTitle}
              onClick={() => runHelper("generate")}
            >
              <Sparkles className="h-3 w-3" /> Generate
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              disabled={!helperAvailable || describe.isPending || !description.trim()}
              title={description.trim() ? helperTitle : "Write a description first"}
              onClick={() => runHelper("synthesize")}
            >
              <Wand2 className="h-3 w-3" /> Synthesize
            </Button>
          </div>
        </div>
        <textarea
          className="min-h-24 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground/70 focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/25"
          value={description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          placeholder="What does this workflow do? This is what people see in Explore."
        />
        <p className="text-[11px] text-muted-foreground">Shown on the Explore card and the workflow&apos;s public page.</p>
        <p className="text-[11px] text-muted-foreground">
          {describe.isPending
            ? "Writing…"
            : helperAvailable
              ? "Generate writes one from what the workflow does; Synthesize tightens what you wrote. Free, once every 10 minutes."
              : `Free writing helper available again in ${cooldownLabel}.`}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={publish} disabled={update.isPending || (!ready && !isPublic)}>
          <Globe /> {isPublic ? "Update listing" : "Publish"}
        </Button>
        {isPublic && (
          <Button variant="outline" onClick={unpublish} disabled={update.isPending}>
            Unpublish
          </Button>
        )}
      </div>

      {error && <p className="text-[11px] text-red-300">{error}</p>}
    </div>
  )
}

// formatCooldown turns the remaining seconds into something worth reading. The
// quota query polls while blocked, so this re-renders on its own.
function formatCooldown(seconds: number): string {
  if (seconds <= 0) return "a moment"
  if (seconds < 60) return `${seconds}s`
  return `${Math.ceil(seconds / 60)} min`
}
