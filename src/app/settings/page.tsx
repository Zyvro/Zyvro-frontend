"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, KeyRound, Plug, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useApiKeys, useCreateApiKey, useMe, useRenameApiKey, useRevokeApiKey } from "@/lib/hooks"
import type { ApiKey } from "@/lib/api"
import { AppShell } from "@/components/AppShell"
import { McpConnect, CopyButton } from "@/components/McpConnect"

// Mount-time navigation without useEffect: the callback ref fires once the
// (real, visible) redirect node commits, which is when we push to /login.
function AuthRedirect() {
  const router = useRouter()
  return (
    <div
      ref={(node) => {
        if (node) router.push("/login")
      }}
      className="flex min-h-screen items-center justify-center text-muted-foreground"
    >
      Redirecting…
    </div>
  )
}

function KeyName({ k, rename }: { k: ApiKey; rename: ReturnType<typeof useRenameApiKey> }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(k.name)
  if (editing) {
    return (
      <div className="flex gap-2 items-center">
        <Input
          className="h-7 w-44"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) {
              rename.mutate({ id: k.id, name: name.trim() })
              setEditing(false)
            }
            if (e.key === "Escape") {
              setName(k.name)
              setEditing(false)
            }
          }}
        />
        <Button
          size="sm"
          disabled={!name.trim() || rename.isPending}
          onClick={() => {
            if (name.trim()) {
              rename.mutate({ id: k.id, name: name.trim() })
              setEditing(false)
            }
          }}
        >
          Save
        </Button>
      </div>
    )
  }
  return (
    <button className="font-medium text-left hover:text-primary transition-colors" onClick={() => setEditing(true)} title="Click to rename">
      {k.name}
    </button>
  )
}

function fmtDate(iso?: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function ApiKeysSection() {
  const { data: keys, isLoading } = useApiKeys()
  const createKey = useCreateApiKey()
  const renameKey = useRenameApiKey()
  const revokeKey = useRevokeApiKey()
  const [newName, setNewName] = useState("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

  async function create() {
    const name = newName.trim() || "API key"
    const created = await createKey.mutateAsync(name)
    setNewName("")
    setCreatedKey(created.key)
  }

  // Prefer the most recently created active key for the MCP snippets; fall
  // back to the key just created (before the list refetches).
  const activeKey = createdKey || keys?.find((k) => !k.revoked && k.raw_key)?.raw_key || keys?.[0]?.raw_key || null

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-2xl font-semibold tracking-tight">API keys</h2>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        Keys authenticate MCP clients and API calls (Bearer). Only a SHA-256 hash is stored — the raw key is
        shown exactly once at creation.
      </p>

      <div className="flex gap-2">
        <Input
          placeholder="New key name"
          autoComplete="off"
          name="api-key-name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button onClick={create} disabled={createKey.isPending}>+ Create key</Button>
      </div>

      {createdKey && (
        <div className="rounded-xl border border-primary/50 bg-primary/10 p-4 space-y-2">
          <p className="text-sm font-medium">Key created — copy it now, it won&apos;t be shown again:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2 overflow-x-auto whitespace-nowrap">{createdKey}</code>
            <CopyButton text={createdKey} />
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-2">
          {keys?.map((k) => (
            <div key={k.id} className={`rounded-xl border border-white/[0.08] bg-card p-4 space-y-2 ${k.revoked ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <KeyName k={k} rename={renameKey} />
                  <code className="text-xs text-muted-foreground">{k.prefix}…{k.last4}</code>
                  {k.revoked && <span className="text-xs bg-muted rounded-full px-2 py-0.5">deleted</span>}
                </div>
                {!k.revoked && (
                  <div className="flex gap-2">
                    {revoking === k.id ? (
                      <>
                        <Button size="sm" variant="destructive" onClick={() => { revokeKey.mutate(k.id); setRevoking(null) }}>Confirm delete</Button>
                        <Button size="sm" variant="ghost" onClick={() => setRevoking(null)}>Cancel</Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRevoking(k.id)}>Delete</Button>
                    )}
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground flex gap-4 flex-wrap">
                <span title="API requests made with this key">{k.request_count} requests</span>
                <span title="Workflow nodes executed with this key">{k.node_runs} node runs</span>
                <span>created {fmtDate(k.created_at)}</span>
                <span>last used {fmtDate(k.last_used_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <McpSection apiKey={activeKey} />
    </section>
  )
}

function McpSection({ apiKey }: { apiKey: string | null }) {
  return (
    <div id="mcp" className="space-y-4 pt-2 scroll-mt-24">
      <div className="flex items-center gap-2">
        <Plug className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-2xl font-semibold tracking-tight">Connect the MCP</h2>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        Point any MCP-capable client at Zyvro using the key above, or the REST API directly.
      </p>
      <McpConnect apiKey={apiKey} />
    </div>
  )
}

export default function SettingsPage() {
  const { data: me, isLoading: meLoading } = useMe()

  const authenticated = meLoading || me
  if (!authenticated) {
    return <AuthRedirect />
  }

  return (
    <AppShell wide>
      <div className="space-y-10">
        <section>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">Access &amp; credentials</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage provider keys, API keys, and MCP access for your account.
          </p>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-card p-5">
          <div>
            <div className="text-sm font-semibold">Model provider keys</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              The accounts your workflows run on — Google, Claude, OpenAI, Ollama — now have their own page.
            </p>
          </div>
          <Link
            href="/providers"
            className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Open Providers <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <ApiKeysSection />
      </div>
    </AppShell>
  )
}
