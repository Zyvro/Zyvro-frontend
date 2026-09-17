import type { Metadata } from "next"
import { DownloadPage } from "@/components/DownloadPage"
import { pageSeo } from "@/lib/seo"

export const metadata: Metadata = pageSeo({
  title: "Download Zyvro Studio for Windows",
  description:
    "Zyvro Studio for Windows. Workflows beside your code, on your own keys.",
  path: "/download/windows",
})

export default function Page() {
  return <DownloadPage focus="windows" />
}
