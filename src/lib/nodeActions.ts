// Bridge between Zynode cards and the Builder for per-node actions.
// React Flow node components are instantiated from a static nodeTypes map,
// so contextual callbacks (like "run this node") cannot be passed as props.
// The Builder registers the handler; Zynode cards invoke it.

type RunNodeHandler = (nodeId: string) => void

let handler: RunNodeHandler | null = null

export function setRunNodeHandler(h: RunNodeHandler | null) {
  handler = h
}

export function requestRunNode(nodeId: string) {
  handler?.(nodeId)
}