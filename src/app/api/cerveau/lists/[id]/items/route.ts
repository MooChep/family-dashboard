import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/lib/cerveau/types'
import type { CerveauListItem } from '@prisma/client'

// POST /api/cerveau/lists/[id]/items — ajoute un item à une liste existante
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  let body: { label: string; order?: number }
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  if (!body.label?.trim()) {
    return Response.json({ success: false, error: 'label est requis' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    const lastItem = await prisma.cerveauListItem.findFirst({
      where: { entryId: params.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const item = await prisma.cerveauListItem.create({
      data: {
        entryId: params.id,
        label: body.label.trim(),
        order: body.order ?? (lastItem ? lastItem.order + 1 : 0),
      },
    })

    return Response.json({ success: true, data: item } satisfies ApiResponse<CerveauListItem>, { status: 201 })
  } catch (error) {
    console.error('[cerveau/lists/:id/items POST]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}

// PATCH /api/cerveau/lists/[id]/items — met à jour un item (body: { itemId, label?, checked? })
export async function PATCH(
  request: NextRequest,
  { params: _ }: { params: { id: string } },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  let body: { itemId: string; label?: string; checked?: boolean }
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  if (!body.itemId) {
    return Response.json({ success: false, error: 'itemId est requis' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    const item = await prisma.cerveauListItem.update({
      where: { id: body.itemId },
      data: {
        ...(body.label !== undefined && { label: body.label.trim() }),
        ...(body.checked !== undefined && { checked: body.checked }),
      },
    })

    return Response.json({ success: true, data: item } satisfies ApiResponse<CerveauListItem>)
  } catch (error) {
    console.error('[cerveau/lists/:id/items PATCH]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}

// DELETE /api/cerveau/lists/[id]/items — supprime un item (body: { itemId })
export async function DELETE(
  request: NextRequest,
  { params: _ }: { params: { id: string } },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  let body: { itemId: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  if (!body.itemId) {
    return Response.json({ success: false, error: 'itemId est requis' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    await prisma.cerveauListItem.delete({ where: { id: body.itemId } })

    return Response.json({ success: true } satisfies ApiResponse<never>)
  } catch (error) {
    console.error('[cerveau/lists/:id/items DELETE]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
