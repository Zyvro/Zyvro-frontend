"use client"

import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import type { ReactNode } from "react"
import { PageViewTracker } from "@/components/PageViewTracker"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PageViewTracker />
      {children}
    </QueryClientProvider>
  )
}