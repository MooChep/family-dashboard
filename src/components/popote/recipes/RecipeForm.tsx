'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import type { CreateRecipePayload, RecipeStep, ApiResponse, RecipeWithIngredients } from '@/lib/popote/types'
import type { ImportFetchResult } from '@/app/api/popote/import/fetch/route'
import type { Resolution } from '@/components/popote/import/IngredientMapper'

interface RecipeFormProps {
  /** Données pré-remplies depuis l'import Jow, ou undefined pour saisie manuelle. */
  prefill?:     ImportFetchResult
  resolutions?: Resolution
}

/**
 * Formulaire d'édition recette — utilisé après import Jow et en saisie manuelle.
 * Règle fondamentale : toujours passer par ce formulaire avant enregistrement.
 */
export function RecipeForm({ prefill, resolutions }: RecipeFormProps) {
  const router = useRouter()

  // ── Champs du formulaire ──────────────────────────────────────────────────
  const [title,           setTitle]           = useState(prefill?.title ?? '')
  const [description,     setDescription]     = useState(prefill?.description ?? '')
  const [preparationTime, setPreparationTime] = useState(String(prefill?.preparationTime ?? ''))
  const [cookingTime,     setCookingTime]     = useState(String(prefill?.cookingTime ?? ''))
  const [basePortions,    setBasePortions]    = useState(String(prefill?.basePortions ?? 4))
  const [utensils,        setUtensils]        = useState('')
  const [steps,           setSteps]           = useState<RecipeStep[]>(prefill?.steps ?? [])
  const [saving,          setSaving]          = useState(false)
  const [error,           setError]           = useState('')

  const scrapeError = prefill?.scrapeError ?? false

  // ── Ingrédients résolus ───────────────────────────────────────────────────
  // On construit la liste depuis les ingrédients Jow + les résolutions manuelles
  const resolvedIngredients = prefill
    ? prefill.ingredients
        .filter(ing => {
          const res = ing.matchStatus.matched
            ? ing.matchStatus.referenceId
            : resolutions?.[ing.jowIndex]?.referenceId
          return Boolean(res)
        })
        .map(ing => {
          const resolution = ing.matchStatus.matched
            ? { referenceId: ing.matchStatus.referenceId, referenceName: ing.matchStatus.referenceName }
            : resolutions![ing.jowIndex]!
          return {
            referenceId:     resolution.referenceId,
            displayQuantity: ing.quantity ?? 0,
            quantity:        ing.quantity ?? 0,
            displayUnit:     ing.unit ?? '',
            isOptional:      ing.isOptional ?? false,
            isStaple:        false,
            label:           resolution.referenceName,
          }
        })
    : []

  // ── Gestion des étapes ────────────────────────────────────────────────────
  function updateStep(idx: number, text: string) {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, text } : s))
  }

  function addStep() {
    setSteps(prev => [...prev, { order: prev.length + 1, text: '', ingredientRefs: [] }])
  }

  function removeStep(idx: number) {
    setSteps(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })))
  }

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!title.trim()) { setError('Le titre est requis.'); return }

    setSaving(true)
    setError('')

    const payload: CreateRecipePayload = {
      title:           title.trim(),
      description:     description.trim() || undefined,
      imageLocal:      prefill?.imageLocal ?? '',
      preparationTime: preparationTime ? Number(preparationTime) : undefined,
      cookingTime:     cookingTime      ? Number(cookingTime)     : undefined,
      basePortions:    Number(basePortions) || 4,
      utensils:        utensils.trim() || undefined,
      steps:           steps.filter(s => s.text.trim()),
      sourceUrl:       prefill?.sourceUrl,
      jowId:           prefill?.jowId,
      ingredients:     resolvedIngredients.map(({ label: _label, ...rest }) => rest),
    }

    try {
      const res = await fetch('/api/popote/recipes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const json = await res.json() as ApiResponse<RecipeWithIngredients>
      if (json.success && json.data) {
        router.push('/popote/recettes')
      } else {
        setError(json.error ?? 'Erreur lors de la sauvegarde.')
      }
    } catch {
      setError('Erreur réseau.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-xl font-body text-sm outline-none'
  const inputStyle = { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }
  const labelClass = 'font-mono text-[10px] uppercase tracking-widest mb-1'

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Avertissement scrape */}
      {scrapeError && (
        <div
          className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: 'var(--warning)18', border: '1px solid var(--warning)', color: 'var(--warning)' }}
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <p className="font-mono text-xs">
            Scraping des étapes échoué — complète les étapes manuellement.
          </p>
        </div>
      )}

      {/* Titre */}
      <div>
        <p className={labelClass} style={{ color: 'var(--muted)' }}>Titre *</p>
        <input
          className={inputClass}
          style={inputStyle}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Nom de la recette"
        />
      </div>

      {/* Description */}
      <div>
        <p className={labelClass} style={{ color: 'var(--muted)' }}>Description</p>
        <textarea
          className={inputClass}
          style={{ ...inputStyle, resize: 'none' }}
          rows={2}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Courte description…"
        />
      </div>

      {/* Temps + portions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Prép. (min)', value: preparationTime, set: setPreparationTime },
          { label: 'Cuisson (min)', value: cookingTime,   set: setCookingTime },
          { label: 'Portions',     value: basePortions,   set: setBasePortions },
        ].map(({ label, value, set }) => (
          <div key={label}>
            <p className={labelClass} style={{ color: 'var(--muted)' }}>{label}</p>
            <input
              type="number"
              min={0}
              className={inputClass}
              style={inputStyle}
              value={value}
              onChange={e => set(e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* Ustensiles */}
      <div>
        <p className={labelClass} style={{ color: 'var(--muted)' }}>Ustensiles</p>
        <input
          className={inputClass}
          style={inputStyle}
          value={utensils}
          onChange={e => setUtensils(e.target.value)}
          placeholder="Casserole, poêle…"
        />
      </div>

      {/* Ingrédients (lecture seule — résultats du mapping) */}
      {resolvedIngredients.length > 0 && (
        <div>
          <p className={labelClass} style={{ color: 'var(--muted)' }}>
            Ingrédients <span style={{ color: 'var(--success)' }}>✓ {resolvedIngredients.length} mappés</span>
          </p>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {resolvedIngredients.map((ing, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2"
                style={{ borderBottom: i < resolvedIngredients.length - 1 ? '1px solid var(--border)' : 'none', background: 'var(--surface2)' }}
              >
                <span className="font-body text-sm" style={{ color: 'var(--text)' }}>{ing.label}</span>
                <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                  {ing.displayQuantity > 0 ? `${ing.displayQuantity} ${ing.displayUnit}`.trim() : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Étapes */}
      <div>
        <p className={labelClass} style={{ color: 'var(--muted)' }}>
          Étapes {steps.length > 0 && <span style={{ color: 'var(--success)' }}>✓ {steps.length} importées</span>}
        </p>
        <div className="flex flex-col gap-2">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <span
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs mt-2"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {step.order}
              </span>
              <textarea
                className="flex-1 px-3 py-2 rounded-xl font-body text-sm outline-none"
                style={{ ...inputStyle, resize: 'none' }}
                rows={2}
                value={step.text}
                onChange={e => updateStep(idx, e.target.value)}
                placeholder={`Étape ${step.order}…`}
              />
              <button
                onClick={() => removeStep(idx)}
                className="mt-2 p-1.5 rounded-lg"
                style={{ color: 'var(--danger)' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={addStep}
            className="flex items-center gap-2 px-3 py-2 rounded-xl font-mono text-xs"
            style={{ background: 'var(--surface2)', color: 'var(--accent)', border: '1px solid var(--border)' }}
          >
            <Plus size={14} /> Ajouter une étape
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <p className="font-mono text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
      )}

      {/* Sauvegarde */}
      <button
        onClick={() => void handleSave()}
        disabled={saving || !title.trim()}
        className="w-full py-3.5 rounded-xl font-mono text-sm font-medium disabled:opacity-40"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        {saving ? 'Enregistrement…' : 'Enregistrer la recette →'}
      </button>
    </div>
  )
}
