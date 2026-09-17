import type { Metadata } from "next"
import type { ReactNode } from "react"
import { pageSeo } from "@/lib/seo"

// La page est cliente — elle dérive un mot de passe dans le navigateur — donc
// ce qu'un lien vers elle annonce se déclare ici.
export const metadata: Metadata = pageSeo({
  title: "Create an account",
  description:
    "Start building AI workflows on a canvas. Free, on your own provider keys — no card, no credits to buy.",
  path: "/signup",
})

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
