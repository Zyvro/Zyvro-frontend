"use client"

import { useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { Check, ChevronDown, ChevronUp, ExternalLink, Plus, RefreshCw, X } from "lucide-react"
import {
  CliMark,
  EndpointMark,
  FluxMark,
  ImageEndpointMark,
  LMStudioMark,
} from "@/components/brand/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  useDeleteSecret,
  useProviderModels,
  useProviders,
  useSaveProviderEndpoint,
  useSaveProviderOrder,
  useSetSecret,
} from "@/lib/hooks"
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
  if (id === "ollama" || id === "ollama-local") {
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
  if (id === "lmstudio") return <LMStudioMark className="h-8 w-8 shrink-0" />
  if (id === "custom") return <EndpointMark className="h-8 w-8 shrink-0" />
  if (id === "custom-image") return <ImageEndpointMark className="h-8 w-8 shrink-0" />
  if (id === "bfl") return <FluxMark className="h-8 w-8 shrink-0" />
  if (id === "claude-cli" || id === "codex-cli") return <CliMark className="h-8 w-8 shrink-0" />
  // Il ne reste rien qui tombe ici aujourd'hui. Une initiale dans un rond gris
  // est ce qu'on affiche quand on n'a rien à afficher — c'est une absence, pas
  // une icône — donc elle ne sert plus que de filet pour un fournisseur ajouté
  // au catalogue et pas encore dessiné.
  const letter = id.slice(0, 1).toUpperCase() || "?"
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-xs font-semibold text-foreground/85">
      {letter}
    </div>
  )
}

// CATEGORIES give each job a heading and a line explaining what it covers.
//
// Three, not two. "Image & vision" was one heading because Google does both,
// and that heading was a lie about the others: Black Forest Labs generates an
// image and cannot read one, Ollama reads one and cannot generate. Somebody
// holding only Black Forest Labs was told they were set for vision when they
// were not.
const CATEGORIES: { role: Role; title: string; blurb: string }[] = [
  {
    role: "image",
    title: "Image generation",
    blurb: "Backs image generation and editing nodes. These are alternatives — one connected account is enough.",
  },
  {
    role: "vision",
    title: "Vision",
    blurb: "Backs vision nodes and lets the chat assistant look at an image you attach. These are alternatives — one connected account is enough.",
  },
  {
    role: "text",
    title: "Text generation",
    blurb: "Backs text nodes and the Brain agent. These are alternatives — one connected account is enough.",
  },
]

type Role = "text" | "image" | "vision"

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

function ProviderTile({
  provider,
  onOpen,
  rank,
  onMoveUp,
  onMoveDown,
}: {
  provider: ProviderInfo
  onOpen: () => void
  /** Its position in the job's order, shown only when there is an order. */
  rank?: number
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  return (
    <div
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors",
        provider.has_user_key
          ? "border-emerald-400/20 hover:border-emerald-400/40"
          : provider.required
            ? "border-amber-400/25 hover:border-amber-400/50"
            : "border-white/[0.08] hover:border-white/25"
      )}
    >
      {rank !== undefined && (
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[10px] font-semibold text-muted-foreground"
          title={rank === 1 ? "Tried first" : `Tried ${rank}${rank === 2 ? "nd" : rank === 3 ? "rd" : "th"}`}
        >
          {rank}
        </span>
      )}
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-3 text-left">
      <ProviderIcon id={provider.id} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Le nom respire plutôt que de se couper : « Custom image en… » et
              « LM Studio (this m… » ne disent plus lequel c'est, ce qui est la
              seule chose que cette ligne a à faire. */}
          <span className="text-sm font-semibold leading-tight">{provider.label}</span>
          {provider.is_default && (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-[1px] text-[9px] font-medium uppercase tracking-wider text-primary">
              default
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
          {provider.endpoint
            ? // An address, not a key. Showing four characters of nothing was
              // the version of this that said "Your key ••••" under a server
              // that has no key at all.
              provider.endpoint_url
              ? `${provider.endpoint_url}${provider.model ? ` · ${provider.model}` : ""}`
              : provider.purpose
            : provider.has_user_key
              ? `Your key ••••${provider.user_key_last4}`
              : provider.purpose}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-start pt-0.5">
        <StatusBadge provider={provider} />
        <span className="text-muted-foreground/60 transition-colors group-hover:text-foreground">
          {provider.has_user_key ? <Check className="h-4 w-4 opacity-0" /> : <Plus className="h-4 w-4" />}
        </span>
      </div>
      </button>

      {/* Arrows rather than a drag: this is a list of two or three, a drag
          needs a pointer and a steady hand, and an arrow says which way it
          will go before you commit to it. */}
      {(onMoveUp || onMoveDown) && (
        <span className="flex shrink-0 flex-col">
          <button
            type="button"
            title="Try this one earlier"
            disabled={!onMoveUp}
            onClick={onMoveUp}
            className="rounded p-0.5 text-muted-foreground hover:bg-white/[0.08] hover:text-foreground disabled:opacity-25"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Try this one later"
            disabled={!onMoveDown}
            onClick={onMoveDown}
            className="rounded p-0.5 text-muted-foreground hover:bg-white/[0.08] hover:text-foreground disabled:opacity-25"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </span>
      )}
    </div>
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
          {provider &&
            (provider.endpoint ? (
              <EndpointBody provider={provider} onClose={onClose} />
            ) : (
              <DialogBody provider={provider} onClose={onClose} />
            ))}
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
          {provider.console_url && (
            <a
              href={provider.console_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              Get a key <ExternalLink className="h-3 w-3" />
            </a>
          )}
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

// hostOf is a URL's site, for a link that should read as a place rather than
// as a sentence. A malformed address falls back to itself, which is still
// better than an empty link.
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

// EndpointBody configures a server rather than an account: an address, and a
// model chosen from what that server says it has.
//
// Two stages, and deliberately so. The model list can only come from the server
// once we know where it is, so saving the address is what unlocks the picker —
// which also means the picker failing is the honest first sign that the address
// is wrong or that nothing is running there.
function EndpointBody({ provider, onClose }: { provider: ProviderInfo; onClose: () => void }) {
  const saveEndpoint = useSaveProviderEndpoint()
  const [url, setUrl] = useState(provider.endpoint_url ?? "")
  const [key, setKey] = useState("")
  const [error, setError] = useState("")

  // Only once there is a saved address to ask. A query fired at a provider the
  // daemon has never heard of would answer with a failure about configuration,
  // which is not the message this dialog wants to show before you have typed
  // anything.
  const models = useProviderModels(provider.endpoint_url ? provider.id : null)
  const connected = Boolean(provider.endpoint_url)

  const save = async (next: { url: string; model?: string }) => {
    setError("")
    try {
      await saveEndpoint.mutateAsync({
        provider: provider.id,
        url: next.url,
        key: key.trim() || undefined,
        model: next.model,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the address")
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
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Address
          </label>
          <Input
            placeholder={provider.default_url || provider.key_hint || "http://host:port/v1"}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save({ url: url.trim() || provider.default_url || "" })
            }}
          />
          {provider.setup_hint && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">{provider.setup_hint}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Key <span className="font-normal normal-case tracking-normal">— only if that server asks for one</span>
          </label>
          <Input
            type="password"
            autoComplete="new-password"
            name={`endpoint-key-${provider.id}`}
            placeholder="Usually empty"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Model
            </label>
            {connected && (
              <button
                type="button"
                onClick={() => void models.refetch()}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={cn("h-3 w-3", models.isFetching && "animate-spin")} /> Refresh
              </button>
            )}
          </div>

          {!connected ? (
            <p className="text-[11px] text-muted-foreground">
              Save the address first — the list of models comes from the server itself.
            </p>
          ) : models.isLoading ? (
            <p className="text-[11px] text-muted-foreground">Asking the server what it can run…</p>
          ) : models.isError ? (
            <p className="text-[11px] text-red-300">
              {models.error instanceof Error ? models.error.message : "That address did not answer."}
            </p>
          ) : (models.data?.models.length ?? 0) === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              The server answered, but has no models loaded yet.
            </p>
          ) : (
            <div className="zy-scroll max-h-52 space-y-1 overflow-y-auto">
              {models.data?.models.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => void save({ url: url.trim() || provider.endpoint_url || "", model: m })}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-[12px]",
                    m === provider.model
                      ? "border-emerald-400/30 bg-emerald-400/[0.06] text-foreground"
                      : "border-white/[0.08] text-muted-foreground hover:border-white/25 hover:text-foreground"
                  )}
                >
                  <span className="truncate font-mono">{m}</span>
                  {m === provider.model && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />}
                </button>
              ))}
            </div>
          )}
          {provider.model && (
            <p className="text-[11px] text-muted-foreground">
              Nodes that name no model use <span className="font-mono text-foreground">{provider.model}</span>.
            </p>
          )}
        </div>

        {error && <p className="text-[11px] text-red-300">{error}</p>}

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex gap-2">
            <Button
              onClick={() => void save({ url: url.trim() || provider.default_url || "", model: provider.model })}
              disabled={saveEndpoint.isPending || (!url.trim() && !provider.default_url)}
            >
              {saveEndpoint.isPending ? "Saving…" : connected ? "Save address" : "Connect"}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Done
            </Button>
          </div>
          {connected && (
            // No key to delete, so clearing the address is how this one is
            // turned off.
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                setUrl("")
                void save({ url: "", model: "" })
              }}
            >
              Disconnect
            </Button>
          )}
        </div>

        {provider.console_url && (
          // The site, named by its address. "Get LM Studio (this machine)" was
          // the version that reused the tile's label, and the label carries a
          // parenthesis that makes no sense on a link.
          <a
            href={provider.console_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            {hostOf(provider.console_url)} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  )
}

// ordered puts a job's providers in the order the account asked for, with
// anything it did not mention after them, in the catalogue's own order.
//
// The saved order can name a provider whose key has since been removed; it is
// kept in the list rather than dropped, because it is still the account's
// stated preference and removing it would silently forget a choice the moment a
// key was rotated.
function ordered(list: ProviderInfo[], want: string[] | undefined): ProviderInfo[] {
  if (!want || want.length === 0) return list
  const rank = new Map(want.map((id, index) => [id, index]))
  return [...list].sort((a, b) => {
    const ra = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER
    const rb = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER
    return ra - rb
  })
}

export function ProviderKeys({ compact = false }: { compact?: boolean }) {
  const { data, isLoading, isError } = useProviders()
  const saveOrder = useSaveProviderOrder()
  const [open, setOpen] = useState<string | null>(null)

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading providers…</p>
  if (isError || !data) return <p className="text-sm text-red-300">Could not load the provider list.</p>

  const providers = data.providers
  const order = data.order ?? {}

  // The dialog reads from the query, so it always shows the current state even
  // after a save changes it underneath.
  const selected = providers.find((p) => p.id === open) ?? null

  // Moving one provider up or down in a job's list. Buttons rather than drag:
  // this is a list of two or three, a drag needs a pointer and a steady hand,
  // and an arrow says which way it will go before you commit to it.
  const move = (role: Role, list: ProviderInfo[], from: number, to: number) => {
    if (to < 0 || to >= list.length) return
    const ids = list.map((p) => p.id)
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)
    saveOrder.mutate({ ...order, [role]: ids })
  }

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {CATEGORIES.map((cat) => {
        const list = ordered(
          providers.filter((p) => p.roles.includes(cat.role)),
          order[cat.role]
        )
        if (list.length === 0) return null
        // The question only exists once two of them are connected. Below that
        // there is nothing to order, and showing arrows would be asking about a
        // choice that has not arisen.
        const orderable = list.filter((p) => p.has_user_key).length > 1

        return (
          <section key={cat.role}>
            <div className="mb-2">
              <div className="text-sm font-semibold">{cat.title}</div>
              <p className="text-[11px] text-muted-foreground">{cat.blurb}</p>
              {orderable && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Tried in this order. The first one with a key does the work.
                </p>
              )}
            </div>
            <div className={compact ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 gap-2 md:grid-cols-2"}>
              {list.map((p, index) => (
                <ProviderTile
                  key={p.id}
                  provider={p}
                  onOpen={() => setOpen(p.id)}
                  rank={orderable ? index + 1 : undefined}
                  onMoveUp={orderable && index > 0 ? () => move(cat.role, list, index, index - 1) : undefined}
                  onMoveDown={
                    orderable && index < list.length - 1 ? () => move(cat.role, list, index, index + 1) : undefined
                  }
                />
              ))}
            </div>
          </section>
        )
      })}

      <ConfigureDialog provider={selected} onClose={() => setOpen(null)} />
    </div>
  )
}
