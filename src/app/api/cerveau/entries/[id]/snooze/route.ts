import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── Types ──

type SnoozeDuration = 'PT15M' | 'PT1H' | 'PT3H' | 'TONIGHT'

interface SnoozeBody {
  duration: SnoozeDuration
}

// ── Calcul snoozedUntil depuis la durée ──

function resolveSnoozedUntil(duration: SnoozeDuration): Date {
  const now = new Date()
  switch (duration) {
    case 'PT15M':   return new Date(now.getTime() + 15 * 60 * 1000)
    case 'PT1H':    return new Date(now.getTime() + 60 * 60 * 1000)
    case 'PT3H':    return new Date(now.getTime() + 3 * 60 * 60 * 1000)
    case 'TONIGHT': {
      // Ce soir = 21h00 heure locale du serveur (configurable via preferences en v2)
      const tonight = new Date()
      tonight.setHours(21, 0, 0, 0)
      // Si déjà passé 21h, reporter au lendemain 21h
      if (tonight <= now) tonight.setDate(tonight.getDate() + 1)
      return tonight
    }
  }
}

// ── PATCH /api/cerveau/entries/[id]/snooze ──

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { id } = params

  let body: SnoozeBody
  try {
    body = await request.json() as SnoozeBody
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const VALID_DURATIONS: SnoozeDuration[] = ['PT15M', 'PT1H', 'PT3H', 'TONIGHT']
  if (!body.duration || !VALID_DURATIONS.includes(body.duration)) {
    return NextResponse.json({ error: 'duration invalide' }, { status: 400 })
  }

  const snoozedUntil = resolveSnoozedUntil(body.duration)
  const userId = session.user.id

  try {
    const [entry] = await prisma.$transaction([
      prisma.entry.update({
        where: { id },
        data:  { status: 'SNOOZED', snoozedUntil },
      }),
      // Replanifier la notification pour l'heure de snooze
      prisma.notificationLog.create({
        data: { userId, entryId: id, type: 'REMINDER', scheduledAt: snoozedUntil },
      }),
    ])

    return NextResponse.json(entry)
  } catch (err) {
    console.error('[PATCH /api/cerveau/entries/[id]/snooze]', err)
    return NextResponse.json({ error: 'Entrée introuvable ou erreur serveur' }, { status: 404 })
  }
}
