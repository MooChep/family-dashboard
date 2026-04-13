'use client'

import Link from 'next/link'
import { ShoppingBag, Users, RefreshCw } from 'lucide-react'
import { WaxSeal } from './WaxSeal'
import type { LabeurMarketItemWithPurchases } from '@/lib/labeur/types'

interface MarketItemProps {
  item:           LabeurMarketItemWithPurchases
  inflationPercent: number
  curseSeuil:     number
}

/**
 * Carte article du Marché dans la liste principale.
 * Affiche : type, titre, prix (gonflé si inflation), stock, sceau si scellé.
 * Cliquable → page détail de l'article.
 */
export function MarketItem({ item, inflationPercent, curseSeuil }: MarketItemProps) {
  const priceInflated = item.displayPrice > item.ecuPrice

  return (
    <Link
      href={`/labeur/marche/${item.id}`}
      className="relative flex items-center gap-4 rounded-xl p-4 transition-colors"
      style={{
        backgroundColor: 'var(--surface)',
        border: item.isSealed
          ? '1px solid rgba(239,68,68,0.35)'
          : '1px solid var(--border)',
        opacity: !item.isActive ? 0.5 : 1,
      }}
    >
      {/* Sceau de cire (superposé) */}
      {item.isSealed && (
        <WaxSeal inflationPercent={inflationPercent} curseSeuil={curseSeuil} />
      )}

      {/* Icône type */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'var(--surface2)' }}
      >
        {item.type === 'COLLECTIVE'
          ? <Users      size={20} style={{ color: 'var(--accent)' }} />
          : <ShoppingBag size={20} style={{ color: 'var(--accent)' }} />
        }
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
          {item.title}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
          >
            {item.type === 'COLLECTIVE' ? 'Collectif' : 'Individuel'}
          </span>

          {/* Stock */}
          {item.stock !== null && (
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
              {item.stock} restant{item.stock > 1 ? 's' : ''}
            </span>
          )}

          {/* Fréquence de reset */}
          {item.resetFrequency && (
            <span
              className="flex items-center gap-0.5 text-[10px]"
              style={{ color: 'var(--muted)' }}
            >
              <RefreshCw size={8} />
              {item.resetFrequency === 'MONTHLY' ? 'Mensuel' : 'Hebdo'}
            </span>
          )}
        </div>
      </div>

      {/* Prix */}
      <div className="shrink-0 text-right">
        <p className="text-base font-mono font-bold" style={{ color: 'var(--accent)' }}>
          {item.displayPrice} écu
        </p>
        {priceInflated && (
          <p className="text-xs line-through" style={{ color: 'var(--muted)' }}>
            {item.ecuPrice}
          </p>
        )}
      </div>
    </Link>
  )
}
