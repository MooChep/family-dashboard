'use client'

import { useState } from 'react'
import { X, Minus, Plus } from 'lucide-react'
import type { RecipeCardData, PlanningSlotWithRecipe, CreateSlotPayload, Period } from '@/lib/gamelle/types'

const UPLOAD_BASE = process.env.NEXT_PUBLIC_GAMELLE_UPLOAD_BASE_URL ?? '/uploads/gamelle'

interface AddToMenuSheetProps {
  recipe:        RecipeCardData
  initialDate?:  string
  initialPeriod?: Period
  onConfirm:     (slot: PlanningSlotWithRecipe) => void
  onClose:       () => void
}

/**
 * Bottom sheet d'ajout d'une recette au menu.
 * Sélecteur portions + date optionnelle + période (Midi/Soir).
 */
export function AddToMenuSheet({ recipe, initialDate, initialPeriod, onConfirm, onClose }: AddToMenuSheetProps) {
  const [portions, setPortions] = useState(2)
  const [date,     setDate]     = useState(initialDate ?? '')
  const [period,   setPeriod]   = useState<Period>(initialPeriod ?? 'DINNER')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleConfirm() {
    setLoading(true)
    setError('')
    try {
      const payload: CreateSlotPayload = {
        recipeId: recipe.id,
        portions,
        ...(date ? { scheduledDate: date, period } : {}),
      }
      const res  = await fetch('/api/gamelle/planning/slots', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json() as PlanningSlotWithRecipe
      if (!res.ok) {
        setError((data as unknown as { error?: string }).error ?? 'Erreur')
        return
      }
      onConfirm(data)
    } catch {
      setError('Erreur réseau.')
    } finally {
      setLoading(false)
    }
  }

  const hasImage = recipe.imageLocal || recipe.imageUrl

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
            {hasImage ? (
              <img
                src={recipe.imageLocal ? `${UPLOAD_BASE}/${recipe.imageLocal}` : recipe.imageUrl!}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-display text-xl font-bold" style={{ color: 'var(--muted)' }}>
                {recipe.title.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
              Ajouter au menu
            </p>
            <p className="font-display text-base font-semibold truncate" style={{ color: 'var(--text)' }}>
              {recipe.title}
            </p>
          </div>
          <button onClick={onClose} className="p-1" style={{ color: 'var(--muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Portions */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Portions
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPortions(p => Math.max(1, p - 1))}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)' }}
            >
              <Minus size={13} />
            </button>
            <span className="font-mono text-lg w-6 text-center font-medium" style={{ color: 'var(--text)' }}>
              {portions}
            </span>
            <button
              onClick={() => setPortions(p => p + 1)}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)' }}
            >
              <Plus size={13} />
            </button>
          </div>
        </div>

        {/* Date (optionnelle) */}
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Date <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optionnelle)</span>
          </span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl font-mono text-sm outline-none"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>

        {/* Période — seulement si date choisie */}
        {date && (
          <div className="flex gap-3">
            {(['LUNCH', 'DINNER'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="flex-1 py-2.5 rounded-xl font-mono text-sm transition-colors"
                style={{
                  background: period === p ? 'var(--accent)' : 'var(--surface2)',
                  color:      period === p ? '#fff' : 'var(--text2)',
                  border:     `1px solid ${period === p ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {p === 'LUNCH' ? 'Midi' : 'Soir'}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="font-mono text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
        )}

        {/* Bouton confirmer */}
        <button
          onClick={() => void handleConfirm()}
          disabled={loading}
          className="w-full py-3.5 rounded-xl font-mono text-sm font-medium disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {loading ? 'Ajout…' : '+ Ajouter au menu'}
        </button>
      </div>
    </div>
  )
}
