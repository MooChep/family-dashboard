'use client'

import { useState, type ReactElement } from 'react'
import { SwipeActions } from '@/components/cerveau/ui/SwipeActions'
import { hapticSuccess } from '@/lib/haptics'

// ── Types ──

export interface ListEntry {
  id:             string
  content:        string
  assignedTo:     string
  updatedAt:      string
  uncheckedCount: number
  itemCount:      number
}

interface ListCardProps {
  entry:     ListEntry
  onArchive: (id: string) => void
  onDelete:  (id: string) => void
  onTap:     (entry: ListEntry) => void
  isLast:    boolean
}

// ── Composant ──

/** Carte Liste compacte avec compteur items restants. Swipe droite → archive, gauche → supprimer. */
export function ListCard({ entry, onArchive, onDelete, onTap, isLast }: ListCardProps): ReactElement {
  const [archiving, setArchiving] = useState(false)

  function handleArchive(): void {
    setArchiving(true)
    hapticSuccess()
    setTimeout(() => { onArchive(entry.id) }, 300)
  }

  const leftBand = [
    {
      icon:     <span style={{ fontSize: '16px' }}>🗑</span>,
      label:    'supprimer',
      color:    'var(--error)',
      onAction: () => { onDelete(entry.id) },
    },
  ]

  return (
    <div
      style={{
        opacity:      archiving ? 0 : 1,
        transform:    archiving ? 'translateY(20px)' : 'none',
        transition:   'opacity 300ms ease-out, transform 300ms ease-out',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
      }}
    >
      <SwipeActions onSwipeRight={handleArchive} leftBand={leftBand}>
        <div
          onClick={() => { onTap(entry) }}
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '10px',
            padding:    '12px 14px',
            background: 'var(--surface)',
            cursor:     'pointer',
          }}
        >
          {/* ── Icône ── */}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize:   '14px',
              color:      'var(--cerveau-list)',
              flexShrink: 0,
            }}
          >
            ☰
          </span>

          {/* ── Nom ── */}
          <span
            style={{
              flex:         1,
              fontFamily:   'var(--font-body)',
              fontSize:     '14px',
              color:        'var(--text)',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}
          >
            {entry.content}
          </span>

          {/* ── Compteur items non cochés ── */}
          <span
            style={{
              fontFamily:   'var(--font-mono)',
              fontSize:     '11px',
              color:        entry.uncheckedCount > 0 ? 'var(--cerveau-list)' : 'var(--muted)',
              background:   entry.uncheckedCount > 0
                ? 'color-mix(in srgb, var(--cerveau-list) 12%, transparent)'
                : 'var(--surface2)',
              padding:      '2px 7px',
              borderRadius: '10px',
              flexShrink:   0,
            }}
          >
            {entry.uncheckedCount}
          </span>
        </div>
      </SwipeActions>
    </div>
  )
}
