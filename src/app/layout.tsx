import type { Metadata } from "next"
import type { ReactNode } from "react"
import { headers } from "next/headers"
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/seo"
import "./globals.css"
import { Providers } from "./providers"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    // Chaque page nomme ce qu'elle est, et la marque est ajoutée ici : sans
    // gabarit, la moitié des onglets s'appelaient « Zyvro » et l'autre moitié
    // oubliait de le dire.
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: SITE_URL },
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
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    locale: "en",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
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