import type { Metadata } from "next"
import { SharedWorkflow } from "@/components/SharedWorkflow"
import { API_URL } from "@/lib/api"
import { pageSeo, SITE_NAME } from "@/lib/seo"

// La page d'un lien de partage.
//
// Elle était entièrement côté client, donc un lien collé dans une messagerie
// n'avait que le titre du site et le logo : ni le nom du workflow, ni ce qu'il
// produit. Le corps reste client — il faut une session pour dupliquer — et la
// coquille redevient serveur, ce qui est la seule façon d'annoncer ce que le
// lien contient avant que la page ne s'exécute.
//
// `noIndex` est délibéré : un lien de partage est privé par construction. Son
// auteur l'a envoyé à quelqu'un, il ne l'a pas publié, et un aperçu correct
// dans une conversation n'est pas une demande d'entrer dans un index.

type SharedPreview = {
  input_image?: string
  output_image?: string
}

type SharedWorkflowData = {
  name?: string
  description?: string
  preview?: SharedPreview | null
}

async function fetchShared(id: string): Promise<SharedWorkflowData | null> {
  try {
    const res = await fetch(`${API_URL}/api/workflows/${encodeURIComponent(id)}`, {
      // Court, parce qu'un workflow renommé doit se voir, et parce que la page
      // elle-même se relit à chaque visite.
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const body = await res.json()
    return (body?.workflow ?? body) as SharedWorkflowData
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const wf = await fetchShared(id)
  const name = wf?.name?.trim()
  if (!name) {
    return pageSeo({
      title: "Shared workflow",
      description: `A workflow shared on ${SITE_NAME}.`,
      path: `/w/${id}`,
      noIndex: true,
    })
  }

  // Ce que le workflow a réellement produit, quand il l'a gardé : c'est une
  // bien meilleure annonce que le logo, et c'est déjà une adresse absolue.
  const shot = wf?.preview?.output_image || wf?.preview?.input_image
  return pageSeo({
    title: name,
    description:
      wf?.description?.trim() ||
      `A workflow shared on ${SITE_NAME}. Open it, see how it is wired, and copy it into your own account.`,
    path: `/w/${id}`,
    noIndex: true,
    image: shot ? { url: shot, alt: `${name} — what this workflow produced` } : undefined,
  })
}

export default async function SharedWorkflowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SharedWorkflow id={id} />
}
