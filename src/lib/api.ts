import { deriveAuthHash, type KdfParams } from "./kdf"
import { API_URL } from "./origin"

export { API_URL }

// The backend stores media under relative /content/... URLs; resolve them
// against the API origin so <img src> hits the backend, not the frontend.
//
// The origin is a module-level constant here and a loopback port the desktop
// only learns when its engine starts, so the desktop installs a resolver that
// finishes the job. It is a hook rather than a second function because a second
// function is what went wrong: the desktop had one, no component called it —
// they all called this — and every image the engine produced rendered against
// port 0. One broken <img> per generated image, and nothing in the code looked
// wrong, because the fix existed. It just was not the one being used.
let resolveMediaOrigin: ((url: string) => string) | null = null

export function setMediaOriginResolver(resolve: (url: string) => string): void {
  resolveMediaOrigin = resolve
}

export function mediaUrl(path: string): string {
  if (/^(https?:|data:|blob:)/.test(path)) return path
  const url = `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`
  return resolveMediaOrigin ? resolveMediaOrigin(url) : url
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
  // Which missing providers something else would satisfy, keyed by provider
  // id. The three text providers do the same job, so being told to fetch an
  // Ollama key when an OpenAI one is already in hand is a wasted trip.
  alternatives?: Record<string, string[]>
  // What is left of the free daily allowances, reported only for the kinds the
  // platform funds. Absent means there is no allowance to speak of, which is
  // not the same as one that reads zero.
  free?: FreeAllowance[]
  // The allowances that would have carried this run if anything were left of
  // today's. Present means the answer is "come back tomorrow", not "add a key".
  exhausted?: string[]
}

export type FreeAllowance = {
  kind: "image" | "text"
  used: number
  allowance: number
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

// CURRENT_KDF_VERSION is what a new account is created under, and what a legacy
// one is upgraded to. It has to match the server's KDFVersion; prelogin is what
// keeps the two honest, since the server names the version for every account.
const CURRENT_KDF_VERSION = 1

// prelogin asks how to derive for this address. It runs before anything is
// proved, so it is deliberately uninteresting: it answers the same shape for an
// address that has never signed up as for one that has.
async function prelogin(email: string): Promise<KdfParams> {
  return request<KdfParams>("/api/auth/prelogin", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export const api = {
  // Sign-up and sign-in derive before they send; see lib/kdf.ts. The field is
  // still called `password` because it keeps its place in the protocol — it is
  // the thing you send to prove you know the password — but what travels is the
  // auth hash, and the password itself never leaves this machine.
  signup: async (email: string, password: string, name?: string) => {
    const params = await prelogin(email)
    return request<AuthUser>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: await deriveAuthHash(password, params),
        name,
        kdf_version: params.kdf_version,
      }),
    })
  },
  login: async (email: string, password: string) => {
    const params = await prelogin(email)
    // An account made before this existed still verifies against the password
    // itself, so that is what it is sent — together with the hash it should
    // hold instead, which moves it over in the same exchange. After that its
    // version is 1 and this branch never runs for it again.
    if (params.kdf_version === 0) {
      const upgradeParams = { ...params, kdf_version: CURRENT_KDF_VERSION }
      return request<AuthUser>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          kdf_version: CURRENT_KDF_VERSION,
          upgrade_hash: await deriveAuthHash(password, upgradeParams),
        }),
      })
    }
    return request<AuthUser>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: await deriveAuthHash(password, params),
        kdf_version: params.kdf_version,
      }),
    })
  },
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  me: () => request<AuthUser>("/api/auth/me"),

  listWorkflows: () => request<Workflow[]>("/api/workflows"),
  listPublicWorkflows: () => request<WorkflowCard[]>("/api/workflows/public"),
  // Works signed out for public and unlisted workflows; private ones 404 for
  // anyone but their owner, so a stale link leaks nothing.
  getSharedWorkflow: (id: string) => request<SharedWorkflow>(`/api/workflows/${id}/shared`),
  getWorkflow: (id: string) => request<Workflow>(`/api/workflows/${id}`),
  createWorkflow: (name: string, graph?: unknown, description?: string) =>
    request<Workflow>("/api/workflows", {
      method: "POST",
      body: JSON.stringify({ name, graph_json: graph ?? { nodes: [], edges: [] }, description }),
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

  // Batches. Local engine only: every one of these 404s on the hosted API,
  // which is why the UI that calls them is behind the same check as the file
  // nodes — there is no project folder to list on a server.
  runBatch: (workflowId: string, req: BatchRequest) =>
    request<{ batch_id: string; total: number; status: string }>("/api/batches", {
      method: "POST",
      body: JSON.stringify({
        workflow_id: workflowId,
        input: req.input,
        ...(req.dir !== undefined ? { dir: req.dir } : {}),
        ...(req.match ? { match: req.match } : {}),
        ...(req.recursive ? { recursive: true } : {}),
        ...(req.paths ? { paths: req.paths } : {}),
        ...(req.inputs ? { inputs: req.inputs } : {}),
        ...(req.maxItems ? { max_items: req.maxItems } : {}),
      }),
    }),
  getBatch: (id: string) => request<BatchResponse>(`/api/batches/${id}`),
  // Resumes by default: what completed is not paid for twice. restart redoes all.
  retryBatch: (id: string, restart = false) =>
    request<{ batch_id: string; retried: number; status: string }>(`/api/batches/${id}/retry`, {
      method: "POST",
      body: JSON.stringify({ restart }),
    }),
  cancelBatch: (id: string) =>
    request<{ ok: boolean; stopping: boolean }>(`/api/batches/${id}/cancel`, { method: "POST" }),
  listWorkflowBatches: (workflowId: string) => request<BatchRow[]>(`/api/workflows/${workflowId}/batches`),

  listChats: () => request<Chat[]>("/api/chats"),
  createChat: (title?: string) =>
    request<Chat>("/api/chats", { method: "POST", body: JSON.stringify({ title: title ?? "" }) }),
  getChat: (id: string) => request<{ chat: Chat; messages: ChatMessage[] }>(`/api/chats/${id}`),
  deleteChat: (id: string) => request<{ ok: boolean }>(`/api/chats/${id}`, { method: "DELETE" }),
  sendChatMessage: (id: string, content: string, attachments?: ChatAttachment[]) =>
    request<{ user: ChatMessage; assistant: ChatMessage }>(`/api/chats/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ content, attachments: attachments ?? [] }),
    }),

  // Images handed to the chat. Multipart rather than base64 in JSON: a 20 MB
  // image becomes 27 MB of base64, and the browser builds a multipart body for
  // free. The server answers with the address to send back with the message —
  // it never takes a path from us.
  uploadImage: async (file: File): Promise<ChatAttachment & { size: number }> => {
    const form = new FormData()
    form.append("file", file)
    const res = await fetch(`${API_URL}/api/uploads`, {
      method: "POST",
      credentials: "include",
      body: form,
    })
    const text = await res.text()
    const body = text ? (JSON.parse(text) as Record<string, unknown>) : {}
    if (!res.ok) {
      throw new ApiError(typeof body.error === "string" ? body.error : `Upload failed (${res.status})`, res.status, body)
    }
    return { type: "image", url: String(body.url), name: String(body.name ?? ""), size: Number(body.size ?? 0) }
  },

  // Free, platform-funded writing helper. Rate limited per account and per
  // address, so the caller must check the quota before offering the button.
  aiQuota: () => request<AiQuota>("/api/ai/quota"),
  describeWorkflow: (id: string, mode: "generate" | "synthesize", text?: string) =>
    request<DescribeResult>(`/api/workflows/${id}/describe`, {
      method: "POST",
      body: JSON.stringify({ mode, text: text ?? "" }),
    }),

  listProviders: () =>
    request<{ providers: ProviderInfo[]; order: Record<string, string[]> | null }>("/api/providers"),

  // The order this account wants its providers tried in, per job. Only sent
  // when there is something to order: an account with one credential for a job
  // never sees the question.
  saveProviderOrder: (order: Record<string, string[]>) =>
    request<{ order: Record<string, string[]> }>("/api/providers/order", {
      method: "PUT",
      body: JSON.stringify({ order }),
    }),
  // Where a local server is and which model it answers with by default.
  // Clearing both is how one of these is turned off: they have no key to
  // delete, so an empty address is the same statement the empty key box makes
  // for everything else.
  saveProviderEndpoint: (provider: string, endpoint: { url: string; key?: string; model?: string }) =>
    request<{ providers: ProviderInfo[] }>(`/api/providers/${provider}/endpoint`, {
      method: "PUT",
      body: JSON.stringify(endpoint),
    }),

  // What a local server says it can run. Asked of the server rather than listed
  // anywhere, because what is installed is the person's business and changes
  // whenever they pull something new.
  listProviderModels: (provider: string) =>
    request<{ models: string[] }>(`/api/providers/${provider}/models`),

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

// UNKNOWN_NODE is raised when a hosted run names a node this server has no
// implementation for — in practice a node from a pack, since packs run on the
// machine their owner controls and never here. Same shape as the refusal
// above, and for the same reason: the workflow is fine, it is in the wrong
// place to run.
export const UNKNOWN_NODE = "unknown_node"

export type UnknownNode = {
  error: string
  code: typeof UNKNOWN_NODE
  hint: string
  nodes: string[]
  // Named only when the store knows a pack that defines the node.
  packs?: string[]
}

export function unknownNode(err: unknown): UnknownNode | null {
  if (!(err instanceof ApiError) || err.code !== UNKNOWN_NODE) return null
  const p = err.payload as UnknownNode | undefined
  if (!p || !Array.isArray(p.nodes)) return null
  return p
}

// ---------------------------------------------------------------------------
// The store
//
// Node packs and workflow templates other people published. Reading needs no
// account: a catalogue behind a login is a catalogue nobody browses.

export type StorePackNode = {
  type: string
  label: string
  category: string
  description: string
  inputs: string[]
  outputs: string[]
  // Which file in the pack defines this node, so the reader can find it.
  source: string
}

export type StorePack = {
  id: string
  name: string
  version: string
  description: string
  author: string
  capabilities: string[]
  nodes: StorePackNode[]
  // A SHA-256 over the pack's installable content. A version is immutable, and
  // this is what makes that promise checkable rather than merely stated.
  digest: string
  publisher_name?: string
  yanked?: boolean
  created_at: string
  // Only the single-pack routes carry the code; listings leave it out.
  sources?: { path: string; code: string }[]
}

export type StorePackRef = { name: string; version: string; digest: string }

export type StoreTemplate = {
  id: string
  name: string
  version: string
  description: string
  graph_json: string
  requires: StorePackRef[]
  node_types: string[]
  // The node types that come from a pack rather than from the engine. It is
  // what decides whether this template can run anywhere but a desktop.
  pack_node_types: string[]
  publisher_name?: string
  // The input/output pair from a real run, copied off the workflow the template
  // was published from. Absent on a template published from a bare graph.
  preview?: WorkflowPreview | null
  yanked?: boolean
  created_at: string
}

export type StoreTemplateDetail = {
  template: StoreTemplate
  packs?: StorePack[]
  installable?: boolean
  problems?: { name: string; reason: string }[]
}

export const store = {
  packs: (q = "") => request<{ packs: StorePack[]; next_cursor: string }>(`/api/store/nodes${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  pack: (name: string) => request<StorePack>(`/api/store/nodes/${encodeURIComponent(name)}`),
  templates: (q = "") =>
    request<{ templates: StoreTemplate[]; next_cursor: string }>(
      `/api/store/workflows${q ? `?q=${encodeURIComponent(q)}` : ""}`
    ),
  template: (name: string) => request<StoreTemplateDetail>(`/api/store/workflows/${encodeURIComponent(name)}`),
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
  // The model a run the platform pays for uses for text. Its own setting
  // because it answers a different question from llm_model: that one is what a
  // paying account gets by default, this one is what we are willing to buy.
  free_model: string
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
  free: string
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
  // Set when this run is one item of a batch. It is the grouping key: 519 runs
  // stay 519 runs, and one line stands for them.
  batch_id?: string
  status: "queued" | "running" | "completed" | "failed" | "cancelled"
  output_json?: string
  error?: string
  started_at?: string
  finished_at?: string
  created_at: string
}

// A batch is one workflow run over many files: the same graph, once per file,
// with one input carrying the path each time. It only exists on a local engine
// — it lists a folder, and there is no folder on the hosted API.
export type BatchCounts = {
  total: number
  pending: number
  running: number
  completed: number
  failed: number
  cancelled: number
}

export type BatchItem = {
  path: string
  execution_id?: string
  status: "pending" | "running" | "completed" | "failed" | "cancelled"
  error?: string
}

export type Batch = {
  id: string
  workflow_id: string
  input: string
  dir?: string
  match?: string
  recursive?: boolean
  status: "queued" | "running" | "completed" | "failed" | "cancelled"
  error?: string
  items: BatchItem[]
  created_at: string
  started_at?: string
  finished_at?: string
}

export type BatchResponse = { batch: Batch; counts: BatchCounts }

// The history row: a batch without its items, which is what a list shows.
export type BatchRow = Omit<Batch, "items"> & { counts: BatchCounts }

export type BatchRequest = {
  input: string
  dir?: string
  match?: string
  recursive?: boolean
  paths?: string[]
  inputs?: Record<string, unknown>
  maxItems?: number
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
  // Providers sharing a role do the same job: the "text" providers are
  // alternatives (holding a key for any one clears `required` on all three),
  // while the "image" provider stands alone.
  // The jobs this provider can do. More than one, because Google generates
  // images and reads them, and Ollama writes text and reads images — which is
  // why "Image & vision" was one heading and should not have been.
  // « completion » est arrivée en quatrième : compléter du code n'est pas une
  // variante de la génération de texte — la route est différente, et les
  // modèles qui la servent ne sont pas les mêmes.
  //
  // « video » est la cinquième, et elle n'est pas non plus une variante de
  // l'image : le même fournisseur peut faire les deux, mais la facture se
  // compte à la seconde et le rendu prend une minute. Quelqu'un qui veut
  // facturer ses vidéos ailleurs que ses images le peut, et personne n'a à
  // deviner que la clé image sert aussi à ça.
  roles: ("text" | "image" | "video" | "vision" | "completion")[]
  // The text provider a node uses when it names none.
  is_default: boolean
  required: boolean
  // An endpoint provider is configured by an address and a model rather than by
  // a key — Ollama on this machine, LM Studio, or any other server speaking the
  // OpenAI chat API. The panel draws it with two fields and a model list it can
  // fetch, not a password box.
  //
  // Only the desktop ever sets this. A hosted server cannot reach a model on
  // somebody's laptop, so it does not offer them at all.
  endpoint?: boolean
  endpoint_url?: string
  // Where this one listens when nobody says otherwise, shown as the address
  // field's placeholder. Empty for a custom endpoint, which is the whole point
  // of it: we do not know where it is.
  default_url?: string
  model?: string
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
