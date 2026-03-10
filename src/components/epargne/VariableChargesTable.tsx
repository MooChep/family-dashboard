'use client'

import { useState, type ReactElement } from 'react'
import { formatAmount } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export interface VariableChargeRow {
  categoryId: string
  categoryName: string
  estimated: number
  reel: number
  avg3months: number
  // Montant prévu dans la budgétisation (somme des BudgetEntry du mois pour cette catégorie)
  // null = aucune ligne budget définie pour ce mois
  budgeted: number | null
}

interface VariableChargesTableProps {
  charges: VariableChargeRow[]
  onUpdateEstimated: (categoryId: string, estimated: number) => Promise<void>
}

export function VariableChargesTable({
  charges,
  onUpdateEstimated,
}: VariableChargesTableProps): ReactElement {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  function startEdit(categoryId: string, currentValue: number): void {
    setEditingId(categoryId)
    setEditValue(String(currentValue))
  }

  async function saveEdit(categoryId: string): Promise<void> {
    const parsed = parseFloat(editValue.replace(',', '.'))
    if (!isNaN(parsed)) await onUpdateEstimated(categoryId, parsed)
    setEditingId(null)
  }

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
              Estimé
            </th>
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
            const ecart      = charge.reel - charge.estimated
            const isOver     = ecart > 0
            const vsAvg      = charge.reel - charge.avg3months
            const isOverAvg  = vsAvg > 0
            const ecartBudget   = charge.budgeted !== null ? charge.reel - charge.budgeted : null
            const isOverBudget  = ecartBudget !== null && ecartBudget > 0

            return (
              <tr
                key={charge.categoryId}
                className="border-b border-(--border) last:border-0 hover:bg-(--surface2) transition-colors"
              >
                <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text2)' }}>
                  {charge.categoryName}
                </td>

                {/* Colonne Budget */}
                {hasBudget && (
                  <td className="px-4 py-3 text-sm font-(--font-mono)">
                    {charge.budgeted !== null ? (
                      <div className="flex items-center gap-1.5">
                        <span style={{ color: 'var(--accent)' }}>
                          {formatAmount(charge.budgeted)}
                        </span>
                        {charge.reel > 0 && ecartBudget !== null && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: isOverBudget
                                ? 'color-mix(in srgb, var(--danger) 15%, transparent)'
                                : 'color-mix(in srgb, var(--success) 15%, transparent)',
                              color: isOverBudget ? 'var(--danger)' : 'var(--success)',
                            }}
                          >
                            {isOverBudget ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>—</span>
                    )}
                  </td>
                )}

                {/* Estimé (éditable) */}
                <td className="px-4 py-3">
                  {editingId === charge.categoryId ? (
                    <input
                      className="w-20 md:w-24 px-2 py-1 rounded text-sm outline-none"
                      style={{
                        backgroundColor: 'var(--surface2)',
                        border: '1px solid var(--accent)',
                        color: 'var(--text)',
                        fontFamily: 'var(--font-mono)',
                      }}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => void saveEdit(charge.categoryId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter')  void saveEdit(charge.categoryId)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      className="text-sm text-left font-(--font-mono)"
                      style={{ color: 'var(--text2)' }}
                      onClick={() => startEdit(charge.categoryId, charge.estimated)}
                    >
                      {charge.estimated > 0 ? formatAmount(charge.estimated) : '--'}
                    </button>
                  )}
                </td>

                {/* Réel */}
                <td
                  className="px-4 py-3 text-sm font-(--font-mono)"
                  style={{ color: charge.estimated > 0 && isOver ? 'var(--danger)' : 'var(--text2)' }}
                >
                  {formatAmount(charge.reel)}
                </td>

                {/* Écart estimé vs réel */}
                <td
                  className="hidden md:table-cell px-4 py-3 text-sm font-(--font-mono)"
                  style={{ color: charge.estimated > 0 ? (isOver ? 'var(--danger)' : 'var(--success)') : 'var(--muted)' }}
                >
                  {charge.estimated > 0 ? (isOver ? '+' : '') + formatAmount(ecart) : '--'}
                </td>

                {/* Moy. 3 mois */}
                <td className="px-4 py-3">
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