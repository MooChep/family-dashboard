'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'
import type { CreateRecipePayload, RecipeStep, ApiResponse, RecipeWithIngredients, RecipeCategory } from '@/lib/gamelle/types'
import type { ImportFetchResult } from '@/app/api/gamelle/import/fetch/route'
import type { Resolution } from '@/components/gamelle/import/IngredientMapper'
import type { IngredientWithAisle } from '@/app/api/gamelle/ingredients/route'
import { IngredientPicker } from '@/components/gamelle/shared/IngredientPicker'
import { convertToBase } from '@/lib/gamelle/units'

const UPLOAD_BASE = process.env.NEXT_PUBLIC_GAMELLE_UPLOAD_BASE_URL ?? '/api/gamelle/images'

interface RecipeFormProps {
  /** Données pré-remplies depuis l'import Jow, ou undefined pour saisie manuelle. */
  prefill?:      ImportFetchResult
  resolutions?:  Resolution
  /** Recette existante à éditer (mode="edit"). */
  initialData?:  RecipeWithIngredients
  mode?:         'create' | 'edit'
  /** Appelé après une sauvegarde réussie (avant router.push). */
  onSuccess?:    () => void
}

type IngredientRow = {
  referenceId:     string
  label:           string
  displayQuantity: number
  displayUnit:     string
  quantity:        number
  isOptional:      boolean
  isIgnored:       boolean
  isStaple:        boolean
}

/**
 * Formulaire d'édition recette — utilisé après import Jow et en saisie manuelle.
 * Les ingrédients sont éditables (quantité, unité, ajout, suppression).
 */
export function RecipeForm({ prefill, resolutions, initialData, mode = 'create', onSuccess }: RecipeFormProps) {
  const router = useRouter()
  const isEdit = mode === 'edit'

  // ── Champs du formulaire ──────────────────────────────────────────────────
  const [title,           setTitle]           = useState(initialData?.title ?? prefill?.title ?? '')
  const [description,     setDescription]     = useState(initialData?.description ?? prefill?.description ?? '')
  const [preparationTime, setPreparationTime] = useState(String(initialData?.preparationTime ?? prefill?.preparationTime ?? ''))
  const [cookingTime,     setCookingTime]     = useState(String(initialData?.cookingTime ?? prefill?.cookingTime ?? ''))
  const [basePortions,    setBasePortions]    = useState(String(initialData?.basePortions ?? prefill?.basePortions ?? 4))
  const [utensils,        setUtensils]        = useState(initialData?.utensils ?? '')
  const [category,        setCategory]        = useState<RecipeCategory>(initialData?.category ?? (prefill ? 'MAIN' : 'OTHER'))
  const [steps,           setSteps]           = useState<RecipeStep[]>(initialData?.steps ?? prefill?.steps ?? [])
  const [saving,          setSaving]          = useState(false)
  const [deleting,        setDeleting]        = useState(false)
  const [error,           setError]           = useState('')

  const scrapeError = prefill?.scrapeError ?? false

  // ── Ingrédients éditables ─────────────────────────────────────────────────
  // Priorité : initialData (édition) > resolutions (mapper import) > matchStatus
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>(() => {
    if (initialData) {
      return initialData.ingredients.map(ing => ({
        referenceId:     ing.referenceId,
        label:           ing.reference.name,
        displayQuantity: ing.displayQuantity,
        quantity:        ing.quantity,
        displayUnit:     ing.displayUnit,
        isOptional:      ing.isOptional,
        isIgnored:       ing.isIgnored,
        isStaple:        ing.isStaple,
      }))
    }
    if (!prefill) return []
    return prefill.ingredients.flatMap(ing => {
      const rawQty  = ing.quantity ?? 0
      const rawUnit = (ing.unit ?? '').trim().toLowerCase()

      // Normalise les unités Jow (abréviations françaises) et unités SI dérivées → unités de base
      let dispQty  = rawQty
      let dispUnit = ing.unit ?? ''
      if (['kg', 'kilog', 'kilo', 'kilogramme', 'kilogrammes'].includes(rawUnit)) {
        dispQty = rawQty * 1000; dispUnit = 'g'
      } else if (['cl', 'centilitre', 'centilitres', 'centi'].includes(rawUnit)) {
        dispQty = rawQty * 10;   dispUnit = 'ml'
      } else if (['l', 'litre', 'litres', 'liter', 'liters'].includes(rawUnit)) {
        dispQty = rawQty * 1000; dispUnit = 'ml'
      } else if (['g', 'gram', 'gramme', 'grammes'].includes(rawUnit)) {
        dispUnit = 'g'
      } else if (['ml', 'millilitre', 'millilitres', 'milliliter'].includes(rawUnit)) {
        dispUnit = 'ml'
      }

      // quantity = valeur en unité de base (g, ml, UNIT)
      const baseQty = convertToBase(dispQty, dispUnit, []) ?? dispQty

      const base = {
        displayQuantity: dispQty,
        quantity:        baseQty,
        displayUnit:     dispUnit,
        isOptional:      ing.isOptional ?? false,
        isIgnored:       false,
        isStaple:        false,
      }
      const res = resolutions?.[ing.jowIndex]
      if (res) {
        if (res.referenceId === null) return []
        return [{ ...base, referenceId: res.referenceId, label: res.referenceName }]
      }
      if (ing.matchStatus.matched) {
        return [{ ...base, referenceId: ing.matchStatus.referenceId, label: ing.matchStatus.referenceName }]
      }
      return []
    })
  })

  // ── Ajout d'ingrédient via IngredientPicker ───────────────────────────────
  function addRow(ref: IngredientWithAisle) {
    setIngredientRows(prev => [...prev, {
      referenceId: ref.id, label: ref.name,
      displayQuantity: 0, quantity: 0, displayUnit: '',
      isOptional: false, isIgnored: false, isStaple: false,
    }])
  }

  function updateRow(idx: number, patch: Partial<IngredientRow>) {
    setIngredientRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  function removeRow(idx: number) {
    setIngredientRows(prev => prev.filter((_, i) => i !== idx))
  }

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
      imageLocal:      initialData?.imageLocal ?? prefill?.imageLocal ?? '',
      preparationTime: preparationTime ? Number(preparationTime) : undefined,
      cookingTime:     cookingTime      ? Number(cookingTime)     : undefined,
      basePortions:    Number(basePortions) || 4,
      utensils:        utensils.trim() || undefined,
      category,
      steps:           steps.filter(s => s.text.trim()),
      sourceUrl:       prefill?.sourceUrl,
      jowId:           prefill?.jowId,
      ingredients:     ingredientRows.map(({ label: _l, ...rest }) => rest as import('@/lib/gamelle/types').CreateRecipeIngredientPayload),
    }

    try {
      const url    = isEdit ? `/api/gamelle/recipes/${initialData!.id}` : '/api/gamelle/recipes'
      const method = isEdit ? 'PATCH' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const json   = await res.json() as ApiResponse<RecipeWithIngredients>
      if (json.success && json.data) {
        onSuccess?.()
        router.refresh()
        router.push('/gamelle/recettes')
      } else {
        setError(json.error ?? 'Erreur lors de la sauvegarde.')
      }
    } catch {
      setError('Erreur réseau.')
    } finally {
      setSaving(false)
    }
  }

  // ── Suppression ───────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!initialData) return
    if (!confirm(`Supprimer "${initialData.title}" ? Cette action est irréversible.`)) return

    setDeleting(true)
    try {
      await fetch(`/api/gamelle/recipes/${initialData.id}`, { method: 'DELETE' })
      router.refresh()
      router.push('/gamelle/recettes')
    } catch {
      setError('Erreur lors de la suppression.')
      setDeleting(false)
    }
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-xl font-body text-sm outline-none'
  const inputStyle = { background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }
  const labelClass = 'font-mono text-[10px] uppercase tracking-widest mb-1'

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Aperçu image importée */}
      {prefill?.imageLocal && (
        <div className="flex items-center gap-3">
          <img
            src={`${UPLOAD_BASE}/${prefill.imageLocal}`}
            alt="Aperçu"
            className="w-16 h-16 rounded-xl object-cover"
            style={{ border: '1px solid var(--border)', flexShrink: 0 }}
          />
          <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>Photo importée</p>
        </div>
      )}

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

      {/* Catégorie + Ustensiles */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className={labelClass} style={{ color: 'var(--muted)' }}>Catégorie</p>
          <select
            className={inputClass}
            style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }}
            value={category}
            onChange={e => setCategory(e.target.value as RecipeCategory)}
          >
            <option value="STARTER">Entrée</option>
            <option value="MAIN">Plat</option>
            <option value="DESSERT">Dessert</option>
            <option value="OTHER">Autre</option>
          </select>
        </div>
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
      </div>

      {/* Ingrédients éditables */}
      <div>
        <p className={labelClass} style={{ color: 'var(--muted)' }}>
          Ingrédients
          {ingredientRows.length > 0 && (
            <span className="ml-1.5" style={{ color: 'var(--success)' }}>✓ {ingredientRows.length}</span>
          )}
        </p>

        {/* Lignes existantes */}
        {ingredientRows.length > 0 && (
          <div className="rounded-xl overflow-hidden mb-2" style={{ border: '1px solid var(--border)' }}>
            {ingredientRows.map((row, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2"
                style={{ borderBottom: i < ingredientRows.length - 1 ? '1px solid var(--border)' : 'none', background: 'var(--surface2)' }}
              >
                <span className="flex-1 font-body text-sm truncate" style={{ color: 'var(--text)' }}>{row.label}</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={row.displayQuantity || ''}
                  onChange={e => {
                    const dq  = Number(e.target.value)
                    const qty = convertToBase(dq, row.displayUnit, []) ?? dq
                    updateRow(i, { displayQuantity: dq, quantity: qty })
                  }}
                  placeholder="Qté"
                  className="font-mono text-xs text-right outline-none rounded-lg px-2 py-1"
                  style={{ width: 56, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
                <input
                  value={row.displayUnit}
                  onChange={e => {
                    const newUnit = e.target.value
                    const qty     = convertToBase(row.displayQuantity, newUnit, []) ?? row.displayQuantity
                    updateRow(i, { displayUnit: newUnit, quantity: qty })
                  }}
                  placeholder="unité"
                  className="font-mono text-xs outline-none rounded-lg px-2 py-1"
                  style={{ width: 52, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
                <button onClick={() => removeRow(i)} style={{ color: 'var(--danger)', flexShrink: 0 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Ajout via IngredientPicker */}
        <IngredientPicker
          onSelect={addRow}
          placeholder="+ Ajouter un ingrédient…"
        />
      </div>

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
                style={{ ...inputStyle, resize: 'none', overflow: 'hidden', minHeight: '3rem' }}
                value={step.text}
                onChange={e => updateStep(idx, e.target.value)}
                onInput={e => {
                  const el = e.currentTarget
                  el.style.height = 'auto'
                  el.style.height = `${el.scrollHeight}px`
                }}
                ref={el => {
                  if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }
                }}
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
        disabled={saving || deleting || !title.trim()}
        className="w-full py-3.5 rounded-xl font-mono text-sm font-medium disabled:opacity-40"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications →' : 'Enregistrer la recette →'}
      </button>

      {/* Suppression — mode édition uniquement */}
      {isEdit && (
        <button
          onClick={() => void handleDelete()}
          disabled={saving || deleting}
          className="w-full py-3 rounded-xl font-mono text-sm disabled:opacity-40"
          style={{ background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' }}
        >
          {deleting ? 'Suppression…' : 'Supprimer la recette'}
        </button>
      )}
    </div>
  )
}
