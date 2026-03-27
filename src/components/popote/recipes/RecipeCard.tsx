'use client'

import type { RecipeWithIngredients } from '@/lib/popote/types'

const UPLOAD_BASE = process.env.NEXT_PUBLIC_POPOTE_UPLOAD_BASE_URL ?? '/uploads/popote'

interface RecipeCardProps {
  recipe:      RecipeWithIngredients
  isInMenu:    boolean
  onOpen:      (recipe: RecipeWithIngredients) => void
}

/**
 * Ligne de recette dans la bibliothèque.
 * Affiche image/placeholder, titre, temps total, portions et badge "Au menu".
 */
export function RecipeCard({ recipe, isInMenu, onOpen }: RecipeCardProps) {
  const totalTime = (recipe.preparationTime ?? 0) + (recipe.cookingTime ?? 0)

  return (
    <button
      onClick={() => onOpen(recipe)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {/* Image / placeholder */}
      <div
        className="shrink-0 rounded-lg overflow-hidden"
        style={{ width: 52, height: 52, background: 'var(--surface2)', border: '1px solid var(--border)' }}
      >
        {recipe.imageLocal ? (
          <img
            src={`${UPLOAD_BASE}/${recipe.imageLocal}`}
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-display text-xl"
            style={{ color: 'var(--muted)' }}
          >
            {recipe.title.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
          {recipe.title}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          {totalTime > 0 && (
            <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
              ⏱ {totalTime} min
            </span>
          )}
          <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
            👥 {recipe.basePortions}
          </span>
          {isInMenu && (
            <span className="font-mono text-[10px] font-medium" style={{ color: 'var(--success)' }}>
              ✓ Au menu
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
