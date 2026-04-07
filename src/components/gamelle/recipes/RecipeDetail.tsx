'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Pencil, ChefHat, Minus, Plus, Heart, Check } from 'lucide-react'
import { displayFraction } from '@/lib/gamelle/fractions'
import type { RecipeWithIngredients } from '@/lib/gamelle/types'

const UPLOAD_BASE = process.env.NEXT_PUBLIC_GAMELLE_UPLOAD_BASE_URL ?? '/uploads/gamelle'

interface RecipeDetailProps {
  recipe:      RecipeWithIngredients
  isInMenu:    boolean
  onClose:     () => void
  onAddToMenu: (recipe: RecipeWithIngredients) => void  // appelé après ajout réussi
}

/** Formate une quantité d'ingrédient pour la fiche recette (displayQuantity × mult). */
function formatIngredientQty(displayQuantity: number, displayUnit: string, mult: number): string {
  const qty = displayQuantity * mult
  const frac = displayFraction(qty)
  const formatted = frac ?? (Number.isInteger(qty) ? String(qty) : parseFloat(qty.toFixed(2)).toString().replace('.', ','))
  return displayUnit ? `${formatted} ${displayUnit}` : formatted
}

/**
 * Fiche recette complète — bottom sheet plein écran.
 * Image circulaire, grille ingrédients 3 colonnes, étapes numérotées, footer sticky.
 */
export function RecipeDetail({ recipe, isInMenu, onClose, onAddToMenu }: RecipeDetailProps) {
  const router = useRouter()
  const [portions, setPortions] = useState(recipe.basePortions ?? 2)
  const [liked,    setLiked]    = useState(false)
  const [liking,   setLiking]   = useState(false)
  const [adding,   setAdding]   = useState(false)
  const [added,    setAdded]    = useState(isInMenu)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Charger l'état du like au montage
  useEffect(() => {
    void (async () => {
      try {
        const res  = await fetch(`/api/gamelle/recipes/liked`)
        const json = await res.json() as { success: boolean; data: { data: { id: string }[] } }
        if (json.success) {
          setLiked(json.data.data.some(r => r.id === recipe.id))
        }
      } catch { /* ignore */ }
    })()
  }, [recipe.id])

  async function handleToggleLike() {
    if (liking) return
    setLiking(true)
    try {
      const res  = await fetch(`/api/gamelle/recipes/${recipe.id}/like`, { method: 'POST' })
      const data = await res.json() as { liked: boolean }
      setLiked(data.liked)
    } catch { /* ignore */ } finally {
      setLiking(false)
    }
  }

  const mult = portions / (recipe.basePortions || 1)

  async function handleAddToMenu() {
    if (added || adding) return
    setAdding(true)
    try {
      const res = await fetch('/api/gamelle/planning/slots', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recipeId: recipe.id, portions }),
      })
      if (res.ok) {
        setAdded(true)
        onAddToMenu(recipe)
      }
    } catch { /* ignore */ } finally {
      setAdding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--muted)' }}>
          <X size={20} />
        </button>
        <h1
          className="flex-1 font-display text-base font-semibold truncate"
          style={{ color: 'var(--text)' }}
        >
          {recipe.title}
        </h1>
        <button
          onClick={() => void handleToggleLike()}
          disabled={liking}
          className="p-1 rounded-lg disabled:opacity-40"
          style={{ color: liked ? 'var(--danger, #e74c3c)' : 'var(--muted)' }}
        >
          <Heart size={18} fill={liked ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={() => router.push(`/gamelle/recettes/${recipe.id}/edit`)}
          className="p-1 rounded-lg"
          style={{ color: 'var(--muted)' }}
        >
          <Pencil size={18} />
        </button>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Image circulaire + titre */}
        <div className="flex flex-col items-center px-4 pt-6 pb-4 gap-3">
          <div
            className="rounded-full overflow-hidden flex items-center justify-center"
            style={{ width: 120, height: 120, background: 'var(--surface2)', border: '2px solid var(--border)', flexShrink: 0 }}
          >
            {recipe.imageLocal ? (
              <img src={`${UPLOAD_BASE}/${recipe.imageLocal}`} alt={recipe.title} className="w-full h-full object-cover" />
            ) : (
              <span className="font-display text-5xl font-bold" style={{ color: 'var(--muted)' }}>
                {recipe.title.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h2 className="font-display text-xl font-semibold text-center leading-snug" style={{ color: 'var(--text)' }}>
            {recipe.title}
          </h2>
          {/* Meta badges */}
          <div className="flex flex-wrap justify-center gap-2">
            {recipe.preparationTime ? (
              <span className="font-mono text-xs px-2 py-1 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                ⏱ {recipe.preparationTime} min prép.
              </span>
            ) : null}
            {recipe.cookingTime ? (
              <span className="font-mono text-xs px-2 py-1 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                🔥 {recipe.cookingTime} min
              </span>
            ) : null}
            {recipe.calories ? (
              <span className="font-mono text-xs px-2 py-1 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                {recipe.calories} kcal
              </span>
            ) : null}
          </div>
        </div>

        <div className="px-4 pb-6 flex flex-col gap-5">
          {/* Stepper portions */}
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Portions</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPortions(p => Math.max(1, p - 1))}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)' }}
              >
                <Minus size={12} />
              </button>
              <span className="font-mono text-sm w-5 text-center" style={{ color: 'var(--text)' }}>{portions}</span>
              <button
                onClick={() => setPortions(p => p + 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)' }}
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* Description */}
          {recipe.description && (
            <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--text2)' }}>
              {recipe.description}
            </p>
          )}

          {/* Ingrédients — grille 3 colonnes (isIgnored exclus) */}
          {recipe.ingredients.filter(i => !i.isIgnored).length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
                Ingrédients
              </p>
              <div className="grid grid-cols-3 gap-2">
                {recipe.ingredients.filter(i => !i.isIgnored).map(ing => (
                  <div
                    key={ing.id}
                    className="flex flex-col items-center text-center gap-1 p-2 rounded-xl"
                    style={{
                      background: 'var(--surface2)',
                      border:     '1px solid var(--border)',
                      opacity:    ing.isStaple ? 0.5 : 1,
                    }}
                  >
                    <span className="font-body text-xs leading-snug line-clamp-2" style={{ color: 'var(--text)' }}>
                      {ing.reference.name}
                    </span>
                    <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                      {formatIngredientQty(ing.displayQuantity, ing.displayUnit, mult)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Étapes */}
          {recipe.steps.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
                Préparation
              </p>
              <div className="flex flex-col gap-3">
                {recipe.steps.map(step => (
                  <div key={step.order} className="flex gap-3">
                    <span
                      className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs mt-0.5"
                      style={{ background: 'var(--accent)', color: '#fff' }}
                    >
                      {step.order}
                    </span>
                    <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--text2)' }}>
                      {step.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ustensiles */}
          {recipe.utensils && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>
                Ustensiles
              </p>
              <p className="font-body text-sm" style={{ color: 'var(--text2)' }}>
                {recipe.utensils}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer sticky */}
      <div
        className="shrink-0 px-4 py-2 flex gap-3 pb-18"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}
      >
        <button
          onClick={() => void handleAddToMenu()}
          disabled={adding}
          className="flex-1 py-1 rounded-xl font-mono text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40"
          style={{
            background: added ? 'var(--accent-dim)' : 'var(--accent)',
            color:      added ? 'var(--accent)'     : '#fff',
            border:     added ? '1px solid var(--accent)' : 'none',
          }}
        >
          {added ? <><Check size={14} /> Au menu</> : adding ? 'Ajout…' : '+ Ajouter au menu'}
        </button>
        <button
          onClick={() => router.push(`/gamelle/cuisine/${recipe.id}?portions=${portions}`)}
          className="flex items-center gap-2 px-4 py-3 rounded-xl font-mono text-sm"
          style={{ background: 'var(--surface2)', color: 'var(--accent)', border: '1px solid var(--border)' }}
        >
          <ChefHat size={16} />
          Mode cuisine
        </button>
      </div>
    </div>
  )
}
