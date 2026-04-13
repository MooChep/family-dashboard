'use client'

import Link from 'next/link'
import { ShoppingBag, Users, Lock } from 'lucide-react'
import type { LabeurMarketItemWithPurchases } from '@/lib/labeur/types'

interface MarketPreviewProps {
  items: LabeurMarketItemWithPurchases[]
}

/**
 * Aperçu du Marché sur le tableau de bord : 3–4 articles.
 * Affiche les prix gonflés si inflation active et le sceau de cire rouge si malédiction.
 */
export function MarketPreview({ items }: MarketPreviewProps) {
  if (items.length === 0) {
    return (
      <div
        className="rounded-xl px-4 py-6 flex flex-col items-center gap-2"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <ShoppingBag size={24} style={{ color: 'var(--muted)' }} />
        <span className="text-sm" style={{ color: 'var(--muted)' }}>
          Le Marché est vide pour l'instant.
        </span>
        <Link
          href="/labeur/marche/nouvel-article"
          className="text-xs font-medium mt-1"
          style={{ color: 'var(--accent)' }}
        >
          Ajouter un article →
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const priceInflated = item.displayPrice > item.ecuPrice
        const sealedStyle   = item.isSealed
          ? { opacity: 0.6, filter: 'grayscale(40%)' }
          : {}

        return (
          <Link
            key={item.id}
            href={`/labeur/marche/${item.id}`}
            className="relative rounded-xl p-4 flex items-center gap-3 transition-colors"
            style={{
              backgroundColor: 'var(--surface)',
              border: item.isSealed ? '1px solid rgba(239,68,68,0.3)' : '1px solid var(--border)',
              ...sealedStyle,
            }}
          >
            {/* Sceau de cire rouge sur les articles scellés */}
            {item.isSealed && (
              <div
                className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: 'var(--danger)' }}
              >
                <Lock size={10} />
                <span className="text-[10px] font-bold">Scellé</span>
              </div>
            )}

            {/* Icône type */}
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'var(--surface2)' }}
            >
              {item.type === 'COLLECTIVE'
                ? <Users size={18} style={{ color: 'var(--accent)' }} />
                : <ShoppingBag size={18} style={{ color: 'var(--accent)' }} />
              }
            </div>

            {/* Titre + type */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                {item.title}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                {item.type === 'COLLECTIVE' ? 'Collectif · 50/50' : 'Individuel'}
                {item.stock !== null && (
                  <> · {item.stock} restant{item.stock > 1 ? 's' : ''}</>
                )}
              </p>
            </div>

            {/* Prix */}
            <div className="shrink-0 text-right">
              <p className="text-sm font-mono font-bold" style={{ color: 'var(--accent)' }}>
                {item.displayPrice} écu
              </p>
              {priceInflated && (
                <p
                  className="text-xs line-through"
                  style={{ color: 'var(--muted)' }}
                >
                  {item.ecuPrice}
                </p>
              )}
            </div>
          </Link>
        )
      })}

      <Link
        href="/labeur/marche"
        className="text-center text-sm py-2"
        style={{ color: 'var(--accent)' }}
      >
        Voir tout le Marché →
      </Link>
    </div>
  )
}
