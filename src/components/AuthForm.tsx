"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLogin, useSignup } from "@/lib/hooks"
import { ApiError } from "@/lib/api"

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")

  const login = useLogin()
  const signup = useSignup()
  const pending = login.isPending || signup.isPending

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    try {
      if (mode === "login") {
        await login.mutateAsync({ email, password })
      } else {
        await signup.mutateAsync({ email, password, name })
      }
      router.push("/dashboard")
    } catch (err) {
      // Being throttled is not a credentials problem, and saying "try again
      // later" without saying when is no help at all.
      if (err instanceof ApiError && err.code === "rate_limited") {
        const wait = Number(err.payload?.retry_after_seconds) || 0
        setError(
          mode === "login"
            ? `Too many sign-in attempts from your network. Try again ${formatWait(wait)}.`
            : `Too many accounts created from your network. Try again ${formatWait(wait)}.`
        )
        return
      }
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 w-full">
      {mode === "signup" && (
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
      )}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Email</label>
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Password</label>
        <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
      </div>
      {error && <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
      </Button>
    </form>
  )
}
// formatWait turns the server's cooldown into something a person can act on.
function formatWait(seconds: number): string {
  if (seconds <= 0) return "shortly"
  if (seconds < 60) return `in ${seconds} seconds`
  const minutes = Math.ceil(seconds / 60)
  return `in ${minutes} minute${minutes === 1 ? "" : "s"}`
}
