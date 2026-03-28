'use client'

import { useState } from 'react'
import { X, Minus, Plus } from 'lucide-react'
import type { PlanningSlotWithRecipe } from '@/lib/popote/types'

const UPLOAD_BASE = process.env.NEXT_PUBLIC_POPOTE_UPLOAD_BASE_URL ?? '/uploads/popote'

interface ConsumeSheetProps {
  slot:    PlanningSlotWithRecipe
  onDone:  (updated: PlanningSlotWithRecipe) => void
  onClose: () => void
}

/**
 * Bottom sheet de consommation de portions.
 * Appelle POST /api/popote/planning/slots/[id]/consume et met à jour le slot.
 */
export function ConsumeSheet({ slot, onDone, onClose }: ConsumeSheetProps) {
  const remaining = slot.portions - slot.portionsConsumed
  const [portions, setPortions] = useState(Math.min(remaining, 2))
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleConfirm() {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`/api/popote/planning/slots/${slot.id}/consume`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ portions }),
      })
      const data = await res.json() as PlanningSlotWithRecipe | { error?: string }
      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'Erreur')
        return
      }
      onDone(data as PlanningSlotWithRecipe)
    } catch {
      setError('Erreur réseau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div
        className="flex flex-col gap-5 px-4 pt-5 pb-8 rounded-t-2xl"
        style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="rounded-full overflow-hidden flex items-center justify-center shrink-0"
            style={{ width: 44, height: 44, background: 'var(--surface2)', border: '1px solid var(--border)' }}
          >
            {slot.recipe.imageLocal ? (
              <img
                src={`${UPLOAD_BASE}/${slot.recipe.imageLocal}`}
                alt={slot.recipe.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-display text-xl font-bold" style={{ color: 'var(--muted)' }}>
                {slot.recipe.title.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Consommer
            </p>
            <p className="font-display text-base font-semibold truncate" style={{ color: 'var(--text)' }}>
              {slot.recipe.title}
            </p>
          </div>
          <button onClick={onClose} className="p-1" style={{ color: 'var(--muted)' }}>
            <X size={20} />
          </button>
        </div>

        <p className="font-body text-sm" style={{ color: 'var(--text2)' }}>
          {remaining} portion{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''} — combien en consommes-tu ?
        </p>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-5">
          <button
            onClick={() => setPortions(p => Math.max(1, p - 1))}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)' }}
          >
            <Minus size={16} />
          </button>
          <span className="font-mono text-3xl font-semibold w-10 text-center" style={{ color: 'var(--text)' }}>
            {portions}
          </span>
          <button
            onClick={() => setPortions(p => Math.min(remaining, p + 1))}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)' }}
          >
            <Plus size={16} />
          </button>
        </div>

        {error && (
          <p className="font-mono text-xs text-center" style={{ color: 'var(--danger)' }}>{error}</p>
        )}

        <button
          onClick={() => void handleConfirm()}
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-mono text-sm font-medium disabled:opacity-40"
          style={{ background: 'var(--success, var(--accent))', color: '#fff' }}
        >
          {loading ? 'Enregistrement…' : 'Confirmer'}
        </button>
      </div>
    </div>
  )
}
