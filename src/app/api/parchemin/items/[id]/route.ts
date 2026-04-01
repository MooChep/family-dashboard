import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/lib/parchemin/types'
import type { ParcheminItem } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  const { id } = await params
  let body: { label?: string; checked?: boolean; order?: number }
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    const data: Record<string, unknown> = {}
    if (body.label   !== undefined) data.label   = body.label.trim()
    if (body.checked !== undefined) data.checked = body.checked
    if (body.order   !== undefined) data.order   = body.order

    const item = await prisma.parcheminItem.update({ where: { id }, data })
    return Response.json({ success: true, data: item } satisfies ApiResponse<ParcheminItem>)
  } catch (error) {
    console.error('[parchemin/items/[id] PATCH]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  const { id } = await params

  try {
    await prisma.parcheminItem.delete({ where: { id } })
    return Response.json({ success: true } satisfies ApiResponse<never>)
  } catch (error) {
    console.error('[parchemin/items/[id] DELETE]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
