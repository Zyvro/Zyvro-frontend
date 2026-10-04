"use client"

import { useState } from "react"
import { Download, FileText, Loader2, X } from "lucide-react"
import { api, type AdminBugReport } from "@/lib/api"
import { useAdminBugReport, useAdminBugReports } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { EmptyState, fmtDateTime, timeAgo } from "./utils"

// Les rapports envoyés par le bouton bug de Zyvro Studio.
//
// La liste dit qui, quand, sur quelle version, et ce que la personne a écrit.
// Ouvrir un rapport charge son état — les conversations à l'écran, les tours
// que le processus principal tenait, le journal des erreurs — et le résume :
// ce qu'on cherche d'abord dans un rapport « bloqué sur Writing… », c'est un
// tour que l'écran croit en cours et que le principal ne tient plus, ou
// l'inverse. Le rapport complet se télécharge en JSON, le journal en texte.

const LIMITS = [50, 100, 250, 500]

type Incident = { at: number; source: string; message: string }
type Snapshot = {
  app?: Record<string, unknown>
  incidents?: Incident[]
  trimmed?: boolean
  main?: { turns?: MainTurn[]; windows?: unknown[] }
  renderer?: {
    root?: string | null
    permission?: string
    chat?: {
      activeId?: string
      threads?: SnapThread[]
      turnToMessage?: { turnId: string; threadId: string; messageId: string }[]
    }
  }
}
type MainTurn = {
  id: string
  conversationId: string
  kind: string
  ageSeconds?: number
  process?: { pid: number | null; exitCode: number | null; signalCode: string | null; killed: boolean }
  lines?: string[]
}
type SnapThread = { id: string; title: string; kind: string; turnId: string | null; busy: boolean; messages?: { streaming: boolean }[] }

function sizeOf(bytes: number): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1 << 20) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1 << 20)).toFixed(1)} MB`
}

function save(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function incidentLog(incidents: Incident[]): string {
  return incidents.map((i) => `${new Date(i.at).toISOString()}  [${i.source}]  ${i.message}`).join("\n") + "\n"
}

// downloadReport : le rapport entier, état compris, tel que le serveur le
// garde — de quoi le relire hors de cette page ou le passer à quelqu'un.
async function downloadReport(id: string): Promise<void> {
  const full = await api.adminBugReport(id)
  save(`${id}.json`, JSON.stringify(full, null, 2), "application/json")
}

function KindBadge({ kind }: { kind: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        kind === "crash" ? "bg-red-400/15 text-red-300" : "bg-white/10 text-muted-foreground"
      )}
      title={kind === "crash" ? "Sent while errors were recorded in the app" : "Sent from the bug button"}
    >
      {kind}
    </span>
  )
}

export function BugReportsTab() {
  const [limit, setLimit] = useState(100)
  const [open, setOpen] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { data, isLoading } = useAdminBugReports(limit)

  const download = async (id: string) => {
    setDownloading(id)
    setError(null)
    try {
      await downloadReport(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="h-9 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm hover:border-white/20 focus-visible:outline-none focus-visible:border-primary/70"
        >
          {LIMITS.map((l) => (
            <option key={l} value={l} className="bg-background">
              {l} newest
            </option>
          ))}
        </select>
        {data && <span className="text-xs text-muted-foreground">{data.reports.length} shown</span>}
        {error && <span className="text-xs text-red-300">{error}</span>}
      </div>

      {open && <ReportDetail id={open} onClose={() => setOpen(null)} onDownload={() => void download(open)} downloading={downloading === open} />}

      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.reports.length === 0 ? (
        <EmptyState>No bug report yet. They arrive from the bug button in Zyvro Studio&apos;s agent panel.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-card">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Received</th>
                <th className="px-4 py-3 font-medium">Kind</th>
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data.reports.map((r: AdminBugReport) => (
                <tr
                  key={r.id}
                  className={cn("border-b border-white/[0.04] last:border-0", open === r.id && "bg-white/[0.03]")}
                >
                  <td className="px-4 py-3 text-muted-foreground" title={r.created_at}>
                    {fmtDateTime(r.created_at)}
                    <div className="text-[11px]">{timeAgo(r.created_at)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <KindBadge kind={r.kind} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.user_email || (r.user_id ? r.user_id : "signed out")}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.app_version || "—"}
                    <div className="text-[11px]">{r.platform}</div>
                  </td>
                  <td className="max-w-[340px] px-4 py-3">
                    <button type="button" onClick={() => setOpen(r.id)} className="line-clamp-2 text-left hover:text-primary">
                      {r.description || <span className="italic text-muted-foreground">No description</span>}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{sizeOf(r.state_bytes)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setOpen(r.id)}
                        className="rounded-md border border-white/10 px-2 py-1 text-xs hover:bg-white/[0.06]"
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => void download(r.id)}
                        disabled={downloading === r.id}
                        title="Download the complete report (JSON)"
                        className="rounded-md border border-white/10 p-1.5 hover:bg-white/[0.06] disabled:opacity-50"
                      >
                        {downloading === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      </button>
                    </div>
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

function ReportDetail({ id, onClose, onDownload, downloading }: { id: string; onClose: () => void; onDownload: () => void; downloading: boolean }) {
  const { data, isLoading, error } = useAdminBugReport(id)
  const [raw, setRaw] = useState(false)
  const state = (data?.state ?? null) as Snapshot | null
  const report = data?.report
  const incidents = state?.incidents ?? []
  const threads = state?.renderer?.chat?.threads ?? []
  const turns = state?.main?.turns ?? []
  const rawText = raw && state ? JSON.stringify(state, null, 2) : ""

  return (
    <div className="space-y-4 rounded-xl border border-white/[0.08] bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-sm">{id}</h2>
            {report && <KindBadge kind={report.kind} />}
          </div>
          {report && (
            <p className="mt-1 text-xs text-muted-foreground">
              {fmtDateTime(report.created_at)} · {report.user_email || report.user_id || "signed out"} · {report.app_version} · {report.platform}
              {state?.trimmed ? " · state trimmed to fit" : ""}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => save(`${id}-errors.txt`, incidentLog(incidents), "text/plain")}
            disabled={incidents.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs hover:bg-white/[0.06] disabled:opacity-40"
          >
            <FileText className="h-3.5 w-3.5" />
            Error log
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download report
          </button>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading the report…</p>
      ) : error ? (
        <p className="text-sm text-red-300">{error instanceof Error ? error.message : String(error)}</p>
      ) : (
        <>
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm">{report?.description || <span className="italic text-muted-foreground">No description</span>}</p>
          </section>

          <section>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Conversations on screen ({threads.length})</h3>
            {threads.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">None.</p>
            ) : (
              <ul className="mt-1 space-y-1 text-sm">
                {threads.map((t) => {
                  const streaming = t.messages?.filter((m) => m.streaming).length ?? 0
                  const held = t.turnId ? turns.some((turn) => turn.id === t.turnId) : false
                  return (
                    <li key={t.id} className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{t.title}</span>
                      <span className="text-xs text-muted-foreground">{t.kind}</span>
                      {t.busy && <span className="rounded bg-amber-400/15 px-1.5 text-[11px] text-amber-300">busy</span>}
                      {streaming > 0 && <span className="rounded bg-sky-400/15 px-1.5 text-[11px] text-sky-300">streaming ×{streaming}</span>}
                      <span className="font-mono text-[11px] text-muted-foreground">turn {t.turnId ?? "none"}</span>
                      {/* Ce qui fait un « Writing… » éternel : l'écran croit un tour
                          que le principal ne tient pas. */}
                      {(t.busy || streaming > 0) && !held && (
                        <span className="rounded bg-red-400/15 px-1.5 text-[11px] text-red-300">not held by the main process</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Agent turns held by the main process ({turns.length})</h3>
            {turns.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">None.</p>
            ) : (
              <div className="mt-1 space-y-2">
                {turns.map((turn) => (
                  <details key={turn.id} className="rounded-lg border border-white/[0.06] p-2 text-sm">
                    <summary className="cursor-pointer">
                      <span className="font-mono text-xs">{turn.id}</span> · {turn.kind} · {turn.ageSeconds ?? "?"}s · pid {turn.process?.pid ?? "—"} · exit{" "}
                      {turn.process?.exitCode ?? turn.process?.signalCode ?? "—"}
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-black/30 p-2 font-mono text-[11px]">
                      {(turn.lines ?? []).join("\n") || "No output."}
                    </pre>
                  </details>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Error log ({incidents.length})</h3>
            {incidents.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">No error recorded.</p>
            ) : (
              <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded bg-black/30 p-2 font-mono text-[11px] leading-relaxed">
                {incidentLog(incidents.slice(-100))}
              </pre>
            )}
          </section>

          <section>
            <button type="button" onClick={() => setRaw((r) => !r)} className="text-xs text-primary underline underline-offset-2">
              {raw ? "Hide the raw state" : "Show the raw state"}
            </button>
            {raw && (
              <pre className="mt-2 max-h-[480px] overflow-auto rounded bg-black/30 p-2 font-mono text-[11px]">
                {rawText.length > 300_000 ? `${rawText.slice(0, 300_000)}\n… (truncated here — download the report for all of it)` : rawText}
              </pre>
            )}
          </section>
        </>
      )}
    </div>
  )
}
