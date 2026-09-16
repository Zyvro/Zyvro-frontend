import type { ReactNode } from "react"
import { headers } from "next/headers"
import "./globals.css"
import { Providers } from "./providers"

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4101"),
  title: "Zyvro - Visual AI Workflow Builder",
  description: "Build reusable visual AI agents/workflows using your own provider keys",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/brand/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Zyvro - Visual AI Workflow Builder",
    description: "Build reusable visual AI agents/workflows using your own provider keys",
    images: [{ url: "/brand/logo-full-with-slogan.png", width: 800, height: 267 }],
    type: "website",
  },
}

// Lire un en-tête de requête fait basculer toutes les routes en rendu à la
// demande, et c'est exprès : une page prérendue est servie depuis le cache
// sans repasser par le rendu, donc sans que Next puisse y poser le nonce de
// cette requête-là. L'en-tête porterait alors un nonce que le HTML n'a pas,
// et la politique bloquerait les scripts de Next — c'est-à-dire l'application
// entière. Vérifié : sans ceci, la page d'accueil sort avec cinq scripts en
// ligne et zéro nonce.
export const dynamic = "force-dynamic"

export default function RootLayout({ children }: { children: ReactNode }) {
  // La valeur ne sert pas ici : Next lit lui-même le nonce dans l'en-tête de
  // requête posé par le middleware et l'appose sur ses balises. L'appel est là
  // pour l'effet de bord ci-dessus.
  headers()

  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}