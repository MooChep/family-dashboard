import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/lib/cerveau/types'
import type { CerveauPreferences } from '@prisma/client'

// GET /api/cerveau/preferences — retourne les préférences de l'utilisateur courant
export async function GET(): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  try {
    const prefs = await prisma.cerveauPreferences.findUnique({
      where: { userId: session.user.id },
    })

    return Response.json({ success: true, data: prefs } satisfies ApiResponse<CerveauPreferences | null>)
  } catch (error) {
    console.error('[cerveau/preferences GET]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}

// PATCH /api/cerveau/preferences — crée ou met à jour les préférences
export async function PATCH(request: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json({ success: false, error: 'Non autorisé' } satisfies ApiResponse<never>, { status: 401 })
  }

  let body: {
    eveningStartsAt?:    string
    eventLeadTime?:      number
    quietFrom?:          string | null
    quietUntil?:         string | null
    morningDigestAt?:    string | null
    weeklyRecapEnabled?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Corps invalide' } satisfies ApiResponse<never>, { status: 400 })
  }

  try {
    const prefs = await prisma.cerveauPreferences.upsert({
      where: { userId: session.user.id },
      update: {
        ...(body.eveningStartsAt    !== undefined && { eveningStartsAt:    body.eveningStartsAt }),
        ...(body.eventLeadTime      !== undefined && { eventLeadTime:      body.eventLeadTime }),
        ...(body.quietFrom          !== undefined && { quietFrom:          body.quietFrom }),
        ...(body.quietUntil         !== undefined && { quietUntil:         body.quietUntil }),
        ...(body.morningDigestAt    !== undefined && { morningDigestAt:    body.morningDigestAt }),
        ...(body.weeklyRecapEnabled !== undefined && { weeklyRecapEnabled: body.weeklyRecapEnabled }),
      },
      create: {
        userId:             session.user.id,
        eveningStartsAt:    body.eveningStartsAt    ?? '19:00',
        eventLeadTime:      body.eventLeadTime      ?? 1440,
        quietFrom:          body.quietFrom          ?? null,
        quietUntil:         body.quietUntil         ?? null,
        morningDigestAt:    body.morningDigestAt    ?? '08:00',
        weeklyRecapEnabled: body.weeklyRecapEnabled ?? true,
      },
    })

    return Response.json({ success: true, data: prefs } satisfies ApiResponse<CerveauPreferences>)
  } catch (error) {
    console.error('[cerveau/preferences PATCH]', error)
    return Response.json({ success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>, { status: 500 })
  }
}
