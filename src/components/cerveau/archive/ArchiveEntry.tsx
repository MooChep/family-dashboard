'use client'

import { type ReactElement } from 'react'
import { type EntryType, type EntryStatus, type EntryAssignee } from '@prisma/client'
import { SwipeActions } from '@/components/cerveau/ui/SwipeActions'
import { TypeIcon } from '@/components/cerveau/ui/TypeIcon'

// ── Types ──

export interface ArchiveEntryData {
  id:         string
  type:       EntryType
  content:    string
  status:     EntryStatus
  assignedTo: EntryAssignee
  archivedAt: string | null
  updatedAt:  string
  startDate?: string | null
}

interface ArchiveEntryProps {
  entry:     ArchiveEntryData
  isLast:    boolean
  onRestore: (id: string) => void
  onDelete:  (id: string) => void
}

// ── Helpers ──

/** Icône et couleur selon le statut archivé. */
function statusMeta(status: EntryStatus): { icon: string; color: string } {
  switch (status) {
    case 'DONE':      return { icon: '✓', color: 'var(--success)' }
    case 'CANCELLED': return { icon: '✗', color: 'var(--muted)'   }
    case 'ARCHIVED':  return { icon: '⌛', color: 'var(--muted)'  }
    case 'PASSED':    return { icon: '⏰', color: 'var(--muted)'  }
    default:          return { icon: '·', color: 'var(--muted)'   }
  }
}

/** Retourne le label de l'assignation. */
function assigneeLabel(a: EntryAssignee): string {
  if (a === 'ILAN')    return 'Ilan'
  if (a === 'CAMILLE') return 'Camille'
  return 'Partagé'
}

// ── Composant ──

/** Ligne d'une entrée archivée avec swipe (restaurer / supprimer). */
export function ArchiveEntry({ entry, isLast, onRestore, onDelete }: ArchiveEntryProps): ReactElement {
  const status = statusMeta(entry.status)

  const leftBand = [
    {
      icon:     <span style={{ fontSize: '16px' }}>↩</span>,
      label:    'restaurer',
      color:    'var(--accent)',
      onAction: () => { onRestore(entry.id) },
    },
    {
      icon:     <span style={{ fontSize: '16px' }}>🗑</span>,
      label:    'suppr.',
      color:    'var(--error)',
      onAction: () => { onDelete(entry.id) },
    },
  ]

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid var(--border)' }}>
      <SwipeActions leftBand={leftBand}>
        <div
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '10px',
            padding:    '10px 14px',
            background: 'var(--surface)',
          }}
        >
          {/* ── Icône statut ── */}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize:   '12px',
              color:      status.color,
              flexShrink: 0,
              width:      '14px',
              textAlign:  'center',
            }}
          >
            {status.icon}
          </span>

          {/* ── TypeIcon ── */}
          <TypeIcon type={entry.type} size={13} />

          {/* ── Contenu ── */}
          <span
            style={{
              flex:         1,
              fontFamily:   'var(--font-body)',
              fontSize:     '13px',
              color:        'var(--muted)',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
              whiteSpace:   'nowrap',
            }}
          >
            {entry.content.length > 55 ? entry.content.slice(0, 55) + '…' : entry.content}
          </span>

          {/* ── Assigné ── */}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize:   '10px',
              color:      'var(--muted)',
              flexShrink: 0,
            }}
          >
            {assigneeLabel(entry.assignedTo)}
          </span>
        </div>
      </SwipeActions>
    </div>
  )
}
