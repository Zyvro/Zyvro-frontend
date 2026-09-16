"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { LogIn, Package, PenSquare, User } from "lucide-react"
import { AppShell } from "@/components/AppShell"
import { Button } from "@/components/ui/button"
import { GraphThumb, parseGraph } from "@/components/WorkflowCard"
import { WorkflowThumb, hasPreview } from "@/components/WorkflowThumb"
import { useDuplicateWorkflow, useMe, useSharedWorkflow } from "@/lib/hooks"

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-16">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse at 50% 40%, black 10%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 10%, transparent 70%)",
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[24rem] w-[40rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
      <div className="relative w-full max-w-lg">
        <Link href="/" className="mb-6 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-full.png" alt="Zyvro" className="hidden h-9 w-auto sm:block" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-icon.png" alt="Zyvro" className="h-9 w-9 rounded-lg sm:hidden" />
        </Link>
        {children}
      </div>
    </div>
  )
}

function NotShared() {
  return (
    <Centered>
      <div className="rounded-xl border border-white/[0.08] bg-card/95 p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur">
        <h1 className="text-lg font-semibold">This workflow is not shared, or the link is wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The owner may have made it private, or the link may be mistyped.
        </p>
        <Link
          href="/store?tab=workflows"
          className="mt-5 inline-flex items-center gap-2 text-sm text-primary underline underline-offset-2"
        >
          <Package className="h-4 w-4" /> Browse the store
        </Link>
      </div>
    </Centered>
  )
}

function SharedContent({ id }: { id: string }) {
  const router = useRouter()
  const { data: me } = useMe()
  const duplicateMutation = useDuplicateWorkflow()
  const { data, isLoading, isError } = useSharedWorkflow(id)

  if (isLoading) {
    return (
      <Centered>
        <p className="text-center text-sm text-muted-foreground">Loading…</p>
      </Centered>
    )
  }

  if (isError || !data) {
    return <NotShared />
  }

  const { workflow, requires_account, can_duplicate } = data
  const graph = parseGraph(workflow)
  const nodeCount = workflow.node_count ?? graph.nodes?.length ?? 0
  const edgeCount = workflow.edge_count ?? graph.edges?.length ?? 0

  const card = (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-card/95 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur">
      <div
        className="border-b border-white/[0.06] bg-background/60 px-4 py-3"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "14px 14px" }}
      >
        {hasPreview(workflow.preview) ? (
          <WorkflowThumb preview={workflow.preview} className="h-40" />
        ) : (
          <GraphThumb graph={graph} />
        )}
      </div>
      <div className="p-6">
        <h1 className="text-xl font-semibold tracking-tight">{workflow.name}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{workflow.description || "No description."}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" /> {workflow.author_name}
          </span>
          <span>
            {nodeCount} nodes · {edgeCount} links
          </span>
        </div>

        <div className="mt-6">
          {workflow.is_owner ? (
            <Button className="w-full" onClick={() => router.push(`/builder/${workflow.id}`)}>
              <PenSquare /> Open in builder
            </Button>
          ) : can_duplicate ? (
            <Button
              className="w-full"
              disabled={duplicateMutation.isPending}
              onClick={() =>
                duplicateMutation.mutate(workflow.id, {
                  onSuccess: (created) => router.push(`/builder/${created.id}`),
                })
              }
            >
              Add to my workflows
            </Button>
          ) : requires_account ? (
            <>
              <Link
                href="/login"
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <LogIn className="h-4 w-4" /> Sign in to use this workflow
              </Link>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                A free account is needed because your copy has to belong to someone.
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )

  if (me) {
    return (
      <AppShell wide>
        <div className="mx-auto max-w-lg">{card}</div>
      </AppShell>
    )
  }

  return <Centered>{card}</Centered>
}

export default function SharedWorkflowPage({ params }: { params: { id: string } }) {
  return <SharedContent id={params.id} />
}
