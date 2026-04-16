'use client'

import { type ReactElement } from 'react'
import { formatAmount } from '@/lib/formatters'

interface AnalyticsSummaryProps {
  expensesByMonth: Record<string, Record<string, number>>
  period: number
}

export function AnalyticsSummary({
  expensesByMonth,
  period,
}: AnalyticsSummaryProps): ReactElement {
  const months = Object.keys(expensesByMonth).sort()
  const categories = Array.from(
    new Set(months.flatMap((m) => Object.keys(expensesByMonth[m] ?? {})))
  ).sort()

  if (months.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        Pas encore de données pour cette période
      </p>
    )
  }

  return (
    <div
      className="rounded-xl overflow-x-auto"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <table className="w-full min-w-max">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th
              className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left"
              style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
            >
              Catégorie
            </th>
            {months.map((m) => (
              <th
                key={m}
                className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-right"
                style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
              >
                {m}
              </th>
            ))}
            <th
              className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-right"
              style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
            >
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat, i) => {
            const total = months.reduce(
              (sum, m) => sum + (expensesByMonth[m]?.[cat] ?? 0),
              0,
            )
            return (
              <tr
                key={cat}
                style={{
                  borderBottom: i < categories.length - 1
                    ? '1px solid var(--border)'
                    : 'none',
                }}
              >
                <td
                  className="px-4 py-3 text-sm"
                  style={{ color: 'var(--text2)' }}
                >
                  {cat}
                </td>
                {months.map((m) => (
                  <td
                    key={m}
                    className="px-4 py-3 text-sm text-right"
                    style={{
                      color: 'var(--text2)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {expensesByMonth[m]?.[cat]
                      ? formatAmount(expensesByMonth[m][cat])
                      : '—'}
                  </td>
                ))}
                <td
                  className="px-4 py-3 text-sm text-right font-semibold"
                  style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}
                >
                  {formatAmount(total)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}