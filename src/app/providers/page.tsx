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
// providers would overstate it: the three text providers are alternatives, so
// four flags really mean two decisions.
function Summary() {
  const { data: providers, isLoading } = useProviders()
  if (isLoading || !providers) return null

  const connected = providers.filter((p) => p.has_user_key)
  const missingImage = providers.filter((p) => p.role === "image" && p.required)
  const textMissing = providers.some((p) => p.role === "text" && p.required)

  const todo: string[] = missingImage.map((p) => p.label)
  if (textMissing) {
    const options = providers.filter((p) => p.role === "text").map((p) => p.label)
    todo.push(`a key for one of ${options.join(", ")}`)
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
            Your workflows run on your own model accounts. Nothing runs on Zyvro&apos;s keys, so whatever a
            workflow uses, the key has to be here. Keys are encrypted at rest and only ever used server-side to
            run your own workflows.
          </p>
        </section>

        <Summary />

        <div>
          <div className="mb-3 text-xs text-muted-foreground">Click a provider to connect or change its key.</div>
          <ProviderKeys />
        </div>

        <section className="rounded-xl border border-white/[0.08] bg-card p-5">
          <div className="text-sm font-semibold">The one exception</div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Generate and Synthesize in the publish dialog write a workflow&apos;s description for you. Those run on
            Zyvro&apos;s own account and are free, once every few minutes. Everything else is yours.
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
