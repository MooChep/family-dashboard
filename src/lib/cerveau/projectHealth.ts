import type { EntryWithRelations } from '@/lib/cerveau/types'

export type HealthStatus = 'green' | 'orange' | 'red'

export type ProjectHealthScore = {
  status:  HealthStatus
  reasons: string[]
}

export function computeProjectHealth(
  project: EntryWithRelations,
  now:     Date = new Date(),
): ProjectHealthScore {
  const reasons: string[] = []
  let score = 0

  // Règle 1 — Tâches enfants en retard
  const overdueChildren = project.children.filter(c =>
    c.status === 'ACTIVE' &&
    c.dueDate &&
    new Date(c.dueDate) < now,
  )
  if (overdueChildren.length > 0) {
    score += overdueChildren.length >= 3 ? 2 : 1
    reasons.push(`${overdueChildren.length} tâche${overdueChildren.length > 1 ? 's' : ''} en retard`)
  }

  // Règle 2 — Inactivité (updatedAt)
  const daysSinceUpdate = Math.floor(
    (now.getTime() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
  )
  if (daysSinceUpdate >= 14) {
    score += daysSinceUpdate >= 30 ? 2 : 1
    reasons.push(`Inactif depuis ${daysSinceUpdate} jours`)
  }

  // Règle 3 — Aucune tâche enfant (projet vide)
  if (project.children.length === 0) {
    score += 1
    reasons.push('Aucune tâche définie')
  }

  const status: HealthStatus =
    score === 0 ? 'green' :
    score === 1 ? 'orange' :
    'red'

  return { status, reasons }
}
