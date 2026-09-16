"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { BarChart3, Gauge, ListOrdered, Settings2, ShieldAlert, SlidersHorizontal, Users } from "lucide-react"
import { AppShell } from "@/components/AppShell"
import { useMe } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { OverviewTab } from "@/components/admin/OverviewTab"
import { QueueTab } from "@/components/admin/QueueTab"
import { SettingsTab } from "@/components/admin/SettingsTab"
import { UsersTab } from "@/components/admin/UsersTab"
import { ExecutionsTab } from "@/components/admin/ExecutionsTab"
import { AnalyticsTab } from "@/components/admin/AnalyticsTab"

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

const TABS = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "queue", label: "Queue", icon: ListOrdered },
  { id: "settings", label: "Settings", icon: SlidersHorizontal },
  { id: "users", label: "Users", icon: Users },
  { id: "executions", label: "Executions", icon: Settings2 },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
] as const

type TabId = (typeof TABS)[number]["id"]

function AdminPanel() {
  const [tab, setTab] = useState<TabId>("overview")

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Operate the queue, tune runtime limits, and manage users and analytics.</p>
      </section>

      <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] pb-px" role="tablist" aria-label="Admin sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex flex-none items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
              tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "overview" && <OverviewTab />}
        {tab === "queue" && <QueueTab />}
        {tab === "settings" && <SettingsTab />}
        {tab === "users" && <UsersTab />}
        {tab === "executions" && <ExecutionsTab />}
        {tab === "analytics" && <AnalyticsTab />}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const { data: me, isLoading } = useMe()

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>
  }

  if (!me) {
    return <AuthRedirect />
  }

  if (!me.is_admin) {
    return (
      <AppShell wide>
        <div className="mx-auto max-w-md rounded-xl border border-white/[0.08] bg-card p-8 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-3 text-lg font-semibold">Administrator access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">This page is restricted to workspace administrators.</p>
          <Link href="/dashboard" className="mt-5 inline-block text-sm text-primary underline underline-offset-2">
            Back to dashboard
          </Link>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell wide>
      <AdminPanel />
    </AppShell>
  )
}
