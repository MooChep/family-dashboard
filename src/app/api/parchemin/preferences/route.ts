import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Prefs = { notifyOnCreate: boolean }

async function getOrCreate(userId: string): Promise<Prefs> {
  const existing = await prisma.parcheminPreferences.findUnique({ where: { userId } })
  if (existing) return existing
  return prisma.parcheminPreferences.create({ data: { userId } })
}

export async function GET(): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ success: false, error: 'Non autorisé' }, { status: 401 })
  try {
    const prefs = await getOrCreate(session.user.id)
    return Response.json({ success: true, data: prefs })
  } catch (error) {
    console.error('[parchemin/preferences GET]', error)
    return Response.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) return Response.json({ success: false, error: 'Non autorisé' }, { status: 401 })
  try {
    const body = await request.json() as Partial<Prefs>
    await getOrCreate(session.user.id)
    const prefs = await prisma.parcheminPreferences.update({
      where: { userId: session.user.id },
      data:  { notifyOnCreate: body.notifyOnCreate },
    })
    return Response.json({ success: true, data: prefs })
  } catch (error) {
    console.error('[parchemin/preferences PATCH]', error)
    return Response.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
