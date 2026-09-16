"use client"

import { useAdminOverview } from "@/lib/hooks"
import { formatMs, Gauge, pct, StatTile, StatusBadge } from "./utils"

export function OverviewTab() {
  const { data, isLoading } = useAdminOverview()

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  const statuses = Object.entries(data.counts.executions_by_status).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-white/[0.08] bg-card p-5">
        <div className="text-sm font-semibold">Live queue</div>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Gauge label="Running" value={data.queue.running} max={data.queue.max_concurrent} />
          <Gauge label="Waiting" value={data.queue.waiting} max={data.queue.max_queue_depth} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Users" value={data.counts.users} hint={`${data.counts.admins} admin${data.counts.admins === 1 ? "" : "s"}`} />
        <StatTile label="Workflows" value={data.counts.workflows} />
        <StatTile label="Executions" value={data.counts.executions} />
        <StatTile label="Executions (24h)" value={data.counts.executions_24h} />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/[0.08] bg-card p-5">
          <div className="text-sm font-semibold">Execution status breakdown</div>
          {statuses.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No executions yet.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {statuses.map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <StatusBadge status={status} />
                  <span className="text-foreground">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-card p-5">
          <div className="text-sm font-semibold">Last 24 hours</div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Avg run duration</div>
              <div className="mt-0.5 font-medium">{formatMs(data.executions_24h.avg_ms)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Max run duration</div>
              <div className="mt-0.5 font-medium">{formatMs(data.executions_24h.max_ms)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Failure rate</div>
              <div className={`mt-0.5 font-medium ${data.executions_24h.fail_rate > 0.1 ? "text-red-300" : ""}`}>
                {pct(data.executions_24h.fail_rate)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Visits (24h)</div>
              <div className="mt-0.5 font-medium">
                {data.visits_24h.views} views · {data.visits_24h.unique_sessions} sessions · {data.visits_24h.signed_in_users} signed in
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
