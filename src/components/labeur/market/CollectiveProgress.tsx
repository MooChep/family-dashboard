'use client'

import { Users } from 'lucide-react'
import type { LabeurMarketItemWithPurchases } from '@/lib/labeur/types'

interface CollectiveProgressProps {
  item:          LabeurMarketItemWithPurchases
  currentUserId: string
}

/**
 * Barre de progression du financement collectif 50/50.
 * Affiche la contribution de chaque membre et le montant restant à financer.
 */
export function CollectiveProgress({ item, currentUserId }: CollectiveProgressProps) {
  if (item.type !== 'COLLECTIVE') return null

  // Contributions en cours (non finalisées) pour cet article
  const pendingContribs = item.purchases.filter((p) => !p.isComplete)
  const myContrib       = pendingContribs.find((p) => p.userId === currentUserId)
  const otherContrib    = pendingContribs.find((p) => p.userId !== currentUserId)

  const totalFunded   = pendingContribs.reduce((s, p) => s + p.ecuSpent, 0)
  const memberShare   = Math.ceil(item.displayPrice / 2)
  const progressPct   = Math.min(100, (totalFunded / item.displayPrice) * 100)

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2">
        <Users size={14} style={{ color: 'var(--accent)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Financement collectif
        </span>
        <span className="text-xs ml-auto" style={{ color: 'var(--muted)' }}>
          {totalFunded} / {item.displayPrice} écu
        </span>
      </div>

      {/* Barre de progression */}
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
        {/* Part de l'autre membre */}
        {otherContrib && (
          <div
            className="h-full float-left rounded-l-full"
            style={{
              width:           `${(otherContrib.ecuSpent / item.displayPrice) * 100}%`,
              backgroundColor: 'var(--muted)',
            }}
          />
        )}
        {/* Ma part */}
        {myContrib && (
          <div
            className="h-full float-left"
            style={{
              width:           `${(myContrib.ecuSpent / item.displayPrice) * 100}%`,
              backgroundColor: 'var(--accent)',
              borderRadius:    otherContrib ? '0 4px 4px 0' : '4px',
            }}
          />
        )}
      </div>

      {/* Détail par membre */}
      <div className="flex flex-col gap-1">
        {myContrib ? (
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--accent)' }}>
              Ta contribution
            </span>
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--accent)' }}>
              {myContrib.ecuSpent} écu ✓
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              Ta part
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
              {memberShare} écu à payer
            </span>
          </div>
        )}

        {otherContrib ? (
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              {otherContrib.user.name}
            </span>
            <span className="text-xs font-mono font-semibold" style={{ color: 'var(--muted)' }}>
              {otherContrib.ecuSpent} écu ✓
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              Autre membre
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
              {memberShare} écu à payer
            </span>
          </div>
        )}
      </div>

      {/* Statut */}
      {progressPct === 100 ? (
        <p className="text-xs font-semibold text-center" style={{ color: 'var(--accent)' }}>
          ✓ Financement complet — récompense débloquée !
        </p>
      ) : myContrib && !otherContrib ? (
        <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
          En attente de la contribution de l'autre membre…
        </p>
      ) : null}
    </div>
  )
}
