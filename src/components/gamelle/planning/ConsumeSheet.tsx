'use client'

import { useState } from 'react'
import { X, Minus, Plus, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { PlanningSlotWithRecipe } from '@/lib/gamelle/types'

const UPLOAD_BASE = process.env.NEXT_PUBLIC_GAMELLE_UPLOAD_BASE_URL ?? '/uploads/gamelle'

interface ConsumeSheetProps {
  slot:    PlanningSlotWithRecipe
  onDone:  (updated: PlanningSlotWithRecipe) => void
  onClose: () => void
}

type Step = 'stepper' | 'warnings'

/**
 * Bottom sheet de consommation de portions.
 * Appelle POST /api/gamelle/planning/slots/[id]/consume.
 * Si des warnings sont retournés (stock insuffisant, ingrédient absent),
 * ils sont affichés avant de fermer.
 */
export function ConsumeSheet({ slot, onDone, onClose }: ConsumeSheetProps) {
  const remaining = slot.portions - slot.portionsConsumed
  const [portions,     setPortions]     = useState(Math.min(remaining, 2))
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [step,         setStep]         = useState<Step>('stepper')
  const [warnings,     setWarnings]     = useState<string[]>([])
  const [pendingSlot,  setPendingSlot]  = useState<PlanningSlotWithRecipe | null>(null)

  async function handleConfirm() {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`/api/gamelle/planning/slots/${slot.id}/consume`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ portions }),
      })
      const data = await res.json() as { slot: PlanningSlotWithRecipe; warnings: string[] } | { error?: string }

      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'Erreur')
        return
      }

      const { slot: updatedSlot, warnings: w } = data as { slot: PlanningSlotWithRecipe; warnings: string[] }

      if (w.length > 0) {
        // Montrer les warnings avant de terminer
        setWarnings(w)
        setPendingSlot(updatedSlot)
        setStep('warnings')
      } else {
        onDone(updatedSlot)
      }
    } catch {
      setError('Erreur réseau.')
    } finally {
      setLoading(false)
    }
  }

  function handleAcknowledge() {
    if (pendingSlot) onDone(pendingSlot)
  }

  return (
    <div className="fixed inset-0 z-60 flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div
        className="flex flex-col gap-5 px-4 pt-5 pb-16 rounded-t-2xl"
        style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}
      >
        {/* Header commun */}
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
              {step === 'warnings' ? 'Consommation enregistrée' : 'Consommer'}
            </p>
            <p className="font-display text-base font-semibold truncate" style={{ color: 'var(--text)' }}>
              {slot.recipe.title}
            </p>
          </div>
          <button onClick={step === 'warnings' ? handleAcknowledge : onClose} className="p-1" style={{ color: 'var(--muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* ── Étape 1 : stepper ───────────────────────────────────── */}
        {step === 'stepper' && (
          <>
            <p className="font-body text-sm" style={{ color: 'var(--text2)' }}>
              {remaining} portion{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''} — combien en consommes-tu ?
            </p>

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
          </>
        )}

        {/* ── Étape 2 : warnings ──────────────────────────────────── */}
        {step === 'warnings' && (
          <>
            <div
              className="flex items-start gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'var(--warning-dim, var(--surface2))', border: '1px solid var(--warning)' }}
            >
              <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
              <p className="font-mono text-xs" style={{ color: 'var(--warning)' }}>
                Certains ingrédients n'ont pas pu être déduits du stock.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {warnings.map((w, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
                >
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
                  <p className="font-body text-xs leading-snug" style={{ color: 'var(--text2)' }}>{w}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleAcknowledge}
              className="w-full py-3.5 rounded-xl font-mono text-sm font-medium flex items-center justify-center gap-2"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              <CheckCircle2 size={16} />
              Compris
            </button>
          </>
        )}
      </div>
    </div>
  )
}
