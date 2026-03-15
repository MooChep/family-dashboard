'use client'

import { type ReactElement } from 'react'
import { ENTRY_TYPE_META } from '@/lib/cerveau/types'
import { type EntryType } from '@prisma/client'

interface TypeBadgeProps {
  type:      EntryType
  iconSize?: number
}

/** Badge pill avec icône Lucide + label du type. */
export function TypeBadge({ type, iconSize = 10 }: TypeBadgeProps): ReactElement {
  const meta = ENTRY_TYPE_META[type]
  const Icon = meta.icon
  return (
    <span
      style={{
        background:    `color-mix(in srgb, ${meta.colorVar} 15%, transparent)`,
        color:          meta.colorVar,
        border:        `1px solid color-mix(in srgb, ${meta.colorVar} 30%, transparent)`,
        borderRadius:  '6px',
        padding:       '2px 8px',
        fontFamily:    'var(--font-mono)',
        fontSize:      '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        display:       'inline-flex',
        alignItems:    'center',
        gap:           '4px',
      }}
    >
      <Icon size={iconSize} />
      {meta.label}
    </span>
  )
}
