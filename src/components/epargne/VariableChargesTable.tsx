'use client'

import { type ReactElement } from 'react'
import { formatAmount } from '@/lib/formatters'

export interface VariableChargeRow {
  categoryId: string
  categoryName: string
  estimated: number
  reel: number
  avg3months: number
  budgeted: number | null
}

interface VariableChargesTableProps {
  charges: VariableChargeRow[]
  onUpdateEstimated: (categoryId: string, estimated: number) => Promise<void>
}

export function VariableChargesTable({ charges }: VariableChargesTableProps): ReactElement {
  if (charges.length === 0) {
    return (
      <p className="px-5 py-4 text-sm" style={{ color: 'var(--muted)' }}>
        Aucune catégorie variable ce mois
      </p>
    )
  }

  const hasBudget = charges.some((c) => c.budgeted !== null)

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-(--border)">
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left font-(--font-mono)" style={{ color: 'var(--muted)' }}>
              Catégorie
            </th>
            {hasBudget && (
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left font-(--font-mono)" style={{ color: 'var(--accent)' }}>
                Budget
              </th>
            )}
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left font-(--font-mono)" style={{ color: 'var(--muted)' }}>
              Réel
            </th>
            <th className="hidden md:table-cell px-4 py-3 text-xs font-medium uppercase tracking-wider text-left font-(--font-mono)" style={{ color: 'var(--muted)' }}>
              Écart
            </th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left font-(--font-mono)" style={{ color: 'var(--muted)' }}>
              Moy. 3 mois
            </th>
          </tr>
        </thead>
        <tbody>
          {charges.map((charge) => {
            const ref        = charge.budgeted ?? charge.estimated
            const ecart      = charge.reel - ref
            const isOver     = ecart > 0
            const vsAvg      = charge.reel - charge.avg3months
            const isOverAvg  = vsAvg > 0

            return (
              <tr
                key={charge.categoryId}
                className="border-b border-(--border) last:border-0 hover:bg-(--surface2) transition-colors"
              >
                <td className="px-2 md:px-4 py-3 text-sm font-medium" style={{ color: 'var(--text2)' }}>
                  {charge.categoryName}
                </td>

                {/* Budget */}
                {hasBudget && (
                  <td className="px-2 md:px-4 py-3 text-sm font-(--font-mono)">
                    {charge.budgeted !== null ? (
                      <div className="flex items-center gap-1.5">
                        <span style={{ color: 'var(--accent)' }}>{formatAmount(charge.budgeted)}</span>
                        {charge.reel > 0 && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: isOver
                                ? 'color-mix(in srgb, var(--danger) 15%, transparent)'
                                : 'color-mix(in srgb, var(--success) 15%, transparent)',
                              color: isOver ? 'var(--danger)' : 'var(--success)',
                            }}
                          >
                            {isOver ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>—</span>
                    )}
                  </td>
                )}

                {/* Réel */}
                <td className="px-2 md:px-4 py-3 text-sm font-(--font-mono)" style={{ color: ref > 0 && isOver ? 'var(--danger)' : 'var(--text2)' }}>
                  {formatAmount(charge.reel)}
                </td>

                {/* Écart */}
                <td className="hidden md:table-cell px-4 py-3 text-sm font-(--font-mono)" style={{ color: ref > 0 ? (isOver ? 'var(--danger)' : 'var(--success)') : 'var(--muted)' }}>
                  {ref > 0 ? (isOver ? '+' : '') + formatAmount(ecart) : '--'}
                </td>

                {/* Moy. 3 mois */}
                <td className="px-2 md:px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-(--font-mono)" style={{ color: 'var(--text2)' }}>
                      {charge.avg3months > 0 ? formatAmount(charge.avg3months) : '--'}
                    </span>
                    {charge.avg3months > 0 && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-(--font-mono)"
                        style={{
                          backgroundColor: isOverAvg
                            ? 'color-mix(in srgb, var(--danger) 15%, transparent)'
                            : 'color-mix(in srgb, var(--success) 15%, transparent)',
                          color: isOverAvg ? 'var(--danger)' : 'var(--success)',
                        }}
                      >
                        {isOverAvg ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}