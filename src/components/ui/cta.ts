// Les boutons d'appel, décrits une fois.
//
// Il y en avait trois façons pour trois endroits : une pastille bordée dans
// l'en-tête, un bouton plein plus haut dans le héros, un troisième plus bas
// dans la page de téléchargement — hauteurs, rayons et tailles d'icône
// différents à chaque fois. Mis côte à côte, ça ne ressemble à rien de voulu,
// et c'est exactement ce que ça donnait.
//
// Une seule hauteur, un seul rayon, une seule graisse. Le niveau d'un bouton
// se lit à son fond, pas à sa forme.

export const CTA_BASE =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium " +
  "transition-[transform,background-color,border-color] duration-150 focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"

// Un seul accent par écran. C'est lui qui dit quoi faire.
export const CTA_PRIMARY =
  `${CTA_BASE} bg-primary text-primary-foreground shadow-[0_1px_0_0_hsl(var(--primary)/0.6)_inset,0_8px_24px_-8px_hsl(var(--primary)/0.7)] ` +
  "hover:bg-primary/90 hover:-translate-y-px active:translate-y-0"

// Le second choix : présent, jamais en concurrence.
export const CTA_SECONDARY =
  `${CTA_BASE} border border-white/10 bg-white/[0.04] text-foreground hover:border-white/20 hover:bg-white/[0.07]`

// Dans une barre de navigation, un lien est un lien. L'encadrer en fait un
// bouton de plus, et trois boutons côte à côte n'ont plus de hiérarchie.
export const NAV_LINK =
  "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"

// La taille d'icône qui va avec cette hauteur-là. Écrite ici pour que personne
// n'ait à la redevinner.
export const CTA_ICON = "h-[18px] w-[18px]"

// La même forme pour tout ce qui se clique dans une barre : une pilule.
//
// Le rang se lit au remplissage — plein pour l'action, contour pour la
// seconde, sourd pour la troisième — et jamais à la forme. C'est ce qui fait
// qu'une barre de trois boutons a l'air dessinée plutôt qu'empilée.
const PILL =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-[13px] font-semibold uppercase tracking-[0.08em] " +
  "transition-[transform,background-color,border-color,color] duration-150 focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"

export const PILL_PRIMARY =
  `${PILL} bg-primary text-primary-foreground shadow-[0_8px_24px_-10px_hsl(var(--primary)/0.9)] hover:bg-primary/90 hover:-translate-y-px active:translate-y-0`

export const PILL_OUTLINE =
  `${PILL} border border-primary/45 text-foreground hover:border-primary hover:bg-primary/10`

export const PILL_MUTED = `${PILL} bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1] hover:text-foreground`

// Une pilule de héros : la même chose, en plus grand, parce que c'est l'action
// principale de la page et qu'elle doit se voir de loin.
export const PILL_LARGE = "h-12 px-7 text-sm"
