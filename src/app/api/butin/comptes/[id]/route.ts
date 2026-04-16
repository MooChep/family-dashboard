import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT /api/butin/comptes/[id]  — renommer ou fermer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const body = await request.json() as { name?: string; isActive?: boolean; owner?: string }
  const compte = await prisma.bankAccount.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
  })
  return NextResponse.json(compte)
}

// DELETE /api/butin/comptes/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  // Vérifie qu'il n'y a pas d'entrées de régul liées
  const count = await prisma.reconciliationEntry.count({ where: { accountId: params.id } })
  if (count > 0) return NextResponse.json({ error: 'Ce compte a des réguls — ferme-le plutôt que le supprimer' }, { status: 409 })
  await prisma.bankAccount.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}