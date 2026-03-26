'use client'

import type { EntryWithRelations } from '@/lib/cerveau/types'

interface StatsStripProps {
  entries: EntryWithRelations[]
}

export function StatsStrip({ entries }: StatsStripProps) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const total = entries.length
  const todos = entries.filter(e => e.type === 'TODO').length
  const highPriority = entries.filter(e => e.priority === 'HIGH').length
  const overdue = entries.filter(e => !!e.dueDate && new Date(e.dueDate) < today).length

  const stats = [
    { label: 'Total',     value: total,       isError: false },
    { label: 'Todos',     value: todos,        isError: false },
    { label: 'Priorité',  value: highPriority, isError: false },
    { label: 'En retard', value: overdue,      isError: overdue > 0 },
  ]

  return (
    <div className="rounded-xl px-4 py-3 grid grid-cols-4 gap-2" style={{ backgroundColor: 'var(--surface2)' }}>
      {stats.map(({ label, value, isError }) => (
        <div key={label} className="text-center">
          <div
            className="font-display text-2xl"
            style={{ color: isError ? 'var(--danger)' : 'var(--text)' }}
          >
            {value}
          </div>
          <div
            className="font-mono text-[10px] uppercase tracking-widest mt-0.5 leading-tight"
            style={{ color: 'var(--muted)' }}
          >
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}
