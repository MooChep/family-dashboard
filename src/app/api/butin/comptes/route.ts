import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/butin/comptes
export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const comptes = await prisma.bankAccount.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(comptes)
}

// POST /api/butin/comptes
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  const body = await request.json() as { name: string; owner?: string }
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
  try {
    const compte = await prisma.bankAccount.create({ data: { name: body.name.trim(), owner: body.owner?.trim() ?? '' } })
    return NextResponse.json(compte, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Nom déjà utilisé' }, { status: 409 })
  }
}