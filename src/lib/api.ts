export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4102"

// The backend stores media under relative /content/... URLs; resolve them
// against the API origin so <img src> hits the backend, not the frontend.
export function mediaUrl(path: string): string {
  if (/^(https?:|data:)/.test(path)) return path
  return `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`
}

export class ApiError extends Error {
  status: number
  // Structured failures carry a machine-readable code and a payload the UI can
  // act on, instead of a sentence the caller would have to parse.
  code?: string
  payload?: Record<string, unknown>
  constructor(message: string, status: number, body?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.code = typeof body?.code === "string" ? body.code : undefined
    this.payload = body
  }
}

// MISSING_PROVIDER_KEY is raised when a run needs a provider the user has not
// configured. Workflows always spend the owner's own provider account, so this
// is a normal first-run state, not a fault.
export const MISSING_PROVIDER_KEY = "missing_provider_key"

export type MissingProviderKeys = {
  error: string
  code: typeof MISSING_PROVIDER_KEY
  hint: string
  providers: ProviderInfo[]
}

// missingProviderKeys returns the payload when an error is that refusal.
export function missingProviderKeys(err: unknown): MissingProviderKeys | null {
  if (!(err instanceof ApiError) || err.code !== MISSING_PROVIDER_KEY) return null
  const p = err.payload as MissingProviderKeys | undefined
  if (!p || !Array.isArray(p.providers)) return null
  return p
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) {
    throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data)
  }
  return data as T
}

export const api = {
  signup: (email: string, password: string, name?: string) =>
    request<AuthUser>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    request<AuthUser>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  me: () => request<AuthUser>("/api/auth/me"),

  listWorkflows: () => request<Workflow[]>("/api/workflows"),
  listPublicWorkflows: () => request<WorkflowCard[]>("/api/workflows/public"),
  // Works signed out for public and unlisted workflows; private ones 404 for
  // anyone but their owner, so a stale link leaks nothing.
  getSharedWorkflow: (id: string) => request<SharedWorkflow>(`/api/workflows/${id}/shared`),
  getWorkflow: (id: string) => request<Workflow>(`/api/workflows/${id}`),
  createWorkflow: (name: string, graph?: unknown) =>
    request<Workflow>("/api/workflows", {
      method: "POST",
      body: JSON.stringify({ name, graph_json: graph ?? { nodes: [], edges: [] } }),
    }),
  updateWorkflow: (id: string, payload: { name?: string; graph_json?: unknown; description?: string; visibility?: string }) =>
    request<Workflow>(`/api/workflows/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteWorkflow: (id: string) => request<{ ok: boolean }>(`/api/workflows/${id}`, { method: "DELETE" }),
  duplicateWorkflow: (id: string) => request<Workflow>(`/api/workflows/${id}/duplicate`, { method: "POST" }),

  runExecution: (workflowId: string, inputs?: Record<string, unknown>, opts?: { useCache?: boolean; targetNodeId?: string }) =>
    request<{ execution_id: string; status: string; queue?: QueueInfo }>("/api/executions", {
      method: "POST",
      body: JSON.stringify({
        workflow_id: workflowId,
        inputs: inputs ?? {},
        ...(opts?.useCache === false ? { use_cache: false } : {}),
        ...(opts?.targetNodeId ? { target_node_id: opts.targetNodeId } : {}),
      }),
    }),
  getExecution: (id: string) => request<ExecutionResponse>(`/api/executions/${id}`),
  getLastExecution: (workflowId: string) =>
    request<ExecutionResponse | { execution: null; nodes: [] }>(`/api/workflows/${workflowId}/executions/last`),
  listWorkflowExecutions: (workflowId: string) =>
    request<Execution[]>(`/api/workflows/${workflowId}/executions`),

  listChats: () => request<Chat[]>("/api/chats"),
  createChat: (title?: string) =>
    request<Chat>("/api/chats", { method: "POST", body: JSON.stringify({ title: title ?? "" }) }),
  getChat: (id: string) => request<{ chat: Chat; messages: ChatMessage[] }>(`/api/chats/${id}`),
  deleteChat: (id: string) => request<{ ok: boolean }>(`/api/chats/${id}`, { method: "DELETE" }),
  sendChatMessage: (id: string, content: string) =>
    request<{ user: ChatMessage; assistant: ChatMessage }>(`/api/chats/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  // Free, platform-funded writing helper. Rate limited per account and per
  // address, so the caller must check the quota before offering the button.
  aiQuota: () => request<AiQuota>("/api/ai/quota"),
  describeWorkflow: (id: string, mode: "generate" | "synthesize", text?: string) =>
    request<DescribeResult>(`/api/workflows/${id}/describe`, {
      method: "POST",
      body: JSON.stringify({ mode, text: text ?? "" }),
    }),

  listProviders: () => request<ProviderInfo[]>("/api/providers"),
  listSecrets: () => request<ProviderSecret[]>("/api/secrets"),
  setSecret: (provider: string, secret: string) =>
    request<{ provider: string; secret_last4: string }>("/api/secrets", {
      method: "PUT",
      body: JSON.stringify({ provider, secret }),
    }),
  deleteSecret: (provider: string) => request<{ ok: boolean }>(`/api/secrets/${provider}`, { method: "DELETE" }),

  listApiKeys: () => request<ApiKey[]>("/api/keys"),
  createApiKey: (name: string) =>
    request<ApiKey & { key: string }>("/api/keys", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  renameApiKey: (id: string, name: string) =>
    request<{ id: string; name: string }>(`/api/keys/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  revokeApiKey: (id: string) => request<{ id: string; revoked: boolean }>(`/api/keys/${id}`, { method: "DELETE" }),

  // ---- analytics ingest ----
  // Never rejects: a tracking failure must not surface in the UI.
  trackPageView: (path: string, sessionId: string, referrer: string) =>
    fetch(`${API_URL}/api/track`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, session_id: sessionId, referrer }),
      keepalive: true,
    }).catch(() => undefined),

  // ---- administration ----
  adminOverview: () => request<AdminOverview>("/api/admin/overview"),
  adminGetSettings: () => request<AppSettings>("/api/admin/settings"),
  adminUpdateSettings: (payload: Partial<AppSettings>) =>
    request<AppSettings>("/api/admin/settings", { method: "PUT", body: JSON.stringify(payload) }),
  adminQueue: () => request<{ stats: QueueStats; jobs: QueueJob[] }>("/api/admin/queue"),
  adminCancelExecution: (id: string) =>
    request<{ ok: boolean; execution_id: string; status: string; was_running: boolean }>(`/api/admin/queue/${id}`, {
      method: "DELETE",
    }),
  adminUsers: () => request<AdminUser[]>("/api/admin/users"),
  adminUpdateUser: (id: string, payload: { is_admin?: boolean; disabled?: boolean }) =>
    request<AdminUser>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  adminExecutions: (params?: { status?: string; user_id?: string; workflow_id?: string; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.status) q.set("status", params.status)
    if (params?.user_id) q.set("user_id", params.user_id)
    if (params?.workflow_id) q.set("workflow_id", params.workflow_id)
    if (params?.limit) q.set("limit", String(params.limit))
    const qs = q.toString()
    return request<{ executions: AdminExecution[]; total: number; limit: number }>(
      `/api/admin/executions${qs ? `?${qs}` : ""}`
    )
  },
  adminWorkflows: () => request<AdminWorkflow[]>("/api/admin/workflows"),
  adminAnalytics: (days: number) => request<AnalyticsReport>(`/api/admin/analytics?days=${days}`),
  // The live catalogs from each provider, so the model pickers offer what is
  // actually available rather than a free-text field where a typo breaks runs.
  adminModels: (refresh?: boolean) => request<ModelCatalog>(`/api/admin/models${refresh ? "?refresh=1" : ""}`),
}

// ---- administration types ----

// RATE_LIMITED is the anti-flood refusal on the authentication routes.
// LOCAL_ONLY_NODE is raised when a hosted run contains a node that needs a
// project folder on the machine running the engine. It is not a fault: the
// workflow is fine, it is simply in the wrong place to run.
export const LOCAL_ONLY_NODE = "local_only_node"

export type LocalOnlyNodes = {
  error: string
  code: typeof LOCAL_ONLY_NODE
  hint: string
  nodes: string[]
}

export function localOnlyNodes(err: unknown): LocalOnlyNodes | null {
  if (!(err instanceof ApiError) || err.code !== LOCAL_ONLY_NODE) return null
  const p = err.payload as LocalOnlyNodes | undefined
  if (!p || !Array.isArray(p.nodes)) return null
  return p
}

export const RATE_LIMITED = "rate_limited"

export type AppSettings = {
  max_concurrent_executions: number
  max_queue_depth: number
  execution_timeout_seconds: number
  analytics_enabled: boolean
  analytics_retention_days: number
  signups_enabled: boolean
  // Model overrides. An empty string means "use the deployment's environment
  // default"; effective_models on the overview says what that resolves to.
  llm_model: string
  small_model: string
  image_model: string
  vision_model: string
  // Which provider text nodes (llm, brain) use when a node names none, and
  // model overrides for the two non-Ollama text providers. Empty strings mean
  // "use the deployment's environment default".
  text_provider: string
  anthropic_model: string
  openai_model: string
  ai_helper_window_seconds: number
  // Anti-flood on the authentication routes, counted per address.
  login_attempt_limit: number
  signup_limit: number
  auth_window_seconds: number
  updated_at: string
  updated_by: string
}

export type ModelOption = { id: string; provider: string; note?: string }

export type ModelCatalog = {
  chat: ModelOption[] | null
  image: ModelOption[] | null
  vision: ModelOption[] | null
  errors?: Record<string, string> | null
}

export type EffectiveModels = {
  llm: string
  small: string
  image: string
  vision: string
  anthropic: string
  openai: string
  text_provider: string
}

export type QueueStats = {
  waiting: number
  running: number
  max_concurrent: number
  max_queue_depth: number
  free_slots: number
  timeout_seconds: number
  total_started: number
  total_finished: number
  total_rejected: number
  total_canceled: number
  avg_wait_ms: number
}

export type QueueJob = {
  execution_id: string
  user_id: string
  user_email?: string
  workflow_id: string
  workflow_name: string
  source: string
  state: "waiting" | "running"
  position: number
  enqueued_at: string
  started_at?: string
  waited_ms: number
}

export type AdminOverview = {
  queue: QueueStats
  settings: AppSettings
  counts: {
    users: number
    admins: number
    workflows: number
    executions: number
    executions_24h: number
    executions_by_status: Record<string, number>
  }
  effective_models: EffectiveModels
  executions_24h: { count: number; avg_ms: number; max_ms: number; fail_rate: number }
  visits_24h: { views: number; unique_sessions: number; signed_in_users: number }
  server_time: string
}

export type AdminUser = {
  id: string
  email: string
  name: string
  is_admin: boolean
  disabled: boolean
  created_at: string
  workflows: number
  executions: number
}

export type AdminExecution = {
  id: string
  workflow_id: string
  workflow_name?: string
  user_id: string
  user_email?: string
  status: string
  error?: string
  created_at: string
  started_at?: string
  finished_at?: string
  queue_position: number
}

export type AdminWorkflow = {
  id: string
  name: string
  slug: string
  user_id: string
  user_email?: string
  visibility: string
  version: number
  updated_at: string
}

export type CountRow = { label: string; views: number; unique: number }
export type DayRow = { day: string; views: number; sessions: number }

export type AnalyticsReport = {
  days: number
  totals: { views: number; unique_sessions: number; signed_in_users: number }
  by_day: DayRow[]
  top_pages: CountRow[]
  top_referrers: CountRow[]
  top_devices: CountRow[]
  enabled: boolean
  retention_days: number
}

export type AuthUser = { id: string; email: string; name: string; is_admin?: boolean }

export type Workflow = {
  id: string
  user_id: string
  name: string
  slug: string
  description: string
  graph_json: string | Graph
  visibility: "private" | "unlisted" | "public"
  version: number
  duplicate_count: number
  preview?: WorkflowPreview | null
  created_at: string
  updated_at: string
}

// One real input/output pair captured from a finished run. It is what every
// card draws, so a listing shows what the workflow actually produces rather
// than an abstract picture of its graph.
export type WorkflowPreview = {
  kind: string
  input_kind: "text" | "image" | "none"
  output_kind: "text" | "image" | "none"
  input_text?: string
  input_image?: string
  output_text?: string
  output_image?: string
  execution_id: string
  captured_at: string
}

export type Graph = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  viewport?: { x: number; y: number; zoom: number }
}

export type GraphNode = {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label?: string
    config?: Record<string, unknown>
    [key: string]: unknown
  }
  [key: string]: unknown
}

export type GraphEdge = {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type?: string
}

export type ExecutionResponse = {
  execution: Execution
  nodes: NodeExecution[]
  queue?: QueueInfo
}

// Where a run sits in the shared execution queue.
// position: 1-based rank while waiting, 0 while running, -1 when unknown.
export type QueueInfo = {
  position: number
  waiting: number
  running: number
  max_concurrent: number
  max_depth: number
  avg_wait_ms: number
}

export type Execution = {
  id: string
  workflow_id: string
  status: "queued" | "running" | "completed" | "failed" | "cancelled"
  output_json?: string
  error?: string
  started_at?: string
  finished_at?: string
  created_at: string
}

export type NodeExecution = {
  id: string
  execution_id: string
  node_id: string
  node_type: string
  status: "queued" | "running" | "completed" | "cached" | "failed" | "cancelled"
  output_json?: string
  error?: string
  latency_ms?: number
  started_at?: string
  finished_at?: string
}

// A workflow as shown to someone browsing: the stored record plus who made it
// and how big it is.
export type WorkflowCard = Workflow & {
  author_name: string
  is_official: boolean
  node_count: number
  edge_count: number
  is_owner: boolean
}

export type SharedWorkflow = {
  workflow: WorkflowCard
  requires_account: boolean
  can_duplicate: boolean
}

export type AiQuota = {
  allowed: boolean
  retry_after_seconds: number
  window_seconds: number
}

export type DescribeResult = {
  description: string
  model: string
  quota: AiQuota
}

// One model provider in the BYOK panel. platform_key means this deployment
// already has a shared key, so a personal key is optional rather than required.
export type ProviderInfo = {
  id: string
  label: string
  purpose: string
  key_hint: string
  console_url: string
  // One-line instruction on how to obtain the credential, shown under the
  // input field. Present when getting a key isn't just "open the console".
  setup_hint?: string
  platform_key: boolean
  user_key_last4: string
  has_user_key: boolean
  // Providers sharing a role do the same job: the three "text" providers are
  // alternatives (holding a key for any one clears `required` on all three),
  // while the "image" provider stands alone.
  role: "text" | "image"
  // The text provider a node uses when it names none.
  is_default: boolean
  required: boolean
}

export type ProviderSecret = {
  id: string
  provider: string
  secret_last4: string
  updated_at: string
}

export type ApiKey = {
  id: string
  user_id: string
  name: string
  prefix: string
  last4: string
  raw_key?: string
  created_at: string
  last_used_at?: string
  revoked: boolean
  request_count: number
  node_runs: number
  usage?: UsageEvent[]
}

export type UsageEvent = {
  day: string
  requests: number
  node_runs: number
}
export type Chat = { id: string; user_id: string; title: string; created_at: string; updated_at: string }

export type ChatStep = {
  tool: string
  args?: string
  result?: string
  status: "running" | "success" | "error"
  execution_id?: string
  workflow_id?: string
  duration_ms?: number
}

export type ChatAttachment = { type: "image"; url: string; name?: string }

export type ChatMessage = {
  id: string
  chat_id: string
  role: "user" | "assistant"
  content: string
  status: "done" | "running" | "failed"
  steps?: ChatStep[] | null
  attachments?: ChatAttachment[] | null
  execution_id?: string
  error?: string
  created_at: string
  updated_at: string
}
