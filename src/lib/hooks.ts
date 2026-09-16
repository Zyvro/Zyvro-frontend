"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, AppSettings, type ChatAttachment } from "./api"
import { qk } from "./qk"

export function useMe() {
  return useQuery({
    queryKey: qk.auth(),
    queryFn: () => api.me(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => api.login(email, password),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.auth() })
      qc.invalidateQueries({ queryKey: qk.workflows() })
    },
  })
}

export function useSignup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ email, password, name }: { email: string; password: string; name?: string }) =>
      api.signup(email, password, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.auth() })
      qc.invalidateQueries({ queryKey: qk.workflows() })
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      qc.clear()
    },
  })
}

export function useWorkflows() {
  return useQuery({
    queryKey: qk.workflows(),
    queryFn: () => api.listWorkflows(),
    staleTime: 30 * 1000,
  })
}

export function usePublicWorkflows() {
  return useQuery({
    queryKey: qk.publicWorkflows(),
    queryFn: () => api.listPublicWorkflows(),
    staleTime: 60 * 1000,
  })
}

export function useWorkflow(id: string | undefined) {
  return useQuery({
    queryKey: qk.workflow(id || ""),
    queryFn: () => api.getWorkflow(id!),
    enabled: Boolean(id),
    staleTime: 10 * 1000,
  })
}

export function useCreateWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.createWorkflow(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.workflows() }),
  })
}

export function useUpdateWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; name?: string; graph_json?: unknown; description?: string; visibility?: string }) =>
      api.updateWorkflow(id, payload),
    onSuccess: (wf) => {
      qc.setQueryData(qk.workflow(wf.id), wf)
    },
  })
}

export function useDeleteWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteWorkflow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.workflows() }),
  })
}

export function useDuplicateWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.duplicateWorkflow(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.workflows() }),
  })
}

export function useSecrets() {
  return useQuery({
    queryKey: qk.secrets(),
    queryFn: () => api.listSecrets(),
    staleTime: 60 * 1000,
  })
}

export function useLastExecution(workflowId: string | undefined) {
  return useQuery({
    queryKey: qk.lastExecution(workflowId || ""),
    queryFn: () => api.getLastExecution(workflowId!),
    enabled: Boolean(workflowId),
    staleTime: 5 * 1000,
  })
}

export function useSetSecret() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ provider, secret }: { provider: string; secret: string }) => api.setSecret(provider, secret),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.secrets() })
      qc.invalidateQueries({ queryKey: qk.providers() })
    },
  })
}

export function useDeleteSecret() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (provider: string) => api.deleteSecret(provider),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.secrets() })
      qc.invalidateQueries({ queryKey: qk.providers() })
    },
  })
}

export function useApiKeys() {
  return useQuery({
    queryKey: qk.apiKeys(),
    queryFn: () => api.listApiKeys(),
    staleTime: 30 * 1000,
  })
}

export function useCreateApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.createApiKey(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.apiKeys() }),
  })
}

export function useRenameApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.renameApiKey(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.apiKeys() }),
  })
}

export function useRevokeApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.revokeApiKey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.apiKeys() }),
  })
}
// ---- Chat ----

export function useChats() {
  return useQuery({ queryKey: qk.chats(), queryFn: () => api.listChats(), staleTime: 10 * 1000 })
}

// Polls while the assistant is answering.
export function useChat(id: string | null) {
  return useQuery({
    queryKey: qk.chat(id || ""),
    queryFn: () => api.getChat(id!),
    enabled: Boolean(id),
    refetchInterval: (q) => {
      const msgs = q.state.data?.messages
      const running = msgs?.some((m) => m.status === "running")
      return running ? 1500 : false
    },
  })
}

export function useCreateChat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (title?: string) => api.createChat(title),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.chats() }),
  })
}

export function useDeleteChat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteChat(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.chats() }),
  })
}

export function useSendChatMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, content, attachments }: { id: string; content: string; attachments?: ChatAttachment[] }) =>
      api.sendChatMessage(id, content, attachments),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: qk.chat(vars.id) })
      qc.invalidateQueries({ queryKey: qk.chats() })
    },
  })
}

// ---- Administration ----
//
// The panel polls: queue depth and running counts are only useful live.
// Poll intervals stay above a second so an open tab is cheap.

export function useAdminOverview() {
  return useQuery({
    queryKey: qk.adminOverview(),
    queryFn: () => api.adminOverview(),
    refetchInterval: 5000,
    staleTime: 2000,
  })
}

export function useAdminSettings() {
  return useQuery({
    queryKey: qk.adminSettings(),
    queryFn: () => api.adminGetSettings(),
    staleTime: 30 * 1000,
  })
}

export function useUpdateAdminSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<AppSettings>) => api.adminUpdateSettings(payload),
    onSuccess: (saved) => {
      qc.setQueryData(qk.adminSettings(), saved)
      qc.invalidateQueries({ queryKey: qk.adminOverview() })
    },
  })
}

export function useAdminQueue() {
  return useQuery({
    queryKey: qk.adminQueue(),
    queryFn: () => api.adminQueue(),
    refetchInterval: 2000,
    staleTime: 1000,
  })
}

export function useAdminCancelExecution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.adminCancelExecution(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminQueue() })
      qc.invalidateQueries({ queryKey: qk.admin() })
    },
  })
}

export function useAdminUsers() {
  return useQuery({ queryKey: qk.adminUsers(), queryFn: () => api.adminUsers(), staleTime: 15 * 1000 })
}

export function useAdminUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; is_admin?: boolean; disabled?: boolean }) =>
      api.adminUpdateUser(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.adminUsers() }),
  })
}

export function useAdminExecutions(filters: { status?: string; user_id?: string; workflow_id?: string; limit?: number }) {
  return useQuery({
    queryKey: qk.adminExecutions(JSON.stringify(filters)),
    queryFn: () => api.adminExecutions(filters),
    refetchInterval: 10 * 1000,
    staleTime: 5 * 1000,
  })
}

export function useAdminWorkflows() {
  return useQuery({ queryKey: qk.adminWorkflows(), queryFn: () => api.adminWorkflows(), staleTime: 30 * 1000 })
}

export function useAdminAnalytics(days: number) {
  return useQuery({
    queryKey: qk.adminAnalytics(days),
    queryFn: () => api.adminAnalytics(days),
    staleTime: 60 * 1000,
  })
}

// ---- Explore, sharing and provider keys ----

// A shared workflow resolves for signed-out visitors too, so the link page can
// render before asking anyone to create an account.
export function useSharedWorkflow(id: string | undefined) {
  return useQuery({
    queryKey: qk.sharedWorkflow(id || ""),
    queryFn: () => api.getSharedWorkflow(id!),
    enabled: Boolean(id),
    retry: false,
    staleTime: 30 * 1000,
  })
}

export function useProviders() {
  return useQuery({
    queryKey: qk.providers(),
    queryFn: () => api.listProviders(),
    staleTime: 60 * 1000,
  })
}

// ---- Free writing helper ----

// While the helper is on cooldown the quota is polled so the buttons re-enable
// on their own. Once it is available again there is nothing to watch.
export function useAiQuota() {
  return useQuery({
    queryKey: qk.aiQuota(),
    queryFn: () => api.aiQuota(),
    retry: false,
    staleTime: 10 * 1000,
    refetchInterval: (q) => (q.state.data && !q.state.data.allowed ? 15 * 1000 : false),
  })
}

export function useDescribeWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, mode, text }: { id: string; mode: "generate" | "synthesize"; text?: string }) =>
      api.describeWorkflow(id, mode, text),
    onSuccess: (res) => qc.setQueryData(qk.aiQuota(), res.quota),
    // A refusal carries the remaining cooldown; re-reading it keeps the buttons
    // honest instead of leaving them enabled after a 429.
    onError: () => qc.invalidateQueries({ queryKey: qk.aiQuota() }),
  })
}

// The provider catalogs change rarely and the backend caches them for ten
// minutes, so this query is content to be stale.
export function useAdminModels() {
  return useQuery({
    queryKey: qk.adminModels(),
    queryFn: () => api.adminModels(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}
