import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLabeurSettings } from '@/lib/labeur/settings'
import { computeNextDueAt } from '@/lib/labeur/timezone'
import type { ApiResponse, CreateTaskPayload } from '@/lib/labeur/types'
import type { LabeurTaskWithRelations } from '@/lib/labeur/types'

// ─── Inclusion Prisma standard pour une tâche complète ───────────────────────
const TASK_INCLUDE = {
  recurrence: true,
  completions: {
    orderBy: { completedAt: 'desc' as const },
    include: { user: { select: { id: true, name: true } } },
  },
  inflationStates: true,
  createdBy: { select: { id: true, name: true } },
} as const

// ─── GET /api/labeur/tasks ────────────────────────────────────────────────────
// Retourne la liste des tâches, avec filtres optionnels :
//   ?type=RECURRING|ONESHOT
//   ?status=ACTIVE|PARTIALLY_DONE|COMPLETED|ARCHIVED  (défaut : exclut ARCHIVED)
//   ?all=true  → inclut les tâches archivées
export async function GET(req: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json(
      { success: false, error: 'Non autorisé' } satisfies ApiResponse<never>,
      { status: 401 }
    )
  }

  const { searchParams } = req.nextUrl
  const type    = searchParams.get('type')   ?? undefined
  const status  = searchParams.get('status') ?? undefined
  const all     = searchParams.get('all') === 'true'

  try {
    const tasks = await prisma.labeurTask.findMany({
      where: {
        // Si un statut précis est demandé on l'applique ;
        // sinon on exclut ARCHIVED sauf si all=true
        status: status
          ? (status as LabeurTaskWithRelations['status'])
          : all
          ? undefined
          : { not: 'ARCHIVED' },
        ...(type ? { type: type as LabeurTaskWithRelations['type'] } : {}),
      },
      include: TASK_INCLUDE,
      orderBy: [
        // Les tâches en retard (avec une entrée inflation) remontent en premier
        { status: 'asc' },
        { ecuValue: 'desc' },
        { createdAt: 'asc' },
      ],
    })

    return Response.json({ success: true, data: tasks } satisfies ApiResponse<typeof tasks>)
  } catch (e) {
    console.error('[GET /api/labeur/tasks]', e)
    return Response.json(
      { success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}

// ─── POST /api/labeur/tasks ───────────────────────────────────────────────────
// Crée une nouvelle tâche (avec sa récurrence si type = RECURRING).
export async function POST(req: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json(
      { success: false, error: 'Non autorisé' } satisfies ApiResponse<never>,
      { status: 401 }
    )
  }

  let body: CreateTaskPayload
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>,
      { status: 400 }
    )
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!body.title?.trim()) {
    return Response.json(
      { success: false, error: 'Le titre est requis' } satisfies ApiResponse<never>,
      { status: 400 }
    )
  }
  if (!body.ecuValue || body.ecuValue < 1) {
    return Response.json(
      { success: false, error: 'La valeur en écu doit être ≥ 1' } satisfies ApiResponse<never>,
      { status: 400 }
    )
  }
  if (body.type === 'RECURRING' && !body.recurrence) {
    return Response.json(
      { success: false, error: 'Une tâche récurrente doit avoir une configuration de récurrence' } satisfies ApiResponse<never>,
      { status: 400 }
    )
  }
  if (body.recurrence?.frequency === 'CUSTOM' && !body.recurrence.intervalDays) {
    return Response.json(
      { success: false, error: 'intervalDays est requis pour une fréquence CUSTOM' } satisfies ApiResponse<never>,
      { status: 400 }
    )
  }

  try {
    const settings = await getLabeurSettings(prisma)

    const task = await prisma.$transaction(async (tx) => {
      // Création de la tâche principale
      const created = await tx.labeurTask.create({
        data: {
          title:               body.title.trim(),
          description:         body.description?.trim() ?? null,
          type:                body.type,
          isShared:            body.isShared ?? false,
          ecuValue:            body.ecuValue,
          inflationContribRate: body.inflationContribRate ?? 0.01,
          dueDate:             body.dueDate ? new Date(body.dueDate) : null,
          createdById:         session.user.id,
        },
        include: TASK_INCLUDE,
      })

      // Création de la récurrence si besoin
      if (body.type === 'RECURRING' && body.recurrence) {
        // Utilise nextDueAt fourni par le client (choix de la 1ère échéance)
        // ou calcule depuis maintenant si absent
        const nextDueAt = body.recurrence.nextDueAt
          ? new Date(body.recurrence.nextDueAt)
          : computeNextDueAt(
              body.recurrence.frequency,
              body.recurrence.intervalDays ?? null,
              new Date(),
              settings.timezone
            )

        await tx.labeurRecurrence.create({
          data: {
            taskId:      created.id,
            frequency:   body.recurrence.frequency,
            intervalDays: body.recurrence.intervalDays ?? null,
            nextDueAt,
          },
        })

        // Recharger avec la récurrence incluse
        return tx.labeurTask.findUniqueOrThrow({
          where: { id: created.id },
          include: TASK_INCLUDE,
        })
      }

      return created
    })

    return Response.json(
      { success: true, data: task } satisfies ApiResponse<typeof task>,
      { status: 201 }
    )
  } catch (e) {
    console.error('[POST /api/labeur/tasks]', e)
    return Response.json(
      { success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
