"use client"

import Link from "next/link"
import AuthForm from "@/components/AuthForm"
import { AuthCard } from "@/components/AuthCard"

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      subtitle="Free. Bring your own provider keys."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-foreground underline underline-offset-2">
            Log in
          </Link>
        </>
      }
    >
      <AuthForm mode="signup" />
    </AuthCard>
  )
}
