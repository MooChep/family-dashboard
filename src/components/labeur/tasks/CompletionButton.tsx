'use client'

import { useState } from 'react'
import { CheckCircle } from 'lucide-react'

interface CompletionButtonProps {
  taskId:    string
  disabled?: boolean  // true si déjà validé par cet utilisateur
  onSuccess: (taskId: string) => void
}

/**
 * Bouton « J'ai fait ça » avec feedback optimiste.
 * Désactivé si l'utilisateur a déjà validé l'instance courante.
 */
export function CompletionButton({ taskId, disabled, onSuccess }: CompletionButtonProps) {
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [localDone, setLocalDone] = useState(false)

  async function handleClick() {
    if (loading || disabled || localDone) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/labeur/tasks/${taskId}/complete`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Erreur')
        return
      }
      setLocalDone(true)
      onSuccess(taskId)
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  if (disabled || localDone) {
    return (
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
        style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
      >
        <CheckCircle size={13} />
        Fait
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-60"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
      >
        {loading ? '…' : <><CheckCircle size={13} /> J'ai fait ça</>}
      </button>
      {error && (
        <span className="text-[10px]" style={{ color: 'var(--danger)' }}>{error}</span>
      )}
    </div>
  )
}
