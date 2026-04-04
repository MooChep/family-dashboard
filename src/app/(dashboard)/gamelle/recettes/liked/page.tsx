'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { RecipeDetail } from '@/components/gamelle/recipes/RecipeDetail'
import { RecipeCard } from '@/components/gamelle/recipes/RecipeCard'
import type { RecipeWithIngredients, ApiResponse, PaginatedResponse } from '@/lib/gamelle/types'

/**
 * Page Recettes Favorites — liste toutes les recettes likées.
 */
export default function LikedRecipesPage() {
  const [recipes,  setRecipes]  = useState<RecipeWithIngredients[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<RecipeWithIngredients | null>(null)

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res  = await fetch('/api/gamelle/recipes/liked')
      const json = await res.json() as ApiResponse<PaginatedResponse<RecipeWithIngredients>>
      if (json.success && json.data) setRecipes(json.data.data)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <Heart size={18} style={{ color: 'var(--danger, #e74c3c)' }} fill="currentColor" />
        <h1 className="font-display text-xl font-semibold" style={{ color: 'var(--text)' }}>
          Favoris
        </h1>
      </div>

      {loading ? (
        <p className="font-mono text-xs px-4 py-8" style={{ color: 'var(--muted)' }}>Chargement…</p>
      ) : recipes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 px-8 text-center">
          <Heart size={40} style={{ color: 'var(--border2)' }} />
          <p className="font-display text-base font-semibold" style={{ color: 'var(--text)' }}>
            Aucun favori
          </p>
          <p className="font-body text-sm" style={{ color: 'var(--muted)' }}>
            Appuie sur le coeur dans une fiche recette pour l&apos;ajouter à tes favoris.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 pb-4 sm:grid-cols-3">
          {recipes.map(r => (
            <RecipeCard
              key={r.id}
              recipe={r}
              isInMenu={false}
              onOpen={setSelected}
            />
          ))}
        </div>
      )}

      {selected && (
        <RecipeDetail
          recipe={selected}
          isInMenu={false}
          onClose={() => setSelected(null)}
          onAddToMenu={() => { /* no-op on liked page */ }}
        />
      )}
    </div>
  )
}
