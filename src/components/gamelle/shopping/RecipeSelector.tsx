'use client'

import { useState, useEffect } from 'react'

const UPLOAD_BASE = process.env.NEXT_PUBLIC_GAMELLE_UPLOAD_BASE_URL ?? '/uploads/gamelle'

type Slot = {
  id:       string
  portions: number
  portionsConsumed: number
  recipe: {
    id:        string
    title:     string
    imageLocal: string | null
  }
}

interface RecipeSelectorProps {
  onConfirm: (slotIds: string[]) => void
  loading:   boolean
}

/**
 * Étape 0 du parcours courses — sélection des recettes à inclure dans la liste.
 * Toutes les recettes du panier actif sont pré-sélectionnées.
 * Le bouton est désactivé si aucune recette n'est sélectionnée.
 */
export function RecipeSelector({ onConfirm, loading }: RecipeSelectorProps) {
  const [slots,    setSlots]    = useState<Slot[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setFetching(true)
    try {
      const res  = await fetch('/api/gamelle/planning/slots?active=true')
      const data = await res.json() as Slot[]
      const all  = Array.isArray(data) ? data : []
      setSlots(all)
      setSelected(new Set(all.map(s => s.id)))
    } catch { /* ignore */ } finally {
      setFetching(false)
    }
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else              next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === slots.length) setSelected(new Set())
    else                                setSelected(new Set(slots.map(s => s.id)))
  }

  const count = selected.size

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>Chargement…</span>
      </div>
    )
  }

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 flex-1 px-8 py-16 text-center">
        <span className="text-4xl">🍽️</span>
        <p className="font-display text-base font-semibold" style={{ color: 'var(--text)' }}>
          Menu vide
        </p>
        <p className="font-body text-sm" style={{ color: 'var(--muted)' }}>
          Ajoute des recettes à ton menu avant de générer une liste.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* En-tête */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <p className="font-body text-sm" style={{ color: 'var(--muted)' }}>
          Sélectionne les recettes pour lesquelles tu fais les courses
        </p>
        <button
          onClick={toggleAll}
          className="font-mono text-xs px-3 py-1 rounded-lg shrink-0 ml-3"
          style={{
            background: 'var(--surface2)',
            border:     '1px solid var(--border)',
            color:      'var(--text2)',
          }}
        >
          {selected.size === slots.length ? 'Aucune' : 'Toutes'}
        </button>
      </div>

      {/* Liste des recettes */}
      <div className="flex flex-col">
        {slots.map(slot => {
          const isSelected  = selected.has(slot.id)
          const remaining   = slot.portions - slot.portionsConsumed

          return (
            <button
              key={slot.id}
              onClick={() => toggle(slot.id)}
              className="flex items-center gap-3 px-4 py-3 w-full text-left"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              {/* Checkbox */}
              <div
                className="shrink-0 w-5 h-5 rounded flex items-center justify-center"
                style={{
                  border:     `2px solid ${isSelected ? 'var(--accent)' : 'var(--border2)'}`,
                  background:  isSelected ? 'var(--accent)' : 'transparent',
                }}
              >
                {isSelected && (
                  <span className="text-[10px] font-bold leading-none" style={{ color: '#fff' }}>✓</span>
                )}
              </div>

              {/* Miniature recette */}
              <div
                className="shrink-0 rounded-full overflow-hidden flex items-center justify-center"
                style={{ width: 36, height: 36, background: 'var(--surface2)', border: '1px solid var(--border)' }}
              >
                {slot.recipe.imageLocal ? (
                  <img
                    src={`${UPLOAD_BASE}/${slot.recipe.imageLocal}`}
                    alt={slot.recipe.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-display text-sm font-bold" style={{ color: 'var(--muted)' }}>
                    {slot.recipe.title.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Nom */}
              <span
                className="flex-1 font-body text-sm truncate"
                style={{ color: isSelected ? 'var(--text)' : 'var(--muted)' }}
              >
                {slot.recipe.title}
              </span>

              {/* Portions */}
              <span className="font-mono text-xs shrink-0" style={{ color: 'var(--muted)' }}>
                {remaining} {remaining > 1 ? 'portions' : 'portion'}
              </span>
            </button>
          )
        })}
      </div>

      {/* Bouton génération — sticky */}
      <div
        className="sticky bottom-0 px-4 py-3"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}
      >
        <button
          onClick={() => onConfirm(Array.from(selected))}
          disabled={count === 0 || loading}
          className="w-full py-3.5 rounded-xl font-mono text-sm font-medium disabled:opacity-40"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {loading
            ? 'Génération…'
            : count === 0
              ? 'Sélectionne au moins une recette'
              : `Générer la liste (${count} recette${count > 1 ? 's' : ''}) →`}
        </button>
      </div>
    </div>
  )
}
