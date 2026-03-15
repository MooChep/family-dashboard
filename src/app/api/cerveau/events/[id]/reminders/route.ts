import { type NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── GET /api/cerveau/events/[id]/reminders ──

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = params

  const entry = await prisma.entry.findUnique({
    where:  { id },
    select: { id: true, type: true },
  })
  if (!entry || entry.type !== 'EVENT') {
    return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })
  }

  try {
    const reminders = await prisma.eventReminder.findMany({
      where:   { entryId: id },
      orderBy: { id: 'asc' },
    })
    return NextResponse.json(reminders)
  } catch (err) {
    console.error('[GET /api/cerveau/events/[id]/reminders]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── POST /api/cerveau/events/[id]/reminders ──

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = params

  let body: { delay: string }
  try {
    body = await request.json() as { delay: string }
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  if (!body.delay?.trim()) {
    return NextResponse.json({ error: 'delay est requis' }, { status: 400 })
  }

  const entry = await prisma.entry.findUnique({
    where:  { id },
    select: { id: true, type: true },
  })
  if (!entry || entry.type !== 'EVENT') {
    return NextResponse.json({ error: 'Événement introuvable' }, { status: 404 })
  }

  try {
    const reminder = await prisma.eventReminder.create({
      data: { entryId: id, delay: body.delay.trim() },
    })
    return NextResponse.json(reminder, { status: 201 })
  } catch (err) {
    console.error('[POST /api/cerveau/events/[id]/reminders]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
