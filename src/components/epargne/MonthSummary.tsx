'use client'
import { type ReactElement } from 'react'
import { Card } from '@/components/ui/Card'
import { formatAmount } from '@/lib/formatters'

interface MonthSummaryProps {
  revenus: number
  depenses: number
  reste: number
  allocationPercent: number
}

interface SummaryItemProps {
  label: string
  value: string
  color: string
  sub?: ReactElement
}

function SummaryItem({ label, value, color, sub }: SummaryItemProps): ReactElement {
  return (
    <div className="flex flex-col gap-1 items-center">
      <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
        {label}
      </span>
      <span className="text-xl font-semibold" style={{ color, fontFamily: 'var(--font-mono)' }}>
        {value}
      </span>
      {sub}
    </div>
  )
}

export function MonthSummary({ revenus, depenses, reste, allocationPercent }: MonthSummaryProps): ReactElement {
  const isFullyAllocated = Math.round(allocationPercent) === 100
  const hasAllocation    = allocationPercent > 0

  // Taux d'épargne = (revenus - dépenses) / revenus * 100
  // = ce qui n'est pas dépensé, qu'il soit affecté ou non
  const tauxEpargne = revenus > 0 ? ((revenus - depenses) / revenus) * 100 : 0
  const tauxEpargneColor = tauxEpargne >= 20
    ? 'var(--success)'
    : tauxEpargne >= 10
    ? 'var(--warning)'
    : 'var(--danger)'

  const allocationBadge = (
    <span
      className="text-xs px-1.5 py-0.5 rounded"
      style={{
        fontFamily: 'var(--font-mono)',
        backgroundColor: isFullyAllocated
          ? 'color-mix(in srgb, var(--success) 15%, transparent)'
          : 'color-mix(in srgb, var(--warning) 15%, transparent)',
        color: isFullyAllocated ? 'var(--success)' : 'var(--warning)',
      }}
    >
      {hasAllocation ? `${Math.round(allocationPercent)}% affecté` : 'non affecté'}
    </span>
  )

  return (
    <Card>
      <div className="flex flex-wrap justify-around gap-6">
        <SummaryItem
          label="Revenus"
          value={formatAmount(revenus)}
          color="var(--success)"
        />
        <SummaryItem
          label="Dépenses"
          value={formatAmount(depenses)}
          color="var(--danger)"
        />
        <SummaryItem
          label="Reste disponible"
          value={formatAmount(reste)}
          color={reste < 0 ? 'var(--danger)' : 'var(--text)'}
          sub={allocationBadge}
        />
        <SummaryItem
          label="Taux d'épargne"
          value={revenus > 0 ? `${Math.round(tauxEpargne)} %` : '—'}
          color={tauxEpargneColor}
        />
      </div>
    </Card>
  )
}