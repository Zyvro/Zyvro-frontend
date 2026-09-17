import Link from "next/link"
import { ArrowRight, Check, ExternalLink, Github, ShieldAlert, TerminalSquare } from "lucide-react"
import { DownloadButtons, DownloadTable } from "@/components/DownloadButtons"
import { latestDesktopRelease, RELEASES_URL, SOURCE_URL } from "@/lib/releases"

// The page that hands somebody the app.
//
// It renders on the server so it can read the release that was actually
// published: the version, the file names, the sizes and the checksums are all
// taken from there rather than written here, because a download page that
// needs an edit to tell the truth is a download page that eventually lies.

const POINTS = [
  "Workflows live as files under .zyvro/ in the folder you open, so they version with your code.",
  "Your claude or codex CLI drives text nodes — a subscription works, with no key to paste.",
  "Ollama, LM Studio or any OpenAI-compatible server on your machine backs text, vision and images.",
  "A file tree, an editor, a terminal, source control and an agent panel, around the same canvas.",
]

export async function DownloadPage({ focus }: { focus?: "mac" | "windows" }) {
  const release = await latestDesktopRelease()

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
            <Link href="/store" className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-white/[0.06] hover:text-foreground">
              Store
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
        <div className="pointer-events-none absolute left-1/2 top-[-12rem] -z-10 h-[30rem] w-[52rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[130px]" />

        <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="text-center sm:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Zyvro Studio
              {release && <span className="text-foreground">{release.version}</span>}
            </span>

            <h1 className="mt-6 text-4xl font-semibold leading-[1.1] sm:text-5xl">
              Run it on your machine.
              <br />
              <span className="text-muted-foreground">Nothing leaves it.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground sm:mx-0">
              The same canvas as the web app, in a desktop workspace beside the code it acts on. Your keys, your CLIs,
              your models — the only traffic that leaves is the model call itself, and it goes straight to the provider.
            </p>

            <div className="mt-9">
              {release ? (
                <DownloadButtons assets={release.assets} focus={focus} />
              ) : (
                // GitHub is unreachable from here. Say so plainly and send the
                // visitor where the files certainly are, rather than showing a
                // button that downloads nothing.
                <div className="flex flex-col items-center gap-2 sm:items-start">
                  <a
                    href={RELEASES_URL}
                    className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <Github className="h-4 w-4" /> Downloads on GitHub <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <p className="text-[11px] text-muted-foreground">
                    The release list could not be read just now; the files themselves are fine.
                  </p>
                </div>
              )}
            </div>

            <p className="mt-5 text-[11px] text-muted-foreground">
              Free, and open source.{" "}
              <a href={SOURCE_URL} className="text-primary hover:underline">
                Build it from source
              </a>{" "}
              if you would rather not trust a binary.
            </p>
          </div>

          <ul className="space-y-3 rounded-2xl border border-white/[0.08] bg-card p-6">
            {POINTS.map((p) => (
              <li key={p} className="flex gap-3 text-[13px] leading-relaxed text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.05] p-5">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <div className="text-[13px] leading-relaxed">
              <p className="font-medium text-foreground">This build is not signed yet</p>
              <p className="mt-1 text-muted-foreground">
                macOS says the developer cannot be verified: right-click the app and choose{" "}
                <span className="text-foreground">Open</span>, which offers the same dialog with a button that proceeds.
                Windows shows &ldquo;Windows protected your PC&rdquo;: choose{" "}
                <span className="text-foreground">More info</span>, then{" "}
                <span className="text-foreground">Run anyway</span>. Both warnings are accurate — neither platform can
                tell you this download came from us rather than from someone who intercepted it. Comparing the SHA-256
                below is the only verification available until the certificates are in place.
              </p>
              <pre className="zy-scroll mt-3 overflow-x-auto rounded-lg border border-white/[0.06] bg-black/30 p-3 font-mono text-[11px] text-muted-foreground">
                <code>
                  shasum -a 256 ~/Downloads/Zyvro*{"        "}# macOS{"\n"}
                  certutil -hashfile Zyvro*.exe SHA256{"    "}# Windows
                </code>
              </pre>
            </div>
          </div>
        </section>

        {release && (
          <section className="mx-auto max-w-6xl px-6 pb-20">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold">All files in {release.tag}</h2>
                <p className="text-sm text-muted-foreground">
                  Published {new Date(release.publishedAt).toISOString().slice(0, 10)}
                  {release.prerelease && " · pre-release"}
                </p>
              </div>
              <a href={release.url} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                Release notes <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <DownloadTable assets={release.assets} />
          </section>
        )}

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="flex flex-col items-start gap-3 rounded-xl border border-white/[0.08] bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <TerminalSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="text-[13px] leading-relaxed">
                <p className="font-medium text-foreground">No install needed to try it</p>
                <p className="text-muted-foreground">The same canvas runs in the browser, on your own keys.</p>
              </div>
            </div>
            <Link
              href="/signup"
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 text-sm font-medium hover:bg-white/[0.07]"
            >
              Use it in the browser <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] py-6 text-center text-xs text-muted-foreground">
        Free. Your keys, your runs.
      </footer>
    </div>
  )
}
