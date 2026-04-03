'use client'

import { useState } from 'react'
import { Check, Plus, Heart } from 'lucide-react'
import type { RecipeWithIngredients } from '@/lib/gamelle/types'

const UPLOAD_BASE = process.env.NEXT_PUBLIC_GAMELLE_UPLOAD_BASE_URL ?? '/uploads/gamelle'

interface RecipeCardProps {
  recipe:     RecipeWithIngredients
  isInMenu:   boolean
  onOpen:     (recipe: RecipeWithIngredients) => void
  initialLiked?: boolean
}

/**
 * Carte recette en grille 2 colonnes — image circulaire, titre 2 lignes, temps, boutons.
 */
export function RecipeCard({ recipe, isInMenu, onOpen, initialLiked = false }: RecipeCardProps) {
  const [liked,  setLiked]  = useState(initialLiked)
  const [liking, setLiking] = useState(false)

  const totalTime = (recipe.preparationTime ?? 0) + (recipe.cookingTime ?? 0)

  async function handleToggleLike(e: React.MouseEvent) {
    e.stopPropagation()
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

  return (
    <div
      className="flex flex-col gap-2 rounded-2xl p-2.5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      {/* Image + like button */}
      <div className="relative">
        <button onClick={() => onOpen(recipe)} className="w-full">
          <div
            className="mx-auto rounded-full overflow-hidden flex items-center justify-center"
            style={{ width: 72, height: 72, background: 'var(--surface2)', border: '2px solid var(--border)' }}
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
        <button
          onClick={handleToggleLike}
          disabled={liking}
          className="absolute top-0 right-0 p-1 rounded-full disabled:opacity-40"
          style={{ color: liked ? 'var(--danger, #e74c3c)' : 'var(--border2)' }}
        >
          <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Titre — toujours 2 lignes */}
      <p
        className="font-body text-xs text-center leading-snug"
        style={{
          color:             'var(--text)',
          display:           '-webkit-box',
          WebkitLineClamp:   2,
          WebkitBoxOrient:   'vertical',
          overflow:          'hidden',
          minHeight:         '2.4em',
        }}
      >
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
