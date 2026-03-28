import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** GET /api/popote/aisles — liste triée par order */
export async function GET(_req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const aisles = await prisma.aisle.findMany({ orderBy: { order: 'asc' } })
  return NextResponse.json(aisles)
}

/** POST /api/popote/aisles — crée un rayon, order = max + 1 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { name?: string }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name requis' }, { status: 400 })
  }

  const last  = await prisma.aisle.findFirst({ orderBy: { order: 'desc' } })
  const order = (last?.order ?? 0) + 1

  const aisle = await prisma.aisle.create({ data: { name: body.name.trim(), order } })
  return NextResponse.json(aisle, { status: 201 })
}
