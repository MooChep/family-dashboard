'use client'

import { useState } from 'react'
import { Check, Plus, ArrowLeftRight, EyeOff, Archive } from 'lucide-react'
import type { ImportIngredient } from '@/app/api/popote/import/fetch/route'
import type { ApiResponse } from '@/lib/popote/types'
import type { BaseUnit } from '@prisma/client'
import type { IngredientWithAisle } from '@/app/api/popote/ingredients/route'

/**
 * Résolution finale : jowIndex → entrée.
 * referenceId: null = ingrédient ignoré (ne sera pas créé en RecipeIngredient).
 */
export type ResolutionEntry = {
  referenceId:   string | null
  referenceName: string
  isStaple:      boolean
  permanent:     boolean   // créer une SubstitutionRule permanente
}
export type Resolution = Record<number, ResolutionEntry>

interface IngredientMapperProps {
  ingredients: ImportIngredient[]
  onDone:      (resolutions: Resolution) => void
}

type Mode = 'idle' | 'create' | 'substitute'

type ItemState = {
  mode:        Mode
  referenceId: string | null
  refName:     string
  isIgnored:   boolean
  isStaple:    boolean
  permanent:   boolean   // substitution permanente
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
 * Actions disponibles : Créer · Substituer · Ignorer · Placard
 * Cascade : dict exact → SubstitutionRule → inconnu
 */
export function IngredientMapper({ ingredients, onDone }: IngredientMapperProps) {
  const matched = ingredients.filter(i =>  i.matchStatus.matched)
  const unknown = ingredients.filter(i => !i.matchStatus.matched)

  const [states, setStates] = useState<Record<number, ItemState>>(() =>
    Object.fromEntries(unknown.map(ing => [ing.jowIndex, {
      mode: 'idle', referenceId: null, refName: '', isIgnored: false, isStaple: false, permanent: false,
      newName: ing.name, newUnit: 'GRAM', newAisleId: '',
      subQuery: '', subResults: [],
    }]))
  )
  const [aisles,       setAisles]       = useState<IngredientWithAisle[]>([])
  const [aislesLoaded, setAislesLoaded] = useState(false)

  function update(idx: number, patch: Partial<ItemState>) {
    setStates(s => ({ ...s, [idx]: { ...s[idx]!, ...patch } }))
  }

  function isResolved(st: ItemState): boolean {
    return st.referenceId !== null || st.isIgnored || st.isStaple
  }

  async function loadAisles() {
    if (aislesLoaded) return
    try {
      const res  = await fetch('/api/popote/ingredients')
      const json = await res.json() as ApiResponse<IngredientWithAisle[]>
      if (json.success && json.data) {
        const seen   = new Set<string>()
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
      const res  = await fetch('/api/popote/ingredients', {
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
      const res  = await fetch(`/api/popote/ingredients?search=${encodeURIComponent(q)}`)
      const json = await res.json() as ApiResponse<IngredientWithAisle[]>
      if (json.success) update(idx, { subResults: json.data ?? [] })
    } catch { /* ignore */ }
  }

  const resolved = Object.values(states).filter(isResolved).length
  const total    = unknown.length
  const allDone  = resolved === total

  async function handleValidate() {
    const resolutions: Resolution = {}

    // Ingrédients auto-matchés (dict ou sub permanente)
    for (const ing of ingredients) {
      if (ing.matchStatus.matched) {
        resolutions[ing.jowIndex] = {
          referenceId:   ing.matchStatus.referenceId,
          referenceName: ing.matchStatus.referenceName,
          isStaple:      false,
          permanent:     false,
        }
      }
    }

    // Résolutions manuelles
    const permanentRules: { jowName: string; referenceId: string }[] = []
    for (const [idxStr, st] of Object.entries(states)) {
      const idx = Number(idxStr)
      const ing = unknown.find(i => i.jowIndex === idx)!

      if (st.isIgnored) {
        resolutions[idx] = { referenceId: null, referenceName: '', isStaple: false, permanent: false }
      } else if (st.isStaple && st.referenceId) {
        resolutions[idx] = { referenceId: st.referenceId, referenceName: st.refName, isStaple: true, permanent: false }
      } else if (st.referenceId) {
        resolutions[idx] = { referenceId: st.referenceId, referenceName: st.refName, isStaple: false, permanent: st.permanent }
        if (st.permanent) permanentRules.push({ jowName: ing.name, referenceId: st.referenceId })
      }
    }

    // Créer les substitutions permanentes
    await Promise.allSettled(permanentRules.map(rule =>
      fetch('/api/popote/substitutions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(rule),
      })
    ))

    onDone(resolutions)
  }

  if (unknown.length === 0) {
    void handleValidate()
    return null
  }

  const btnBase  = 'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-mono text-xs'
  const inputCls = 'w-full px-3 py-2 rounded-lg font-body text-sm outline-none'
  const inputSty = { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }

  return (
    <div className="flex flex-col gap-4">
      <p className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
        {total - resolved > 0
          ? `${total - resolved} ingrédient${total - resolved > 1 ? 's' : ''} à mapper`
          : 'Tous les ingrédients sont mappés ✓'}
      </p>

      {/* Ingrédients auto-matchés */}
      {matched.length > 0 && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
            Reconnus automatiquement ({matched.length})
          </p>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {matched.map((ing, i) => (
              <div
                key={ing.jowIndex}
                className="flex items-center justify-between px-3 py-2"
                style={{ borderBottom: i < matched.length - 1 ? '1px solid var(--border)' : 'none', background: 'var(--surface2)' }}
              >
                <div>
                  <p className="font-body text-xs" style={{ color: 'var(--muted)', textDecoration: 'line-through' }}>{ing.name}</p>
                  <p className="font-body text-sm" style={{ color: 'var(--text)' }}>
                    {ing.matchStatus.matched ? ing.matchStatus.referenceName : ''}
                    {ing.matchStatus.matched && ing.matchStatus.via === 'sub' && (
                      <span className="font-mono text-[10px] ml-1.5" style={{ color: 'var(--accent)' }}>sub. permanente</span>
                    )}
                  </p>
                </div>
                <Check size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ingrédients inconnus */}
      <div className="flex flex-col gap-3">
        {unknown.map(ing => {
          const st = states[ing.jowIndex]!
          const done = isResolved(st)

          return (
            <div
              key={ing.jowIndex}
              className="rounded-xl p-3 flex flex-col gap-2"
              style={{ background: 'var(--surface2)', border: `1px solid ${done ? 'var(--success)' : 'var(--border)'}` }}
            >
              {/* Nom Jow + statut */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Nom Jow</p>
                  <p className="font-body text-sm font-medium" style={{
                    color:          done ? 'var(--muted)' : 'var(--text)',
                    textDecoration: done ? 'line-through' : 'none',
                  }}>
                    {ing.name}
                  </p>
                </div>
                {done && (
                  <div className="flex items-center gap-1.5">
                    {st.isIgnored ? (
                      <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>Ignoré</span>
                    ) : st.isStaple ? (
                      <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>Placard · {st.refName}</span>
                    ) : (
                      <>
                        <Check size={14} style={{ color: 'var(--success)' }} />
                        <span className="font-mono text-xs" style={{ color: 'var(--success)' }}>
                          {st.refName}{st.permanent && <span style={{ color: 'var(--accent)' }}> ★</span>}
                        </span>
                      </>
                    )}
                    <button
                      onClick={() => update(ing.jowIndex, { referenceId: null, refName: '', isIgnored: false, isStaple: false, permanent: false, mode: 'idle' })}
                      className="font-mono text-[10px] ml-1"
                      style={{ color: 'var(--muted)' }}
                    >
                      ✏️
                    </button>
                  </div>
                )}
              </div>

              {/* Actions si non résolu */}
              {!done && st.mode === 'idle' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { void loadAisles(); update(ing.jowIndex, { mode: 'create' }) }}
                    className={btnBase}
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
                  >
                    <Plus size={12} /> Créer
                  </button>
                  <button
                    onClick={() => update(ing.jowIndex, { mode: 'substitute' })}
                    className={btnBase}
                    style={{ background: 'var(--surface)', color: 'var(--text2)', border: '1px solid var(--border)' }}
                  >
                    <ArrowLeftRight size={12} /> Substituer
                  </button>
                  <button
                    onClick={() => update(ing.jowIndex, { isIgnored: true })}
                    className={btnBase}
                    style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                  >
                    <EyeOff size={12} /> Ignorer
                  </button>
                  <button
                    onClick={() => update(ing.jowIndex, { mode: 'substitute', isStaple: true })}
                    className={btnBase}
                    style={{ background: 'var(--surface)', color: 'var(--text2)', border: '1px solid var(--border)' }}
                  >
                    <Archive size={12} /> Placard
                  </button>
                </div>
              )}

              {/* Formulaire création */}
              {!done && st.mode === 'create' && (
                <div className="flex flex-col gap-2">
                  <input className={inputCls} style={inputSty} placeholder="Nom canonique"
                    value={st.newName} onChange={e => update(ing.jowIndex, { newName: e.target.value })} />
                  <select className={inputCls + ' font-mono text-xs'} style={inputSty}
                    value={st.newUnit} onChange={e => update(ing.jowIndex, { newUnit: e.target.value as BaseUnit })}>
                    {BASE_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                  <select className={inputCls + ' font-mono text-xs'} style={inputSty}
                    value={st.newAisleId} onChange={e => update(ing.jowIndex, { newAisleId: e.target.value })}>
                    <option value="">— Rayon —</option>
                    {aisles.map(a => <option key={a.aisle.id} value={a.aisle.id}>{a.aisle.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => update(ing.jowIndex, { mode: 'idle' })}
                      className="py-2 px-3 rounded-lg font-mono text-xs"
                      style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                      Annuler
                    </button>
                    <button onClick={() => void handleCreate(ing.jowIndex)}
                      disabled={!st.newName.trim() || !st.newAisleId}
                      className="flex-1 py-2 rounded-lg font-mono text-xs disabled:opacity-40"
                      style={{ background: 'var(--accent)', color: '#fff' }}>
                      Créer
                    </button>
                  </div>
                </div>
              )}

              {/* Recherche substitution */}
              {!done && st.mode === 'substitute' && (
                <div className="flex flex-col gap-2">
                  <input className={inputCls} style={inputSty} placeholder="Chercher un ingrédient…"
                    value={st.subQuery} onChange={e => void searchSubstitute(ing.jowIndex, e.target.value)} />
                  {st.subResults.length > 0 && (
                    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                      {st.subResults.slice(0, 6).map(ref => (
                        <button key={ref.id}
                          onClick={() => update(ing.jowIndex, { mode: 'idle', referenceId: ref.id, refName: ref.name })}
                          className="w-full flex items-center justify-between px-3 py-2 text-left"
                          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                          <span className="font-body text-sm" style={{ color: 'var(--text)' }}>{ref.name}</span>
                          <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>{ref.aisle.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Toggle permanent */}
                  {!st.isStaple && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={st.permanent}
                        onChange={e => update(ing.jowIndex, { permanent: e.target.checked })}
                        className="rounded" />
                      <span className="font-mono text-xs" style={{ color: 'var(--text2)' }}>
                        Créer un lien permanent <span style={{ color: 'var(--accent)' }}>★</span>
                      </span>
                    </label>
                  )}
                  <button onClick={() => update(ing.jowIndex, { mode: 'idle', isStaple: false })}
                    className="py-2 rounded-lg font-mono text-xs"
                    style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                    Annuler
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={() => void handleValidate()}
        disabled={!allDone}
        className="w-full py-3 rounded-xl font-mono text-sm font-medium disabled:opacity-40"
        style={{ background: 'var(--accent)', color: '#fff' }}
      >
        {allDone
          ? "Valider l'import →"
          : `Valider l'import (${total - resolved} restant${total - resolved > 1 ? 's' : ''})`}
      </button>
    </div>
  )
}
