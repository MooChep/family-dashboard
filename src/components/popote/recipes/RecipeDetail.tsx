'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { X, Pencil, ChefHat } from 'lucide-react'
import { formatQuantity } from '@/lib/popote/units'
import type { RecipeWithIngredients } from '@/lib/popote/types'

const UPLOAD_BASE = process.env.NEXT_PUBLIC_POPOTE_UPLOAD_BASE_URL ?? '/uploads/popote'

interface RecipeDetailProps {
  recipe:       RecipeWithIngredients
  isInMenu:     boolean
  onClose:      () => void
  onAddToMenu:  (recipe: RecipeWithIngredients) => void
}

/**
 * Fiche recette complète — bottom sheet plein écran.
 * Affiche image, métadonnées, liste d'ingrédients et actions principales.
 */
export function RecipeDetail({ recipe, isInMenu, onClose, onAddToMenu }: RecipeDetailProps) {
  // Fermer avec Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const totalTime = (recipe.preparationTime ?? 0) + (recipe.cookingTime ?? 0)

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
        <h1 className="flex-1 font-display text-base font-semibold truncate" style={{ color: 'var(--text)' }}>
          {recipe.title}
        </h1>
        <Link
          href={`/popote/recettes/${recipe.id}/edit`}
          className="p-1 rounded-lg"
          style={{ color: 'var(--muted)' }}
        >
          <Pencil size={18} />
        </Link>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Image */}
        <div
          className="w-full flex items-center justify-center"
          style={{ height: 180, background: 'var(--surface2)' }}
        >
          {recipe.imageLocal ? (
            <img
              src={`${UPLOAD_BASE}/${recipe.imageLocal}`}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-display text-6xl" style={{ color: 'var(--muted2)' }}>
              {recipe.title.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="px-4 py-4 flex flex-col gap-5">
          {/* Métadonnées */}
          <div className="flex flex-wrap gap-2">
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
            <span className="font-mono text-xs px-2 py-1 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
              👥 {recipe.basePortions} portions
            </span>
            {recipe.calories ? (
              <span className="font-mono text-xs px-2 py-1 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                🔥 {recipe.calories} kcal
              </span>
            ) : null}
          </div>

          {/* Description */}
          {recipe.description && (
            <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--text2)' }}>
              {recipe.description}
            </p>
          )}

          {/* Ingrédients */}
          {recipe.ingredients.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
                Ingrédients
              </p>
              <div className="flex flex-col gap-1">
                {recipe.ingredients.map(ing => (
                  <div key={ing.id} className="flex items-center justify-between py-1" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span className="font-body text-sm" style={{ color: ing.isStaple ? 'var(--muted)' : 'var(--text)' }}>
                      {ing.reference.name}
                      {ing.isOptional && (
                        <span className="font-mono text-[10px] ml-1" style={{ color: 'var(--muted)' }}>(optionnel)</span>
                      )}
                    </span>
                    <span className="font-mono text-sm" style={{ color: 'var(--text2)' }}>
                      {formatQuantity(ing.quantity, ing.displayUnit)}
                    </span>
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

      {/* Actions fixées en bas */}
      <div
        className="shrink-0 px-4 py-4 flex gap-3"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}
      >
        <button
          onClick={() => void onAddToMenu(recipe)}
          className="flex-1 py-3 rounded-xl font-mono text-sm font-medium transition-opacity"
          style={{
            background: isInMenu ? 'var(--accent-dim)' : 'var(--accent)',
            color:      isInMenu ? 'var(--accent)' : '#fff',
            border:     isInMenu ? '1px solid var(--accent)' : 'none',
          }}
        >
          {isInMenu ? '✓ Au menu' : '+ Ajouter au menu'}
        </button>
        <Link
          href={`/popote/cuisine/${recipe.id}`}
          className="flex items-center gap-2 px-4 py-3 rounded-xl font-mono text-sm transition-colors"
          style={{ background: 'var(--surface2)', color: 'var(--accent)', border: '1px solid var(--border)' }}
        >
          <ChefHat size={16} />
          Cuisiner
        </Link>
      </div>
    </div>
  )
}
