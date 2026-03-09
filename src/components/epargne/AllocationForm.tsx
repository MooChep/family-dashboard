'use client'

import { useState, useEffect, type ReactElement } from 'react'
import { Button } from '@/components/ui/Button'
import { formatAmount, formatPercent } from '@/lib/formatters'
import { type SavingsProject } from '@prisma/client'
import { cn } from '@/lib/utils'

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
  totalFortune: number
  initialAllocations: { projectId: string; percentage: number; amount: number }[]
  onSave: (allocations: { projectId: string; percentage: number }[]) => Promise<void>
}

export function AllocationForm({
  projects,
  reste,
  totalFortune,
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
  const totalAmount  = rows.reduce((sum, r) => sum + r.amount, 0)

  async function handleSave(): Promise<void> {
    setIsLoading(true)
    try {
      await onSave(rows.map((r) => ({ projectId: r.projectId, percentage: r.percentage })))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl overflow-hidden bg-(--surface)] border border-(--border)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-(--border)]">
              {['Projet', 'Solde total', 'Ajout', '%'].map((h) => (
                <th 
                  key={h} 
                  className={cn(
                    "px-4 py-3 text-xs font-medium uppercase tracking-wider text-left text-(--muted)] font-(--font-mono)]",
                    h === 'Solde total' && "hidden md:table-cell" // Masquage responsive de l'entête
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.projectId} className="border-b border-(--border)] last:border-0">
                <td className="px-4 py-3 text-sm text-(--text2)] font-medium">
                  {row.projectName}
                </td>
                {/* Colonne masquée sur mobile */}
                <td className="hidden md:table-cell px-4 py-3 text-sm text-(--text)] font-(--font-mono)]">
                  {formatAmount(row.currentAmount)}
                </td>
                <td 
                  className="px-4 py-3 text-sm font-(--font-mono)]"
                  style={{ color: row.amount > 0 ? 'var(--success)' : 'var(--muted)' }}
                >
                  {row.amount > 0 ? '+' : ''}{formatAmount(row.amount)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <input
                      type="number" min="0" max="100" step="0.1"
                      value={row.percentage}
                      onChange={(e) => updatePercentage(row.projectId, e.target.value)}
                      className="w-14 md:w-20 px-2 py-1 rounded text-sm outline-none bg-(--surface2)] border border-(--border)] text-(--text)] font-(--font-mono)] focus:border-(--accent)]"
                    />
                    <span className="hidden xs:inline text-xs text-(--muted)]">%</span>
                  </div>
                </td>
              </tr>
            ))}

            <tr className="bg-(--surface2)]">
              <td className="px-4 py-3 text-xs font-medium uppercase text-(--muted)] font-(--font-mono)]">Total</td>
              <td className="hidden md:table-cell" />
              <td className="px-4 py-3 text-sm font-semibold text-(--text)] font-(--font-mono)]">
                {formatAmount(totalAmount)}
              </td>
              <td className={cn(
                "px-4 py-3 text-sm font-semibold font-(--font-mono)]",
                totalPercent > 100 ? 'text-(--danger)]' : 'text-(--text)]'
              )}>
                {formatPercent(totalPercent)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mx-0 px-5 py-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-(--surface2)] border border-(--border)]">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium uppercase tracking-wider text-(--muted)] font-(--font-mono)]">
            Fortune totale
          </span>
          <span className="text-xs text-(--muted2)]">
            Somme de tous les projets actifs
          </span>
        </div>
        <span className="text-2xl font-semibold text-(--accent)] font-(--font-mono)]">
          {formatAmount(totalFortune)}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 px-1 pb-2">
        <span className="text-sm text-(--muted)]">
          Reste après épargne :{' '}
          <span className={cn(
            "font-(--font-mono)]",
            reste - totalAmount < 0 ? 'text-(--danger)]' : 'text-(--text)]'
          )}>
            {formatAmount(reste - totalAmount)}
          </span>
        </span>
        <Button variant="primary" size="md" isLoading={isLoading} onClick={handleSave} disabled={totalPercent > 100} className="w-full sm:w-auto">
          Sauvegarder
        </Button>
      </div>
    </div>
  )
}