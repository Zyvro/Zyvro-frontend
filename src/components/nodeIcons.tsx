import {
  Box,
  Brain,
  Cpu,
  Eraser,
  Eye,
  FileDown,
  FileOutput,
  FileUp,
  FlipHorizontal,
  Image as ImageIcon,
  Import,
  LayoutGrid,
  Merge,
  RotateCw,
  ScanEye,
  Sparkles,
  Type,
  Wand2,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react"

// One icon per node type (falls back to a generic one).
export const NODE_ICONS: Record<string, LucideIcon> = {
  textInput: Type,
  imageInput: ImageIcon,
  fileInput: FileUp,
  fileOutput: FileDown,
  mergeText: Merge,
  rotateImage: RotateCw,
  flipImage: FlipHorizontal,
  llm: Cpu,
  generateImage: Sparkles,
  editImage: Wand2,
  removeBackground: Eraser,
  vision: ScanEye,
  brain: Brain,
  zyvroTools: Workflow,
  preview: Eye,
  voxelPreview: Box,
  output: FileOutput,
}

export function nodeIcon(type: string): LucideIcon {
  return NODE_ICONS[type] || LayoutGrid
}

// Category rail: icon + colors shared by the palette, node badges and edges.
export const CATEGORIES: Array<{
  id: "Input" | "AI" | "Utility" | "Agent" | "Output"
  label: string
  icon: LucideIcon
  badge: string
  tint: string
}> = [
  { id: "Input", label: "Input", icon: Import, badge: "bg-sky-400/15 text-sky-300", tint: "text-sky-300" },
  { id: "AI", label: "Models", icon: Sparkles, badge: "bg-violet-400/15 text-violet-300", tint: "text-violet-300" },
  { id: "Utility", label: "Utility", icon: Wrench, badge: "bg-amber-400/15 text-amber-300", tint: "text-amber-300" },
  { id: "Agent", label: "Agent", icon: Brain, badge: "bg-rose-400/15 text-rose-300", tint: "text-rose-300" },
  { id: "Output", label: "Output", icon: Eye, badge: "bg-emerald-400/15 text-emerald-300", tint: "text-emerald-300" },
]

export function categoryMeta(id: string) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[2]
}
