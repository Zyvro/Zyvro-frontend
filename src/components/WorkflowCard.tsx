"use client"

import Link from "next/link"
import { ArrowRight, Copy, Globe, Lock, Trash2, User, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Workflow, WorkflowCard as WorkflowCardData, WorkflowPreview } from "@/lib/api"
import { WorkflowThumb, hasPreview } from "@/components/WorkflowThumb"

export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export type ParsedGraph = { nodes?: Array<{ position?: { x: number; y: number } }>; edges?: unknown[] }

export function parseGraph(wf: { graph_json: string | ParsedGraph }): ParsedGraph {
  if (typeof wf.graph_json !== "string") return wf.graph_json || {}
  try {
    return JSON.parse(wf.graph_json)
  } catch {
    return {}
  }
}

export function GraphThumb({ graph }: { graph: ParsedGraph }) {
  const nodes = graph.nodes || []
  if (nodes.length === 0) {
    return <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">Empty canvas</div>
  }
  const xs = nodes.map((n) => n.position?.x ?? 0)
  const ys = nodes.map((n) => n.position?.y ?? 0)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const w = Math.max(1, Math.max(...xs) - minX + 260)
  const h = Math.max(1, Math.max(...ys) - minY + 160)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full" preserveAspectRatio="xMidYMid meet">
      {nodes.map((n, i) => (
        <rect
          key={i}
          x={(n.position?.x ?? 0) - minX}
          y={(n.position?.y ?? 0) - minY}
          width={260}
          height={140}
          rx={18}
          className="fill-white/[0.08] stroke-white/20"
          strokeWidth={4}
        />
      ))}
    </svg>
  )
}

const visibilityMeta: Record<Workflow["visibility"], { label: string; icon: typeof Lock }> = {
  private: { label: "Private", icon: Lock },
  unlisted: { label: "Unlisted", icon: Users },
  public: { label: "Public", icon: Globe },
}

function VisibilityPill({ visibility }: { visibility: Workflow["visibility"] }) {
  const meta = visibilityMeta[visibility]
  const Icon = meta.icon
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-muted-foreground">
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  )
}

function Thumb({
  graph,
  preview,
  children,
}: {
  graph: ParsedGraph
  preview?: WorkflowPreview | null
  children?: React.ReactNode
}) {
  if (hasPreview(preview)) {
    return (
      <div className="relative border-b border-white/[0.06]">
        <WorkflowThumb preview={preview} />
        {children}
      </div>
    )
  }
  return (
    <div
      className="relative border-b border-white/[0.06] bg-background/60 px-4 py-3"
      style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "14px 14px" }}
    >
      <GraphThumb graph={graph} />
      {children}
    </div>
  )
}

type OwnedProps = {
  mode: "owned"
  workflow: Workflow
  confirmDelete: boolean
  onOpen: () => void
  onRequestDelete: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
}

type BrowseProps = {
  mode: "browse"
  workflow: WorkflowCardData
  onUse: () => void
  useDisabled?: boolean
  useLabel?: string
  useHref?: string
}

export type WorkflowCardProps = OwnedProps | BrowseProps

export function WorkflowCard(props: WorkflowCardProps) {
  const { workflow } = props
  const graph = parseGraph(workflow)
  const nodeCount = "node_count" in workflow ? workflow.node_count : graph.nodes?.length ?? 0
  const edgeCount = "edge_count" in workflow ? workflow.edge_count : graph.edges?.length ?? 0

  if (props.mode === "owned") {
    const { confirmDelete, onOpen, onRequestDelete, onConfirmDelete, onCancelDelete } = props
    return (
      <div className="group overflow-hidden rounded-xl border border-white/[0.08] bg-card transition-colors hover:border-white/20">
        <button type="button" onClick={onOpen} className="block w-full text-left">
          <Thumb graph={graph} preview={workflow.preview} />
          <div className="px-4 pt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate text-sm font-semibold">{workflow.name}</div>
              <VisibilityPill visibility={workflow.visibility} />
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {nodeCount} nodes · {edgeCount} links · v{workflow.version} · {timeAgo(workflow.updated_at)}
            </div>
          </div>
        </button>
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <Button size="sm" variant="outline" onClick={onOpen}>
            Open <ArrowRight />
          </Button>
          {confirmDelete ? (
            <div className="flex gap-1">
              <Button size="sm" variant="destructive" onClick={onConfirmDelete}>
                Confirm
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelDelete}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-red-300" onClick={onRequestDelete} title="Delete">
              <Trash2 />
            </Button>
          )}
        </div>
      </div>
    )
  }

  const { onUse, useDisabled, useLabel, useHref, workflow: wf } = props

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-card transition-colors hover:border-white/20">
      <Thumb graph={graph} preview={wf.preview} />
      <div className="flex flex-1 flex-col px-4 pt-3">
        <div className="truncate text-sm font-semibold">{wf.name}</div>
        <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">{wf.description || "No description."}</p>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" /> {wf.author_name}
          </span>
          <span>
            {nodeCount} nodes · {edgeCount} links
          </span>
        </div>
        {wf.duplicate_count > 0 ? (
          <div className="mt-1 text-[11px] text-muted-foreground">
            Copied {wf.duplicate_count} time{wf.duplicate_count === 1 ? "" : "s"}
          </div>
        ) : null}
      </div>
      <div className="px-4 pb-4 pt-3">
        {useHref ? (
          <Link href={useHref} className={cn("inline-flex h-8 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90")}>
            {useLabel ?? "Sign in to use"}
          </Link>
        ) : (
          <Button size="sm" className="w-full" onClick={onUse} disabled={useDisabled}>
            <Copy /> {useLabel ?? "Use this workflow"}
          </Button>
        )}
      </div>
    </div>
  )
}
