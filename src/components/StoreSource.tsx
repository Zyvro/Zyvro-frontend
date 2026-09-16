"use client"

import { Loader2 } from "lucide-react"
import { useStorePack } from "@/lib/storeHooks"

// Reading the code is the review. Nothing in this store is checked by us, and
// a pack is a few dozen lines of Lua, so the honest thing is to put it one
// click from the listing rather than somewhere a curious person has to hunt.

export function StoreSource({ name }: { name: string }) {
  const pack = useStorePack(name)

  if (pack.isLoading) {
    return (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 zy-spin" /> Fetching the source
      </p>
    )
  }
  if (pack.isError) {
    return <p className="text-xs text-destructive">{(pack.error as Error).message}</p>
  }

  const sources = pack.data?.sources ?? []
  if (sources.length === 0) {
    return <p className="text-xs text-muted-foreground">This pack carries no readable source.</p>
  }

  return (
    <div className="space-y-2">
      {sources.map((source) => (
        <div key={source.path} className="overflow-hidden rounded-lg border border-white/[0.08] bg-black/40">
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-1.5">
            <span className="font-mono text-[11px] text-muted-foreground">{source.path}</span>
            <span className="ml-auto text-[10px] text-muted-foreground/70">
              {source.code.split("\n").length} lines
            </span>
          </div>
          <pre className="max-h-80 overflow-auto px-3 py-2">
            <code className="font-mono text-[11px] leading-relaxed text-foreground/90">{source.code}</code>
          </pre>
        </div>
      ))}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Nodes run in a sandbox with no filesystem, no network and no processes, under a time limit, a
        memory ceiling and a budget of model calls. A pack can only reach your files if it declares
        the capability, and that is shown above.
      </p>
    </div>
  )
}
