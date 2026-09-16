import type { GraphEdge, GraphNode } from "./api"

export type PortType = "text" | "image" | "json" | "any"

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
  return (["text", "image", "json", "any"] as PortType[]).includes(base as PortType)
    ? (base as PortType)
    : "any"
}

export const NODE_KINDS: NodeKind[] = [
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
    description: "Text -> image via Gemini",
    inputs: ["text", "image"],
    outputs: ["image"],
    defaults: { prompt: "", aspectRatio: "1:1" },
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

export function nodeKind(type: string): NodeKind | undefined {
  return NODE_KINDS.find((k) => k.type === type)
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

export function runtimeInputDefs(nodes: GraphNode[]): RuntimeInputDef[] {
  const out: RuntimeInputDef[] = []
  for (const n of nodes) {
    if (n.type !== "textInput" && n.type !== "imageInput") continue
    const cfg = (n.data?.config || {}) as Record<string, unknown>
    const key = String(cfg.inputKey || "").trim()
    if (!key) continue
    const isImage = n.type === "imageInput"
    out.push({
      key,
      type: isImage ? "image" : "text",
      nodeId: n.id,
      label: String(n.data?.label || ""),
      hasDefault: isImage ? Boolean(cfg.dataUrl) : String(cfg.value || "").trim() !== "",
    })
  }
  return out
}
