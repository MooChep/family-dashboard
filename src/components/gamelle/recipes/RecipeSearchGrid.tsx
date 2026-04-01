'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Plus, Check } from 'lucide-react'
import type { RecipeCardData, RecipeCategory } from '@/lib/gamelle/types'

const UPLOAD_BASE = process.env.NEXT_PUBLIC_GAMELLE_UPLOAD_BASE_URL ?? '/api/gamelle/images'

const CATEGORY_FILTERS: { key: RecipeCategory | 'all'; label: string }[] = [
  { key: 'all',     label: 'Tous' },
  { key: 'STARTER', label: 'Entrées' },
  { key: 'MAIN',    label: 'Plats' },
  { key: 'DESSERT', label: 'Desserts' },
]

interface RecipeSearchGridProps {
  title:      string
  mode:       'import' | 'search' | 'menu'
  onFetch:    (query: string, category?: RecipeCategory) => Promise<RecipeCardData[]>
  onSelect?:  (recipe: RecipeCardData) => void
  /** Mode menu : appelé quand l'utilisateur valide sa sélection */
  onConfirm?: (selected: RecipeCardData[]) => void
}

/** Image circulaire d'une carte recette */
function RecipeThumb({ recipe }: { recipe: RecipeCardData }) {
  const src = recipe.imageLocal
    ? `${UPLOAD_BASE}/${recipe.imageLocal}`
    : recipe.imageUrl ?? null

  return (
    <div
      className="mx-auto rounded-full overflow-hidden flex items-center justify-center"
      style={{ width: 80, height: 80, background: 'var(--surface2)', border: '2px solid var(--border)' }}
    >
      {src ? (
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="font-display text-2xl font-bold" style={{ color: 'var(--muted)' }}>
          {recipe.title.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}

/**
 * Composant de recherche réutilisable pour recettes — import Jow, bibliothèque, ajout au menu.
 * La source de données est injectée via `onFetch`.
 */
export function RecipeSearchGrid({ title, mode, onFetch, onSelect, onConfirm }: RecipeSearchGridProps) {
  const [query,      setQuery]      = useState('')
  const [category,   setCategory]   = useState<RecipeCategory | 'all'>('all')
  const [results,    setResults]    = useState<RecipeCardData[]>([])
  const [loading,    setLoading]    = useState(false)
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function doFetch(q: string, cat: RecipeCategory | 'all') {
    setLoading(true)
    try {
      const data = await onFetch(q, cat === 'all' ? undefined : cat)
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch initial + à chaque changement de catégorie
  useEffect(() => {
    void doFetch(query, category)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  function handleQueryChange(q: string) {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void doFetch(q, category), 350)
  }

  function handleCardClick(recipe: RecipeCardData) {
    if (mode === 'menu') {
      setSelected(prev => {
        const next = new Set(prev)
        if (next.has(recipe.id)) next.delete(recipe.id)
        else next.add(recipe.id)
        return next
      })
    } else {
      onSelect?.(recipe)
    }
  }

  const selectedRecipes = results.filter(r => selected.has(r.id))

  const filterBtn = 'shrink-0 font-mono text-xs px-3 py-1 rounded-full'

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Titre */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <h2 className="font-display text-lg font-semibold mb-3" style={{ color: 'var(--text)' }}>{title}</h2>

        {/* Barre de recherche */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
          <Search size={14} style={{ color: 'var(--muted)' }} />
          <input
            className="flex-1 bg-transparent font-body text-sm outline-none"
            style={{ color: 'var(--text)' }}
            placeholder="Rechercher…"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
          />
          {query && (
            <button onClick={() => { setQuery(''); void doFetch('', category) }}>
              <X size={14} style={{ color: 'var(--muted)' }} />
            </button>
          )}
        </div>

        {/* Filtres catégorie (masqués en mode import — Jow n'a pas de catégories locales) */}
        {mode !== 'import' && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORY_FILTERS.map(f => (
              <button key={f.key} onClick={() => setCategory(f.key)}
                className={filterBtn}
                style={{
                  background: category === f.key ? 'var(--accent)' : 'var(--surface2)',
                  color:      category === f.key ? '#fff' : 'var(--muted)',
                  border:     `1px solid ${category === f.key ? 'var(--accent)' : 'var(--border)'}`,
                }}>
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grille */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>Chargement…</span>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="font-display text-xl" style={{ color: 'var(--text)', opacity: 0.3 }}>
              {query ? 'Aucun résultat' : 'Commence à chercher'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {results.map(recipe => {
              const isSelected = selected.has(recipe.id)
              const totalTime  = (recipe.preparationTime ?? 0) + (recipe.cookingTime ?? 0)
              return (
                <div key={recipe.id} className="flex flex-col gap-2">
                  {/* Image */}
                  <button onClick={() => handleCardClick(recipe)} className="w-full">
                    <RecipeThumb recipe={recipe} />
                  </button>
                  {/* Titre */}
                  <p className="font-body text-sm text-center leading-snug line-clamp-3"
                    style={{ color: 'var(--text)' }}>
                    {recipe.title}
                  </p>
                  {totalTime > 0 && (
                    <p className="font-mono text-[10px] text-center" style={{ color: 'var(--muted)' }}>
                      {totalTime} min
                    </p>
                  )}
                  {/* Bouton */}
                  <button
                    onClick={() => handleCardClick(recipe)}
                    className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-mono text-xs w-full"
                    style={{
                      background: isSelected ? 'var(--accent)' : 'var(--surface2)',
                      color:      isSelected ? '#fff' : 'var(--accent)',
                      border:     `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    {isSelected ? <Check size={12} /> : <Plus size={12} />}
                    {mode === 'menu' ? (isSelected ? 'Ajouté' : 'Ajouter') : 'Sélectionner'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer sticky — mode menu uniquement */}
      {mode === 'menu' && selected.size > 0 && (
        <div
          className="shrink-0 px-4 py-3 flex items-center justify-between"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <span className="font-mono text-sm">
            {selected.size} recette{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={() => onConfirm?.(selectedRecipes)}
            className="font-mono text-sm font-medium px-4 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            Retour au menu →
          </button>
        </div>
      )}
    </div>
  )
}
