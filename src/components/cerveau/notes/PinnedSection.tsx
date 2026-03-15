'use client'

import { type ReactElement } from 'react'
import { NoteCard, type NoteEntry } from './NoteCard'

// ── Types ──

interface PinnedSectionProps {
  entries:   NoteEntry[]
  onArchive: (id: string) => void
  onPin:     (id: string, pinned: boolean) => void
  onDelete:  (id: string) => void
  onTap:     (entry: NoteEntry) => void
}

// ── Composant ──

/**
 * Section des notes épinglées réutilisable — affichée en tête de liste.
 * Retourne null si aucune note épinglée.
 */
export function PinnedSection({ entries, onArchive, onPin, onDelete, onTap }: PinnedSectionProps): ReactElement | null {
  if (entries.length === 0) return null

  return (
    <div style={{ marginBottom: '20px' }}>
      <div
        style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      '10px',
          color:         'var(--cerveau-note)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom:  '8px',
        }}
      >
        📌 Épinglées
      </div>
      <div
        style={{
          background:   'var(--surface)',
          border:       '1px solid var(--cerveau-note)',
          borderRadius: '12px',
          overflow:     'hidden',
        }}
      >
        {entries.map((entry, i) => (
          <NoteCard
            key={entry.id}
            entry={entry}
            isLast={i === entries.length - 1}
            onArchive={onArchive}
            onPin={onPin}
            onDelete={onDelete}
            onTap={onTap}
          />
        ))}
      </div>
    </div>
  )
}
