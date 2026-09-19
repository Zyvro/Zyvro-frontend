"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Background,
  BackgroundVariant,
  Connection,
  ConnectionMode,
  Edge,
  EdgeChange,
  MiniMap,
  Node,
  NodeChange,
  ReactFlow,
  ReactFlowInstance,
  addEdge,
  useEdgesState,
  useNodesState,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  FolderOpen,
  Globe,
  Hand,
  Hourglass,
  Layers,
  LayoutGrid,
  Loader2,
  Map as MapIcon,
  MessageSquare,
  Maximize2,
  Minus,
  MousePointer2,
  Plus,
  Play,
  RotateCcw,
  Search,
  Settings,
  UserRoundPlus,
  Upload,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ShareDialog } from "@/components/ShareDialog"
import { useBatch, useLastExecution, useMe, useUpdateWorkflow, useWorkflow } from "@/lib/hooks"
import { api, ApiError, BatchResponse, ExecutionResponse, Graph, GraphEdge, GraphNode, MissingProviderKeys, QueueInfo, localOnlyNodes, unknownNode,
  missingProviderKeys } from "@/lib/api"
import {
  inputHandleIds,
  makeNode,
  getNodeKinds,
  subscribeNodeKinds,
  nodeKind,
  portOfHandle,
  runtimeInputDefs,
  unnamedInputNodes,
  validateConnection,
  wouldCycle,
  type NodeKind,
  type PortType,
  type RuntimeInputDef,
} from "@/lib/nodes"
import { Zynode, ZynodeProps } from "@/components/Zynode"
import { CATEGORIES, categoryMeta, nodeIcon } from "@/components/nodeIcons"
import { ChatDock } from "@/components/ChatDock"
import { MissingKeysPanel } from "@/components/MissingKeysPanel"
import { setRunNodeHandler } from "@/lib/nodeActions"
import { cn, fileToDataUrl } from "@/lib/utils"
import { hostCapabilities } from "@/lib/host"

type SaveState = "saved" | "saving" | "unsaved"
type CanvasTool = "select" | "hand"
type PaletteFilter = "All" | NodeKind["category"]

// embedded is set by the desktop app, which hosts this same editor inside an
// editor tab rather than on a page of its own. It turns off the three things
// that only make sense in the hosted web app: full-viewport height, the
// navigation links in the rail, and the redirect to a login page that the
// local daemon does not serve.
export default function BuilderPage({ params, embedded = false }: { params: { id: string }; embedded?: boolean }) {
  const router = useRouter()
  const { data: me, isLoading: meLoading } = useMe()
  const { data: workflow } = useWorkflow(params.id)
  const { data: lastExecution } = useLastExecution(params.id)
  const updateWorkflow = useUpdateWorkflow()

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [name, setName] = useState("")
  const [saveState, setSaveState] = useState<SaveState>("saved")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [runError, setRunError] = useState("")
  const [executionDone, setExecutionDone] = useState(false)
  const [executionCancelled, setExecutionCancelled] = useState(false)
  const [missingKeys, setMissingKeys] = useState<MissingProviderKeys | null>(null)
  // Which run to retry once the missing keys are saved: the whole workflow, or
  // just the single node that was refused.
  const pendingRunRef = useRef<{ nodeId?: string } | null>(null)
  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null)
  const [search, setSearch] = useState("")
  const [runtimeInputs, setRuntimeInputs] = useState<Record<string, string>>({})
  const [showRunPanel, setShowRunPanel] = useState(false)
  // Un lot : le même graphe lancé une fois par fichier d'un dossier.
  //
  // Il n'ajoute pas une seconde liste d'entrées à remplir — c'est la liste
  // existante, dont l'une des entrées est pilotée par le dossier au lieu d'une
  // valeur. Le nom retenu ici est celui de cette entrée-là ; les autres gardent
  // leur valeur et la même pour toutes les exécutions.
  const [batchInput, setBatchInput] = useState<string | null>(null)
  const [batchDir, setBatchDir] = useState("")
  const [batchMatch, setBatchMatch] = useState("")
  const [batchRecursive, setBatchRecursive] = useState(false)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [batchError, setBatchError] = useState("")
  const [batchBusy, setBatchBusy] = useState(false)
  const batchState = useBatch(batchId)
  const [palette, setPalette] = useState<PaletteFilter | null>(null)
  const [tool, setTool] = useState<CanvasTool>("select")
  const [zoom, setZoom] = useState(1)
  const [showMinimap, setShowMinimap] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareTab, setShareTab] = useState<"share" | "publish">("share")
  const [publishMenuOpen, setPublishMenuOpen] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Serialized form of the last persisted graph; changes that do not alter it
  // (execution status, selection, restore) must not mark the workflow dirty.
  const lastSavedRef = useRef("")
  const rf = useRef<ReactFlowInstance | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const nodeTypes = useMemo(() => ({ zynode: Zynode }), [])

  // Reuse the polling logic to apply an execution result onto canvas nodes.
  const applyExecutionToNodes = useCallback(
    (res: ExecutionResponse) => {
      const nodeStatus = new Map(res.nodes.map((n) => [n.node_id, n]))
      setNodes((nds) =>
        nds.map((n) => {
          const ne = nodeStatus.get(n.id)
          if (!ne) return n
          const data = { ...(n.data as Record<string, unknown>) }
          data._status = ne.status
          data._error = ne.error
          data._latency = ne.latency_ms
          if (ne.output_json) {
            try {
              const out = JSON.parse(ne.output_json)
              data._output = out
              const v = out?.value || {}
              if (v.url) data._previewUrl = v.url
              else if (typeof v.dataUrl === "string" && v.dataUrl.startsWith("data:")) {
                data._previewUrl = v.dataUrl
              }
            } catch {
              // ignore
            }
          }
          return { ...n, data }
        })
      )
    },
    [setNodes]
  )

  // Load graph once when the workflow arrives.
  const loadedRef = useRef(false)
  useEffect(() => {
    if (!workflow || loadedRef.current) return
    loadedRef.current = true
    const g = parseGraph(workflow.graph_json)
    const flowNodes = g.nodes.map(toFlowNode)
    const nodesById = new Map(g.nodes.map((n) => [n.id, n]))
    const flowEdges = g.edges.map((e) => toFlowEdge(e, nodesById))
    lastSavedRef.current = serialize(workflow.name, flowNodes, flowEdges)
    setName(workflow.name)
    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [workflow, setNodes, setEdges])

  // Restore the last execution's previews/statuses once the graph is loaded.
  const restoredRef = useRef(false)
  useEffect(() => {
    if (!workflow || !loadedRef.current || restoredRef.current) return
    if (!lastExecution) return
    restoredRef.current = true
    const res = lastExecution as ExecutionResponse
    if (!res.execution) return
    applyExecutionToNodes(res)
    if (res.execution.status === "running" || res.execution.status === "queued") {
      // Previous run is still going: resume polling instead of restoring a snapshot.
      setRunning(true)
      setQueueInfo(res.queue ?? null)
      setExecutionId(res.execution.id)
    }
  }, [workflow, lastExecution, applyExecutionToNodes])

  // Redirect when unauthenticated.
  useEffect(() => {
    if (embedded) return
    if (!meLoading && !me) router.push("/login")
  }, [embedded, meLoading, me, router])

  // Autosave (debounced).
  useEffect(() => {
    if (!workflow || !loadedRef.current) return
    const snapshot = serialize(name, nodes, edges)
    if (snapshot === lastSavedRef.current) return
    setSaveState("unsaved")
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      setSaveState("saving")
      updateWorkflow.mutate(
        {
          id: workflow.id,
          name,
          graph_json: { nodes: fromFlowNodes(nodes), edges: fromFlowEdges(edges) },
        },
        {
          onSuccess: () => {
            lastSavedRef.current = snapshot
            setSaveState("saved")
          },
          onError: () => setSaveState("unsaved"),
        }
      )
    }, 1200)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, name])

  // Keep the selection in sync with React Flow's own selection state.
  useEffect(() => {
    if (selectedId && !nodes.some((n) => n.id === selectedId)) setSelectedId(null)
  }, [nodes, selectedId])

  const onConnect = useCallback(
    (connection: Connection) => {
      const isTool = connection.sourceHandle === "tool"
      const err = validateConnection(
        edges as unknown as GraphEdge[],
        nodes as unknown as GraphNode[],
        connection.source,
        connection.target,
        isTool ? "tool" : undefined,
        connection.targetHandle || undefined
      )
      if (err) {
        setRunError(err)
        return
      }
      if (!isTool && wouldCycle(edges as unknown as GraphEdge[], connection.source, connection.target)) {
        setRunError("This connection would create a cycle")
        return
      }
      setRunError("")
      const sNode = nodes.find((n) => n.id === connection.source)
      const sType = sNode ? String((sNode.data as Record<string, unknown>).nodeType || "") : ""
      setEdges((eds) =>
        addEdge(
          styledEdge(
            {
              ...connection,
              id: `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
            },
            isTool ? "tool" : "data",
            sType
          ),
          eds
        )
      )
    },
    [edges, nodes, setEdges]
  )

  // Add a node at a given flow position (defaults to the viewport center).
  const onAddNode = useCallback(
    (type: string, at?: { x: number; y: number }) => {
      const kind = nodeKind(type)
      if (!kind) return
      let pos = at
      if (!pos) {
        const el = wrapperRef.current
        if (rf.current && el) {
          const r = el.getBoundingClientRect()
          const c = rf.current.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
          pos = { x: c.x - 130 + (Math.random() - 0.5) * 60, y: c.y - 80 + (Math.random() - 0.5) * 60 }
        } else {
          pos = { x: 120, y: 100 }
        }
      }
      const node = makeNode(kind, pos.x, pos.y)
      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), { ...toFlowNode(node), selected: true }])
      setSelectedId(node.id)
    },
    [setNodes]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const type = e.dataTransfer.getData("application/zyvro-node")
      if (!type || !rf.current) return
      const p = rf.current.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      onAddNode(type, { x: p.x - 130, y: p.y - 20 })
    },
    [onAddNode]
  )

  // Apply execution statuses to nodes.
  useEffect(() => {
    if (!executionId) return
    let cancelled = false
    const poll = async () => {
      try {
        const res = await api.getExecution(executionId)
        if (cancelled) return
        applyExecutionToNodes(res)
        setQueueInfo(res.queue ?? null)
        if (res.execution.status === "completed" || res.execution.status === "failed" || res.execution.status === "cancelled") {
          setRunning(false)
          setQueueInfo(null)
          if (res.execution.status === "failed") {
            setRunError(res.execution.error || "Execution failed")
          } else if (res.execution.status === "cancelled") {
            setExecutionCancelled(true)
          } else {
            setExecutionDone(true)
          }
          return
        }
        setTimeout(poll, 1500)
      } catch {
        if (!cancelled) setTimeout(poll, 2000)
      }
    }
    poll()
    return () => {
      cancelled = true
    }
  }, [executionId, applyExecutionToNodes])

  const inputDefs = useMemo(() => runtimeInputDefs(fromFlowNodes(nodes)), [nodes])
  const unnamedInputs = useMemo(() => unnamedInputNodes(fromFlowNodes(nodes)), [nodes])
  // position > 0 means this run is still waiting behind other jobs; 0 means
  // it is actually executing; -1 means the queue lost track of it (finished,
  // or a server restart) so we fall back to the plain "Running…" state.
  const isQueued = running && queueInfo !== null && queueInfo.position > 0

  // Run button: ask for declared runtime inputs first, otherwise run directly.
  function onRun() {
    if (inputDefs.length > 0 && !showRunPanel) {
      setSelectedId(null)
      setShowRunPanel(true)
      return
    }
    void startRun()
  }

  // Run a single node via its card menu: only that node and its uncached
  // ancestors execute server-side (target_node_id subgraph run). Upstream
  // nodes with unchanged fingerprints are replayed from the previous run.
  async function runSingleNode(nodeId: string) {
    if (!workflow || running) return
    setRunError("")
    setMissingKeys(null)
    setExecutionDone(false)
    setExecutionCancelled(false)
    setQueueInfo(null)
    setRunning(true)
    setShowRunPanel(false)
    // Reset only the target and its upstream chain, like the backend subgraph.
    const ancestors = upstreamOf(edges as unknown as GraphEdge[], nodeId)
    const affected = new Set([nodeId, ...ancestors])
    setNodes((nds) =>
      nds.map((n) =>
        affected.has(n.id)
          ? { ...n, data: { ...(n.data as Record<string, unknown>), _status: "queued", _error: undefined, _output: undefined, _previewUrl: undefined } }
          : n
      )
    )
    try {
      const g = { nodes: fromFlowNodes(nodes), edges: fromFlowEdges(edges) }
      await api.updateWorkflow(workflow.id, { name, graph_json: g })
      lastSavedRef.current = serialize(name, nodes, edges)
      setSaveState("saved")
      const inputs: Record<string, unknown> = {}
      for (const def of inputDefs) {
        const v = runtimeInputs[def.key]
        if (v) inputs[def.key] = v
      }
      const res = await api.runExecution(workflow.id, inputs, { targetNodeId: nodeId })
      setQueueInfo(res.queue ?? null)
      setExecutionId(res.execution_id)
    } catch (err) {
      setRunning(false)
      clearQueuedBadges()
      const missing = missingProviderKeys(err)
      const local = localOnlyNodes(err)
      const unknown = unknownNode(err)
      if (missing) {
        pendingRunRef.current = { nodeId }
        setMissingKeys(missing)
      } else if (local) {
        setRunError(local.hint)
      } else if (unknown) {
        // La phrase d'abord, parce qu'elle nomme le nœud et le pack ; le
        // conseil ensuite, parce qu'il dit quoi faire.
        setRunError(`${unknown.error}. ${unknown.hint}`)
      } else if (err instanceof ApiError && err.status === 429) {
        setRunError(err.message)
      } else {
        setRunError(err instanceof Error ? err.message : "Run failed")
      }
    }
  }

  // Zynode cards are rendered from a static nodeTypes map, so the per-node
  // "Run this node" action goes through the module-level bridge.
  useEffect(() => {
    setRunNodeHandler(runSingleNode)
    return () => setRunNodeHandler(null)
  })

  // A run that never started must not leave the canvas looking busy: the
  // optimistic "queued" badges are cleared when the server refuses.
  function clearQueuedBadges() {
    setNodes((nds) =>
      nds.map((n) =>
        (n.data as Record<string, unknown>)?._status === "queued"
          ? { ...n, data: { ...(n.data as Record<string, unknown>), _status: undefined } }
          : n
      )
    )
  }

  async function startRun() {
    if (!workflow) return
    setShowRunPanel(false)
    setRunError("")
    setMissingKeys(null)
    setExecutionDone(false)
    setExecutionCancelled(false)
    setQueueInfo(null)
    setRunning(true)
    // Reset node states.
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...(n.data as Record<string, unknown>), _status: "queued", _error: undefined, _output: undefined, _previewUrl: undefined },
      }))
    )
    try {
      // Save before running (graph snapshot).
      const g = { nodes: fromFlowNodes(nodes), edges: fromFlowEdges(edges) }
      await api.updateWorkflow(workflow.id, { name, graph_json: g })
      lastSavedRef.current = serialize(name, nodes, edges)
      setSaveState("saved")
      const inputs: Record<string, unknown> = {}
      for (const def of inputDefs) {
        const v = runtimeInputs[def.key]
        if (v) inputs[def.key] = v
      }
      const res = await api.runExecution(workflow.id, inputs)
      setQueueInfo(res.queue ?? null)
      setExecutionId(res.execution_id)
    } catch (err) {
      setRunning(false)
      clearQueuedBadges()
      const missing = missingProviderKeys(err)
      const local = localOnlyNodes(err)
      const unknown = unknownNode(err)
      if (missing) {
        pendingRunRef.current = {}
        setMissingKeys(missing)
      } else if (local) {
        setRunError(local.hint)
      } else if (unknown) {
        // La phrase d'abord, parce qu'elle nomme le nœud et le pack ; le
        // conseil ensuite, parce qu'il dit quoi faire.
        setRunError(`${unknown.error}. ${unknown.hint}`)
      } else if (err instanceof ApiError && err.status === 429) {
        setRunError(err.message)
      } else {
        setRunError(err instanceof Error ? err.message : "Run failed")
      }
    }
  }

  // Un lot ne s'affiche que là où il y a un dossier de projet : il en liste un,
  // et il n'y en a pas sur l'API hébergée. C'est exactement le signal que les
  // nœuds de fichier utilisent déjà — l'hôte déclare ce qu'il sait faire — donc
  // pas un second test qui dirait un jour autre chose.
  const canBatch = Boolean(hostCapabilities().pickProjectFile)

  async function startBatch() {
    if (!workflow || !batchInput) return
    setBatchError("")
    setBatchBusy(true)
    try {
      // Sauver avant de lancer, comme un run : 519 exécutions du graphe d'hier
      // seraient 519 fichiers à refaire.
      const g = { nodes: fromFlowNodes(nodes), edges: fromFlowEdges(edges) }
      await api.updateWorkflow(workflow.id, { name, graph_json: g })
      lastSavedRef.current = serialize(name, nodes, edges)
      setSaveState("saved")
      // Les autres entrées gardent leur valeur, la même pour toutes les
      // exécutions ; celle du lot est remplie par le pilote, fichier par
      // fichier, et ce qu'on aurait tapé dedans serait faux pour 518 d'entre
      // elles.
      const shared: Record<string, unknown> = {}
      for (const def of inputDefs) {
        if (def.key === batchInput) continue
        const v = runtimeInputs[def.key]
        if (v) shared[def.key] = v
      }
      const res = await api.runBatch(workflow.id, {
        input: batchInput,
        dir: batchDir.trim(),
        match: batchMatch.trim(),
        recursive: batchRecursive,
        inputs: shared,
      })
      setBatchId(res.batch_id)
      setShowRunPanel(false)
    } catch (err) {
      // Le refus reste sous les yeux, dans le panneau où l'on vient de choisir
      // le dossier : il dit ce qui ne va pas de ce choix-là.
      setBatchError(err instanceof Error ? err.message : "The batch was refused")
    } finally {
      setBatchBusy(false)
    }
  }

  const batchDraft: BatchDraft = {
    can: canBatch,
    input: batchInput,
    dir: batchDir,
    match: batchMatch,
    recursive: batchRecursive,
    error: batchError,
    busy: batchBusy,
    setInput: (key) => {
      setBatchInput(key)
      setBatchError("")
    },
    setDir: setBatchDir,
    setMatch: setBatchMatch,
    setRecursive: setBatchRecursive,
    run: () => void startBatch(),
  }

  const selectedNode = nodes.find((n) => n.id === selectedId)
  // The available node set can grow while the editor is open, when a pack is
  // installed, so it is read from the store rather than captured once.
  const nodeKinds = useSyncExternalStore(subscribeNodeKinds, getNodeKinds, getNodeKinds)
  const filteredKinds = nodeKinds.filter((k) => {
    if (palette && palette !== "All" && k.category !== palette) return false
    if (!search) return true
    const q = search.toLowerCase()
    return k.label.toLowerCase().includes(q) || k.type.toLowerCase().includes(q) || k.description.toLowerCase().includes(q)
  })

  if (meLoading)
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 zy-spin" /> Loading…
      </div>
    )

  const initial = (me?.name || me?.email || "?").trim().charAt(0).toUpperCase()

  return (
    <div
      className={cn(
        "flex bg-background text-foreground overflow-hidden",
        // Voir globals.css : rend sa gouttière de défilement à la page, parce
        // qu'ici rien ne défile et que la toile va jusqu'au bord.
        embedded ? "h-full" : "h-screen zy-fullbleed"
      )}
    >
      {/* Left rail */}
      <nav className="flex w-16 shrink-0 flex-col items-center border-r border-white/[0.06] bg-background py-3">
        {!embedded && (
          <>
            <Link href="/dashboard" className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-icon.png" alt="Zyvro" className="h-9 w-9 rounded-lg" />
            </Link>
            <Link
              href="/dashboard"
              className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
              title="Back to dashboard"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </>
        )}

        <RailButton
          active={palette === "All"}
          icon={LayoutGrid}
          label="All"
          onClick={() => setPalette((p) => (p === "All" ? null : "All"))}
        />
        {CATEGORIES.map((c) => (
          <RailButton
            key={c.id}
            active={palette === c.id}
            icon={c.icon}
            label={c.label}
            onClick={() => setPalette((p) => (p === c.id ? null : c.id))}
          />
        ))}

        <div className="flex-1" />
        {!embedded && (
          <>
            <Link href="/chat" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/[0.06] hover:text-foreground" title="Chat">
              <MessageSquare className="h-4 w-4" />
            </Link>
            <Link href="/settings" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/[0.06] hover:text-foreground" title="Settings">
              <Settings className="h-4 w-4" />
            </Link>
            <div className="mt-2 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-semibold text-muted-foreground" title={me?.email}>
              {initial}
            </div>
          </>
        )}
      </nav>

      {/* Canvas + floating chrome */}
      <div className="relative flex-1" ref={wrapperRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes: NodeChange[]) => onNodesChange(changes)}
          onEdgesChange={(changes: EdgeChange[]) => onEdgesChange(changes)}
          onConnect={onConnect}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(null)}
          onInit={(inst) => {
            rf.current = inst
            setZoom(inst.getZoom())
          }}
          onMove={(_, vp) => setZoom(vp.zoom)}
          onDrop={onDrop}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = "move"
          }}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          panOnDrag={tool === "hand" ? true : [1, 2]}
          selectionOnDrag={tool === "select"}
          panOnScroll
          zoomOnScroll={false}
          zoomOnPinch
          minZoom={0.15}
          maxZoom={2}
          fitView
          fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
          defaultEdgeOptions={{ type: "default" }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,0.07)" />
          {showMinimap && <MiniMap position="bottom-right" pannable zoomable style={{ marginBottom: 72 }} />}
        </ReactFlow>

        {/* Top bar */}
        {/* La barre du haut, et la raison de tous les `min-w-0` qui suivent.
            Une erreur d'exécution s'affiche à gauche des boutons, dans la même
            rangée. Sans rien qui cède, la rangée s'allonge au-delà de la
            fenêtre et pousse « Run Workflow » hors de l'écran — au moment
            précis où on veut le reprendre. Ce qui cède, c'est le texte de
            l'erreur, qui se tronque déjà ; ce qui ne cède jamais, ce sont les
            boutons. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex min-w-0 items-start justify-between gap-3 p-3">
          <div className="pointer-events-auto flex min-w-0 items-center gap-2">
            <div className="panel flex h-11 items-center gap-2 pl-3 pr-2">
              <input
                className="w-64 bg-transparent text-[15px] font-medium outline-none placeholder:text-muted-foreground"
                value={name}
                placeholder="Untitled workflow"
                onChange={(e) => setName(e.target.value)}
              />
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                  saveState === "saved"
                    ? "bg-emerald-400/10 text-emerald-300"
                    : saveState === "saving"
                      ? "bg-amber-400/10 text-amber-300"
                      : "bg-white/[0.05] text-muted-foreground"
                )}
              >
                {saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving" : "Unsaved"}
              </span>
              {workflow && (
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                    workflow.visibility === "public"
                      ? "bg-primary/15 text-primary-foreground"
                      : workflow.visibility === "unlisted"
                        ? "bg-sky-400/10 text-sky-300"
                        : "bg-white/[0.05] text-muted-foreground"
                  )}
                >
                  {workflow.visibility === "public" ? "Public" : workflow.visibility === "unlisted" ? "Unlisted" : "Private"}
                </span>
              )}
            </div>
          </div>

          <div className="pointer-events-auto flex min-w-0 items-center gap-2">
            {runError && (
              <div
                className="panel flex h-11 min-w-0 max-w-sm shrink items-center gap-2 px-3 text-xs text-red-300"
                title={runError}
              >
                <span className="truncate">{runError}</span>
                <button
                  onClick={() => setRunError("")}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {!runError && executionDone && (
              <div className="panel flex h-11 shrink-0 items-center px-3 text-xs text-emerald-300">Run completed</div>
            )}
            {!runError && executionCancelled && (
              <div className="panel flex h-11 shrink-0 items-center px-3 text-xs text-muted-foreground">Run cancelled</div>
            )}
            {!runError && isQueued && (
              <div className="panel flex h-11 min-w-0 shrink items-center gap-2 px-3 text-xs text-amber-300">
                <Hourglass className="h-3.5 w-3.5 shrink-0" />
                <span>
                  Queued, position {queueInfo!.position} of {queueInfo!.waiting}
                  {queueInfo!.avg_wait_ms > 0 && <> · recent runs waited {formatWaitEstimate(queueInfo!.avg_wait_ms)}</>}
                </span>
              </div>
            )}
            {workflow && !embedded && (
              <Button
                size="lg"
                variant="outline"
                className="h-11 shrink-0 px-4"
                onClick={() => {
                  setShareTab("share")
                  setShareOpen(true)
                }}
              >
                <UserRoundPlus /> Share
              </Button>
            )}

            <Button
              size="lg"
              variant="outline"
              onClick={onRun}
              disabled={running}
              className="h-11 shrink-0 px-5 border-primary/45 bg-primary/[0.06] text-foreground/90 hover:bg-primary/15 hover:text-foreground"
            >
              {running ? isQueued ? <Hourglass className="h-4 w-4" /> : <Loader2 className="zy-spin" /> : <ArrowRight />}
              {running ? (isQueued ? "Queued…" : "Running…") : "Run Workflow"}
            </Button>

            {workflow && !embedded && (
              <div className="relative shrink-0">
                <div className="flex h-11 overflow-hidden rounded-lg shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_4px_16px_hsl(var(--primary)/0.35)]">
                  <button
                    className="flex items-center gap-2 bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    onClick={() => {
                      setShareTab("publish")
                      setShareOpen(true)
                      setPublishMenuOpen(false)
                    }}
                  >
                    <Globe className="h-4 w-4" /> Publish
                  </button>
                  <button
                    className="flex items-center justify-center border-l border-black/25 bg-primary px-2 text-primary-foreground transition-colors hover:bg-primary/90"
                    onClick={() => setPublishMenuOpen((v) => !v)}
                    aria-label="Publish options"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
                {publishMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setPublishMenuOpen(false)} />
                    <div className="panel absolute right-0 top-[calc(100%+0.5rem)] z-50 w-48 overflow-hidden p-1">
                      {workflow.visibility === "public" ? (
                        <>
                          <PublishMenuItem
                            onClick={() => {
                              setShareTab("publish")
                              setShareOpen(true)
                              setPublishMenuOpen(false)
                            }}
                          >
                            Edit listing
                          </PublishMenuItem>
                          <PublishMenuItem
                            onClick={() => {
                              setPublishMenuOpen(false)
                              updateWorkflow.mutate({ id: workflow.id, visibility: "private" })
                            }}
                          >
                            Unpublish
                          </PublishMenuItem>
                        </>
                      ) : (
                        <>
                          <PublishMenuItem
                            onClick={() => {
                              setShareTab("publish")
                              setShareOpen(true)
                              setPublishMenuOpen(false)
                            }}
                          >
                            Publish to Explore
                          </PublishMenuItem>
                          <PublishMenuItem
                            onClick={() => {
                              setShareTab("publish")
                              setShareOpen(true)
                              setPublishMenuOpen(false)
                            }}
                          >
                            Edit listing
                          </PublishMenuItem>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {missingKeys && (
          <MissingKeysPanel
            missing={missingKeys}
            className="pointer-events-auto absolute right-3 top-16 z-40 w-[26rem] max-w-[90vw]"
            onDismiss={() => {
              setMissingKeys(null)
              pendingRunRef.current = null
            }}
            onResolved={() => {
              const pending = pendingRunRef.current
              setMissingKeys(null)
              pendingRunRef.current = null
              if (pending?.nodeId) void runSingleNode(pending.nodeId)
              else void startRun()
            }}
          />
        )}

        {/* Les deux panneaux de droite vivent dans la même colonne, en flux.
            Mesuré dans l'application avant d'être écrit : posés chacun en
            absolu — l'un en haut, l'autre en bas — ils se recouvraient de cent
            pixels dans un onglet d'éditeur, et le bouton « Run over the folder »
            se retrouvait sous le panneau du lot, donc incliquable. La colonne
            ne laisse pas passer les clics là où elle est vide. */}
        {(showRunPanel || (batchId && batchState.data)) && (
        <div className="pointer-events-none absolute bottom-3 right-3 top-16 z-40 flex w-96 flex-col gap-2">
        {showRunPanel && (
          <RunPanel
            defs={inputDefs}
            unnamed={unnamedInputs}
            values={runtimeInputs}
            onChange={(key, v) => setRuntimeInputs((prev) => ({ ...prev, [key]: v }))}
            onClose={() => setShowRunPanel(false)}
            onRun={() => void startRun()}
            onReveal={(nodeId) => {
              // Le panneau se ferme et le nœud s'ouvre : nommer une entrée se
              // fait là où elle est, pas dans une fenêtre qui parle d'elle.
              setShowRunPanel(false)
              setSelectedId(nodeId)
            }}
            batch={batchDraft}
            mcpHint={`zyvro_run_workflow {"workflow_id": "${workflow?.id || ""}", "inputs": {${inputDefs
              .map((d) => `"${d.key}": ${d.type === "image" ? '"<data URL or http URL>"' : '"..."'}`)
              .join(", ")}}}`}
          />
        )}

        {batchId && batchState.data && (
          <BatchPanel
            data={batchState.data}
            busy={batchBusy}
            onClose={() => {
              // Fermer la fenêtre n'arrête pas le lot — il n'est pas à nous, il
              // tourne dans le moteur — et le rouvrir n'existe pas encore : le
              // bouton ne s'affiche donc qu'une fois le lot fini.
              setBatchId(null)
            }}
            onCancel={async () => {
              setBatchBusy(true)
              try {
                await api.cancelBatch(batchId)
                await batchState.refetch()
              } finally {
                setBatchBusy(false)
              }
            }}
            onResume={async () => {
              setBatchBusy(true)
              try {
                await api.retryBatch(batchId)
                await batchState.refetch()
              } finally {
                setBatchBusy(false)
              }
            }}
          />
        )}
        </div>
        )}

        {/* Node palette flyout */}
        {palette && (
          <div className="panel absolute left-3 top-16 z-30 flex max-h-[calc(100%-9rem)] w-72 flex-col overflow-hidden">
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <div>
                <div className="text-sm font-semibold">{palette === "All" ? "All nodes" : categoryMeta(palette).label}</div>
                <div className="text-[11px] text-muted-foreground">Click or drag onto the canvas</div>
              </div>
              <button onClick={() => setPalette(null)} className="rounded-md p-1 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="h-9 pl-8 text-xs" placeholder="Search nodes…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
              </div>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
              {filteredKinds.length === 0 && <div className="px-2 py-6 text-center text-xs text-muted-foreground">No node matches.</div>}
              {filteredKinds.map((k) => {
                const Icon = nodeIcon(k.type)
                const meta = categoryMeta(k.category)
                return (
                  <button
                    key={k.type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/zyvro-node", k.type)
                      e.dataTransfer.effectAllowed = "move"
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.06] active:cursor-grabbing"
                    onClick={() => onAddNode(k.type)}
                    title={k.description}
                  >
                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", meta.plate)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-medium">{k.label}</span>
                        {/* A local-only node is worth showing on the web even
                            though it cannot run there: it is how someone finds
                            out the desktop app can do this at all. */}
                        {k.localOnly && !embedded && (
                          <span className="shrink-0 rounded bg-white/[0.08] px-1 py-px text-[9px] uppercase tracking-wide text-muted-foreground">
                            Desktop
                          </span>
                        )}
                        {k.pack && (
                          <span
                            className="shrink-0 rounded bg-violet-400/15 px-1 py-px text-[9px] uppercase tracking-wide text-violet-300"
                            title={`From the ${k.pack} pack`}
                          >
                            {k.pack}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-[10px] text-muted-foreground">{k.description}</span>
                    </span>
                    <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Bottom toolbar */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center">
          <div className="panel pointer-events-auto flex h-11 items-center gap-0.5 px-1.5">
            <ToolbarButton active={tool === "select"} onClick={() => setTool("select")} title="Select (drag to marquee)">
              <MousePointer2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton active={tool === "hand"} onClick={() => setTool("hand")} title="Pan">
              <Hand className="h-4 w-4" />
            </ToolbarButton>
            <Divider />
            <ToolbarButton onClick={() => rf.current?.zoomOut({ duration: 150 })} title="Zoom out">
              <Minus className="h-4 w-4" />
            </ToolbarButton>
            <button
              className="min-w-[3.5rem] rounded-md px-1 text-center text-xs tabular-nums text-muted-foreground hover:text-foreground"
              onClick={() => rf.current?.zoomTo(1, { duration: 200 })}
              title="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <ToolbarButton onClick={() => rf.current?.zoomIn({ duration: 150 })} title="Zoom in">
              <Plus className="h-4 w-4" />
            </ToolbarButton>
            <Divider />
            <ToolbarButton onClick={() => rf.current?.fitView({ padding: 0.25, duration: 300, maxZoom: 1 })} title="Fit view">
              <Maximize2 className="h-4 w-4" />
            </ToolbarButton>
            <ToolbarButton active={showMinimap} onClick={() => setShowMinimap((v) => !v)} title="Minimap">
              <MapIcon className="h-4 w-4" />
            </ToolbarButton>
            <Divider />
            <div className="px-2 text-xs text-muted-foreground">
              {nodes.length} nodes · {edges.length} links
            </div>
          </div>
        </div>

        {/* Properties panel */}
        {selectedNode && (
          <PropertiesPanel
            key={selectedNode.id}
            node={selectedNode}
            onClose={() => setSelectedId(null)}
            onDelete={() => {
              setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id))
              setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id))
              setSelectedId(null)
            }}
            onConfigChange={(config) => {
              setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, config } } : n)))
            }}
            onLabelChange={(label) => {
              setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? { ...n, data: { ...n.data, label } } : n)))
            }}
          />
        )}

        {/* Pas dans le desktop.
            
            Cette bulle flottante est l'assistant du site, qui parle au service
            hébergé. Le desktop a déjà son panneau Agent à droite, qui parle au
            CLI installé sur la machine : deux assistants dans la même fenêtre,
            avec deux cerveaux différents, et l'un des deux posé par-dessus le
            canvas sans que rien ne dise lequel on ouvre. */}
        {!embedded && (
          <ChatDock
            suggestions={[
              `Run "${name || "this workflow"}" for me`,
              "What inputs does this workflow need?",
              "Which workflows do I have?",
            ]}
          />
        )}

        {workflow && <ShareDialog workflow={workflow} open={shareOpen} onOpenChange={setShareOpen} initialTab={shareTab} />}
      </div>
    </div>
  )
}

// ---------- chrome bits ----------

function RailButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn("mb-1 flex w-14 flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium transition-colors", active ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
          active ? "border-primary/60 bg-primary/20 text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.35)]" : "border-transparent hover:bg-white/[0.06]"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      {label}
    </button>
  )
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        active ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.45)]" : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-white/10" />
}

function PublishMenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-md px-2.5 py-1.5 text-left text-xs text-foreground/90 transition-colors hover:bg-white/[0.06] hover:text-foreground"
    >
      {children}
    </button>
  )
}

// ---------- helpers ----------

// Data-edge ancestors of a node (transitive), mirroring the backend's
// SubgraphForNode so client-side status resets match the server's subgraph.
function upstreamOf(edges: GraphEdge[], nodeId: string): string[] {
  const parents = new Map<string, string[]>()
  for (const e of edges) {
    if (e.type === "tool") continue
    parents.set(e.target, [...(parents.get(e.target) || []), e.source])
  }
  const seen = new Set<string>()
  const queue = [...(parents.get(nodeId) || [])]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    queue.push(...(parents.get(id) || []))
  }
  return [...seen]
}

// Human-readable duration. Used for the queue's recent average wait, which is
// reported as-is: the server measures the mean wait across recent runs, and
// scaling it by queue position would invent precision it never had.
function formatWaitEstimate(ms: number): string {
  if (ms < 1000) return "a few seconds"
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `about ${seconds}s`
  const minutes = Math.round(seconds / 60)
  return `about ${minutes}m`
}

function serialize(name: string, nodes: Node[], edges: Edge[]): string {
  return JSON.stringify({ name, nodes: fromFlowNodes(nodes), edges: fromFlowEdges(edges) })
}

function parseGraph(g: string | Graph): Graph {
  if (typeof g === "string") {
    try {
      return JSON.parse(g) as Graph
    } catch {
      return { nodes: [], edges: [] }
    }
  }
  return g
}

function toFlowNode(n: GraphNode): Node {
  const kind = nodeKind(n.type)
  const data = { ...n.data, nodeType: n.type }
  if (kind && kind.outputs.length === 0) (data as Record<string, unknown>).hasOutput = false
  if (kind && kind.inputs.length === 0) (data as Record<string, unknown>).hasInput = false
  return {
    id: n.id,
    type: "zynode",
    position: n.position,
    data,
  }
}

// Edge colors follow the port palette declared in globals.css.
const PORT_COLORS: Record<PortType | "tool", string> = {
  text: "hsl(262 83% 68%)",
  image: "hsl(172 66% 50%)",
  video: "hsl(200 90% 60%)",
  json: "hsl(38 92% 55%)",
  any: "hsl(240 5% 58%)",
  tool: "hsl(350 89% 60%)",
}

// Unified edge styling: bezier edges colored by the source port type.
// "tool" edges (capability links into a Brain) are dashed, rose and animated.
// The edge kind is kept in `data.kind` so it survives round-trips.
function styledEdge(e: Edge, kind: "data" | "tool", sourceType: string): Edge {
  const isTool = kind === "tool"
  const sKind = nodeKind(sourceType)
  const port: PortType | "tool" = isTool ? "tool" : sKind?.outputs[0] || "any"
  const color = PORT_COLORS[port]
  return {
    ...e,
    type: "default",
    data: { ...(e.data || {}), kind },
    animated: isTool,
    style: isTool ? { stroke: color, strokeWidth: 1.5, strokeDasharray: "6 4" } : { stroke: color, strokeWidth: 1.5 },
  }
}

function toFlowEdge(e: GraphEdge, nodesById: Map<string, GraphNode>): Edge {
  const isTool = e.type === "tool"
  let targetHandle = e.targetHandle || "in"
  const tNode = nodesById.get(e.target)
  const tKind = tNode ? nodeKind(tNode.type) : undefined
  const sNode = nodesById.get(e.source)
  const sKind = sNode ? nodeKind(sNode.type) : undefined
  // Legacy edges all use "in"; multi-port targets need the typed handle.
  if (!isTool && tKind && tKind.inputs.length > 1) {
    const valid = inputHandleIds(tKind)
    if (!valid.includes(targetHandle) && sKind) {
      const out = sKind.outputs[0] || "any"
      targetHandle =
        valid.find((h) => portOfHandle(h) === out && sKind.outputs.includes(portOfHandle(h) as never)) ||
        valid.find((h) => portOfHandle(h) === out) ||
        valid[0]
    }
  }
  return styledEdge(
    {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: isTool ? "tool" : e.sourceHandle || "out",
      targetHandle: isTool ? "in" : targetHandle,
    },
    isTool ? "tool" : "data",
    sNode?.type || ""
  )
}

function fromFlowNodes(nodes: Node[]): GraphNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: (n.data as Record<string, unknown>).nodeType as string,
    position: n.position,
    data: {
      label: (n.data as Record<string, unknown>).label as string | undefined,
      config: (n.data as Record<string, unknown>).config as Record<string, unknown> | undefined,
    },
  }))
}

function fromFlowEdges(edges: Edge[]): GraphEdge[] {
  return edges.map((e) => {
    const kind = ((e.data as Record<string, unknown> | undefined)?.kind as string) || (e.sourceHandle === "tool" ? "tool" : "data")
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: kind === "tool" ? "out" : e.sourceHandle || "out",
      targetHandle: e.targetHandle || "in",
      type: kind,
    }
  })
}

// ---------- run panel ----------

function RunPanel({
  defs,
  unnamed,
  values,
  onChange,
  onClose,
  onRun,
  onReveal,
  batch,
  mcpHint,
}: {
  defs: RuntimeInputDef[]
  unnamed: Array<{ nodeId: string; type: string; label: string }>
  values: Record<string, string>
  onChange: (key: string, v: string) => void
  onClose: () => void
  onRun: () => void
  onReveal: (nodeId: string) => void
  batch: BatchDraft
  mcpHint: string
}) {
  // L'entrée pilotée par le dossier n'est pas « manquante » : c'est le pilote
  // qui la remplit, une fois par fichier.
  const missing = defs.filter((d) => d.key !== batch.input && !d.hasDefault && !values[d.key])
  const [copied, setCopied] = useState(false)
  return (
    <div className="panel pointer-events-auto flex max-h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div>
          <div className="text-sm font-semibold">Run inputs</div>
          <div className="text-[11px] text-muted-foreground">Values for this run. Defaults are used when left empty.</div>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Les entrées que personne ne peut nommer.
            Elles ne sont pas une erreur — un workflow qui tourne toujours sur
            la même valeur n'a pas besoin de nom. Mais tant qu'elles n'en ont
            pas, aucune exécution ne peut les remplacer autrement qu'en
            désignant l'identifiant du nœud, qui n'est écrit nulle part. Dit
            ici, à l'endroit où l'on remplit justement des entrées. */}
        {unnamed.length > 0 && (
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
            <div className="text-[11px] font-semibold">
              {unnamed.length} input{unnamed.length > 1 ? "s" : ""} without a name
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              A run can only replace those by node id. Give one a name and it appears here, in the API call and in what
              an agent can pass.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {unnamed.map((n) => (
                <button
                  key={n.nodeId}
                  onClick={() => onReveal(n.nodeId)}
                  className="rounded border border-dashed border-white/25 px-1.5 py-[2px] font-mono text-[10px] text-muted-foreground hover:border-white/50 hover:text-foreground"
                  title="Open this node to give it a name"
                >
                  {n.label || n.nodeId}
                </button>
              ))}
            </div>
          </div>
        )}

        {defs.map((d) => (
          <div key={d.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="font-mono text-[11px] font-semibold text-primary-foreground/90">
                {"{"}{d.key}{"}"}
              </label>
              <div className="flex items-center gap-2">
                {/* Le seul geste qui fait passer d'une exécution à un lot, et il
                    est ici plutôt qu'ailleurs parce que la question est « d'où
                    vient cette valeur » : d'une case, ou d'un dossier. */}
                {batch.can && d.type === "text" && (
                  <button
                    className="text-[10px] text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
                    onClick={() => batch.setInput(batch.input === d.key ? null : d.key)}
                    title="Run this workflow once per file in a folder, this input carrying each path"
                  >
                    {batch.input === d.key ? "one value" : "from a folder"}
                  </button>
                )}
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {d.type} · {d.hasDefault ? "optional" : "required"}
                </span>
              </div>
            </div>
            {batch.input === d.key ? (
              <BatchFields batch={batch} />
            ) : d.type === "text" ? (
              <textarea
                className="min-h-20 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground/70 focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/25"
                placeholder={d.hasDefault ? "Leave empty to use the node's default" : `Value for ${d.label || d.key}`}
                value={values[d.key] || ""}
                onChange={(e) => onChange(d.key, e.target.value)}
              />
            ) : (
              <RunImageInput value={values[d.key] || ""} onChange={(v) => onChange(d.key, v)} hasDefault={d.hasDefault} />
            )}
          </div>
        ))}

        <div className="space-y-1.5 rounded-lg border border-white/[0.06] bg-black/20 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Same call via MCP</span>
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(mcpHint)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                } catch {
                  // clipboard unavailable
                }
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <code className="block whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed text-foreground/70">{mcpHint}</code>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] p-3">
        <span className="text-[11px] text-muted-foreground">
          {batch.error ? (
            <span className="text-red-300">{batch.error}</span>
          ) : missing.length > 0 ? (
            `${missing.length} required input${missing.length > 1 ? "s" : ""} missing`
          ) : batch.input ? (
            `One run per file, ${batch.input} carrying the path`
          ) : (
            "Ready"
          )}
        </span>
        {batch.input ? (
          <Button onClick={batch.run} disabled={missing.length > 0 || batch.busy}>
            {batch.busy ? <Loader2 className="zy-spin" /> : <Layers />} Run over the folder
          </Button>
        ) : (
          <Button onClick={onRun} disabled={missing.length > 0}>
            <Play /> Run
          </Button>
        )}
      </div>
    </div>
  )
}

// Ce qu'il faut savoir d'un lot avant de le lancer, et rien de plus : où
// chercher, quoi garder, jusqu'où descendre. Le nom de l'entrée n'y est pas —
// c'est celle sous laquelle ce bloc est ouvert.
type BatchDraft = {
  can: boolean
  input: string | null
  dir: string
  match: string
  recursive: boolean
  error: string
  busy: boolean
  setInput: (key: string | null) => void
  setDir: (v: string) => void
  setMatch: (v: string) => void
  setRecursive: (v: boolean) => void
  run: () => void
}

function BatchFields({ batch }: { batch: BatchDraft }) {
  const pick = hostCapabilities().pickProjectFile
  return (
    <div className="space-y-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        One run per file, each one getting that file&apos;s path here. An output path written with{" "}
        <code className="font-mono text-[10px] text-foreground/80">{"{{sourceStem}}"}</code> then names what it wrote
        after what it read.
      </p>
      <div className="flex gap-2">
        <Input
          className="h-8 text-xs"
          placeholder="Folder, e.g. sprites/abyssal — empty is the whole project"
          value={batch.dir}
          onChange={(e) => batch.setDir(e.target.value)}
        />
        {pick && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={async () => {
              const chosen = await pick({ directory: true, title: "Folder to run over", current: batch.dir })
              if (chosen !== null) batch.setDir(chosen)
            }}
          >
            <FolderOpen /> Browse
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Input
          className="h-8 flex-1 text-xs"
          placeholder="Match, e.g. *.png — empty is every file"
          value={batch.match}
          onChange={(e) => batch.setMatch(e.target.value)}
        />
        <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          <input
            type="checkbox"
            className="accent-primary"
            checked={batch.recursive}
            onChange={(e) => batch.setRecursive(e.target.checked)}
          />
          Subfolders
        </label>
      </div>
    </div>
  )
}

// Une ligne pour 519 exécutions. Elles existent toutes — chacune est dans
// l'historique, isolée, avec son propre résultat — mais ce qu'on regarde
// pendant qu'un lot tourne, c'est combien sont passées et lesquelles ont raté.
function BatchPanel({
  data,
  busy,
  onClose,
  onCancel,
  onResume,
}: {
  data: BatchResponse
  busy: boolean
  onClose: () => void
  onCancel: () => void
  onResume: () => void
}) {
  const { batch: b, counts: c } = data
  const live = b.status === "queued" || b.status === "running"
  const settled = c.completed + c.failed + c.cancelled
  const left = c.total - c.completed
  const failures = b.items.filter((i) => i.status === "failed").slice(0, 3)
  const where = b.dir ? b.dir : "the project folder"
  return (
    <div className="panel pointer-events-auto mt-auto flex max-h-[60%] w-full shrink-0 flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            Run over a folder
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {where}
            {b.match ? ` · ${b.match}` : ""} · <span className="font-mono">{b.input}</span>
          </div>
        </div>
        {/* Fermer pendant que ça tourne cacherait le seul endroit qui le
            montre, et le lot continuerait sans rien à l'écran. */}
        {!live && (
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-3 overflow-y-auto p-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className={cn("h-full rounded-full transition-all", c.failed > 0 ? "bg-red-400/70" : "bg-primary")}
            style={{ width: `${c.total === 0 ? 0 : Math.round((settled / c.total) * 100)}%` }}
          />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {live && <Loader2 className="h-3 w-3 zy-spin" />}
          <span>
            {c.completed} of {c.total} done
            {c.failed > 0 ? ` · ${c.failed} failed` : ""}
            {c.cancelled > 0 ? ` · ${c.cancelled} not run` : ""}
          </span>
        </div>

        {failures.length > 0 && (
          <div className="space-y-1.5 rounded-lg border border-red-400/20 bg-red-500/[0.06] p-3">
            {failures.map((f) => (
              <div key={f.path} className="min-w-0">
                <div className="truncate font-mono text-[10px] text-foreground/80">{f.path}</div>
                <div className="text-[11px] leading-relaxed text-red-200/80">{f.error}</div>
              </div>
            ))}
            {c.failed > failures.length && (
              <div className="text-[10px] text-muted-foreground">and {c.failed - failures.length} more</div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] p-3">
        <span className="text-[11px] text-muted-foreground">
          {live ? "Running one file at a time" : b.status === "completed" ? "Every file is done" : b.error || b.status}
        </span>
        {live ? (
          <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
            Stop
          </Button>
        ) : (
          left > 0 && (
            // Reprendre, pas recommencer : ce qui est écrit est écrit, et une
            // partie a été payée à un modèle.
            <Button size="sm" onClick={onResume} disabled={busy}>
              <RotateCcw /> Resume {left}
            </Button>
          )
        )}
      </div>
    </div>
  )
}

function RunImageInput({ value, onChange, hasDefault }: { value: string; onChange: (v: string) => void; hasDefault: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  const isData = value.startsWith("data:")
  return (
    <div className="space-y-2">
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (f) onChange(await fileToDataUrl(f))
          e.target.value = ""
        }}
      />
      {isData ? (
        <div className="checker overflow-hidden rounded-lg border border-white/[0.06]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="input" className="mx-auto max-h-40 object-contain" />
        </div>
      ) : (
        <Input
          className="h-9 text-xs"
          placeholder={hasDefault ? "Image URL (optional, node default otherwise)" : "https://… image URL"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => ref.current?.click()}>
          <Upload /> {isData ? "Replace file" : "Upload file"}
        </Button>
        {value && (
          <Button size="sm" variant="ghost" onClick={() => onChange("")}>
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------- properties panel ----------

function PropertiesPanel({
  node,
  onClose,
  onDelete,
  onConfigChange,
  onLabelChange,
}: {
  node: Node
  onClose: () => void
  onDelete: () => void
  onConfigChange: (config: Record<string, unknown>) => void
  onLabelChange: (label: string) => void
}) {
  const data = node.data as unknown as ZynodeProps["data"]
  const config = (data.config || {}) as Record<string, unknown>
  const nodeType = data.nodeType as string
  const kind = nodeKind(nodeType)
  const Icon = nodeIcon(nodeType)
  const meta = categoryMeta(kind?.category || "Utility")

  const fields = (CONFIG_FIELDS[nodeType] || []).filter(
    (f) => !f.showIf || String(config[f.showIf.key] ?? "") === f.showIf.value
  )
  const isRuntimeInput = nodeType === "textInput" || nodeType === "imageInput"

  return (
    <aside className="panel absolute right-3 top-16 z-30 flex max-h-[calc(100%-9rem)] w-80 flex-col overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-3 py-3">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", meta.plate)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{(data.label as string) || kind?.label}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{kind?.category === "AI" ? "Model" : kind?.category}</div>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        <Field label="Label">
          <Input className="h-9 text-sm" value={(data.label as string) || ""} onChange={(e) => onLabelChange(e.target.value)} />
        </Field>

        {isRuntimeInput && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 p-2.5 text-[11px] leading-snug text-foreground/80">
            Give this node an <b>input name</b> to expose it as a runtime input. The Run panel, the REST API and the MCP tool{" "}
            <code className="font-mono">zyvro_run_workflow</code> then accept it as <code className="font-mono">inputs.&lt;name&gt;</code>. Leave the
            value empty to make it required.
          </div>
        )}

        {nodeType === "brain" && (
          <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-2.5 text-[11px] leading-snug text-foreground/80">
            Drag from the rose port under any node into this Brain to expose it as a <b>tool</b>. The Brain decides at runtime when to call it.
          </div>
        )}

        {/* Nommer la sortie d'après l'entrée.
            Écrit ici plutôt que laissé à deviner : le moteur sait le faire
            depuis le 18/09, et un motif que personne ne connaît n'existe pas.
            La liste est celle que `engine/provenance.go` remplace — et c'est le
            moteur qui refuse quand rien en amont n'a lu de fichier, pas ce
            panneau : une deuxième règle ici serait la deuxième qui a tort. */}
        {nodeType === "fileOutput" && (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5 text-[11px] leading-snug text-foreground/80">
            Name the file after the one that was read: <code className="font-mono">{"{{sourceName}}"}</code>{" "}
            <code className="font-mono">{"{{sourceStem}}"}</code> <code className="font-mono">{"{{sourceExt}}"}</code>{" "}
            <code className="font-mono">{"{{sourceDir}}"}</code> <code className="font-mono">{"{{sourcePath}}"}</code>. A file input anywhere upstream
            is what fills them — <code className="font-mono">{"out/{{sourceStem}}-hd{{sourceExt}}"}</code> turns{" "}
            <code className="font-mono">sprites/53013.png</code> into <code className="font-mono">out/53013-hd.png</code>.
          </div>
        )}

        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            {f.type === "path" ? (
              <PathField
                value={String(config[f.key] ?? "")}
                placeholder={f.placeholder}
                save={f.key === "path" && nodeType === "fileOutput"}
                onChange={(next) => onConfigChange({ ...config, [f.key]: next })}
              />
            ) : f.type === "checkbox" ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground/85">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                  checked={config[f.key] === undefined ? f.default === true : Boolean(config[f.key])}
                  onChange={(e) => onConfigChange({ ...config, [f.key]: e.target.checked })}
                />
                Yes
              </label>
            ) : f.type === "textarea" ? (
              <textarea
                className="min-h-24 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground/70 focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/25"
                value={String(config[f.key] ?? "")}
                onChange={(e) => onConfigChange({ ...config, [f.key]: e.target.value })}
              />
            ) : f.type === "select" ? (
              <select
                className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm focus:outline-none"
                value={String(config[f.key] ?? f.default ?? "")}
                onChange={(e) => onConfigChange({ ...config, [f.key]: e.target.value })}
              >
                {f.options?.map((o) => (
                  <option key={o} value={o}>
                    {f.optionLabels?.[o] ?? o}
                  </option>
                ))}
              </select>
            ) : f.type === "segmented" ? (
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
                {f.options?.map((o) => {
                  const active = String(config[f.key] ?? f.default ?? "") === o
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => onConfigChange({ ...config, [f.key]: o })}
                      className={cn(
                        "rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-colors",
                        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                      )}
                    >
                      {o}
                    </button>
                  )
                })}
              </div>
            ) : f.type === "aspectRatio" ? (
              <AspectRatioPicker
                options={f.options || []}
                value={String(config[f.key] ?? f.default ?? "1:1")}
                onChange={(v) => onConfigChange({ ...config, [f.key]: v })}
              />
            ) : f.type === "number" ? (
              <Input
                className="h-9 text-sm"
                type="number"
                step={f.step}
                value={String(config[f.key] ?? f.default ?? "")}
                onChange={(e) => onConfigChange({ ...config, [f.key]: Number(e.target.value) })}
              />
            ) : (
              <Input
                className="h-9 text-sm"
                placeholder={f.placeholder}
                value={String(config[f.key] ?? "")}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    // Input names are identifiers: keep them simple and stable.
                    [f.key]: f.key === "inputKey" ? e.target.value.replace(/[^A-Za-z0-9_-]/g, "_") : e.target.value,
                  })
                }
              />
            )}
          </Field>
        ))}

        {nodeType === "imageInput" && (
          <ImageUploadField dataUrl={String(config.dataUrl || "")} onSet={(dataUrl) => onConfigChange({ ...config, dataUrl })} />
        )}
      </div>

      <div className="border-t border-white/[0.06] p-2">
        <Button variant="ghost" size="sm" className="w-full justify-center text-red-300 hover:text-red-200" onClick={onDelete}>
          Delete node
        </Button>
      </div>
    </aside>
  )
}

// A path inside the open project. It is always typeable, because a workflow is
// a file people edit and share. The Browse button only appears where the host
// can actually open a file dialog, which in practice means the desktop app: on
// the web there is no project folder to browse.
function PathField({
  value,
  placeholder,
  save,
  onChange,
}: {
  value: string
  placeholder?: string
  save?: boolean
  onChange: (next: string) => void
}) {
  const pick = hostCapabilities().pickProjectFile

  return (
    <div className="flex gap-1.5">
      <Input
        className="h-9 flex-1 font-mono text-[13px]"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {pick && (
        <Button
          type="button"
          variant="outline"
          className="h-9 shrink-0 px-2.5 text-[13px]"
          onClick={() => {
            void pick({ save, current: value, title: save ? "Write to" : "Choose a file" }).then(
              (picked) => {
                if (picked !== null) onChange(picked)
              }
            )
          }}
        >
          <Search className="h-3.5 w-3.5" /> Browse
        </Button>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function ImageUploadField({ dataUrl, onSet }: { dataUrl: string; onSet: (v: string) => void }) {
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      onSet(await fileToDataUrl(file))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Field label="Image">
      <input ref={ref} type="file" accept="image/*" onChange={onFile} disabled={loading} className="hidden" />
      {dataUrl ? (
        <div className="checker overflow-hidden rounded-lg border border-white/[0.06]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="input" className="mx-auto max-h-48 object-contain" />
        </div>
      ) : (
        <button
          onClick={() => ref.current?.click()}
          className="w-full rounded-lg border border-dashed border-white/15 bg-black/20 p-6 text-center text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground"
        >
          Click to upload
        </button>
      )}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => ref.current?.click()} disabled={loading}>
          {dataUrl ? "Replace" : "Upload"}
        </Button>
        {dataUrl && (
          <Button size="sm" variant="ghost" onClick={() => onSet("")}>
            Remove
          </Button>
        )}
      </div>
    </Field>
  )
}

type ConfigField = {
  key: string
  label: string
  type: "text" | "textarea" | "select" | "number" | "aspectRatio" | "segmented" | "path" | "checkbox"
  options?: string[]
  // Readable labels for a select, keyed by option value. Without this a select
  // shows the raw value, so an empty option renders as a blank line.
  optionLabels?: Record<string, string>
  default?: string | number | boolean
  step?: string
  placeholder?: string
  showIf?: { key: string; value: string }
}

const ASPECT_RATIOS: Record<string, { w: number; h: number; label: string }> = {
  "1:1": { w: 1, h: 1, label: "Square" },
  "16:9": { w: 16, h: 9, label: "Landscape" },
  "9:16": { w: 9, h: 16, label: "Portrait" },
  "4:3": { w: 4, h: 3, label: "Classic" },
  "3:4": { w: 3, h: 4, label: "Book" },
}

function AspectRatioPicker({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {options.map((o) => {
        const ratio = ASPECT_RATIOS[o] || { w: 1, h: 1, label: o }
        const active = value === o
        return (
          <button
            key={o}
            type="button"
            title={ratio.label}
            onClick={() => onChange(o)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors",
              active ? "border-primary/70 bg-primary/15" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.06]"
            )}
          >
            <div
              className={cn("rounded-sm", active ? "bg-primary" : "bg-muted-foreground/40")}
              style={{ width: 20, height: Math.max(6, Math.round((20 * ratio.h) / ratio.w)) }}
            />
            <span className={cn("text-[9px] leading-none", active ? "text-foreground" : "text-muted-foreground")}>{o}</span>
          </button>
        )
      })}
    </div>
  )
}

const CONFIG_FIELDS: Record<string, ConfigField[]> = {
  textInput: [
    { key: "inputKey", label: "Input name (runtime)", type: "text", placeholder: "e.g. user_prompt" },
    { key: "value", label: "Default value", type: "textarea" },
  ],
  imageInput: [{ key: "inputKey", label: "Input name (runtime)", type: "text", placeholder: "e.g. reference_image" }],
  llm: [
    { key: "system", label: "System prompt", type: "textarea" },
    { key: "prompt", label: "Prompt (overrides input)", type: "textarea" },
    // Empty means the deployment default, which is what most nodes use.
    {
      key: "provider",
      label: "Provider",
      type: "select",
      // The two -cli entries run the command line tool installed on the
      // machine, which is how a ChatGPT or Claude subscription drives a node
      // without an API key. They only resolve in Zyvro Studio, the desktop app,
      // where the engine runs beside that installation.
      options: ["", "ollama", "anthropic", "openai", "claude-cli", "codex-cli"],
      optionLabels: {
        "": "Deployment default",
        ollama: "Ollama",
        anthropic: "Claude (Anthropic API)",
        openai: "OpenAI API",
        "claude-cli": "Claude CLI (desktop, your subscription)",
        "codex-cli": "Codex CLI (desktop, your subscription)",
      },
      default: "",
    },
    { key: "model", label: "Model (optional)", type: "text", placeholder: "the provider's default" },
    { key: "temperature", label: "Temperature", type: "number", default: 0.7, step: "0.1" },
    { key: "maxTokens", label: "Max tokens", type: "number", default: 2000 },
  ],
  fileInput: [
    { key: "path", label: "File", type: "path", placeholder: "assets/photo.png" },
    {
      key: "as",
      label: "Read as",
      type: "select",
      options: ["auto", "text", "image", "json"],
      optionLabels: {
        auto: "Auto (from the extension)",
        text: "Text",
        image: "Image",
        json: "JSON",
      },
      default: "auto",
    },
  ],
  fileOutput: [
    { key: "path", label: "Write to", type: "path", placeholder: "out/result.png" },
    { key: "createDirs", label: "Create missing folders", type: "checkbox", default: true },
  ],
  generateImage: [
    { key: "prompt", label: "Prompt (overrides input)", type: "textarea" },
    { key: "aspectRatio", label: "Aspect ratio", type: "aspectRatio", options: ["1:1", "16:9", "9:16", "4:3", "3:4"], default: "1:1" },
  ],
  // La vidéo est le seul nœud facturé à la seconde, et le tarif monte avec la
  // définition. Les deux réglages qui décident de la facture sont donc ici,
  // visibles, plutôt que dans un défaut de déploiement que personne ne relit.
  // De combien il monte n'est écrit nulle part, volontairement : chacun vient
  // avec son compte, et un chiffre recopié d'une grille vieillit mal.
  generateVideo: [
    { key: "prompt", label: "Prompt (overrides input)", type: "textarea" },
    {
      key: "provider",
      label: "Provider",
      type: "select",
      options: ["", "google", "bfl"],
      optionLabels: { "": "Whichever key this project has", google: "Veo (Google)", bfl: "FLUX (Black Forest Labs)" },
    },
    { key: "model", label: "Model", type: "text", placeholder: "Leave empty for the backend's own" },
    {
      key: "resolution",
      label: "Resolution",
      type: "select",
      options: ["", "hd", "fhd", "qhd", "uhd"],
      optionLabels: {
        "": "The backend's own (hd)",
        hd: "HD — 720p",
        fhd: "FHD — 1080p",
        qhd: "QHD — 1440p (FLUX only)",
        uhd: "UHD — 4K",
      },
    },
    // Zéro veut dire « celle du dos » : auto chez FLUX, huit secondes chez Veo.
    // FLUX prend 5 à 20 secondes entières, Veo prend 4, 6 ou 8.
    { key: "duration", label: "Seconds (0 = the backend's own)", type: "number", default: 0, step: "1" },
    {
      key: "aspectRatio",
      label: "Aspect ratio",
      type: "select",
      options: ["", "16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "2:1"],
      optionLabels: { "": "The backend's own", "1:1": "1:1 (FLUX only)", "4:3": "4:3 (FLUX only)", "3:4": "3:4 (FLUX only)", "21:9": "21:9 (FLUX only)", "2:1": "2:1 (FLUX only)" },
    },
    // Le passage à bas prix : un tiers du tarif, HD seulement, pour savoir si
    // la description est la bonne avant de payer la vraie.
    { key: "draft", label: "Draft — cheaper, HD, FLUX only", type: "checkbox", default: false },
  ],
  editImage: [{ key: "prompt", label: "Edit instruction", type: "textarea" }],
  removeBackground: [
    {
      key: "mode",
      label: "Mode",
      type: "segmented",
      options: ["ai", "programmatic"],
      default: "ai",
    },
    {
      key: "tolerance",
      label: "Tolerance",
      type: "number",
      default: 30,
      showIf: { key: "mode", value: "programmatic" },
    },
  ],
  rotateImage: [
    {
      key: "degrees",
      label: "Rotation",
      type: "segmented",
      options: ["90", "180", "270"],
      default: "90",
    },
  ],
  flipImage: [
    {
      key: "axis",
      label: "Axis",
      type: "segmented",
      options: ["h", "v"],
      default: "h",
    },
  ],
  vision: [{ key: "instruction", label: "Instruction", type: "textarea" }],
  mergeText: [{ key: "separator", label: "Separator", type: "text", default: "\\n" }],
  brain: [
    { key: "goal", label: "Goal (overrides input)", type: "textarea" },
    { key: "system", label: "System prompt", type: "textarea" },
    {
      key: "provider",
      label: "Provider",
      type: "select",
      options: ["", "ollama", "anthropic", "openai"],
      optionLabels: { "": "Deployment default", ollama: "Ollama", anthropic: "Claude (Anthropic)", openai: "OpenAI" },
      default: "",
    },
    { key: "model", label: "Model (optional)", type: "text", placeholder: "the provider's default" },
    { key: "maxSteps", label: "Max steps", type: "number", default: 6 },
  ],
  preview: [],
  voxelPreview: [
    {
      key: "shape",
      label: "Shape",
      type: "segmented",
      options: ["cube", "sphere"],
      default: "cube",
    },
  ],
  output: [],
}
