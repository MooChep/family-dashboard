'use client'

import { useEffect, useState, type ReactElement } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatAmount } from '@/lib/formatters'

interface ExpensesChartProps {
  expensesByMonth: Record<string, Record<string, number>>
}

export function ExpensesChart({ expensesByMonth }: ExpensesChartProps): ReactElement {
  const [accentColor, setAccentColor] = useState('')
  const [dangerColor, setDangerColor] = useState('')

  useEffect(() => {
    const root = document.documentElement
    setAccentColor(getComputedStyle(root).getPropertyValue('--accent').trim())
    setDangerColor(getComputedStyle(root).getPropertyValue('--danger').trim())
  }, [])

  const months = Object.keys(expensesByMonth).sort()
  const categories = Array.from(
    new Set(months.flatMap((m) => Object.keys(expensesByMonth[m] ?? {})))
  )

  // Agrège les dépenses par mois (total par mois pour le bar chart)
  const data = months.map((month) => {
    const monthData = expensesByMonth[month] ?? {}
    const total = Object.values(monthData).reduce((s, v) => s + v, 0)
    return { month, total, ...monthData }
  })

  if (data.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Pas encore de données
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <h3
        className="text-sm font-semibold mb-4"
        style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}
      >
        Dépenses par mois
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickFormatter={(v: number) => `${v} €`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface2)',
              border: '1px solid var(--border2)',
              borderRadius: '8px',
              color: 'var(--text)',
            }}
formatter={(value, name) => [formatAmount(value as number), name as string]}          />
          <Bar
            dataKey="total"
            fill={dangerColor || 'var(--danger)'}
            radius={[4, 4, 0, 0]}
            name="Total dépenses"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}