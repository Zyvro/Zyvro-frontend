"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Compass, SearchIcon } from "lucide-react"
import { AppShell } from "@/components/AppShell"
import { WorkflowCard } from "@/components/WorkflowCard"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useDuplicateWorkflow, useMe, usePublicWorkflows } from "@/lib/hooks"

type Filter = "all" | "official" | "community"

export default function ExplorePage() {
  const router = useRouter()
  const { data: me } = useMe()
  const { data: workflows, isLoading } = usePublicWorkflows()
  const duplicateMutation = useDuplicateWorkflow()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")

  const filtered = useMemo(() => {
    const list = workflows ?? []
    const byKind = list.filter((wf) => {
      if (filter === "official") return wf.is_official
      if (filter === "community") return !wf.is_official
      return true
    })
    const q = query.trim().toLowerCase()
    if (!q) return byKind
    return byKind.filter((wf) =>
      [wf.name, wf.description, wf.author_name].some((field) => (field || "").toLowerCase().includes(q))
    )
  }, [workflows, filter, query])

  return (
    <AppShell wide>
      <div className="space-y-8">
        <section>
          <div className="flex items-center gap-2">
            <Compass className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">Explore</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Public workflows anyone can copy. Duplicate one to get your own editable version, with your data and keys.
          </p>
        </section>

        <section className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, description or author…"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.02] p-1">
            {(
              [
                { id: "all", label: "All" },
                { id: "official", label: "Templates" },
                { id: "community", label: "Community" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === opt.id ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !filtered.length ? (
          <div className="rounded-xl border border-dashed border-white/15 p-12 text-center">
            <Compass className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {workflows?.length ? "No workflows match your search." : "No public workflows yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((wf) => (
              <WorkflowCard
                key={wf.id}
                mode="browse"
                workflow={wf}
                useHref={me ? undefined : "/login"}
                useLabel={me ? "Use this workflow" : "Sign in to use"}
                useDisabled={duplicateMutation.isPending}
                onUse={() =>
                  duplicateMutation.mutate(wf.id, {
                    onSuccess: (created) => router.push(`/builder/${created.id}`),
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
