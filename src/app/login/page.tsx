"use client"

import Link from "next/link"
import AuthForm from "@/components/AuthForm"
import { AuthCard } from "@/components/AuthCard"

export default function LoginPage() {
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to open your workflows."
      footer={
        <>
          No account?{" "}
          <Link href="/signup" className="text-foreground underline underline-offset-2">
            Sign up
          </Link>
        </>
      }
    >
      <AuthForm mode="login" />
    </AuthCard>
  )
}
