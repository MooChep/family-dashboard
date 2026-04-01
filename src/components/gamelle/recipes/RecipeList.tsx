'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { RecipeCard } from './RecipeCard'
import { RecipeDetail } from './RecipeDetail'
import type { RecipeWithIngredients, PaginatedResponse, ApiResponse, RecipeCategory } from '@/lib/gamelle/types'

type Filter = 'all' | 'quick' | RecipeCategory

/**
 * Vue principale de la bibliothèque de recettes.
 * Gère la recherche, les filtres, la pagination et l'ouverture des fiches.
 */
export function RecipeList() {
  const [recipes,       setRecipes]       = useState<RecipeWithIngredients[]>([])
  const [total,         setTotal]         = useState(0)
  const [page,          setPage]          = useState(1)
  const [loading,       setLoading]       = useState(true)
  const [search,        setSearch]        = useState('')
  const [filter,        setFilter]        = useState<Filter>('all')
  const [selected,      setSelected]      = useState<RecipeWithIngredients | null>(null)
  const [activeIds,     setActiveIds]     = useState<Set<string>>(new Set())

  const LIMIT = 30

  // Récupération des recettes actives (au menu) — non bloquant si S11 pas encore dispo
  useEffect(() => {
    fetch('/api/gamelle/planning/slots?active=true')
      .then(r => r.ok ? r.json() : null)
      .then((data: { data?: { recipeId: string }[] } | null) => {
        if (data?.data) {
          setActiveIds(new Set(data.data.map(s => s.recipeId)))
        }
      })
      .catch(() => undefined)
  }, [])

  const CATEGORIES: [RecipeCategory, string][] = [['STARTER', 'Entrées'], ['MAIN', 'Plats'], ['DESSERT', 'Desserts']]

  const fetchRecipes = useCallback(async (p: number, q: string, f: Filter) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
      if (q) params.set('search', q)
      if (f === 'STARTER' || f === 'MAIN' || f === 'DESSERT' || f === 'OTHER') params.set('category', f)
      const res = await fetch(`/api/gamelle/recipes?${params}`)
      const json = await res.json() as ApiResponse<PaginatedResponse<RecipeWithIngredients>>
      if (json.success && json.data) {
        setRecipes(json.data.data)
        setTotal(json.data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchRecipes(page, search, filter)
  }, [fetchRecipes, page, search, filter])

  // Filtre "Rapides" côté client (≤ 30 min) — les autres filtres sont côté API
  const displayed = filter === 'quick'
    ? recipes.filter(r => (r.preparationTime ?? 0) + (r.cookingTime ?? 0) <= 30)
    : recipes

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text)' }}>
            Recettes
          </h1>
          <Link
            href="/gamelle/recettes/import"
            className="font-mono text-xs px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            + Importer
          </Link>
        </div>

        {/* Recherche */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}
        >
          <Search size={14} style={{ color: 'var(--muted)' }} />
          <input
            className="flex-1 bg-transparent font-body text-sm outline-none"
            style={{ color: 'var(--text)' }}
            placeholder="Rechercher une recette…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1) }}>
              <X size={14} style={{ color: 'var(--muted)' }} />
            </button>
          )}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {([
            ['all',   'Toutes'],
            ...CATEGORIES,
            ['quick', '≤ 30min'],
          ] as [Filter, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setFilter(key); setPage(1) }}
              className="shrink-0 font-mono text-xs px-3 py-1 rounded-full transition-colors"
              style={{
                background: filter === key ? 'var(--accent)' : 'var(--surface2)',
                color:      filter === key ? '#fff' : 'var(--muted)',
                border:     `1px solid ${filter === key ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>Chargement…</span>
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <p className="font-display text-xl" style={{ color: 'var(--text)', opacity: 0.3 }}>
              Aucune recette
            </p>
            <p className="font-mono text-[10px] uppercase tracking-widest mt-2" style={{ color: 'var(--muted)' }}>
              {search ? 'Modifie ta recherche' : 'Importe ta première recette'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 px-4 pt-2 pb-4">
              {displayed.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  isInMenu={activeIds.has(recipe.id)}
                  onOpen={setSelected}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 py-6">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="font-mono text-xs px-3 py-1.5 rounded-lg disabled:opacity-30"
                  style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}
                >
                  ← Précédent
                </button>
                <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="font-mono text-xs px-3 py-1.5 rounded-lg disabled:opacity-30"
                  style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}
                >
                  Suivant →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Fiche recette */}
      {selected && (
        <RecipeDetail
          recipe={selected}
          isInMenu={activeIds.has(selected.id)}
          onClose={() => setSelected(null)}
          onAddToMenu={() => { /* S13 */ }}
        />
      )}
    </div>
  )
}
