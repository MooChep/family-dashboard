'use client'

import { useEffect, type ReactElement } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function MoisError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}): ReactElement {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div
      className="rounded-xl p-8 flex flex-col gap-4"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <span
        className="text-xs"
        style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)' }}
      >
        ERREUR — SAISIE MENSUELLE
      </span>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        {error.message || 'Une erreur est survenue.'}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="primary" size="sm">Réessayer</Button>
        <Link href="/butin">
          <Button variant="ghost" size="sm">Retour</Button>
        </Link>
      </div>
    </div>
  )
}