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
      <p className="text-sm text-[var(--muted)]">
        Aucune charge fixe configurée
      </p>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden bg-[var(--surface)] border border-[var(--border)]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left text-[var(--muted)] font-[var(--font-mono)]">
              Catégorie
            </th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left text-[var(--muted)] font-[var(--font-mono)]">
              Estimé
            </th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left text-[var(--muted)] font-[var(--font-mono)]">
              Réel
            </th>
            <th className="hidden md:table-cell px-4 py-3 text-xs font-medium uppercase tracking-wider text-left text-[var(--muted)] font-[var(--font-mono)]">
              Écart
            </th>
          </tr>
        </thead>
        <tbody>
          {charges.map((charge) => {
            const ecart = charge.reel - charge.estimated
            const isOver = ecart > 0

            return (
              <tr key={charge.categoryId} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface2)] transition-colors">
                <td className="px-4 py-3 text-sm text-[var(--text2)] font-medium">
                  {charge.categoryName}
                </td>
                <td className="px-4 py-3">
                  {editingId === charge.categoryId ? (
                    <input
                      className="w-20 md:w-24 px-2 py-1 rounded text-sm outline-none bg-[var(--surface2)] border border-[var(--accent)] text-[var(--text)] font-[var(--font-mono)]"
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
                      className="text-sm text-left text-[var(--text2)] font-[var(--font-mono)] hover:text-[var(--accent)]"
                      onClick={() => startEdit(charge.categoryId, charge.estimated)}
                    >
                      {formatAmount(charge.estimated)}
                    </button>
                  )}
                </td>
                <td className={cn(
                  "px-4 py-3 text-sm font-[var(--font-mono)]",
                  isOver ? "text-[var(--danger)]" : "text-[var(--text2)]"
                )} style={{ color: isOver ? 'var(--danger)' : 'var(--text2)' }}>
                  {formatAmount(charge.reel)}
                </td>
                <td className={cn(
                  "hidden md:table-cell px-4 py-3 text-sm font-[var(--font-mono)]",
                  isOver ? "text-[var(--danger)]" : "text-[var(--success)]"
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