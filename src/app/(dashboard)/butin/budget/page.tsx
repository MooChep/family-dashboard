'use client'

import { useState, type ReactElement } from 'react'
import { ButinLayout } from '@/components/butin/ButinLayout'
import { BudgetMonthView } from '@/components/butin/budget/BudgetMonthView'

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getMonthOptions(): { value: string; label: string }[] {
  const now    = new Date()
  const start  = new Date(Date.UTC(2024, 9, 1))
  const end    = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 12, 1))
  const options: { value: string; label: string }[] = []
  let cursor = new Date(end)
  while (cursor >= start) {
    const value = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`
    const label = `${MONTHS_FR[cursor.getUTCMonth()]} ${cursor.getUTCFullYear()}`
    options.push({ value, label })
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - 1, 1))
  }
  return options
}

export default function BudgetPage(): ReactElement {
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth())
  const monthOptions = getMonthOptions()

  return (
    <ButinLayout>
      <div className="flex flex-col gap-6 pt-16 md:pt-0">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1
              className="text-xl font-semibold"
              style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}
            >
              Budgétisation
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Planifiez vos dépenses et revenus prévus pour chaque mois
            </p>
          </div>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <BudgetMonthView month={selectedMonth} />
      </div>
    </ButinLayout>
  )
}