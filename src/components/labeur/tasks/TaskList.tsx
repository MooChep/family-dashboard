'use client'

import { Swords } from 'lucide-react'
import { TaskCard } from './TaskCard'
import type { LabeurTaskWithRelations } from '@/lib/labeur/types'

interface TaskListProps {
  tasks:         LabeurTaskWithRelations[]
  currentUserId: string
  onComplete:    (taskId: string) => void
}

/**
 * Liste de tâches organisée en 3 sections :
 *   1. En retard  — tâches avec daysOverdue > 0, triées par retard décroissant
 *   2. Aujourd'hui — tâches dues aujourd'hui (recurrence.nextDueAt = today)
 *   3. À venir   — tâches futures et ONESHOT sans retard
 */
export function TaskList({ tasks, currentUserId, onComplete }: TaskListProps) {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Partitionner les tâches selon leur état temporel
  const overdue: LabeurTaskWithRelations[]  = []
  const dueToday: LabeurTaskWithRelations[] = []
  const upcoming: LabeurTaskWithRelations[] = []

  for (const task of tasks) {
    const daysOver = task.inflationStates[0]?.daysOverdue ?? 0

    if (daysOver > 0) {
      overdue.push(task)
    } else if (task.recurrence) {
      const due = new Date(task.recurrence.nextDueAt)
      const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
      if (dueDay.getTime() === today.getTime()) {
        dueToday.push(task)
      } else {
        upcoming.push(task)
      }
    } else if (task.dueDate) {
      const due = new Date(task.dueDate)
      const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate())
      if (dueDay.getTime() <= today.getTime()) {
        dueToday.push(task)
      } else {
        upcoming.push(task)
      }
    } else {
      // Pas de récurrence, pas de date limite → à faire dès que possible
      dueToday.push(task)
    }
  }

  // Trier les tâches en retard par contribution inflation décroissante
  overdue.sort(
    (a, b) =>
      (b.inflationStates[0]?.inflationPercent ?? 0) -
      (a.inflationStates[0]?.inflationPercent ?? 0)
  )

  if (tasks.length === 0) {
    return (
      <div
        className="rounded-xl px-4 py-10 flex flex-col items-center gap-2"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <Swords size={28} style={{ color: 'var(--muted)' }} />
        <span className="text-sm" style={{ color: 'var(--muted)' }}>
          Aucune tâche active — le fief est paisible.
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {overdue.length > 0 && (
        <Section title="En retard" count={overdue.length} accent="var(--danger)">
          {overdue.map((t) => (
            <TaskCard key={t.id} task={t} currentUserId={currentUserId} onComplete={onComplete} />
          ))}
        </Section>
      )}

      {dueToday.length > 0 && (
        <Section title="Aujourd'hui" count={dueToday.length} accent="#f59e0b">
          {dueToday.map((t) => (
            <TaskCard key={t.id} task={t} currentUserId={currentUserId} onComplete={onComplete} />
          ))}
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title="À venir" count={upcoming.length} accent="var(--muted)">
          {upcoming.map((t) => (
            <TaskCard key={t.id} task={t} currentUserId={currentUserId} onComplete={onComplete} />
          ))}
        </Section>
      )}
    </div>
  )
}

// ── Section avec titre ────────────────────────────────────────────────────────
function Section({
  title, count, accent, children,
}: {
  title: string
  count: number
  accent: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accent }} />
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
          {title}
        </h2>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
          style={{ backgroundColor: 'var(--surface2)', color: 'var(--muted)' }}
        >
          {count}
        </span>
      </div>
      {children}
    </div>
  )
}
