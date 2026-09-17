import type { Metadata } from "next"
import { StoreBrowser } from "@/components/StoreBrowser"
import { pageSeo } from "@/lib/seo"

// Une boutique qu'aucun moteur ne peut lire est une boutique que personne ne
// trouve : la coquille est serveur pour annoncer ce qu'elle contient, le
// parcours reste client.
export const metadata: Metadata = pageSeo({
  title: "Store — workflows and node packs",
  description:
    "Ready-made AI workflows and node packs for Zyvro. Copy one into your account and run it on your own provider keys.",
  path: "/store",
})

export default function Page() {
  return <StoreBrowser />
}
