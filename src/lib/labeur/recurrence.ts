import type { PrismaClient, LabeurTask, LabeurRecurrence } from '@prisma/client'
import { computeNextDueAt, getTodayInTZ } from './timezone'

// Type compatible avec un client Prisma complet ou un client de transaction
type PrismaTx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

// ─── Régénération déclenchée par complétion ───────────────────────────────────

/**
 * Régénère une tâche récurrente après sa complétion (les deux membres ont validé,
 * ou un seul membre pour une tâche non partagée).
 *
 * - Calcule la prochaine échéance depuis nextDueAt précédente (si future) ou aujourd'hui
 * - Incrémente streakCount si la tâche a été réalisée à temps
 * - Met à jour lastGeneratedAt → toute completion antérieure appartient à l'instance précédente
 * - Repasse la tâche en ACTIVE
 *
 * À appeler à l'intérieur d'une transaction Prisma, après que le statut
 * COMPLETED a déjà été posé.
 */
export async function regenerateTask(
  tx: PrismaTx,
  task: LabeurTask & { recurrence: LabeurRecurrence | null },
  tz: string
): Promise<void> {
  if (task.type !== 'RECURRING' || !task.recurrence) return

  const nextDueAt = computeNextDueAt(
    task.recurrence.frequency,
    task.recurrence.intervalDays,
    task.recurrence.nextDueAt,
    tz
  )

  // La tâche est "à temps" si elle est complétée avant ou le jour de son échéance
  const today = getTodayInTZ(tz)
  const completedOnTime = task.recurrence.nextDueAt >= today

  await tx.labeurRecurrence.update({
    where: { taskId: task.id },
    data: {
      nextDueAt,
      // lastGeneratedAt sert de frontière d'instance : toute completion avec
      // completedAt > lastGeneratedAt appartient à la nouvelle instance.
      lastGeneratedAt: new Date(),
    },
  })

  await tx.labeurTask.update({
    where: { id: task.id },
    data: {
      status: 'ACTIVE',
      // Incrémente le streak si réalisée à temps, le remet à 1 sinon
      // (on compte toujours l'occurrence qui vient de se compléter)
      streakCount: completedOnTime ? { increment: 1 } : 1,
    },
  })
}

// ─── Régénération déclenchée par le cron ─────────────────────────────────────

/**
 * Détermine si une récurrence doit être régénérée par le cron.
 *
 * Une instance est considérée "expirée" (cycle manqué) quand la prochaine
 * occurrence aurait dû commencer :
 *   now >= computeNextDueAt(nextDueAt) → le nouveau cycle est déjà dû
 *
 * Cela se produit quand une tâche récurrente n'a pas été réalisée pendant
 * toute la durée de son cycle (ex : tâche hebdo non faite depuis 7+ jours).
 */
export function isCycleExpired(recurrence: LabeurRecurrence, tz: string): boolean {
  const nextCycleStart = computeNextDueAt(
    recurrence.frequency,
    recurrence.intervalDays,
    recurrence.nextDueAt,
    tz
  )
  return new Date() >= nextCycleStart
}

/**
 * Régénère toutes les tâches récurrentes dont le cycle est expiré sans complétion.
 *
 * Appelé par le cron horaire (Session 6). Pour chaque tâche concernée :
 * - Si PARTIALLY_DONE : la première validation est perdue (§8.5) — on remet ACTIVE
 * - Le streak est remis à 0 (cycle manqué)
 * - L'entrée LabeurInflationState est supprimée (la nouvelle instance repart à zéro)
 * - lastGeneratedAt est mis à jour pour invalider les anciennes completions
 *
 * Retourne le nombre de tâches régénérées.
 */
export async function cronRegenerateExpiredTasks(
  tx: PrismaTx,
  tz: string
): Promise<number> {
  // Récupérer toutes les tâches récurrentes non complétées avec leur récurrence
  const candidates = await tx.labeurTask.findMany({
    where: {
      type: 'RECURRING',
      status: { in: ['ACTIVE', 'PARTIALLY_DONE'] },
    },
    include: { recurrence: true },
  })

  let regeneratedCount = 0

  for (const task of candidates) {
    if (!task.recurrence) continue
    if (!isCycleExpired(task.recurrence, tz)) continue

    const nextDueAt = computeNextDueAt(
      task.recurrence.frequency,
      task.recurrence.intervalDays,
      task.recurrence.nextDueAt,
      tz
    )

    // Avancer l'échéance et poser la nouvelle frontière d'instance
    await tx.labeurRecurrence.update({
      where: { taskId: task.id },
      data: {
        nextDueAt,
        lastGeneratedAt: new Date(),
      },
    })

    // Remettre la tâche en ACTIVE et réinitialiser le streak (cycle manqué)
    await tx.labeurTask.update({
      where: { id: task.id },
      data: {
        status: 'ACTIVE',
        streakCount: 0,
      },
    })

    // Supprimer l'inflation de l'ancienne instance — la nouvelle commence à daysOverdue = 0
    // Le cron recalculera l'inflation dès le prochain passage si la nouvelle instance est déjà en retard
    await tx.labeurInflationState.deleteMany({ where: { taskId: task.id } })

    regeneratedCount++
  }

  return regeneratedCount
}
