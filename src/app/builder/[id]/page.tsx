"use client"

import Builder from "@/components/Builder"

export default function BuilderPage({ params }: { params: { id: string } }) {
  return <Builder params={params} />
}