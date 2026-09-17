import type { Metadata } from "next"
import { DownloadPage } from "@/components/DownloadPage"
import { pageSeo } from "@/lib/seo"

export const metadata: Metadata = pageSeo({
  title: "Download Zyvro Studio",
  description:
    "The Zyvro desktop app for macOS and Windows. Workflows beside your code, on your own keys — free, and open source.",
  path: "/download",
})

// The general page follows the machine it is opened on. /download/mac and
// /download/windows are the same page with the choice already made, for a link
// that has to point at one platform.
export default function Page() {
  return <DownloadPage />
}
