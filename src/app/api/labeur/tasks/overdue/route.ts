import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLabeurSettings } from '@/lib/labeur/settings'
import { daysOverdue, isDueToday, getTomorrowInTZ } from '@/lib/labeur/timezone'
import { computeInflationContrib } from '@/lib/labeur/inflation'
import type { ApiResponse, LabeurOverdueTask } from '@/lib/labeur/types'

// ─── GET /api/labeur/tasks/overdue ────────────────────────────────────────────
// Retourne les tâches récurrentes en retard (nextDueAt < aujourd'hui, heure locale).
// Chaque tâche est enrichie avec daysOverdue et currentInflationPercent.
// Triées par contribution à l'inflation décroissante (les plus coûteuses d'abord).
export async function GET(): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json(
      { success: false, error: 'Non autorisé' } satisfies ApiResponse<never>,
      { status: 401 }
    )
  }

  try {
    const settings = await getLabeurSettings(prisma)

    // Toutes les tâches récurrentes non archivées avec leur récurrence
    const tasks = await prisma.labeurTask.findMany({
      where: {
        type:   'RECURRING',
        status: { in: ['ACTIVE', 'PARTIALLY_DONE'] },
        recurrence: {
          // Filtre grossier en base : nextDueAt avant demain minuit (heure locale)
          // Le calcul précis par fuseau horaire est affiné côté serveur ci-dessous
          nextDueAt: { lt: getTomorrowInTZ(settings.timezone) },
        },
      },
      include: {
        recurrence:     true,
        completions: {
          orderBy: { completedAt: 'desc' as const },
          include: { user: { select: { id: true, name: true } } },
        },
        inflationStates: true,
        createdBy:      { select: { id: true, name: true } },
      },
    })

    // Enrichir avec daysOverdue et inflation, filtrer celles réellement en retard
    const overdueTasks: LabeurOverdueTask[] = tasks
      .map((task) => {
        const days = task.recurrence
          ? daysOverdue(task.recurrence.nextDueAt, settings.timezone)
          : 0

        const inflationPercent = computeInflationContrib(
          task.ecuValue,
          days,
          task.inflationContribRate
        )

        return { ...task, daysOverdue: days, currentInflationPercent: inflationPercent }
      })
      // Garder les tâches en retard ET celles dues aujourd'hui
      .filter((t) =>
        t.daysOverdue > 0 ||
        (t.recurrence !== null && isDueToday(t.recurrence.nextDueAt, settings.timezone))
      )
      // Trier par contribution inflation décroissante (les plus urgentes en premier)
      .sort((a, b) => b.currentInflationPercent - a.currentInflationPercent)

    return Response.json(
      { success: true, data: overdueTasks } satisfies ApiResponse<typeof overdueTasks>
    )
  } catch (e) {
    console.error('[GET /api/labeur/tasks/overdue]', e)
    return Response.json(
      { success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
