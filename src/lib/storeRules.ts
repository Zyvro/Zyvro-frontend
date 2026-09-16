import { BUILT_IN_KINDS } from "@/lib/nodes"
import type { StoreTemplate } from "@/lib/api"

// What can and cannot run on zyv.ro, decided in one place so the catalogue,
// the detail page and any future button all say the same thing.

// These read and write the folder someone opened in the desktop app. There is
// no folder on a server, and a node that could name an arbitrary path on one
// would be a very different kind of product.
export const DESKTOP_ONLY_NODES = new Set(
  BUILT_IN_KINDS.filter((k) => k.localOnly).map((k) => k.type)
)

export type Runnability =
  | { online: true }
  | { online: false; reason: string; nodes: string[] }

// A template's node types are recorded at publish time, so this needs no graph
// parsing and cannot disagree with what the server derived.
export function runsOnline(template: StoreTemplate): Runnability {
  const desktopOnly = (template.node_types ?? []).filter((t) => DESKTOP_ONLY_NODES.has(t))
  if (desktopOnly.length > 0) {
    return {
      online: false,
      reason: "reads or writes files in a project folder, which only exists on your own machine",
      nodes: desktopOnly,
    }
  }

  // A pack's nodes are installed into a project. The hosted engine has no
  // project and no packs, so it cannot run them even though nothing about
  // them is dangerous.
  const fromPacks = template.pack_node_types ?? []
  if (fromPacks.length > 0) {
    return {
      online: false,
      reason: "uses nodes from a pack, and packs are installed into a project rather than onto the server",
      nodes: fromPacks,
    }
  }

  return { online: true }
}
