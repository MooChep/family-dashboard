'use client'

import { type ReactElement } from 'react'
import { Card } from '@/components/ui/Card'
import { formatAmount } from '@/lib/formatters'

interface MonthSummaryProps {
  revenus: number
  depenses: number
  epargne: number
  reste: number
}

interface SummaryItemProps {
  label: string
  amount: number
  color: string
}

function SummaryItem({ label, amount, color }: SummaryItemProps): ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <span
        className="text-xs uppercase tracking-wider"
        style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
      >
        {label}
      </span>
      <span
        className="text-xl font-semibold"
        style={{ color, fontFamily: 'var(--font-mono)' }}
      >
        {formatAmount(amount)}
      </span>
    </div>
  )
}

export function MonthSummary({
  revenus,
  depenses,
  epargne,
  reste,
}: MonthSummaryProps): ReactElement {
  return (
    <Card>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        <SummaryItem
          label="Revenus"
          amount={revenus}
          color="var(--success)"
        />
        <SummaryItem
          label="Dépenses"
          amount={depenses}
          color="var(--danger)"
        />
        <SummaryItem
          label="Épargné"
          amount={epargne}
          color="var(--accent)"
        />
        <SummaryItem
          label="Reste"
          amount={reste}
          color={reste >= 0 ? 'var(--text)' : 'var(--danger)'}
        />
      </div>
    </Card>
  )
}