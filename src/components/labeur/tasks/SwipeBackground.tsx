'use client'

import { CheckCircle } from 'lucide-react'

interface SwipeBackgroundProps {
  /** Progression du swipe de 0 (pas commencé) à 1 (seuil atteint) */
  progress: number
}

/**
 * Fond vert affiché derrière une carte lors du swipe vers la droite.
 * Opacity et couleur interpolées selon la progression.
 */
export function SwipeBackground({ progress }: SwipeBackgroundProps) {
  const opacity = Math.min(progress * 2, 1)

  return (
    <div
      className="absolute inset-0 flex items-center rounded-xl px-5"
      style={{ backgroundColor: `rgba(34,197,94,${Math.min(progress * 1.5, 0.9)})` }}
    >
      <CheckCircle
        size={22}
        strokeWidth={2.5}
        style={{ color: 'white', opacity }}
      />
    </div>
  )
}
