import type { MetadataRoute } from "next"
import { canonical } from "@/lib/seo"

// Les pages publiques, celles qu'un visiteur peut lire sans compte.
//
// Écrite à la main et courte plutôt que dérivée du dossier des routes : la
// moitié des fichiers de `app/` sont derrière une session, et une liste
// engendrée les ferait toutes entrer ici.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: canonical("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: canonical("/download"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: canonical("/download/mac"), lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: canonical("/download/windows"), lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: canonical("/store"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: canonical("/signup"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ]
}
