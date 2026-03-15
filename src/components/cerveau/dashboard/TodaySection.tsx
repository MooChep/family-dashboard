'use client'

import { type ReactElement } from 'react'
import { EntryRow, formatTime, type DashboardEntry } from './EntryRow'
import { DashboardSection } from './DashboardSection'

// ── Types ──

interface TodaySectionProps {
  entries: DashboardEntry[]
}

// ── Composant ──

/**
 * Section AUJOURD'HUI — absente si vide.
 * Toutes les entrées affichées, sans lien "voir tout".
 */
export function TodaySection({ entries }: TodaySectionProps): ReactElement | null {
  if (entries.length === 0) return null

  return (
    <DashboardSection title="Aujourd'hui" count={entries.length}>
      {entries.map((entry, i) => {
        const dateStr = entry.startDate ?? entry.dueDate
        const time    = formatTime(dateStr)

        return (
          <EntryRow
            key={entry.id}
            entry={entry}
            isLast={i === entries.length - 1}
            meta={
              time
                ? (
                  <span
                    style={{
                      fontSize:   '11px',
                      color:      'var(--muted)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {time}
                  </span>
                )
                : undefined
            }
          />
        )
      })}
    </DashboardSection>
  )
}
