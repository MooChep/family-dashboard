import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/gamelle/shopping/items
 * Ajoute un article à la liste de courses active.
 * body: { label: string; referenceId?: string; quantity?: number; displayUnit?: string }
 *
 * Si referenceId fourni → item lié à l'ingrédient (isManual: false, trié par rayon).
 * Sinon → item manuel libre (isManual: true).
 * Les ajouts manuels survivent à la régénération de la liste (spec 7.7).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { label?: string; referenceId?: string; quantity?: number; displayUnit?: string }

  if (!body.label?.trim()) {
    return NextResponse.json({ error: 'label est requis' }, { status: 400 })
  }

  const list = await prisma.shoppingList.findFirst({ orderBy: { generatedAt: 'desc' } })
  if (!list) {
    return NextResponse.json({ error: 'Aucune liste active — génère une liste d\'abord' }, { status: 404 })
  }

  const item = await prisma.shoppingListItem.create({
    data: {
      shoppingListId: list.id,
      label:          body.label.trim(),
      quantity:       body.quantity ?? null,
      displayUnit:    body.displayUnit?.trim() ?? null,
      isManual:       !body.referenceId,
      ...(body.referenceId ? { referenceId: body.referenceId } : {}),
    },
    include: { reference: { include: { aisle: true } } },
  })

  return NextResponse.json(item, { status: 201 })
}
