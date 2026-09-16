"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Compass, KeyRound, LayoutGrid, LogOut, MessageSquare, Settings, Shield } from "lucide-react"
import { ChatDock } from "@/components/ChatDock"
import { useLogout, useMe } from "@/lib/hooks"
import { cn } from "@/lib/utils"

// Shared chrome for the authenticated pages (dashboard, settings).
export function AppShell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: me } = useMe()
  const logout = useLogout()
  const initial = (me?.name || me?.email || "?").trim().charAt(0).toUpperCase()

  const nav = [
    { href: "/dashboard", label: "Workflows", icon: LayoutGrid },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/providers", label: "Providers", icon: KeyRound },
    { href: "/settings", label: "Settings", icon: Settings },
    ...(me?.is_admin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/80 backdrop-blur">
        <div className={cn("mx-auto flex h-14 items-center justify-between px-6", wide ? "max-w-6xl" : "max-w-3xl")}>
          <div className="flex min-w-0 flex-1 items-center gap-6">
            <Link href="/dashboard" className="flex shrink-0 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-full.png" alt="Zyvro" className="hidden h-7 w-auto sm:block" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-icon.png" alt="Zyvro" className="h-8 w-8 shrink-0 rounded-lg sm:hidden" />
            </Link>
            <nav className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {nav.map((n) => {
                const active = pathname?.startsWith(n.href)
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                      active ? "bg-white/[0.06] text-foreground" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                    )}
                  >
                    <n.icon className="h-4 w-4" />
                    {n.label}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2 pl-3">
            {/* The address only fits once the nav has room for every entry. */}
            <span className="hidden max-w-[14rem] truncate text-xs text-muted-foreground xl:block">{me?.email}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-semibold text-muted-foreground">{initial}</span>
            <button
              className="rounded-lg p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
              title="Log out"
              onClick={() => logout.mutate(undefined, { onSuccess: () => router.push("/login") })}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main className={cn("mx-auto px-6 py-10", wide ? "max-w-6xl" : "max-w-3xl")}>{children}</main>
      <ChatDock />
    </div>
  )
}
