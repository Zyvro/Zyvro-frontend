"use client"

import { useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { Check, ExternalLink, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDeleteSecret, useProviders, useSetSecret } from "@/lib/hooks"
import type { ProviderInfo } from "@/lib/api"
import { cn } from "@/lib/utils"

// Providers are shown as tiles grouped by what they do, so the state of every
// account is readable at a glance. Configuring one is a deliberate act, so it
// happens in a dialog rather than in a form that is always open.

function ProviderIcon({ id }: { id: string }) {
  if (id === "google") {
    return (
      <svg viewBox="0 0 24 24" className="h-8 w-8 shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id="gemini-spark" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4285F4" />
            <stop offset="35%" stopColor="#9B72CB" />
            <stop offset="65%" stopColor="#D96570" />
            <stop offset="100%" stopColor="#F7B733" />
          </linearGradient>
        </defs>
        <path
          d="M12 2c.6 4.6 1.4 7.4 3 9 1.6 1.6 4.4 2.4 9 3-4.6.6-7.4 1.4-9 3-1.6 1.6-2.4 4.4-3 9-.6-4.6-1.4-7.4-3-9-1.6-1.6-4.4-2.4-9-3 4.6-.6 7.4-1.4 9-3 1.6-1.6 2.4-4.4 3-9Z"
          fill="url(#gemini-spark)"
        />
      </svg>
    )
  }
  if (id === "ollama") {
    return (
      <svg viewBox="0 0 24 24" className="h-8 w-8 shrink-0" aria-hidden="true">
        <ellipse cx="12" cy="14.5" rx="7" ry="6" fill="#F5F0E6" />
        <circle cx="8.7" cy="8.2" r="2.3" fill="#F5F0E6" />
        <circle cx="15.3" cy="8.2" r="2.3" fill="#F5F0E6" />
        <circle cx="8.7" cy="7.6" r="0.9" fill="#1A1A1A" />
        <circle cx="15.3" cy="7.6" r="0.9" fill="#1A1A1A" />
        <path d="M9.2 16.2c.8.7 1.8 1 2.8 1s2-.3 2.8-1" stroke="#1A1A1A" strokeWidth="0.9" fill="none" strokeLinecap="round" />
        <circle cx="9.7" cy="14" r="0.6" fill="#1A1A1A" />
        <circle cx="14.3" cy="14" r="0.6" fill="#1A1A1A" />
      </svg>
    )
  }
  if (id === "anthropic") {
    return (
      <svg viewBox="0 0 24 24" className="h-8 w-8 shrink-0" aria-hidden="true">
        <rect x="1" y="1" width="22" height="22" rx="5" fill="#D97757" />
        <path
          d="M9.6 6.5h2.1l4.6 11h-2.3l-0.9-2.4h-4.9l-0.9 2.4H5l4.6-11Zm0.9 2.7-1.7 4.4h3.4l-1.7-4.4Z"
          fill="#1A1310"
        />
      </svg>
    )
  }
  if (id === "openai") {
    return (
      <svg viewBox="0 0 24 24" className="h-8 w-8 shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="#10A37F" />
        <path
          d="M12 5.5c1.4 0 2.6.7 3.4 1.8.9-.2 1.9 0 2.6.7.9.9 1.1 2.2.6 3.3.9.8 1.4 1.9 1.4 3.2 0 1.4-.7 2.6-1.8 3.4.2.9 0 1.9-.7 2.6-.9.9-2.2 1.1-3.3.6-.8.9-1.9 1.4-3.2 1.4-1.4 0-2.6-.7-3.4-1.8-.9.2-1.9 0-2.6-.7-.9-.9-1.1-2.2-.6-3.3-.9-.8-1.4-1.9-1.4-3.2 0-1.4.7-2.6 1.8-3.4-.2-.9 0-1.9.7-2.6.9-.9 2.2-1.1 3.3-.6.8-.9 1.9-1.4 3.2-1.4Z"
          fill="#F5FBF9"
        />
        <path
          d="M12 8.3c1 0 1.9.4 2.6 1.1M9.4 15.7c-1 0-1.9-.4-2.6-1.1"
          stroke="#10A37F"
          strokeWidth="0.9"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    )
  }
  const letter = id.slice(0, 1).toUpperCase() || "?"
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-xs font-semibold text-foreground/85">
      {letter}
    </div>
  )
}

// CATEGORIES give each role a heading and a line explaining what it covers.
const CATEGORIES: { role: string; title: string; blurb: string }[] = [
  {
    role: "image",
    title: "Image & vision",
    blurb: "Needed by every image generation, image editing and vision node. These are alternatives — one connected account is enough.",
  },
  {
    role: "text",
    title: "Text generation",
    blurb: "Backs text nodes and the Brain agent. These are alternatives — one connected account is enough.",
  },
]

function StatusBadge({ provider }: { provider: ProviderInfo }) {
  if (provider.has_user_key) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
        <Check className="h-3 w-3" /> Connected
      </span>
    )
  }
  if (provider.required) {
    return (
      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">Required</span>
    )
  }
  return (
    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      Not configured
    </span>
  )
}

function ProviderTile({ provider, onOpen }: { provider: ProviderInfo; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors",
        provider.has_user_key
          ? "border-emerald-400/20 hover:border-emerald-400/40"
          : provider.required
            ? "border-amber-400/25 hover:border-amber-400/50"
            : "border-white/[0.08] hover:border-white/25"
      )}
    >
      <ProviderIcon id={provider.id} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold">{provider.label}</span>
          {provider.is_default && (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-[1px] text-[9px] font-medium uppercase tracking-wider text-primary">
              default
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {provider.has_user_key ? `Your key ••••${provider.user_key_last4}` : provider.purpose}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge provider={provider} />
        <span className="text-muted-foreground/60 transition-colors group-hover:text-foreground">
          {provider.has_user_key ? <Check className="h-4 w-4 opacity-0" /> : <Plus className="h-4 w-4" />}
        </span>
      </div>
    </button>
  )
}

// ConfigureDialog is where the key is actually entered. It is mounted only
// while open, so its draft state resets on every open with no effect needed.
function ConfigureDialog({
  provider,
  onClose,
}: {
  provider: ProviderInfo | null
  onClose: () => void
}) {
  return (
    <Dialog.Root open={provider !== null} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[30rem] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-white/10 bg-card shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
          {provider && <DialogBody provider={provider} onClose={onClose} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DialogBody({ provider, onClose }: { provider: ProviderInfo; onClose: () => void }) {
  const setSecret = useSetSecret()
  const deleteSecret = useDeleteSecret()
  const [value, setValue] = useState("")
  const [error, setError] = useState("")
  const [confirmRemove, setConfirmRemove] = useState(false)

  async function save() {
    const secret = value.trim()
    if (!secret) return
    setError("")
    try {
      await setSecret.mutateAsync({ provider: provider.id, secret })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the key")
    }
  }

  async function remove() {
    setError("")
    try {
      await deleteSecret.mutateAsync(provider.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the key")
    }
  }

  return (
    <div>
      <div className="flex items-start gap-3 border-b border-white/[0.06] p-5">
        <ProviderIcon id={provider.id} />
        <div className="min-w-0 flex-1">
          <Dialog.Title className="text-sm font-semibold">{provider.label}</Dialog.Title>
          <Dialog.Description className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {provider.purpose}
          </Dialog.Description>
        </div>
        <Dialog.Close className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </Dialog.Close>
      </div>

      <div className="space-y-4 p-5">
        {provider.has_user_key && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.06] px-3 py-2 text-[11px] text-emerald-200">
            <Check className="h-3.5 w-3.5 shrink-0" />
            A key ending in {provider.user_key_last4} is connected. Saving a new one replaces it.
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {provider.has_user_key ? "Replace the key" : "Key"}
          </label>
          <Input
            type="password"
            autoComplete="new-password"
            name={`provider-key-${provider.id}`}
            placeholder={provider.key_hint}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save()
            }}
          />
          {provider.setup_hint && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">{provider.setup_hint}</p>
          )}
          <a
            href={provider.console_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            Get a key <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {error && <p className="text-[11px] text-red-300">{error}</p>}

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button onClick={() => void save()} disabled={!value.trim() || setSecret.isPending}>
            {setSecret.isPending ? "Saving…" : provider.has_user_key ? "Replace key" : "Connect"}
          </Button>
          {provider.has_user_key &&
            (confirmRemove ? (
              <div className="flex gap-1">
                <Button size="sm" variant="destructive" onClick={() => void remove()} disabled={deleteSecret.isPending}>
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmRemove(true)}>
                Remove
              </Button>
            ))}
        </div>
      </div>
    </div>
  )
}

export function ProviderKeys({ compact = false }: { compact?: boolean }) {
  const { data: providers, isLoading, isError } = useProviders()
  const [open, setOpen] = useState<string | null>(null)

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading providers…</p>
  if (isError || !providers) return <p className="text-sm text-red-300">Could not load the provider list.</p>

  // The dialog reads from the query, so it always shows the current state even
  // after a save changes it underneath.
  const selected = providers.find((p) => p.id === open) ?? null

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {CATEGORIES.map((cat) => {
        const list = providers.filter((p) => p.role === cat.role)
        if (list.length === 0) return null
        return (
          <section key={cat.role}>
            <div className="mb-2">
              <div className="text-sm font-semibold">{cat.title}</div>
              <p className="text-[11px] text-muted-foreground">{cat.blurb}</p>
            </div>
            <div className={compact ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 gap-2 md:grid-cols-2"}>
              {list.map((p) => (
                <ProviderTile key={p.id} provider={p} onOpen={() => setOpen(p.id)} />
              ))}
            </div>
          </section>
        )
      })}

      <ConfigureDialog provider={selected} onClose={() => setOpen(null)} />
    </div>
  )
}
