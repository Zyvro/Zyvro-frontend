import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { ModeShowcase } from "@/components/ModeShowcase"
import { cn } from "@/lib/utils"

// Ce que fait le produit, montré plutôt que listé.
//
// La page enchaînait un héros, une vitrine vide et une grille de dix-sept
// cartes identiques : une fiche technique, pas une page produit. Quelqu'un qui
// arrive ne sait pas ce qu'est un nœud `mergeText`, mais il reconnaît un
// éditeur, un panneau de contrôle de version, une liste de modèles.
//
// Donc : une idée par section, une vraie capture de l'application à côté, et
// rien d'autre. Les captures sont prises avec l'outil de l'app elle-même, qui
// cadre sur le bord exact d'un panneau — c'est ce qui fait qu'elles ont l'air
// d'avoir été choisies plutôt que découpées.

type Feature = {
  eyebrow: string
  title: string
  body: string
  shot: { src: string; alt: string; width: number; height: number }
  /** Une capture prise dans un panneau étroit : l'agrandir la rend molle.
   *  Elle reste à sa taille et se centre. */
  narrow?: boolean
  /** L'image à droite plutôt qu'à gauche. On alterne, sinon la page défile en
   *  colonne et rien n'accroche l'œil. */
  flip?: boolean
  /** Toute la largeur, titre au-dessus.
   *
   *  Pour ce qui ne se lit pas en demi-page : une fenêtre entière, un terminal.
   *  Réduite à 500 points, une capture de l'IDE devient une vignette grise —
   *  on voit qu'il y a quelque chose, on ne voit pas quoi. */
  wide?: boolean
  link?: { href: string; label: string }
}

const FEATURES: Feature[] = [
  {
    eyebrow: "Your own models",
    title: "Nothing has to leave your machine.",
    body:
      "Ollama on this computer, LM Studio, or any server speaking the OpenAI API — an address and a model, no key to paste. " +
      "The list of models comes from the server itself, because what is installed is your business. It is also the only way " +
      "to ask a question about an image without the image going anywhere.",
    shot: { src: "/shots/models.png", alt: "Choosing a local model: an address, and the models the server reports", width: 960, height: 1326 },
    flip: true,
  },
  {
    eyebrow: "The agent",
    title: "Your subscription, not another bill.",
    body:
      "The panel runs the claude or codex CLI already signed in on your machine, in your project folder. A ChatGPT or Claude " +
      "subscription drives a workflow with no API key — Zyvro never sees a token. It holds this project's tools, so it can " +
      "list your workflows, read a graph, run one and read what came back.",
    shot: { src: "/shots/agent.png", alt: "The agent panel, running the CLI installed on this machine", width: 720, height: 1664 },
  },
  {
    eyebrow: "Permissions",
    title: "You decide what it may do.",
    body:
      "Per conversation, next to what you are about to ask. Workspace, and it works in the project without asking. Ask, " +
      "and every action arrives with its command or its path, to allow or deny. Read only, and it looks without touching. " +
      "YOLO, if you mean it.",
    shot: {
      src: "/shots/permissions.png",
      alt: "The four permission levels in the agent composer: Workspace, Ask, Read only, YOLO",
      width: 760,
      height: 640,
    },
    narrow: true,
    flip: true,
  },
  {
    eyebrow: "Agent tools",
    title: "Every shell hands over the project.",
    body:
      "Open a terminal and it already knows where this project's engine listens and what opens it: the addresses, the " +
      "tokens, a ready-made mcp.json for any client, and a zyvro-mcp command that starts claude or codex already wired in. " +
      "The port and the token change at every start — nobody should have to go looking for them.",
    shot: {
      src: "/shots/mcp-shell.png",
      alt: "A shell in the IDE listing the project's MCP servers, their addresses and the config file",
      width: 1520,
      height: 450,
    },
    wide: true,
  },
  {
    eyebrow: "The browser",
    title: "It has its own. Yours keeps its tabs.",
    body:
      "A page inside the IDE, in a session of its own. An agent opens it, reads what is on it, clicks, types, waits for a " +
      "text to appear and photographs it — without touching the browser where you are signed in to everything. Right-click " +
      "and Chromium's own devtools open under the page: Elements, Console, Network, Application. It is Chromium, because " +
      "the app is.",
    shot: {
      src: "/shots/browser.png",
      alt: "Two pages open in the IDE's own browser, listed in the sidebar, with the address bar and the shell below",
      width: 2160,
      height: 1350,
    },
    wide: true,
  },
  {
    eyebrow: "Inline completion",
    title: "Grey text, from a model you chose.",
    body:
      "Ghost text in the editor, from a provider you picked for that job — and it is a list of its own, because the models " +
      "that fill in the middle of a file are not the ones that chat. It waits for a pause before asking and drops the " +
      "request the moment you type again, so a suggestion that arrived late never lands on a cursor that moved. Off until " +
      "you turn it on: every pause spends an account.",
    shot: {
      src: "/shots/completion.png",
      alt: "The code completion providers in the desktop settings, separate from text generation",
      width: 1480,
      height: 620,
    },
    wide: true,
  },
  {
    eyebrow: "Source control",
    title: "Git, beside the canvas.",
    body:
      "Pull, stage, commit, push, branch, stash, tag, and a side-by-side diff on any changed file. The commit message " +
      "writes itself when you want it to: the claude or codex CLI already signed in on this machine reads what is staged " +
      "and proposes one line, which you edit before it goes anywhere — no key, no other bill. Conflicts get their own " +
      "group at the top, because they are the only thing you cannot clear by clicking a plus. It drives the git on your " +
      "machine rather than a reimplementation of it, so this panel and a terminal in the same folder cannot disagree.",
    shot: {
      src: "/shots/git.png",
      alt: "The source control panel: a commit message written by the agent, and the changed files",
      width: 524,
      height: 660,
    },
    narrow: true,
  },
  {
    eyebrow: "The store",
    title: "Start from one that already ran.",
    body:
      "Workflows other people published, each shown as what went in and what came out — because a name and a description " +
      "do not tell you whether it does what you want. Installing pulls the node packs it needs. They run on your machine, " +
      "in the sandbox, and you can read the source before installing anything.",
    shot: { src: "/shots/store.png", alt: "The store: published workflows, each with its input and its result", width: 1440, height: 760 },
    link: { href: "/store", label: "Browse the store" },
    flip: true,
  },
]

function Shot({ feature, cap }: { feature: Feature; cap?: boolean }) {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-primary/15 blur-[60px]"
        aria-hidden="true"
      />
      {/* Une capture en portrait — un panneau, un dialogue — est deux fois plus
          haute que sa colonne. Sans plafond, elle écrase la section et le texte
          se retrouve à flotter à côté de son milieu. Coupée par le bas : le
          haut d'un panneau est ce qui le nomme. */}
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-white/[0.09] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] ring-1 ring-inset ring-white/[0.04]",
          cap && "max-h-[460px]",
          // Une capture prise dans un panneau de 260 points fait 520 pixels :
          // étirée sur une demi-page elle repasse à une densité de 1, et le
          // texte devient mou. Elle reste à sa taille.
          feature.narrow && "mx-auto max-w-full"
        )}
        style={
          feature.narrow
            ? // Rendue à la moitié de ses pixels, donc à la densité où elle a
              // été prise : un panneau de 260 points capturé sur un écran
              // Retina fait 520 pixels, et l'afficher sur 520 points le ramène
              // à une densité de 1 — c'est ce qui rendait le texte mou.
              { width: feature.shot.width / 2 }
            : cap
              ? {
                  // Le bas s'efface : une image coupée net a l'air ratée, la
                  // même image fondue a l'air cadrée.
                  maskImage: "linear-gradient(to bottom, black 78%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, black 78%, transparent 100%)",
                }
              : undefined
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={feature.shot.src}
          alt={feature.shot.alt}
          width={feature.shot.width}
          height={feature.shot.height}
          loading="lazy"
          className={cn("block w-full", cap && "object-cover object-top")}
        />
      </div>
    </div>
  )
}

export function FeatureSections() {
  return (
    <div className="space-y-28 py-8 sm:space-y-36">
      {/* La première section est large et seule : c'est le produit lui-même,
          et une capture du canvas dit en une seconde ce qu'un paragraphe met
          trois phrases à expliquer. */}
      <section className="mx-auto max-w-6xl px-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/90">The canvas</p>
        <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-[1.12] tracking-tight sm:text-[2.75rem]">
          Wire the models together.
          <br />
          <span className="text-muted-foreground">Run it as many times as you like.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Text, image and vision models on one canvas, each node carrying what it produced. A workflow is a file in your
          project — it runs from here, from the chat, from an API call, or from an agent.
        </p>
        <div className="mt-12">
          <Shot
            feature={{
              eyebrow: "",
              title: "",
              body: "",
              shot: {
                src: "/shots/canvas.png",
                alt: "A workflow on the canvas: two prompts and two reference images feeding an image generator, then background removal, then a preview",
                width: 1240,
                height: 780,
              },
            }}
          />
        </div>
      </section>

      {/* Juste après le canvas, parce que c'est la deuxième chose qu'on ne
          voyait pas : ce qu'on télécharge est un éditeur, et il a deux
          dispositions. Le reste de la page montre des panneaux ; celle-ci
          montre la fenêtre. */}
      <ModeShowcase />

      {FEATURES.map((f) =>
        f.wide ? (
          <section key={f.title} className="mx-auto max-w-6xl px-6 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/90">{f.eyebrow}</p>
            <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-[1.12] tracking-tight sm:text-[2.75rem]">
              {f.title}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{f.body}</p>
            <div className="mt-12">
              <Shot feature={f} />
            </div>
          </section>
        ) : (
        <section key={f.title} className="mx-auto max-w-6xl px-6">
          <div
            className={cn(
              "grid items-center gap-10 lg:grid-cols-2 lg:gap-16",
              // L'image passe à droite une fois sur deux. En pile, elle reste
              // sous le texte : sur un téléphone, l'ordre de lecture est le
              // seul ordre qui existe.
              f.flip && "lg:[&>*:first-child]:order-2"
            )}
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/90">{f.eyebrow}</p>
              <h2 className="mt-4 text-2xl font-semibold leading-[1.15] tracking-tight sm:text-[2rem]">{f.title}</h2>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">{f.body}</p>
              {f.link && (
                <Link
                  href={f.link.href}
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  {f.link.label} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            <Shot feature={f} cap />
          </div>
        </section>
        )
      )}
    </div>
  )
}
