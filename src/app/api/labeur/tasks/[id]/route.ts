import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse, UpdateTaskPayload } from '@/lib/labeur/types'

// ─── Inclusion Prisma standard ────────────────────────────────────────────────
const TASK_INCLUDE = {
  recurrence: true,
  completions: {
    orderBy: { completedAt: 'desc' as const },
    include: { user: { select: { id: true, name: true } } },
  },
  inflationStates: true,
  createdBy: { select: { id: true, name: true } },
} as const

type Params = { params: Promise<{ id: string }> }

// ─── GET /api/labeur/tasks/[id] ───────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json(
      { success: false, error: 'Non autorisé' } satisfies ApiResponse<never>,
      { status: 401 }
    )
  }

  const { id } = await params

  try {
    const task = await prisma.labeurTask.findUnique({
      where: { id },
      include: TASK_INCLUDE,
    })

    if (!task) {
      return Response.json(
        { success: false, error: 'Tâche introuvable' } satisfies ApiResponse<never>,
        { status: 404 }
      )
    }

    return Response.json({ success: true, data: task } satisfies ApiResponse<typeof task>)
  } catch (e) {
    console.error('[GET /api/labeur/tasks/[id]]', e)
    return Response.json(
      { success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}

// ─── PUT /api/labeur/tasks/[id] ───────────────────────────────────────────────
// Permet de modifier title, description, ecuValue, isShared, dueDate, inflationContribRate.
// La récurrence est mise à jour séparément si nécessaire.
export async function PUT(req: NextRequest, { params }: Params): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json(
      { success: false, error: 'Non autorisé' } satisfies ApiResponse<never>,
      { status: 401 }
    )
  }

  const { id } = await params

  let body: UpdateTaskPayload
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>,
      { status: 400 }
    )
  }

  try {
    const existing = await prisma.labeurTask.findUnique({ where: { id } })
    if (!existing) {
      return Response.json(
        { success: false, error: 'Tâche introuvable' } satisfies ApiResponse<never>,
        { status: 404 }
      )
    }

    // Validation minimale
    if (body.ecuValue !== undefined && body.ecuValue < 1) {
      return Response.json(
        { success: false, error: 'La valeur en écu doit être ≥ 1' } satisfies ApiResponse<never>,
        { status: 400 }
      )
    }

    const updated = await prisma.labeurTask.update({
      where: { id },
      data: {
        ...(body.title        !== undefined && { title: body.title.trim() }),
        ...(body.description  !== undefined && { description: body.description?.trim() ?? null }),
        ...(body.ecuValue     !== undefined && { ecuValue: body.ecuValue }),
        ...(body.isShared     !== undefined && { isShared: body.isShared }),
        ...(body.dueDate      !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate as unknown as string) : null }),
        ...(body.inflationContribRate !== undefined && { inflationContribRate: body.inflationContribRate }),
      },
      include: TASK_INCLUDE,
    })

    return Response.json({ success: true, data: updated } satisfies ApiResponse<typeof updated>)
  } catch (e) {
    console.error('[PUT /api/labeur/tasks/[id]]', e)
    return Response.json(
      { success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}

// ─── DELETE /api/labeur/tasks/[id] ───────────────────────────────────────────
// Soft delete : passe la tâche en ARCHIVED (pas de suppression physique).
// Les completions sont conservées pour l'historique.
export async function DELETE(_req: NextRequest, { params }: Params): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json(
      { success: false, error: 'Non autorisé' } satisfies ApiResponse<never>,
      { status: 401 }
    )
  }

  const { id } = await params

  try {
    const existing = await prisma.labeurTask.findUnique({ where: { id } })
    if (!existing) {
      return Response.json(
        { success: false, error: 'Tâche introuvable' } satisfies ApiResponse<never>,
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Archivage de la tâche
      await tx.labeurTask.update({
        where: { id },
        data: { status: 'ARCHIVED' },
      })

      // Suppression de l'état d'inflation éventuel (tâche archivée = plus de retard)
      await tx.labeurInflationState.deleteMany({ where: { taskId: id } })
    })

    return Response.json({ success: true, data: null } satisfies ApiResponse<null>)
  } catch (e) {
    console.error('[DELETE /api/labeur/tasks/[id]]', e)
    return Response.json(
      { success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
