import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, MonitorDown } from "lucide-react"
import { BUILT_IN_KINDS } from "@/lib/nodes"
import { categoryMeta, nodeIcon } from "@/components/nodeIcons"
import { LandingShowcase } from "@/components/LandingShowcase"
import { pageSeo, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo"
import { cn } from "@/lib/utils"

export const metadata: Metadata = pageSeo({
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
})

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-full.png" alt="Zyvro" className="hidden h-7 w-auto sm:block" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-icon.png" alt="Zyvro" className="h-8 w-8 rounded-lg sm:hidden" />
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/download"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-foreground hover:bg-white/[0.06]"
            >
              <MonitorDown className="h-4 w-4" /> Desktop
            </Link>
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-white/[0.06] hover:text-foreground">
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_4px_16px_hsl(var(--primary)/0.35)] hover:bg-primary/90"
            >
              Start building <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage: "radial-gradient(ellipse at 50% 0%, black 20%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 20%, transparent 70%)",
          }}
        />
        <div className="pointer-events-none absolute left-1/2 top-[-10rem] -z-10 h-[28rem] w-[48rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />

        <section className="mx-auto max-w-4xl px-6 pb-16 pt-24 text-center">
          <span className="inline-block rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Visual AI workflows · bring your own keys
          </span>
          <div className="mt-10 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-full-with-slogan.png" alt="Zyvro — build AI agents on a canvas, run them anywhere" className="w-full max-w-xl drop-shadow-[0_8px_32px_rgba(0,0,0,0.45)]" />
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground">
            Wire text, image and vision models into reusable workflows. The canvas defines what the agent can do. The Brain decides how to use it at
            runtime.
          </p>
          <div className="mt-10 flex justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_4px_16px_hsl(var(--primary)/0.35)] hover:bg-primary/90"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/download"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-6 text-sm font-medium hover:bg-white/[0.07]"
            >
              <MonitorDown className="h-4 w-4" /> Download the desktop app
            </Link>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            macOS and Windows · free · runs on your own machine
          </p>
        </section>

        <LandingShowcase className="pb-24" />

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold">Nodes</h2>
              <p className="text-sm text-muted-foreground">Every capability you can drop on the canvas.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BUILT_IN_KINDS.map((k) => {
              const Icon = nodeIcon(k.type)
              const meta = categoryMeta(k.category)
              return (
                <div key={k.type} className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-card p-4 transition-colors hover:border-white/20">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04]", meta.tint)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{k.label}</span>
                      <span className={cn("rounded px-1.5 py-[2px] text-[8px] font-bold uppercase tracking-[0.12em]", meta.badge)}>
                        {k.category === "AI" ? "Model" : k.category}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{k.description}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] py-6 text-center text-xs text-muted-foreground">Free. Your keys, your runs.</footer>
    </div>
  )
}
