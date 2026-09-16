import type { ReactNode } from "react"
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}