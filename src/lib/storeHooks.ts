import { useQuery } from "@tanstack/react-query"
import { store } from "@/lib/api"

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
