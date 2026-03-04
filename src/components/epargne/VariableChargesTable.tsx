'use client'

import { useState, type ReactElement } from 'react'
import { formatAmount } from '@/lib/formatters'

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
      <p className="px-5 py-4 text-sm" style={{ color: 'var(--muted)' }}>
        Aucune categorie variable ce mois
      </p>
    )
  }

  return (
    <table className="w-full">
      <thead>
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
          {['Categorie', 'Estime', 'Reel', 'Ecart', 'Moy. 3 mois'].map((h) => (
            <th key={h} className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {charges.map((charge) => {
          const ecart = charge.reel - charge.estimated
          const isOver = ecart > 0
          const vsAvg = charge.reel - charge.avg3months
          const isOverAvg = vsAvg > 0
          return (
            <tr key={charge.categoryId} style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="px-4 py-3 text-sm" style={{ color: 'var(--text2)' }}>
                {charge.categoryName}
              </td>
              <td className="px-4 py-3">
                {editingId === charge.categoryId ? (
                  <input
                    className="w-24 px-2 py-1 rounded text-sm outline-none"
                    style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--accent)', color: 'var(--text)', fontFamily: 'var(--font-mono)' }}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveEdit(charge.categoryId)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void saveEdit(charge.categoryId); if (e.key === 'Escape') setEditingId(null) }}
                    autoFocus
                  />
                ) : (
                  <button className="text-sm text-left" style={{ color: charge.estimated > 0 ? 'var(--text2)' : 'var(--muted)', fontFamily: 'var(--font-mono)' }} onClick={() => startEdit(charge.categoryId, charge.estimated)} title="Cliquer pour modifier">
                    {charge.estimated > 0 ? formatAmount(charge.estimated) : '--'}
                  </button>
                )}
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: charge.estimated > 0 && isOver ? 'var(--danger)' : 'var(--text2)', fontFamily: 'var(--font-mono)' }}>
                {formatAmount(charge.reel)}
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: charge.estimated > 0 ? (isOver ? 'var(--danger)' : 'var(--success)') : 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                {charge.estimated > 0 ? (isOver ? '+' : '') + formatAmount(ecart) : '--'}
              </td>
              <td className="px-4 py-3" style={{ fontFamily: 'var(--font-mono)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: 'var(--text2)' }}>
                    {charge.avg3months > 0 ? formatAmount(charge.avg3months) : '--'}
                  </span>
                  {charge.avg3months > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: isOverAvg ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', color: isOverAvg ? 'var(--danger)' : 'var(--success)' }}>
                      {isOverAvg ? '+' : ''}{formatAmount(vsAvg)}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}