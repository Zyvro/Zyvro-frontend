"use client"

import { ArrowRight, ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { mediaUrl } from "@/lib/api"
import type { WorkflowPreview } from "@/lib/api"

// A workflow's thumbnail is one real pair from a finished run: what went in on
// the left, what came out on the right. Publishing requires a complete run, so
// a listed workflow always has one. Workflows that have never run fall back to
// the caller's placeholder (the graph sketch).

function TextPane({ text, label }: { text: string; label: string }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col justify-center overflow-hidden bg-white/[0.03] px-3 py-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground/70">{label}</div>
      <p className="mt-1 line-clamp-4 text-[11px] leading-snug text-foreground/80">{text}</p>
    </div>
  )
}

function ImagePane({ src, alt }: { src: string; alt: string }) {
  return (
    // The wrapper owns the height. A bare <img> is an intrinsically sized grid
    // item: it grows the row to the image's aspect ratio and then gets clipped,
    // which is exactly the cropping object-contain is meant to avoid. Pinning
    // the image inside an absolutely positioned box keeps the row at the height
    // the card asked for.
    <div
      className="relative h-full min-h-0 w-full overflow-hidden"
      style={{
        // Transparent PNGs are the common output; a checker keeps them legible
        // instead of dissolving into the card background.
        backgroundImage:
          "linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.04) 75%), linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.04) 75%)",
        backgroundSize: "12px 12px",
        backgroundPosition: "0 0, 6px 6px",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaUrl(src)} alt={alt} loading="lazy" className="absolute inset-0 h-full w-full object-contain p-1.5" />
    </div>
  )
}

function Pane({
  kind,
  text,
  image,
  label,
}: {
  kind: "text" | "image" | "none"
  text?: string
  image?: string
  label: string
}) {
  if (kind === "image" && image) return <ImagePane src={image} alt={label} />
  if (kind === "text" && text) return <TextPane text={text} label={label} />
  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center bg-white/[0.02] text-muted-foreground/50">
      <ImageOff className="h-4 w-4" />
    </div>
  )
}

export function hasPreview(preview?: WorkflowPreview | null): preview is WorkflowPreview {
  return Boolean(preview && (preview.input_kind !== "none" || preview.output_kind !== "none"))
}

export function WorkflowThumb({
  preview,
  className,
  fallback,
}: {
  preview?: WorkflowPreview | null
  className?: string
  fallback?: React.ReactNode
}) {
  if (!hasPreview(preview)) {
    return <>{fallback ?? null}</>
  }

  const showInput = preview.input_kind !== "none"
  const showOutput = preview.output_kind !== "none"

  // A workflow with no declared input (or none worth showing) reads better as
  // one full-bleed result than as a half-empty split.
  if (!showInput || !showOutput) {
    const only = showOutput
      ? { kind: preview.output_kind, text: preview.output_text, image: preview.output_image, label: "Result" }
      : { kind: preview.input_kind, text: preview.input_text, image: preview.input_image, label: "Input" }
    return (
      <div className={cn("relative h-28 w-full overflow-hidden", className)}>
        <Pane kind={only.kind} text={only.text} image={only.image} label={only.label} />
      </div>
    )
  }

  return (
    <div className={cn("relative grid h-28 w-full grid-cols-2 grid-rows-1 gap-px overflow-hidden bg-white/[0.06]", className)}>
      <Pane kind={preview.input_kind} text={preview.input_text} image={preview.input_image} label="Input" />
      <Pane kind={preview.output_kind} text={preview.output_text} image={preview.output_image} label="Result" />
      <span
        className="pointer-events-none absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-background/85 backdrop-blur"
        aria-hidden="true"
      >
        <ArrowRight className="h-3 w-3 text-foreground/80" />
      </span>
    </div>
  )
}
