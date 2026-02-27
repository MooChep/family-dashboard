'use client'

// error.tsx est obligatoirement un Client Component — Next.js l'impose
// car il reçoit un objet Error qui n'est pas sérialisable côté serveur
import { useEffect, type ReactElement } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

interface ErrorProps {
  error: Error & { digest?: string }
  // reset() re-render le segment de route qui a échoué
  // sans recharger toute la page
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps): ReactElement {
  useEffect(() => {
    // En production, on logguerait ici vers un service comme Sentry
    console.error('Erreur globale:', error)
  }, [error])

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div
        className="w-full max-w-md rounded-xl p-8 flex flex-col gap-6"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Code erreur */}
        <div
          className="text-xs font-medium"
          style={{
            color: 'var(--danger)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          ERREUR INATTENDUE
          {error.digest && (
            <span style={{ color: 'var(--muted)' }}> · {error.digest}</span>
          )}
        </div>

        {/* Message */}
        <div className="flex flex-col gap-2">
          <h1
            className="text-xl font-semibold"
            style={{
              color: 'var(--text)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Quelque chose s'est mal passé
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--muted)' }}
          >
            {error.message || 'Une erreur inattendue est survenue. Réessayez ou revenez à l\'accueil.'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button onClick={reset} variant="primary" size="md">
            Réessayer
          </Button>
          <Link href="/">
            <Button variant="ghost" size="md">
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}