'use client'

import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { BasketView } from '@/components/popote/planning/BasketView'
import { AddToMenuSheet } from '@/components/popote/planning/AddToMenuSheet'
import { RecipeSearchGrid } from '@/components/popote/recipes/RecipeSearchGrid'
import type {
  PlanningSlotWithRecipe,
  RecipeCardData,
  ApiResponse,
  PaginatedResponse,
  RecipeWithIngredients,
  RecipeCategory,
} from '@/lib/popote/types'

/**
 * Page principale du menu — Vue panier + ajout de recettes.
 * Parcours : + Ajouter → RecipeSearchGrid → AddToMenuSheet → slot créé.
 */
export default function MenuPage() {
  const [slots,          setSlots]          = useState<PlanningSlotWithRecipe[]>([])
  const [loading,        setLoading]        = useState(true)
  const [showPicker,     setShowPicker]     = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeCardData | null>(null)

  useEffect(() => { void loadSlots() }, [])

  async function loadSlots() {
    setLoading(true)
    try {
      const res  = await fetch('/api/popote/planning/slots?active=true')
      const data = await res.json() as PlanningSlotWithRecipe[]
      setSlots(Array.isArray(data) ? data : [])
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  async function fetchRecipes(query: string, category?: RecipeCategory): Promise<RecipeCardData[]> {
    const params = new URLSearchParams({ page: '1', limit: '30' })
    if (query)    params.set('search', query)
    if (category) params.set('category', category)
    try {
      const res  = await fetch(`/api/popote/recipes?${params}`)
      const json = await res.json() as ApiResponse<PaginatedResponse<RecipeWithIngredients>>
      if (!json.success || !json.data) return []
      return json.data.data.map(r => ({
        id:              r.id,
        title:           r.title,
        imageUrl:        null,
        imageLocal:      r.imageLocal,
        preparationTime: r.preparationTime,
        cookingTime:     r.cookingTime,
        category:        r.category,
        description:     r.description,
      }))
    } catch {
      return []
    }
  }

  function handleSelectRecipe(recipe: RecipeCardData) {
    setShowPicker(false)
    setSelectedRecipe(recipe)
  }

  function handleSlotAdded(slot: PlanningSlotWithRecipe) {
    setSlots(prev => [slot, ...prev])
    setSelectedRecipe(null)
  }

  async function handleRemove(id: string) {
    try {
      await fetch(`/api/popote/planning/slots/${id}`, { method: 'DELETE' })
      setSlots(prev => prev.filter(s => s.id !== id))
    } catch { /* ignore */ }
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h1 className="font-display text-lg font-semibold" style={{ color: 'var(--text)' }}>
          Mon menu
        </h1>
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <Plus size={14} /> Ajouter
        </button>
      </div>

      {/* Contenu */}
      {loading ? (
        <p className="font-mono text-xs p-4" style={{ color: 'var(--muted)' }}>Chargement…</p>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <BasketView slots={slots} onRemove={id => void handleRemove(id)} />
        </div>
      )}

      {/* Picker recettes — overlay plein écran */}
      {showPicker && (
        <div className="fixed inset-0 z-40 flex flex-col" style={{ background: 'var(--bg)' }}>
          <div
            className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <button onClick={() => setShowPicker(false)} style={{ color: 'var(--muted)' }}>
              <X size={20} />
            </button>
            <h2 className="flex-1 font-display text-base font-semibold" style={{ color: 'var(--text)' }}>
              Choisir une recette
            </h2>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <RecipeSearchGrid
              title=""
              mode="search"
              onFetch={fetchRecipes}
              onSelect={handleSelectRecipe}
            />
          </div>
        </div>
      )}

      {/* Sheet d'ajout */}
      {selectedRecipe && (
        <AddToMenuSheet
          recipe={selectedRecipe}
          onConfirm={handleSlotAdded}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  )
}
