"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { StoreTemplate } from "@/lib/api"
import { useStoreTemplates } from "@/lib/storeHooks"
import { WorkflowThumb, hasPreview } from "@/components/WorkflowThumb"
import { cn } from "@/lib/utils"

// The landing page shows the same thumbnail the rest of the product shows: one
// real input next to the result it produced, captured from an actual run. The
// store reads without an account, so a first-time visitor sees real work rather
// than a mockup.
//
// It reads the store rather than a separate list of public workflows, because
// there is one catalogue now. Two of them meant a visitor had to guess which
// page to look at, and a workflow could be on one and not the other.

const MAX_TILES = 6

function Tile({ template }: { template: StoreTemplate }) {
  return (
    <Link
      href="/store?tab=workflows"
      className="group flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-card transition-colors hover:border-white/25"
    >
      <WorkflowThumb preview={template.preview} className="h-44" />
      <div className="flex flex-1 flex-col gap-1 border-t border-white/[0.06] p-4">
        <div className="text-sm font-semibold">{template.name}</div>
        {template.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{template.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 text-[11px] text-muted-foreground">
          <span className="truncate">{template.publisher_name || "unknown"}</span>
          <span className="shrink-0">{template.node_types?.length ?? 0} nodes</span>
        </div>
      </div>
    </Link>
  )
}

function TileSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-card">
      <div className="h-44 w-full animate-pulse bg-white/[0.04]" />
      <div className="space-y-2 border-t border-white/[0.06] p-4">
        <div className="h-3 w-3/5 animate-pulse rounded bg-white/[0.05]" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-white/[0.04]" />
      </div>
    </div>
  )
}

export function LandingShowcase({ className }: { className?: string }) {
  const { data, isLoading, isError } = useStoreTemplates()
  // A workflow that has never run has no thumbnail to show, so it is left out
  // rather than rendered as an empty frame.
  const items = (data?.templates ?? []).filter((t) => hasPreview(t.preview)).slice(0, MAX_TILES)

  // A landing page has nothing useful to say about a failed fetch, and an empty
  // gallery is worse than none, so the section simply does not appear.
  if (isError || (!isLoading && items.length === 0)) return null

  return (
    <section className={cn("mx-auto max-w-6xl px-6", className)}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Made with Zyvro</h2>
          <p className="text-sm text-muted-foreground">
            Published workflows, each shown as what went in and what came out.
          </p>
        </div>
        <Link
          href="/store?tab=workflows"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Browse all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }, (_, i) => <TileSkeleton key={i} />)
          : items.map((t) => <Tile key={t.id || t.name} template={t} />)}
      </div>
    </section>
  )
}
