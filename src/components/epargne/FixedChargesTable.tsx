'use client'

import { useState, type ReactElement } from 'react'
import { formatAmount } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface FixedChargeRow {
  categoryId: string
  categoryName: string
  chargeId: string | null
  estimated: number
  reel: number
  // Montant prévu dans la budgétisation (somme des BudgetEntry du mois pour cette catégorie)
  // null = aucune ligne budget définie pour ce mois
  budgeted: number | null
}

interface FixedChargesTableProps {
  charges: FixedChargeRow[]
  onUpdateEstimated: (categoryId: string, estimated: number) => Promise<void>
}

export function FixedChargesTable({
  charges,
  onUpdateEstimated,
}: FixedChargesTableProps): ReactElement {
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
        Aucune charge fixe configurée
      </p>
    )
  }

  // Vérifie si au moins une ligne a une valeur budgétisée pour afficher la colonne
  const hasBudget = charges.some((c) => c.budgeted !== null)

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-(--border)">
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left font-(--font-mono)" style={{ color: 'var(--muted)' }}>
              Catégorie
            </th>
            {/* Colonne Budget — visible uniquement si des lignes budget existent */}
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
          </tr>
        </thead>
        <tbody>
          {charges.map((charge) => {
            const ecart  = charge.reel - charge.estimated
            const isOver = ecart > 0
            // Écart entre réel et budget prévu
            const ecartBudget  = charge.budgeted !== null ? charge.reel - charge.budgeted : null
            const isOverBudget = ecartBudget !== null && ecartBudget > 0

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
                        {/* Badge écart réel vs budget — visible seulement si réel > 0 */}
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

                {/* Colonne Estimé (éditable) */}
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
                      className="text-sm text-left"
                      style={{ color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}
                      onClick={() => startEdit(charge.categoryId, charge.estimated)}
                    >
                      {formatAmount(charge.estimated)}
                    </button>
                  )}
                </td>

                {/* Réel */}
                <td
                  className="px-4 py-3 text-sm font-(--font-mono)"
                  style={{ color: isOver ? 'var(--danger)' : 'var(--text2)' }}
                >
                  {formatAmount(charge.reel)}
                </td>

                {/* Écart estimé vs réel */}
                <td
                  className="hidden md:table-cell px-4 py-3 text-sm font-(--font-mono)"
                  style={{ color: isOver ? 'var(--danger)' : 'var(--success)' }}
                >
                  {isOver ? '+' : ''}{formatAmount(ecart)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}