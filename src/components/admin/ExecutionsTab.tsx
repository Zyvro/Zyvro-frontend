"use client"

import { useState } from "react"
import { useAdminExecutions } from "@/lib/hooks"
import { EmptyState, formatMs, fmtDateTime, StatusBadge, truncateId } from "./utils"

const STATUSES = ["all", "queued", "running", "completed", "failed", "cancelled"]
const LIMITS = [25, 50, 100, 250]

function durationMs(startedAt?: string, finishedAt?: string): number | null {
  if (!startedAt || !finishedAt) return null
  const d = new Date(finishedAt).getTime() - new Date(startedAt).getTime()
  return Number.isFinite(d) ? d : null
}

export function ExecutionsTab() {
  const [status, setStatus] = useState("all")
  const [limit, setLimit] = useState(50)
  const { data, isLoading } = useAdminExecutions({ status: status === "all" ? undefined : status, limit })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm capitalize hover:border-white/20 focus-visible:outline-none focus-visible:border-primary/70"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s} className="bg-background capitalize">
              {s}
            </option>
          ))}
        </select>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="h-9 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm hover:border-white/20 focus-visible:outline-none focus-visible:border-primary/70"
        >
          {LIMITS.map((l) => (
            <option key={l} value={l} className="bg-background">
              {l} rows
            </option>
          ))}
        </select>
        {data && <span className="text-xs text-muted-foreground">{data.total} total</span>}
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.executions.length === 0 ? (
        <EmptyState>No executions match this filter.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-card">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Workflow</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {data.executions.map((ex) => (
                <tr key={ex.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground" title={ex.id}>
                    {truncateId(ex.id)}
                  </td>
                  <td className="px-4 py-3">{ex.workflow_name || truncateId(ex.workflow_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{ex.user_email || truncateId(ex.user_id)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={ex.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDateTime(ex.created_at)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatMs(durationMs(ex.started_at, ex.finished_at))}</td>
                  <td className="px-4 py-3 max-w-[220px] truncate text-red-300" title={ex.error}>
                    {ex.error || "—"}
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
