import {
  Box,
  Brain,
  Combine,
  Eraser,
  Eye,
  FileInput,
  FileOutput,
  Flag,
  FlipHorizontal2,
  Image as ImageIcon,
  Import,
  LayoutGrid,
  MessageSquareText,
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
  fileInput: FileInput,
  fileOutput: FileOutput,
  mergeText: Combine,
  rotateImage: RotateCw,
  flipImage: FlipHorizontal2,
  llm: MessageSquareText,
  generateImage: Sparkles,
  editImage: Wand2,
  removeBackground: Eraser,
  vision: ScanEye,
  brain: Brain,
  zyvroTools: Workflow,
  preview: Eye,
  voxelPreview: Box,
  // La sortie marque un résultat ; elle ne l'écrit pas sur le disque, c'est
  // fileOutput qui fait ça. Deux icônes de fichier pour deux choses
  // différentes, c'était la confusion à l'œil.
  output: Flag,
}

export function nodeIcon(type: string): LucideIcon {
  return NODE_ICONS[type] || LayoutGrid
}

// Category rail: icon + colors shared by the palette, node badges and edges.
// Chaque catégorie a sa couleur, et la couleur doit se voir.
//
// Elle ne vivait que dans la teinte du trait : un contour de seize pixels à
// 4 % d'opacité sur du noir, c'est-à-dire du gris. Les cinq familles se
// ressemblaient toutes, et une grille de seize nœuds devenait du bruit.
//
// `plate` est la pastille — fond dégradé, anneau de la même couleur — et c'est
// elle qui porte l'identité. Une seule liste, lue par la palette, par la
// landing et par les nœuds du canvas : trois endroits qui doivent dire la même
// chose de la même famille.
export const CATEGORIES: Array<{
  id: "Input" | "AI" | "Utility" | "Agent" | "Output"
  label: string
  icon: LucideIcon
  badge: string
  tint: string
  plate: string
}> = [
  {
    id: "Input",
    label: "Input",
    icon: Import,
    badge: "bg-sky-400/15 text-sky-300",
    tint: "text-sky-300",
    plate: "bg-gradient-to-br from-sky-400/25 to-sky-500/5 ring-1 ring-inset ring-sky-300/25 text-sky-200",
  },
  {
    id: "AI",
    label: "Models",
    icon: Sparkles,
    badge: "bg-violet-400/15 text-violet-300",
    tint: "text-violet-300",
    plate: "bg-gradient-to-br from-violet-400/25 to-violet-500/5 ring-1 ring-inset ring-violet-300/25 text-violet-200",
  },
  {
    id: "Utility",
    label: "Utility",
    icon: Wrench,
    badge: "bg-amber-400/15 text-amber-300",
    tint: "text-amber-300",
    plate: "bg-gradient-to-br from-amber-400/25 to-amber-500/5 ring-1 ring-inset ring-amber-300/25 text-amber-200",
  },
  {
    id: "Agent",
    label: "Agent",
    icon: Brain,
    badge: "bg-rose-400/15 text-rose-300",
    tint: "text-rose-300",
    plate: "bg-gradient-to-br from-rose-400/25 to-rose-500/5 ring-1 ring-inset ring-rose-300/25 text-rose-200",
  },
  {
    id: "Output",
    label: "Output",
    icon: Eye,
    badge: "bg-emerald-400/15 text-emerald-300",
    tint: "text-emerald-300",
    plate: "bg-gradient-to-br from-emerald-400/25 to-emerald-500/5 ring-1 ring-inset ring-emerald-300/25 text-emerald-200",
  },
]

export function categoryMeta(id: string) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[2]
}
