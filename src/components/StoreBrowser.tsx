"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  BookOpen,
  Box,
  Bug,
  Code2,
  Copy,
  Download,
  Laptop,
  Loader2,
  LogIn,
  Package,
  PenLine,
  Puzzle,
  Rocket,
  Sparkles,
  Wand2,
  SearchIcon,
  ShieldAlert,
  Workflow as WorkflowIcon,
} from "lucide-react"
import { AppShell } from "@/components/AppShell"
import { StoreSource } from "@/components/StoreSource"
import { WorkflowThumb } from "@/components/WorkflowThumb"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  useCopyStoreTemplate,
  useStorePacks,
  useStorePlugin,
  useStorePlugins,
  useStoreTemplates,
} from "@/lib/storeHooks"
import { useMe } from "@/lib/hooks"
import { runsOnline } from "@/lib/storeRules"
import type { StoreAgentPlugin, StorePack, StoreTemplate } from "@/lib/api"

type Section = "nodes" | "workflows" | "plugins"

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

// The icon names a plugin may declare; the server refuses any other value, and
// an unknown one here (a newer server) still gets the default.
const PLUGIN_ICONS = {
  puzzle: Puzzle,
  sparkles: Sparkles,
  wand: Wand2,
  book: BookOpen,
  bug: Bug,
  rocket: Rocket,
  code: Code2,
  pen: PenLine,
} as const

function PluginFiles({ name }: { name: string }) {
  const plugin = useStorePlugin(name)
  if (plugin.isLoading) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 zy-spin" /> Fetching the files
      </p>
    )
  }
  if (plugin.isError) {
    return <p className="text-xs text-destructive">{(plugin.error as Error).message}</p>
  }
  const files = plugin.data?.files ?? []
  if (files.length === 0) {
    return <p className="text-xs text-muted-foreground">This plugin carries no readable files.</p>
  }
  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div key={file.path} className="overflow-hidden rounded-lg border border-white/[0.08] bg-black/40">
          <div className="border-b border-white/[0.06] px-3 py-1.5">
            <span className="font-mono text-[11px] text-muted-foreground">{file.path}</span>
          </div>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground/90">
            {file.code}
          </pre>
        </div>
      ))}
    </div>
  )
}

function PluginCard({ plugin }: { plugin: StoreAgentPlugin }) {
  const [reading, setReading] = useState(false)
  const Icon = PLUGIN_ICONS[plugin.icon as keyof typeof PLUGIN_ICONS] ?? Puzzle
  const signed = Boolean(plugin.signature)

  return (
    <article className="panel p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-violet-300">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium">{plugin.name}</span>
            <span className="font-mono text-[11px] text-muted-foreground">{plugin.version}</span>
            <span className="text-[11px] text-muted-foreground">
              by {plugin.publisher_name || plugin.author || "unknown"}
            </span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
                signed ? "bg-emerald-400/15 text-emerald-300" : "bg-white/[0.07] text-muted-foreground"
              )}
              title={signed ? "Signed by the publisher's key" : "Published without a signature"}
            >
              {signed ? "Signed" : "Unsigned"}
            </span>
          </h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
            {plugin.description || "No description."}
          </p>

          {plugin.actions?.length > 0 && (
            <div className="mt-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Actions</p>
              <ul className="mt-1 space-y-0.5">
                {plugin.actions.map((a) => (
                  <li key={a.id} className="text-[12px] leading-relaxed">
                    <span className="font-medium">{a.label}</span>
                    {a.description && <span className="text-muted-foreground"> — {a.description}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {plugin.skills?.length > 0 && (
            <div className="mt-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Skills</p>
              <ul className="mt-1 space-y-0.5">
                {plugin.skills.map((k) => (
                  <li key={k.dir} className="text-[12px] leading-relaxed">
                    <span className="font-medium">{k.name}</span>
                    {k.description && <span className="text-muted-foreground"> — {k.description}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <Laptop className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              Plugins install from Zyvro Studio: they work through its agent, which the web app
              cannot run.
            </span>
          </p>
        </div>

        <button
          className="shrink-0 rounded-lg border border-white/[0.1] px-2.5 py-1.5 text-[12px] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
          onClick={() => setReading((r) => !r)}
        >
          {reading ? "Hide files" : "Read files"}
        </button>
      </div>

      {reading && (
        <div className="mt-3 border-t border-white/[0.06] pt-3">
          <PluginFiles name={plugin.name} />
        </div>
      )}
    </article>
  )
}

// A template with no picture still needs a card that reads as a card. The
// listing carries the node types — the graph is stripped from it — so that is
// what gets shown.
//
// Chips, not a chain: node_types is a set, and drawing arrows between its
// members would promise an order the data does not have.
function TypeSketch({ types }: { types: string[] }) {
  const shown = types.slice(0, 5)
  return (
    <div
      className="flex h-28 w-full flex-wrap content-center items-center justify-center gap-1.5 overflow-hidden px-3"
      style={{
        backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
        backgroundSize: "14px 14px",
      }}
    >
      {shown.map((t) => (
        <span
          key={t}
          className="truncate rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] text-muted-foreground"
        >
          {t}
        </span>
      ))}
      {types.length > shown.length && (
        <span className="text-[10px] text-muted-foreground/70">+{types.length - shown.length}</span>
      )}
    </div>
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
    <article className="panel flex flex-col overflow-hidden">
      {/* The picture first, the way it is on every other listing of workflows:
          what went in on the left, what came out on the right. */}
      <div className="border-b border-white/[0.06]">
        <WorkflowThumb
          preview={template.preview}
          fallback={<TypeSketch types={template.node_types ?? []} />}
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-medium">{template.name}</span>
          <span className="text-[11px] text-muted-foreground">
            v{template.version} · by {template.publisher_name || "unknown"}
          </span>
        </h2>
        <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
          {template.description || "No description."}
        </p>

        {template.requires?.length > 0 && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Download className="h-3 w-3" />
            needs {template.requires.map((r) => `${r.name}@${r.version}`).join(", ")}
          </p>
        )}

        {/* Saying plainly why something cannot run here is the whole point.
            A greyed-out button with no explanation reads as a bug. */}
        {!runnable.online && (
          <p className="flex items-start gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <Laptop className="mt-0.5 h-3 w-3 shrink-0" />
            <span>
              Runs in Zyvro Studio, not here: it {runnable.reason}.{" "}
              <span className="font-mono text-foreground/70">{runnable.nodes.join(", ")}</span>
            </span>
          </p>
        )}

        <div className="mt-auto flex items-center gap-2 pt-1">
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

export function StoreBrowser() {
  const router = useRouter()
  const { data: me } = useMe()
  const copy = useCopyStoreTemplate()
  // Les workflows d'abord : c'est ce qu'on vient chercher en ouvrant une
  // boutique. Un pack de nœuds est une dépendance d'un workflow, et l'onglet
  // d'à côté le tient. Le desktop range les siens dans le même ordre, et deux
  // boutiques qui n'ouvrent pas sur la même chose sont deux boutiques.
  //
  // ?tab= peut encore désigner l'autre, parce que tout ce qui pointait vers
  // Explore pointe maintenant ici. Lu une fois pour l'état initial : ensuite
  // c'est le clic qui décide.
  const params = useSearchParams()
  const [section, setSection] = useState<Section>(
    params.get("tab") === "nodes" ? "nodes" : params.get("tab") === "plugins" ? "plugins" : "workflows"
  )
  const [query, setQuery] = useState("")

  const packs = useStorePacks(query)
  const templates = useStoreTemplates(query)
  const plugins = useStorePlugins(query)
  const active = section === "nodes" ? packs : section === "plugins" ? plugins : templates
  const items =
    section === "nodes"
      ? packs.data?.packs ?? []
      : section === "plugins"
        ? plugins.data?.plugins ?? []
        : templates.data?.templates ?? []

  return (
    <AppShell wide>
      <div className="space-y-6">
        <section>
          <div className="flex items-center gap-2">
            <Box className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">Store</h1>
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Nodes, workflows and agent plugins other people published. Nodes are written in Lua,
            plugins are Markdown skills and prompts for the Studio agent. Read anything
            before you trust it, and install it from Zyvro Studio to run it on your own machine.
          </p>
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.02] p-0.5">
            {(["nodes", "workflows", "plugins"] as Section[]).map((value) => (
              <button
                key={value}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm capitalize",
                  section === value ? "bg-white/[0.09] text-foreground" : "text-muted-foreground"
                )}
                onClick={() => setSection(value)}
              >
                {value === "nodes" ? (
                  <Package className="h-4 w-4" />
                ) : value === "plugins" ? (
                  <Puzzle className="h-4 w-4" />
                ) : (
                  <WorkflowIcon className="h-4 w-4" />
                )}
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

        <div
          className={cn(
            section === "nodes" || section === "plugins" ? "space-y-3" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          )}
        >
          {section === "nodes"
            ? (items as StorePack[]).map((p) => <PackCard key={p.id || p.name} pack={p} />)
            : section === "plugins"
            ? (items as StoreAgentPlugin[]).map((p) => <PluginCard key={p.id || p.name} plugin={p} />)
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
