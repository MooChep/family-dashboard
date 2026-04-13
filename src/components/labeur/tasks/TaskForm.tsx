'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CreateTaskPayload, LabeurTaskFrequency, LabeurTaskType } from '@/lib/labeur/types'

interface TaskFormProps {
  /** Si fourni → mode édition (PUT), sinon création (POST) */
  taskId?: string
  initialValues?: Partial<CreateTaskPayload>
}

const FREQUENCY_OPTIONS: { value: LabeurTaskFrequency; label: string }[] = [
  { value: 'DAILY',   label: 'Tous les jours'    },
  { value: 'WEEKLY',  label: 'Toutes les semaines' },
  { value: 'MONTHLY', label: 'Tous les mois'     },
  { value: 'CUSTOM',  label: 'Intervalle personnalisé' },
]

// Grille de valeurs écu suggérées (§3.1)
const ECU_PRESETS = [1, 2, 3, 5, 8, 10, 15, 20]

/**
 * Formulaire de création / édition d'une tâche Labeur.
 * Gère les deux types (RECURRING / ONESHOT) et la configuration de fréquence.
 */
export function TaskForm({ taskId, initialValues }: TaskFormProps) {
  const router  = useRouter()
  const isEdit  = !!taskId

  const [type,         setType]         = useState<LabeurTaskType>(initialValues?.type         ?? 'RECURRING')
  const [title,        setTitle]        = useState(initialValues?.title                         ?? '')
  const [description,  setDescription]  = useState(initialValues?.description                   ?? '')
  const [ecuValue,     setEcuValue]     = useState(initialValues?.ecuValue                      ?? 5)
  const [isShared,     setIsShared]     = useState(initialValues?.isShared                      ?? false)
  const [frequency,    setFrequency]    = useState<LabeurTaskFrequency>(
    initialValues?.recurrence?.frequency ?? 'WEEKLY'
  )
  const [intervalDays, setIntervalDays] = useState(initialValues?.recurrence?.intervalDays ?? 7)
  const [dueDate,      setDueDate]      = useState(initialValues?.dueDate ?? '')
  const [inflRate,     setInflRate]     = useState(initialValues?.inflationContribRate ?? 0.01)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) { setError('Le titre est requis'); return }
    if (ecuValue < 1)  { setError('La valeur en écu doit être ≥ 1'); return }
    if (type === 'RECURRING' && frequency === 'CUSTOM' && intervalDays < 1) {
      setError('L\'intervalle doit être ≥ 1 jour'); return
    }

    setLoading(true)

    // Calculer nextDueAt par défaut : maintenant + 1 période
    function defaultNextDue(): string {
      const d = new Date()
      if (frequency === 'DAILY')   d.setDate(d.getDate() + 1)
      else if (frequency === 'WEEKLY')  d.setDate(d.getDate() + 7)
      else if (frequency === 'MONTHLY') d.setMonth(d.getMonth() + 1)
      else d.setDate(d.getDate() + intervalDays)
      return d.toISOString()
    }

    const payload: CreateTaskPayload = {
      title:               title.trim(),
      description:         description.trim() || undefined,
      type,
      isShared,
      ecuValue,
      inflationContribRate: inflRate,
      ...(type === 'ONESHOT' && dueDate ? { dueDate } : {}),
      ...(type === 'RECURRING' ? {
        recurrence: {
          frequency,
          intervalDays: frequency === 'CUSTOM' ? intervalDays : undefined,
          nextDueAt:    defaultNextDue(),
        },
      } : {}),
    }

    try {
      const url    = isEdit ? `/api/labeur/tasks/${taskId}` : '/api/labeur/tasks'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Erreur')
        return
      }

      router.push('/labeur/taches')
      router.refresh()
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">

      {/* Type */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          Type de tâche
        </label>
        <div className="flex gap-2">
          {(['RECURRING', 'ONESHOT'] as LabeurTaskType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: type === t ? 'var(--accent)' : 'var(--surface2)',
                color:           type === t ? 'var(--bg)'     : 'var(--text2)',
              }}
            >
              {t === 'RECURRING' ? '🔄 Récurrente' : '📅 Ponctuelle'}
            </button>
          ))}
        </div>
      </div>

      {/* Titre */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          Titre
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex : Sortir les poubelles"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{
            backgroundColor: 'var(--surface)',
            border:          '1px solid var(--border)',
            color:           'var(--text)',
          }}
          required
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          Description <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optionnel)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Détails ou précisions…"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
          style={{
            backgroundColor: 'var(--surface)',
            border:          '1px solid var(--border)',
            color:           'var(--text)',
          }}
        />
      </div>

      {/* Valeur en écu */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          Valeur — {ecuValue} écu
        </label>
        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {ECU_PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setEcuValue(v)}
              className="px-3 py-1.5 rounded-lg text-sm font-mono transition-all"
              style={{
                backgroundColor: ecuValue === v ? 'var(--accent)' : 'var(--surface2)',
                color:           ecuValue === v ? 'var(--bg)'     : 'var(--text2)',
              }}
            >
              {v}
            </button>
          ))}
        </div>
        {/* Saisie libre */}
        <input
          type="number"
          min={1}
          max={100}
          value={ecuValue}
          onChange={(e) => setEcuValue(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-24 px-3 py-2 rounded-xl text-sm font-mono outline-none"
          style={{
            backgroundColor: 'var(--surface)',
            border:          '1px solid var(--border)',
            color:           'var(--text)',
          }}
        />
      </div>

      {/* Fréquence (RECURRING uniquement) */}
      {type === 'RECURRING' && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Fréquence
          </label>
          <div className="grid grid-cols-2 gap-2">
            {FREQUENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFrequency(opt.value)}
                className="py-2 px-3 rounded-lg text-sm text-left transition-all"
                style={{
                  backgroundColor: frequency === opt.value ? 'var(--accent-dim)' : 'var(--surface2)',
                  color:           frequency === opt.value ? 'var(--accent)'      : 'var(--text2)',
                  border:          frequency === opt.value ? '1px solid var(--accent)' : '1px solid transparent',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {frequency === 'CUSTOM' && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm" style={{ color: 'var(--text2)' }}>Tous les</span>
              <input
                type="number"
                min={1}
                value={intervalDays}
                onChange={(e) => setIntervalDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-3 py-2 rounded-xl text-sm font-mono outline-none"
                style={{
                  backgroundColor: 'var(--surface)',
                  border:          '1px solid var(--border)',
                  color:           'var(--text)',
                }}
              />
              <span className="text-sm" style={{ color: 'var(--text2)' }}>jours</span>
            </div>
          )}
        </div>
      )}

      {/* Date limite (ONESHOT uniquement) */}
      {type === 'ONESHOT' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Date limite <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optionnel)</span>
          </label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: 'var(--surface)',
              border:          '1px solid var(--border)',
              color:           'var(--text)',
            }}
          />
        </div>
      )}

      {/* Tâche partagée */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Tâche partagée</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Nécessite une validation des deux membres
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsShared((v) => !v)}
          className="w-11 h-6 rounded-full transition-all relative"
          style={{ backgroundColor: isShared ? 'var(--accent)' : 'var(--surface2)' }}
        >
          <div
            className="absolute top-1 w-4 h-4 rounded-full transition-all"
            style={{
              backgroundColor: 'white',
              left:            isShared ? 'calc(100% - 20px)' : '4px',
            }}
          />
        </button>
      </div>

      {/* Taux d'inflation (avancé) */}
      <details className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <summary
          className="px-4 py-3 text-sm cursor-pointer"
          style={{ color: 'var(--muted)', backgroundColor: 'var(--surface)' }}
        >
          Paramètres avancés
        </summary>
        <div className="px-4 py-3 flex flex-col gap-2" style={{ backgroundColor: 'var(--surface)' }}>
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            Taux d'inflation / jour ({(inflRate * 100).toFixed(0)} %)
          </label>
          <input
            type="range"
            min={0.005}
            max={0.05}
            step={0.005}
            value={inflRate}
            onChange={(e) => setInflRate(parseFloat(e.target.value))}
            className="w-full accent-(--accent)"
          />
          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
            Contribution à l'inflation du Marché : {ecuValue} écu × {(inflRate * 100).toFixed(0)} % × jours retard
          </p>
        </div>
      </details>

      {/* Erreur */}
      {error && (
        <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
      )}

      {/* Boutons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-3 rounded-xl text-sm font-medium"
          style={{ backgroundColor: 'var(--surface2)', color: 'var(--text2)' }}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--bg)' }}
        >
          {loading ? '…' : isEdit ? 'Enregistrer' : 'Créer la tâche'}
        </button>
      </div>

    </form>
  )
}
