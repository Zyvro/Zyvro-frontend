"use client"

import { useRef, useState } from "react"
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react"
import { Check, Database, Download, Loader2, Maximize2, MoreHorizontal, Play, Plus, Trash2, Upload, X } from "lucide-react"
import { cn, fileToDataUrl } from "@/lib/utils"
import { mediaUrl } from "@/lib/api"
import { requestRunNode } from "@/lib/nodeActions"
import { inputHandleIds, nodeKind, portOfHandle } from "@/lib/nodes"
import { categoryMeta, nodeIcon } from "@/components/nodeIcons"
import { VoxelCanvas, type VoxelFace } from "@/components/VoxelCanvas"

// Input handles: one per typed input port. Single-input nodes keep the legacy
// centered "in" handle (existing edges use it); multi-input nodes get one
// labeled handle per port so text and image connections are distinct.
// Styling lives in globals.css (.react-flow__handle-port-*): every handle
// shares the same ring shape, the color encodes the port type.
function InputHandles({ nodeType }: { nodeType: string }) {
  const kind = nodeKind(nodeType)
  const handles = kind ? inputHandleIds(kind) : ["in"]
  if (!kind || kind.inputs.length === 0) return null

  if (handles.length === 1) {
    const port = kind.inputs[0]
    return (
      <>
        <Handle type="target" position={Position.Left} id="in" className={`react-flow__handle-port-${port}`} style={{ top: 28 }} />
        <PortLabel side="left" port={port} top={28} text={`in · ${port}`} />
      </>
    )
  }

  return (
    <>
      {handles.map((id, i) => {
        const port = portOfHandle(id)
        const top = 28 + i * 22
        const text = port === "image" ? "images · multiple" : `in · ${port}`
        return (
          <div key={id}>
            <Handle type="target" position={Position.Left} id={id} className={`react-flow__handle-port-${port}`} style={{ top }} />
            <PortLabel side="left" port={port} top={top} text={text} />
          </div>
        )
      })}
    </>
  )
}

// Port name tag shown next to a handle while the card is hovered.
function PortLabel({ side, port, top, text }: { side: "left" | "right" | "bottom"; port: string; top?: number; text: string }) {
  return (
    <span className={`port-label port-label-${side} port-label-${port}`} style={top !== undefined ? { top } : undefined}>
      {text}
    </span>
  )
}

export type ZynodeData = {
  label?: string
  config?: Record<string, unknown>
  [key: string]: unknown
}


// The main editable text field shown inline in the card, per node type.
const INLINE_FIELD: Record<string, { key: string; label: string; placeholder: string }> = {
  textInput: { key: "value", label: "Prompt", placeholder: "Enter text, or leave empty and pass it at run time…" },
  llm: { key: "prompt", label: "Prompt", placeholder: "Uses upstream text, or write a prompt override…" },
  generateImage: { key: "prompt", label: "Prompt", placeholder: "Uses upstream text, or write a prompt override…" },
  editImage: { key: "prompt", label: "Instruction", placeholder: "Describe the edit…" },
  vision: { key: "instruction", label: "Instruction", placeholder: "What should the model look for?" },
  brain: { key: "goal", label: "Goal", placeholder: "Uses upstream text, or write a goal override…" },
  mergeText: { key: "separator", label: "Separator", placeholder: "\\n" },
}

export type NodeRuntimeState = "idle" | "queued" | "running" | "completed" | "cached" | "failed"

export type ZynodeOutput = {
  type?: string
  value?: {
    text?: string
    trace?: Array<{ step: number; tool: string; summary?: string; status: string }>
    [key: string]: unknown
  }
  [key: string]: unknown
}

export type ZynodeProps = NodeProps & {
  data: ZynodeData & {
    _status?: NodeRuntimeState
    _output?: ZynodeOutput
    _previewUrl?: string
    _error?: string
    _latency?: number
    _isToolTarget?: boolean
  }
}

function MediaFrame({ src, transparent, filename }: { src: string; transparent?: boolean; filename?: string }) {
  const resolved = mediaUrl(src)
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)

  async function download() {
    try {
      const res = await fetch(resolved, { credentials: "include" })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const ext = blob.type.split("/")[1]?.split(";")[0] || "png"
      a.download = filename ? `${filename}.${ext}` : `zyvro-image.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      window.open(resolved, "_blank")
    }
  }

  return (
    <div className="group/img relative mt-2 overflow-hidden rounded-lg border border-white/[0.06]" onClick={(e) => e.stopPropagation()}>
      <div className={cn(transparent ? "checker" : "bg-black/40")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolved}
          alt="preview"
          className="block w-full max-h-64 object-contain nodrag"
          onLoad={(e) => {
            const img = e.currentTarget
            if (img.naturalWidth > 0) setDims({ w: img.naturalWidth, h: img.naturalHeight })
          }}
        />
      </div>
      {dims && (
        <span className="absolute right-1.5 bottom-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[9px] font-medium text-white/90 opacity-0 transition-opacity group-hover/img:opacity-100">
          {dims.w}×{dims.h}
        </span>
      )}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover/img:opacity-100">
        <button
          className="nodrag pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-foreground backdrop-blur-sm transition-colors hover:bg-primary hover:text-primary-foreground"
          title="Afficher en grand"
          onClick={(e) => {
            e.stopPropagation()
            window.open(resolved, "_blank")
          }}
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          className="nodrag pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-foreground backdrop-blur-sm transition-colors hover:bg-primary hover:text-primary-foreground"
          title="Télécharger"
          onClick={(e) => {
            e.stopPropagation()
            void download()
          }}
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function StatusPill({ status, latency }: { status: NodeRuntimeState; latency?: number }) {
  if (status === "idle") return null
  if (status === "running")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-sky-300">
        <Loader2 className="h-3 w-3 zy-spin" /> Running
      </span>
    )
  if (status === "queued") return <span className="text-[10px] text-amber-300">Queued</span>
  if (status === "completed")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300">
        <Check className="h-3 w-3" /> {typeof latency === "number" ? `${latency} ms` : "Done"}
      </span>
    )
  if (status === "cached")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300/90" title="Reused from the previous successful run">
        <Database className="h-3 w-3" /> Cached
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-red-300">
      <X className="h-3 w-3" /> Failed
    </span>
  )
}

export function Zynode({ id, data, selected }: ZynodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow()
  const nodeType = String(data.nodeType || "")
  const kind = nodeKind(nodeType)
  // The category comes from the node kind, which is the one place it is
  // declared. A second table here used to hold a copy, and a node added to
  // nodes.ts but forgotten there silently rendered as Utility.
  const category = kind?.category || "Utility"
  const meta = categoryMeta(category)
  const Icon = nodeIcon(nodeType)
  const status = data._status || "idle"
  const isBrain = nodeType === "brain"
  const config = (data.config || {}) as Record<string, unknown>
  const inline = INLINE_FIELD[nodeType]
  const [menuOpen, setMenuOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const uploadedImage = typeof config.dataUrl === "string" && config.dataUrl ? config.dataUrl : undefined
  const inputKey = typeof config.inputKey === "string" ? config.inputKey.trim() : ""

  function setConfig(patch: Record<string, unknown>) {
    updateNodeData(id, { config: { ...config, ...patch } })
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setConfig({ dataUrl: await fileToDataUrl(file) })
    e.target.value = ""
  }

  // Text outputs are shown unless the node is a plain text input (its output
  // is the value already visible in the editor).
  const outputText =
    data._output?.type === "text" && !data._previewUrl && nodeType !== "textInput" ? String(data._output.value?.text || "") : ""

  // Voxel preview: every upstream image, dataUrl first (the API sanitizer
  // truncates data URLs in list responses, but the per-node output restored
  // by polling keeps them until stored URLs are the only source).
  const voxelFaces: VoxelFace[] =
    nodeType === "voxelPreview" && Array.isArray(data._output?.value?.faces)
      ? (data._output!.value!.faces as VoxelFace[]).filter((f) => f && (f.dataUrl || f.url))
      : []

  return (
    <div
      className={cn(
        "group relative w-[260px] rounded-xl border bg-card text-card-foreground shadow-[0_10px_36px_rgba(0,0,0,0.5)] transition-[box-shadow,border-color]",
        `node-status-${status}`,
        selected && "ring-2 ring-primary/70 ring-offset-2 ring-offset-background"
      )}
    >
      <InputHandles nodeType={nodeType} />
      {data.hasOutput !== false && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="out"
            className={`react-flow__handle-port-${kind?.outputs[0] || "any"}`}
            style={{ top: 28 }}
          />
          <PortLabel side="right" port={kind?.outputs[0] || "any"} top={28} text={`out · ${kind?.outputs[0] || "any"}`} />
        </>
      )}

      {/* Header */}
      <div className="flex items-start gap-2.5 px-3 pt-3 pb-2">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.05]", meta.tint)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-semibold leading-4">{String(data.label || "") || kind?.label || nodeType}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className={cn("inline-block rounded px-1.5 py-[2px] text-[8px] font-bold uppercase tracking-[0.12em]", meta.badge)}>
              {category === "AI" ? "Model" : category}
            </span>
            {inputKey && (
              <span
                className="inline-block max-w-[120px] truncate rounded border border-primary/40 bg-primary/15 px-1.5 py-[2px] font-mono text-[8px] font-semibold tracking-wide text-primary-foreground/90"
                title={`Runtime input "${inputKey}" — passed when running (UI, API, MCP)`}
              >
                {"{"}{inputKey}{"}"}
              </span>
            )}
          </div>
        </div>
        <div className="relative">
          <button
            className="nodrag rounded-md p-1 text-muted-foreground/70 hover:bg-white/[0.06] hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
            title="Node actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="nodrag absolute right-0 top-7 z-20 w-36 overflow-hidden rounded-lg border border-white/10 bg-popover p-1 shadow-xl">
              <button
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground/90 hover:bg-white/[0.06]"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  requestRunNode(id)
                }}
              >
                <Play className="h-3.5 w-3.5" /> Run this node
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-red-300 hover:bg-white/[0.06]"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  deleteElements({ nodes: [{ id }] })
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete node
              </button>
            </div>
          )}
        </div>
      </div>
      {kind?.description && (
        <div className="px-3 pb-2 text-[10px] leading-snug text-muted-foreground">{kind.description}</div>
      )}

      {/* Body */}
      <div className="px-3 pb-3">
        {inline && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80">{inline.label}</span>
            </div>
            <textarea
              className="nodrag nowheel block w-full resize-y rounded-md border border-white/[0.06] bg-black/30 px-2 py-1.5 text-[10px] leading-relaxed text-foreground/90 placeholder:text-muted-foreground/50 focus:border-primary/60 focus:outline-none"
              rows={nodeType === "mergeText" ? 1 : 4}
              placeholder={inline.placeholder}
              value={String(config[inline.key] ?? "")}
              onChange={(e) => setConfig({ [inline.key]: e.target.value })}
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {nodeType === "imageInput" && (
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            {uploadedImage ? (
              <MediaFrame src={uploadedImage} />
            ) : (
              <button
                className="nodrag flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-black/20 py-8 text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  fileRef.current?.click()
                }}
              >
                <Upload className="h-5 w-5" />
                <span className="text-[10px]">Upload an image</span>
              </button>
            )}
          </div>
        )}

        {status === "failed" && (
          <div className="mt-2 rounded-md border border-red-400/30 bg-red-500/10 px-2 py-1.5 text-[10px] leading-snug text-red-200 break-words">
            {data._error || "Error"}
          </div>
        )}

        {data._previewUrl && (
          <MediaFrame
            src={data._previewUrl}
            transparent={nodeType === "removeBackground" || nodeType === "preview" || nodeType === "output"}
            filename={String(data.label || nodeType || "image").replace(/[^\w-]+/g, "-").toLowerCase()}
          />
        )}
        {nodeType === "voxelPreview" && voxelFaces.length > 0 && (
          <div className="mt-2">
            <VoxelCanvas
              shape={(config.shape === "sphere" ? "sphere" : "cube") as "cube" | "sphere"}
              faces={voxelFaces}
              className="nowheel h-44 w-full overflow-hidden rounded-lg border border-white/[0.06] bg-black/40"
            />
            <div className="mt-1 text-center text-[9px] text-muted-foreground">
              drag to rotate · scroll to zoom · {voxelFaces.length} image{voxelFaces.length > 1 ? "s" : ""}
            </div>
          </div>
        )}
        {outputText && (
          <div className="nowheel mt-2 max-h-40 overflow-y-auto rounded-md border border-white/[0.06] bg-black/30 px-2 py-1.5 text-[10px] leading-relaxed text-foreground/85 whitespace-pre-wrap break-words">
            {outputText}
          </div>
        )}
        {nodeType === "zyvroTools" && (
          <ul className="space-y-1 rounded-md border border-white/[0.06] bg-black/30 px-2 py-1.5 font-mono text-[9px] leading-relaxed text-foreground/75">
            <li>zyvro_list_workflows</li>
            <li>zyvro_workflow_graph</li>
            <li>zyvro_run_workflow</li>
            <li>zyvro_execution_status</li>
          </ul>
        )}
        {(nodeType === "preview" || nodeType === "output") && !data._previewUrl && !outputText && status === "idle" && (
          <div className="checker flex h-28 items-center justify-center rounded-lg border border-white/[0.06] text-[10px] text-muted-foreground">
            Result will appear here
          </div>
        )}
        {nodeType === "voxelPreview" && voxelFaces.length === 0 && status === "idle" && (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-white/[0.12] bg-black/20 text-[10px] text-muted-foreground">
            Connect images · run to preview in 3D
          </div>
        )}

        {isBrain && data._output?.value?.trace && (
          <ol className="mt-2 space-y-0.5 text-[10px] text-muted-foreground">
            {(data._output.value.trace || []).map((s, i) => (
              <li key={i} className="flex gap-1.5">
                <span className={s.status === "error" ? "text-red-400" : "text-emerald-400"}>{s.status === "error" ? "✗" : "✓"}</span>
                <span className="truncate">
                  {s.tool}: {s.summary}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] px-2 py-1.5">
        <div className="flex items-center gap-1">
          {nodeType === "imageInput" && (
            <button
              className="nodrag inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                if (uploadedImage) setConfig({ dataUrl: "" })
                else fileRef.current?.click()
              }}
            >
              {uploadedImage ? (
                <>
                  <X className="h-3 w-3" /> Remove media
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3" /> Add image
                </>
              )}
            </button>
          )}
          {isBrain && <span className="px-2 text-[10px] text-rose-300/80">Tool links: dashed rose</span>}
        </div>
        <div className="flex items-center gap-2 px-1">
          <button
            className={cn(
              "nodrag nowheel inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
              status === "running"
                ? "text-sky-300"
                : "text-muted-foreground hover:bg-primary/20 hover:text-primary-foreground"
            )}
            onClick={(e) => {
              e.stopPropagation()
              requestRunNode(id)
            }}
            disabled={status === "running" || status === "queued"}
            title="Run this node only (upstream is reused from the previous run when unchanged)"
          >
            {/* The label does not change while the node runs. The pill beside
                it is the status channel — it is what later says Cached, Done in
                1200 ms or Failed — and having the button say "Running" too put
                the word on screen twice, side by side. The button stays a
                control: disabled, tinted, still named after what it does. */}
            <Play className="h-3 w-3" /> Run {category === "AI" ? "Model" : "Node"}
          </button>
          <StatusPill status={status} latency={data._latency} />
        </div>
      </div>

      {/* Tool port: drag from here into a Brain to expose this node as a tool */}
      {!isBrain && (data.hasOutput !== false || kind?.toolOnly) && (
        <>
          <Handle type="source" position={Position.Bottom} id="tool" className="react-flow__handle-port-tool" />
          <PortLabel side="bottom" port="tool" text="tool → brain" />
        </>
      )}
    </div>
  )
}
