"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAdminCancelExecution, useAdminQueue } from "@/lib/hooks"
import { EmptyState, formatMs, fmtDateTime, StatTile, StatusBadge } from "./utils"

export function QueueTab() {
  const { data, isLoading } = useAdminQueue()
  const cancel = useAdminCancelExecution()
  const [pendingId, setPendingId] = useState<string | null>(null)

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  const { stats, jobs } = data

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatTile label="Waiting" value={stats.waiting} />
        <StatTile label="Running" value={stats.running} />
        <StatTile label="Free slots" value={stats.free_slots} />
        <StatTile label="Total rejected" value={stats.total_rejected} />
        <StatTile label="Avg wait" value={formatMs(stats.avg_wait_ms)} />
      </section>

      {jobs.length === 0 ? (
        <EmptyState>The queue is idle — nothing waiting or running.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3 font-medium">Workflow</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Wait</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.execution_id} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">{j.position}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={j.state} />
                  </td>
                  <td className="px-4 py-3">{j.workflow_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{j.user_email || j.user_id}</td>
                  <td className="px-4 py-3 text-muted-foreground">{j.source}</td>
                  <td className="px-4 py-3">{formatMs(j.waited_ms)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDateTime(j.started_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-red-300"
                      disabled={cancel.isPending && pendingId === j.execution_id}
                      onClick={() => {
                        setPendingId(j.execution_id)
                        cancel.mutate(j.execution_id, { onSettled: () => setPendingId(null) })
                      }}
                    >
                      Cancel
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
