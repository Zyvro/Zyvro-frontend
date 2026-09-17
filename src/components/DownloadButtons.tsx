"use client"

import { useSyncExternalStore } from "react"
import { Apple, Download, MonitorDown } from "lucide-react"
import type { DesktopAsset, Platform } from "@/lib/releases"
import { formatSize, PLATFORM_LABEL } from "@/lib/releases"
import { PILL_LARGE, PILL_PRIMARY } from "@/components/ui/cta"
import { cn } from "@/lib/utils"

// Which download to put first.
//
// The server cannot know: it renders one page for everybody. So the machine in
// front of the visitor answers, and useSyncExternalStore is how that answer
// arrives without an effect — the server snapshot is "we do not know yet", the
// client snapshot is what the browser says, and React swaps them at hydration
// with no mismatch and no second render pass to arrange.
//
// Apple Silicon versus Intel is the one thing a browser will not tell you:
// Safari on an M-series Mac still says "Intel" for compatibility. Guessing
// wrong there hands somebody a build that will not start, so macOS gets the
// Apple Silicon build first — every Mac sold since 2020 — with the Intel one
// named right beside it rather than hidden behind a menu.

function subscribe(): () => void {
  // Nothing changes: a browser does not move to another operating system
  // mid-visit. The subscription exists because the hook's contract asks for
  // one, and returning a no-op unsubscribe is the honest implementation.
  return () => {}
}

function detect(): Platform | "unknown" {
  if (typeof navigator === "undefined") return "unknown"
  const ua = `${navigator.userAgent} ${navigator.platform ?? ""}`.toLowerCase()
  if (ua.includes("win")) return "windows"
  if (ua.includes("mac") || ua.includes("iphone") || ua.includes("ipad")) return "mac-arm64"
  return "unknown"
}

const serverSnapshot = (): Platform | "unknown" => "unknown"

export function usePlatform(): Platform | "unknown" {
  return useSyncExternalStore(subscribe, detect, serverSnapshot)
}

function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  return platform === "windows" ? <MonitorDown className={className} /> : <Apple className={className} />
}

export function DownloadButtons({ assets, focus }: { assets: DesktopAsset[]; focus?: "mac" | "windows" }) {
  const detected = usePlatform()
  const installers = assets.filter((a) => a.kind === "installer")

  const wanted: Platform =
    focus === "windows"
      ? "windows"
      : focus === "mac"
        ? "mac-arm64"
        : detected === "unknown"
          ? "mac-arm64"
          : detected

  const primary = installers.find((a) => a.platform === wanted) ?? installers[0]
  const others = installers.filter((a) => a !== primary)
  if (!primary) return null

  // Un bouton, et les autres plateformes en une ligne de liens.
  //
  // Trois boutons de même taille, c'est trois fois « choisis » posé devant
  // quelqu'un qui voulait télécharger. Les deux autres restent à portée, à
  // leur rang : du texte, pas des boutons.
  return (
    <div className="flex flex-col items-center gap-3.5 lg:items-start">
      <a href={primary.url} className={cn(PILL_PRIMARY, PILL_LARGE)}>
        <PlatformIcon platform={primary.platform} className="h-[18px] w-[18px]" />
        Download for {PLATFORM_LABEL[primary.platform]}
      </a>

      <p className="text-[12px] text-muted-foreground">
        {formatSize(primary.size)} · {release(primary.name)}
        {others.length > 0 && (
          <>
            <span className="mx-2 text-white/20">|</span>
            {others.map((a, i) => (
              <span key={a.name}>
                {i > 0 && <span className="mx-1.5 text-white/20">·</span>}
                <a href={a.url} className="text-muted-foreground underline decoration-white/20 underline-offset-4 hover:text-foreground hover:decoration-white/50">
                  {PLATFORM_LABEL[a.platform]}
                </a>
              </span>
            ))}
          </>
        )}
      </p>
    </div>
  )
}

// release sort le numéro de version du nom de fichier : « 0.1.0-alpha.5 » dit
// ce qu'on emporte, « Zyvro.Studio-0.1.0-alpha.5-arm64.dmg » dit surtout que
// personne n'a relu cette ligne.
function release(name: string): string {
  return name.match(/\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?/)?.[0] ?? name
}

export function DownloadTable({ assets }: { assets: DesktopAsset[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-card">
      <table className="w-full min-w-[34rem] text-left text-[13px]">
        <thead className="border-b border-white/[0.06] text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-medium">File</th>
            <th className="px-4 py-2.5 font-medium">For</th>
            <th className="px-4 py-2.5 font-medium">Size</th>
            <th className="px-4 py-2.5 font-medium">SHA-256</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => (
            <tr key={a.name} className="border-b border-white/[0.04] last:border-0">
              <td className="px-4 py-2.5">
                <a href={a.url} className="inline-flex items-center gap-2 text-foreground hover:underline">
                  <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="break-all">{a.name}</span>
                </a>
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                {PLATFORM_LABEL[a.platform]}
                {a.kind === "archive" && " · zip"}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{formatSize(a.size)}</td>
              <td className="px-4 py-2.5">
                {/* The full hash in the title: it is what you paste to compare,
                    and a column wide enough to show all 64 characters would
                    push everything else off a laptop screen. */}
                <code className="font-mono text-[11px] text-muted-foreground" title={a.sha256 ?? ""}>
                  {a.sha256 ? `${a.sha256.slice(0, 16)}…` : "—"}
                </code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
