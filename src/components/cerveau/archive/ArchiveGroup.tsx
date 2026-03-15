'use client'

import { type ReactElement } from 'react'
import { ArchiveEntry, type ArchiveEntryData } from './ArchiveEntry'

// ── Types ──

interface ArchiveGroupProps {
  date:      string
  entries:   ArchiveEntryData[]
  onRestore: (id: string) => void
  onDelete:  (id: string) => void
}

// ── Composant ──

/** Groupe d'entrées archivées par date avec header "mar. 8 avril 2026". */
export function ArchiveGroup({ date, entries, onRestore, onDelete }: ArchiveGroupProps): ReactElement {
  return (
    <div style={{ marginBottom: '16px' }}>
      {/* ── Header de date ── */}
      <div
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      '11px',
          color:         'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding:       '4px 0 6px',
        }}
      >
        {date}
      </div>

      {/* ── Entrées du groupe ── */}
      <div
        style={{
          background:   'var(--surface)',
          border:       '1px solid var(--border)',
          borderRadius: '12px',
          overflow:     'hidden',
        }}
      >
        {entries.map((entry, i) => (
          <ArchiveEntry
            key={entry.id}
            entry={entry}
            isLast={i === entries.length - 1}
            onRestore={onRestore}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}
