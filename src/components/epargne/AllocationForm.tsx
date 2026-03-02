'use client'

import { useState, useEffect, type ReactElement } from 'react'
import { Button } from '@/components/ui/Button'
import { formatAmount, formatPercent } from '@/lib/formatters'
import { type SavingsProject } from '@prisma/client'

interface AllocationRow {
  projectId: string
  projectName: string
  currentAmount: number
  percentage: number
  amount: number
}

interface AllocationFormProps {
  projects: SavingsProject[]
  reste: number
  initialAllocations: { projectId: string; percentage: number; amount: number }[]
  onSave: (allocations: { projectId: string; percentage: number }[]) => Promise<void>
}

export function AllocationForm({
  projects,
  reste,
  initialAllocations,
  onSave,
}: AllocationFormProps): ReactElement {
  const [rows, setRows] = useState<AllocationRow[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const initial = projects.map((p) => {
      const existing = initialAllocations.find((a) => a.projectId === p.id)
      const percentage = existing?.percentage ?? 0
      return {
        projectId: p.id,
        projectName: p.name,
        currentAmount: p.currentAmount,
        percentage,
        amount: reste * (percentage / 100),
      }
    })
    setRows(initial)
  }, [projects, initialAllocations, reste])

  function updatePercentage(projectId: string, value: string): void {
    const parsed = parseFloat(value) || 0
    setRows((prev) =>
      prev.map((row) =>
        row.projectId === projectId
          ? { ...row, percentage: parsed, amount: reste * (parsed / 100) }
          : row,
      ),
    )
  }

  const totalPercent = rows.reduce((sum, r) => sum + r.percentage, 0)
  const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0)

  async function handleSave(): Promise<void> {
    setIsLoading(true)
    try {
      await onSave(
        rows.map((r) => ({ projectId: r.projectId, percentage: r.percentage })),
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
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
              {['Projet', 'Solde total', 'Ajout ce mois', '%'].map((h) => (
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
            {rows.map((row) => (
              <tr
                key={row.projectId}
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                {/* Projet */}
                <td
                  className="px-4 py-3 text-sm"
                  style={{ color: 'var(--text2)' }}
                >
                  {row.projectName}
                </td>

                {/* Solde total actuel */}
                <td
                  className="px-4 py-3 text-sm"
                  style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}
                >
                  {formatAmount(row.currentAmount)}
                </td>

                {/* Ajout ce mois — calculé en temps réel */}
                <td
                  className="px-4 py-3 text-sm"
                  style={{
                    color: row.amount > 0 ? 'var(--success)' : 'var(--muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {row.amount > 0 ? '+' : ''}{formatAmount(row.amount)}
                </td>

                {/* % éditable */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={row.percentage}
                      onChange={(e) =>
                        updatePercentage(row.projectId, e.target.value)
                      }
                      className="w-20 px-2 py-1 rounded text-sm outline-none"
                      style={{
                        backgroundColor: 'var(--surface2)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                    <span
                      className="text-xs"
                      style={{ color: 'var(--muted)' }}
                    >
                      %
                    </span>
                  </div>
                </td>
              </tr>
            ))}

            {/* Ligne total */}
            <tr style={{ backgroundColor: 'var(--surface2)' }}>
              <td
                className="px-4 py-3 text-xs font-medium uppercase"
                style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
              >
                Total
              </td>
              <td />
              <td
                className="px-4 py-3 text-sm font-semibold"
                style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}
              >
                {formatAmount(totalAmount)}
              </td>
              <td
                className="px-4 py-3 text-sm font-semibold"
                style={{
                  color: totalPercent > 100 ? 'var(--danger)' : 'var(--text)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {formatPercent(totalPercent)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-6 pb-4">
        <span className="text-sm" style={{ color: 'var(--muted)' }}>
          Reste après épargne :{' '}
          <span
            style={{
              color: reste - totalAmount < 0 ? 'var(--danger)' : 'var(--text)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {formatAmount(reste - totalAmount)}
          </span>
        </span>
        <Button
          variant="primary"
          size="md"
          isLoading={isLoading}
          onClick={handleSave}
          disabled={totalPercent > 100}
        >
          Sauvegarder
        </Button>
      </div>
    </div>
  )
}