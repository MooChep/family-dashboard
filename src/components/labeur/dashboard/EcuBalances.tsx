'use client'

import type { EcuBalanceWithTitle } from '@/lib/labeur/types'

interface EcuBalancesProps {
  balances: EcuBalanceWithTitle[]
}

/**
 * Soldes écu des deux membres du foyer — transparence totale (§3.5).
 * Affiche : prénom, titre de seigneur, solde courant, progression vers le prochain palier.
 */
export function EcuBalances({ balances }: EcuBalancesProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {balances.map((b) => (
        <div
          key={b.userId}
          className="rounded-xl p-4 flex flex-col gap-2"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* Prénom + titre */}
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              {b.user.name}
            </span>
            <span className="text-xs" style={{ color: 'var(--accent)' }}>
              {b.honorTitle}
            </span>
          </div>

          {/* Solde courant */}
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono" style={{ color: 'var(--text)' }}>
              {b.balance}
            </span>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>écu</span>
          </div>

          {/* Barre de progression vers le prochain titre */}
          {b.nextTitleThreshold !== null && (
            <div className="flex flex-col gap-1">
              <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--surface2)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${b.progressPercent}%`,
                    backgroundColor: 'var(--accent)',
                  }}
                />
              </div>
              <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                {b.nextTitleThreshold - b.totalEcuEarned} écu avant le prochain titre
              </span>
            </div>
          )}

          {/* Dernier palier atteint */}
          {b.nextTitleThreshold === null && (
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
              Palier maximum atteint ✦
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
