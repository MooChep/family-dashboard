'use client'

import Link from 'next/link'
import { Clock, Users, AlertTriangle } from 'lucide-react'
import type { LabeurTaskWithRelations } from '@/lib/labeur/types'
import { useSession } from 'next-auth/react'
import { useState } from 'react'

interface TasksDueTodayProps {
  tasks: LabeurTaskWithRelations[]
  onComplete: (taskId: string) => Promise<void>
}

/**
 * Liste des tâches du jour (échues aujourd'hui ou en retard).
 * Triées par contribution à l'inflation décroissante.
 * Chaque carte affiche l'indicateur de retard et le bouton « J'ai fait ça ».
 */
export function TasksDueToday({ tasks, onComplete }: TasksDueTodayProps) {
  const { data: session } = useSession()
  const [completing, setCompleting] = useState<string | null>(null)

  if (tasks.length === 0) {
    return (
      <div
        className="rounded-xl px-4 py-6 flex flex-col items-center gap-2"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <span className="text-2xl">⚔</span>
        <span className="text-sm" style={{ color: 'var(--muted)' }}>
          Aucune tâche en attente — le fief est en ordre !
        </span>
      </div>
    )
  }

  async function handleComplete(taskId: string) {
    setCompleting(taskId)
    try {
      await onComplete(taskId)
    } finally {
      setCompleting(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => {
        const inflationState = task.inflationStates[0]
        const daysOverdue    = inflationState?.daysOverdue ?? 0
        const isOverdue      = daysOverdue > 0

        // Couleur selon le retard
        const overdueColor = daysOverdue >= 3
          ? 'var(--danger)'
          : daysOverdue >= 1
          ? '#f59e0b'
          : 'var(--muted)'

        // Vérifier si l'utilisateur courant a déjà validé cette instance
        const instanceStart = task.recurrence?.lastGeneratedAt ?? task.createdAt
        const alreadyDone = task.completions.some(
          (c) => c.userId === session?.user?.id && new Date(c.completedAt) > new Date(instanceStart)
        )

        return (
          <div
            key={task.id}
            className="rounded-xl p-4 flex items-center gap-3"
            style={{
              backgroundColor: 'var(--surface)',
              border: `1px solid ${isOverdue ? overdueColor + '40' : 'var(--border)'}`,
            }}
          >
            {/* Indicateur de retard */}
            <div className="shrink-0">
              {isOverdue ? (
                <AlertTriangle size={16} style={{ color: overdueColor }} />
              ) : (
                <Clock size={16} style={{ color: 'var(--muted)' }} />
              )}
            </div>

            {/* Infos tâche */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/labeur/taches/${task.id}`}
                  className="text-sm font-medium truncate hover:underline"
                  style={{ color: 'var(--text)' }}
                >
                  {task.title}
                </Link>
                {task.isShared && (
                  <span
                    className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
                  >
                    <Users size={9} />
                    Partagée
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs font-mono font-semibold" style={{ color: 'var(--accent)' }}>
                  {task.ecuValue} écu
                </span>
                {isOverdue && (
                  <span className="text-xs" style={{ color: overdueColor }}>
                    {daysOverdue}j de retard
                    {inflationState && (
                      <> · +{Math.round(inflationState.inflationPercent)} % inflation</>
                    )}
                  </span>
                )}
                {task.status === 'PARTIALLY_DONE' && (
                  <span className="text-xs" style={{ color: '#f59e0b' }}>
                    En attente du second membre
                  </span>
                )}
              </div>
            </div>

            {/* Bouton complétion */}
            {!alreadyDone && (
              <button
                onClick={() => handleComplete(task.id)}
                disabled={completing === task.id}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--bg)',
                  opacity: completing === task.id ? 0.7 : 1,
                }}
              >
                {completing === task.id ? '…' : 'J\'ai fait ça'}
              </button>
            )}
            {alreadyDone && (
              <span
                className="shrink-0 text-xs px-2 py-1 rounded-lg"
                style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
              >
                ✓ Fait
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
