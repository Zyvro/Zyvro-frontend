// What the download page offers, taken from the releases themselves.
//
// Nothing here is written down twice: the version, the file names, the sizes
// and the checksums all come from the release that was actually published, so
// a download page cannot advertise a build that does not exist. The page is
// rendered on the server, which is also what lets it ask GitHub at all — the
// browser's CSP allows this origin and the API, and api.github.com is neither.

const REPO = "Zyvro/Zyvro-desktop"

export type Platform = "mac-arm64" | "mac-x64" | "windows"

export type DesktopAsset = {
  name: string
  url: string
  size: number
  platform: Platform
  /** An installer is what to click; an archive is for anyone who would rather
   *  not mount an image, and is never the recommended download. */
  kind: "installer" | "archive"
  sha256?: string
}

export type DesktopRelease = {
  version: string
  tag: string
  url: string
  publishedAt: string
  prerelease: boolean
  assets: DesktopAsset[]
}

// classifyAsset reads a file name the way electron-builder writes it.
//
// The Intel dmg carries no architecture in its name — that is electron-builder's
// convention, not an omission — so the arm64 test has to come first or every
// Mac download becomes an Apple Silicon one.
export function classifyAsset(name: string): { platform: Platform; kind: DesktopAsset["kind"] } | null {
  const n = name.toLowerCase()
  if (n.endsWith(".exe")) return { platform: "windows", kind: "installer" }
  if (n.endsWith(".dmg")) return { platform: n.includes("arm64") ? "mac-arm64" : "mac-x64", kind: "installer" }
  if (n.endsWith(".zip") && n.includes("mac")) {
    return { platform: n.includes("arm64") ? "mac-arm64" : "mac-x64", kind: "archive" }
  }
  return null
}

// checksums reads the table the release workflow appends to the notes.
//
// The names in that table are the files as they were built; GitHub then serves
// them with every space turned into a dot, so the two spellings never match
// literally. Normalising both sides is what keeps a hash attached to its file
// instead of quietly disappearing from the page.
export function checksums(body: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const line of body.split("\n")) {
    const m = line.match(/^\s*\|\s*`([^`]+)`\s*\|\s*`([0-9a-f]{64})`\s*\|\s*$/i)
    if (m) out.set(normalizeAssetName(m[1]), m[2].toLowerCase())
  }
  return out
}

export function normalizeAssetName(name: string): string {
  return name.trim().replace(/\s+/g, ".")
}

// order is how the files are listed: installers before archives, and within a
// platform the one most people need first.
const ORDER: Platform[] = ["mac-arm64", "mac-x64", "windows"]

export function sortAssets(assets: DesktopAsset[]): DesktopAsset[] {
  return [...assets].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "installer" ? -1 : 1
    return ORDER.indexOf(a.platform) - ORDER.indexOf(b.platform)
  })
}

// parseRelease turns one GitHub release into what the page needs.
export function parseRelease(raw: GitHubRelease): DesktopRelease {
  const hashes = checksums(raw.body ?? "")
  const assets: DesktopAsset[] = []
  for (const a of raw.assets ?? []) {
    const kind = classifyAsset(a.name)
    if (!kind) continue
    assets.push({
      name: a.name,
      url: a.browser_download_url,
      size: a.size,
      sha256: hashes.get(normalizeAssetName(a.name)),
      ...kind,
    })
  }
  return {
    version: raw.tag_name.replace(/^v/, ""),
    tag: raw.tag_name,
    url: raw.html_url,
    publishedAt: raw.published_at,
    prerelease: raw.prerelease,
    assets: sortAssets(assets),
  }
}

type GitHubRelease = {
  tag_name: string
  html_url: string
  published_at: string
  prerelease: boolean
  draft: boolean
  body?: string
  assets?: { name: string; size: number; browser_download_url: string }[]
}

// latestDesktopRelease is the newest published release, pre-release included.
//
// /releases/latest is deliberately not used: it skips pre-releases, and every
// release of this app is one today — so that endpoint answers 404 and the page
// would offer nothing while five installers sit on the release page.
export async function latestDesktopRelease(): Promise<DesktopRelease | null> {
  try {
    // Named rather than passed inline, and typed here rather than taken from
    // the framework: that keeps this file compilable on its own, which is what
    // lets the check exercise the real thing instead of a copy of it.
    const init: RequestInit & { next?: { revalidate: number } } = {
      headers: { Accept: "application/vnd.github+json" },
      // Half an hour: a release happens rarely, and a download page that needs
      // a deploy to tell the truth is a download page that lies.
      next: { revalidate: 1800 },
    }
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=10`, init)
    if (!res.ok) return null
    const rows = (await res.json()) as GitHubRelease[]
    const newest = rows.find((r) => !r.draft && (r.assets?.length ?? 0) > 0)
    return newest ? parseRelease(newest) : null
  } catch {
    // The page falls back to the release page itself. An outage at GitHub
    // should cost the visitor a click, not the whole page.
    return null
  }
}

export const RELEASES_URL = `https://github.com/${REPO}/releases`
export const SOURCE_URL = `https://github.com/${REPO}`

export function formatSize(bytes: number): string {
  return `${Math.round(bytes / 1048576)} MB`
}

export const PLATFORM_LABEL: Record<Platform, string> = {
  "mac-arm64": "macOS · Apple Silicon",
  "mac-x64": "macOS · Intel",
  windows: "Windows",
}
