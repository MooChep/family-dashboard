import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOrCreatePreferences } from '@/lib/cerveau/preferences'

// ── GET /api/cerveau/preferences ──

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const prefs = await getOrCreatePreferences(session.user.id)
  return NextResponse.json(prefs)
}

// ── PATCH /api/cerveau/preferences ──

export async function PATCH(request: Request): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const body = (await request.json()) as Record<string, unknown>

  // Construire l'objet de mise à jour en ne gardant que les champs valides
  const update: Record<string, unknown> = {}

  if (Array.isArray(body.reminderDelays))
    update.reminderDelays = JSON.stringify(body.reminderDelays)
  if (typeof body.snoozeTonightHour === 'string')
    update.snoozeTonightHour = body.snoozeTonightHour
  if (Array.isArray(body.eventDefaultDelays))
    update.eventDefaultDelays = JSON.stringify(body.eventDefaultDelays)
  if (typeof body.enrichDelay === 'number')
    update.enrichDelay = body.enrichDelay
  if (typeof body.briefEnabled === 'boolean')
    update.briefEnabled = body.briefEnabled
  if (typeof body.briefTime === 'string')
    update.briefTime = body.briefTime
  if (typeof body.recapEnabled === 'boolean')
    update.recapEnabled = body.recapEnabled
  if (typeof body.recapDay === 'number')
    update.recapDay = body.recapDay
  if (typeof body.recapTime === 'string')
    update.recapTime = body.recapTime
  if (typeof body.silenceEnabled === 'boolean')
    update.silenceEnabled = body.silenceEnabled
  if ('silenceStart' in body)
    update.silenceStart = body.silenceStart as string | null
  if ('silenceEnd' in body)
    update.silenceEnd = body.silenceEnd as string | null
  if (typeof body.escalationEnabled === 'boolean')
    update.escalationEnabled = body.escalationEnabled
  if (typeof body.escalationDelay === 'number')
    update.escalationDelay = body.escalationDelay

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Aucun champ valide à mettre à jour' }, { status: 400 })
  }

  const prefs = await prisma.notificationPreference.update({
    where: { userId: session.user.id },
    data:  update,
  })

  return NextResponse.json(prefs)
}
