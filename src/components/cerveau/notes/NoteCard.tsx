'use client'

import { useState, type ReactElement } from 'react'
import { SwipeActions } from '@/components/cerveau/ui/SwipeActions'
import { hapticLight } from '@/lib/haptics'

// ── Types ──

export interface NoteEntry {
  id:         string
  content:    string
  assignedTo: string
  isPinned:   boolean
  updatedAt:  string
}

interface NoteCardProps {
  entry:     NoteEntry
  onArchive: (id: string) => void
  onPin:     (id: string, pinned: boolean) => void
  onDelete:  (id: string) => void
  onTap:     (entry: NoteEntry) => void
  isLast:    boolean
}

// ── Composant ──

/** Carte Note compacte avec swipe actions (droite → archiver, gauche → bande épingler/éditer/suppr). */
export function NoteCard({ entry, onArchive, onPin, onDelete, onTap, isLast }: NoteCardProps): ReactElement {
  const [archiving, setArchiving] = useState(false)

  function handleArchive(): void {
    setArchiving(true)
    hapticLight()
    setTimeout(() => { onArchive(entry.id) }, 300)
  }

  // ── Bande gauche : épingler / éditer / supprimer ──
  const leftBand = [
    {
      icon:     <span style={{ fontSize: '14px' }}>📌</span>,
      label:    entry.isPinned ? 'désépingler' : 'épingler',
      color:    'var(--cerveau-note)',
      onAction: () => { onPin(entry.id, !entry.isPinned) },
    },
    {
      icon:     <span style={{ fontSize: '14px' }}>✏️</span>,
      label:    'éditer',
      color:    'var(--muted)',
      onAction: () => { onTap(entry) },
    },
    {
      icon:     <span style={{ fontSize: '16px' }}>🗑</span>,
      label:    'suppr.',
      color:    'var(--error)',
      onAction: () => { onDelete(entry.id) },
    },
  ]

  return (
    <div
      style={{
        opacity:    archiving ? 0 : 1,
        transform:  archiving ? 'translateX(-20px)' : 'none',
        transition: 'opacity 300ms ease-out, transform 300ms ease-out',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
      }}
    >
      <SwipeActions onSwipeRight={handleArchive} leftBand={leftBand}>
        <div
          onClick={() => { onTap(entry) }}
          style={{
            display:    'flex',
            alignItems: 'flex-start',
            gap:        '10px',
            padding:    '11px 14px',
            background: 'var(--surface)',
            cursor:     'pointer',
          }}
        >
          {/* ── Icône type ── */}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize:   '13px',
              color:      entry.isPinned ? 'var(--cerveau-note)' : 'var(--muted)',
              flexShrink: 0,
              paddingTop: '1px',
            }}
          >
            ◆
          </span>

          {/* ── Contenu tronqué ── */}
          <span
            style={{
              flex:                1,
              fontFamily:          'var(--font-body)',
              fontSize:            '14px',
              color:               'var(--text)',
              display:             '-webkit-box',
              WebkitLineClamp:     2,
              WebkitBoxOrient:     'vertical',
              overflow:            'hidden',
              lineHeight:          '1.5',
            }}
          >
            {entry.content}
          </span>

          {/* ── Méta droite ── */}
          <div className="flex flex-col items-end gap-1" style={{ flexShrink: 0 }}>
            {entry.isPinned && (
              <span style={{ fontSize: '11px' }}>📌</span>
            )}
            {entry.assignedTo !== 'SHARED' && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--muted)' }}>
                {entry.assignedTo === 'ILAN' ? 'Ilan' : 'Camille'}
              </span>
            )}
          </div>
        </div>
      </SwipeActions>
    </div>
  )
}
