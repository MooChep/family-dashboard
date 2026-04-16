'use client'

import { useEffect, useState, type ReactElement } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatAmount } from '@/lib/formatters'

interface SavingsChartProps {
  projectsByMonth: Record<string, Record<string, number>>
}

const CHART_COLORS = ['--accent', '--success', '--warning', '--danger', '--muted2']

export function SavingsChart({ projectsByMonth }: SavingsChartProps): ReactElement {
  const [colors, setColors] = useState<string[]>([])

  useEffect(() => {
    const root = document.documentElement
    setColors(CHART_COLORS.map((v) => getComputedStyle(root).getPropertyValue(v).trim()))
  }, [])

  const months       = Object.keys(projectsByMonth).sort()
  const projectNames = Array.from(new Set(months.flatMap((m) => Object.keys(projectsByMonth[m] ?? {}))))
  const data         = months.map((month) => ({ month, ...(projectsByMonth[month] ?? {}) }))

  if (data.length === 0) {
    return (
      <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Pas encore de données</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
        Évolution des projets de butin
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} />
          <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickFormatter={(v: number) => `${v} €`} />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 12 }}
          formatter={(value, name) => [formatAmount(value as number), name as string]}          />
          <Legend wrapperStyle={{ color: 'var(--text2)', fontSize: 12 }} />
          {projectNames.map((name, i) => (
            <Line key={name} type="monotone" dataKey={name} name={name} stroke={colors[i % colors.length] || 'var(--accent)'} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}