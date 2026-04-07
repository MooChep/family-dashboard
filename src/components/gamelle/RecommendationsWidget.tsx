'use client'

import { useState, useEffect } from 'react'
import type { RecommendedRecipe } from '@/app/api/gamelle/recipes/recommendations/route'
import type { ApiResponse, RecipeWithIngredients } from '@/lib/gamelle/types'
import { RecipeDetail } from '@/components/gamelle/recipes/RecipeDetail'

const UPLOAD_BASE = process.env.NEXT_PUBLIC_GAMELLE_UPLOAD_BASE_URL ?? '/uploads/gamelle'

interface RecommendationsWidgetProps {
  limit?: number
}

/**
 * Widget "À redécouvrir" — grille de recettes peu/jamais cuisinées.
 * Client component pour le fetch.
 */
export function RecommendationsWidget({ limit = 6 }: RecommendationsWidgetProps) {
  const [recipes,        setRecipes]        = useState<RecommendedRecipe[]>([])
  const [loading,        setLoading]        = useState(true)
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeWithIngredients | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res  = await fetch(`/api/gamelle/recipes/recommendations?limit=${limit}`)
        const json = await res.json() as ApiResponse<RecommendedRecipe[]>
        if (json.success) setRecipes(json.data ?? [])
      } catch { /* ignore */ } finally {
        setLoading(false)
      }
    })()
  }, [limit])

  async function openRecipe(id: string) {
    try {
      const res  = await fetch(`/api/gamelle/recipes/${id}`)
      const json = await res.json() as ApiResponse<RecipeWithIngredients>
      if (json.success && json.data) setSelectedRecipe(json.data)
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <p className="font-mono text-xs px-4 py-4" style={{ color: 'var(--muted)' }}>Chargement…</p>
    )
  }

  if (recipes.length === 0) return null

  const REASON_BADGE: Record<string, { label: string; color: string; bg: string }> = {
    never_cooked:  { label: 'Jamais cuisiné', color: '#a855f7', bg: '#a855f722' },
    rarely_cooked: { label: 'Peu cuisiné',    color: '#f97316', bg: '#f9731622' },
    few_portions:  { label: 'À refaire',       color: '#3b82f6', bg: '#3b82f622' },
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 px-4">
        {recipes.map(recipe => {
          const totalTime = (recipe.preparationTime ?? 0) + (recipe.cookingTime ?? 0)
          const badge = REASON_BADGE[recipe.reason]
          return (
            <button
              key={recipe.id}
              onClick={() => void openRecipe(recipe.id)}
              className="flex flex-col gap-1.5 rounded-2xl p-2.5 text-left"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <div
                className="mx-auto rounded-full overflow-hidden flex items-center justify-center"
                style={{ width: 64, height: 64, background: 'var(--surface2)', border: '2px solid var(--border)' }}
              >
                {recipe.imageLocal ? (
                  <img src={`${UPLOAD_BASE}/${recipe.imageLocal}`} alt={recipe.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display text-2xl font-bold" style={{ color: 'var(--muted)' }}>
                    {recipe.title.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <p
                className="font-body text-xs text-center leading-snug"
                style={{
                  color:           'var(--text)',
                  display:         '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow:        'hidden',
                  minHeight:       '2.4em',
                }}
              >
                {recipe.title}
              </p>
              {badge && (
                <span
                  className="font-mono text-[9px] px-1.5 py-0.5 rounded-full text-center mx-auto"
                  style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.color}44` }}
                >
                  {badge.label}
                </span>
              )}
              {totalTime > 0 && (
                <p className="font-mono text-[10px] text-center" style={{ color: 'var(--muted)' }}>
                  {totalTime} min
                </p>
              )}
            </button>
          )
        })}
      </div>

      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          isInMenu={false}
          onClose={() => setSelectedRecipe(null)}
          onAddToMenu={() => setSelectedRecipe(null)}
        />
      )}
    </>
  )
}
