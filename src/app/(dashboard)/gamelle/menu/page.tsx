'use client'

import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { BasketView } from '@/components/gamelle/planning/BasketView'
import { CalendarView } from '@/components/gamelle/planning/CalendarView'
import { AddToMenuSheet } from '@/components/gamelle/planning/AddToMenuSheet'
import { ConsumeSheet } from '@/components/gamelle/planning/ConsumeSheet'
import { RecipeSearchGrid } from '@/components/gamelle/recipes/RecipeSearchGrid'
import type {
  PlanningSlotWithRecipe,
  RecipeCardData,
  ApiResponse,
  PaginatedResponse,
  RecipeWithIngredients,
  RecipeCategory,
} from '@/lib/gamelle/types'

type Tab = 'basket' | 'calendar'

/**
 * Page principale du menu.
 * Onglets Panier / Cri + parcours ajout + consommation de portions.
 */
export default function MenuPage() {
  const [tab,            setTab]            = useState<Tab>('basket')
  const [slots,          setSlots]          = useState<PlanningSlotWithRecipe[]>([])
  const [loading,        setLoading]        = useState(true)
  const [showPicker,     setShowPicker]     = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeCardData | null>(null)
  const [consumeSlot,    setConsumeSlot]    = useState<PlanningSlotWithRecipe | null>(null)
  // Incrémenter pour forcer CalendarView à se recharger après une action
  const [calendarKey,    setCalendarKey]    = useState(0)

  useEffect(() => { void loadSlots() }, [])

  async function loadSlots() {
    setLoading(true)
    try {
      const res  = await fetch('/api/gamelle/planning/slots?active=true')
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
      const res  = await fetch(`/api/gamelle/recipes?${params}`)
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
    setCalendarKey(k => k + 1)
  }

  async function handleRemove(id: string) {
    try {
      await fetch(`/api/gamelle/planning/slots/${id}`, { method: 'DELETE' })
      setSlots(prev => prev.filter(s => s.id !== id))
      setCalendarKey(k => k + 1)
    } catch { /* ignore */ }
  }

  function handleConsumed(updated: PlanningSlotWithRecipe) {
    const isNowEmpty = updated.portionsConsumed >= updated.portions
    setSlots(prev =>
      isNowEmpty
        ? prev.filter(s => s.id !== updated.id)
        : prev.map(s => s.id === updated.id ? updated : s)
    )
    setConsumeSlot(null)
    setCalendarKey(k => k + 1)
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

      {/* Onglets */}
      <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        {(['basket', 'calendar'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 font-mono text-xs transition-colors"
            style={{
              color:        tab === t ? 'var(--accent)' : 'var(--muted)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            }}
          >
            {t === 'basket' ? 'Panier' : 'Cri'}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'basket' && (
          loading ? (
            <p className="font-mono text-xs p-4" style={{ color: 'var(--muted)' }}>Chargement…</p>
          ) : (
            <BasketView
              slots={slots}
              onRemove={id => void handleRemove(id)}
              onSelect={setConsumeSlot}
            />
          )
        )}
        {tab === 'calendar' && (
          <CalendarView
            refreshKey={calendarKey}
            onSelect={setConsumeSlot}
          />
        )}
      </div>

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

      {/* Sheet de consommation */}
      {consumeSlot && (
        <ConsumeSheet
          slot={consumeSlot}
          onDone={handleConsumed}
          onClose={() => setConsumeSlot(null)}
        />
      )}
    </div>
  )
}
