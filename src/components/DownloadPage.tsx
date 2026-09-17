import Link from "next/link"
import { ChevronRight, ExternalLink } from "lucide-react"
import { AppShot } from "@/components/brand/CanvasPreview"
import { GithubMark } from "@/components/brand/icons"
import { DownloadButtons, DownloadTable } from "@/components/DownloadButtons"
import { NAV_LINK, PILL_LARGE, PILL_MUTED, PILL_OUTLINE, PILL_PRIMARY } from "@/components/ui/cta"
import { latestDesktopRelease, RELEASES_URL, SOURCE_URL } from "@/lib/releases"
import { cn } from "@/lib/utils"

// La page qui remet l'application.
//
// La première version disait tout en même temps : quatre arguments à droite,
// trois boutons qui se disputaient la gauche, le nom du fichier, la licence,
// puis un grand encadré orange avec un bloc de code. Jeremy l'a résumée mieux
// que moi — « je sais même pas où télécharger tellement y'a d'informations ».
//
// Donc : une action, une seule, et tout ce qui n'est pas elle passe sous la
// ligne de flottaison. Ce qui reste en haut tient en un regard — ce que c'est,
// pour quelle machine, et le bouton.
//
// Elle est rendue sur le serveur, ce qui lui permet de lire la release publiée
// : la version, les noms de fichiers et les empreintes en viennent, jamais
// d'ici.

export async function DownloadPage({ focus }: { focus?: "mac" | "windows" }) {
  const release = await latestDesktopRelease()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-full.png" alt="Zyvro" className="hidden h-7 w-auto sm:block" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-icon.png" alt="Zyvro" className="h-8 w-8 rounded-lg sm:hidden" />
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/store" className={cn(NAV_LINK, "hidden sm:inline-flex")}>
              Store
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
        <div className="pointer-events-none absolute left-1/2 top-[-14rem] -z-10 h-[32rem] w-[56rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[140px]" />

        {/* ---- le héros : le visuel, puis la seule action ---- */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-20 pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14 lg:pt-24">
          <div className="order-2 lg:order-1">
            <AppShot className="mx-auto max-w-xl lg:max-w-none" />
          </div>

          <div className="order-1 text-center lg:order-2 lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Zyvro Studio
              {release && <span className="text-foreground">{release.version}</span>}
            </span>

            <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-[3.25rem]">
              Run it on your machine.
              <br />
              <span className="text-muted-foreground">Nothing leaves it.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground lg:mx-0">
              The canvas from the web app, in a desktop workspace beside the code it acts on — free, and open source.
            </p>

            <div className="mt-9">
              {release ? (
                <DownloadButtons assets={release.assets} focus={focus} />
              ) : (
                <a href={RELEASES_URL} className={cn(PILL_PRIMARY, PILL_LARGE)}>
                  <GithubMark className="h-[17px] w-[17px]" /> Downloads on GitHub
                </a>
              )}
            </div>
          </div>
        </section>

        {/* ---- tout le reste, sous la ligne de flottaison ---- */}
        <section className="border-t border-white/[0.06] bg-white/[0.015]">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="grid gap-10 md:grid-cols-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  What you get
                </h2>
                <ul className="mt-4 space-y-3 text-[13px] leading-relaxed text-muted-foreground">
                  <li>Workflows as files under <code className="text-foreground">.zyvro/</code>, versioned with your code.</li>
                  <li>
                    Your <code className="text-foreground">claude</code> or <code className="text-foreground">codex</code>{" "}
                    CLI drives text nodes — a subscription works, with no key to paste.
                  </li>
                  <li>Ollama, LM Studio or any OpenAI-compatible server on your machine, for text, vision and images.</li>
                  <li>A file tree, an editor, a terminal, source control and an agent panel, around the same canvas.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Before you open it
                </h2>
                <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
                  The build is not signed yet. macOS says the developer cannot be verified — right-click the app and
                  choose <span className="text-foreground">Open</span>. Windows shows &ldquo;Windows protected your
                  PC&rdquo; — choose <span className="text-foreground">More info</span>, then{" "}
                  <span className="text-foreground">Run anyway</span>.
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                  Both warnings are accurate: neither platform can tell you this came from us. Comparing the SHA-256
                  below is the only check there is until the certificates are in place.
                </p>
              </div>

              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Rather build it
                </h2>
                <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
                  Three public repositories, no hidden step. The installer is the same thing, packaged.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={SOURCE_URL} className={PILL_OUTLINE}>
                    <GithubMark className="h-[17px] w-[17px]" /> Source
                  </a>
                  <a href={RELEASES_URL} className={PILL_MUTED}>
                    All releases
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {release && (
          <section className="mx-auto max-w-6xl px-6 py-16">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">Every file in {release.tag}</h2>
                <p className="text-[13px] text-muted-foreground">
                  Published {new Date(release.publishedAt).toISOString().slice(0, 10)}
                  {release.prerelease && " · pre-release"} · hover a hash to see it in full
                </p>
              </div>
              <a
                href={release.url}
                className="inline-flex items-center gap-1.5 text-[13px] text-primary hover:underline"
              >
                Release notes <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <DownloadTable assets={release.assets} />
          </section>
        )}

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <Link
            href="/signup"
            className="group flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-card p-6 transition-colors hover:border-white/20"
          >
            <div>
              <p className="font-medium">No install needed to try it</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                The same canvas runs in the browser, on your own keys.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Link>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] py-8 text-center text-xs text-muted-foreground">
        Free. Your keys, your runs.
      </footer>
    </div>
  )
}
