import { cn } from "@/lib/utils"

// L'application, telle qu'elle est.
//
// Deux fausses pistes avant celle-ci. Une illustration générée : jolie, et
// « aucun rapport avec le projet ». Puis la même capture repassée par un modèle
// d'image pour l'habiller : il a ré-écrit tout le texte de l'interface et l'a
// massacré — « zyvro-klaln-T297 », « precilders jcen ». Une page produit qui
// montre une interface aux mots inventés dit d'elle-même qu'elle ment.
//
// Donc les vrais pixels, et la mise en scène faite ici : un cadre, une lueur,
// une ombre. C'est du CSS, donc rien n'est réinventé, et la capture se remplace
// en déposant un fichier.

export function AppShot({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      {/* La lueur vient de derrière la fenêtre, pas de dessous : c'est ce qui
          donne l'impression d'un objet posé dans le noir plutôt que d'une
          image collée sur un fond. */}
      <div
        className="pointer-events-none absolute -inset-x-10 -inset-y-8 -z-10 rounded-[2rem] bg-primary/20 blur-[70px]"
        aria-hidden="true"
      />
      <div className="overflow-hidden rounded-xl border border-white/[0.09] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] ring-1 ring-inset ring-white/[0.04]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/studio.jpg"
          alt="Zyvro Studio: a workflow open on the canvas, the file tree on the left and the agent panel on the right"
          width={1800}
          height={1119}
          className="block w-full"
        />
      </div>
    </div>
  )
}
