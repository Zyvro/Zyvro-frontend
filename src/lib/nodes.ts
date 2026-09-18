import type { GraphEdge, GraphNode } from "./api"

export type PortType = "text" | "image" | "video" | "json" | "any"

export type NodeKind = {
  type: string
  label: string
  category: "Input" | "AI" | "Utility" | "Output" | "Agent"
  description: string
  inputs: PortType[]
  outputs: PortType[]
  defaults?: Record<string, unknown>
  // Tool-only nodes have no data ports: they only expose the tool port that
  // feeds a Brain.
  toolOnly?: boolean
  // pack names the installed pack a node came from. Absent on built-ins. The
  // palette shows it, because someone looking at a node that behaves oddly
  // should be able to see at a glance that it is not one of ours.
  pack?: string
  // Local-only nodes need a project folder on the machine running the engine,
  // so they work in Zyvro Studio and are refused by the hosted server. The
  // builder still shows them everywhere: seeing that the capability exists is
  // how someone learns the desktop app is worth having.
  localOnly?: boolean
}

// Port compatibility: a source port can feed a target port if types match or
// either side is "any".
export function portsCompatible(source: PortType, target: PortType): boolean {
  return source === target || source === "any" || target === "any"
}

// Input handle ids: a single-input node exposes the legacy centered "in"
// handle; multi-input nodes expose one handle per typed port so text and
// image links are visually distinct. Duplicate port types get indexed ids
// ("any:0", "any:1") because React Flow requires unique handle ids.
export function inputHandleIds(kind: NodeKind): string[] {
  if (kind.inputs.length <= 1) return ["in"]
  return kind.inputs.map((p, i) =>
    kind.inputs.filter((x) => x === p).length > 1 ? `${p}:${i}` : p
  )
}

// Port type encoded in an input handle id ("text" -> "text", "any:1" -> "any").
export function portOfHandle(handleId: string): PortType {
  const base = handleId.split(":")[0]
  return (["text", "image", "video", "json", "any"] as PortType[]).includes(base as PortType)
    ? (base as PortType)
    : "any"
}

// BUILT_IN_KINDS are the nodes the engine implements in Go. They are always
// present and cannot be shadowed.
export const BUILT_IN_KINDS: NodeKind[] = [
  {
    type: "textInput",
    label: "Text Input",
    category: "Input",
    description: "Static text or runtime input",
    inputs: [],
    outputs: ["text"],
    defaults: { value: "", inputKey: "" },
  },
  {
    type: "imageInput",
    label: "Image Input",
    category: "Input",
    description: "Uploaded image or runtime input",
    inputs: [],
    outputs: ["image"],
    defaults: { dataUrl: "", inputKey: "" },
  },
  {
    type: "fileInput",
    label: "Read File",
    category: "Input",
    description: "Read a file from the project folder (desktop only)",
    inputs: [],
    outputs: ["any"],
    defaults: { path: "", as: "auto" },
    localOnly: true,
  },
  {
    type: "mergeText",
    label: "Merge Text",
    category: "Utility",
    description: "Concatenate upstream texts",
    inputs: ["any", "any"],
    outputs: ["text"],
    defaults: { separator: "\\n" },
  },
  {
    type: "llm",
    label: "LLM",
    category: "AI",
    description: "Text completion via Ollama, Claude or OpenAI",
    inputs: ["text"],
    outputs: ["text"],
    defaults: { system: "", prompt: "", temperature: 0.7, maxTokens: 2000, provider: "", model: "" },
  },
  {
    type: "generateImage",
    label: "Generate Image",
    category: "AI",
    description: "Text -> image, on Gemini or FLUX",
    inputs: ["text", "image"],
    outputs: ["image"],
    // provider empty means "whichever backend this account has a key for",
    // which is what keeps a shared workflow portable between them.
    defaults: { prompt: "", aspectRatio: "1:1", provider: "", model: "" },
  },
  {
    type: "generateVideo",
    label: "Generate Video",
    category: "AI",
    description: "Text -> video, on Veo or FLUX",
    inputs: ["text", "image"],
    outputs: ["video"],
    // resolution and duration are on the node rather than in a deployment
    // default because they are what decides the bill: both backends charge by
    // the second, and the price per second triples between hd and uhd.
    defaults: { prompt: "", provider: "", model: "", resolution: "", duration: 0, aspectRatio: "", draft: false },
  },
  {
    type: "editImage",
    label: "Edit Image",
    category: "AI",
    description: "Edit an image with a prompt",
    inputs: ["image", "text"],
    outputs: ["image"],
    defaults: { prompt: "" },
  },
  {
    type: "removeBackground",
    label: "Remove Background",
    category: "AI",
    description: "AI two-pass matte, or programmatic color-range removal",
    inputs: ["image"],
    outputs: ["image"],
    defaults: { mode: "ai", tolerance: 30 },
  },
  {
    type: "rotateImage",
    label: "Rotate Image",
    category: "Utility",
    description: "Rotate an image by 90-degree steps",
    inputs: ["image"],
    outputs: ["image"],
    defaults: { degrees: 90 },
  },
  {
    type: "flipImage",
    label: "Flip Image",
    category: "Utility",
    description: "Mirror an image horizontally or vertically",
    inputs: ["image"],
    outputs: ["image"],
    defaults: { axis: "h" },
  },
  {
    type: "vision",
    label: "Vision / Judge",
    category: "AI",
    description: "Analyze image(s) with a VLM",
    inputs: ["image", "text"],
    outputs: ["text"],
    defaults: { instruction: "" },
  },
  {
    type: "brain",
    label: "Brain",
    category: "Agent",
    description: "Agent that calls connected nodes as tools",
    inputs: ["text"],
    outputs: ["text"],
    defaults: { goal: "", system: "", maxSteps: 6, provider: "", model: "" },
  },
  {
    type: "zyvroTools",
    label: "Workflow Tools",
    category: "Agent",
    description: "Gives a Brain the MCP tools: list, inspect and run your other workflows",
    inputs: [],
    outputs: [],
    defaults: {},
    toolOnly: true,
  },
  {
    type: "preview",
    label: "Preview",
    category: "Output",
    description: "Render a result in the node",
    inputs: ["any"],
    outputs: [],
    defaults: {},
  },
  {
    type: "voxelPreview",
    label: "3D Voxel Preview",
    category: "Output",
    description: "Cube or sphere textured with the connected images",
    inputs: ["image", "image", "image", "image", "image", "image"],
    outputs: [],
    defaults: { shape: "cube" },
  },
  {
    type: "fileOutput",
    label: "Write File",
    category: "Output",
    description: "Write the result into the project folder (desktop only)",
    // The node hands its input straight back out, so a chain can keep going
    // after writing: read, transform, write, then preview what was written.
    inputs: ["any"],
    outputs: ["any"],
    defaults: { path: "", createDirs: true },
    localOnly: true,
  },
  {
    type: "output",
    label: "Output",
    category: "Output",
    description: "Mark a workflow result",
    inputs: ["any"],
    outputs: [],
    defaults: {},
  },
]

// Node types are no longer a fixed list. A project can install packs of nodes
// written in Lua, and those have to appear in the palette and resolve by name
// exactly like a built-in. So the set lives in a small store the host fills in
// after it learns what the local engine has loaded.
//
// It is a store rather than a plain variable because the palette renders from
// it: a component has to re-render when a pack is installed, and the project
// bans useEffect for exactly this kind of subscription.

let pluginKinds: NodeKind[] = []
let allKinds: NodeKind[] = BUILT_IN_KINDS
const listeners = new Set<() => void>()

export function subscribeNodeKinds(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// getNodeKinds returns a cached array, never a fresh one. Rebuilding it on
// every call would hand React a new value each render and spin it forever.
export function getNodeKinds(): NodeKind[] {
  return allKinds
}

export function registerPluginKinds(kinds: NodeKind[]): void {
  // A pack may not shadow a built-in. The engine refuses it too, but the
  // palette must not show a second entry under a name that already means
  // something, even for the moment before a run fails.
  const builtIn = new Set(BUILT_IN_KINDS.map((k) => k.type))
  const seen = new Set<string>()
  pluginKinds = kinds.filter((k) => {
    if (builtIn.has(k.type) || seen.has(k.type)) return false
    seen.add(k.type)
    return true
  })
  allKinds = [...BUILT_IN_KINDS, ...pluginKinds]
  for (const listener of listeners) listener()
}

export function nodeKind(type: string): NodeKind | undefined {
  return allKinds.find((k) => k.type === type)
}

export function makeNode(kind: NodeKind, x: number, y: number): GraphNode {
  return {
    id: `${kind.type}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    type: kind.type,
    position: { x, y },
    data: {
      label: kind.label,
      config: { ...kind.defaults },
    },
  }
}

export function validateConnection(
  edges: GraphEdge[],
  nodes: GraphNode[],
  source: string,
  target: string,
  kindWanted?: string,
  targetHandle?: string
): string | null {
  if (source === target) return "A node cannot connect to itself"
  const sNode = nodes.find((n) => n.id === source)
  const tNode = nodes.find((n) => n.id === target)
  if (!sNode || !tNode) return "Unknown node"
  const sKind = nodeKind(sNode.type)
  const tKind = nodeKind(tNode.type)

  // Tool edges: only INTO a brain.
  if (kindWanted === "tool") {
    if (tNode.type !== "brain") return "Tool links must target a Brain node"
    if (sNode.type === "brain") return "A Brain cannot be a tool"
    return null
  }

  if (sNode.type === "brain") {
    // A brain's data output can feed other nodes, but nodes connected via
    // tool edges must not also be data-connected (would double-execute).
    const hasTool = edges.some((e) => e.type === "tool" && e.source === source && e.target === target)
    if (hasTool) return "Already linked as a tool"
  }

  if (sKind && tKind) {
    if (sKind.outputs.length === 0) return "This node has no outputs"
    if (tKind.inputs.length === 0) return "This node accepts no input"

    // Typed target handle: the source port must be compatible with that
    // specific port. The image port accepts multiple sources (it is a
    // collection port); other ports accept a single connection.
    const targetPort = targetHandle ? portOfHandle(targetHandle) : null
    if (targetPort && targetHandle && targetHandle !== "in") {
      if (!sKind.outputs.some((o) => portsCompatible(o, targetPort))) {
        return `Incompatible port: ${sKind.outputs.join("/")} -> ${targetPort}`
      }
      if (targetPort !== "image") {
        const taken = edges.some(
          (e) => e.type !== "tool" && e.target === target && e.targetHandle === targetHandle
        )
        if (taken) return "This input port already has a connection"
      }
    } else {
      const compatible = sKind.outputs.some((o) => tKind!.inputs.some((i) => portsCompatible(o, i)))
      if (!compatible) return `Incompatible ports: ${sKind.outputs.join("/")} -> ${tKind.inputs.join("/")}`
    }
  }
  if (edges.some((e) => e.type !== "tool" && e.source === target && e.target === source)) {
    return "Reverse edge already exists"
  }
  return null
}

// wouldCycle: does adding source->target create a cycle in data edges?
export function wouldCycle(edges: GraphEdge[], source: string, target: string): boolean {
  const adj = new Map<string, string[]>()
  for (const e of edges) {
    if (e.type === "tool") continue
    adj.set(e.target, [...(adj.get(e.target) || []), e.source])
  }
  const seen = new Set<string>()
  const stack = [source]
  while (stack.length) {
    const cur = stack.pop()!
    if (cur === target) return true
    if (seen.has(cur)) continue
    seen.add(cur)
    stack.push(...(adj.get(cur) || []))
  }
  return false
}
// Runtime inputs declared by a graph: input nodes that carry an input key.
// They form the public contract of the workflow (run panel, REST, MCP).
export type RuntimeInputDef = {
  key: string
  type: "text" | "image"
  nodeId: string
  label: string
  hasDefault: boolean
}

// RUNTIME_INPUT_TYPES : les nœuds qu'une exécution peut remplir par leur nom.
//
// Une seule liste, lue par ce qui les collecte et par ce qui signale ceux qui
// n'ont pas de nom. Deux listes finiraient par différer, et le nœud qu'on
// oublierait dans la seconde serait justement celui qu'on ne sait pas remplir.
export const RUNTIME_INPUT_TYPES = ["imageInput", "textInput"] as const

export function takesRuntimeInput(type: string): boolean {
  return (RUNTIME_INPUT_TYPES as readonly string[]).includes(type)
}

// unnamedInputNodes : les entrées qu'aucun appelant ne peut nommer.
//
// C'est légal, et c'est un piège. Sans nom, la valeur d'un nœud ne se remplace
// qu'en désignant son identifiant — `a`, `n1` — qui n'est écrit nulle part dans
// l'interface et qui ne veut rien dire pour qui lit le workflow. Un agent à qui
// on demande « refais-le avec ce fichier » tourne alors sur la valeur d'origine
// et rend un résultat qui a l'air juste.
export function unnamedInputNodes(nodes: GraphNode[]): Array<{ nodeId: string; type: string; label: string }> {
  return nodes
    .filter((n) => takesRuntimeInput(n.type))
    .filter((n) => {
      const cfg = (n.data?.config || {}) as Record<string, unknown>
      return String(cfg.inputKey || "").trim() === ""
    })
    .map((n) => ({ nodeId: n.id, type: n.type, label: String(n.data?.label || "") }))
}

// INPUT_PLACEHOLDER : `{{input:clef}}`, écrit dans la configuration d'un nœud.
//
// Un chemin de fichier, un texte, la valeur d'un pack : partout où le moteur
// substitue, quelqu'un peut en écrire un. Le motif est le même des deux côtés —
// `engine/runtime.go` le cherche avec la même expression.
const INPUT_PLACEHOLDER = /\{\{input:([^}]*)\}\}/g

// placeholderKeys : les entrées qu'un nœud réclame par un motif, quelque part
// dans sa configuration.
//
// Ce qui manquait, et qui a coûté un fichier nommé `{{input:gfx}}` : une entrée
// déclarée par un motif n'était déclarée nulle part. Seuls les nœuds d'entrée
// portant un `inputKey` comptaient, donc le panneau ne demandait pas `gfx`, le
// run partait sans, et le chemin de sortie gardait ses accolades — trois
// mégaoctets écrits dans un fichier dont le nom était le motif lui-même.
//
// On regarde donc toute la configuration, à toute profondeur : c'est là que le
// moteur substitue.
function placeholderKeys(value: unknown, depth = 0, out: string[] = []): string[] {
  if (depth > 8) return out
  if (typeof value === "string") {
    for (const m of value.matchAll(INPUT_PLACEHOLDER)) {
      const key = m[1].trim()
      if (key && !out.includes(key)) out.push(key)
    }
    return out
  }
  if (Array.isArray(value)) {
    for (const item of value) placeholderKeys(item, depth + 1, out)
    return out
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      placeholderKeys(item, depth + 1, out)
    }
  }
  return out
}

export function runtimeInputDefs(nodes: GraphNode[]): RuntimeInputDef[] {
  const out: RuntimeInputDef[] = []
  const vus = new Set<string>()
  for (const n of nodes) {
    if (!takesRuntimeInput(n.type)) continue
    const cfg = (n.data?.config || {}) as Record<string, unknown>
    const key = String(cfg.inputKey || "").trim()
    if (!key) continue
    const isImage = n.type === "imageInput"
    vus.add(key)
    out.push({
      key,
      type: isImage ? "image" : "text",
      nodeId: n.id,
      label: String(n.data?.label || ""),
      hasDefault: isImage ? Boolean(cfg.dataUrl) : String(cfg.value || "").trim() !== "",
    })
  }

  // Puis celles que des motifs réclament. Après les nœuds d'entrée, et sans
  // doublon : un `{{input:sujet}}` qui reprend le nom d'un nœud d'entrée parle
  // de la même valeur, et la demander deux fois serait demander deux fois la
  // même chose.
  for (const n of nodes) {
    for (const key of placeholderKeys(n.data?.config)) {
      if (vus.has(key)) continue
      vus.add(key)
      out.push({
        key,
        type: "text",
        nodeId: n.id,
        label: String(n.data?.label || ""),
        // Un motif n'a pas de valeur par défaut : c'est tout son intérêt, et
        // un run lancé sans lui échoue maintenant au lieu d'écrire un fichier
        // dont le nom est le motif.
        hasDefault: false,
      })
    }
  }
  return out
}
