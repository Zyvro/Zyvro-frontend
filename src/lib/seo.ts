import type { Metadata } from "next"

// Ce qu'un lien vers Zyvro montre ailleurs : dans un onglet, dans un résultat
// de recherche, dans un message qu'on colle.
//
// En un seul endroit, parce que ces valeurs se répétaient déjà — un titre dans
// le layout, un autre dans openGraph, un troisième dans twitter — et trois
// copies d'une même phrase, c'est deux phrases qui finissent fausses.

export const SITE_NAME = "Zyvro"
// Le slogan de marque — celui qui est cuit dans le logo.
export const SITE_TAGLINE = "More than prompts"
// Ce que le produit EST. Un slogan ne dit pas la catégorie, et c'est la
// catégorie qu'on lit dans un onglet ou un résultat de recherche : « Zyvro —
// More than prompts » ne laisse pas deviner un environnement de développement.
//
// **Environment, pas Editor** — corrigé par Jeremy le 18/09, et ce n'est pas
// un détail de vocabulaire : avec le vrai mot, le parallèle avec IDE est exact.
// Integrated Development Environment, Agent Development Environment : une
// lettre change, et c'est celle qui dit tout le produit. « Editor » cassait ce
// parallèle en même temps qu'il rétrécissait l'outil à son éditeur de texte,
// alors qu'il porte aussi un shell, git, un navigateur et le canvas.
export const SITE_CATEGORY = "Agent Development Environment"

export const SITE_DESCRIPTION =
  "An IDE built around the agent, not beside it. Claude Code, Codex and Qwen run inside the window, on your " +
  "machine, with your files, your terminal, your git and your own provider keys — beside a canvas where you " +
  "wire the text, image and vision workflows they can call."

// L'origine publique. Gravée à la compilation comme celle de l'API, et pour la
// même raison : une URL absolue est obligatoire dans une balise Open Graph, et
// un aperçu construit sur « localhost » ne montre rien à personne.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4101"
).replace(/\/+$/, "")

// L'image d'aperçu par défaut : le logo à slogan, posé sur le noir du site.
// Le PNG de marque est transparent, donc sur fond blanc — celui de la plupart
// des clients de messagerie — il disparaissait.
export const OG_IMAGE = {
  url: "/brand/og-default.png",
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
}

export function canonical(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`
}

type PageSeoInput = {
  title: string
  description: string
  path: string
  /** Une image d'aperçu propre à la page : la vignette d'un workflow, par
   *  exemple. Absolue, parce qu'un aperçu est lu par une machine ailleurs. */
  image?: { url: string; width?: number; height?: number; alt?: string }
  /** Un titre qui porte déjà la marque. Sans ça, le gabarit du layout ajoute
   *  « — Zyvro » à la fin et l'accueil s'appelle « Zyvro — More than prompts
   *  — Zyvro ». */
  absoluteTitle?: boolean
  /** Une page qui n'a pas à se retrouver dans un moteur de recherche : ce qui
   *  est derrière une session, et un lien de partage, qui est privé par
   *  construction et n'a jamais demandé à être public. */
  noIndex?: boolean
  type?: "website" | "article"
}

// pageSeo assemble le même titre et la même description pour l'onglet, pour
// Open Graph et pour la carte Twitter, à partir d'une seule déclaration.
export function pageSeo({
  title,
  description,
  path,
  image,
  noIndex,
  absoluteTitle,
  type = "website",
}: PageSeoInput): Metadata {
  const images = [image ? { ...image, alt: image.alt ?? title } : OG_IMAGE]
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: canonical(path) },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type,
      siteName: SITE_NAME,
      url: canonical(path),
      title,
      description,
      images,
    },
    twitter: {
      // La carte large : nos aperçus sont des captures de workflows et un logo
      // au format 1200x630. Dans une vignette carrée, les deux sont rognés.
      card: "summary_large_image",
      title,
      description,
      images,
    },
  }
}
