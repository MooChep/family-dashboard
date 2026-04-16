'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Users, RefreshCw, Lock } from 'lucide-react'
import { WaxSeal } from './WaxSeal'
import type { LabeurMarketItemWithPurchases } from '@/lib/labeur/types'

interface MarketItemProps {
  item:             LabeurMarketItemWithPurchases
  inflationPercent: number
  curseSeuil:       number
  currentUserId:    string
  onBuySuccess:     () => void
}

/**
 * Carte article du Marché dans la liste principale.
 * Affiche : type, titre, prix (gonflé si inflation), stock, sceau si scellé.
 * Le contenu principal est cliquable → page détail.
 * Un bouton d'achat inline évite d'entrer dans le détail pour acheter.
 */
export function MarketItem({
  item, inflationPercent, curseSeuil, currentUserId, onBuySuccess,
}: MarketItemProps) {
  const [confirm,  setConfirm]  = useState(false)
  const [buying,   setBuying]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const priceInflated = item.displayPrice > item.ecuPrice

  // Déjà contribué à un achat collectif en cours ?
  const alreadyContributed = item.type === 'COLLECTIVE' &&
    item.purchases.some((p) => p.userId === currentUserId && !p.isComplete)

  const outOfStock = item.stock !== null && item.stock <= 0
  const canBuy     = item.isActive && !item.isSealed && !alreadyContributed && !outOfStock

  const memberShare = Math.ceil(item.displayPrice / 2)

  async function handleBuy(e: React.MouseEvent) {
    e.preventDefault()
    if (!confirm) { setConfirm(true); return }
    setConfirm(false)
    setBuying(true)
    setError(null)
    try {
      const res = await fetch(`/api/labeur/market/${item.id}/buy`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Erreur')
        return
      }
      onBuySuccess()
    } catch {
      setError('Erreur réseau')
    } finally {
      setBuying(false)
    }
  }

  function handleCancelConfirm(e: React.MouseEvent) {
    e.preventDefault()
    setConfirm(false)
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden"
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

      {/* Zone principale cliquable → détail */}
      <Link
        href={`/labeur/marche/${item.id}`}
        className="flex items-center gap-4 p-4"
      >
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
            {item.stock !== null && (
              <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                {item.stock} restant{item.stock > 1 ? 's' : ''}
              </span>
            )}
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

      {/* ── Bouton achat inline ── */}
      {item.isSealed ? (
        <div
          className="mx-4 mb-3 py-2 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5"
          style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: 'var(--danger)' }}
        >
          <Lock size={12} />
          Article scellé — malédiction active
        </div>
      ) : alreadyContributed ? (
        <div
          className="mx-4 mb-3 py-2 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5"
          style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
        >
          <Users size={12} />
          Ta contribution est enregistrée
        </div>
      ) : canBuy ? (
        <div className="px-4 pb-3 flex flex-col gap-1.5">
          {/* Message de confirmation */}
          {confirm && (
            <p className="text-xs px-2" style={{ color: 'var(--text2)' }}>
              {item.type === 'COLLECTIVE'
                ? `Contribuer ${memberShare} écu pour ta moitié de "${item.title}" ?`
                : `Acheter "${item.title}" pour ${item.displayPrice} écu ?`
              }
            </p>
          )}
          <div className="flex gap-2">
            {confirm && (
              <button
                onClick={handleCancelConfirm}
                className="flex-1 py-2 rounded-lg text-xs font-medium"
                style={{ backgroundColor: 'var(--surface2)', color: 'var(--text2)' }}
              >
                Annuler
              </button>
            )}
            <button
              onClick={handleBuy}
              disabled={buying}
              className="flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              style={{
                backgroundColor: confirm ? 'var(--danger)' : 'var(--accent)',
                color: 'var(--bg)',
              }}
            >
              {buying ? '…' : confirm ? 'Confirmer' : (
                <>
                  {item.type === 'COLLECTIVE' ? <Users size={12} /> : <ShoppingBag size={12} />}
                  {item.type === 'COLLECTIVE'
                    ? `Contribuer · ${memberShare} écu`
                    : `Acheter · ${item.displayPrice} écu`
                  }
                </>
              )}
            </button>
          </div>
          {error && (
            <p className="text-[10px] text-center" style={{ color: 'var(--danger)' }}>{error}</p>
          )}
        </div>
      ) : outOfStock ? (
        <div
          className="mx-4 mb-3 py-2 rounded-lg text-xs font-semibold text-center"
          style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
        >
          Stock épuisé
        </div>
      ) : null}

    </div>
  )
}
