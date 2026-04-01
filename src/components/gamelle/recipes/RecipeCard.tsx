'use client'

import { Check, Plus } from 'lucide-react'
import type { RecipeWithIngredients } from '@/lib/gamelle/types'

const UPLOAD_BASE = process.env.NEXT_PUBLIC_GAMELLE_UPLOAD_BASE_URL ?? '/uploads/gamelle'

interface RecipeCardProps {
  recipe:   RecipeWithIngredients
  isInMenu: boolean
  onOpen:   (recipe: RecipeWithIngredients) => void
}

/**
 * Carte recette en grille 2 colonnes — image circulaire, titre, temps, bouton.
 */
export function RecipeCard({ recipe, isInMenu, onOpen }: RecipeCardProps) {
  const totalTime = (recipe.preparationTime ?? 0) + (recipe.cookingTime ?? 0)

  return (
    <div className="flex flex-col gap-2">
      <button onClick={() => onOpen(recipe)} className="w-full">
        <div
          className="mx-auto rounded-full overflow-hidden flex items-center justify-center"
          style={{ width: 80, height: 80, background: 'var(--surface2)', border: '2px solid var(--border)' }}
        >
          {recipe.imageLocal ? (
            <img
              src={`${UPLOAD_BASE}/${recipe.imageLocal}`}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-display text-2xl font-bold" style={{ color: 'var(--muted)' }}>
              {recipe.title.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </button>
      <p className="font-body text-sm text-center leading-snug line-clamp-3" style={{ color: 'var(--text)' }}>
        {recipe.title}
      </p>
      {totalTime > 0 && (
        <p className="font-mono text-[10px] text-center" style={{ color: 'var(--muted)' }}>
          {totalTime} min
        </p>
      )}
      <button
        onClick={() => onOpen(recipe)}
        className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-mono text-xs w-full"
        style={{
          background: isInMenu ? 'var(--accent)' : 'var(--surface2)',
          color:      isInMenu ? '#fff' : 'var(--accent)',
          border:     `1px solid ${isInMenu ? 'var(--accent)' : 'var(--border)'}`,
        }}
      >
        {isInMenu ? <Check size={12} /> : <Plus size={12} />}
        {isInMenu ? 'Au menu' : 'Voir'}
      </button>
    </div>
  )
}
