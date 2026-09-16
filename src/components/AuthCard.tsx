import Link from "next/link"

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse at 50% 40%, black 10%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, black 10%, transparent 70%)",
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[24rem] w-[40rem] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />
      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-6 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-full.png" alt="Zyvro" className="hidden h-9 w-auto sm:block" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-icon.png" alt="Zyvro" className="h-9 w-9 rounded-lg sm:hidden" />
        </Link>
        <div className="rounded-xl border border-white/[0.08] bg-card/95 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">{footer}</p>
      </div>
    </div>
  )
}
