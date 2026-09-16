"use client"

import { useState } from "react"
import { ExternalLink, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSetSecret } from "@/lib/hooks"
import type { MissingProviderKeys, ProviderInfo } from "@/lib/api"

// Shown when a run is refused because the workflow needs a provider account the
// user has not connected. Workflows always spend the owner's own credits, so
// this is the normal first-run state rather than a failure, and the panel lets
// the key be added right here instead of sending the user off to Settings.

function ProviderRow({ provider, onSaved }: { provider: ProviderInfo; onSaved: () => void }) {
  const setSecret = useSetSecret()
  const [value, setValue] = useState("")
  const [error, setError] = useState("")

  async function save() {
    const secret = value.trim()
    if (!secret) return
    setError("")
    try {
      await setSecret.mutateAsync({ provider: provider.id, secret })
      setValue("")
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the key")
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-background/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <KeyRound className="h-3.5 w-3.5 text-amber-300" />
          {provider.label}
        </div>
        <a
          href={provider.console_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          Get a key <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{provider.purpose}</p>
      <div className="mt-2 flex gap-2">
        <Input
          type="password"
          autoComplete="new-password"
          name={`missing-key-${provider.id}`}
          className="h-8 text-xs"
          placeholder={provider.key_hint}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save()
          }}
        />
        <Button size="sm" className="h-8" disabled={!value.trim() || setSecret.isPending} onClick={() => void save()}>
          {setSecret.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
      {error && <p className="mt-1 text-[11px] text-red-300">{error}</p>}
    </div>
  )
}

export function MissingKeysPanel({
  missing,
  onResolved,
  onDismiss,
  className,
}: {
  missing: MissingProviderKeys
  // Called once every named provider has a key stored, so the caller can offer
  // to run again.
  onResolved?: () => void
  onDismiss?: () => void
  className?: string
}) {
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const allSaved = missing.providers.every((p) => saved[p.id])

  return (
    <div className={className}>
      {/* An opaque card first, then the amber tint on top of it. The tint alone
          is 7% opacity, which let the canvas read straight through the panel. */}
      <div className="overflow-hidden rounded-xl border border-amber-400/30 bg-card shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur">
        <div className="bg-amber-400/[0.07] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-amber-100">{missing.error}</div>
              <p className="mt-1 text-[11px] leading-relaxed text-amber-100/70">{missing.hint}</p>
            </div>
            {onDismiss && (
              <button onClick={onDismiss} className="text-xs text-amber-100/60 hover:text-amber-100">
                Dismiss
              </button>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {missing.providers.map((p) => (
              <ProviderRow
                key={p.id}
                provider={p}
                onSaved={() => {
                  const next = { ...saved, [p.id]: true }
                  setSaved(next)
                  if (missing.providers.every((x) => next[x.id])) onResolved?.()
                }}
              />
            ))}
          </div>

          {allSaved && <p className="mt-3 text-[11px] text-emerald-300">Keys saved. You can run the workflow now.</p>}
        </div>
      </div>
    </div>
  )
}
