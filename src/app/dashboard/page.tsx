"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowRight, Compass, Layers, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppShell } from "@/components/AppShell"
import { WorkflowCard } from "@/components/WorkflowCard"
import { McpConnect } from "@/components/McpConnect"
import { ProviderKeys } from "@/components/ProviderKeys"
import { useCreateWorkflow, useDeleteWorkflow, useMe, useWorkflows } from "@/lib/hooks"

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

export default function DashboardPage() {
  const router = useRouter()
  const { data: me, isLoading: meLoading } = useMe()
  const { data: workflows, isLoading } = useWorkflows()
  const createMutation = useCreateWorkflow()
  const deleteMutation = useDeleteWorkflow()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const authenticated = meLoading || me
  if (!authenticated) {
    return <AuthRedirect />
  }

  return (
    <AppShell wide>
      <div className="space-y-10">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
            <p className="mt-1 text-sm text-muted-foreground">Saved workflows are reusable. Run them with new inputs any time.</p>
          </div>
          <Button onClick={() => createMutation.mutate("Untitled workflow", { onSuccess: (wf) => router.push(`/builder/${wf.id}`) })}>
            <Plus /> New workflow
          </Button>
        </section>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !workflows?.length ? (
          <div className="rounded-xl border border-dashed border-white/15 p-12 text-center">
            <Layers className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No workflows yet. Create one or start from a public template.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workflows.map((wf) => (
              <WorkflowCard
                key={wf.id}
                mode="owned"
                workflow={wf}
                confirmDelete={confirmDelete === wf.id}
                onOpen={() => router.push(`/builder/${wf.id}`)}
                onRequestDelete={() => setConfirmDelete(wf.id)}
                onConfirmDelete={() => {
                  deleteMutation.mutate(wf.id)
                  setConfirmDelete(null)
                }}
                onCancelDelete={() => setConfirmDelete(null)}
              />
            ))}
          </div>
        )}

        <Link
          href="/explore"
          className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-card px-5 py-4 transition-colors hover:border-white/20"
        >
          <div className="flex items-center gap-3">
            <Compass className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="text-sm font-semibold">Browse public workflows</div>
              <p className="text-xs text-muted-foreground">Copy official templates and workflows shared by the community.</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>

        <section>
          <h2 className="text-lg font-semibold tracking-tight">Get set up</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">Add your provider keys and connect Zyvro to your MCP clients.</p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ProviderKeys compact />
            <McpConnect apiKey={null} compact />
          </div>
        </section>
      </div>
    </AppShell>
  )
}
