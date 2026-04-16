import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Recurrence } from '@prisma/client'
import { normalizeMonth } from '@/lib/butin'

// ── PATCH /api/butin/budget/lines/[id] ──────────────────────────────────────
/**
 * Modifie une BudgetLine.
 * Body optionnel : { label?, amount?, recurrence?, recurrenceMonths?, recurrenceStart?, isActive? }
 * Scope : 'all' (modifie le template) | 'once' (ne touche pas au template — géré côté entry)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const line = await prisma.budgetLine.findUnique({ where: { id: params.id } })
  if (!line) return NextResponse.json({ error: 'Ligne introuvable' }, { status: 404 })

  let body: {
    label?: string
    amount?: number
    recurrence?: Recurrence
    recurrenceMonths?: number | null
    recurrenceStart?: string | null
    isActive?: boolean
  }

  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Corps invalide' }, { status: 400 }) }

  // Validation CUSTOM
  const nextRecurrence = body.recurrence ?? line.recurrence
  const nextMonths = body.recurrenceMonths ?? line.recurrenceMonths
  if (nextRecurrence === 'CUSTOM' && (!nextMonths || nextMonths < 2)) {
    return NextResponse.json({ error: 'recurrenceMonths requis >= 2 pour CUSTOM' }, { status: 400 })
  }

  const updated = await prisma.budgetLine.update({
    where: { id: params.id },
    data: {
      ...(body.label !== undefined && { label: body.label.trim() }),
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.recurrence !== undefined && { recurrence: body.recurrence }),
      ...(body.recurrenceMonths !== undefined && { recurrenceMonths: body.recurrenceMonths }),
      ...(body.recurrenceStart !== undefined && {
        recurrenceStart: body.recurrenceStart
          ? normalizeMonth(body.recurrenceStart)
          : null,
      }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
    include: { category: true },
  })

  return NextResponse.json(updated)
}

// ── DELETE /api/butin/budget/lines/[id] ────────────────────────────────────
/**
 * Désactive une BudgetLine (soft delete — conserve l'historique des entries).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const line = await prisma.budgetLine.findUnique({ where: { id: params.id } })
  if (!line) return NextResponse.json({ error: 'Ligne introuvable' }, { status: 404 })

  // Soft delete : on désactive plutôt que supprimer pour garder l'historique
  await prisma.budgetLine.update({
    where: { id: params.id },
    data: { isActive: false },
  })

  return NextResponse.json({ success: true })
}