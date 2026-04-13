'use client'

import { useState } from 'react'
import { ShoppingBag, Users } from 'lucide-react'
import type { LabeurMarketItemWithPurchases } from '@/lib/labeur/types'

interface PurchaseButtonProps {
  item:          LabeurMarketItemWithPurchases
  currentUserId: string
  onSuccess:     () => void
}

/**
 * Bouton d'achat pour un article du Marché.
 * - INDIVIDUAL : achat direct après confirmation
 * - COLLECTIVE : contribution à 50 % après confirmation
 * Désactivé si scellé, stock épuisé, ou contribution déjà faite.
 */
export function PurchaseButton({ item, currentUserId, onSuccess }: PurchaseButtonProps) {
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [confirm,  setConfirm]  = useState(false)

  // Déjà contribué à l'achat collectif en cours ?
  const alreadyContributed = item.type === 'COLLECTIVE' &&
    item.purchases.some((p) => p.userId === currentUserId && !p.isComplete)

  const isDisabled = item.isSealed || !item.isActive || alreadyContributed ||
    (item.stock !== null && item.stock <= 0)

  const memberShare = Math.ceil(item.displayPrice / 2)
  const label = item.type === 'COLLECTIVE'
    ? `Contribuer · ${memberShare} écu`
    : `Acheter · ${item.displayPrice} écu`

  const confirmMsg = item.type === 'COLLECTIVE'
    ? `Contribuer ${memberShare} écu pour "${item.title}" ? (ta moitié du financement collectif)`
    : `Acheter "${item.title}" pour ${item.displayPrice} écu ?${
        item.displayPrice > item.ecuPrice
          ? ` (prix de base : ${item.ecuPrice} écu, ${Math.round((item.displayPrice / item.ecuPrice - 1) * 100)} % d'inflation)`
          : ''
      }`

  async function handleBuy() {
    if (!confirm) {
      setConfirm(true)
      return
    }
    setConfirm(false)
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/labeur/market/${item.id}/buy`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Erreur')
        return
      }
      onSuccess()
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  if (item.isSealed) {
    return (
      <div
        className="w-full py-3 rounded-xl text-sm font-semibold text-center"
        style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--danger)' }}
      >
        🔴 Article scellé
      </div>
    )
  }

  if (alreadyContributed) {
    return (
      <div
        className="w-full py-3 rounded-xl text-sm font-semibold text-center"
        style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
      >
        <Users size={14} className="inline mr-1.5" />
        Ta contribution est enregistrée
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {confirm && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}
        >
          {confirmMsg}
        </div>
      )}

      <div className="flex gap-2">
        {confirm && (
          <button
            onClick={() => setConfirm(false)}
            className="flex-1 py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'var(--surface2)', color: 'var(--text2)' }}
          >
            Annuler
          </button>
        )}
        <button
          onClick={handleBuy}
          disabled={loading || isDisabled}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: confirm ? 'var(--danger)' : 'var(--accent)', color: 'var(--bg)' }}
        >
          {loading ? '…' : confirm ? 'Confirmer' : (
            <>
              {item.type === 'COLLECTIVE' ? <Users size={14} /> : <ShoppingBag size={14} />}
              {label}
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>{error}</p>
      )}
    </div>
  )
}
