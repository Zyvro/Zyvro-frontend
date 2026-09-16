"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAdminModels, useAdminOverview, useAdminSettings, useUpdateAdminSettings } from "@/lib/hooks"
import { api, type AppSettings, type EffectiveModels, type ModelOption } from "@/lib/api"
import { qk } from "@/lib/qk"
import { fmtDateTime, Toggle } from "./utils"

type NumField =
  | "max_concurrent_executions"
  | "max_queue_depth"
  | "execution_timeout_seconds"
  | "analytics_retention_days"
  | "login_attempt_limit"
  | "signup_limit"
  | "auth_window_seconds"

// Which card a numeric field is rendered in. Validation and the save payload
// are driven off one list, so a new field only has to be declared once.
type NumGroup = "limits" | "auth"
type BoolField = "analytics_enabled" | "signups_enabled"
type ModelField = "llm_model" | "small_model" | "image_model" | "vision_model"
type CatalogKey = "chat" | "image" | "vision"
// Free-text overrides with no catalog behind them: the live model list only
// covers Ollama and Google, so Anthropic/OpenAI model ids and the default
// text provider are always plain fields, not pickers.
type TextField = "text_provider" | "anthropic_model" | "openai_model"

const TEXT_PROVIDER_OPTIONS: { value: string; label: string }[] = [
  { value: "ollama", label: "Ollama" },
  { value: "anthropic", label: "Claude (Anthropic)" },
  { value: "openai", label: "OpenAI" },
]

const NUM_FIELDS: { key: NumField; group: NumGroup; label: string; min: number; max: number; hint?: string }[] = [
  {
    key: "max_concurrent_executions",
    group: "limits",
    label: "Max concurrent executions",
    min: 1,
    max: 64,
    hint: "Changes apply live to the running queue — no restart required.",
  },
  { key: "max_queue_depth", group: "limits", label: "Max queue depth", min: 1, max: 10000 },
  { key: "execution_timeout_seconds", group: "limits", label: "Execution timeout (seconds)", min: 30, max: 7200 },
  { key: "analytics_retention_days", group: "limits", label: "Analytics retention (days)", min: 1, max: 3650 },
  {
    key: "login_attempt_limit",
    group: "auth",
    label: "Failed sign-ins per address",
    min: 1,
    max: 1000,
    hint: "Only failures count. A correct password gives its slot straight back, so nobody is locked out of their own account.",
  },
  {
    key: "signup_limit",
    group: "auth",
    label: "Accounts created per address",
    min: 1,
    max: 1000,
    hint: "Every attempt counts, successful or not.",
  },
  { key: "auth_window_seconds", group: "auth", label: "Window (seconds)", min: 60, max: 86400 },
]

// The backend fetches the chat catalog from Ollama and the image/vision
// catalogs from Google AI Studio; a fetch failure lands in errors under that
// provider key, not the catalog key, so this maps one to the other.
const MODEL_FIELDS: {
  key: ModelField
  label: string
  hint: string
  catalog: CatalogKey
  effective: keyof EffectiveModels
}[] = [
  { key: "llm_model", label: "LLM model", hint: "Powers text nodes and the Brain agent.", catalog: "chat", effective: "llm" },
  {
    key: "small_model",
    label: "Small model",
    hint: "Writes free descriptions in the publish dialog.",
    catalog: "chat",
    effective: "small",
  },
  { key: "image_model", label: "Image model", hint: "Generates and edits images.", catalog: "image", effective: "image" },
  { key: "vision_model", label: "Vision model", hint: "Backs the vision/judge node.", catalog: "vision", effective: "vision" },
]

const CATALOG_PROVIDER_LABEL: Record<CatalogKey, string> = {
  chat: "Ollama",
  image: "Google AI Studio",
  vision: "Google AI Studio",
}
const CATALOG_ERROR_KEY: Record<CatalogKey, string> = { chat: "ollama", image: "google", vision: "google" }

const AI_HELPER_WINDOW_MIN = 30
const AI_HELPER_WINDOW_MAX = 86400

function isValid(raw: string | undefined, fallback: number, min: number, max: number): boolean {
  const s = raw ?? String(fallback)
  if (s.trim() === "") return false
  const n = Number(s)
  return Number.isInteger(n) && n >= min && n <= max
}

function fmtMinutes(seconds: number): string {
  const s = Math.round(seconds)
  if (!Number.isFinite(s) || s <= 0) return "0 min"
  const minutes = s / 60
  const rounded = Math.round(minutes * 10) / 10
  return `${rounded} min`
}

// Builds the <option> list for a model picker: every catalog entry, plus the
// currently stored value if the catalog doesn't contain it (retired model, or
// the catalog fetch failed) — otherwise saving would silently drop it.
function modelOptions(list: ModelOption[] | null | undefined, current: string): { value: string; label: string }[] {
  const opts = (list ?? []).map((m) => ({ value: m.id, label: m.id }))
  if (current !== "" && !opts.some((o) => o.value === current)) {
    opts.push({ value: current, label: `${current} (not in catalog)` })
  }
  return opts
}

export function SettingsTab() {
  const { data, isLoading } = useAdminSettings()
  const { data: overview } = useAdminOverview()
  const { data: catalog, isLoading: catalogLoading } = useAdminModels()
  const update = useUpdateAdminSettings()
  const qc = useQueryClient()
  const [draftNum, setDraftNum] = useState<Partial<Record<NumField, string>>>({})
  const [draftBool, setDraftBool] = useState<Partial<Record<BoolField, boolean>>>({})
  const [draftModel, setDraftModel] = useState<Partial<Record<ModelField, string>>>({})
  const [draftText, setDraftText] = useState<Partial<Record<TextField, string>>>({})
  const [draftWindow, setDraftWindow] = useState<string | undefined>(undefined)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  const windowValid = isValid(draftWindow, data.ai_helper_window_seconds, AI_HELPER_WINDOW_MIN, AI_HELPER_WINDOW_MAX)
  const anyInvalid = NUM_FIELDS.some((f) => !isValid(draftNum[f.key], data[f.key], f.min, f.max)) || !windowValid

  const payload: Partial<AppSettings> = {}
  for (const f of NUM_FIELDS) {
    const raw = draftNum[f.key]
    if (raw === undefined) continue
    if (!isValid(raw, data[f.key], f.min, f.max)) continue
    const n = Number(raw)
    if (n !== data[f.key]) payload[f.key] = n
  }
  for (const key of ["analytics_enabled", "signups_enabled"] as BoolField[]) {
    const v = draftBool[key]
    if (v === undefined) continue
    if (v !== data[key]) payload[key] = v
  }
  for (const f of MODEL_FIELDS) {
    const raw = draftModel[f.key]
    if (raw === undefined) continue
    const v = raw.trim()
    if (v !== data[f.key]) payload[f.key] = v
  }
  for (const key of ["text_provider", "anthropic_model", "openai_model"] as TextField[]) {
    const raw = draftText[key]
    if (raw === undefined) continue
    const v = raw.trim()
    if (v !== data[key]) payload[key] = v
  }
  if (draftWindow !== undefined && windowValid) {
    const n = Number(draftWindow)
    if (n !== data.ai_helper_window_seconds) payload.ai_helper_window_seconds = n
  }

  const hasChanges = Object.keys(payload).length > 0
  const canSave = hasChanges && !anyInvalid && !update.isPending

  function save() {
    setSaveError(null)
    update.mutate(payload, {
      onSuccess: () => {
        setDraftNum({})
        setDraftBool({})
        setDraftModel({})
        setDraftText({})
        setDraftWindow(undefined)
        setSavedAt(Date.now())
      },
      onError: (err) => setSaveError(err instanceof Error ? err.message : "Failed to save settings"),
    })
  }

  function refreshCatalog() {
    setRefreshing(true)
    setRefreshError(null)
    api
      .adminModels(true)
      .then((fresh) => qc.setQueryData(qk.adminModels(), fresh))
      .catch((err) => setRefreshError(err instanceof Error ? err.message : "Failed to refresh catalogs"))
      .finally(() => setRefreshing(false))
  }

  return (
    <div className="max-w-2xl space-y-8">
      <section className="space-y-5 rounded-xl border border-white/[0.08] bg-card p-5">
        <div className="text-sm font-semibold">Execution limits</div>
        {NUM_FIELDS.filter((f) => f.group === "limits").map((f) => {
          const raw = draftNum[f.key] ?? String(data[f.key])
          const valid = isValid(raw, data[f.key], f.min, f.max)
          return (
            <div key={f.key}>
              <label className="mb-1.5 block text-xs text-muted-foreground">
                {f.label}{" "}
                <span className="text-muted-foreground/60">
                  ({f.min}–{f.max})
                </span>
              </label>
              <Input
                type="number"
                min={f.min}
                max={f.max}
                value={raw}
                onChange={(e) => setDraftNum((d) => ({ ...d, [f.key]: e.target.value }))}
                className={!valid ? "border-red-400/60 focus-visible:border-red-400" : undefined}
              />
              {f.hint && <p className="mt-1 text-[11px] text-muted-foreground">{f.hint}</p>}
              {!valid && (
                <p className="mt-1 text-[11px] text-red-300">
                  Must be a whole number between {f.min} and {f.max}.
                </p>
              )}
            </div>
          )
        })}
      </section>

      <section className="space-y-5 rounded-xl border border-white/[0.08] bg-card p-5">
        <div>
          <div className="text-sm font-semibold">Models</div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Override which model backs each job. Leave a picker on the deployment default unless you have a reason to pin
            it.
          </p>
        </div>
        {MODEL_FIELDS.map((f) => {
          const value = draftModel[f.key] ?? data[f.key]
          const list = catalog?.[f.catalog]
          const errorMsg = catalog?.errors?.[CATALOG_ERROR_KEY[f.catalog]]
          const unavailable = !catalogLoading && (!list || list.length === 0) && !!errorMsg
          const effectiveValue = overview?.effective_models[f.effective]
          const defaultLabel = effectiveValue ? `Deployment default (${effectiveValue})` : "Deployment default"
          return (
            <div key={f.key}>
              <label className="mb-1.5 block text-xs text-muted-foreground">{f.label}</label>
              {unavailable ? (
                <Input
                  value={value}
                  placeholder="Deployment default"
                  onChange={(e) => setDraftModel((d) => ({ ...d, [f.key]: e.target.value }))}
                />
              ) : (
                <select
                  value={value}
                  onChange={(e) => setDraftModel((d) => ({ ...d, [f.key]: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm hover:border-white/20 focus-visible:outline-none focus-visible:border-primary/70"
                >
                  <option value="" className="bg-background">
                    {defaultLabel}
                  </option>
                  {modelOptions(list, data[f.key]).map((o) => (
                    <option key={o.value} value={o.value} className="bg-background">
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">{f.hint}</p>
              {unavailable && (
                <p className="mt-1 text-[11px] text-amber-300">
                  {CATALOG_PROVIDER_LABEL[f.catalog]} catalog unavailable: {errorMsg}
                </p>
              )}
            </div>
          )
        })}
        <div className="border-t border-white/[0.06] pt-4">
          <label className="mb-1.5 block text-xs text-muted-foreground">Default text provider</label>
          <select
            value={draftText.text_provider ?? data.text_provider}
            onChange={(e) => setDraftText((d) => ({ ...d, text_provider: e.target.value }))}
            className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm hover:border-white/20 focus-visible:outline-none focus-visible:border-primary/70"
          >
            <option value="" className="bg-background">
              {overview?.effective_models.text_provider
                ? `Deployment default (${overview.effective_models.text_provider})`
                : "Deployment default"}
            </option>
            {TEXT_PROVIDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-background">
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            The provider text nodes and the Brain agent use when a node names none. Ollama, Claude and OpenAI are
            alternatives — a node can still ask for a different one in its own config.
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-muted-foreground">Anthropic model</label>
          <Input
            value={draftText.anthropic_model ?? data.anthropic_model}
            placeholder={overview?.effective_models.anthropic || "Deployment default"}
            onChange={(e) => setDraftText((d) => ({ ...d, anthropic_model: e.target.value }))}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">Model id override for Claude. Free text: the live catalog only covers Ollama and Google.</p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-muted-foreground">OpenAI model</label>
          <Input
            value={draftText.openai_model ?? data.openai_model}
            placeholder={overview?.effective_models.openai || "Deployment default"}
            onChange={(e) => setDraftText((d) => ({ ...d, openai_model: e.target.value }))}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">Model id override for OpenAI. Free text: the live catalog only covers Ollama and Google.</p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-muted-foreground">
            AI helper cooldown (seconds){" "}
            <span className="text-muted-foreground/60">
              ({AI_HELPER_WINDOW_MIN}–{AI_HELPER_WINDOW_MAX})
            </span>
          </label>
          <Input
            type="number"
            min={AI_HELPER_WINDOW_MIN}
            max={AI_HELPER_WINDOW_MAX}
            value={draftWindow ?? String(data.ai_helper_window_seconds)}
            onChange={(e) => setDraftWindow(e.target.value)}
            className={!windowValid ? "border-red-400/60 focus-visible:border-red-400" : undefined}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Minimum time between free description-writer calls in the publish dialog (
            {fmtMinutes(Number(draftWindow ?? data.ai_helper_window_seconds) || 0)}).
          </p>
          {!windowValid && (
            <p className="mt-1 text-[11px] text-red-300">
              Must be a whole number between {AI_HELPER_WINDOW_MIN} and {AI_HELPER_WINDOW_MAX} seconds.
            </p>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
          <p className="text-[11px] text-muted-foreground">
            Chat models from Ollama · image and vision models from Google AI Studio. Catalogs are cached for 10 minutes.
          </p>
          <Button variant="outline" size="sm" onClick={refreshCatalog} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh catalogs"}
          </Button>
        </div>
        {refreshError && <p className="text-[11px] text-red-300">{refreshError}</p>}
      </section>

      <section className="space-y-5 rounded-xl border border-white/[0.08] bg-card p-5">
        <div>
          <div className="text-sm font-semibold">Sign-in protection</div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Anti-flood on the authentication routes, counted per address over one window.
          </p>
        </div>
        {NUM_FIELDS.filter((f) => f.group === "auth").map((f) => {
          const raw = draftNum[f.key] ?? String(data[f.key])
          const valid = isValid(raw, data[f.key], f.min, f.max)
          return (
            <div key={f.key}>
              <label className="mb-1.5 block text-xs text-muted-foreground">
                {f.label}{" "}
                <span className="text-muted-foreground/60">
                  ({f.min}-{f.max})
                </span>
              </label>
              <Input
                type="number"
                min={f.min}
                max={f.max}
                value={raw}
                onChange={(e) => setDraftNum((d) => ({ ...d, [f.key]: e.target.value }))}
                className={!valid ? "border-red-400/60 focus-visible:border-red-400" : undefined}
              />
              {f.hint && <p className="mt-1 text-[11px] text-muted-foreground">{f.hint}</p>}
              {!valid && (
                <p className="mt-1 text-[11px] text-red-300">
                  Must be a whole number between {f.min} and {f.max}.
                </p>
              )}
            </div>
          )
        })}
      </section>

      <section className="space-y-4 rounded-xl border border-white/[0.08] bg-card p-5">
        <div className="text-sm font-semibold">Access & analytics</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm">Signups enabled</div>
            <p className="text-[11px] text-muted-foreground">Allow new accounts to be created from the signup page.</p>
          </div>
          <Toggle
            label="Signups enabled"
            checked={draftBool.signups_enabled ?? data.signups_enabled}
            onChange={(v) => setDraftBool((d) => ({ ...d, signups_enabled: v }))}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm">Analytics enabled</div>
            <p className="text-[11px] text-muted-foreground">Collect page-view analytics used by the Analytics tab.</p>
          </div>
          <Toggle
            label="Analytics enabled"
            checked={draftBool.analytics_enabled ?? data.analytics_enabled}
            onChange={(v) => setDraftBool((d) => ({ ...d, analytics_enabled: v }))}
          />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={!canSave}>
          Save
        </Button>
        {savedAt && !hasChanges && <span className="text-xs text-emerald-400">Saved.</span>}
        {saveError && <span className="text-xs text-red-300">{saveError}</span>}
        <span className="ml-auto text-[11px] text-muted-foreground">
          Last updated {fmtDateTime(data.updated_at)}
          {data.updated_by ? ` by ${data.updated_by}` : ""}
        </span>
      </div>
    </div>
  )
}
