"use client"

import { useState } from "react"
import { Code2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

// « On ne voit pas que c'est aussi un IDE. »
//
// La page montrait le canvas, les modèles, l'agent, le store — et jamais la
// fenêtre entière. Or ce qu'on télécharge est un éditeur : les fichiers, un
// shell, git, et le canvas dans la même fenêtre. Sans cette section, quelqu'un
// qui arrive croit installer un éditeur de graphes.
//
// Et il y a deux dispositions, qui ne sont pas un réglage cosmétique : en Dev
// on écrit le code et l'agent est un deuxième avis à côté ; en AI l'agent
// occupe le milieu et il n'y a pas de shell. Le sélecteur ici est le même que
// celui de l'application, au même endroit de l'image — on voit ce qu'on
// obtiendra en cliquant sur le vrai.
//
// Deux captures réelles, prises dans l'application, sur un projet où l'agent a
// vraiment exécuté un workflow. Les légendes sont les infobulles du sélecteur
// de l'application, mot pour mot : deux textes qui disent la même chose de deux
// façons finiraient par ne plus la dire pareil.

type ModeKey = "dev" | "ai"

const MODES: {
  key: ModeKey
  label: string
  icon: typeof Code2
  caption: string
  shot: { src: string; alt: string }
}[] = [
  {
    key: "dev",
    label: "Dev",
    icon: Code2,
    caption: "Editor, shell underneath, agent beside.",
    shot: {
      src: "/shots/mode-dev.png",
      alt: "Dev mode: the file tree and this project's workflows on the left, a file open in the editor, a shell underneath, the agent panel on the right",
    },
  },
  {
    key: "ai",
    label: "AI",
    icon: Sparkles,
    caption: "The agent takes the middle. No shell, nothing open — until you open a file, and then it moves to the right.",
    shot: {
      src: "/shots/mode-ai.png",
      alt: "AI mode: the agent fills the window, having just run one of the project's workflows and reported what it returned",
    },
  },
]

export function ModeShowcase({ className }: { className?: string }) {
  const [mode, setMode] = useState<ModeKey>("dev")
  const current = MODES.find((m) => m.key === mode) ?? MODES[0]

  return (
    <section className={cn("mx-auto max-w-6xl px-6 text-center", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/90">The editor</p>
      <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-[1.12] tracking-tight sm:text-[2.75rem]">
        It is an IDE.
        <br />
        <span className="text-muted-foreground">It just knows what your workflows are.</span>
      </h2>
      <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Your files, a real shell, git, and the canvas in the same window. One switch changes who the window is for: write
        the code yourself, or ask for it. Nothing else moves — the same project, the same workflows, the same models.
      </p>

      {/* Le même sélecteur que dans l'application, à la même place sur l'image
          qu'il commande : ce qu'on manipule ici est ce qu'on manipulera là. */}
      <div className="mt-10 flex justify-center">
        <div
          className="flex rounded-md border border-white/[0.08] bg-white/[0.02] p-0.5"
          role="tablist"
          aria-label="Layout"
        >
          {MODES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mode === key}
              onClick={() => setMode(key)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded px-3 text-[13px] transition-colors",
                mode === key ? "bg-white/[0.09] text-foreground" : "text-muted-foreground hover:bg-white/[0.05]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-8">
        <div
          className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-primary/15 blur-[60px]"
          aria-hidden="true"
        />
        <div className="overflow-hidden rounded-xl border border-white/[0.09] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] ring-1 ring-inset ring-white/[0.04]">
          {/* Les deux images sont dans le document, et on en cache une : les
              échanger au clic ferait charger la seconde à cet instant-là, et le
              cadre resterait vide le temps du chargement — sur la seule chose
              que cette section a à montrer. */}
          {MODES.map((m) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={m.key}
              src={m.shot.src}
              alt={m.shot.alt}
              width={2160}
              height={1350}
              loading="lazy"
              aria-hidden={m.key !== mode}
              className={cn("w-full", m.key === mode ? "block" : "hidden")}
            />
          ))}
        </div>
      </div>

      <p className="mx-auto mt-5 max-w-xl text-[13px] leading-relaxed text-muted-foreground">{current.caption}</p>
    </section>
  )
}
