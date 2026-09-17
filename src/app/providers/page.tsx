"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, KeyRound, ShieldCheck, Sparkles } from "lucide-react"
import { AppShell } from "@/components/AppShell"
import { ProviderKeys } from "@/components/ProviderKeys"
import { useMe, useProviders } from "@/lib/hooks"

// Connecting a model account is its own job, distinct from managing API keys
// and MCP access, so it gets its own page rather than a section buried in
// settings.

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

// Summary says, in one line, what is actually still needed. Counting required
// providers would overstate it: the providers of one job are alternatives, so
// several flags really mean one decision.
function Summary() {
  const { data, isLoading } = useProviders()
  if (isLoading || !data) return null
  const providers = data.providers

  const connected = providers.filter((p) => p.has_user_key)
  const covers = (p: { roles: string[] }, role: string) => p.roles.includes(role)

  // One line per job that nothing covers, naming what would cover it. Listing
  // each unconfigured provider instead would read as a shopping list when any
  // one of them is enough.
  //
  // Code completion is deliberately absent from this list, and not forgotten:
  // it is an editor comfort that ships switched off, and no workflow fails
  // without it. Nagging about it here would push somebody to configure
  // something they never asked for.
  const todo: string[] = []
  for (const [role, label] of [
    ["image", "image generation"],
    ["vision", "vision"],
    ["text", "text generation"],
  ] as const) {
    const forRole = providers.filter((p) => covers(p, role))
    if (forRole.length === 0 || forRole.some((p) => p.has_user_key)) continue
    todo.push(`${label}: a key for one of ${forRole.map((p) => p.label).join(", ")}`)
  }

  if (todo.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-4">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
        <div>
          <div className="text-sm font-medium text-emerald-100">Everything your workflows need is connected.</div>
          <p className="mt-1 text-[11px] leading-relaxed text-emerald-100/70">
            {connected.length === 1 ? "One account is connected." : `${connected.length} accounts are connected.`} Add
            another below to switch a node over to it.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4">
      <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
      <div>
        <div className="text-sm font-medium text-amber-100">
          {todo.length === 1 ? `You still need ${todo[0]}.` : `You still need ${todo.join(", and ")}.`}
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-amber-100/70">
          A workflow that needs one of these is refused before it starts, and tells you which key is missing.
        </p>
      </div>
    </div>
  )
}

export default function ProvidersPage() {
  const { data: me, isLoading } = useMe()

  if (isLoading) {
    return (
      <AppShell wide>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    )
  }
  if (!me) return <AuthRedirect />

  return (
    <AppShell wide>
      <div className="max-w-3xl space-y-8">
        <section>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Sparkles className="h-5 w-5 text-primary" />
            Providers
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Your workflows run on your own model accounts, so whatever a workflow uses, the key has to be
            here. Keys are encrypted at rest and only ever used server-side to run your own workflows. A small
            daily allowance runs on ours to get you started — see below.
          </p>
        </section>

        <Summary />

        <div>
          <div className="mb-3 text-xs text-muted-foreground">Click a provider to connect or change its key.</div>
          <ProviderKeys />
        </div>

        <section className="rounded-xl border border-white/[0.08] bg-card p-5">
          <div className="text-sm font-semibold">What runs on our account</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Ten images and ten model calls a day, so you can try a workflow before going to find a key. They
            reset at midnight UTC, and a key of your own removes the limit rather than adding to it.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Generate and Synthesize in the publish dialog also write a workflow&apos;s description for you, free,
            once every few minutes. Everything else is yours.
          </p>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-card p-5">
          <div>
            <div className="text-sm font-semibold">Looking for API keys or MCP access?</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Those are the keys other tools use to reach Zyvro, and they live in Settings.
            </p>
          </div>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Open Settings <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </AppShell>
  )
}
