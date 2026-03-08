'use client'
import { type ReactElement } from 'react'
import { Card } from '@/components/ui/Card'
import { formatAmount } from '@/lib/formatters'

interface MonthSummaryProps {
  revenus: number
  depenses: number
  reste: number
  allocationPercent: number   // total % affecté ce mois (0-100+)
}

interface SummaryItemProps {
  label: string
  amount: number
  color: string
  sub?: ReactElement
}

function SummaryItem({ label, amount, color, sub }: SummaryItemProps): ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
        {label}
      </span>
      <span className="text-xl font-semibold" style={{ color, fontFamily: 'var(--font-mono)' }}>
        {formatAmount(amount)}
      </span>
      {sub}
    </div>
  )
}

export function MonthSummary({ revenus, depenses, reste, allocationPercent }: MonthSummaryProps): ReactElement {
  const isFullyAllocated = Math.round(allocationPercent) === 100
  const hasAllocation    = allocationPercent > 0

  const allocationBadge = (
    <span
      className="text-xs px-1.5 py-0.5 rounded"
      style={{
        fontFamily: 'var(--font-mono)',
        backgroundColor: isFullyAllocated ? 'var(--success-dim, color-mix(in srgb, var(--success) 15%, transparent))' : 'color-mix(in srgb, var(--warning) 15%, transparent)',
        color: isFullyAllocated ? 'var(--success)' : 'var(--warning)',
      }}
    >
      {hasAllocation ? `${Math.round(allocationPercent)}% affecté` : 'non affecté'}
    </span>
  )

 return (
    <Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryItem label="Revenus" amount={revenus} color="var(--success)" />
        <div className="h-px w-full bg-[var(--border)] md:hidden" /> {/* Séparateur mobile */}
        <SummaryItem label="Dépenses" amount={depenses} color="var(--danger)" />
        <div className="h-px w-full bg-[var(--border)] md:hidden" />
        <SummaryItem
          label="Reste disponible"
          amount={reste}
          color={reste < 0 ? 'var(--danger)' : 'var(--text)'}
          sub={allocationBadge}
        />
      </div>
    </Card>
  )
}