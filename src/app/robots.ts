import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo"

// Ce qui a vocation à être trouvé, et ce qui n'en a pas.
//
// L'application est derrière une session : l'indexer produirait des résultats
// qui mènent tous à un écran de connexion. Et /w/ est la page d'un lien de
// partage — privée par construction, jamais publiée par son auteur, donc elle
// n'a rien à faire dans un moteur de recherche même si son adresse circule.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/builder", "/settings", "/admin", "/chat", "/w/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
