'use client'

import { Users } from 'lucide-react'
import type { LabeurTaskWithRelations } from '@/lib/labeur/types'

interface SharedTaskBadgeProps {
  task: LabeurTaskWithRelations
  currentUserId: string
}

/**
 * Badge affiché sur les tâches partagées.
 * Indique l'état de validation : en attente (0/2), premier validant (1/2), complet (2/2).
 */
export function SharedTaskBadge({ task, currentUserId }: SharedTaskBadgeProps) {
  if (!task.isShared) return null

  // Frontière d'instance : seules les completions après lastGeneratedAt comptent
  const instanceStart = task.recurrence?.lastGeneratedAt ?? task.createdAt
  const currentCompletions = task.completions.filter(
    (c) => new Date(c.completedAt) > new Date(instanceStart)
  )

  const count      = currentCompletions.length
  const iDoneIt    = currentCompletions.some((c) => c.userId === currentUserId)
  const otherDoneIt = currentCompletions.some((c) => c.userId !== currentUserId)

  const label = count === 0
    ? '0/2 validations'
    : count === 1
    ? iDoneIt
      ? 'En attente de l\'autre membre'
      : 'En attente de toi'
    : '✓ Complet'

  const color = count === 2
    ? 'var(--accent)'
    : otherDoneIt && !iDoneIt
    ? '#f59e0b'   // ambre — l'autre a validé, ton tour
    : 'var(--muted)'

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
      style={{
        backgroundColor: count === 2 ? 'var(--accent-dim)' : 'var(--surface2)',
        color,
      }}
    >
      <Users size={9} />
      {label}
    </span>
  )
}
