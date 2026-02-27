"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import Link from "next/link"

export default function EpargneError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex items-center justify-center h-full p-8">
      <Card className="max-w-lg w-full p-8 space-y-6">
        <h2 className="text-2xl font-semibold">
          Erreur module Épargne
        </h2>

        <p className="text-[var(--text2)]">
          {error.message}
        </p>

        <div className="flex gap-4">
          <Button onClick={reset}>Réessayer</Button>
          <Link href="/">
            <Button variant="secondary">Dashboard</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}