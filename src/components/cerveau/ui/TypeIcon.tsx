'use client'

import { type ReactElement } from 'react'
import { ENTRY_TYPE_META } from '@/lib/cerveau/types'
import { type EntryType } from '@prisma/client'

interface TypeIconProps {
  type:  EntryType
  size?: number
}

/** Icône Lucide colorée du type d'entrée. */
export function TypeIcon({ type, size = 14 }: TypeIconProps): ReactElement {
  const meta = ENTRY_TYPE_META[type]
  const Icon = meta.icon
  return <Icon size={size} style={{ color: meta.colorVar, flexShrink: 0 }} />
}
