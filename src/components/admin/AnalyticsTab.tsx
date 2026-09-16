"use client"

import { useState } from "react"
import { useAdminAnalytics } from "@/lib/hooks"
import { EmptyState, StatTile } from "./utils"

const RANGES = [7, 30, 90]

// The API only returns days that saw traffic. Rendering those alone would
// stretch a single busy day across the whole chart and hide the quiet ones, so
// the series is densified over the requested window. Days are UTC, matching
// how the backend buckets them.
function densify(rows: { day: string; views: number; sessions: number }[], days: number) {
  const byDay = new Map(rows.map((r) => [r.day, r]))
  const out: { day: string; views: number; sessions: number }[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i))
    const key = d.toISOString().slice(0, 10)
    out.push(byDay.get(key) ?? { day: key, views: 0, sessions: 0 })
  }
  return out
}

function BarChart({ rows, days }: { rows: { day: string; views: number; sessions: number }[]; days: number }) {
  const series = densify(rows, days)
  const max = Math.max(1, ...series.map((r) => r.views))
  return (
    <div>
      <div className="flex h-40 items-end gap-[2px]">
        {series.map((r) => (
          <div
            key={r.day}
            className="group flex h-full flex-1 items-end"
            title={`${r.day}: ${r.views} views, ${r.sessions} sessions`}
          >
            <div
              className={
                r.views > 0
                  ? "w-full rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                  : "w-full rounded-t bg-white/[0.06]"
              }
              style={{ height: r.views > 0 ? `${Math.max(3, (r.views / max) * 100)}%` : "2px" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>{series[0]?.day}</span>
        <span>peak {max} view{max === 1 ? "" : "s"}/day</span>
        <span>{series[series.length - 1]?.day}</span>
      </div>
    </div>
  )
}

function CountTable({ title, rows, labelHeader }: { title: string; rows: { label: string; views: number; unique: number }[]; labelHeader: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-card p-5">
      <div className="text-sm font-semibold">{title}</div>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">No data yet.</p>
      ) : (
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="pb-2 font-medium">{labelHeader}</th>
              <th className="pb-2 font-medium">Views</th>
              <th className="pb-2 font-medium">Unique</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-white/[0.04]">
                <td className="max-w-[240px] truncate py-1.5 pr-2" title={r.label}>
                  {r.label}
                </td>
                <td className="py-1.5">{r.views}</td>
                <td className="py-1.5 text-muted-foreground">{r.unique}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export function AnalyticsTab() {
  const [days, setDays] = useState(30)
  const { data, isLoading } = useAdminAnalytics(days)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {RANGES.map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              days === d ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data.enabled ? (
        <EmptyState>
          Analytics is disabled. Enable it in the Settings tab to start collecting page views (retention: {data.retention_days} days).
        </EmptyState>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile label="Views" value={data.totals.views} />
            <StatTile label="Unique sessions" value={data.totals.unique_sessions} />
            <StatTile label="Signed-in users" value={data.totals.signed_in_users} />
          </section>

          <section className="rounded-xl border border-white/[0.08] bg-card p-5">
            <div className="text-sm font-semibold">Visits over time</div>
            {data.by_day.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">No visits recorded in this range.</p>
            ) : (
              <div className="mt-4">
                <BarChart rows={data.by_day} days={data.days} />
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <CountTable title="Most visited pages" rows={data.top_pages} labelHeader="Path" />
            <CountTable title="Top referrers" rows={data.top_referrers} labelHeader="Referrer" />
            <CountTable title="Devices" rows={data.top_devices} labelHeader="Device" />
          </section>
        </>
      )}
    </div>
  )
}
