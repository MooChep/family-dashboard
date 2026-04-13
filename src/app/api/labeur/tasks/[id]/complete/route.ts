import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { creditEcu } from '@/lib/labeur/ecu'
import { getLabeurSettings } from '@/lib/labeur/settings'
import { regenerateTask } from '@/lib/labeur/recurrence'
import type { ApiResponse } from '@/lib/labeur/types'

type Params = { params: Promise<{ id: string }> }

// ─── POST /api/labeur/tasks/[id]/complete ─────────────────────────────────────
// « J'ai fait ça » — réalisation d'une tâche par le membre connecté.
//
// Logique :
//   1. Vérifie que la tâche est réalisable (ACTIVE ou PARTIALLY_DONE)
//   2. Vérifie que ce membre n'a pas déjà validé l'instance courante
//   3. Crédite les écu immédiatement
//   4. Pour une tâche non partagée → COMPLETED, supprime l'inflation, régénère si RECURRING
//   5. Pour une tâche partagée :
//      - 1ère validation → PARTIALLY_DONE
//      - 2ème validation → COMPLETED, supprime l'inflation, régénère si RECURRING
export async function POST(_req: NextRequest, { params }: Params): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json(
      { success: false, error: 'Non autorisé' } satisfies ApiResponse<never>,
      { status: 401 }
    )
  }

  const { id } = await params
  const userId = session.user.id

  try {
    const result = await prisma.$transaction(async (tx) => {
      // ── 1. Récupérer la tâche avec ses relations ────────────────────────────
      const task = await tx.labeurTask.findUnique({
        where: { id },
        include: {
          recurrence: true,
          completions: { orderBy: { completedAt: 'desc' as const } },
          inflationStates: true,
        },
      })

      if (!task) throw new Error('NOT_FOUND')

      // ── 2. Vérifier que la tâche est réalisable ─────────────────────────────
      if (task.status !== 'ACTIVE' && task.status !== 'PARTIALLY_DONE') {
        throw new Error('INVALID_STATUS')
      }

      // ── 3. Vérifier que ce membre n'a pas déjà validé l'instance courante ───
      // L'instance courante commence après lastGeneratedAt (ou à la création pour une nouvelle tâche)
      const instanceStart: Date =
        task.type === 'RECURRING' && task.recurrence?.lastGeneratedAt
          ? task.recurrence.lastGeneratedAt
          : task.createdAt

      const alreadyCompletedByUser = task.completions.some(
        (c) => c.userId === userId && c.completedAt > instanceStart
      )
      if (alreadyCompletedByUser) throw new Error('ALREADY_DONE')

      // ── 4. Récupérer les réglages (timezone) ─────────────────────────────────
      const settings = await getLabeurSettings(tx)

      // ── 5. Créditer les écu ───────────────────────────────────────────────────
      await creditEcu(tx, userId, task.ecuValue)

      // ── 6. Enregistrer la complétion ──────────────────────────────────────────
      await tx.labeurCompletion.create({
        data: {
          taskId:      task.id,
          userId,
          ecuAwarded:  task.ecuValue,
        },
      })

      // ── 7. Déterminer le nouveau statut ───────────────────────────────────────
      let isFullyComplete = false

      if (!task.isShared) {
        // Tâche individuelle → complétion immédiate
        isFullyComplete = true
      } else {
        // Tâche partagée : compter les validations de l'instance courante
        // On inclut la completion qu'on vient de créer (completedAt ≈ now > instanceStart)
        const previousValidations = task.completions.filter(
          (c) => c.userId !== userId && c.completedAt > instanceStart
        )
        // Si l'autre membre avait déjà validé → on est la 2ème validation
        isFullyComplete = previousValidations.length > 0
      }

      if (isFullyComplete) {
        // ── 8a. Complétion finale ───────────────────────────────────────────────
        await tx.labeurTask.update({
          where: { id },
          data: { status: 'COMPLETED' },
        })

        // Suppression de l'entrée d'inflation (tâche réalisée → retard annulé immédiatement)
        await tx.labeurInflationState.deleteMany({ where: { taskId: id } })

        // Régénération si tâche récurrente
        if (task.type === 'RECURRING') {
          await regenerateTask(tx, task, settings.timezone)
        }
      } else {
        // ── 8b. Première validation d'une tâche partagée ───────────────────────
        await tx.labeurTask.update({
          where: { id },
          data: { status: 'PARTIALLY_DONE' },
        })
      }

      // ── 9. Retourner la tâche mise à jour + solde courant ─────────────────────
      const updatedTask = await tx.labeurTask.findUniqueOrThrow({
        where: { id },
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

      const balance = await tx.ecuBalance.findUnique({ where: { userId } })

      return { task: updatedTask, balance }
    })

    return Response.json({ success: true, data: result } satisfies ApiResponse<typeof result>)
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === 'NOT_FOUND') {
        return Response.json(
          { success: false, error: 'Tâche introuvable' } satisfies ApiResponse<never>,
          { status: 404 }
        )
      }
      if (e.message === 'INVALID_STATUS') {
        return Response.json(
          { success: false, error: 'Cette tâche ne peut pas être réalisée dans son état actuel' } satisfies ApiResponse<never>,
          { status: 409 }
        )
      }
      if (e.message === 'ALREADY_DONE') {
        return Response.json(
          { success: false, error: 'Tu as déjà réalisé cette tâche' } satisfies ApiResponse<never>,
          { status: 409 }
        )
      }
    }
    console.error('[POST /api/labeur/tasks/[id]/complete]', e)
    return Response.json(
      { success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
