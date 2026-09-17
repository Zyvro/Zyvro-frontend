import type { Metadata } from "next"
import { DownloadPage } from "@/components/DownloadPage"
import { pageSeo } from "@/lib/seo"

export const metadata: Metadata = pageSeo({
  title: "Download Zyvro Studio for macOS",
  description:
    "Zyvro Studio for macOS, Apple Silicon and Intel. Workflows beside your code, on your own keys.",
  path: "/download/mac",
})

export default function Page() {
  return <DownloadPage focus="mac" />
}
