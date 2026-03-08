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
      <p className="px-5 py-4 text-sm text-[var(--muted)]">
        Aucune catégorie variable ce mois
      </p>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden bg-[var(--surface)] border border-[var(--border)]">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left text-[var(--muted)] font-[var(--font-mono)]">Catégorie</th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left text-[var(--muted)] font-[var(--font-mono)]">Estimé</th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left text-[var(--muted)] font-[var(--font-mono)]">Réel</th>
            <th className="hidden md:table-cell px-4 py-3 text-xs font-medium uppercase tracking-wider text-left text-[var(--muted)] font-[var(--font-mono)]">Écart</th>
            <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left text-[var(--muted)] font-[var(--font-mono)]">Moy. 3 mois</th>
          </tr>
        </thead>
        <tbody>
          {charges.map((charge) => {
            const ecart = charge.reel - charge.estimated
            const isOver = ecart > 0
            const vsAvg = charge.reel - charge.avg3months
            const isOverAvg = vsAvg > 0

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
                      onKeyDown={(e) => { if (e.key === 'Enter') void saveEdit(charge.categoryId); if (e.key === 'Escape') setEditingId(null) }}
                      autoFocus
                    />
                  ) : (
                    <button className="text-sm text-left font-[var(--font-mono)] text-[var(--text2)] hover:text-[var(--accent)]" onClick={() => startEdit(charge.categoryId, charge.estimated)}>
                      {charge.estimated > 0 ? formatAmount(charge.estimated) : '--'}
                    </button>
                  )}
                </td>
                <td className={cn("px-4 py-3 text-sm font-[var(--font-mono)]")} style={{ color: charge.estimated > 0 && isOver ? 'var(--danger)' : 'var(--text2)' }}>
                  {formatAmount(charge.reel)}
                </td>
                <td className={cn("hidden md:table-cell px-4 py-3 text-sm font-[var(--font-mono)]")} style={{ color: charge.estimated > 0 ? (isOver ? 'var(--danger)' : 'var(--success)') : 'var(--muted)' }}>
                  {charge.estimated > 0 ? (isOver ? '+' : '') + formatAmount(ecart) : '--'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-[var(--font-mono)] text-[var(--text2)]">
                      {charge.avg3months > 0 ? formatAmount(charge.avg3months) : '--'}
                    </span>
                    {charge.avg3months > 0 && (
                      <span 
                        className="text-[10px] px-1.5 py-0.5 rounded font-[var(--font-mono)]"
                        style={{ 
                          backgroundColor: isOverAvg ? 'color-mix(in srgb, var(--danger) 15%, transparent)' : 'color-mix(in srgb, var(--success) 15%, transparent)',
                          color: isOverAvg ? 'var(--danger)' : 'var(--success)' 
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