'use client'

import { type ReactElement } from 'react'

// ── Types ──

interface Stats {
  total:       number
  todos:       number
  reminders:   number
  discussions: number
}

interface DashboardStatsProps {
  stats: Stats
}

// ── Composant ──

/** Bandeau de 4 compteurs : actifs, todos, rappels, discussions. */
export function DashboardStats({ stats }: DashboardStatsProps): ReactElement {
  const items = [
    { value: stats.total,       label: 'actifs'  },
    { value: stats.todos,       label: 'todos'   },
    { value: stats.reminders,   label: 'rappels' },
    { value: stats.discussions, label: 'discus'  },
  ]

  return (
    <div className="grid grid-cols-4 gap-2" style={{ marginBottom: '20px' }}>
      {items.map(({ value, label }) => (
        <div
          key={label}
          style={{
            background:   'var(--surface)',
            border:       '1px solid var(--border)',
            borderRadius: '10px',
            padding:      '10px 8px',
            textAlign:    'center',
          }}
        >
          <div
            style={{
              fontSize:   '20px',
              fontWeight: 700,
              color:      'var(--text)',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1,
            }}
          >
            {value}
          </div>
          <div
            style={{
              fontSize:      '9px',
              color:         'var(--muted)',
              fontFamily:    'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginTop:     '4px',
            }}
          >
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}
