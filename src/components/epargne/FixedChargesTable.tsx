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
    if (!isNaN(parsed)) {
      await onUpdateEstimated(categoryId, parsed)
    }
    setEditingId(null)
  }

  if (charges.length === 0) {
    return (
      <p className="text-sm text-(--muted)]">
        Aucune charge fixe configurée
      </p>
    )
  }

  return (
    <div className="rounded-b-xl overflow-hidden bg-(--surface) border border-(--border)]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-(--border)]">
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left text-(--muted) font-(--font-mono)]">
              Catégorie
            </th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left text-(--muted) font-(--font-mono)]">
              Estimé
            </th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left text-(--muted) font-(--font-mono)]">
              Réel
            </th>
            <th className="hidden md:table-cell px-4 py-3 text-xs font-medium uppercase tracking-wider text-left text-(--muted) font-(--font-mono)]">
              Écart
            </th>
          </tr>
        </thead>
        <tbody>
          {charges.map((charge) => {
            const ecart = charge.reel - charge.estimated
            const isOver = ecart > 0

            return (
              <tr key={charge.categoryId} className="border-b border-(--border) last:border-0 hover:bg-(--surface2) transition-colors">
                <td className="px-4 py-3 text-sm text-(--text2) font-medium">
                  {charge.categoryName}
                </td>
                <td className="px-4 py-3">
                  {editingId === charge.categoryId ? (
                    <input
                      className="w-20 md:w-24 px-2 py-1 rounded text-sm outline-none bg-(--surface2) border border-(--accent) text-(--text) font-(--font-mono)]"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(charge.categoryId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void saveEdit(charge.categoryId)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      autoFocus
                    />
                  ) : (
                    <button
                      className="text-sm text-left text-(--text2) font-(--font-mono) hover:text-(--accent)]"
                      onClick={() => startEdit(charge.categoryId, charge.estimated)}
                    >
                      {formatAmount(charge.estimated)}
                    </button>
                  )}
                </td>
                <td className={cn(
                  "px-4 py-3 text-sm font-(--font-mono)]",
                  isOver ? "text-(--danger)]" : "text-(--text2)]"
                )} style={{ color: isOver ? 'var(--danger)' : 'var(--text2)' }}>
                  {formatAmount(charge.reel)}
                </td>
                <td className={cn(
                  "hidden md:table-cell px-4 py-3 text-sm font-(--font-mono)]",
                  isOver ? "text-(--danger)]" : "text-(--success)]"
                )}
                style={{ color: isOver ? 'var(--danger)' : 'var(--success)' }}>
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