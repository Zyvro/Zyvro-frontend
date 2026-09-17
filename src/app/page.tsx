import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { BUILT_IN_KINDS } from "@/lib/nodes"
import { categoryMeta, nodeIcon } from "@/components/nodeIcons"
import { AppleMark, WindowsMark } from "@/components/brand/icons"
import { FeatureSections } from "@/components/FeatureSections"
import { LandingShowcase } from "@/components/LandingShowcase"
import { CTA_ICON, NAV_LINK, PILL_LARGE, PILL_MUTED, PILL_OUTLINE, PILL_PRIMARY } from "@/components/ui/cta"
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
          {/* Un seul bouton dans cette barre. « Desktop » et « Log in » sont
              des liens : les encadrer en faisait trois boutons de rangs
              différents collés les uns aux autres, ce qui n'est plus une
              hiérarchie. */}
          <nav className="flex items-center gap-2">
            <Link href="/store" className={cn(NAV_LINK, "hidden sm:inline-flex")}>
              Store
            </Link>
            <Link href="/download" className={PILL_OUTLINE}>
              Desktop
            </Link>
            <Link href="/login" className={cn(PILL_MUTED, "hidden sm:inline-flex")}>
              Log in
            </Link>
            <Link href="/signup" className={PILL_PRIMARY}>
              Start building
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
          <div className="mt-10 flex flex-col items-center justify-center gap-2.5 sm:flex-row sm:gap-3">
            <Link href="/signup" className={cn(PILL_PRIMARY, PILL_LARGE, "w-full sm:w-auto")}>
              Start building <ArrowRight className={CTA_ICON} />
            </Link>
            {/* La plateforme est nommée dans le bouton : « macOS and Windows ·
                free · runs on your own machine » en gris sous les deux boutons
                était une note de bas de page pour une information qui décide
                du clic. */}
            <Link href="/download" className={cn(PILL_OUTLINE, PILL_LARGE, "w-full sm:w-auto")}>
              {/* Les deux marques comme un seul signe : un filet les sépare
                  au lieu d'un blanc, sinon on lit deux icônes hésitantes
                  plutôt que « les deux plateformes ». */}
              <span className="flex items-center gap-1.5">
                <AppleMark className="h-[17px] w-[17px]" />
                <span className="h-3.5 w-px bg-current opacity-25" />
                <WindowsMark className="h-[17px] w-[17px]" />
              </span>
              Download desktop
            </Link>
          </div>
        </section>

        {/* Ce que fait le produit, montré. Avant : un héros, une vitrine et
            une grille de dix-sept cartes — une fiche technique. */}
        <FeatureSections />

        <LandingShowcase className="pb-24 pt-28" />

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold">Every node</h2>
              <p className="text-sm text-muted-foreground">
                The whole palette, so you can see what a workflow can be made of.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BUILT_IN_KINDS.map((k) => {
              const Icon = nodeIcon(k.type)
              const meta = categoryMeta(k.category)
              return (
                <div
                  key={k.type}
                  className="group flex items-start gap-3.5 rounded-xl border border-white/[0.08] bg-card p-4 transition-all hover:-translate-y-[1px] hover:border-white/20 hover:bg-white/[0.03]"
                >
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.plate)}>
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
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
