import { type ReactElement } from 'react'
import { type EntryPriority } from '@prisma/client'

interface PriorityBadgeProps {
  priority: EntryPriority | null
  size?:    'sm' | 'md'
}

/** Badge de priorité réutilisable : !, !!, !!! */
export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps): ReactElement | null {
  if (!priority) return null

  const fontSize = size === 'md' ? '13px' : '11px'

  switch (priority) {
    case 'HIGH':
      return (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize,
            color:      'var(--cerveau-todo)',
            flexShrink: 0,
          }}
        >
          !!!
        </span>
      )
    case 'MEDIUM':
      return (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize,
            color:      'color-mix(in srgb, var(--cerveau-todo) 70%, transparent)',
            flexShrink: 0,
          }}
        >
          !!
        </span>
      )
    case 'LOW':
      return (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize,
            color:      'var(--muted)',
            flexShrink: 0,
          }}
        >
          !
        </span>
      )
  }
}
