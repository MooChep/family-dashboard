'use client'

import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import {
  LineChart as ReLineChart,
  Line,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { formatAmount } from '@/lib/formatters'

const CHART_COLORS = ['--accent', '--warning', '--danger', '--success', '--muted', '--muted2']

function useCSSColors(): string[] {
  const [colors, setColors] = useState<string[]>([])
  useEffect(() => {
    const root = document.documentElement
    setColors(CHART_COLORS.map((v) => getComputedStyle(root).getPropertyValue(v).trim()))
  }, [])
  return colors
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
}

// ─── Courbe multi-lignes ──────────────────────────────────────────────────────

interface MultiLineProps {
  data: Record<string, number | string>[]
  lines: { key: string; label?: string }[]
  xKey?: string
  height?: number
  formatter?: (v: number | undefined, name: string) => [string, string]
}

export function MultiLineChart({
  data,
  lines,
  xKey = 'month',
  height = 260,
}: MultiLineProps): ReactElement {
  const colors = useCSSColors()

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey={xKey} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} />
        <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickFormatter={(v: number) => formatAmount(v)} width={80} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => [formatAmount(value as number), name as string]}
        />
        <Legend wrapperStyle={{ color: 'var(--text2)', fontSize: 12 }} />
        {lines.map((line, i) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            name={line.label ?? line.key}
            stroke={colors[i % colors.length] || 'var(--accent)'}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </ReLineChart>
    </ResponsiveContainer>
  )
}

// ─── Barres verticales ────────────────────────────────────────────────────────

interface BarChartProps {
  data: { label: string; value: number; color?: string }[]
  height?: number
  showValues?: boolean
  yAxisFormatter?: (v: number) => string
  tooltipFormatter?: (v: number | undefined) => [string, string]
}

export function BarChartVertical({
  data,
  height = 240,
  showValues = false,
  yAxisFormatter,
  tooltipFormatter,
}: BarChartProps): ReactElement {
  const rechartData = data.map((d) => ({ name: d.label, value: d.value, color: d.color }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ReBarChart data={rechartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--border)' }} />
        <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickFormatter={yAxisFormatter ?? ((v: number) => `${v}`)} width={48} />
        <Tooltip contentStyle={tooltipStyle} formatter={tooltipFormatter ?? ((v: number | undefined) => [v !== undefined ? String(v) : '—', ''])} />
        <Bar
          dataKey="value"
          radius={[4, 4, 0, 0]}
          label={showValues ? {
            position: 'inside',
            fill: '#fff',
            fontSize: 10,
            fontWeight: 700,
            formatter: (v: unknown) => {
              const n = v as number
              return n > 0 ? `${n}%` : ''
            },
          } : false}
        >
          {rechartData.map((entry, i) => (
            <Cell key={i} fill={entry.color ?? 'var(--accent)'} />
          ))}
        </Bar>
      </ReBarChart>
    </ResponsiveContainer>
  )
}

// ─── Barres horizontales ──────────────────────────────────────────────────────

export function BarChartHorizontal({ data }: { data: { label: string; value: number; color?: string }[] }): ReactElement {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex flex-col gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="text-right text-xs flex-shrink-0" style={{ width: 96, color: 'var(--text2)', fontFamily: 'var(--font-body)' }}>{d.label}</div>
          <div className="flex-1 h-6 rounded overflow-hidden" style={{ backgroundColor: 'var(--surface2)' }}>
            <div className="h-full rounded transition-all duration-500" style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color ?? 'var(--accent)' }} />
          </div>
          <div className="text-xs flex-shrink-0" style={{ width: 76, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{formatAmount(d.value)}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Carte stat ───────────────────────────────────────────────────────────────

export function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }): ReactElement {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl" style={{ backgroundColor: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <span className="text-xs" style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}>{label}</span>
      <span className="text-2xl font-semibold" style={{ color: color ?? 'var(--text)', fontFamily: 'var(--font-mono)' }}>{value}</span>
      {sub && <span className="text-xs" style={{ color: 'var(--muted2)' }}>{sub}</span>}
    </div>
  )
}

// ─── Carte section ────────────────────────────────────────────────────────────

export function SectionCard({ title, action, children, fullWidth = false }: { title: string; action?: ReactNode; children: ReactNode; fullWidth?: boolean }): ReactElement {
  return (
    <div className={`rounded-xl overflow-hidden ${fullWidth ? 'col-span-2' : ''}`} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}