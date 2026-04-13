import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLabeurSettings } from '@/lib/labeur/settings'
import type { ApiResponse } from '@/lib/labeur/types'
import type { LabeurSettings } from '@prisma/client'

// Champs modifiables par l'interface — les timestamps de notif ne sont pas exposés
type UpdateSettingsPayload = Partial<
  Pick<
    LabeurSettings,
    | 'inflationCap'
    | 'curseSeuil'
    | 'inflationAlertThreshold'
    | 'overdueReminderHours'
    | 'oneshotReminderHours'
    | 'timezone'
  >
>

// ─── GET /api/labeur/settings ─────────────────────────────────────────────────
// Retourne les réglages courants du module (crée le singleton si absent).
export async function GET(): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json(
      { success: false, error: 'Non autorisé' } satisfies ApiResponse<never>,
      { status: 401 }
    )
  }

  try {
    const settings = await getLabeurSettings(prisma)
    return Response.json({ success: true, data: settings } satisfies ApiResponse<typeof settings>)
  } catch (e) {
    console.error('[GET /api/labeur/settings]', e)
    return Response.json(
      { success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}

// ─── PUT /api/labeur/settings ─────────────────────────────────────────────────
// Met à jour les réglages du module. Seuls les champs explicitement fournis sont modifiés.
export async function PUT(req: NextRequest): Promise<Response> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return Response.json(
      { success: false, error: 'Non autorisé' } satisfies ApiResponse<never>,
      { status: 401 }
    )
  }

  let body: UpdateSettingsPayload
  try {
    body = await req.json()
  } catch {
    return Response.json(
      { success: false, error: 'Corps de requête invalide' } satisfies ApiResponse<never>,
      { status: 400 }
    )
  }

  // Validations de plage
  if (body.inflationCap !== undefined && (body.inflationCap < 0 || body.inflationCap > 1000)) {
    return Response.json(
      { success: false, error: 'inflationCap doit être entre 0 et 1000' } satisfies ApiResponse<never>,
      { status: 400 }
    )
  }
  if (body.curseSeuil !== undefined && (body.curseSeuil < 0 || body.curseSeuil > 1000)) {
    return Response.json(
      { success: false, error: 'curseSeuil doit être entre 0 et 1000' } satisfies ApiResponse<never>,
      { status: 400 }
    )
  }
  if (body.overdueReminderHours !== undefined && body.overdueReminderHours < 1) {
    return Response.json(
      { success: false, error: 'overdueReminderHours doit être ≥ 1' } satisfies ApiResponse<never>,
      { status: 400 }
    )
  }

  try {
    // S'assurer que le singleton existe
    const existing = await getLabeurSettings(prisma)

    const updated = await prisma.labeurSettings.update({
      where: { id: existing.id },
      data: {
        ...(body.inflationCap            !== undefined && { inflationCap:            body.inflationCap }),
        ...(body.curseSeuil              !== undefined && { curseSeuil:              body.curseSeuil }),
        ...(body.inflationAlertThreshold !== undefined && { inflationAlertThreshold: body.inflationAlertThreshold }),
        ...(body.overdueReminderHours    !== undefined && { overdueReminderHours:    body.overdueReminderHours }),
        ...(body.oneshotReminderHours    !== undefined && { oneshotReminderHours:    body.oneshotReminderHours }),
        ...(body.timezone                !== undefined && { timezone:                body.timezone }),
      },
    })

    return Response.json({ success: true, data: updated } satisfies ApiResponse<typeof updated>)
  } catch (e) {
    console.error('[PUT /api/labeur/settings]', e)
    return Response.json(
      { success: false, error: 'Erreur serveur' } satisfies ApiResponse<never>,
      { status: 500 }
    )
  }
}
