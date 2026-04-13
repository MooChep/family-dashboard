import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLabeurSettings } from '@/lib/labeur/settings'
import {
  sumInflation,
  applyInflationCap,
  isCursed,
  isAboveAlert,
} from '@/lib/labeur/inflation'
import type { ApiResponse, InflationSummary, InflationTaskEntry } from '@/lib/labeur/types'

// ─── GET /api/labeur/inflation ────────────────────────────────────────────────
// Retourne l'état d'inflation global courant du Marché.
// Données utilisées par le bandeau du tableau de bord et les prix du Marché.
export async function GET(): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json(
      { success: false, error: 'Non autorisé' } satisfies ApiResponse<never>,
      { status: 401 }
    )
  }

  try {
    const [settings, inflationStates] = await Promise.all([
      getLabeurSettings(prisma),
      prisma.labeurInflationState.findMany({
        include: { task: { select: { id: true, title: true } } },
        orderBy: { inflationPercent: 'desc' },
      }),
    ])

    const rawTotal        = sumInflation(inflationStates)
    const globalPercent   = applyInflationCap(rawTotal, settings.inflationCap)
    const isAboveCurseFlag = isCursed(globalPercent, settings.curseSeuil)
    const isAboveAlertFlag = isAboveAlert(globalPercent, settings.inflationAlertThreshold)

    // Liste des tâches responsables, triées par contribution décroissante
    const tasks: InflationTaskEntry[] = inflationStates.map((s) => ({
      id:               s.task.id,
      title:            s.task.title,
      daysOverdue:      s.daysOverdue,
      inflationPercent: s.inflationPercent,
    }))

    const summary: InflationSummary = {
      globalPercent,
      isAboveCurse: isAboveCurseFlag,
      isAboveAlert: isAboveAlertFlag,
      tasks,
    }

    return Response.json({ success: true, data: summary } satisfies ApiResponse<typeof summary>)
  } catch (e) {
    console.error('[GET /api/labeur/inflation]', e)
    return Response.json(
      { success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
