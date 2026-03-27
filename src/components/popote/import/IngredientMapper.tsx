'use client'

import { useState } from 'react'
import { Check, Plus, ArrowLeftRight } from 'lucide-react'
import type { ImportIngredient } from '@/app/api/popote/import/fetch/route'
import type { ApiResponse } from '@/lib/popote/types'
import type { BaseUnit } from '@prisma/client'
import type { IngredientWithAisle } from '@/app/api/popote/ingredients/route'

/** Résolution finale : jowIndex → referenceId */
export type Resolution = Record<number, string>

interface IngredientMapperProps {
  ingredients: ImportIngredient[]
  onDone:      (resolutions: Resolution) => void
}

type Mode = 'idle' | 'create' | 'substitute'

type ItemState = {
  mode:        Mode
  referenceId: string | null
  refName:     string | null
  // create form
  newName:     string
  newUnit:     BaseUnit
  newAisleId:  string
  // substitute search
  subQuery:    string
  subResults:  IngredientWithAisle[]
}

const BASE_UNITS: { value: BaseUnit; label: string }[] = [
  { value: 'GRAM',       label: 'Grammes (g)' },
  { value: 'MILLILITER', label: 'Millilitres (ml)' },
  { value: 'UNIT',       label: 'Unités' },
]

/**
 * Étape 2 — Mapper les ingrédients inconnus.
 * Pour chaque ingrédient sans correspondance, l'utilisateur peut :
 * - Créer une nouvelle entrée dans le dictionnaire
 * - Substituer avec un ingrédient existant
 */
export function IngredientMapper({ ingredients, onDone }: IngredientMapperProps) {
  const unknown = ingredients.filter(i => !i.matchStatus.matched)

  // État par ingrédient (indexé par jowIndex)
  const [states, setStates] = useState<Record<number, ItemState>>(() =>
    Object.fromEntries(unknown.map(ing => [ing.jowIndex, {
      mode: 'idle', referenceId: null, refName: null,
      newName: ing.name, newUnit: 'GRAM', newAisleId: '',
      subQuery: '', subResults: [],
    }]))
  )
  const [aisles, setAisles]   = useState<IngredientWithAisle[]>([])
  const [ailesLoaded, setAislesLoaded] = useState(false)

  function update(idx: number, patch: Partial<ItemState>) {
    setStates(s => ({ ...s, [idx]: { ...s[idx]!, ...patch } }))
  }

  async function loadAisles() {
    if (ailesLoaded) return
    try {
      const res = await fetch('/api/popote/ingredients')
      const json = await res.json() as ApiResponse<IngredientWithAisle[]>
      if (json.success && json.data) {
        // Extraire les rayons uniques
        const seen = new Set<string>()
        const unique: IngredientWithAisle[] = []
        for (const ing of json.data) {
          if (!seen.has(ing.aisleId)) { seen.add(ing.aisleId); unique.push(ing) }
        }
        setAisles(unique)
      }
    } finally {
      setAislesLoaded(true)
    }
  }

  async function handleCreate(idx: number) {
    const st = states[idx]!
    if (!st.newName.trim() || !st.newAisleId) return
    try {
      const res = await fetch('/api/popote/ingredients', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: st.newName.trim(), baseUnit: st.newUnit, aisleId: st.newAisleId }),
      })
      const json = await res.json() as ApiResponse<IngredientWithAisle>
      if (json.success && json.data) {
        update(idx, { mode: 'idle', referenceId: json.data.id, refName: json.data.name })
      }
    } catch { /* ignore */ }
  }

  async function searchSubstitute(idx: number, q: string) {
    update(idx, { subQuery: q })
    if (!q.trim()) { update(idx, { subResults: [] }); return }
    try {
      const res = await fetch(`/api/popote/ingredients?search=${encodeURIComponent(q)}`)
      const json = await res.json() as ApiResponse<IngredientWithAisle[]>
      if (json.success) update(idx, { subResults: json.data ?? [] })
    } catch { /* ignore */ }
  }

  const resolved = Object.values(states).filter(s => s.referenceId !== null).length
  const total    = unknown.length
  const allDone  = resolved === total

  function handleValidate() {
    // Partir des correspondances automatiques
    const resolutions: Resolution = {}
    for (const ing of ingredients) {
      if (ing.matchStatus.matched) {
        resolutions[ing.jowIndex] = ing.matchStatus.referenceId
      }
    }
    // Ajouter les résolutions manuelles
    for (const [idxStr, st] of Object.entries(states)) {
      if (st.referenceId) resolutions[Number(idxStr)] = st.referenceId
    }
    onDone(resolutions)
  }

  if (unknown.length === 0) {
    handleValidate()
    return null
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
        {total - resolved > 0
          ? `${total - resolved} ingrédient${total - resolved > 1 ? 's' : ''} inconnu${total - resolved > 1 ? 's' : ''} à mapper`
          : 'Tous les ingrédients sont mappés ✓'}
      </p>

      <div className="flex flex-col gap-3">
        {unknown.map(ing => {
          const st = states[ing.jowIndex]!

          return (
            <div
              key={ing.jowIndex}
              className="rounded-xl p-3 flex flex-col gap-2"
              style={{ background: 'var(--surface2)', border: `1px solid ${st.referenceId ? 'var(--success)' : 'var(--border)'}` }}
            >
              {/* Nom Jow */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Nom Jow</p>
                  <p
                    className="font-body text-sm font-medium"
                    style={{ color: st.referenceId ? 'var(--muted)' : 'var(--text)', textDecoration: st.referenceId ? 'line-through' : 'none' }}
                  >
                    {ing.name}
                  </p>
                </div>
                {st.referenceId && (
                  <div className="flex items-center gap-1.5">
                    <Check size={14} style={{ color: 'var(--success)' }} />
                    <span className="font-mono text-xs" style={{ color: 'var(--success)' }}>
                      {st.refName}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions si pas encore résolu */}
              {!st.referenceId && st.mode === 'idle' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { void loadAisles(); update(ing.jowIndex, { mode: 'create' }) }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-mono text-xs"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
                  >
                    <Plus size={12} /> Créer dans le dico
                  </button>
                  <button
                    onClick={() => update(ing.jowIndex, { mode: 'substitute' })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-mono text-xs"
                    style={{ background: 'var(--surface)', color: 'var(--text2)', border: '1px solid var(--border)' }}
                  >
                    <ArrowLeftRight size={12} /> Substituer
                  </button>
                </div>
              )}

              {/* Formulaire création */}
              {!st.referenceId && st.mode === 'create' && (
                <div className="flex flex-col gap-2">
                  <input
                    className="w-full px-3 py-2 rounded-lg font-body text-sm outline-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    placeholder="Nom canonique"
                    value={st.newName}
                    onChange={e => update(ing.jowIndex, { newName: e.target.value })}
                  />
                  <select
                    className="w-full px-3 py-2 rounded-lg font-mono text-xs outline-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    value={st.newUnit}
                    onChange={e => update(ing.jowIndex, { newUnit: e.target.value as BaseUnit })}
                  >
                    {BASE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                  <select
                    className="w-full px-3 py-2 rounded-lg font-mono text-xs outline-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    value={st.newAisleId}
                    onChange={e => update(ing.jowIndex, { newAisleId: e.target.value })}
                  >
                    <option value="">— Rayon —</option>
                    {aisles.map(a => (
                      <option key={a.aisle.id} value={a.aisle.id}>{a.aisle.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => update(ing.jowIndex, { mode: 'idle' })}
                      className="py-2 px-3 rounded-lg font-mono text-xs"
                      style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => void handleCreate(ing.jowIndex)}
                      disabled={!st.newName.trim() || !st.newAisleId}
                      className="flex-1 py-2 rounded-lg font-mono text-xs disabled:opacity-40"
                      style={{ background: 'var(--accent)', color: '#fff' }}
                    >
                      Créer
                    </button>
                  </div>
                </div>
              )}

              {/* Recherche substitution */}
              {!st.referenceId && st.mode === 'substitute' && (
                <div className="flex flex-col gap-2">
                  <input
                    className="w-full px-3 py-2 rounded-lg font-body text-sm outline-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    placeholder="Chercher un ingrédient…"
                    value={st.subQuery}
                    onChange={e => void searchSubstitute(ing.jowIndex, e.target.value)}
                  />
                  {st.subResults.length > 0 && (
                    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                      {st.subResults.slice(0, 6).map(ref => (
                        <button
                          key={ref.id}
                          onClick={() => update(ing.jowIndex, { mode: 'idle', referenceId: ref.id, refName: ref.name })}
                          className="w-full flex items-center justify-between px-3 py-2 text-left"
                          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
                        >
                          <span className="font-body text-sm" style={{ color: 'var(--text)' }}>{ref.name}</span>
                          <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>{ref.aisle.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => update(ing.jowIndex, { mode: 'idle' })}
                    className="py-2 rounded-lg font-mono text-xs"
                    style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={handleValidate}
        disabled={!allDone}
        className="w-full py-3 rounded-xl font-mono text-sm font-medium disabled:opacity-40"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        {allDone
          ? 'Valider l\'import →'
          : `Valider l'import (${total - resolved} restant${total - resolved > 1 ? 's' : ''})`}
      </button>
    </div>
  )
}
