import type { Metadata } from "next"
import type { ReactNode } from "react"
import { pageSeo } from "@/lib/seo"

// La page est cliente — elle dérive un mot de passe dans le navigateur — donc
// ce qu'un lien vers elle annonce se déclare ici.
export const metadata: Metadata = pageSeo({
  title: "Log in",
  description:
    "Sign in to Zyvro and run your workflows on your own provider keys.",
  path: "/login",
  noIndex: true,
})

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
