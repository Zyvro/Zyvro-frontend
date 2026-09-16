"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Box,
  Copy,
  Download,
  Laptop,
  Loader2,
  LogIn,
  Package,
  SearchIcon,
  ShieldAlert,
  Workflow as WorkflowIcon,
} from "lucide-react"
import { AppShell } from "@/components/AppShell"
import { StoreSource } from "@/components/StoreSource"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useCopyStoreTemplate, useStorePacks, useStoreTemplates } from "@/lib/storeHooks"
import { useMe } from "@/lib/hooks"
import { runsOnline } from "@/lib/storeRules"
import type { StorePack, StoreTemplate } from "@/lib/api"

type Section = "nodes" | "workflows"

// A capability is the one line worth reading before trusting a pack. Most ask
// for nothing or for llm; the others are worth a second look, so they are
// tinted and the ordinary ones are not.
const LOUD = new Set(["files", "image", "vision", "agent"])

function Capabilities({ capabilities }: { capabilities: string[] }) {
  if (!capabilities?.length) {
    return <span className="text-[11px] text-muted-foreground">no capabilities</span>
  }
  return (
    <span className="flex flex-wrap gap-1">
      {capabilities.map((c) => (
        <span
          key={c}
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
            LOUD.has(c) ? "bg-amber-400/15 text-amber-300" : "bg-white/[0.07] text-muted-foreground"
          )}
        >
          {c}
        </span>
      ))}
    </span>
  )
}

function PackCard({ pack }: { pack: StorePack }) {
  const [reading, setReading] = useState(false)

  return (
    <article className="panel p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-violet-300">
          <Package className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium">{pack.name}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{pack.version}</span>
            <span className="text-[11px] text-muted-foreground">by {pack.author || "unknown"}</span>
          </h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
            {pack.description || "No description."}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Capabilities capabilities={pack.capabilities} />
            <span className="text-[11px] text-muted-foreground">
              {pack.nodes?.length ?? 0} node{(pack.nodes?.length ?? 0) === 1 ? "" : "s"}
              {pack.nodes?.length ? `: ${pack.nodes.map((n) => n.label).join(", ")}` : ""}
            </span>
          </div>
        </div>

        <button
          className="shrink-0 rounded-lg border border-white/[0.1] px-2.5 py-1.5 text-[12px] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
          onClick={() => setReading((r) => !r)}
        >
          {reading ? "Hide source" : "Read source"}
        </button>
      </div>

      {reading && (
        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <StoreSource name={pack.name} />
        </div>
      )}
    </article>
  )
}

function TemplateCard({
  template,
  signedIn,
  onCopy,
  copying,
}: {
  template: StoreTemplate
  signedIn: boolean
  onCopy: () => void
  copying: boolean
}) {
  const runnable = runsOnline(template)

  return (
    <article className="panel p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-emerald-300">
          <WorkflowIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium">{template.name}</span>
            <span className="text-[11px] text-muted-foreground">
              by {template.publisher_name || "unknown"}
            </span>
          </h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
            {template.description || "No description."}
          </p>

          {template.requires?.length > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Download className="h-3 w-3" />
              needs {template.requires.map((r) => `${r.name}@${r.version}`).join(", ")}
            </p>
          )}

          {/* Saying plainly why something cannot run here is the whole point.
              A greyed-out button with no explanation reads as a bug. */}
          {!runnable.online && (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <Laptop className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                Runs in Zyvro Studio, not here: it {runnable.reason}.{" "}
                <span className="font-mono text-foreground/70">{runnable.nodes.join(", ")}</span>
              </span>
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] px-2.5 py-1.5 text-[12px] hover:bg-white/[0.06] disabled:opacity-50"
            disabled={!signedIn || copying}
            onClick={onCopy}
            title={signedIn ? "Make your own editable copy" : "Sign in to copy this"}
          >
            {copying ? <Loader2 className="h-3.5 w-3.5 zy-spin" /> : <Copy className="h-3.5 w-3.5" />}
            Copy
          </button>
          {!signedIn && (
            <a href="/login" className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
              <LogIn className="h-3 w-3" /> sign in
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

export default function StorePage() {
  const router = useRouter()
  const { data: me } = useMe()
  const copy = useCopyStoreTemplate()
  const [section, setSection] = useState<Section>("nodes")
  const [query, setQuery] = useState("")

  const packs = useStorePacks(query)
  const templates = useStoreTemplates(query)
  const active = section === "nodes" ? packs : templates
  const items = section === "nodes" ? packs.data?.packs ?? [] : templates.data?.templates ?? []

  return (
    <AppShell wide>
      <div className="space-y-6">
        <section>
          <div className="flex items-center gap-2">
            <Box className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">Store</h1>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Nodes and workflows other people published, written in Lua. Read the source of anything
            before you trust it, and install it from Zyvro Studio to run it on your own machine.
          </p>
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
            {(["nodes", "workflows"] as Section[]).map((value) => (
              <button
                key={value}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm capitalize",
                  section === value ? "bg-white/[0.09] text-foreground" : "text-muted-foreground"
                )}
                onClick={() => setSection(value)}
              >
                {value === "nodes" ? <Package className="h-4 w-4" /> : <WorkflowIcon className="h-4 w-4" />}
                {value}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px] flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={`Search ${section}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {active.isLoading && (
          <p className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 zy-spin" /> Loading
          </p>
        )}

        {copy.isError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {(copy.error as Error).message}
          </p>
        )}

        {active.isError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {(active.error as Error).message}
          </p>
        )}

        {active.isSuccess && items.length === 0 && (
          <p className="py-10 text-sm text-muted-foreground">
            Nothing published yet{query ? ` for “${query}”` : ""}.
          </p>
        )}

        <div className="space-y-3">
          {section === "nodes"
            ? (items as StorePack[]).map((p) => <PackCard key={p.id || p.name} pack={p} />)
            : (items as StoreTemplate[]).map((t) => (
                <TemplateCard
                  key={t.id || t.name}
                  template={t}
                  signedIn={Boolean(me)}
                  copying={copy.isPending && copy.variables === t.name}
                  onCopy={() =>
                    copy.mutate(t.name, {
                      // Straight into the editor: the reason to copy a template
                      // is to change it, and a copy that lands in a list
                      // somewhere makes that a second errand.
                      onSuccess: (created) => router.push(`/builder/${created.id}`),
                    })
                  }
                />
              ))}
        </div>

        <footer className="flex gap-2 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] p-3 text-[12px] leading-relaxed">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p className="text-foreground/80">
            Nothing here is reviewed by us. Anything you install runs on your own machine, in a
            sandbox that bounds it to processor time and your model quota, and a pack can only reach
            your files if it declares the capability shown on its card.
          </p>
        </footer>
      </div>
    </AppShell>
  )
}
