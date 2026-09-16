import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, store, type Workflow } from "@/lib/api"
import { qk } from "@/lib/qk"

// The store is public, so none of these depend on a session. They are separate
// from lib/hooks.ts because that file is about a signed-in user's own things.

export const storeKeys = {
  packs: (q: string) => ["store", "packs", q] as const,
  pack: (name: string) => ["store", "pack", name] as const,
  templates: (q: string) => ["store", "templates", q] as const,
  template: (name: string) => ["store", "template", name] as const,
}

export function useStorePacks(q = "") {
  return useQuery({ queryKey: storeKeys.packs(q), queryFn: () => store.packs(q), staleTime: 30_000 })
}

// useStorePack is only fetched when someone asks to read the code, because the
// listing deliberately leaves the sources out and they are the large part.
export function useStorePack(name: string | null) {
  return useQuery({
    queryKey: storeKeys.pack(name || ""),
    queryFn: () => store.pack(name!),
    enabled: Boolean(name),
    staleTime: 60_000,
  })
}

export function useStoreTemplates(q = "") {
  return useQuery({
    queryKey: storeKeys.templates(q),
    queryFn: () => store.templates(q),
    staleTime: 30_000,
  })
}

export function useStoreTemplate(name: string | null) {
  return useQuery({
    queryKey: storeKeys.template(name || ""),
    queryFn: () => store.template(name!),
    enabled: Boolean(name),
    staleTime: 60_000,
  })
}

// useCopyStoreTemplate makes the template someone's own workflow. Copying
// rather than referencing is the point: a template is a starting shape, and the
// person who takes it should be able to change it without asking anyone, and
// without their copy shifting under them when the publisher ships a new version.
export function useCopyStoreTemplate() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (name: string): Promise<Workflow> => {
      const detail = await store.template(name)
      const template = detail.template
      if (!template) throw new Error(`The store returned no workflow named "${name}".`)

      // The graph is stored as a string, the way every workflow is. Parsing it
      // here means a malformed template fails now, with its name attached,
      // rather than as an empty canvas the person has to diagnose.
      let graph: unknown
      try {
        graph = JSON.parse(template.graph_json)
      } catch {
        throw new Error(`The workflow "${name}" has a graph this app cannot read.`)
      }

      return api.createWorkflow(template.name, graph, template.description)
    },
    onSuccess: () => client.invalidateQueries({ queryKey: qk.workflows() }),
  })
}
