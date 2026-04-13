'use client'

import Link from 'next/link'
import { Clock, RefreshCw, CalendarClock } from 'lucide-react'
import { SharedTaskBadge } from './SharedTaskBadge'
import { CompletionButton } from './CompletionButton'
import type { LabeurTaskWithRelations } from '@/lib/labeur/types'

interface TaskCardProps {
  task:          LabeurTaskWithRelations
  currentUserId: string
  onComplete:    (taskId: string) => void
}

// Couleur de bordure selon le retard
function overdueColor(daysOverdue: number): string {
  if (daysOverdue >= 3) return 'var(--danger)'
  if (daysOverdue >= 1) return '#f59e0b'
  return 'var(--border)'
}

// Label fréquence lisible
function frequencyLabel(task: LabeurTaskWithRelations): string {
  if (!task.recurrence) return ''
  const f = task.recurrence.frequency
  if (f === 'DAILY')   return 'Quotidienne'
  if (f === 'WEEKLY')  return 'Hebdomadaire'
  if (f === 'MONTHLY') return 'Mensuelle'
  return `Tous les ${task.recurrence.intervalDays ?? '?'} jours`
}

/**
 * Carte d'une tâche Labeur.
 * - Bordure ambre si 1–2j retard, rouge si 3j+
 * - Badge partagée + état validation
 * - Fréquence pour les récurrentes, date limite pour les ponctuelles
 * - Bouton « J'ai fait ça » (désactivé si déjà validé)
 */
export function TaskCard({ task, currentUserId, onComplete }: TaskCardProps) {
  const inflationState = task.inflationStates[0]
  const daysOverdue    = inflationState?.daysOverdue ?? 0

  // Déterminer si cet utilisateur a déjà validé l'instance courante
  const instanceStart = task.recurrence?.lastGeneratedAt ?? task.createdAt
  const alreadyDone   = task.completions.some(
    (c) => c.userId === currentUserId && new Date(c.completedAt) > new Date(instanceStart)
  )

  // Une tâche partagée déjà complétée (status=COMPLETED) ne doit plus afficher le bouton
  const isFullyComplete = task.status === 'COMPLETED' && task.type === 'ONESHOT'

  const borderCol = overdueColor(daysOverdue)

  return (
    <div
      className="rounded-xl p-4 flex gap-3"
      style={{
        backgroundColor: 'var(--surface)',
        border:          `1px solid ${borderCol}`,
      }}
    >
      {/* Icône type */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: 'var(--surface2)' }}
      >
        {task.type === 'RECURRING'
          ? <RefreshCw    size={16} style={{ color: 'var(--accent)' }} />
          : <CalendarClock size={16} style={{ color: 'var(--muted)' }} />
        }
      </div>

      {/* Corps */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/labeur/taches/${task.id}`}
            className="text-sm font-semibold hover:underline leading-tight"
            style={{ color: 'var(--text)' }}
          >
            {task.title}
          </Link>

          {/* Valeur écu */}
          <span
            className="text-sm font-mono font-bold shrink-0"
            style={{ color: 'var(--accent)' }}
          >
            {task.ecuValue} écu
          </span>
        </div>

        {/* Métadonnées */}
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {/* Fréquence / date limite */}
          {task.type === 'RECURRING' && task.recurrence && (
            <span
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
            >
              <RefreshCw size={8} />
              {frequencyLabel(task)}
            </span>
          )}
          {task.type === 'ONESHOT' && task.dueDate && (
            <span
              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
            >
              <Clock size={8} />
              {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
          )}

          {/* Badge partagée */}
          {task.isShared && (
            <SharedTaskBadge task={task} currentUserId={currentUserId} />
          )}

          {/* Retard */}
          {daysOverdue > 0 && (
            <span
              className="text-[10px] font-semibold"
              style={{ color: borderCol }}
            >
              {daysOverdue}j de retard
              {inflationState && (
                <> · +{Math.round(inflationState.inflationPercent)} %</>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Bouton complétion */}
      <div className="shrink-0 self-center">
        {!isFullyComplete && (
          <CompletionButton
            taskId={task.id}
            disabled={alreadyDone}
            onSuccess={onComplete}
          />
        )}
      </div>
    </div>
  )
}
