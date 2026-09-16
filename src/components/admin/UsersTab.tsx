"use client"

import { Fragment, useState } from "react"
import { ApiError } from "@/lib/api"
import type { AdminUser } from "@/lib/api"
import { useAdminUpdateUser, useAdminUsers } from "@/lib/hooks"
import { fmtDate, Toggle } from "./utils"

export function UsersTab() {
  const { data: users, isLoading } = useAdminUsers()
  const update = useAdminUpdateUser()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pendingId, setPendingId] = useState<string | null>(null)

  if (isLoading || !users) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  function change(u: AdminUser, patch: { is_admin?: boolean; disabled?: boolean }) {
    setErrors((e) => ({ ...e, [u.id]: "" }))
    setPendingId(u.id)
    update.mutate(
      { id: u.id, ...patch },
      {
        onError: (err) => {
          const message = err instanceof ApiError ? err.message : "Failed to update user."
          setErrors((e) => ({ ...e, [u.id]: message }))
        },
        onSettled: () => setPendingId(null),
      }
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-card">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium">Workflows</th>
            <th className="px-4 py-3 font-medium">Executions</th>
            <th className="px-4 py-3 font-medium">Admin</th>
            <th className="px-4 py-3 font-medium">Disabled</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <Fragment key={u.id}>
              <tr className="border-b border-white/[0.04] last:border-0">
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.name || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{fmtDate(u.created_at)}</td>
                <td className="px-4 py-3">{u.workflows}</td>
                <td className="px-4 py-3">{u.executions}</td>
                <td className="px-4 py-3">
                  <Toggle
                    label={`Admin for ${u.email}`}
                    checked={u.is_admin}
                    disabled={pendingId === u.id}
                    onChange={(v) => change(u, { is_admin: v })}
                  />
                </td>
                <td className="px-4 py-3">
                  <Toggle
                    label={`Disabled for ${u.email}`}
                    checked={u.disabled}
                    disabled={pendingId === u.id}
                    onChange={(v) => change(u, { disabled: v })}
                  />
                </td>
              </tr>
              {errors[u.id] && (
                <tr className="border-b border-white/[0.04] last:border-0 bg-red-500/5">
                  <td colSpan={7} className="px-4 py-2 text-xs text-red-300">
                    {errors[u.id]}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
