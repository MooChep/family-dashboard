'use client'

import { useState, type ReactElement } from 'react'
import { formatAmount } from '@/lib/formatters'

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
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        Aucune charge fixe configurée
      </p>
    )
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Catégorie', 'Estimé', 'Réel', 'Écart'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left"
                style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {charges.map((charge) => {
            const ecart = charge.reel - charge.estimated
            const isOver = ecart > 0

            return (
              <tr
                key={charge.categoryId}
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <td
                  className="px-4 py-3 text-sm"
                  style={{ color: 'var(--text2)' }}
                >
                  {charge.categoryName}
                </td>
                <td className="px-4 py-3">
                  {editingId === charge.categoryId ? (
                    <input
                      className="w-24 px-2 py-1 rounded text-sm outline-none"
                      style={{
                        backgroundColor: 'var(--surface2)',
                        border: '1px solid var(--accent)',
                        color: 'var(--text)',
                        fontFamily: 'var(--font-mono)',
                      }}
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
                      className="text-sm text-left"
                      style={{
                        color: 'var(--text2)',
                        fontFamily: 'var(--font-mono)',
                      }}
                      onClick={() => startEdit(charge.categoryId, charge.estimated)}
                      title="Cliquer pour modifier"
                    >
                      {formatAmount(charge.estimated)}
                    </button>
                  )}
                </td>
                <td
                  className="px-4 py-3 text-sm"
                  style={{
                    color: isOver ? 'var(--danger)' : 'var(--text2)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {formatAmount(charge.reel)}
                </td>
                <td
                  className="px-4 py-3 text-sm"
                  style={{
                    color: isOver ? 'var(--danger)' : 'var(--success)',
                    fontFamily: 'var(--font-mono)',
                  }}
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