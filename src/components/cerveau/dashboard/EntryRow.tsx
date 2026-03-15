'use client'

import { type ReactElement, type ReactNode } from 'react'
import { type EntryType } from '@prisma/client'
import { TypeIcon } from '@/components/cerveau/ui/TypeIcon'

// ── Type ──

/** Entrée du dashboard — dates sérialisées en string par JSON.stringify. */
export interface DashboardEntry {
  id:         string
  type:       EntryType
  content:    string
  assignedTo: string
  isPinned:   boolean
  isUrgent:   boolean
  dueDate:    string | null
  startDate:  string | null
  updatedAt:  string
}

// ── Helpers ──

/** Retourne le prénom de l'assigné, ou '' si SHARED. */
export function formatAssignee(assignedTo: string): string {
  if (assignedTo === 'ILAN')    return 'Ilan'
  if (assignedTo === 'CAMILLE') return 'Camille'
  return ''
}

/** Retourne l'heure au format "10h" ou "10h30", ou '' si minuit exact ou null. */
export function formatTime(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const h = d.getHours()
  const m = d.getMinutes()
  if (h === 0 && m === 0) return ''
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

// ── Composant ──

interface EntryRowProps {
  entry:  DashboardEntry
  isLast: boolean
  /** Élément affiché à droite (badge, heure, etc.). */
  meta?:  ReactNode
}

/** Ligne générique d'une entrée dans le dashboard. */
export function EntryRow({ entry, isLast, meta }: EntryRowProps): ReactElement {
  const assignee = formatAssignee(entry.assignedTo)

  return (
    <div
      style={{
        padding:      '10px 14px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        display:      'flex',
        alignItems:   'center',
        gap:          '10px',
      }}
    >
      <TypeIcon type={entry.type} size={14} />

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
        {entry.isUrgent && (
          <span
            style={{
              color:       'var(--error)',
              marginRight: '4px',
              fontWeight:  700,
              fontFamily:  'var(--font-mono)',
            }}
          >
            !!{' '}
          </span>
        )}
        {entry.content.length > 55 ? entry.content.slice(0, 55) + '…' : entry.content}
      </span>

      <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
        {meta}
        {assignee && (
          <span
            style={{
              fontSize:   '11px',
              color:      'var(--muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {assignee}
          </span>
        )}
      </div>
    </div>
  )
}
