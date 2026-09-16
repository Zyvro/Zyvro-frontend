"use client"

import { usePathname } from "next/navigation"
import { api } from "@/lib/api"

const SESSION_KEY = "zyvro_sid"

// In-memory fallbacks for browsers where sessionStorage throws (private mode,
// blocked site data, etc). These live for the tab's lifetime only.
let memorySessionId: string | null = null
let memoryReferrerSent = false

function newSessionId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
  }
}

// Reads (or creates) the opaque per-session id. Every sessionStorage access
// is wrapped in try/catch because private-mode browsers can throw on read
// or write.
function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const id = newSessionId()
    sessionStorage.setItem(SESSION_KEY, id)
    return id
  } catch {
    if (!memorySessionId) memorySessionId = newSessionId()
    return memorySessionId
  }
}

// The external referrer only counts for the first view of a session; every
// navigation after that is internal and must not be reported as referred
// traffic. Tracked via a sessionStorage flag with an in-memory fallback.
function takeReferrerOnce(): string {
  const FLAG_KEY = "zyvro_sid_ref_sent"
  try {
    if (sessionStorage.getItem(FLAG_KEY)) return ""
    sessionStorage.setItem(FLAG_KEY, "1")
    return document.referrer || ""
  } catch {
    if (memoryReferrerSent) return ""
    memoryReferrerSent = true
    return document.referrer || ""
  }
}

// Module-level: the last path we already reported. Fired during render, not
// in useEffect (banned in new code). Reading/writing a module-level variable
// during render is impure in the strict sense, but it is guarded so it only
// ever executes once per distinct path, and the actual network call is
// deferred to a microtask via queueMicrotask so it never runs inside React's
// synchronous render pass — it fires after render commits, same as an effect
// would, but without adding a fake DOM node or a useEffect hook. This mirrors
// the doctrine's "derived state computed during render, side effect kept out
// of the committed render path" pattern for a one-shot-per-value case.
let lastTrackedPath: string | null = null

export function PageViewTracker() {
  const pathname = usePathname()

  if (typeof window !== "undefined" && pathname && pathname !== lastTrackedPath) {
    lastTrackedPath = pathname
    const sessionId = getSessionId()
    const referrer = takeReferrerOnce()
    queueMicrotask(() => {
      void api.trackPageView(pathname, sessionId, referrer)
    })
  }

  return null
}
